import { Request, Response } from 'express';
import { ReportsService } from '../../services/reports.service';
import jwt from 'jsonwebtoken';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    familyId: string;
    email: string;
    role: string;
  };
}

export async function getAnalyticsTrends(req: AuthenticatedRequest, res: Response) {
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
      period = '12months',
      granularity = 'monthly',
      metrics,
      categoryIds,
      includeProjections = 'true'
    } = req.query;

    const selectedMetrics = metrics ? (metrics as string).split(',') : [
      'income',
      'expenses',
      'savings',
      'net_worth',
      'cash_flow'
    ];

    const categoryFilter = categoryIds ? (categoryIds as string).split(',') : undefined;

    try {
      // Get trend analytics
      const trends = await ReportsService.getAnalyticsTrends(familyId, {
        period: period as string,
        granularity: granularity as string,
        metrics: selectedMetrics,
        categoryIds: categoryFilter,
        includeProjections: includeProjections === 'true',
      });

      res.status(200).json({
        period,
        granularity,
        dateRange: {
          startDate: trends.dateRange.startDate,
          endDate: trends.dateRange.endDate,
        },
        metrics: selectedMetrics,
        trendData: {
          income: trends.trendData.income && {
            dataPoints: trends.trendData.income.dataPoints.map(point => ({
              period: point.period,
              value: point.value,
              change: point.change,
              changePercentage: point.changePercentage,
            })),
            trendAnalysis: {
              direction: trends.trendData.income.trendAnalysis.direction, // 'increasing', 'decreasing', 'stable'
              strength: trends.trendData.income.trendAnalysis.strength, // 'strong', 'moderate', 'weak'
              correlation: trends.trendData.income.trendAnalysis.correlation, // -1 to 1
              seasonality: trends.trendData.income.trendAnalysis.seasonality,
              volatility: trends.trendData.income.trendAnalysis.volatility,
              rSquared: trends.trendData.income.trendAnalysis.rSquared, // goodness of fit
            },
            projections: trends.trendData.income.projections && {
              next3Months: trends.trendData.income.projections.next3Months,
              next6Months: trends.trendData.income.projections.next6Months,
              next12Months: trends.trendData.income.projections.next12Months,
              confidence: trends.trendData.income.projections.confidence,
            },
          },
          expenses: trends.trendData.expenses && {
            dataPoints: trends.trendData.expenses.dataPoints.map(point => ({
              period: point.period,
              value: point.value,
              change: point.change,
              changePercentage: point.changePercentage,
            })),
            trendAnalysis: {
              direction: trends.trendData.expenses.trendAnalysis.direction,
              strength: trends.trendData.expenses.trendAnalysis.strength,
              correlation: trends.trendData.expenses.trendAnalysis.correlation,
              seasonality: trends.trendData.expenses.trendAnalysis.seasonality,
              volatility: trends.trendData.expenses.trendAnalysis.volatility,
              rSquared: trends.trendData.expenses.trendAnalysis.rSquared,
            },
            projections: trends.trendData.expenses.projections && {
              next3Months: trends.trendData.expenses.projections.next3Months,
              next6Months: trends.trendData.expenses.projections.next6Months,
              next12Months: trends.trendData.expenses.projections.next12Months,
              confidence: trends.trendData.expenses.projections.confidence,
            },
          },
          savings: trends.trendData.savings && {
            dataPoints: trends.trendData.savings.dataPoints.map(point => ({
              period: point.period,
              value: point.value,
              savingsRate: point.savingsRate,
              change: point.change,
              changePercentage: point.changePercentage,
            })),
            trendAnalysis: {
              direction: trends.trendData.savings.trendAnalysis.direction,
              strength: trends.trendData.savings.trendAnalysis.strength,
              correlation: trends.trendData.savings.trendAnalysis.correlation,
              averageSavingsRate: trends.trendData.savings.trendAnalysis.averageSavingsRate,
              consistency: trends.trendData.savings.trendAnalysis.consistency,
            },
            projections: trends.trendData.savings.projections && {
              next3Months: trends.trendData.savings.projections.next3Months,
              next6Months: trends.trendData.savings.projections.next6Months,
              next12Months: trends.trendData.savings.projections.next12Months,
              projectedSavingsRate: trends.trendData.savings.projections.projectedSavingsRate,
            },
          },
          netWorth: trends.trendData.netWorth && {
            dataPoints: trends.trendData.netWorth.dataPoints.map(point => ({
              period: point.period,
              assets: point.assets,
              liabilities: point.liabilities,
              netWorth: point.netWorth,
              change: point.change,
              changePercentage: point.changePercentage,
            })),
            trendAnalysis: {
              direction: trends.trendData.netWorth.trendAnalysis.direction,
              strength: trends.trendData.netWorth.trendAnalysis.strength,
              growthRate: trends.trendData.netWorth.trendAnalysis.growthRate,
              volatility: trends.trendData.netWorth.trendAnalysis.volatility,
            },
            projections: trends.trendData.netWorth.projections && {
              next3Months: trends.trendData.netWorth.projections.next3Months,
              next6Months: trends.trendData.netWorth.projections.next6Months,
              next12Months: trends.trendData.netWorth.projections.next12Months,
              projectedGrowthRate: trends.trendData.netWorth.projections.projectedGrowthRate,
            },
          },
          cashFlow: trends.trendData.cashFlow && {
            dataPoints: trends.trendData.cashFlow.dataPoints.map(point => ({
              period: point.period,
              inflow: point.inflow,
              outflow: point.outflow,
              netFlow: point.netFlow,
              runningBalance: point.runningBalance,
            })),
            trendAnalysis: {
              direction: trends.trendData.cashFlow.trendAnalysis.direction,
              strength: trends.trendData.cashFlow.trendAnalysis.strength,
              averageNetFlow: trends.trendData.cashFlow.trendAnalysis.averageNetFlow,
              volatility: trends.trendData.cashFlow.trendAnalysis.volatility,
              consistency: trends.trendData.cashFlow.trendAnalysis.consistency,
            },
          },
        },
        categoryTrends: categoryFilter ? trends.categoryTrends.map(cat => ({
          categoryId: cat.categoryId,
          categoryName: cat.categoryName,
          dataPoints: cat.dataPoints.map(point => ({
            period: point.period,
            amount: point.amount,
            transactionCount: point.transactionCount,
            averageTransaction: point.averageTransaction,
          })),
          trendAnalysis: {
            direction: cat.trendAnalysis.direction,
            strength: cat.trendAnalysis.strength,
            seasonality: cat.trendAnalysis.seasonality,
            growthRate: cat.trendAnalysis.growthRate,
            volatility: cat.trendAnalysis.volatility,
          },
          insights: cat.insights.map(insight => ({
            type: insight.type,
            description: insight.description,
            impact: insight.impact,
            recommendation: insight.recommendation,
          })),
        })) : [],
        correlations: {
          incomeExpenseCorrelation: trends.correlations.incomeExpenseCorrelation,
          expenseBudgetCorrelation: trends.correlations.expenseBudgetCorrelation,
          seasonalityIndex: trends.correlations.seasonalityIndex,
          categoryCorrelations: trends.correlations.categoryCorrelations.map(corr => ({
            category1: corr.category1,
            category2: corr.category2,
            correlation: corr.correlation,
            significance: corr.significance,
          })),
        },
        anomalies: trends.anomalies.map(anomaly => ({
          period: anomaly.period,
          metric: anomaly.metric,
          value: anomaly.value,
          expectedValue: anomaly.expectedValue,
          deviation: anomaly.deviation,
          significance: anomaly.significance,
          possibleCauses: anomaly.possibleCauses,
        })),
        insights: trends.insights.map(insight => ({
          id: insight.id,
          type: insight.type, // 'trend_change', 'seasonal_pattern', 'anomaly_detected', 'correlation_found'
          title: insight.title,
          description: insight.description,
          significance: insight.significance, // 'high', 'medium', 'low'
          confidence: insight.confidence, // 0-100
          recommendation: insight.recommendation,
          actionable: insight.actionable,
          relatedMetrics: insight.relatedMetrics,
          timeframe: insight.timeframe,
        })),
        metadata: {
          dataQuality: trends.metadata.dataQuality,
          completeness: trends.metadata.completeness,
          confidence: trends.metadata.confidence,
          lastUpdated: trends.metadata.lastUpdated,
          calculationMethod: trends.metadata.calculationMethod,
        },
        generatedAt: new Date().toISOString(),
      });
    } catch (serviceError) {
      console.error('Get analytics trends error:', serviceError);

      if (serviceError instanceof Error) {
        if (serviceError.message === 'Insufficient data') {
          return res.status(400).json({
            error: 'Insufficient data',
            message: 'Not enough data available to generate trend analysis.',
          });
        }

        if (serviceError.message === 'Invalid period') {
          return res.status(400).json({
            error: 'Invalid period',
            message: 'The specified period is invalid.',
          });
        }

        if (serviceError.message === 'Invalid granularity') {
          return res.status(400).json({
            error: 'Invalid granularity',
            message: 'The specified granularity is invalid.',
          });
        }

        if (serviceError.message === 'Invalid metrics') {
          return res.status(400).json({
            error: 'Invalid metrics',
            message: 'One or more specified metrics are invalid.',
          });
        }
      }

      res.status(500).json({
        error: 'Failed to get analytics trends',
        message: 'Failed to retrieve trend analysis. Please try again.',
      });
    }
  } catch (error) {
    console.error('Analytics trends endpoint error:', error);

    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve trend analysis. Please try again.',
    });
  }
}