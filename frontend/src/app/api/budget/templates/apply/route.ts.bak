import { NextRequest, NextResponse } from 'next/server';
import { BudgetService } from '@/lib/services/budget.service';
import { verifyJWT } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // Verify JWT token
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json(
        { error: 'Authorization token required' },
        { status: 401 }
      );
    }

    const payload = await verifyJWT(token);
    if (!payload?.familyId) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    const { familyId } = payload;
    const body = await request.json();

    const { template } = body;

    // Validate request body
    if (!template) {
      return NextResponse.json(
        { error: 'Template is required' },
        { status: 400 }
      );
    }

    if (!template.categories || !Array.isArray(template.categories)) {
      return NextResponse.json(
        { error: 'Template must contain a categories array' },
        { status: 400 }
      );
    }

    // Validate template categories
    for (const category of template.categories) {
      if (!category.name || typeof category.name !== 'string') {
        return NextResponse.json(
          { error: 'Each category must have a valid name' },
          { status: 400 }
        );
      }

      if (typeof category.percentage !== 'number' || category.percentage < 0 || category.percentage > 100) {
        return NextResponse.json(
          { error: 'Each category must have a valid percentage between 0 and 100' },
          { status: 400 }
        );
      }
    }

    // Validate total percentages
    const totalPercentage = template.categories.reduce(
      (sum: number, cat: any) => sum + cat.percentage, 0
    );

    if (totalPercentage > 100) {
      return NextResponse.json(
        { error: `Total percentages cannot exceed 100%. Current total: ${totalPercentage}%` },
        { status: 400 }
      );
    }

    // Apply budget template using BudgetService
    const createdCategories = await BudgetService.applyBudgetTemplate(familyId, template);

    return NextResponse.json({
      message: 'Budget template applied successfully',
      categories: createdCategories.map(category => ({
        id: category.id,
        name: category.name,
        targetPercentage: Number(category.targetPercentage),
        color: category.color,
        sortOrder: category.sortOrder,
        isActive: category.isActive,
        createdAt: category.createdAt,
        updatedAt: category.updatedAt
      })),
      summary: {
        totalCategories: createdCategories.length,
        totalPercentage: createdCategories.reduce(
          (sum, cat) => sum + Number(cat.targetPercentage), 0
        ),
        isComplete: totalPercentage === 100
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Error applying budget template:', error);

    if (error.message?.includes('percentage')) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to apply budget template' },
      { status: 500 }
    );
  }
}