import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, AuthenticationError } from '@/lib/middleware/auth';
import { ReportsService, DateRange } from '@/lib/services/reports.service';

export async function GET(request: NextRequest) {
  try {
    // Authenticate request
    const user = authenticateRequest(request);

    // Extract query parameters
    const { searchParams } = new URL(request.url);
    const fromDate = searchParams.get('fromDate');
    const toDate = searchParams.get('toDate');

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

    // Generate budget performance report
    const budgetData = await ReportsService.generateBudgetPerformance(
      user.familyId,
      dateRange
    );

    return NextResponse.json({
      data: budgetData,
      meta: {
        dateRange,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Budget performance report error:', error);

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
        message: 'Failed to generate budget performance report',
      },
      { status: 500 }
    );
  }
}