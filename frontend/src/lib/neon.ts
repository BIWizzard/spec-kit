import { PrismaClient } from '@prisma/client';

export interface NeonConnectionConfig {
  connectionString: string;
  maxConnections?: number;
  connectionTimeoutMs?: number;
  idleTimeoutMs?: number;
  ssl?: {
    rejectUnauthorized: boolean;
  };
}

export interface NeonDatabaseInfo {
  host: string;
  database: string;
  user: string;
  port: number;
  ssl: boolean;
  pooling: boolean;
}

export class NeonDatabase {
  private static instance: NeonDatabase;
  private prisma: PrismaClient;
  private config: NeonConnectionConfig;

  private constructor(config: NeonConnectionConfig) {
    this.config = config;
    this.prisma = new PrismaClient({
      datasources: {
        db: {
          url: config.connectionString,
        },
      },
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
      errorFormat: 'pretty',
    });
  }

  public static getInstance(config?: NeonConnectionConfig): NeonDatabase {
    if (!NeonDatabase.instance) {
      if (!config) {
        config = NeonDatabase.getDefaultConfig();
      }
      NeonDatabase.instance = new NeonDatabase(config);
    }
    return NeonDatabase.instance;
  }

  public static getDefaultConfig(): NeonConnectionConfig {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is required for Neon PostgreSQL connection');
    }

    if (!connectionString.includes('neon.tech') && !connectionString.includes('neon.')) {
      console.warn('Warning: DATABASE_URL does not appear to be a Neon connection string');
    }

    return {
      connectionString,
      maxConnections: parseInt(process.env.DATABASE_MAX_CONNECTIONS || '10'),
      connectionTimeoutMs: parseInt(process.env.DATABASE_CONNECTION_TIMEOUT || '30000'),
      idleTimeoutMs: parseInt(process.env.DATABASE_IDLE_TIMEOUT || '300000'),
      ssl: {
        rejectUnauthorized: process.env.NODE_ENV === 'production',
      },
    };
  }

  public getPrisma(): PrismaClient {
    return this.prisma;
  }

  public async testConnection(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      console.log('✅ Neon PostgreSQL connection successful');
      return true;
    } catch (error) {
      console.error('❌ Neon PostgreSQL connection failed:', error);
      return false;
    }
  }

  public async getDatabaseInfo(): Promise<NeonDatabaseInfo> {
    try {
      const url = new URL(this.config.connectionString);
      const result = await this.prisma.$queryRaw<Array<{ version: string }>>`SELECT version()`;

      return {
        host: url.hostname,
        database: url.pathname.substring(1),
        user: url.username,
        port: parseInt(url.port) || 5432,
        ssl: url.searchParams.get('sslmode') !== 'disable',
        pooling: url.searchParams.has('pgbouncer') || url.hostname.includes('pooler'),
      };
    } catch (error) {
      console.error('Failed to get database info:', error);
      throw new Error('Unable to retrieve database information');
    }
  }

  public async getConnectionStats(): Promise<{
    activeConnections: number;
    maxConnections: number;
    databaseSize: string;
    uptime: string;
  }> {
    try {
      const [connectionInfo, sizeInfo, uptimeInfo] = await Promise.all([
        this.prisma.$queryRaw<Array<{ count: bigint }>>`
          SELECT count(*) as count FROM pg_stat_activity WHERE state = 'active'
        `,
        this.prisma.$queryRaw<Array<{ size: string }>>`
          SELECT pg_size_pretty(pg_database_size(current_database())) as size
        `,
        this.prisma.$queryRaw<Array<{ uptime: string }>>`
          SELECT date_trunc('second', current_timestamp - pg_postmaster_start_time()) as uptime
        `,
      ]);

      return {
        activeConnections: Number(connectionInfo[0]?.count || 0),
        maxConnections: this.config.maxConnections || 10,
        databaseSize: sizeInfo[0]?.size || 'Unknown',
        uptime: uptimeInfo[0]?.uptime || 'Unknown',
      };
    } catch (error) {
      console.error('Failed to get connection stats:', error);
      throw new Error('Unable to retrieve connection statistics');
    }
  }

  public async runMigrations(): Promise<boolean> {
    try {
      console.log('🔄 Running Prisma migrations...');

      const { spawn } = await import('child_process');

      return new Promise((resolve, reject) => {
        const migrate = spawn('npx', ['prisma', 'migrate', 'deploy'], {
          env: { ...process.env, DATABASE_URL: this.config.connectionString },
          stdio: 'inherit',
        });

        migrate.on('close', (code) => {
          if (code === 0) {
            console.log('✅ Migrations completed successfully');
            resolve(true);
          } else {
            console.error('❌ Migration failed with code:', code);
            resolve(false);
          }
        });

        migrate.on('error', (error) => {
          console.error('❌ Migration error:', error);
          reject(error);
        });
      });
    } catch (error) {
      console.error('Failed to run migrations:', error);
      return false;
    }
  }

  public async optimizeForNeon(): Promise<void> {
    try {
      console.log('🔧 Optimizing database settings for Neon...');

      // Neon-specific optimizations
      await this.prisma.$executeRaw`
        SET statement_timeout = '30s';
      `;

      await this.prisma.$executeRaw`
        SET idle_in_transaction_session_timeout = '60s';
      `;

      // Set work_mem for better query performance
      await this.prisma.$executeRaw`
        SET work_mem = '4MB';
      `;

      console.log('✅ Database optimized for Neon');
    } catch (error) {
      console.warn('⚠️ Failed to apply Neon optimizations (this is usually okay):', error);
    }
  }

  public async gracefulShutdown(): Promise<void> {
    try {
      console.log('🔄 Closing Neon database connections...');
      await this.prisma.$disconnect();
      console.log('✅ Database connections closed successfully');
    } catch (error) {
      console.error('❌ Error during database shutdown:', error);
    }
  }
}

// Export singleton instance
export const neonDb = NeonDatabase.getInstance();

// Export Prisma client for backward compatibility
export const prisma = neonDb.getPrisma();

// Graceful shutdown handling
process.on('SIGINT', async () => {
  await neonDb.gracefulShutdown();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await neonDb.gracefulShutdown();
  process.exit(0);
});

export default neonDb;