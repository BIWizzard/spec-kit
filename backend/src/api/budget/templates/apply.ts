import { Request, Response } from 'express';
import { BudgetService } from '../../../services/budget.service';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    familyId: string;
    email: string;
    role: string;
  };
}

const applyTemplateSchema = z.object({
  templateId: z.string().min(1, 'Template ID is required'),
  targetIncome: z.number().positive('Target income must be positive'),
  adjustments: z.array(z.object({
    categoryId: z.string().min(1),
    targetPercentage: z.number().min(0).max(100),
  })).optional(),
  saveAsCustom: z.boolean().optional(),
  customTemplateName: z.string().min(1).max(100).optional(),
});

export async function applyBudgetTemplate(req: AuthenticatedRequest, res: Response) {
  try {
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
    let userId: string;

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      if (!decoded || !decoded.familyId || !decoded.userId) {
        return res.status(401).json({
          error: 'Invalid token',
          message: 'The provided token is invalid.',
        });
      }
      familyId = decoded.familyId;
      userId = decoded.userId;
    } catch (jwtError) {
      return res.status(401).json({
        error: 'Invalid token',
        message: 'The provided token is invalid or expired.',
      });
    }

    // Validate request body
    const validationResult = applyTemplateSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Invalid request data.',
        details: validationResult.error.errors,
      });
    }

    const {
      templateId,
      targetIncome,
      adjustments,
      saveAsCustom,
      customTemplateName
    } = validationResult.data;

    // Validate adjustments sum to 100% if provided
    if (adjustments && adjustments.length > 0) {
      const totalPercentage = adjustments.reduce((sum, adj) => sum + adj.targetPercentage, 0);
      if (Math.abs(totalPercentage - 100) > 0.01) {
        return res.status(400).json({
          error: 'Invalid adjustments',
          message: 'Category percentages must sum to 100%.',
        });
      }
    }

    try {
      // Apply budget template
      const result = await BudgetService.applyBudgetTemplate(familyId, {
        templateId,
        targetIncome,
        adjustments: adjustments || [],
        saveAsCustom: saveAsCustom || false,
        customTemplateName,
        appliedBy: userId,
      });

      res.status(200).json({
        message: 'Budget template applied successfully.',
        budgetId: result.budgetId,
        appliedTemplate: {
          id: result.appliedTemplate.id,
          name: result.appliedTemplate.name,
          type: result.appliedTemplate.type,
        },
        createdCategories: result.createdCategories.map(category => ({
          id: category.id,
          name: category.name,
          type: category.type,
          targetPercentage: category.targetPercentage,
          allocatedAmount: category.allocatedAmount,
          priority: category.priority,
        })),
        totalBudgetAmount: result.totalBudgetAmount,
        summary: {
          totalCategories: result.summary.totalCategories,
          totalPercentage: result.summary.totalPercentage,
          estimatedSavingsRate: result.summary.estimatedSavingsRate,
          essentialExpensesRate: result.summary.essentialExpensesRate,
          discretionaryRate: result.summary.discretionaryRate,
        },
        customTemplate: result.saveAsCustom ? {
          id: result.customTemplate?.id,
          name: result.customTemplate?.name,
          message: 'Custom template created and saved for future use.',
        } : undefined,
        recommendations: result.recommendations.map(rec => ({
          type: rec.type, // 'adjustment_suggestion', 'optimization_tip', 'warning'
          category: rec.category,
          message: rec.message,
          suggestedAction: rec.suggestedAction,
          impact: rec.impact,
        })),
        appliedAt: new Date().toISOString(),
      });
    } catch (serviceError) {
      console.error('Apply budget template error:', serviceError);

      if (serviceError instanceof Error) {
        if (serviceError.message === 'Template not found') {
          return res.status(404).json({
            error: 'Template not found',
            message: 'The specified budget template was not found.',
          });
        }

        if (serviceError.message === 'Template already applied') {
          return res.status(409).json({
            error: 'Template already applied',
            message: 'This template has already been applied to your budget.',
          });
        }

        if (serviceError.message === 'Custom template name exists') {
          return res.status(409).json({
            error: 'Template name exists',
            message: 'A custom template with this name already exists.',
          });
        }

        if (serviceError.message === 'Insufficient permissions') {
          return res.status(403).json({
            error: 'Insufficient permissions',
            message: 'You do not have permission to modify budget templates.',
          });
        }
      }

      res.status(500).json({
        error: 'Failed to apply budget template',
        message: 'Failed to apply the budget template. Please try again.',
      });
    }
  } catch (error) {
    console.error('Apply budget template endpoint error:', error);

    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to apply budget template. Please try again.',
    });
  }
}