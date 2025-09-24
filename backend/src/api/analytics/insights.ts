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

export async function getAnalyticsInsights(req: AuthenticatedRequest, res: Response) {
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
      insightTypes,
      priority,
      includeRecommendations = 'true',
      limit = '20'
    } = req.query;

    const selectedTypes = insightTypes ? (insightTypes as string).split(',') : [
      'spending_optimization',
      'budget_variance',
      'savings_opportunity',
      'cash_flow_prediction',
      'category_analysis',
      'seasonal_patterns',
      'goal_tracking',
      'risk_assessment'
    ];

    const limitNum = parseInt(limit as string, 10);
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      return res.status(400).json({
        error: 'Invalid limit',
        message: 'Limit must be between 1 and 100.',
      });
    }

    try {
      // Get insights
      const insights = await ReportsService.getAnalyticsInsights(familyId, {
        insightTypes: selectedTypes,
        priority: priority as string,
        includeRecommendations: includeRecommendations === 'true',
        limit: limitNum,
      });

      res.status(200).json({
        insights: insights.insights.map(insight => ({
          id: insight.id,
          type: insight.type,
          priority: insight.priority, // 'critical', 'high', 'medium', 'low'
          severity: insight.severity, // 'urgent', 'important', 'moderate', 'minor'
          title: insight.title,
          description: insight.description,
          summary: insight.summary,
          impact: {
            financial: insight.impact.financial, // positive/negative amount
            budgetEffect: insight.impact.budgetEffect,
            savingsOpportunity: insight.impact.savingsOpportunity,
            riskLevel: insight.impact.riskLevel, // 'high', 'medium', 'low'
            timeframe: insight.impact.timeframe, // 'immediate', 'short_term', 'long_term'
          },
          categories: insight.categories.map(cat => ({
            id: cat.id,
            name: cat.name,
            relevance: cat.relevance, // 0-100
            contribution: cat.contribution,
          })),
          dataPoints: {
            current: insight.dataPoints.current,
            historical: insight.dataPoints.historical,
            projected: insight.dataPoints.projected,
            benchmark: insight.dataPoints.benchmark,
          },
          recommendations: insight.recommendations.map(rec => ({
            id: rec.id,
            priority: rec.priority,
            title: rec.title,
            description: rec.description,
            actionSteps: rec.actionSteps,
            effort: rec.effort, // 'low', 'medium', 'high'
            timeline: rec.timeline, // estimated time to implement
            potentialSavings: rec.potentialSavings,
            riskMitigation: rec.riskMitigation,
            trackingMetrics: rec.trackingMetrics,
          })),
          evidence: {
            dataSource: insight.evidence.dataSource,
            confidence: insight.evidence.confidence, // 0-100
            sampleSize: insight.evidence.sampleSize,
            timeframe: insight.evidence.timeframe,
            methodology: insight.evidence.methodology,
            limitations: insight.evidence.limitations,
          },
          trends: insight.trends && {
            direction: insight.trends.direction,
            strength: insight.trends.strength,
            duration: insight.trends.duration,
            prediction: insight.trends.prediction,
          },
          alerts: insight.alerts.map(alert => ({
            type: alert.type,
            message: alert.message,
            threshold: alert.threshold,
            currentValue: alert.currentValue,
            triggerDate: alert.triggerDate,
          })),
          relatedInsights: insight.relatedInsights.map(related => ({
            id: related.id,
            title: related.title,
            relationship: related.relationship, // 'causes', 'caused_by', 'correlates_with'
            strength: related.strength,
          })),
          isActive: insight.isActive,
          isActionable: insight.isActionable,
          hasBeenActedUpon: insight.hasBeenActedUpon,
          lastUpdated: insight.lastUpdated,
          expiresAt: insight.expiresAt,
          createdAt: insight.createdAt,
        })),
        summary: {
          totalInsights: insights.summary.totalInsights,
          criticalInsights: insights.summary.criticalInsights,
          actionableInsights: insights.summary.actionableInsights,
          potentialSavings: insights.summary.potentialSavings,
          riskMitigation: insights.summary.riskMitigation,
          categories: insights.summary.categories.map(cat => ({
            name: cat.name,
            insightCount: cat.insightCount,
            averagePriority: cat.averagePriority,
          })),
        },
        recommendations: {
          immediate: insights.recommendations.immediate.map(rec => ({
            id: rec.id,
            title: rec.title,
            impact: rec.impact,
            effort: rec.effort,
            potentialSavings: rec.potentialSavings,
          })),
          shortTerm: insights.recommendations.shortTerm.map(rec => ({
            id: rec.id,
            title: rec.title,
            impact: rec.impact,
            effort: rec.effort,
            potentialSavings: rec.potentialSavings,
            timeline: rec.timeline,
          })),
          longTerm: insights.recommendations.longTerm.map(rec => ({
            id: rec.id,
            title: rec.title,
            impact: rec.impact,
            effort: rec.effort,
            potentialSavings: rec.potentialSavings,
            timeline: rec.timeline,
          })),
        },
        riskAssessment: {
          overallRiskScore: insights.riskAssessment.overallRiskScore, // 0-100
          riskFactors: insights.riskAssessment.riskFactors.map(risk => ({
            factor: risk.factor,
            score: risk.score,
            impact: risk.impact,
            mitigation: risk.mitigation,
          })),
          emergingRisks: insights.riskAssessment.emergingRisks.map(risk => ({
            type: risk.type,
            probability: risk.probability,
            impact: risk.impact,
            timeframe: risk.timeframe,
            indicators: risk.indicators,
          })),
        },
        opportunities: {
          savingsOpportunities: insights.opportunities.savingsOpportunities.map(opp => ({
            id: opp.id,
            title: opp.title,
            description: opp.description,
            potentialSavings: opp.potentialSavings,
            effort: opp.effort,
            timeline: opp.timeline,
            confidence: opp.confidence,
          })),
          optimizationOpportunities: insights.opportunities.optimizationOpportunities.map(opp => ({
            id: opp.id,
            title: opp.title,
            description: opp.description,
            category: opp.category,
            impact: opp.impact,
            complexity: opp.complexity,
          })),
        },
        trends: {
          emergingTrends: insights.trends.emergingTrends.map(trend => ({
            name: trend.name,
            description: trend.description,
            strength: trend.strength,
            confidence: trend.confidence,
            implications: trend.implications,
          })),
          historicalPatterns: insights.trends.historicalPatterns.map(pattern => ({
            name: pattern.name,
            frequency: pattern.frequency,
            impact: pattern.impact,
            nextOccurrence: pattern.nextOccurrence,
          })),
        },
        metadata: {
          analysisDate: insights.metadata.analysisDate,
          dataQuality: insights.metadata.dataQuality,
          confidenceLevel: insights.metadata.confidenceLevel,
          modelVersion: insights.metadata.modelVersion,
          lastUpdated: insights.metadata.lastUpdated,
          refreshFrequency: insights.metadata.refreshFrequency,
        },
        generatedAt: new Date().toISOString(),
      });
    } catch (serviceError) {
      console.error('Get analytics insights error:', serviceError);

      if (serviceError instanceof Error) {
        if (serviceError.message === 'Insufficient data') {
          return res.status(400).json({
            error: 'Insufficient data',
            message: 'Not enough data available to generate insights.',
          });
        }

        if (serviceError.message === 'Invalid insight types') {
          return res.status(400).json({
            error: 'Invalid insight types',
            message: 'One or more specified insight types are invalid.',
          });
        }

        if (serviceError.message === 'Analysis failed') {
          return res.status(500).json({
            error: 'Analysis failed',
            message: 'Failed to generate insights due to analysis error.',
          });
        }
      }

      res.status(500).json({
        error: 'Failed to get analytics insights',
        message: 'Failed to retrieve insights. Please try again.',
      });
    }
  } catch (error) {
    console.error('Analytics insights endpoint error:', error);

    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve insights. Please try again.',
    });
  }
}