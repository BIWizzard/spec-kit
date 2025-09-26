import { NextRequest, NextResponse } from 'next/server';
import { SpendingCategoryService, SpendingCategoryFilter } from '@/lib/services/spending-category.service';
import jwt from 'jsonwebtoken';

interface SpendingCategoryInfo {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  isActive: boolean;
  monthlyTarget?: number;
  description?: string;
  parentCategoryId?: string;
  budgetCategoryId: string;
  createdAt: string;
  updatedAt: string;
  budgetCategory: {
    id: string;
    name: string;
    color: string;
  };
  parentCategory?: {
    id: string;
    name: string;
  };
  children: Array<{
    id: string;
    name: string;
    icon?: string;
    color?: string;
  }>;
  _count: {
    transactions: number;
    payments: number;
  };
}

interface SpendingCategoriesResponse {
  categories: SpendingCategoryInfo[];
  total: number;
  filters: {
    includeInactive: boolean;
    parentCategoryId?: string;
    budgetCategoryId?: string;
    hasMonthlyTarget?: boolean;
    searchTerm?: string;
  };
}

async function extractUserFromToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('No token provided');
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix

  try {
    const jwtSecret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'dev-jwt-secret-change-this-in-production-make-it-really-long';
    const decoded = jwt.verify(token, jwtSecret) as any;

    if (!decoded || !decoded.familyId) {
      throw new Error('Invalid token');
    }

    return {
      familyId: decoded.familyId,
      userId: decoded.userId,
    };
  } catch (jwtError) {
    throw new Error('Invalid token');
  }
}

export async function GET(request: NextRequest) {
  try {
    // Extract user from JWT token
    let familyId: string;
    try {
      const tokenData = await extractUserFromToken(request);
      familyId = tokenData.familyId;
    } catch (tokenError) {
      return NextResponse.json(
        {
          error: 'Authentication error',
          message: tokenError.message === 'No token provided'
            ? 'Authentication token is required.'
            : 'The provided token is invalid or expired.',
        },
        { status: 401 }
      );
    }

    // Parse query parameters for filtering
    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get('includeInactive') === 'true';
    const parentCategoryId = searchParams.get('parentCategoryId') || undefined;
    const budgetCategoryId = searchParams.get('budgetCategoryId') || undefined;
    const hasMonthlyTargetParam = searchParams.get('hasMonthlyTarget');
    const hasMonthlyTarget = hasMonthlyTargetParam ? hasMonthlyTargetParam === 'true' : undefined;
    const searchTerm = searchParams.get('searchTerm') || undefined;

    const filter: SpendingCategoryFilter = {
      includeInactive,
      parentCategoryId,
      budgetCategoryId,
      hasMonthlyTarget,
      searchTerm,
    };

    try {
      // Get spending categories using the service
      const categories = await SpendingCategoryService.getSpendingCategories(familyId, filter);

      // Transform categories to match response interface
      const categoryInfo: SpendingCategoryInfo[] = categories.map(category => ({
        id: category.id,
        name: category.name,
        icon: category.icon || undefined,
        color: category.color || undefined,
        isActive: category.isActive,
        monthlyTarget: category.monthlyTarget ? Number(category.monthlyTarget) : undefined,
        description: category.description || undefined,
        parentCategoryId: category.parentCategoryId || undefined,
        budgetCategoryId: category.budgetCategoryId,
        createdAt: category.createdAt.toISOString(),
        updatedAt: category.updatedAt.toISOString(),
        budgetCategory: (category as any).budgetCategory || {
          id: category.budgetCategoryId,
          name: 'Unknown',
          color: '#6B7280',
        },
        parentCategory: (category as any).parentCategory || undefined,
        children: (category as any).children || [],
        _count: (category as any)._count || {
          transactions: 0,
          payments: 0,
        },
      }));

      const response: SpendingCategoriesResponse = {
        categories: categoryInfo,
        total: categoryInfo.length,
        filters: {
          includeInactive,
          parentCategoryId,
          budgetCategoryId,
          hasMonthlyTarget,
          searchTerm,
        },
      };

      return NextResponse.json(response);
    } catch (serviceError) {
      console.error('Get spending categories error:', serviceError);

      if (serviceError instanceof Error) {
        // Handle specific service errors
        if (serviceError.message.includes('family not found') || serviceError.message.includes('not authorized')) {
          return NextResponse.json(
            {
              error: 'Access denied',
              message: 'You do not have access to spending categories for this family.',
            },
            { status: 403 }
          );
        }
      }

      return NextResponse.json(
        {
          error: 'Failed to get spending categories',
          message: 'Failed to retrieve spending categories. Please try again.',
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Get spending categories endpoint error:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to retrieve spending categories. Please try again.',
      },
      { status: 500 }
    );
  }
}