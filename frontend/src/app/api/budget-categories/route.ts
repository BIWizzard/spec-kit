import { NextRequest, NextResponse } from 'next/server';
import { BudgetService } from '@/lib/services/budget.service';
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