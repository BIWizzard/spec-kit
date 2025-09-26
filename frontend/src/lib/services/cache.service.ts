import { prisma } from '../prisma';
import { Session } from '@prisma/client';

export interface CacheEntry<T = any> {
  key: string;
  value: T;
  expiresAt: Date;
  familyId?: string;
  tags?: string[];
}

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  familyId?: string;
  tags?: string[];
}

export interface CacheStats {
  totalEntries: number;
  expiredEntries: number;
  familyBreakdown: Record<string, number>;
  tagBreakdown: Record<string, number>;
  oldestEntry?: Date;
  newestEntry?: Date;
}

// Using PostgreSQL as a cache storage since we're avoiding Redis
// This is suitable for the MVP scale but should be replaced with Redis in production
export class CacheService {
  private static readonly DEFAULT_TTL = 3600; // 1 hour default
  private static readonly MAX_TTL = 86400 * 7; // 1 week max
  private static readonly CLEANUP_INTERVAL = 300; // 5 minutes

  // Set a cache entry
  static async set<T>(
    key: string,
    value: T,
    options: CacheOptions = {}
  ): Promise<void> {
    const ttl = Math.min(options.ttl || this.DEFAULT_TTL, this.MAX_TTL);
    const expiresAt = new Date(Date.now() + ttl * 1000);

    // Use a dedicated cache table (would need to be added to schema)
    // For now, we'll simulate with session storage as a temporary solution
    const cacheData = {
      key,
      value: JSON.stringify(value),
      expiresAt,
      familyId: options.familyId,
      tags: options.tags?.join(',') || null,
    };

    // Store in session table as a workaround (in production, use dedicated cache table)
    await prisma.$executeRaw`
      INSERT INTO "Session" (id, "familyMemberId", token, "ipAddress", "userAgent", "expiresAt", "createdAt")
      VALUES (${key}, 'cache-entry', ${JSON.stringify(cacheData)}, 'internal', 'cache-service', ${expiresAt}, NOW())
      ON CONFLICT (id)
      DO UPDATE SET
        token = ${JSON.stringify(cacheData)},
        "expiresAt" = ${expiresAt},
        "createdAt" = NOW()
    `;
  }

  // Get a cache entry
  static async get<T>(key: string): Promise<T | null> {
    try {
      const result = await prisma.$queryRaw<Array<{ token: string; expiresAt: Date }>>`
        SELECT token, "expiresAt"
        FROM "Session"
        WHERE id = ${key}
        AND "familyMemberId" = 'cache-entry'
        AND "expiresAt" > NOW()
      `;

      if (result.length === 0) {
        return null;
      }

      const cacheData = JSON.parse(result[0].token);
      return JSON.parse(cacheData.value);
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  // Check if key exists and is not expired
  static async has(key: string): Promise<boolean> {
    try {
      const result = await prisma.$queryRaw<Array<{ count: number }>>`
        SELECT COUNT(*) as count
        FROM "Session"
        WHERE id = ${key}
        AND "familyMemberId" = 'cache-entry'
        AND "expiresAt" > NOW()
      `;

      return result[0].count > 0;
    } catch (error) {
      console.error('Cache has error:', error);
      return false;
    }
  }

  // Delete a cache entry
  static async delete(key: string): Promise<boolean> {
    try {
      const result = await prisma.$executeRaw`
        DELETE FROM "Session"
        WHERE id = ${key}
        AND "familyMemberId" = 'cache-entry'
      `;

      return result > 0;
    } catch (error) {
      console.error('Cache delete error:', error);
      return false;
    }
  }

  // Delete multiple keys
  static async deleteMany(keys: string[]): Promise<number> {
    if (keys.length === 0) return 0;

    try {
      const result = await prisma.$executeRaw`
        DELETE FROM "Session"
        WHERE id = ANY(${keys}::text[])
        AND "familyMemberId" = 'cache-entry'
      `;

      return result as number;
    } catch (error) {
      console.error('Cache deleteMany error:', error);
      return 0;
    }
  }

  // Delete by family ID
  static async deleteByFamily(familyId: string): Promise<number> {
    try {
      const result = await prisma.$executeRaw`
        DELETE FROM "Session"
        WHERE "familyMemberId" = 'cache-entry'
        AND token LIKE ${'%"familyId":"' + familyId + '"%'}
      `;

      return result as number;
    } catch (error) {
      console.error('Cache deleteByFamily error:', error);
      return 0;
    }
  }

  // Delete by tags
  static async deleteByTag(tag: string): Promise<number> {
    try {
      const result = await prisma.$executeRaw`
        DELETE FROM "Session"
        WHERE "familyMemberId" = 'cache-entry'
        AND token LIKE ${'%"tags":"' + tag + '%'}
      `;

      return result as number;
    } catch (error) {
      console.error('Cache deleteByTag error:', error);
      return 0;
    }
  }

  // Clear all cache entries
  static async clear(): Promise<number> {
    try {
      const result = await prisma.$executeRaw`
        DELETE FROM "Session"
        WHERE "familyMemberId" = 'cache-entry'
      `;

      return result as number;
    } catch (error) {
      console.error('Cache clear error:', error);
      return 0;
    }
  }

  // Get or set pattern
  static async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    let value = await this.get<T>(key);

    if (value === null) {
      value = await factory();
      await this.set(key, value, options);
    }

    return value;
  }

  // Increment a numeric value (useful for counters)
  static async increment(key: string, amount: number = 1): Promise<number> {
    const current = (await this.get<number>(key)) || 0;
    const newValue = current + amount;
    await this.set(key, newValue);
    return newValue;
  }

  // Decrement a numeric value
  static async decrement(key: string, amount: number = 1): Promise<number> {
    return this.increment(key, -amount);
  }

  // Get cache statistics
  static async getStats(): Promise<CacheStats> {
    try {
      const results = await prisma.$queryRaw<Array<{
        total: number;
        expired: number;
        oldest: Date;
        newest: Date;
        token: string;
      }>>`
        SELECT
          COUNT(*) as total,
          COUNT(CASE WHEN "expiresAt" <= NOW() THEN 1 END) as expired,
          MIN("createdAt") as oldest,
          MAX("createdAt") as newest,
          string_agg(token, '|||') as token
        FROM "Session"
        WHERE "familyMemberId" = 'cache-entry'
      `;

      const stats: CacheStats = {
        totalEntries: Number(results[0]?.total || 0),
        expiredEntries: Number(results[0]?.expired || 0),
        familyBreakdown: {},
        tagBreakdown: {},
        oldestEntry: results[0]?.oldest,
        newestEntry: results[0]?.newest,
      };

      // Parse tokens to get family and tag breakdowns
      if (results[0]?.token) {
        const tokens = results[0].token.split('|||');
        tokens.forEach(tokenStr => {
          try {
            const tokenData = JSON.parse(tokenStr);
            if (tokenData.familyId) {
              stats.familyBreakdown[tokenData.familyId] =
                (stats.familyBreakdown[tokenData.familyId] || 0) + 1;
            }
            if (tokenData.tags) {
              tokenData.tags.split(',').forEach((tag: string) => {
                stats.tagBreakdown[tag] = (stats.tagBreakdown[tag] || 0) + 1;
              });
            }
          } catch {
            // Skip invalid token data
          }
        });
      }

      return stats;
    } catch (error) {
      console.error('Cache getStats error:', error);
      return {
        totalEntries: 0,
        expiredEntries: 0,
        familyBreakdown: {},
        tagBreakdown: {},
      };
    }
  }

  // Clean up expired entries
  static async cleanup(): Promise<number> {
    try {
      const result = await prisma.$executeRaw`
        DELETE FROM "Session"
        WHERE "familyMemberId" = 'cache-entry'
        AND "expiresAt" <= NOW()
      `;

      return result as number;
    } catch (error) {
      console.error('Cache cleanup error:', error);
      return 0;
    }
  }

  // Get all keys (for debugging - use carefully in production)
  static async getAllKeys(familyId?: string): Promise<string[]> {
    try {
      let query = `
        SELECT id
        FROM "Session"
        WHERE "familyMemberId" = 'cache-entry'
        AND "expiresAt" > NOW()
      `;

      if (familyId) {
        query += ` AND token LIKE '%"familyId":"${familyId}"%'`;
      }

      query += ` ORDER BY "createdAt" DESC`;

      const results = await prisma.$queryRaw<Array<{ id: string }>>(query as any);
      return results.map(r => r.id);
    } catch (error) {
      console.error('Cache getAllKeys error:', error);
      return [];
    }
  }

  // Utility methods for common cache patterns

  // Cache user session data
  static async cacheUserSession(
    userId: string,
    sessionData: any,
    ttl: number = 3600
  ): Promise<void> {
    await this.set(`user:session:${userId}`, sessionData, {
      ttl,
      tags: ['user-session'],
    });
  }

  // Cache family data
  static async cacheFamilyData(
    familyId: string,
    dataKey: string,
    data: any,
    ttl: number = 1800
  ): Promise<void> {
    await this.set(`family:${familyId}:${dataKey}`, data, {
      ttl,
      familyId,
      tags: ['family-data'],
    });
  }

  // Cache report data
  static async cacheReport(
    familyId: string,
    reportType: string,
    reportData: any,
    ttl: number = 900
  ): Promise<void> {
    const key = `report:${familyId}:${reportType}:${Date.now()}`;
    await this.set(key, reportData, {
      ttl,
      familyId,
      tags: ['reports', reportType],
    });
  }

  // Cache API response
  static async cacheApiResponse(
    endpoint: string,
    params: Record<string, any>,
    response: any,
    ttl: number = 300
  ): Promise<void> {
    const key = `api:${endpoint}:${JSON.stringify(params)}`;
    await this.set(key, response, {
      ttl,
      tags: ['api-response'],
    });
  }

  // Initialize periodic cleanup
  static startCleanupScheduler(): void {
    setInterval(async () => {
      try {
        const cleaned = await this.cleanup();
        if (cleaned > 0) {
          console.log(`Cleaned up ${cleaned} expired cache entries`);
        }
      } catch (error) {
        console.error('Scheduled cache cleanup failed:', error);
      }
    }, this.CLEANUP_INTERVAL * 1000);
  }

  // Health check
  static async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    stats: CacheStats;
    message: string;
  }> {
    try {
      const stats = await this.getStats();
      const testKey = `health:${Date.now()}`;
      const testValue = { test: true };

      // Test set/get operations
      await this.set(testKey, testValue, { ttl: 10 });
      const retrieved = await this.get(testKey);
      await this.delete(testKey);

      if (JSON.stringify(retrieved) !== JSON.stringify(testValue)) {
        return {
          status: 'unhealthy',
          stats,
          message: 'Cache set/get test failed',
        };
      }

      const expiredRatio = stats.totalEntries > 0 ?
        stats.expiredEntries / stats.totalEntries : 0;

      if (expiredRatio > 0.5) {
        return {
          status: 'degraded',
          stats,
          message: `High ratio of expired entries: ${(expiredRatio * 100).toFixed(1)}%`,
        };
      }

      return {
        status: 'healthy',
        stats,
        message: 'Cache is operating normally',
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        stats: {
          totalEntries: 0,
          expiredEntries: 0,
          familyBreakdown: {},
          tagBreakdown: {},
        },
        message: `Cache health check failed: ${error.message}`,
      };
    }
  }
}