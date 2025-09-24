import { Request, Response } from 'express';
import { ScheduledReportService } from '../../../../services/scheduled-report.service';
import jwt from 'jsonwebtoken';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    familyId: string;
    email: string;
    role: string;
  };
}

export async function getScheduledReportDetails(req: AuthenticatedRequest, res: Response) {
  try {
    // Extract user from JWT token
    const authHeader = req.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'No token provided',
        message: 'Authentication token is required.',
      });
    }

    const token = authHeader.substring(7);
    let familyId: string;

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      if (!decoded || !decoded.familyId) {
        return res.status(401).json({
          error: 'Invalid token',
          message: 'The provided token is invalid.',
        });
      }
      familyId = decoded.familyId;
    } catch (jwtError) {
      return res.status(401).json({
        error: 'Invalid token',
        message: 'The provided token is invalid or expired.',
      });
    }

    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        error: 'Missing report ID',
        message: 'Scheduled report ID is required.',
      });
    }

    try {
      // Get scheduled report details
      const report = await ScheduledReportService.getScheduledReportById(familyId, id);

      if (!report) {
        return res.status(404).json({
          error: 'Report not found',
          message: 'The specified scheduled report was not found.',
        });
      }

      res.status(200).json({
        scheduledReport: {
          id: report.id,
          name: report.name,
          description: report.description,
          reportType: report.reportType,
          schedule: {
            frequency: report.schedule.frequency,
            dayOfWeek: report.schedule.dayOfWeek,
            dayOfMonth: report.schedule.dayOfMonth,
            time: report.schedule.time,
            timezone: report.schedule.timezone,
            nextRun: report.schedule.nextRun,
            cronExpression: report.schedule.cronExpression,
          },
          config: {
            dateRange: report.config.dateRange,
            customDateRange: report.config.customDateRange,
            metrics: report.config.metrics,
            filters: report.config.filters,
            format: report.config.format,
            includeCharts: report.config.includeCharts,
            includeInsights: report.config.includeInsights,
            reportTemplate: report.config.reportTemplate,
          },
          delivery: {
            method: report.delivery.method,
            recipients: report.delivery.recipients,
            subject: report.delivery.subject,
            message: report.delivery.message,
            attachmentName: report.delivery.attachmentName,
          },
          status: report.status,
          isActive: report.isActive,
          lastRun: report.lastRun && {
            id: report.lastRun.id,
            executedAt: report.lastRun.executedAt,
            completedAt: report.lastRun.completedAt,
            status: report.lastRun.status, // 'success', 'failed', 'running'
            duration: report.lastRun.duration,
            reportSize: report.lastRun.reportSize,
            downloadUrl: report.lastRun.downloadUrl,
            error: report.lastRun.error,
            logs: report.lastRun.logs,
          },
          nextRun: report.nextRun && {
            scheduledFor: report.nextRun.scheduledFor,
            estimatedDuration: report.nextRun.estimatedDuration,
            queuePosition: report.nextRun.queuePosition,
          },
          statistics: {
            totalRuns: report.statistics.totalRuns,
            successfulRuns: report.statistics.successfulRuns,
            failedRuns: report.statistics.failedRuns,
            averageDuration: report.statistics.averageDuration,
            averageReportSize: report.statistics.averageReportSize,
            lastSuccessfulRun: report.statistics.lastSuccessfulRun,
            successRate: report.statistics.successRate,
            uptimePercentage: report.statistics.uptimePercentage,
          },
          executionHistory: report.executionHistory.map(execution => ({
            id: execution.id,
            executedAt: execution.executedAt,
            status: execution.status,
            duration: execution.duration,
            reportSize: execution.reportSize,
            error: execution.error,
            downloadUrl: execution.downloadUrl,
          })),
          alerts: report.alerts.map(alert => ({
            id: alert.id,
            type: alert.type, // 'execution_failed', 'delivery_failed', 'quota_exceeded'
            severity: alert.severity,
            message: alert.message,
            createdAt: alert.createdAt,
            acknowledged: alert.acknowledged,
          })),
          permissions: {
            canEdit: report.permissions.canEdit,
            canDelete: report.permissions.canDelete,
            canExecute: report.permissions.canExecute,
            canViewHistory: report.permissions.canViewHistory,
          },
          createdBy: {
            id: report.createdBy.id,
            name: report.createdBy.name,
            email: report.createdBy.email,
          },
          updatedBy: report.updatedBy && {
            id: report.updatedBy.id,
            name: report.updatedBy.name,
            email: report.updatedBy.email,
          },
          createdAt: report.createdAt,
          updatedAt: report.updatedAt,
        },
        relatedReports: report.relatedReports.map(related => ({
          id: related.id,
          name: related.name,
          reportType: related.reportType,
          relationship: related.relationship, // 'similar_schedule', 'same_type', 'same_creator'
        })),
        recommendations: report.recommendations.map(rec => ({
          type: rec.type, // 'schedule_optimization', 'format_suggestion', 'delivery_improvement'
          title: rec.title,
          description: rec.description,
          action: rec.action,
          impact: rec.impact,
        })),
        generatedAt: new Date().toISOString(),
      });
    } catch (serviceError) {
      console.error('Get scheduled report details error:', serviceError);

      if (serviceError instanceof Error) {
        if (serviceError.message === 'Report not found') {
          return res.status(404).json({
            error: 'Report not found',
            message: 'The specified scheduled report was not found.',
          });
        }

        if (serviceError.message === 'Access denied') {
          return res.status(403).json({
            error: 'Access denied',
            message: 'You do not have permission to view this scheduled report.',
          });
        }
      }

      res.status(500).json({
        error: 'Failed to get scheduled report details',
        message: 'Failed to retrieve scheduled report details. Please try again.',
      });
    }
  } catch (error) {
    console.error('Scheduled report details endpoint error:', error);

    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve scheduled report details. Please try again.',
    });
  }
}