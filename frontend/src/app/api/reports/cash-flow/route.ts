import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, AuthenticationError } from '@/lib/middleware/auth';
import { ReportsService, DateRange, GroupByPeriod } from '@/lib/services/reports.service';

export async function GET(request: NextRequest) {
  try {
    // Authenticate request
    const user = authenticateRequest(request);

    // Extract query parameters
    const { searchParams } = new URL(request.url);
    const fromDate = searchParams.get('fromDate');
    const toDate = searchParams.get('toDate');
    const groupBy = (searchParams.get('groupBy') as GroupByPeriod) || 'month';
    const includeProjections = searchParams.get('includeProjections') === 'true';

    // Validate required parameters
    if (!fromDate || !toDate) {
      return NextResponse.json(
        {
          error: 'Missing required parameters',
          message: 'fromDate and toDate are required',
        },
        { status: 400 }
      );
    }

    // Parse dates
    const dateRange: DateRange = {
      fromDate: new Date(fromDate),
      toDate: new Date(toDate),
    };

    // Validate dates
    if (isNaN(dateRange.fromDate.getTime()) || isNaN(dateRange.toDate.getTime())) {
      return NextResponse.json(
        {
          error: 'Invalid date format',
          message: 'fromDate and toDate must be valid ISO date strings',
        },
        { status: 400 }
      );
    }

    if (dateRange.fromDate >= dateRange.toDate) {
      return NextResponse.json(
        {
          error: 'Invalid date range',
          message: 'fromDate must be before toDate',
        },
        { status: 400 }
      );
    }

    // Validate groupBy parameter
    const validGroupBy = ['day', 'week', 'month', 'quarter', 'year'];
    if (!validGroupBy.includes(groupBy)) {
      return NextResponse.json(
        {
          error: 'Invalid groupBy parameter',
          message: 'groupBy must be one of: day, week, month, quarter, year',
        },
        { status: 400 }
      );
    }

    // Generate cash flow report
    const cashFlowData = await ReportsService.generateCashFlowReport(
      user.familyId,
      dateRange,
      groupBy,
      includeProjections
    );

    return NextResponse.json({
      data: cashFlowData,
      meta: {
        dateRange,
        groupBy,
        includeProjections,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Cash flow report error:', error);

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
        message: 'Failed to generate cash flow report',
      },
      { status: 500 }
    );
  }
}