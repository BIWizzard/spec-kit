import { NextRequest, NextResponse } from 'next/server';
import { BudgetService, UpdateBudgetCategoryData } from '@/lib/services/budget.service';
import { authenticateRequest, AuthenticationError } from '@/lib/middleware/auth';

export interface GetBudgetCategoryResponse {
  id: string;
  name: string;
  targetPercentage: string;
  color: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  budgetAllocations: Array<{
    id: string;
    incomeEventId: string;
    amount: string;
    percentage: string;
    incomeEvent: {
      name: string;
      scheduledDate: string;
      amount: string;
    };
  }>;
  spendingCategories: Array<{
    id: string;
    name: string;
    monthlyTarget: string | null;
  }>;
}

// T550: GET /api/budget-categories/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate the request
    const user = authenticateRequest(request);

    const categoryId = params.id;

    if (!categoryId || typeof categoryId !== 'string') {
      return NextResponse.json(
        {
          error: 'Invalid request',
          message: 'Category ID is required and must be a string.',
        },
        { status: 400 }
      );
    }

    // Get budget category from service
    const category = await BudgetService.getBudgetCategoryById(user.familyId, categoryId);

    if (!category) {
      return NextResponse.json(
        {
          error: 'Budget category not found',
          message: 'The requested budget category does not exist or you do not have permission to view it.',
        },
        { status: 404 }
      );
    }

    const response: GetBudgetCategoryResponse = {
      id: category.id,
      name: category.name,
      targetPercentage: category.targetPercentage.toString(),
      color: category.color,
      sortOrder: category.sortOrder,
      isActive: category.isActive,
      createdAt: category.createdAt.toISOString(),
      updatedAt: category.updatedAt.toISOString(),
      budgetAllocations: category.budgetAllocations.map(allocation => ({
        id: allocation.id,
        incomeEventId: allocation.incomeEventId,
        amount: allocation.amount.toString(),
        percentage: allocation.percentage.toString(),
        incomeEvent: {
          name: allocation.incomeEvent.name,
          scheduledDate: allocation.incomeEvent.scheduledDate.toISOString(),
          amount: allocation.incomeEvent.amount.toString(),
        },
      })),
      spendingCategories: category.spendingCategories.map(spendingCat => ({
        id: spendingCat.id,
        name: spendingCat.name,
        monthlyTarget: spendingCat.monthlyTarget?.toString() || null,
      })),
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('GET /api/budget-categories/[id] error:', error);

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
            message: 'You do not have permission to view this budget category',
          },
          { status: 403 }
        );
      }

      if (error.message.includes('database') || error.message.includes('connection')) {
        return NextResponse.json(
          {
            error: 'Database error',
            message: 'Unable to retrieve budget category at this time',
          },
          { status: 503 }
        );
      }
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to retrieve budget category',
      },
      { status: 500 }
    );
  }
}

export interface UpdateBudgetCategoryRequest {
  name?: string;
  targetPercentage?: number;
  color?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface UpdateBudgetCategoryResponse {
  id: string;
  name: string;
  targetPercentage: number;
  color: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// T551: PUT /api/budget-categories/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate the request
    const user = authenticateRequest(request);

    const categoryId = params.id;

    if (!categoryId || typeof categoryId !== 'string') {
      return NextResponse.json(
        {
          error: 'Invalid request',
          message: 'Category ID is required and must be a string.',
        },
        { status: 400 }
      );
    }

    // Parse request body
    const body = await request.json();
    const {
      name,
      targetPercentage,
      color,
      sortOrder,
      isActive
    }: UpdateBudgetCategoryRequest = body;

    // Validate optional fields
    if (name !== undefined && (typeof name !== 'string' || name.trim().length === 0)) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          message: 'Name must be a non-empty string if provided.'
        },
        { status: 400 }
      );
    }

    if (name !== undefined && name.trim().length > 100) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          message: 'Name cannot exceed 100 characters.'
        },
        { status: 400 }
      );
    }

    if (targetPercentage !== undefined && (typeof targetPercentage !== 'number' || targetPercentage <= 0 || targetPercentage > 100)) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          message: 'Target percentage must be a number between 0.01 and 100 if provided.'
        },
        { status: 400 }
      );
    }

    if (color !== undefined && (typeof color !== 'string' || !/^#[0-9A-F]{6}$/i.test(color))) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          message: 'Color must be a valid hex color code (e.g., #FF5733) if provided.'
        },
        { status: 400 }
      );
    }

    if (sortOrder !== undefined && (typeof sortOrder !== 'number' || sortOrder < 1)) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          message: 'Sort order must be a positive integer if provided.'
        },
        { status: 400 }
      );
    }

    if (isActive !== undefined && typeof isActive !== 'boolean') {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          message: 'isActive must be a boolean if provided.'
        },
        { status: 400 }
      );
    }

    // Create update data
    const updateBudgetCategoryData: UpdateBudgetCategoryData = {};
    if (name !== undefined) updateBudgetCategoryData.name = name.trim();
    if (targetPercentage !== undefined) updateBudgetCategoryData.targetPercentage = targetPercentage;
    if (color !== undefined) updateBudgetCategoryData.color = color;
    if (sortOrder !== undefined) updateBudgetCategoryData.sortOrder = sortOrder;
    if (isActive !== undefined) updateBudgetCategoryData.isActive = isActive;

    // Update budget category through service
    const category = await BudgetService.updateBudgetCategory(user.familyId, categoryId, updateBudgetCategoryData);

    const response: UpdateBudgetCategoryResponse = {
      id: category.id,
      name: category.name,
      targetPercentage: Number(category.targetPercentage),
      color: category.color,
      sortOrder: category.sortOrder,
      isActive: category.isActive,
      createdAt: category.createdAt.toISOString(),
      updatedAt: category.updatedAt.toISOString(),
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('PUT /api/budget-categories/[id] error:', error);

    if (error instanceof AuthenticationError) {
      return NextResponse.json(
        {
          error: 'Not authenticated',
          message: error.message,
        },
        { status: error.statusCode }
      );
    }

    if (error instanceof Error) {
      if (error.message.includes('Budget category not found')) {
        return NextResponse.json(
          {
            error: 'Budget category not found',
            message: 'The requested budget category does not exist or you do not have permission to update it.',
          },
          { status: 404 }
        );
      }

      if (error.message.includes('Total budget percentages cannot exceed 100%')) {
        return NextResponse.json(
          {
            error: 'Budget validation error',
            message: error.message,
          },
          { status: 400 }
        );
      }

      if (error.message.includes('not found') || error.message.includes('not authorized')) {
        return NextResponse.json(
          {
            error: 'Insufficient permissions',
            message: 'You do not have permission to update budget categories in this family.',
          },
          { status: 403 }
        );
      }

      if (error.message.includes('database') || error.message.includes('connection')) {
        return NextResponse.json(
          {
            error: 'Database error',
            message: 'Unable to update budget category at this time',
          },
          { status: 503 }
        );
      }

      if (error.message.includes('Unique constraint')) {
        return NextResponse.json(
          {
            error: 'Duplicate category',
            message: 'A budget category with this name already exists.',
          },
          { status: 409 }
        );
      }
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to update budget category. Please try again.',
      },
      { status: 500 }
    );
  }
}

// T552: DELETE /api/budget-categories/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate the request
    const user = authenticateRequest(request);

    const categoryId = params.id;

    if (!categoryId || typeof categoryId !== 'string') {
      return NextResponse.json(
        {
          error: 'Invalid request',
          message: 'Category ID is required and must be a string.',
        },
        { status: 400 }
      );
    }

    // Delete budget category through service
    await BudgetService.deleteBudgetCategory(user.familyId, categoryId);

    return NextResponse.json(
      {
        message: 'Budget category deleted successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('DELETE /api/budget-categories/[id] error:', error);

    if (error instanceof AuthenticationError) {
      return NextResponse.json(
        {
          error: 'Not authenticated',
          message: error.message,
        },
        { status: error.statusCode }
      );
    }

    if (error instanceof Error) {
      if (error.message.includes('Budget category not found')) {
        return NextResponse.json(
          {
            error: 'Budget category not found',
            message: 'The requested budget category does not exist or you do not have permission to delete it.',
          },
          { status: 404 }
        );
      }

      if (error.message.includes('Cannot delete budget category with active spending categories')) {
        return NextResponse.json(
          {
            error: 'Cannot delete category',
            message: 'Cannot delete budget category that has active spending categories. Please remove or reassign spending categories first.',
          },
          { status: 409 }
        );
      }

      if (error.message.includes('not found') || error.message.includes('not authorized')) {
        return NextResponse.json(
          {
            error: 'Insufficient permissions',
            message: 'You do not have permission to delete budget categories in this family.',
          },
          { status: 403 }
        );
      }

      if (error.message.includes('database') || error.message.includes('connection')) {
        return NextResponse.json(
          {
            error: 'Database error',
            message: 'Unable to delete budget category at this time',
          },
          { status: 503 }
        );
      }
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to delete budget category. Please try again.',
      },
      { status: 500 }
    );
  }
}