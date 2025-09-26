import { NextRequest, NextResponse } from 'next/server';
import { SpendingCategoryService, UpdateSpendingCategoryData } from '../../../../lib/services/spending-category.service';
import jwt from 'jsonwebtoken';

export interface UpdateSpendingCategoryRequest {
  name?: string;
  parentCategoryId?: string;
  budgetCategoryId?: string;
  icon?: string;
  color?: string;
  monthlyTarget?: number;
  isActive?: boolean;
  description?: string;
}

export interface UpdateSpendingCategoryResponse {
  message: string;
  category: {
    id: string;
    name: string;
    parentCategoryId: string | null;
    budgetCategoryId: string;
    icon: string | null;
    color: string | null;
    monthlyTarget: number | null;
    isActive: boolean;
    description: string | null;
    updatedAt: string;
    budgetCategory: {
      id: string;
      name: string;
      color: string;
    };
    parentCategory?: {
      id: string;
      name: string;
    } | null;
    children: Array<{
      id: string;
      name: string;
      icon: string | null;
      color: string | null;
    }>;
  };
}

export interface DeleteSpendingCategoryRequest {
  moveTransactionsTo?: string;
  movePaymentsTo?: string;
}

export interface DeleteSpendingCategoryResponse {
  message: string;
}

// T528: PUT /api/spending-categories/[id] - Update spending category endpoint migration
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json() as UpdateSpendingCategoryRequest;
    const { id: categoryId } = params;

    // Validate category ID
    if (!categoryId || typeof categoryId !== 'string') {
      return NextResponse.json({
        error: 'Invalid category ID',
        message: 'Category ID is required and must be a valid string.',
      }, { status: 400 });
    }

    // Extract token from Authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({
        error: 'No token provided',
        message: 'Authentication token is required.',
      }, { status: 401 });
    }

    const token = authHeader.substring(7);

    let familyId: string;
    let userId: string;
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

      if (!decoded || !decoded.familyId || !decoded.userId) {
        return NextResponse.json({
          error: 'Invalid token',
          message: 'The provided token is invalid.',
        }, { status: 401 });
      }

      familyId = decoded.familyId;
      userId = decoded.userId;
    } catch (jwtError) {
      return NextResponse.json({
        error: 'Invalid token',
        message: 'The provided token is invalid or expired.',
      }, { status: 401 });
    }

    // Extract and validate request body
    const {
      name,
      parentCategoryId,
      budgetCategoryId,
      icon,
      color,
      monthlyTarget,
      isActive,
      description,
    } = body;

    // Validate provided fields
    if (name !== undefined && (typeof name !== 'string' || name.trim().length === 0)) {
      return NextResponse.json({
        error: 'Invalid name',
        message: 'Category name must be a non-empty string.',
      }, { status: 400 });
    }

    if (parentCategoryId !== undefined && parentCategoryId !== null && typeof parentCategoryId !== 'string') {
      return NextResponse.json({
        error: 'Invalid parent category ID',
        message: 'Parent category ID must be a string or null.',
      }, { status: 400 });
    }

    if (budgetCategoryId !== undefined && typeof budgetCategoryId !== 'string') {
      return NextResponse.json({
        error: 'Invalid budget category ID',
        message: 'Budget category ID must be a string.',
      }, { status: 400 });
    }

    if (icon !== undefined && icon !== null && typeof icon !== 'string') {
      return NextResponse.json({
        error: 'Invalid icon',
        message: 'Icon must be a string or null.',
      }, { status: 400 });
    }

    if (color !== undefined && color !== null && typeof color !== 'string') {
      return NextResponse.json({
        error: 'Invalid color',
        message: 'Color must be a string or null.',
      }, { status: 400 });
    }

    if (monthlyTarget !== undefined && monthlyTarget !== null && (typeof monthlyTarget !== 'number' || monthlyTarget < 0)) {
      return NextResponse.json({
        error: 'Invalid monthly target',
        message: 'Monthly target must be a positive number or null.',
      }, { status: 400 });
    }

    if (isActive !== undefined && typeof isActive !== 'boolean') {
      return NextResponse.json({
        error: 'Invalid active status',
        message: 'Active status must be a boolean.',
      }, { status: 400 });
    }

    if (description !== undefined && description !== null && typeof description !== 'string') {
      return NextResponse.json({
        error: 'Invalid description',
        message: 'Description must be a string or null.',
      }, { status: 400 });
    }

    try {
      // Create update data
      const updateData: UpdateSpendingCategoryData = {};

      if (name !== undefined) updateData.name = name.trim();
      if (parentCategoryId !== undefined) updateData.parentCategoryId = parentCategoryId;
      if (budgetCategoryId !== undefined) updateData.budgetCategoryId = budgetCategoryId;
      if (icon !== undefined) updateData.icon = icon;
      if (color !== undefined) updateData.color = color;
      if (monthlyTarget !== undefined) updateData.monthlyTarget = monthlyTarget;
      if (isActive !== undefined) updateData.isActive = isActive;
      if (description !== undefined) updateData.description = description?.trim() || null;

      // Update the spending category
      const category = await SpendingCategoryService.updateSpendingCategory(
        familyId,
        categoryId,
        userId,
        updateData
      );

      const response: UpdateSpendingCategoryResponse = {
        message: 'Spending category updated successfully.',
        category: {
          id: category.id,
          name: category.name,
          parentCategoryId: category.parentCategoryId,
          budgetCategoryId: category.budgetCategoryId,
          icon: category.icon,
          color: category.color,
          monthlyTarget: category.monthlyTarget ? Number(category.monthlyTarget) : null,
          isActive: category.isActive,
          description: category.description,
          updatedAt: category.updatedAt.toISOString(),
          budgetCategory: {
            id: category.budgetCategory.id,
            name: category.budgetCategory.name,
            color: category.budgetCategory.color,
          },
          parentCategory: category.parentCategory ? {
            id: category.parentCategory.id,
            name: category.parentCategory.name,
          } : null,
          children: category.children?.map(child => ({
            id: child.id,
            name: child.name,
            icon: child.icon,
            color: child.color,
          })) || [],
        },
      };

      return NextResponse.json(response, { status: 200 });
    } catch (serviceError) {
      console.error('Update spending category error:', serviceError);

      if (serviceError instanceof Error) {
        if (serviceError.message === 'Spending category not found') {
          return NextResponse.json({
            error: 'Spending category not found',
            message: 'The spending category was not found.',
          }, { status: 404 });
        }

        if (serviceError.message === 'User not found or not authorized') {
          return NextResponse.json({
            error: 'Unauthorized',
            message: 'You do not have permission to update this spending category.',
          }, { status: 403 });
        }

        if (serviceError.message === 'Insufficient permissions to update spending categories') {
          return NextResponse.json({
            error: 'Insufficient permissions',
            message: 'You do not have permission to update spending categories.',
          }, { status: 403 });
        }

        if (serviceError.message === 'Budget category not found or not authorized') {
          return NextResponse.json({
            error: 'Invalid budget category',
            message: 'The specified budget category does not exist or is not active.',
          }, { status: 400 });
        }

        if (serviceError.message === 'Parent category not found or invalid') {
          return NextResponse.json({
            error: 'Invalid parent category',
            message: 'The specified parent category does not exist or is invalid.',
          }, { status: 400 });
        }

        if (serviceError.message === 'Category cannot be its own parent') {
          return NextResponse.json({
            error: 'Invalid parent category',
            message: 'A category cannot be its own parent.',
          }, { status: 400 });
        }

        if (serviceError.message === 'Cannot create circular reference in category hierarchy') {
          return NextResponse.json({
            error: 'Invalid parent category',
            message: 'Cannot create circular reference in category hierarchy.',
          }, { status: 400 });
        }

        if (serviceError.message === 'A category with this name already exists at this level') {
          return NextResponse.json({
            error: 'Duplicate category name',
            message: 'A category with this name already exists at this level.',
          }, { status: 400 });
        }
      }

      return NextResponse.json({
        error: 'Failed to update spending category',
        message: 'Failed to update spending category. Please try again.',
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Update spending category endpoint error:', error);

    return NextResponse.json({
      error: 'Internal server error',
      message: 'Failed to update spending category. Please try again.',
    }, { status: 500 });
  }
}

// T529: DELETE /api/spending-categories/[id] - Delete spending category endpoint migration
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: categoryId } = params;

    // Validate category ID
    if (!categoryId || typeof categoryId !== 'string') {
      return NextResponse.json({
        error: 'Invalid category ID',
        message: 'Spending category ID is required and must be a valid string.',
      }, { status: 400 });
    }

    // Extract token from Authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({
        error: 'No token provided',
        message: 'Authentication token is required.',
      }, { status: 401 });
    }

    const token = authHeader.substring(7);

    let familyId: string;
    let userId: string;
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

      if (!decoded || !decoded.familyId || !decoded.userId) {
        return NextResponse.json({
          error: 'Invalid token',
          message: 'The provided token is invalid.',
        }, { status: 401 });
      }

      familyId = decoded.familyId;
      userId = decoded.userId;
    } catch (jwtError) {
      if (jwtError instanceof jwt.TokenExpiredError) {
        return NextResponse.json({
          error: 'Token expired',
          message: 'Your session has expired. Please log in again.',
        }, { status: 401 });
      }

      return NextResponse.json({
        error: 'Invalid token',
        message: 'The provided token is invalid.',
      }, { status: 401 });
    }

    // Parse request body for optional move operations
    let moveOptions: { moveTransactionsTo?: string; movePaymentsTo?: string } = {};
    try {
      const body = await request.json() as DeleteSpendingCategoryRequest;
      if (body.moveTransactionsTo) moveOptions.moveTransactionsTo = body.moveTransactionsTo;
      if (body.movePaymentsTo) moveOptions.movePaymentsTo = body.movePaymentsTo;
    } catch (parseError) {
      // Body is optional for DELETE, so parsing errors are acceptable
    }

    try {
      // Delete the spending category using the service
      await SpendingCategoryService.deleteSpendingCategory(
        familyId,
        categoryId,
        userId,
        moveOptions
      );

      const response: DeleteSpendingCategoryResponse = {
        message: 'Spending category deleted successfully.',
      };

      return NextResponse.json(response, { status: 200 });
    } catch (serviceError) {
      console.error('Delete spending category error:', serviceError);

      if (serviceError instanceof Error) {
        if (serviceError.message === 'Spending category not found') {
          return NextResponse.json({
            error: 'Category not found',
            message: 'The spending category was not found.',
          }, { status: 404 });
        }

        if (serviceError.message === 'User not found or not authorized') {
          return NextResponse.json({
            error: 'Unauthorized',
            message: 'You are not authorized to delete this spending category.',
          }, { status: 403 });
        }

        if (serviceError.message === 'Insufficient permissions to delete spending categories') {
          return NextResponse.json({
            error: 'Insufficient permissions',
            message: 'You do not have permission to delete spending categories.',
          }, { status: 403 });
        }

        if (serviceError.message === 'Target category for transactions not found') {
          return NextResponse.json({
            error: 'Invalid target category',
            message: 'The specified target category for transactions does not exist.',
          }, { status: 400 });
        }

        if (serviceError.message === 'Target category for payments not found') {
          return NextResponse.json({
            error: 'Invalid target category',
            message: 'The specified target category for payments does not exist.',
          }, { status: 400 });
        }
      }

      return NextResponse.json({
        error: 'Failed to delete spending category',
        message: 'Failed to delete spending category. Please try again.',
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Delete spending category endpoint error:', error);

    return NextResponse.json({
      error: 'Internal server error',
      message: 'Failed to delete spending category. Please try again.',
    }, { status: 500 });
  }
}