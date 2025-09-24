import { Request, Response } from 'express';
import { ExportService } from '../../services/export.service';
import { ReportsService } from '../../services/reports.service';
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

const exportReportSchema = z.object({
  reportType: z.enum(['cash_flow', 'spending_analysis', 'budget_performance', 'income_analysis', 'net_worth', 'savings_rate', 'debt_analysis', 'monthly_summary', 'annual_summary', 'custom']),
  reportId: z.string().min(1).optional(), // Required for custom reports
  format: z.enum(['pdf', 'excel', 'csv', 'json']),
  dateRange: z.object({
    startDate: z.string().refine(date => !isNaN(Date.parse(date)), 'Invalid start date'),
    endDate: z.string().refine(date => !isNaN(Date.parse(date)), 'Invalid end date'),
  }).optional(),
  options: z.object({
    includeCharts: z.boolean().optional(),
    includeRawData: z.boolean().optional(),
    includeInsights: z.boolean().optional(),
    includeSummary: z.boolean().optional(),
    compress: z.boolean().optional(),
    password: z.string().min(8).max(100).optional(),
    watermark: z.string().max(100).optional(),
  }).optional(),
  delivery: z.object({
    method: z.enum(['download', 'email']),
    email: z.string().email().optional(),
    filename: z.string().min(1).max(255).optional(),
  }),
});

export async function exportReport(req: AuthenticatedRequest, res: Response) {
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
    const validationResult = exportReportSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Invalid request data.',
        details: validationResult.error.errors,
      });
    }

    const exportConfig = validationResult.data;

    // Validate custom report requirements
    if (exportConfig.reportType === 'custom' && !exportConfig.reportId) {
      return res.status(400).json({
        error: 'Missing report ID',
        message: 'Report ID is required for custom report exports.',
      });
    }

    // Validate email delivery requirements
    if (exportConfig.delivery.method === 'email' && !exportConfig.delivery.email) {
      return res.status(400).json({
        error: 'Missing email',
        message: 'Email address is required for email delivery.',
      });
    }

    try {
      let reportData;

      // Get report data based on type
      if (exportConfig.reportType === 'custom' && exportConfig.reportId) {
        reportData = await ReportsService.getCustomReportById(familyId, exportConfig.reportId);
        if (!reportData) {
          return res.status(404).json({
            error: 'Report not found',
            message: 'The specified custom report was not found.',
          });
        }
      } else {
        // Generate standard report data
        const dateRange = exportConfig.dateRange || {
          startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Last 90 days
          endDate: new Date().toISOString().split('T')[0],
        };

        reportData = await ReportsService.generateStandardReport(familyId, {
          reportType: exportConfig.reportType,
          dateRange,
        });
      }

      // Export report
      const exportResult = await ExportService.exportReport({
        familyId,
        userId,
        reportType: exportConfig.reportType,
        format: exportConfig.format,
        data: reportData,
        options: {
          includeCharts: exportConfig.options?.includeCharts || false,
          includeRawData: exportConfig.options?.includeRawData || false,
          includeInsights: exportConfig.options?.includeInsights || true,
          includeSummary: exportConfig.options?.includeSummary || true,
          compress: exportConfig.options?.compress || false,
          password: exportConfig.options?.password,
          watermark: exportConfig.options?.watermark,
        },
        delivery: exportConfig.delivery,
      });

      if (exportConfig.delivery.method === 'download') {
        res.status(200).json({
          message: 'Report exported successfully.',
          downloadUrl: exportResult.downloadUrl,
          filename: exportResult.filename,
          fileSize: exportResult.fileSize,
          format: exportConfig.format,
          expiresAt: exportResult.expiresAt, // Download link expiration
          metadata: {
            reportType: exportConfig.reportType,
            generatedAt: exportResult.generatedAt,
            processingTime: exportResult.processingTime,
          },
        });
      } else {
        // Email delivery
        res.status(202).json({
          message: 'Report export initiated. You will receive an email when ready.',
          jobId: exportResult.jobId,
          estimatedCompletion: exportResult.estimatedCompletion,
          email: exportConfig.delivery.email,
          status: 'processing',
          metadata: {
            reportType: exportConfig.reportType,
            format: exportConfig.format,
            initiatedAt: new Date().toISOString(),
          },
        });
      }
    } catch (serviceError) {
      console.error('Export report error:', serviceError);

      if (serviceError instanceof Error) {
        if (serviceError.message === 'Report not found') {
          return res.status(404).json({
            error: 'Report not found',
            message: 'The specified report was not found.',
          });
        }

        if (serviceError.message === 'Unsupported format') {
          return res.status(400).json({
            error: 'Unsupported format',
            message: 'The specified export format is not supported for this report type.',
          });
        }

        if (serviceError.message === 'Export quota exceeded') {
          return res.status(429).json({
            error: 'Export quota exceeded',
            message: 'You have exceeded your export quota. Please try again later.',
          });
        }

        if (serviceError.message === 'Invalid email address') {
          return res.status(400).json({
            error: 'Invalid email address',
            message: 'The provided email address is invalid.',
          });
        }

        if (serviceError.message === 'File too large') {
          return res.status(413).json({
            error: 'File too large',
            message: 'The generated report exceeds the maximum file size limit.',
          });
        }
      }

      res.status(500).json({
        error: 'Failed to export report',
        message: 'Failed to export the report. Please try again.',
      });
    }
  } catch (error) {
    console.error('Export report endpoint error:', error);

    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to export report. Please try again.',
    });
  }
}