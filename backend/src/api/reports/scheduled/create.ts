import { Request, Response } from 'express';
import { ScheduledReportService } from '../../../services/scheduled-report.service';
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

const createScheduledReportSchema = z.object({
  name: z.string().min(1).max(100, 'Name must be between 1-100 characters'),
  description: z.string().max(500).optional(),
  reportType: z.enum([
    'cash_flow',
    'spending_analysis',
    'budget_performance',
    'income_analysis',
    'net_worth',
    'savings_rate',
    'debt_analysis',
    'monthly_summary',
    'annual_summary',
    'custom'
  ]),
  schedule: z.object({
    frequency: z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'yearly']),
    dayOfWeek: z.number().min(0).max(6).optional(), // 0=Sunday, 6=Saturday
    dayOfMonth: z.number().min(1).max(31).optional(),
    time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Time must be in HH:MM format'),
    timezone: z.string().min(1, 'Timezone is required'),
  }),
  config: z.object({
    dateRange: z.enum(['last_7_days', 'last_30_days', 'last_quarter', 'last_year', 'custom']),
    customDateRange: z.object({
      startDate: z.string().refine(date => !isNaN(Date.parse(date)), 'Invalid start date'),
      endDate: z.string().refine(date => !isNaN(Date.parse(date)), 'Invalid end date'),
    }).optional(),
    metrics: z.array(z.string()).min(1, 'At least one metric must be selected'),
    filters: z.object({
      categoryIds: z.array(z.string()).optional(),
      accountIds: z.array(z.string()).optional(),
      minAmount: z.number().optional(),
      maxAmount: z.number().optional(),
    }).optional(),
    format: z.enum(['pdf', 'excel', 'csv']),
    includeCharts: z.boolean().default(true),
    includeInsights: z.boolean().default(true),
  }),
  delivery: z.object({
    method: z.enum(['email', 'download']),
    recipients: z.array(z.string().email()).min(1, 'At least one recipient is required'),
    subject: z.string().min(1).max(200, 'Subject must be between 1-200 characters').optional(),
    message: z.string().max(1000).optional(),
  }),
  isActive: z.boolean().default(true),
});

export async function createScheduledReport(req: AuthenticatedRequest, res: Response) {
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

    // Validate request body
    const validationResult = createScheduledReportSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Invalid request data.',
        details: validationResult.error.errors,
      });
    }

    const reportConfig = validationResult.data;

    // Additional validation for schedule
    if (reportConfig.schedule.frequency === 'weekly' && reportConfig.schedule.dayOfWeek === undefined) {
      return res.status(400).json({
        error: 'Missing day of week',
        message: 'Day of week is required for weekly reports.',
      });
    }

    if (reportConfig.schedule.frequency === 'monthly' && reportConfig.schedule.dayOfMonth === undefined) {
      return res.status(400).json({
        error: 'Missing day of month',
        message: 'Day of month is required for monthly reports.',
      });
    }

    // Validate custom date range if provided
    if (reportConfig.config.dateRange === 'custom') {
      if (!reportConfig.config.customDateRange) {
        return res.status(400).json({
          error: 'Missing custom date range',
          message: 'Custom date range is required when dateRange is set to custom.',
        });
      }

      const startDate = new Date(reportConfig.config.customDateRange.startDate);
      const endDate = new Date(reportConfig.config.customDateRange.endDate);

      if (startDate >= endDate) {
        return res.status(400).json({
          error: 'Invalid date range',
          message: 'Start date must be before end date.',
        });
      }
    }

    try {
      // Create scheduled report
      const scheduledReport = await ScheduledReportService.createScheduledReport(familyId, {
        ...reportConfig,
        createdBy: userId,
      });

      res.status(201).json({
        message: 'Scheduled report created successfully.',
        scheduledReport: {
          id: scheduledReport.id,
          name: scheduledReport.name,
          description: scheduledReport.description,
          reportType: scheduledReport.reportType,
          schedule: scheduledReport.schedule,
          config: scheduledReport.config,
          delivery: scheduledReport.delivery,
          status: scheduledReport.status,
          isActive: scheduledReport.isActive,
          nextRun: scheduledReport.nextRun && {
            scheduledFor: scheduledReport.nextRun.scheduledFor,
            estimatedDuration: scheduledReport.nextRun.estimatedDuration,
          },
          createdBy: scheduledReport.createdBy,
          createdAt: scheduledReport.createdAt,
          updatedAt: scheduledReport.updatedAt,
        },
        nextExecution: {
          scheduledFor: scheduledReport.nextRun?.scheduledFor,
          message: `Next report will be generated on ${scheduledReport.nextRun?.scheduledFor}`,
        },
      });
    } catch (serviceError) {
      console.error('Create scheduled report error:', serviceError);

      if (serviceError instanceof Error) {
        if (serviceError.message === 'Report name already exists') {
          return res.status(409).json({
            error: 'Report name exists',
            message: 'A scheduled report with this name already exists.',
          });
        }

        if (serviceError.message === 'Maximum scheduled reports reached') {
          return res.status(429).json({
            error: 'Quota exceeded',
            message: 'You have reached the maximum number of scheduled reports allowed.',
          });
        }

        if (serviceError.message === 'Invalid timezone') {
          return res.status(400).json({
            error: 'Invalid timezone',
            message: 'The specified timezone is not valid.',
          });
        }

        if (serviceError.message === 'Invalid recipients') {
          return res.status(400).json({
            error: 'Invalid recipients',
            message: 'One or more recipient email addresses are invalid.',
          });
        }
      }

      res.status(500).json({
        error: 'Failed to create scheduled report',
        message: 'Failed to create the scheduled report. Please try again.',
      });
    }
  } catch (error) {
    console.error('Create scheduled report endpoint error:', error);

    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to create scheduled report. Please try again.',
    });
  }
}