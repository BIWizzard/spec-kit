import { Request, Response } from 'express';
import { BudgetService } from '../../services/budget.service';
import jwt from 'jsonwebtoken';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    familyId: string;
    email: string;
    role: string;
  };
}

export interface ValidatePercentagesRequest {
  categories: Array<{
    id: string;
    targetPercentage: number;
  }>;
}

export interface ValidatePercentagesResponse {
  isValid: boolean;
  totalPercentage: number;
  difference: number;
  suggestions: Array<{
    categoryId: string;
    currentPercentage: number;
    suggestedPercentage: number;
  }>;
}

export async function validateBudgetPercentages(req: AuthenticatedRequest, res: Response) {
  try {
    // Validate request body
    const { categories }: ValidatePercentagesRequest = req.body;

    if (!categories || !Array.isArray(categories)) {
      return res.status(400).json({
        error: 'Invalid categories',
        message: 'Categories must be provided as an array.',
      });
    }

    if (categories.length === 0) {
      return res.status(400).json({
        error: 'Empty categories',
        message: 'At least one category must be provided for validation.',
      });
    }

    // Validate each category
    for (const category of categories) {
      if (!category.id || typeof category.id !== 'string') {
        return res.status(400).json({
          error: 'Invalid category ID',
          message: 'Each category must have a valid ID.',
        });
      }

      if (typeof category.targetPercentage !== 'number' || category.targetPercentage < 0 || category.targetPercentage > 100) {
        return res.status(400).json({
          error: 'Invalid target percentage',
          message: 'Each category must have a target percentage between 0 and 100.',
        });
      }
    }

    // Extract user from JWT token
    const authHeader = req.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'No token provided',
        message: 'Authentication token is required.',
      });
    }

    const token = authHeader.substring(7);

    let familyId: string;
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

      if (!decoded || !decoded.familyId) {
        return res.status(401).json({
          error: 'Invalid token',
          message: 'The provided token is invalid.',
        });
      }

      familyId = decoded.familyId;
    } catch (jwtError) {
      return res.status(401).json({
        error: 'Invalid token',
        message: 'The provided token is invalid or expired.',
      });
    }

    try {
      // Get existing categories to verify they belong to the family
      const existingCategories = await BudgetService.getBudgetCategories(familyId, true); // Include inactive
      const existingCategoryIds = new Set(existingCategories.map(cat => cat.id));

      // Verify all provided categories exist and belong to the family
      for (const category of categories) {
        if (!existingCategoryIds.has(category.id)) {
          return res.status(400).json({
            error: 'Category not found',
            message: `Budget category with ID ${category.id} not found or does not belong to your family.`,
          });
        }
      }

      // Calculate total percentage
      const totalPercentage = categories.reduce((sum, cat) => sum + cat.targetPercentage, 0);
      const difference = totalPercentage - 100;
      const isValid = Math.abs(difference) < 0.01; // Allow small floating point differences

      // Generate suggestions if not valid
      const suggestions: Array<{
        categoryId: string;
        currentPercentage: number;
        suggestedPercentage: number;
      }> = [];

      if (!isValid && Math.abs(difference) > 0.01) {
        // If over 100%, suggest proportional reduction
        // If under 100%, suggest proportional increase for categories with reasonable percentages

        if (totalPercentage > 100) {
          // Proportionally reduce all categories
          const scaleFactor = 100 / totalPercentage;

          for (const category of categories) {
            const suggestedPercentage = Math.round((category.targetPercentage * scaleFactor) * 100) / 100;

            suggestions.push({
              categoryId: category.id,
              currentPercentage: category.targetPercentage,
              suggestedPercentage,
            });
          }
        } else {
          // Under 100% - suggest adding remainder to largest category
          const sortedCategories = [...categories].sort((a, b) => b.targetPercentage - a.targetPercentage);
          const largestCategory = sortedCategories[0];
          const remainingToDistribute = 100 - totalPercentage;

          for (const category of categories) {
            let suggestedPercentage = category.targetPercentage;

            if (category.id === largestCategory.id) {
              suggestedPercentage = category.targetPercentage + remainingToDistribute;
            }

            suggestions.push({
              categoryId: category.id,
              currentPercentage: category.targetPercentage,
              suggestedPercentage: Math.round(suggestedPercentage * 100) / 100,
            });
          }
        }
      }

      const response: ValidatePercentagesResponse = {
        isValid,
        totalPercentage: Math.round(totalPercentage * 100) / 100,
        difference: Math.round(difference * 100) / 100,
        suggestions,
      };

      res.status(200).json(response);
    } catch (serviceError) {
      console.error('Validate budget percentages error:', serviceError);

      if (serviceError instanceof Error) {
        if (serviceError.message === 'Family not found') {
          return res.status(404).json({
            error: 'Family not found',
            message: 'The family was not found.',
          });
        }
      }

      res.status(500).json({
        error: 'Failed to validate percentages',
        message: 'Failed to validate budget percentages. Please try again.',
      });
    }
  } catch (error) {
    console.error('Validate budget percentages endpoint error:', error);

    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to validate budget percentages. Please try again.',
    });
  }
}