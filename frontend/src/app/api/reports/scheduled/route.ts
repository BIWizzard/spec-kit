import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, AuthenticationError } from '@/lib/middleware/auth';
import {
  ScheduledReportService,
  CreateScheduledReportData,
  ScheduledReportType,
  ScheduledReportFrequency,
  ScheduledReportStatus
} from '@/lib/services/scheduled-report.service';

export interface CreateScheduledReportRequest {
  name: string;
  reportType: ScheduledReportType;
  frequency: ScheduledReportFrequency;
  recipients: string[];
  parameters?: Record<string, any>;
  description?: string;
  timezone?: string;
  deliveryDay?: number;
  deliveryHour?: number;
  startDate?: string;
}

export interface GetScheduledReportsQuery {
  status?: ScheduledReportStatus;
  reportType?: ScheduledReportType;
  frequency?: ScheduledReportFrequency;
}

// GET /api/reports/scheduled
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const user = authenticateRequest(request);

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const filter: GetScheduledReportsQuery = {};

    if (searchParams.get('status')) {
      filter.status = searchParams.get('status') as ScheduledReportStatus;
    }
    if (searchParams.get('reportType')) {
      filter.reportType = searchParams.get('reportType') as ScheduledReportType;
    }
    if (searchParams.get('frequency')) {
      filter.frequency = searchParams.get('frequency') as ScheduledReportFrequency;
    }

    // Get scheduled reports
    const reports = await ScheduledReportService.getScheduledReports(
      user.familyId,
      filter
    );

    return NextResponse.json({
      message: 'Scheduled reports retrieved successfully',
      reports: reports.map(report => ({
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
        createdAt: report.createdAt,
        updatedAt: report.updatedAt,
      })),
    });

  } catch (error) {
    console.error('Get scheduled reports error:', error);

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
        message: 'Failed to retrieve scheduled reports. Please try again.',
      },
      { status: 500 }
    );
  }
}

// POST /api/reports/scheduled
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const user = authenticateRequest(request);

    const body: CreateScheduledReportRequest = await request.json();

    const {
      name,
      reportType,
      frequency,
      recipients,
      parameters,
      description,
      timezone,
      deliveryDay,
      deliveryHour,
      startDate,
    } = body;

    // Validate required fields
    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          message: 'name is required and cannot be empty',
        },
        { status: 400 }
      );
    }

    if (!reportType) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          message: 'reportType is required',
        },
        { status: 400 }
      );
    }

    const validReportTypes = [
      'cash_flow', 'spending_analysis', 'budget_performance', 'income_analysis',
      'net_worth', 'savings_rate', 'monthly_summary', 'annual_summary'
    ];

    if (!validReportTypes.includes(reportType)) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          message: `reportType must be one of: ${validReportTypes.join(', ')}`,
        },
        { status: 400 }
      );
    }

    if (!frequency) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          message: 'frequency is required',
        },
        { status: 400 }
      );
    }

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

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          message: 'recipients is required and must be a non-empty array',
        },
        { status: 400 }
      );
    }

    // Prepare creation data
    const createData: CreateScheduledReportData = {
      name: name.trim(),
      reportType,
      frequency,
      recipients,
      parameters,
      description: description?.trim(),
      timezone,
      deliveryDay,
      deliveryHour,
    };

    if (startDate) {
      createData.startDate = new Date(startDate);
    }

    // Create scheduled report
    const scheduledReport = await ScheduledReportService.createScheduledReport(
      user.familyId,
      user.userId,
      createData
    );

    return NextResponse.json({
      message: 'Scheduled report created successfully',
      scheduledReport: {
        id: scheduledReport.id,
        name: scheduledReport.name,
        description: scheduledReport.description,
        reportType: scheduledReport.reportType,
        frequency: scheduledReport.frequency,
        recipients: scheduledReport.recipients,
        status: scheduledReport.status,
        nextExecution: scheduledReport.nextExecution,
        timezone: scheduledReport.timezone,
        deliveryDay: scheduledReport.deliveryDay,
        deliveryHour: scheduledReport.deliveryHour,
        parameters: scheduledReport.parameters,
        createdAt: scheduledReport.createdAt,
      },
    }, { status: 201 });

  } catch (error) {
    console.error('Create scheduled report error:', error);

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
        message: 'Failed to create scheduled report. Please try again.',
      },
      { status: 500 }
    );
  }
}