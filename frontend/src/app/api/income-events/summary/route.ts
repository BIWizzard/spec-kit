import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { IncomeService } from '@/lib/services/income.service';

export interface IncomeEventsSummaryResponse {
  summaryPeriods: Array<{
    period: string;
    periodStart: string;
    periodEnd: string;
    scheduledIncome: number;
    actualIncome: number;
    incomeCount: number;
    variance: number;
  }>;
  totals: {
    totalScheduled: number;
    totalActual: number;
    totalVariance: number;
    totalAllocated: number;
    totalRemaining: number;
  };
  dateRange: {
    fromDate: string;
    toDate: string;
  };
}

async function extractUserFromToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('No token provided');
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix

  try {
    const jwtSecret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'dev-jwt-secret-change-this-in-production-make-it-really-long';
    const decoded = jwt.verify(token, jwtSecret) as any;

    if (!decoded || !decoded.familyId) {
      throw new Error('Invalid token');
    }

    return {
      familyId: decoded.familyId,
      userId: decoded.userId,
    };
  } catch (jwtError) {
    throw new Error('Invalid token');
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Extract user from JWT token
    let familyId: string;
    try {
      const tokenData = await extractUserFromToken(request);
      familyId = tokenData.familyId;
    } catch (tokenError) {
      return NextResponse.json(
        {
          error: 'Not authenticated',
          message: tokenError.message === 'No token provided'
            ? 'Authentication token is required.'
            : 'The provided token is invalid or expired.',
        },
        { status: 401 }
      );
    }

    // Parse and validate query parameters
    const fromDate = searchParams.get('fromDate');
    const toDate = searchParams.get('toDate');
    const groupBy = searchParams.get('groupBy') || 'month';

    // Validate required parameters
    if (!fromDate) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          message: 'fromDate parameter is required',
        },
        { status: 400 }
      );
    }

    if (!toDate) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          message: 'toDate parameter is required',
        },
        { status: 400 }
      );
    }

    // Validate date formats
    let parsedFromDate: Date;
    let parsedToDate: Date;

    try {
      parsedFromDate = new Date(fromDate);
      parsedToDate = new Date(toDate);

      if (isNaN(parsedFromDate.getTime())) {
        throw new Error('Invalid fromDate format');
      }
      if (isNaN(parsedToDate.getTime())) {
        throw new Error('Invalid toDate format');
      }
    } catch (dateError) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          message: 'Invalid date format. Please use YYYY-MM-DD format.',
        },
        { status: 400 }
      );
    }

    // Validate date range
    if (parsedFromDate > parsedToDate) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          message: 'fromDate cannot be after toDate',
        },
        { status: 400 }
      );
    }

    // Validate groupBy parameter
    const validGroupBy = ['day', 'week', 'month', 'quarter', 'year'];
    if (!validGroupBy.includes(groupBy)) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          message: `Invalid groupBy value. Must be one of: ${validGroupBy.join(', ')}`,
        },
        { status: 400 }
      );
    }

    // Get summary data from service
    const summary = await IncomeService.getIncomeEventsSummary(familyId, {
      fromDate: parsedFromDate,
      toDate: parsedToDate,
      groupBy: groupBy as 'day' | 'week' | 'month' | 'quarter' | 'year',
    });

    const response: IncomeEventsSummaryResponse = {
      summaryPeriods: summary.summaryPeriods,
      totals: summary.totals,
      dateRange: summary.dateRange,
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('Get income events summary error:', error);

    if (error instanceof Error) {
      // Handle specific service errors
      if (error.message === 'Family not found') {
        return NextResponse.json(
          {
            error: 'Not Found',
            message: 'Family not found',
          },
          { status: 404 }
        );
      }

      // Handle validation errors from service
      if (error.message.includes('Invalid date') || error.message.includes('Invalid groupBy')) {
        return NextResponse.json(
          {
            error: 'Invalid request data',
            message: error.message,
          },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'Failed to retrieve income events summary',
      },
      { status: 500 }
    );
  }
}