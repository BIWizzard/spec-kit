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

export async function getIncomeAnalysisReport(req: AuthenticatedRequest, res: Response) {
  try {
    const authHeader = req.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'No token provided',
        details: 'Authorization header with Bearer token is required'
      });
    }

    const token = authHeader.slice(7);
    let decoded: any;

    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'default_secret');
    } catch (error) {
      return res.status(401).json({
        error: 'Invalid token',
        details: 'Token is invalid or expired'
      });
    }

    const familyId = decoded.familyId;
    if (!familyId) {
      return res.status(403).json({
        error: 'Access denied',
        details: 'User must belong to a family to access reports'
      });
    }

    // Parse query parameters
    const fromDate = req.query.fromDate ? new Date(req.query.fromDate as string) : new Date(new Date().getFullYear(), 0, 1);
    const toDate = req.query.toDate ? new Date(req.query.toDate as string) : new Date();
    const source = req.query.source as string;
    const frequency = req.query.frequency as string;

    // Validate date range
    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      return res.status(400).json({
        error: 'Invalid date format',
        details: 'Dates must be in ISO format (YYYY-MM-DD)'
      });
    }

    if (fromDate > toDate) {
      return res.status(400).json({
        error: 'Invalid date range',
        details: 'fromDate must be before toDate'
      });
    }

    // Generate the income analysis report
    const incomeData = await ReportsService.generateIncomeAnalysis(
      familyId,
      { fromDate, toDate }
    );

    // Filter by source if specified
    let filteredSources = incomeData.sources;
    if (source) {
      filteredSources = incomeData.sources.filter(s =>
        s.source.toLowerCase().includes(source.toLowerCase())
      );
    }

    // Filter by frequency if specified
    if (frequency) {
      filteredSources = filteredSources.filter(s => s.frequency === frequency);
    }

    // Calculate additional insights
    const regularIncomePercentage = incomeData.totalIncome > 0
      ? (incomeData.regularIncome / incomeData.totalIncome) * 100
      : 0;

    const mostReliableSource = incomeData.sources.reduce((prev, current) =>
      current.reliability > prev.reliability ? current : prev,
      incomeData.sources[0]
    );

    const diversificationScore = Math.min(100, incomeData.sources.length * 20);

    // Generate recommendations
    const recommendations = [];

    if (incomeData.incomeConsistency < 60) {
      recommendations.push({
        type: 'warning',
        message: 'Income consistency is low. Consider finding additional stable income sources.',
        score: incomeData.incomeConsistency
      });
    }

    if (regularIncomePercentage < 70) {
      recommendations.push({
        type: 'info',
        message: 'Irregular income makes up a significant portion. Consider building larger emergency fund.',
        percentage: 100 - regularIncomePercentage
      });
    }

    if (diversificationScore < 40) {
      recommendations.push({
        type: 'alert',
        message: 'Income sources lack diversification. Consider adding additional income streams.',
        currentSources: incomeData.sources.length
      });
    }

    // Calculate growth trend
    const recentMonths = incomeData.monthlyTrends.slice(-3);
    const earlierMonths = incomeData.monthlyTrends.slice(-6, -3);
    const recentAvg = recentMonths.reduce((sum, m) => sum + m.amount, 0) / Math.max(1, recentMonths.length);
    const earlierAvg = earlierMonths.reduce((sum, m) => sum + m.amount, 0) / Math.max(1, earlierMonths.length);
    const growthRate = earlierAvg > 0 ? ((recentAvg - earlierAvg) / earlierAvg) * 100 : 0;

    return res.status(200).json({
      dateRange: {
        from: fromDate.toISOString(),
        to: toDate.toISOString()
      },
      summary: {
        totalIncome: incomeData.totalIncome,
        regularIncome: incomeData.regularIncome,
        irregularIncome: incomeData.irregularIncome,
        averageMonthlyIncome: incomeData.averageMonthlyIncome,
        regularIncomePercentage,
        incomeConsistency: incomeData.incomeConsistency
      },
      insights: {
        diversificationScore,
        mostReliableSource: mostReliableSource ? {
          name: mostReliableSource.source,
          reliability: mostReliableSource.reliability,
          amount: mostReliableSource.amount
        } : null,
        growthRate,
        growthTrend: growthRate > 5 ? 'increasing' : growthRate < -5 ? 'decreasing' : 'stable'
      },
      sources: filteredSources,
      monthlyTrends: incomeData.monthlyTrends,
      recommendations,
      filters: {
        source: source || null,
        frequency: frequency || null
      }
    });

  } catch (error) {
    console.error('Income analysis report error:', error);
    return res.status(500).json({
      error: 'Failed to generate income analysis report',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}