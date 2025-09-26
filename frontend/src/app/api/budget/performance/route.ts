import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { BudgetService, BudgetPerformanceResult } from '@/lib/services/budget.service';

export interface BudgetPerformanceQuery {
  startDate?: string;
  endDate?: string;
}

export interface BudgetPerformanceResponse {
  performance: BudgetPerformanceResult[];
  dateRange: {
    startDate: string;
    endDate: string;
  };
  summary: {
    totalTargetAmount: number;
    totalActualAmount: number;
    totalVariance: number;
    averageUtilization: number;
  };
}

export async function GET(request: NextRequest) {
  try {
    // Extract JWT token from Authorization header
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Verify and decode JWT token
    const jwtSecret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'dev-jwt-secret-change-this-in-production-make-it-really-long';
    let decoded: any;

    try {
      decoded = jwt.verify(token, jwtSecret);
    } catch (jwtError) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    const { familyId } = decoded;

    if (!familyId) {
      return NextResponse.json(
        { error: 'Family ID not found in token' },
        { status: 400 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    // Default to current month if no dates provided
    const now = new Date();
    const defaultStartDate = new Date(now.getFullYear(), now.getMonth(), 1);
    const defaultEndDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    let startDate: Date;
    let endDate: Date;

    try {
      startDate = startDateParam ? new Date(startDateParam) : defaultStartDate;
      endDate = endDateParam ? new Date(endDateParam) : defaultEndDate;

      // Validate dates
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return NextResponse.json(
          { error: 'Invalid date format. Use ISO 8601 format (YYYY-MM-DD)' },
          { status: 400 }
        );
      }

      if (startDate >= endDate) {
        return NextResponse.json(
          { error: 'Start date must be before end date' },
          { status: 400 }
        );
      }
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid date parameters' },
        { status: 400 }
      );
    }

    // Get budget performance data
    const performance = await BudgetService.getBudgetPerformance(
      familyId,
      startDate,
      endDate
    );

    // Calculate summary statistics
    const totalTargetAmount = performance.reduce((sum, p) => sum + p.targetAmount, 0);
    const totalActualAmount = performance.reduce((sum, p) => sum + p.actualAmount, 0);
    const totalVariance = totalTargetAmount - totalActualAmount;
    const averageUtilization = performance.length > 0
      ? performance.reduce((sum, p) => sum + p.percentUsed, 0) / performance.length
      : 0;

    const response: BudgetPerformanceResponse = {
      performance,
      dateRange: {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
      },
      summary: {
        totalTargetAmount: Math.round(totalTargetAmount * 100) / 100,
        totalActualAmount: Math.round(totalActualAmount * 100) / 100,
        totalVariance: Math.round(totalVariance * 100) / 100,
        averageUtilization: Math.round(averageUtilization * 100) / 100,
      },
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Budget performance error:', error);

    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return NextResponse.json(
          {
            error: 'Resource not found',
            message: error.message,
          },
          { status: 404 }
        );
      }

      if (error.message.includes('permission') || error.message.includes('access')) {
        return NextResponse.json(
          {
            error: 'Access denied',
            message: error.message,
          },
          { status: 403 }
        );
      }
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to retrieve budget performance data. Please try again.',
      },
      { status: 500 }
    );
  }
}