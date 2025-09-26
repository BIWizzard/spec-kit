import { NextRequest, NextResponse } from 'next/server';
import { BudgetService } from '@/lib/services/budget.service';
import jwt from 'jsonwebtoken';

interface BudgetOverviewResponse {
  categories: Array<{
    id: string;
    name: string;
    targetPercentage: number;
    color: string;
    sortOrder: number;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
  }>;
  totalPercentage: number;
  isComplete: boolean;
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
      const userInfo = await extractUserFromToken(request);
      familyId = userInfo.familyId;
    } catch (authError) {
      return NextResponse.json(
        {
          error: 'Unauthorized',
          message: 'Valid authentication token required',
        },
        { status: 401 }
      );
    }

    // Get budget overview using service
    const overview = await BudgetService.getBudgetOverview(familyId);

    const response: BudgetOverviewResponse = {
      categories: overview.categories.map(category => ({
        id: category.id,
        name: category.name,
        targetPercentage: Number(category.targetPercentage),
        color: category.color,
        sortOrder: category.sortOrder,
        isActive: category.isActive,
        createdAt: category.createdAt.toISOString(),
        updatedAt: category.updatedAt.toISOString(),
      })),
      totalPercentage: overview.totalPercentage,
      isComplete: overview.isComplete,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Budget overview error:', error);

    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return NextResponse.json(
          {
            error: 'Not found',
            message: error.message,
          },
          { status: 404 }
        );
      }
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to retrieve budget overview',
      },
      { status: 500 }
    );
  }
}