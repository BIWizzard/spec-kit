import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, AuthenticationError } from '@/lib/middleware/auth';
import { ExportService, CreateExportData } from '@/lib/services/export.service';

export interface ExportReportRequest {
  exportType: 'reports';
  format: 'csv' | 'json' | 'pdf' | 'excel';
  reportType: string;
  dateRange?: {
    fromDate: string;
    toDate: string;
  };
  reportParameters?: Record<string, any>;
  includeCharts?: boolean;
  email?: string;
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const user = authenticateRequest(request);

    const body: ExportReportRequest = await request.json();

    const {
      exportType,
      format,
      reportType,
      dateRange,
      reportParameters,
      includeCharts = false,
      email,
    } = body;

    // Validate required fields
    if (!exportType || exportType !== 'reports') {
      return NextResponse.json(
        {
          error: 'Validation failed',
          message: 'exportType must be "reports"',
        },
        { status: 400 }
      );
    }

    if (!format || !['csv', 'json', 'pdf', 'excel'].includes(format)) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          message: 'format must be one of: csv, json, pdf, excel',
        },
        { status: 400 }
      );
    }

    if (!reportType) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          message: 'reportType is required for report exports',
        },
        { status: 400 }
      );
    }

    // Prepare export data
    const exportData: CreateExportData = {
      exportType: 'reports',
      format,
      reportType,
      reportParameters,
      includeCharts,
      email,
    };

    // Add date range if provided
    if (dateRange) {
      exportData.dateRange = {
        fromDate: new Date(dateRange.fromDate),
        toDate: new Date(dateRange.toDate),
      };
    }

    // Create export job
    const exportJob = await ExportService.createExport(
      user.familyId,
      user.userId,
      exportData
    );

    return NextResponse.json({
      message: 'Export job created successfully',
      exportJob: {
        id: exportJob.id,
        status: exportJob.status,
        progress: exportJob.progress,
        exportType: exportJob.exportType,
        format: exportJob.format,
        estimatedCompletionTime: exportJob.estimatedCompletionTime,
        createdAt: exportJob.createdAt,
        expiresAt: exportJob.expiresAt,
      },
    }, { status: 201 });

  } catch (error) {
    console.error('Export error:', error);

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

      if (error.message.includes('Validation') || error.message.includes('Invalid')) {
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
        message: 'Failed to create export job. Please try again.',
      },
      { status: 500 }
    );
  }
}