import { NextRequest, NextResponse } from 'next/server';
import { BudgetService } from '@/lib/services/budget.service';
import { authenticateRequest, AuthenticationError } from '@/lib/middleware/auth';

// T554: GET /api/budget-allocations/[id] endpoint implementation
export interface GetBudgetAllocationResponse {
  id: string;
  incomeEventId: string;
  budgetCategoryId: string;
  amount: string;
  percentage: string;
  createdAt: string;
  updatedAt: string;
  budgetCategory: {
    name: string;
    color: string;
    targetPercentage: string;
  };
  incomeEvent: {
    name: string;
    amount: string;
    scheduledDate: string;
    actualDate: string | null;
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate the request
    const user = authenticateRequest(request);

    const allocationId = params.id;

    if (!allocationId || typeof allocationId !== 'string') {
      return NextResponse.json(
        {
          error: 'Invalid request',
          message: 'Allocation ID is required and must be a string.',
        },
        { status: 400 }
      );
    }

    // Get budget allocation from service
    const allocation = await BudgetService.getBudgetAllocationById(user.familyId, allocationId);

    if (!allocation) {
      return NextResponse.json(
        {
          error: 'Budget allocation not found',
          message: 'The requested budget allocation does not exist or you do not have permission to view it.',
        },
        { status: 404 }
      );
    }

    const response: GetBudgetAllocationResponse = {
      id: allocation.id,
      incomeEventId: allocation.incomeEventId,
      budgetCategoryId: allocation.budgetCategoryId,
      amount: allocation.amount.toString(),
      percentage: allocation.percentage.toString(),
      createdAt: allocation.createdAt.toISOString(),
      updatedAt: allocation.updatedAt.toISOString(),
      budgetCategory: {
        name: allocation.budgetCategory.name,
        color: allocation.budgetCategory.color,
        targetPercentage: allocation.budgetCategory.targetPercentage.toString(),
      },
      incomeEvent: {
        name: allocation.incomeEvent.name,
        amount: allocation.incomeEvent.amount.toString(),
        scheduledDate: allocation.incomeEvent.scheduledDate.toISOString(),
        actualDate: allocation.incomeEvent.actualDate?.toISOString() || null,
      },
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('GET /api/budget-allocations/[id] error:', error);

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
      if (error.message.includes('Family not found') || error.message.includes('not authorized')) {
        return NextResponse.json(
          {
            error: 'Access denied',
            message: 'You do not have permission to view this budget allocation',
          },
          { status: 403 }
        );
      }

      if (error.message.includes('database') || error.message.includes('connection')) {
        return NextResponse.json(
          {
            error: 'Database error',
            message: 'Unable to retrieve budget allocation at this time',
          },
          { status: 503 }
        );
      }
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to retrieve budget allocation',
      },
      { status: 500 }
    );
  }
}

// T555: PUT /api/budget-allocations/[id] endpoint implementation
export interface UpdateBudgetAllocationRequest {
  amount?: string;
  percentage?: string;
}

export interface UpdateBudgetAllocationResponse {
  allocation: {
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
  };
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate the request
    const user = authenticateRequest(request);

    // Validate path parameter
    if (!params.id || typeof params.id !== 'string' || params.id.trim().length === 0) {
      return NextResponse.json(
        {
          error: 'Invalid allocation ID',
          message: 'Allocation ID must be a non-empty string',
        },
        { status: 400 }
      );
    }

    // Parse request body
    const body: UpdateBudgetAllocationRequest = await request.json();
    const { amount, percentage } = body;

    // Validate that at least one field is provided
    if (!amount && !percentage) {
      return NextResponse.json(
        {
          error: 'Missing update fields',
          message: 'At least one of amount or percentage must be provided',
        },
        { status: 400 }
      );
    }

    // Validate field types and formats
    if (amount !== undefined) {
      if (typeof amount !== 'string' || isNaN(parseFloat(amount)) || parseFloat(amount) < 0) {
        return NextResponse.json(
          {
            error: 'Invalid amount',
            message: 'amount must be a valid non-negative number',
          },
          { status: 400 }
        );
      }
    }

    if (percentage !== undefined) {
      if (typeof percentage !== 'string' || isNaN(parseFloat(percentage)) || parseFloat(percentage) < 0 || parseFloat(percentage) > 100) {
        return NextResponse.json(
          {
            error: 'Invalid percentage',
            message: 'percentage must be a valid number between 0 and 100',
          },
          { status: 400 }
        );
      }
    }

    // Prepare update data
    const updateData: { amount?: number; percentage?: number } = {};
    if (amount !== undefined) {
      updateData.amount = parseFloat(amount);
    }
    if (percentage !== undefined) {
      updateData.percentage = parseFloat(percentage);
    }

    // Update budget allocation through service
    const allocation = await BudgetService.updateBudgetAllocation(
      user.familyId,
      params.id.trim(),
      updateData
    );

    const response: UpdateBudgetAllocationResponse = {
      allocation: {
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
      },
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('PUT /api/budget-allocations/[id] error:', error);

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
      if (error.message.includes('Budget allocation not found')) {
        return NextResponse.json(
          {
            error: 'Budget allocation not found',
            message: 'The specified budget allocation does not exist or you do not have access to it',
          },
          { status: 404 }
        );
      }

      if (error.message.includes('Budget exceeded')) {
        return NextResponse.json(
          {
            error: 'Budget exceeded',
            message: 'The updated allocation percentage would exceed 100%',
          },
          { status: 400 }
        );
      }

      if (error.message.includes('permission') || error.message.includes('unauthorized')) {
        return NextResponse.json(
          {
            error: 'Insufficient permissions',
            message: 'You do not have permission to update budget allocations for this family',
          },
          { status: 403 }
        );
      }

      if (error.message.includes('database') || error.message.includes('connection')) {
        return NextResponse.json(
          {
            error: 'Database error',
            message: 'Unable to update budget allocation at this time',
          },
          { status: 503 }
        );
      }
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to update budget allocation',
      },
      { status: 500 }
    );
  }
}