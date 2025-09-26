import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, AuthenticationError } from '@/lib/middleware/auth';
import {
  ScheduledReportService,
  UpdateScheduledReportData,
  ScheduledReportFrequency,
  ScheduledReportStatus
} from '@/lib/services/scheduled-report.service';

export interface UpdateScheduledReportRequest {
  name?: string;
  frequency?: ScheduledReportFrequency;
  recipients?: string[];
  parameters?: Record<string, any>;
  description?: string;
  status?: ScheduledReportStatus;
  deliveryDay?: number;
  deliveryHour?: number;
  timezone?: string;
}

// GET /api/reports/scheduled/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate user
    const user = authenticateRequest(request);

    const reportId = params.id;

    if (!reportId) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          message: 'Report ID is required',
        },
        { status: 400 }
      );
    }

    // Get scheduled report by ID
    const report = await ScheduledReportService.getScheduledReportById(
      user.familyId,
      reportId
    );

    if (!report) {
      return NextResponse.json(
        {
          error: 'Not found',
          message: 'Scheduled report not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'Scheduled report retrieved successfully',
      scheduledReport: {
        id: report.id,
        name: report.name,
        description: report.description,
        reportType: report.reportType,
        frequency: report.frequency,
        recipients: report.recipients,
        status: report.status,
        nextExecution: report.nextExecution,
        lastExecution: report.lastExecution,
        timezone: report.timezone,
        deliveryDay: report.deliveryDay,
        deliveryHour: report.deliveryHour,
        parameters: report.parameters,
        executionCount: report._count.executions,
        recentExecutions: report.executions.map(execution => ({
          id: execution.id,
          executedAt: execution.executedAt,
          status: execution.status,
          deliveryStatus: execution.deliveryStatus,
          error: execution.error,
          deliveryError: execution.deliveryError,
        })),
        createdAt: report.createdAt,
        updatedAt: report.updatedAt,
      },
    });

  } catch (error) {
    console.error('Get scheduled report error:', error);

    if (error instanceof AuthenticationError) {
      return NextResponse.json(
        {
          error: 'Authentication failed',
          message: error.message,
        },
        { status: error.statusCode }
      );
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to retrieve scheduled report. Please try again.',
      },
      { status: 500 }
    );
  }
}

// PUT /api/reports/scheduled/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate user
    const user = authenticateRequest(request);

    const reportId = params.id;

    if (!reportId) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          message: 'Report ID is required',
        },
        { status: 400 }
      );
    }

    const body: UpdateScheduledReportRequest = await request.json();

    const {
      name,
      frequency,
      recipients,
      parameters,
      description,
      status,
      deliveryDay,
      deliveryHour,
      timezone,
    } = body;

    // Validate fields if provided
    if (name !== undefined && (!name || name.trim().length === 0)) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          message: 'name cannot be empty if provided',
        },
        { status: 400 }
      );
    }

    if (frequency !== undefined) {
      const validFrequencies = ['weekly', 'monthly', 'quarterly', 'annual'];
      if (!validFrequencies.includes(frequency)) {
        return NextResponse.json(
          {
            error: 'Validation failed',
            message: `frequency must be one of: ${validFrequencies.join(', ')}`,
          },
          { status: 400 }
        );
      }
    }

    if (recipients !== undefined && (!Array.isArray(recipients) || recipients.length === 0)) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          message: 'recipients must be a non-empty array if provided',
        },
        { status: 400 }
      );
    }

    if (status !== undefined) {
      const validStatuses = ['active', 'paused', 'error', 'completed'];
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          {
            error: 'Validation failed',
            message: `status must be one of: ${validStatuses.join(', ')}`,
          },
          { status: 400 }
        );
      }
    }

    if (deliveryHour !== undefined && (deliveryHour < 0 || deliveryHour > 23)) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          message: 'deliveryHour must be between 0 and 23',
        },
        { status: 400 }
      );
    }

    // Prepare update data
    const updateData: UpdateScheduledReportData = {};

    if (name !== undefined) updateData.name = name.trim();
    if (frequency !== undefined) updateData.frequency = frequency;
    if (recipients !== undefined) updateData.recipients = recipients;
    if (parameters !== undefined) updateData.parameters = parameters;
    if (description !== undefined) updateData.description = description?.trim();
    if (status !== undefined) updateData.status = status;
    if (deliveryDay !== undefined) updateData.deliveryDay = deliveryDay;
    if (deliveryHour !== undefined) updateData.deliveryHour = deliveryHour;
    if (timezone !== undefined) updateData.timezone = timezone;

    // Update scheduled report
    const updatedReport = await ScheduledReportService.updateScheduledReport(
      user.familyId,
      reportId,
      user.userId,
      updateData
    );

    return NextResponse.json({
      message: 'Scheduled report updated successfully',
      scheduledReport: {
        id: updatedReport.id,
        name: updatedReport.name,
        description: updatedReport.description,
        reportType: updatedReport.reportType,
        frequency: updatedReport.frequency,
        recipients: updatedReport.recipients,
        status: updatedReport.status,
        nextExecution: updatedReport.nextExecution,
        lastExecution: updatedReport.lastExecution,
        timezone: updatedReport.timezone,
        deliveryDay: updatedReport.deliveryDay,
        deliveryHour: updatedReport.deliveryHour,
        parameters: updatedReport.parameters,
        createdAt: updatedReport.createdAt,
        updatedAt: updatedReport.updatedAt,
      },
    });

  } catch (error) {
    console.error('Update scheduled report error:', error);

    if (error instanceof AuthenticationError) {
      return NextResponse.json(
        {
          error: 'Authentication failed',
          message: error.message,
        },
        { status: error.statusCode }
      );
    }

    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return NextResponse.json(
          {
            error: 'Not found',
            message: error.message,
          },
          { status: 404 }
        );
      }

      if (error.message.includes('permissions')) {
        return NextResponse.json(
          {
            error: 'Permission denied',
            message: error.message,
          },
          { status: 403 }
        );
      }

      if (error.message.includes('email') || error.message.includes('delivery') || error.message.includes('Invalid')) {
        return NextResponse.json(
          {
            error: 'Validation failed',
            message: error.message,
          },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to update scheduled report. Please try again.',
      },
      { status: 500 }
    );
  }
}