import { NextRequest, NextResponse } from 'next/server';
import { BudgetService } from '@/lib/services/budget.service';
import { authenticateRequest, AuthenticationError } from '@/lib/middleware/auth';

// T557: GET /api/budget-allocations/[incomeEventId]/summary endpoint implementation
export interface BudgetAllocationSummaryResponse {
  summary: {
    incomeEventId: string;
    totalAmount: string;
    totalPercentage: string;
    allocatedAmount: string;
    allocatedPercentage: string;
    remainingAmount: string;
    remainingPercentage: string;
    allocationCount: number;
    categories: Array<{
      id: string;
      name: string;
      color: string;
      amount: string;
      percentage: string;
      priority: number;
    }>;
    isComplete: boolean;
    isOverallocated: boolean;
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: { incomeEventId: string } }
) {
  try {
    // Authenticate the request
    const user = authenticateRequest(request);

    // Validate path parameter
    if (!params.incomeEventId || typeof params.incomeEventId !== 'string' || params.incomeEventId.trim().length === 0) {
      return NextResponse.json(
        {
          error: 'Invalid income event ID',
          message: 'Income event ID must be a non-empty string',
        },
        { status: 400 }
      );
    }

    // Get budget allocation summary from service
    const summary = await BudgetService.getBudgetAllocationSummary(
      user.familyId,
      params.incomeEventId.trim()
    );

    const response: BudgetAllocationSummaryResponse = {
      summary: {
        incomeEventId: summary.incomeEventId,
        totalAmount: summary.totalAmount.toString(),
        totalPercentage: summary.totalPercentage.toString(),
        allocatedAmount: summary.allocatedAmount.toString(),
        allocatedPercentage: summary.allocatedPercentage.toString(),
        remainingAmount: summary.remainingAmount.toString(),
        remainingPercentage: summary.remainingPercentage.toString(),
        allocationCount: summary.allocationCount,
        categories: summary.categories.map(category => ({
          id: category.id,
          name: category.name,
          color: category.color,
          amount: category.amount.toString(),
          percentage: category.percentage.toString(),
          priority: category.priority,
        })),
        isComplete: summary.isComplete,
        isOverallocated: summary.isOverallocated,
      },
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('GET /api/budget-allocations/[incomeEventId]/summary error:', error);

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
      if (error.message.includes('Income event not found')) {
        return NextResponse.json(
          {
            error: 'Income event not found',
            message: 'The specified income event does not exist or you do not have access to it',
          },
          { status: 404 }
        );
      }

      if (error.message.includes('permission') || error.message.includes('unauthorized')) {
        return NextResponse.json(
          {
            error: 'Insufficient permissions',
            message: 'You do not have permission to view budget allocation summary for this family',
          },
          { status: 403 }
        );
      }

      if (error.message.includes('database') || error.message.includes('connection')) {
        return NextResponse.json(
          {
            error: 'Database error',
            message: 'Unable to retrieve budget allocation summary at this time',
          },
          { status: 503 }
        );
      }
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to retrieve budget allocation summary',
      },
      { status: 500 }
    );
  }
}