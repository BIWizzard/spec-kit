import { NextRequest, NextResponse } from 'next/server';
import { BudgetService } from '@/lib/services/budget.service';
import { authenticateRequest, AuthenticationError } from '@/lib/middleware/auth';

// T534: GET /api/budget-allocations endpoint implementation
export interface GetBudgetAllocationsResponse {
  allocations: Array<{
    id: string;
    incomeEventId: string;
    budgetCategoryId: string;
    amount: string;
    percentage: string;
    budgetCategory: {
      name: string;
      color: string;
    };
    createdAt: string;
    updatedAt: string;
  }>;
}

export async function GET(request: NextRequest) {
  try {
    // Authenticate the request
    const user = authenticateRequest(request);

    // Extract query parameters
    const { searchParams } = new URL(request.url);
    const incomeEventId = searchParams.get('incomeEventId');

    // Validate required parameters
    if (!incomeEventId) {
      return NextResponse.json(
        {
          error: 'Missing required parameter',
          message: 'incomeEventId is required',
        },
        { status: 400 }
      );
    }

    if (typeof incomeEventId !== 'string' || incomeEventId.trim().length === 0) {
      return NextResponse.json(
        {
          error: 'Invalid parameter',
          message: 'incomeEventId must be a non-empty string',
        },
        { status: 400 }
      );
    }

    // Get budget allocations from service
    const allocations = await BudgetService.getBudgetAllocations(user.familyId, incomeEventId.trim());

    const response: GetBudgetAllocationsResponse = {
      allocations: allocations.map(allocation => ({
        id: allocation.id,
        incomeEventId: allocation.incomeEventId,
        budgetCategoryId: allocation.budgetCategoryId,
        amount: allocation.amount.toString(),
        percentage: allocation.percentage.toString(),
        budgetCategory: {
          name: allocation.budgetCategory?.name || 'Unknown Category',
          color: allocation.budgetCategory?.color || '#8FAD77',
        },
        createdAt: allocation.createdAt.toISOString(),
        updatedAt: allocation.updatedAt.toISOString(),
      })),
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('GET /api/budget-allocations error:', error);

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
            message: 'You do not have permission to view budget allocations for this family',
          },
          { status: 403 }
        );
      }

      if (error.message.includes('database') || error.message.includes('connection')) {
        return NextResponse.json(
          {
            error: 'Database error',
            message: 'Unable to retrieve budget allocations at this time',
          },
          { status: 503 }
        );
      }
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to retrieve budget allocations',
      },
      { status: 500 }
    );
  }
}