import { NextRequest, NextResponse } from 'next/server';
import { BudgetService } from '@/lib/services/budget.service';
import { authenticateRequest, AuthenticationError } from '@/lib/middleware/auth';

export interface ValidateBudgetPercentagesRequest {
  categories: Array<{
    categoryId: string;
    percentage: number;
  }>;
}

export interface ValidateBudgetPercentagesResponse {
  isValid: boolean;
  totalPercentage: number;
  errors: string[];
}

// T553: POST /api/budget-categories/validate-percentages
export async function POST(request: NextRequest) {
  try {
    // Authenticate the request
    const user = authenticateRequest(request);

    // Parse request body
    const body = await request.json();
    const { categories }: ValidateBudgetPercentagesRequest = body;

    // Validate required fields
    if (!categories || !Array.isArray(categories)) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          message: 'Categories array is required.',
        },
        { status: 400 }
      );
    }

    // Validate each category in the array
    for (let i = 0; i < categories.length; i++) {
      const category = categories[i];

      if (!category.categoryId || typeof category.categoryId !== 'string') {
        return NextResponse.json(
          {
            error: 'Invalid request data',
            message: `Category at index ${i} must have a valid categoryId string.`,
          },
          { status: 400 }
        );
      }

      if (typeof category.percentage !== 'number') {
        return NextResponse.json(
          {
            error: 'Invalid request data',
            message: `Category at index ${i} must have a valid percentage number.`,
          },
          { status: 400 }
        );
      }
    }

    // Validate budget percentages through service
    const validationResult = await BudgetService.validateBudgetPercentages(user.familyId, categories);

    const response: ValidateBudgetPercentagesResponse = {
      isValid: validationResult.isValid,
      totalPercentage: validationResult.totalPercentage,
      errors: validationResult.errors,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('POST /api/budget-categories/validate-percentages error:', error);

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
      if (error.message.includes('not found') || error.message.includes('not authorized')) {
        return NextResponse.json(
          {
            error: 'Insufficient permissions',
            message: 'You do not have permission to validate budget categories in this family.',
          },
          { status: 403 }
        );
      }

      if (error.message.includes('database') || error.message.includes('connection')) {
        return NextResponse.json(
          {
            error: 'Database error',
            message: 'Unable to validate budget percentages at this time',
          },
          { status: 503 }
        );
      }
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to validate budget percentages. Please try again.',
      },
      { status: 500 }
    );
  }
}