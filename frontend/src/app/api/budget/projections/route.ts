import { NextRequest, NextResponse } from 'next/server';
import { BudgetService } from '@/lib/services/budget.service';
import { authenticateRequest, AuthenticationError } from '@/lib/middleware/auth';

// T558: GET /api/budget/projections endpoint implementation
export interface BudgetProjectionsResponse {
  projections: {
    timeframe: string;
    startDate: string;
    endDate: string;
    totalIncome: string;
    totalAllocations: string;
    projectedBalance: string;
    categories: Array<{
      id: string;
      name: string;
      color: string;
      projectedAmount: string;
      actualAmount: string;
      variance: string;
      variancePercentage: string;
      isOverBudget: boolean;
      trend: 'up' | 'down' | 'stable';
    }>;
    monthlyBreakdown: Array<{
      month: string;
      income: string;
      allocations: string;
      balance: string;
      categories: Array<{
        id: string;
        name: string;
        projected: string;
        actual: string;
      }>;
    }>;
    insights: Array<{
      type: 'warning' | 'info' | 'success';
      message: string;
      category?: string;
    }>;
  };
}

export async function GET(request: NextRequest) {
  try {
    // Authenticate the request
    const user = authenticateRequest(request);

    // Extract query parameters
    const { searchParams } = new URL(request.url);
    const timeframe = searchParams.get('timeframe') || '12';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Validate timeframe parameter
    const timeframeNum = parseInt(timeframe);
    if (isNaN(timeframeNum) || timeframeNum < 1 || timeframeNum > 36) {
      return NextResponse.json(
        {
          error: 'Invalid timeframe',
          message: 'timeframe must be a number between 1 and 36 (months)',
        },
        { status: 400 }
      );
    }

    // Validate date parameters if provided
    if (startDate && isNaN(new Date(startDate).getTime())) {
      return NextResponse.json(
        {
          error: 'Invalid start date',
          message: 'startDate must be a valid ISO date string',
        },
        { status: 400 }
      );
    }

    if (endDate && isNaN(new Date(endDate).getTime())) {
      return NextResponse.json(
        {
          error: 'Invalid end date',
          message: 'endDate must be a valid ISO date string',
        },
        { status: 400 }
      );
    }

    // Get budget projections from service
    const projections = await BudgetService.getBudgetProjections(
      user.familyId,
      {
        timeframe: timeframeNum,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
      }
    );

    const response: BudgetProjectionsResponse = {
      projections: {
        timeframe: projections.timeframe.toString(),
        startDate: projections.startDate.toISOString(),
        endDate: projections.endDate.toISOString(),
        totalIncome: projections.totalIncome.toString(),
        totalAllocations: projections.totalAllocations.toString(),
        projectedBalance: projections.projectedBalance.toString(),
        categories: projections.categories.map(category => ({
          id: category.id,
          name: category.name,
          color: category.color,
          projectedAmount: category.projectedAmount.toString(),
          actualAmount: category.actualAmount.toString(),
          variance: category.variance.toString(),
          variancePercentage: category.variancePercentage.toString(),
          isOverBudget: category.isOverBudget,
          trend: category.trend,
        })),
        monthlyBreakdown: projections.monthlyBreakdown.map(month => ({
          month: month.month,
          income: month.income.toString(),
          allocations: month.allocations.toString(),
          balance: month.balance.toString(),
          categories: month.categories.map(cat => ({
            id: cat.id,
            name: cat.name,
            projected: cat.projected.toString(),
            actual: cat.actual.toString(),
          })),
        })),
        insights: projections.insights,
      },
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('GET /api/budget/projections error:', error);

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
      // Handle specific known errors
      if (error.message.includes('Insufficient data')) {
        return NextResponse.json(
          {
            error: 'Insufficient data',
            message: 'Not enough historical data to generate projections. At least 3 months of data required.',
          },
          { status: 400 }
        );
      }

      if (error.message.includes('permission') || error.message.includes('unauthorized')) {
        return NextResponse.json(
          {
            error: 'Insufficient permissions',
            message: 'You do not have permission to view budget projections for this family',
          },
          { status: 403 }
        );
      }

      if (error.message.includes('database') || error.message.includes('connection')) {
        return NextResponse.json(
          {
            error: 'Database error',
            message: 'Unable to generate budget projections at this time',
          },
          { status: 503 }
        );
      }
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to generate budget projections',
      },
      { status: 500 }
    );
  }
}