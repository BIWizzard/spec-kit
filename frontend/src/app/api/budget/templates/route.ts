import { NextRequest, NextResponse } from 'next/server';
import { BudgetService } from '@/lib/services/budget.service';
import { authenticateRequest, AuthenticationError } from '@/lib/middleware/auth';

// T559: GET /api/budget/templates endpoint implementation
export interface BudgetTemplatesResponse {
  templates: Array<{
    id: string;
    name: string;
    description: string;
    isDefault: boolean;
    isActive: boolean;
    totalPercentage: string;
    categoryCount: number;
    allocations: Array<{
      budgetCategoryId: string;
      percentage: string;
      budgetCategory: {
        name: string;
        color: string;
        priority: number;
      };
    }>;
    createdAt: string;
    updatedAt: string;
    lastUsed: string | null;
    usageCount: number;
  }>;
  totalCount: number;
}

export async function GET(request: NextRequest) {
  try {
    // Authenticate the request
    const user = authenticateRequest(request);

    // Extract query parameters
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('activeOnly') === 'true';
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0;

    // Validate pagination parameters
    if (limit !== undefined && (isNaN(limit) || limit < 1 || limit > 100)) {
      return NextResponse.json(
        {
          error: 'Invalid limit',
          message: 'limit must be a number between 1 and 100',
        },
        { status: 400 }
      );
    }

    if (isNaN(offset) || offset < 0) {
      return NextResponse.json(
        {
          error: 'Invalid offset',
          message: 'offset must be a non-negative number',
        },
        { status: 400 }
      );
    }

    // Get budget templates from service
    const templates = await BudgetService.getBudgetTemplates(
      user.familyId,
      {
        activeOnly,
        limit,
        offset,
      }
    );

    const response: BudgetTemplatesResponse = {
      templates: templates.templates.map(template => ({
        id: template.id,
        name: template.name,
        description: template.description,
        isDefault: template.isDefault,
        isActive: template.isActive,
        totalPercentage: template.totalPercentage.toString(),
        categoryCount: template.categoryCount,
        allocations: template.allocations.map(allocation => ({
          budgetCategoryId: allocation.budgetCategoryId,
          percentage: allocation.percentage.toString(),
          budgetCategory: {
            name: allocation.budgetCategory.name,
            color: allocation.budgetCategory.color,
            priority: allocation.budgetCategory.priority,
          },
        })),
        createdAt: template.createdAt.toISOString(),
        updatedAt: template.updatedAt.toISOString(),
        lastUsed: template.lastUsed?.toISOString() || null,
        usageCount: template.usageCount,
      })),
      totalCount: templates.totalCount,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('GET /api/budget/templates error:', error);

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
      if (error.message.includes('permission') || error.message.includes('unauthorized')) {
        return NextResponse.json(
          {
            error: 'Insufficient permissions',
            message: 'You do not have permission to view budget templates for this family',
          },
          { status: 403 }
        );
      }

      if (error.message.includes('database') || error.message.includes('connection')) {
        return NextResponse.json(
          {
            error: 'Database error',
            message: 'Unable to retrieve budget templates at this time',
          },
          { status: 503 }
        );
      }
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to retrieve budget templates',
      },
      { status: 500 }
    );
  }
}

// T560: POST /api/budget/templates endpoint implementation
export interface CreateBudgetTemplateRequest {
  name: string;
  description?: string;
  isDefault?: boolean;
  allocations: Array<{
    budgetCategoryId: string;
    percentage: number;
  }>;
}

export interface CreateBudgetTemplateResponse {
  template: {
    id: string;
    name: string;
    description: string;
    isDefault: boolean;
    isActive: boolean;
    totalPercentage: string;
    categoryCount: number;
    allocations: Array<{
      budgetCategoryId: string;
      percentage: string;
      budgetCategory: {
        name: string;
        color: string;
        priority: number;
      };
    }>;
    createdAt: string;
    updatedAt: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate the request
    const user = authenticateRequest(request);

    // Parse request body
    const body: CreateBudgetTemplateRequest = await request.json();
    const { name, description, isDefault, allocations } = body;

    // Validate required fields
    if (!name || !allocations) {
      return NextResponse.json(
        {
          error: 'Missing required fields',
          message: 'name and allocations are required',
        },
        { status: 400 }
      );
    }

    // Validate field types and formats
    if (typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        {
          error: 'Invalid name',
          message: 'name must be a non-empty string',
        },
        { status: 400 }
      );
    }

    if (description !== undefined && typeof description !== 'string') {
      return NextResponse.json(
        {
          error: 'Invalid description',
          message: 'description must be a string',
        },
        { status: 400 }
      );
    }

    if (isDefault !== undefined && typeof isDefault !== 'boolean') {
      return NextResponse.json(
        {
          error: 'Invalid isDefault',
          message: 'isDefault must be a boolean',
        },
        { status: 400 }
      );
    }

    if (!Array.isArray(allocations) || allocations.length === 0) {
      return NextResponse.json(
        {
          error: 'Invalid allocations',
          message: 'allocations must be a non-empty array',
        },
        { status: 400 }
      );
    }

    // Validate allocations
    for (const allocation of allocations) {
      if (!allocation.budgetCategoryId || typeof allocation.budgetCategoryId !== 'string' || allocation.budgetCategoryId.trim().length === 0) {
        return NextResponse.json(
          {
            error: 'Invalid allocation',
            message: 'Each allocation must have a valid budgetCategoryId',
          },
          { status: 400 }
        );
      }

      if (typeof allocation.percentage !== 'number' || allocation.percentage < 0 || allocation.percentage > 100) {
        return NextResponse.json(
          {
            error: 'Invalid allocation',
            message: 'Each allocation percentage must be a number between 0 and 100',
          },
          { status: 400 }
        );
      }
    }

    // Check that total percentage doesn't exceed 100%
    const totalPercentage = allocations.reduce((sum, allocation) => sum + allocation.percentage, 0);
    if (totalPercentage > 100) {
      return NextResponse.json(
        {
          error: 'Invalid allocation percentages',
          message: 'Total allocation percentage cannot exceed 100%',
        },
        { status: 400 }
      );
    }

    // Create budget template through service
    const template = await BudgetService.createBudgetTemplate(
      user.familyId,
      {
        name: name.trim(),
        description: description?.trim(),
        isDefault: isDefault || false,
        allocations: allocations.map(a => ({
          budgetCategoryId: a.budgetCategoryId.trim(),
          percentage: a.percentage,
        })),
      }
    );

    const response: CreateBudgetTemplateResponse = {
      template: {
        id: template.id,
        name: template.name,
        description: template.description,
        isDefault: template.isDefault,
        isActive: template.isActive,
        totalPercentage: template.totalPercentage.toString(),
        categoryCount: template.categoryCount,
        allocations: template.allocations.map(allocation => ({
          budgetCategoryId: allocation.budgetCategoryId,
          percentage: allocation.percentage.toString(),
          budgetCategory: {
            name: allocation.budgetCategory.name,
            color: allocation.budgetCategory.color,
            priority: allocation.budgetCategory.priority,
          },
        })),
        createdAt: template.createdAt.toISOString(),
        updatedAt: template.updatedAt.toISOString(),
      },
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('POST /api/budget/templates error:', error);

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
      if (error.message.includes('Template name already exists')) {
        return NextResponse.json(
          {
            error: 'Duplicate template name',
            message: 'A budget template with this name already exists',
          },
          { status: 409 }
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

      if (error.message.includes('permission') || error.message.includes('unauthorized')) {
        return NextResponse.json(
          {
            error: 'Insufficient permissions',
            message: 'You do not have permission to create budget templates for this family',
          },
          { status: 403 }
        );
      }

      if (error.message.includes('database') || error.message.includes('connection')) {
        return NextResponse.json(
          {
            error: 'Database error',
            message: 'Unable to create budget template at this time',
          },
          { status: 503 }
        );
      }
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to create budget template',
      },
      { status: 500 }
    );
  }
}