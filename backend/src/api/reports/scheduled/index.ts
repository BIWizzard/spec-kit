import { Request, Response } from 'express';
import { ScheduledReportService } from '../../../services/scheduled-report.service';
import jwt from 'jsonwebtoken';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    familyId: string;
    email: string;
    role: string;
  };
}

export async function getScheduledReports(req: AuthenticatedRequest, res: Response) {
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

    // Parse query parameters
    const {
      status = 'all',
      reportType,
      createdBy,
      page = '1',
      limit = '20'
    } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);

    if (isNaN(pageNum) || pageNum < 1) {
      return res.status(400).json({
        error: 'Invalid page number',
        message: 'Page number must be a positive integer.',
      });
    }

    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      return res.status(400).json({
        error: 'Invalid limit',
        message: 'Limit must be between 1 and 100.',
      });
    }

    try {
      // Get scheduled reports
      const result = await ScheduledReportService.getScheduledReports(familyId, {
        status: status as string,
        reportType: reportType as string,
        createdBy: createdBy as string,
        page: pageNum,
        limit: limitNum,
      });

      res.status(200).json({
        scheduledReports: result.reports.map(report => ({
          id: report.id,
          name: report.name,
          description: report.description,
          reportType: report.reportType,
          schedule: {
            frequency: report.schedule.frequency, // 'daily', 'weekly', 'monthly', 'quarterly', 'yearly'
            dayOfWeek: report.schedule.dayOfWeek, // For weekly reports
            dayOfMonth: report.schedule.dayOfMonth, // For monthly reports
            time: report.schedule.time, // HH:MM format
            timezone: report.schedule.timezone,
          },
          config: {
            dateRange: report.config.dateRange, // 'last_30_days', 'last_quarter', 'custom'
            customDateRange: report.config.customDateRange,
            metrics: report.config.metrics,
            filters: report.config.filters,
            format: report.config.format, // 'pdf', 'excel', 'csv'
            includeCharts: report.config.includeCharts,
          },
          delivery: {
            method: report.delivery.method, // 'email', 'download'
            recipients: report.delivery.recipients,
            subject: report.delivery.subject,
            message: report.delivery.message,
          },
          status: report.status, // 'active', 'paused', 'error', 'completed'
          isActive: report.isActive,
          lastRun: report.lastRun && {
            executedAt: report.lastRun.executedAt,
            status: report.lastRun.status,
            duration: report.lastRun.duration,
            error: report.lastRun.error,
            reportSize: report.lastRun.reportSize,
          },
          nextRun: report.nextRun && {
            scheduledFor: report.nextRun.scheduledFor,
            estimatedDuration: report.nextRun.estimatedDuration,
          },
          statistics: {
            totalRuns: report.statistics.totalRuns,
            successfulRuns: report.statistics.successfulRuns,
            failedRuns: report.statistics.failedRuns,
            averageDuration: report.statistics.averageDuration,
            lastSuccessfulRun: report.statistics.lastSuccessfulRun,
          },
          createdBy: report.createdBy,
          createdAt: report.createdAt,
          updatedAt: report.updatedAt,
        })),
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: result.total,
          pages: Math.ceil(result.total / limitNum),
          hasNext: pageNum < Math.ceil(result.total / limitNum),
          hasPrev: pageNum > 1,
        },
        summary: {
          totalReports: result.summary.totalReports,
          activeReports: result.summary.activeReports,
          pausedReports: result.summary.pausedReports,
          errorReports: result.summary.errorReports,
          nextScheduledRuns: result.summary.nextScheduledRuns.map(run => ({
            reportId: run.reportId,
            reportName: run.reportName,
            scheduledFor: run.scheduledFor,
          })),
        },
        generatedAt: new Date().toISOString(),
      });
    } catch (serviceError) {
      console.error('Get scheduled reports error:', serviceError);

      res.status(500).json({
        error: 'Failed to get scheduled reports',
        message: 'Failed to retrieve scheduled reports. Please try again.',
      });
    }
  } catch (error) {
    console.error('Scheduled reports endpoint error:', error);

    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve scheduled reports. Please try again.',
    });
  }
}