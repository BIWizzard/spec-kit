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

export async function getBudgetProjections(req: AuthenticatedRequest, res: Response) {
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
      projectionPeriod = '6months',
      includeCashFlow = 'true',
      includeScenarios = 'false'
    } = req.query;

    try {
      // Get budget projections
      const projections = await BudgetService.getBudgetProjections(familyId, {
        projectionPeriod: projectionPeriod as string,
        includeCashFlow: includeCashFlow === 'true',
        includeScenarios: includeScenarios === 'true',
      });

      res.status(200).json({
        projectionPeriod,
        projectionRange: {
          startDate: projections.projectionRange.startDate,
          endDate: projections.projectionRange.endDate,
        },
        summary: {
          projectedIncome: projections.summary.projectedIncome,
          projectedExpenses: projections.summary.projectedExpenses,
          projectedSavings: projections.summary.projectedSavings,
          projectedBalance: projections.summary.projectedBalance,
          savingsRate: projections.summary.savingsRate,
          burnRate: projections.summary.burnRate,
          confidenceScore: projections.summary.confidenceScore, // 0-100
        },
        monthlyProjections: projections.monthlyProjections.map(month => ({
          month: month.month,
          year: month.year,
          projectedIncome: month.projectedIncome,
          projectedExpenses: month.projectedExpenses,
          projectedSavings: month.projectedSavings,
          projectedBalance: month.projectedBalance,
          categoryBreakdown: month.categoryBreakdown.map(category => ({
            id: category.id,
            name: category.name,
            projectedAmount: category.projectedAmount,
            confidenceLevel: category.confidenceLevel,
            historicalAverage: category.historicalAverage,
            trend: category.trend,
          })),
          risks: month.risks.map(risk => ({
            type: risk.type, // 'overspending', 'income_shortfall', 'unexpected_expense'
            probability: risk.probability, // 0-100
            impact: risk.impact,
            description: risk.description,
          })),
        })),
        categoryProjections: projections.categoryProjections.map(category => ({
          id: category.id,
          name: category.name,
          type: category.type,
          currentMonthlyAverage: category.currentMonthlyAverage,
          projectedMonthlySpend: category.projectedMonthlySpend,
          projectedTotalSpend: category.projectedTotalSpend,
          budgetedAmount: category.budgetedAmount,
          projectedVariance: category.projectedVariance,
          trendAnalysis: {
            direction: category.trendAnalysis.direction, // 'increasing', 'decreasing', 'stable'
            strength: category.trendAnalysis.strength, // 'strong', 'moderate', 'weak'
            seasonality: category.trendAnalysis.seasonality,
            volatility: category.trendAnalysis.volatility,
          },
          recommendations: category.recommendations,
        })),
        cashFlowProjections: projections.includeCashFlow ? projections.cashFlowProjections?.map(flow => ({
          date: flow.date,
          projectedInflow: flow.projectedInflow,
          projectedOutflow: flow.projectedOutflow,
          projectedNetFlow: flow.projectedNetFlow,
          runningBalance: flow.runningBalance,
          minimumBalance: flow.minimumBalance,
          maximumBalance: flow.maximumBalance,
        })) : undefined,
        scenarios: projections.includeScenarios ? {
          optimistic: projections.scenarios?.optimistic && {
            projectedSavings: projections.scenarios.optimistic.projectedSavings,
            projectedBalance: projections.scenarios.optimistic.projectedBalance,
            assumptions: projections.scenarios.optimistic.assumptions,
          },
          realistic: projections.scenarios?.realistic && {
            projectedSavings: projections.scenarios.realistic.projectedSavings,
            projectedBalance: projections.scenarios.realistic.projectedBalance,
            assumptions: projections.scenarios.realistic.assumptions,
          },
          pessimistic: projections.scenarios?.pessimistic && {
            projectedSavings: projections.scenarios.pessimistic.projectedSavings,
            projectedBalance: projections.scenarios.pessimistic.projectedBalance,
            assumptions: projections.scenarios.pessimistic.assumptions,
          },
        } : undefined,
        recommendations: projections.recommendations.map(rec => ({
          type: rec.type, // 'budget_adjustment', 'savings_goal', 'expense_reduction'
          priority: rec.priority, // 'high', 'medium', 'low'
          title: rec.title,
          description: rec.description,
          potentialSavings: rec.potentialSavings,
          timeframe: rec.timeframe,
          actionSteps: rec.actionSteps,
        })),
        assumptions: {
          incomeGrowth: projections.assumptions.incomeGrowth,
          inflationRate: projections.assumptions.inflationRate,
          spendingGrowth: projections.assumptions.spendingGrowth,
          dataQuality: projections.assumptions.dataQuality,
          historicalPeriod: projections.assumptions.historicalPeriod,
        },
        generatedAt: new Date().toISOString(),
      });
    } catch (serviceError) {
      console.error('Get budget projections error:', serviceError);

      if (serviceError instanceof Error) {
        if (serviceError.message === 'Insufficient historical data') {
          return res.status(400).json({
            error: 'Insufficient historical data',
            message: 'Not enough historical data to generate reliable projections.',
          });
        }

        if (serviceError.message === 'Invalid projection period') {
          return res.status(400).json({
            error: 'Invalid projection period',
            message: 'The specified projection period is invalid.',
          });
        }
      }

      res.status(500).json({
        error: 'Failed to get budget projections',
        message: 'Failed to generate budget projections. Please try again.',
      });
    }
  } catch (error) {
    console.error('Budget projections endpoint error:', error);

    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to generate budget projections. Please try again.',
    });
  }
}