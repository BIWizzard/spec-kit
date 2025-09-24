import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  uptime: number;
  checks: {
    database: {
      status: 'up' | 'down';
      responseTime: number;
    };
    memory: {
      used: number;
      free: number;
      percentage: number;
    };
    version: string;
  };
}

export async function healthCheck(req: Request, res: Response) {
  const startTime = Date.now();
  let dbStatus: 'up' | 'down' = 'down';
  let dbResponseTime = 0;

  try {
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    dbResponseTime = Date.now() - dbStart;
    dbStatus = 'up';
  } catch (error) {
    console.error('Database health check failed:', error);
    dbStatus = 'down';
    dbResponseTime = Date.now() - startTime;
  }

  const memUsage = process.memoryUsage();
  const memTotal = memUsage.heapTotal;
  const memUsed = memUsage.heapUsed;
  const memFree = memTotal - memUsed;
  const memPercentage = Math.round((memUsed / memTotal) * 100);

  const isHealthy = dbStatus === 'up';

  const response: HealthCheckResponse = {
    status: isHealthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks: {
      database: {
        status: dbStatus,
        responseTime: dbResponseTime,
      },
      memory: {
        used: memUsed,
        free: memFree,
        percentage: memPercentage,
      },
      version: process.env.npm_package_version || '1.0.0',
    },
  };

  const statusCode = isHealthy ? 200 : 503;
  res.status(statusCode).json(response);
}