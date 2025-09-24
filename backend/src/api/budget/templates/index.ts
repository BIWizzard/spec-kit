import { Request, Response } from 'express';
import { BudgetService } from '../../../services/budget.service';
import jwt from 'jsonwebtoken';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    familyId: string;
    email: string;
    role: string;
  };
}

export async function getBudgetTemplates(req: AuthenticatedRequest, res: Response) {
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

    // Parse query parameters
    const {
      includeCustom = 'true',
      includeDefault = 'true',
      category
    } = req.query;

    try {
      // Get budget templates
      const templates = await BudgetService.getBudgetTemplates(familyId, {
        includeCustom: includeCustom === 'true',
        includeDefault: includeDefault === 'true',
        category: category as string,
      });

      res.status(200).json({
        templates: templates.map(template => ({
          id: template.id,
          name: template.name,
          description: template.description,
          type: template.type, // 'default', 'custom', 'shared'
          category: template.category, // 'conservative', 'moderate', 'aggressive', 'custom'
          isDefault: template.isDefault,
          isRecommended: template.isRecommended,
          targetIncome: template.targetIncome, // monthly income target
          categories: template.categories.map(category => ({
            id: category.id,
            name: category.name,
            type: category.type,
            targetPercentage: category.targetPercentage,
            priority: category.priority, // 'essential', 'important', 'optional'
            description: category.description,
            tips: category.tips || [],
          })),
          metadata: {
            totalPercentage: template.metadata.totalPercentage,
            savingsRate: template.metadata.savingsRate,
            fixedExpensesRate: template.metadata.fixedExpensesRate,
            variableExpensesRate: template.metadata.variableExpensesRate,
            discretionaryRate: template.metadata.discretionaryRate,
          },
          suitabilityScore: template.suitabilityScore, // 0-100 based on family profile
          popularityRank: template.popularityRank,
          usageCount: template.usageCount,
          tags: template.tags || [],
          createdBy: template.createdBy, // 'system' or family member
          createdAt: template.createdAt,
          updatedAt: template.updatedAt,
          lastUsed: template.lastUsed,
        })),
        recommendations: templates.length > 0 ? {
          bestMatch: templates.find(t => t.isRecommended),
          alternativeMatches: templates.filter(t => t.suitabilityScore > 70 && !t.isRecommended),
          popularChoices: templates.filter(t => t.popularityRank <= 3),
        } : undefined,
        familyProfile: {
          incomeLevel: templates[0]?.familyProfile?.incomeLevel, // 'low', 'medium', 'high'
          familySize: templates[0]?.familyProfile?.familySize,
          lifestyle: templates[0]?.familyProfile?.lifestyle, // 'frugal', 'moderate', 'premium'
          savingsGoals: templates[0]?.familyProfile?.savingsGoals,
          riskTolerance: templates[0]?.familyProfile?.riskTolerance,
        },
        generatedAt: new Date().toISOString(),
      });
    } catch (serviceError) {
      console.error('Get budget templates error:', serviceError);

      if (serviceError instanceof Error) {
        if (serviceError.message === 'No templates available') {
          return res.status(404).json({
            error: 'No templates available',
            message: 'No budget templates are available at this time.',
          });
        }
      }

      res.status(500).json({
        error: 'Failed to get budget templates',
        message: 'Failed to retrieve budget templates. Please try again.',
      });
    }
  } catch (error) {
    console.error('Budget templates endpoint error:', error);

    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve budget templates. Please try again.',
    });
  }
}