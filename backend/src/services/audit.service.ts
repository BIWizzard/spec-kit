import { prisma } from '../lib/prisma';
import { AuditLog, Prisma } from '@prisma/client';

export type AuditLogData = {
  familyId: string;
  familyMemberId: string;
  action: 'create' | 'update' | 'delete' | 'login' | 'logout' | 'sync';
  entityType: string;
  entityId: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  ipAddress: string;
};

export type AuditLogFilter = {
  familyMemberId?: string;
  entityType?: string;
  entityId?: string;
  action?: string;
  startDate?: Date;
  endDate?: Date;
  ipAddress?: string;
};

export class AuditService {
  static async logActivity(data: AuditLogData): Promise<AuditLog> {
    return prisma.auditLog.create({
      data: {
        familyId: data.familyId,
        familyMemberId: data.familyMemberId,
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId,
        oldValues: data.oldValues || {},
        newValues: data.newValues || {},
        ipAddress: data.ipAddress,
      },
    });
  }

  static async logCreate(
    familyId: string,
    familyMemberId: string,
    entityType: string,
    entityId: string,
    newValues: Record<string, any>,
    ipAddress: string
  ): Promise<AuditLog> {
    return this.logActivity({
      familyId,
      familyMemberId,
      action: 'create',
      entityType,
      entityId,
      newValues,
      ipAddress,
    });
  }

  static async logUpdate(
    familyId: string,
    familyMemberId: string,
    entityType: string,
    entityId: string,
    oldValues: Record<string, any>,
    newValues: Record<string, any>,
    ipAddress: string
  ): Promise<AuditLog> {
    return this.logActivity({
      familyId,
      familyMemberId,
      action: 'update',
      entityType,
      entityId,
      oldValues,
      newValues,
      ipAddress,
    });
  }

  static async logDelete(
    familyId: string,
    familyMemberId: string,
    entityType: string,
    entityId: string,
    oldValues: Record<string, any>,
    ipAddress: string
  ): Promise<AuditLog> {
    return this.logActivity({
      familyId,
      familyMemberId,
      action: 'delete',
      entityType,
      entityId,
      oldValues,
      ipAddress,
    });
  }

  static async logLogin(
    familyId: string,
    familyMemberId: string,
    ipAddress: string
  ): Promise<AuditLog> {
    return this.logActivity({
      familyId,
      familyMemberId,
      action: 'login',
      entityType: 'session',
      entityId: familyMemberId,
      newValues: { loginTime: new Date().toISOString() },
      ipAddress,
    });
  }

  static async logLogout(
    familyId: string,
    familyMemberId: string,
    ipAddress: string
  ): Promise<AuditLog> {
    return this.logActivity({
      familyId,
      familyMemberId,
      action: 'logout',
      entityType: 'session',
      entityId: familyMemberId,
      newValues: { logoutTime: new Date().toISOString() },
      ipAddress,
    });
  }

  static async logSync(
    familyId: string,
    familyMemberId: string,
    entityType: string,
    entityId: string,
    syncResults: Record<string, any>,
    ipAddress: string
  ): Promise<AuditLog> {
    return this.logActivity({
      familyId,
      familyMemberId,
      action: 'sync',
      entityType,
      entityId,
      newValues: syncResults,
      ipAddress,
    });
  }

  static async getAuditLogs(
    familyId: string,
    filter: AuditLogFilter = {},
    limit: number = 100,
    offset: number = 0
  ): Promise<{ logs: AuditLog[]; total: number }> {
    const where: Prisma.AuditLogWhereInput = {
      familyId,
      ...(filter.familyMemberId && { familyMemberId: filter.familyMemberId }),
      ...(filter.entityType && { entityType: filter.entityType }),
      ...(filter.entityId && { entityId: filter.entityId }),
      ...(filter.action && { action: filter.action as any }),
      ...(filter.ipAddress && { ipAddress: { contains: filter.ipAddress } }),
      ...(filter.startDate || filter.endDate) && {
        createdAt: {
          ...(filter.startDate && { gte: filter.startDate }),
          ...(filter.endDate && { lte: filter.endDate }),
        },
      },
    };

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
        include: {
          familyMember: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return { logs, total };
  }

  static async getActivityByEntity(
    familyId: string,
    entityType: string,
    entityId: string,
    limit: number = 50
  ): Promise<AuditLog[]> {
    return prisma.auditLog.findMany({
      where: {
        familyId,
        entityType,
        entityId,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        familyMember: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
  }

  static async getUserActivity(
    familyId: string,
    familyMemberId: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<{ logs: AuditLog[]; total: number }> {
    return this.getAuditLogs(
      familyId,
      { familyMemberId },
      limit,
      offset
    );
  }

  static async getRecentActivity(
    familyId: string,
    hours: number = 24,
    limit: number = 50
  ): Promise<AuditLog[]> {
    const startDate = new Date(Date.now() - hours * 60 * 60 * 1000);

    const logs = await this.getAuditLogs(
      familyId,
      { startDate },
      limit,
      0
    );

    return logs.logs;
  }

  static async getActivitySummary(
    familyId: string,
    days: number = 30
  ): Promise<{
    totalActivities: number;
    activitiesByAction: Record<string, number>;
    activitiesByUser: Record<string, { count: number; name: string }>;
    activitiesByDay: Record<string, number>;
  }> {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const logs = await prisma.auditLog.findMany({
      where: {
        familyId,
        createdAt: { gte: startDate },
      },
      include: {
        familyMember: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    const totalActivities = logs.length;

    const activitiesByAction: Record<string, number> = {};
    const activitiesByUser: Record<string, { count: number; name: string }> = {};
    const activitiesByDay: Record<string, number> = {};

    logs.forEach(log => {
      activitiesByAction[log.action] = (activitiesByAction[log.action] || 0) + 1;

      const userName = `${log.familyMember.firstName} ${log.familyMember.lastName}`;
      if (!activitiesByUser[log.familyMemberId]) {
        activitiesByUser[log.familyMemberId] = { count: 0, name: userName };
      }
      activitiesByUser[log.familyMemberId].count++;

      const day = log.createdAt.toISOString().split('T')[0];
      activitiesByDay[day] = (activitiesByDay[day] || 0) + 1;
    });

    return {
      totalActivities,
      activitiesByAction,
      activitiesByUser,
      activitiesByDay,
    };
  }

  static async cleanupOldLogs(retentionDays: number = 2555): Promise<number> {
    const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

    const { count } = await prisma.auditLog.deleteMany({
      where: {
        createdAt: { lt: cutoffDate },
      },
    });

    return count;
  }

  static async exportAuditLogs(
    familyId: string,
    filter: AuditLogFilter = {},
    format: 'json' | 'csv' = 'json'
  ): Promise<string> {
    const { logs } = await this.getAuditLogs(familyId, filter, 10000, 0);

    if (format === 'csv') {
      const headers = [
        'timestamp',
        'user',
        'action',
        'entityType',
        'entityId',
        'ipAddress',
        'oldValues',
        'newValues'
      ];

      const csvRows = logs.map(log => [
        log.createdAt.toISOString(),
        `${(log as any).familyMember.firstName} ${(log as any).familyMember.lastName} (${(log as any).familyMember.email})`,
        log.action,
        log.entityType,
        log.entityId,
        log.ipAddress,
        JSON.stringify(log.oldValues),
        JSON.stringify(log.newValues)
      ]);

      return [headers, ...csvRows].map(row => row.map(field => `"${field}"`).join(',')).join('\n');
    }

    return JSON.stringify(logs, null, 2);
  }
}