import { NextRequest, NextResponse } from 'next/server';
import { BudgetService } from '@/lib/services/budget.service';
import { authenticateRequest, AuthenticationError } from '@/lib/middleware/auth';

// T556: POST /api/budget-allocations/[incomeEventId]/generate endpoint implementation
export interface GenerateBudgetAllocationsRequest {
  templateId?: string;
  customAllocations?: Array<{
    budgetCategoryId: string;
    percentage: number;
  }>;
}

export interface GenerateBudgetAllocationsResponse {
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
  totalAmount: string;
  totalPercentage: string;
}

export async function POST(
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

    // Parse request body
    const body: GenerateBudgetAllocationsRequest = await request.json();
    const { templateId, customAllocations } = body;

    // Validate that either templateId or customAllocations is provided
    if (!templateId && (!customAllocations || customAllocations.length === 0)) {
      return NextResponse.json(
        {
          error: 'Missing allocation data',
          message: 'Either templateId or customAllocations must be provided',
        },
        { status: 400 }
      );
    }

    // Validate templateId if provided
    if (templateId !== undefined && (typeof templateId !== 'string' || templateId.trim().length === 0)) {
      return NextResponse.json(
        {
          error: 'Invalid template ID',
          message: 'templateId must be a non-empty string',
        },
        { status: 400 }
      );
    }

    // Validate customAllocations if provided
    if (customAllocations) {
      if (!Array.isArray(customAllocations)) {
        return NextResponse.json(
          {
            error: 'Invalid custom allocations',
            message: 'customAllocations must be an array',
          },
          { status: 400 }
        );
      }

      for (const allocation of customAllocations) {
        if (!allocation.budgetCategoryId || typeof allocation.budgetCategoryId !== 'string' || allocation.budgetCategoryId.trim().length === 0) {
          return NextResponse.json(
            {
              error: 'Invalid custom allocation',
              message: 'Each custom allocation must have a valid budgetCategoryId',
            },
            { status: 400 }
          );
        }

        if (typeof allocation.percentage !== 'number' || allocation.percentage < 0 || allocation.percentage > 100) {
          return NextResponse.json(
            {
              error: 'Invalid custom allocation',
              message: 'Each custom allocation percentage must be a number between 0 and 100',
            },
            { status: 400 }
          );
        }
      }

      // Check that total percentage doesn't exceed 100%
      const totalPercentage = customAllocations.reduce((sum, allocation) => sum + allocation.percentage, 0);
      if (totalPercentage > 100) {
        return NextResponse.json(
          {
            error: 'Invalid allocation percentages',
            message: 'Total allocation percentage cannot exceed 100%',
          },
          { status: 400 }
        );
      }
    }

    // Generate budget allocations through service
    const result = await BudgetService.generateBudgetAllocations(
      user.familyId,
      params.incomeEventId.trim(),
      templateId ? { templateId: templateId.trim() } : { customAllocations }
    );

    const response: GenerateBudgetAllocationsResponse = {
      allocations: result.allocations.map(allocation => ({
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
      totalAmount: result.totalAmount.toString(),
      totalPercentage: result.totalPercentage.toString(),
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('POST /api/budget-allocations/[incomeEventId]/generate error:', error);

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

      if (error.message.includes('Template not found')) {
        return NextResponse.json(
          {
            error: 'Template not found',
            message: 'The specified budget template does not exist or you do not have access to it',
          },
          { status: 404 }
        );
      }

      if (error.message.includes('Budget category not found')) {
        return NextResponse.json(
          {
            error: 'Budget category not found',
            message: 'One or more specified budget categories do not exist or you do not have access to them',
          },
          { status: 404 }
        );
      }

      if (error.message.includes('Allocations already exist')) {
        return NextResponse.json(
          {
            error: 'Allocations already exist',
            message: 'Budget allocations already exist for this income event. Delete existing allocations first.',
          },
          { status: 409 }
        );
      }

      if (error.message.includes('permission') || error.message.includes('unauthorized')) {
        return NextResponse.json(
          {
            error: 'Insufficient permissions',
            message: 'You do not have permission to generate budget allocations for this family',
          },
          { status: 403 }
        );
      }

      if (error.message.includes('database') || error.message.includes('connection')) {
        return NextResponse.json(
          {
            error: 'Database error',
            message: 'Unable to generate budget allocations at this time',
          },
          { status: 503 }
        );
      }
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to generate budget allocations',
      },
      { status: 500 }
    );
  }
}