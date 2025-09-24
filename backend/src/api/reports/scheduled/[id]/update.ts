import { Request, Response } from 'express';
import { ScheduledReportService } from '../../../../services/scheduled-report.service';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    familyId: string;
    email: string;
    role: string;
  };
}

const updateScheduledReportSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  schedule: z.object({
    frequency: z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'yearly']).optional(),
    dayOfWeek: z.number().min(0).max(6).optional(),
    dayOfMonth: z.number().min(1).max(31).optional(),
    time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
    timezone: z.string().min(1).optional(),
  }).optional(),
  config: z.object({
    dateRange: z.enum(['last_7_days', 'last_30_days', 'last_quarter', 'last_year', 'custom']).optional(),
    customDateRange: z.object({
      startDate: z.string().refine(date => !isNaN(Date.parse(date)), 'Invalid start date'),
      endDate: z.string().refine(date => !isNaN(Date.parse(date)), 'Invalid end date'),
    }).optional(),
    metrics: z.array(z.string()).min(1).optional(),
    filters: z.object({
      categoryIds: z.array(z.string()).optional(),
      accountIds: z.array(z.string()).optional(),
      minAmount: z.number().optional(),
      maxAmount: z.number().optional(),
    }).optional(),
    format: z.enum(['pdf', 'excel', 'csv']).optional(),
    includeCharts: z.boolean().optional(),
    includeInsights: z.boolean().optional(),
  }).optional(),
  delivery: z.object({
    method: z.enum(['email', 'download']).optional(),
    recipients: z.array(z.string().email()).min(1).optional(),
    subject: z.string().min(1).max(200).optional(),
    message: z.string().max(1000).optional(),
  }).optional(),
  isActive: z.boolean().optional(),
});

export async function updateScheduledReport(req: AuthenticatedRequest, res: Response) {
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
    let userId: string;

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      if (!decoded || !decoded.familyId || !decoded.userId) {
        return res.status(401).json({
          error: 'Invalid token',
          message: 'The provided token is invalid.',
        });
      }
      familyId = decoded.familyId;
      userId = decoded.userId;
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

    // Validate request body
    const validationResult = updateScheduledReportSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Invalid request data.',
        details: validationResult.error.errors,
      });
    }

    const updateData = validationResult.data;

    // Additional validation for schedule updates
    if (updateData.schedule?.frequency === 'weekly' && updateData.schedule.dayOfWeek === undefined) {
      // Check if existing report has dayOfWeek
      const existingReport = await ScheduledReportService.getScheduledReportById(familyId, id);
      if (!existingReport?.schedule.dayOfWeek) {
        return res.status(400).json({
          error: 'Missing day of week',
          message: 'Day of week is required for weekly reports.',
        });
      }
    }

    if (updateData.schedule?.frequency === 'monthly' && updateData.schedule.dayOfMonth === undefined) {
      // Check if existing report has dayOfMonth
      const existingReport = await ScheduledReportService.getScheduledReportById(familyId, id);
      if (!existingReport?.schedule.dayOfMonth) {
        return res.status(400).json({
          error: 'Missing day of month',
          message: 'Day of month is required for monthly reports.',
        });
      }
    }

    // Validate custom date range if provided
    if (updateData.config?.dateRange === 'custom' && updateData.config.customDateRange) {
      const startDate = new Date(updateData.config.customDateRange.startDate);
      const endDate = new Date(updateData.config.customDateRange.endDate);

      if (startDate >= endDate) {
        return res.status(400).json({
          error: 'Invalid date range',
          message: 'Start date must be before end date.',
        });
      }
    }

    try {
      // Update scheduled report
      const updatedReport = await ScheduledReportService.updateScheduledReport(familyId, id, {
        ...updateData,
        updatedBy: userId,
      });

      if (!updatedReport) {
        return res.status(404).json({
          error: 'Report not found',
          message: 'The specified scheduled report was not found.',
        });
      }

      res.status(200).json({
        message: 'Scheduled report updated successfully.',
        scheduledReport: {
          id: updatedReport.id,
          name: updatedReport.name,
          description: updatedReport.description,
          reportType: updatedReport.reportType,
          schedule: updatedReport.schedule,
          config: updatedReport.config,
          delivery: updatedReport.delivery,
          status: updatedReport.status,
          isActive: updatedReport.isActive,
          nextRun: updatedReport.nextRun && {
            scheduledFor: updatedReport.nextRun.scheduledFor,
            estimatedDuration: updatedReport.nextRun.estimatedDuration,
            wasRescheduled: updatedReport.nextRun.wasRescheduled,
          },
          lastModified: {
            by: updatedReport.updatedBy,
            at: updatedReport.updatedAt,
            changes: updatedReport.changesSummary || [],
          },
          createdBy: updatedReport.createdBy,
          createdAt: updatedReport.createdAt,
          updatedAt: updatedReport.updatedAt,
        },
        changes: updatedReport.changesSummary || [],
        nextExecution: updatedReport.nextRun && {
          scheduledFor: updatedReport.nextRun.scheduledFor,
          message: updatedReport.nextRun.wasRescheduled
            ? `Next report rescheduled for ${updatedReport.nextRun.scheduledFor}`
            : `Next report will be generated on ${updatedReport.nextRun.scheduledFor}`,
        },
        warnings: updatedReport.warnings || [],
      });
    } catch (serviceError) {
      console.error('Update scheduled report error:', serviceError);

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
            message: 'You do not have permission to update this scheduled report.',
          });
        }

        if (serviceError.message === 'Report name already exists') {
          return res.status(409).json({
            error: 'Report name exists',
            message: 'A scheduled report with this name already exists.',
          });
        }

        if (serviceError.message === 'Report currently running') {
          return res.status(409).json({
            error: 'Report running',
            message: 'Cannot update report while it is currently running.',
          });
        }

        if (serviceError.message === 'Invalid timezone') {
          return res.status(400).json({
            error: 'Invalid timezone',
            message: 'The specified timezone is not valid.',
          });
        }
      }

      res.status(500).json({
        error: 'Failed to update scheduled report',
        message: 'Failed to update the scheduled report. Please try again.',
      });
    }
  } catch (error) {
    console.error('Update scheduled report endpoint error:', error);

    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to update scheduled report. Please try again.',
    });
  }
}