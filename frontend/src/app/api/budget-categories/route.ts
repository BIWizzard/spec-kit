import { NextRequest, NextResponse } from 'next/server';
import { BudgetService, CreateBudgetCategoryData } from '@/lib/services/budget.service';
import { authenticateRequest, AuthenticationError } from '@/lib/middleware/auth';

export interface GetBudgetCategoriesResponse {
  categories: Array<{
    id: string;
    name: string;
    targetPercentage: string;
    color: string;
    sortOrder: number;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
  }>;
  totalPercentage: number;
  isComplete: boolean;
}

export async function GET(request: NextRequest) {
  try {
    // Authenticate the request
    const user = authenticateRequest(request);

    // Extract query parameters
    const { searchParams } = new URL(request.url);

    // Check if inactive categories should be included
    const includeInactive = searchParams.get('includeInactive') === 'true';

    // Get budget categories from service
    const categories = await BudgetService.getBudgetCategories(user.familyId, includeInactive);

    // Calculate total percentage and completion status
    const totalPercentage = categories.reduce((sum, cat) => sum + Number(cat.targetPercentage), 0);
    const isComplete = totalPercentage === 100;

    const response: GetBudgetCategoriesResponse = {
      categories: categories.map(category => ({
        id: category.id,
        name: category.name,
        targetPercentage: category.targetPercentage.toString(),
        color: category.color,
        sortOrder: category.sortOrder,
        isActive: category.isActive,
        createdAt: category.createdAt.toISOString(),
        updatedAt: category.updatedAt.toISOString(),
      })),
      totalPercentage,
      isComplete,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('GET /api/budget-categories error:', error);

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
            message: 'You do not have permission to view budget categories for this family',
          },
          { status: 403 }
        );
      }

      if (error.message.includes('database') || error.message.includes('connection')) {
        return NextResponse.json(
          {
            error: 'Database error',
            message: 'Unable to retrieve budget categories at this time',
          },
          { status: 503 }
        );
      }
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to retrieve budget categories',
      },
      { status: 500 }
    );
  }
}

export interface CreateBudgetCategoryRequest {
  name: string;
  targetPercentage: number;
  color: string;
  sortOrder?: number;
}

export interface CreateBudgetCategoryResponse {
  id: string;
  name: string;
  targetPercentage: number;
  color: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate the request
    const user = authenticateRequest(request);

    // Parse request body
    const body = await request.json();
    const {
      name,
      targetPercentage,
      color,
      sortOrder
    }: CreateBudgetCategoryRequest = body;

    // Validate required fields
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          message: 'Name is required and must be a non-empty string.'
        },
        { status: 400 }
      );
    }

    if (name.trim().length > 100) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          message: 'Name cannot exceed 100 characters.'
        },
        { status: 400 }
      );
    }

    if (typeof targetPercentage !== 'number' || targetPercentage <= 0 || targetPercentage > 100) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          message: 'Target percentage must be a number between 0.01 and 100.'
        },
        { status: 400 }
      );
    }

    if (!color || typeof color !== 'string' || !/^#[0-9A-F]{6}$/i.test(color)) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          message: 'Color is required and must be a valid hex color code (e.g., #FF5733).'
        },
        { status: 400 }
      );
    }

    if (sortOrder !== undefined && (typeof sortOrder !== 'number' || sortOrder < 1)) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          message: 'Sort order must be a positive integer.'
        },
        { status: 400 }
      );
    }

    // Create budget category data
    const createBudgetCategoryData: CreateBudgetCategoryData = {
      name: name.trim(),
      targetPercentage,
      color,
      sortOrder,
    };

    // Create budget category through service
    const category = await BudgetService.createBudgetCategory(user.familyId, createBudgetCategoryData);

    const response: CreateBudgetCategoryResponse = {
      id: category.id,
      name: category.name,
      targetPercentage: Number(category.targetPercentage),
      color: category.color,
      sortOrder: category.sortOrder,
      isActive: category.isActive,
      createdAt: category.createdAt.toISOString(),
      updatedAt: category.updatedAt.toISOString(),
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('POST /api/budget-categories error:', error);

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
            message: 'You do not have permission to create budget categories in this family.',
          },
          { status: 403 }
        );
      }

      if (error.message.includes('database') || error.message.includes('connection')) {
        return NextResponse.json(
          {
            error: 'Database error',
            message: 'Unable to create budget category at this time',
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
        message: 'Failed to create budget category. Please try again.',
      },
      { status: 500 }
    );
  }
}