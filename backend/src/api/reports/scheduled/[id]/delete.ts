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

const deleteScheduledReportSchema = z.object({
  force: z.boolean().optional(),
  reason: z.string().max(500).optional(),
});

export async function deleteScheduledReport(req: AuthenticatedRequest, res: Response) {
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

    // Validate request body (optional parameters)
    const validationResult = deleteScheduledReportSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Invalid request data.',
        details: validationResult.error.errors,
      });
    }

    const { force, reason } = validationResult.data;

    try {
      // Get report details before deletion (for audit trail)
      const reportToDelete = await ScheduledReportService.getScheduledReportById(familyId, id);

      if (!reportToDelete) {
        return res.status(404).json({
          error: 'Report not found',
          message: 'The specified scheduled report was not found.',
        });
      }

      // Delete scheduled report
      const deletionResult = await ScheduledReportService.deleteScheduledReport(familyId, id, {
        force: force || false,
        reason: reason || undefined,
        deletedBy: userId,
      });

      res.status(200).json({
        message: 'Scheduled report deleted successfully.',
        deletedReport: {
          id: reportToDelete.id,
          name: reportToDelete.name,
          reportType: reportToDelete.reportType,
          wasActive: reportToDelete.isActive,
          lastRun: reportToDelete.lastRun?.executedAt,
          totalRuns: reportToDelete.statistics.totalRuns,
        },
        deletion: {
          deletedAt: deletionResult.deletedAt,
          deletedBy: deletionResult.deletedBy,
          reason: deletionResult.reason,
          forced: deletionResult.forced,
        },
        cleanup: {
          executionHistoryRemoved: deletionResult.cleanup.executionHistoryRemoved,
          filesRemoved: deletionResult.cleanup.filesRemoved,
          scheduleCancelled: deletionResult.cleanup.scheduleCancelled,
          notificationsSent: deletionResult.cleanup.notificationsSent,
        },
        audit: {
          auditLogId: deletionResult.audit.auditLogId,
          backupCreated: deletionResult.audit.backupCreated,
          retentionPeriod: deletionResult.audit.retentionPeriod, // Days before permanent deletion
        },
        relatedActions: {
          dependentReportsNotified: deletionResult.relatedActions.dependentReportsNotified,
          templatesUpdated: deletionResult.relatedActions.templatesUpdated,
          recipientsNotified: deletionResult.relatedActions.recipientsNotified,
        },
        warnings: deletionResult.warnings || [],
      });
    } catch (serviceError) {
      console.error('Delete scheduled report error:', serviceError);

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
            message: 'You do not have permission to delete this scheduled report.',
          });
        }

        if (serviceError.message === 'Report currently running') {
          return res.status(409).json({
            error: 'Report running',
            message: 'Cannot delete report while it is currently running. Use force=true to override.',
            suggestion: 'Wait for the current execution to complete or use the force parameter.',
          });
        }

        if (serviceError.message === 'Report has dependencies') {
          return res.status(409).json({
            error: 'Report has dependencies',
            message: 'This report has dependencies that prevent deletion. Use force=true to override.',
            suggestion: 'Review dependent reports and templates before forcing deletion.',
          });
        }

        if (serviceError.message === 'Deletion failed') {
          return res.status(500).json({
            error: 'Deletion failed',
            message: 'Failed to delete the scheduled report due to system error.',
          });
        }
      }

      res.status(500).json({
        error: 'Failed to delete scheduled report',
        message: 'Failed to delete the scheduled report. Please try again.',
      });
    }
  } catch (error) {
    console.error('Delete scheduled report endpoint error:', error);

    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to delete scheduled report. Please try again.',
    });
  }
}