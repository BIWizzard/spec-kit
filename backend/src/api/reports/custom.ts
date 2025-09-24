import { Request, Response } from 'express';
import { ReportsService } from '../../services/reports.service';
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

const customReportSchema = z.object({
  name: z.string().min(1).max(100, 'Report name must be between 1-100 characters'),
  description: z.string().max(500).optional(),
  dateRange: z.object({
    startDate: z.string().refine(date => !isNaN(Date.parse(date)), 'Invalid start date'),
    endDate: z.string().refine(date => !isNaN(Date.parse(date)), 'Invalid end date'),
  }),
  metrics: z.array(z.enum([
    'income_summary',
    'expense_summary',
    'cash_flow',
    'spending_by_category',
    'budget_performance',
    'savings_rate',
    'net_worth',
    'debt_analysis',
    'transaction_volume',
    'payment_attribution',
    'bank_account_balances'
  ])).min(1, 'At least one metric must be selected'),
  filters: z.object({
    categoryIds: z.array(z.string()).optional(),
    accountIds: z.array(z.string()).optional(),
    paymentIds: z.array(z.string()).optional(),
    incomeEventIds: z.array(z.string()).optional(),
    minAmount: z.number().optional(),
    maxAmount: z.number().optional(),
    tags: z.array(z.string()).optional(),
  }).optional(),
  groupBy: z.enum(['day', 'week', 'month', 'quarter', 'year', 'category', 'account', 'payment_type']).optional(),
  sortBy: z.enum(['date', 'amount', 'category', 'account', 'description']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  includeCharts: z.boolean().optional(),
  includeSubtotals: z.boolean().optional(),
  includeTrends: z.boolean().optional(),
  saveAsTemplate: z.boolean().optional(),
  templateName: z.string().min(1).max(100).optional(),
});

export async function generateCustomReport(req: AuthenticatedRequest, res: Response) {
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
    const validationResult = customReportSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Invalid request data.',
        details: validationResult.error.errors,
      });
    }

    const reportConfig = validationResult.data;

    // Validate date range
    const startDate = new Date(reportConfig.dateRange.startDate);
    const endDate = new Date(reportConfig.dateRange.endDate);

    if (startDate >= endDate) {
      return res.status(400).json({
        error: 'Invalid date range',
        message: 'Start date must be before end date.',
      });
    }

    // Check for excessive date range (prevent abuse)
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff > 1095) { // 3 years
      return res.status(400).json({
        error: 'Date range too large',
        message: 'Date range cannot exceed 3 years.',
      });
    }

    try {
      // Generate custom report
      const report = await ReportsService.generateCustomReport(familyId, {
        ...reportConfig,
        requestedBy: userId,
      });

      res.status(200).json({
        reportId: report.id,
        name: report.name,
        description: report.description,
        dateRange: report.dateRange,
        generatedAt: report.generatedAt,
        metrics: report.metrics,
        summary: {
          totalIncome: report.summary.totalIncome,
          totalExpenses: report.summary.totalExpenses,
          netCashFlow: report.summary.netCashFlow,
          transactionCount: report.summary.transactionCount,
          categoryCount: report.summary.categoryCount,
          accountCount: report.summary.accountCount,
        },
        data: {
          income: report.data.income && {
            total: report.data.income.total,
            breakdown: report.data.income.breakdown,
            trends: report.data.income.trends,
          },
          expenses: report.data.expenses && {
            total: report.data.expenses.total,
            breakdown: report.data.expenses.breakdown,
            trends: report.data.expenses.trends,
          },
          cashFlow: report.data.cashFlow && {
            periods: report.data.cashFlow.periods,
            trend: report.data.cashFlow.trend,
            projections: report.data.cashFlow.projections,
          },
          budgetPerformance: report.data.budgetPerformance && {
            categories: report.data.budgetPerformance.categories,
            overallVariance: report.data.budgetPerformance.overallVariance,
            performance: report.data.budgetPerformance.performance,
          },
          transactions: report.data.transactions && {
            summary: report.data.transactions.summary,
            details: report.data.transactions.details,
            patterns: report.data.transactions.patterns,
          },
        },
        charts: report.includeCharts ? report.charts : undefined,
        insights: report.insights.map(insight => ({
          type: insight.type,
          title: insight.title,
          description: insight.description,
          impact: insight.impact,
          recommendation: insight.recommendation,
          confidence: insight.confidence,
        })),
        template: report.saveAsTemplate ? {
          id: report.template?.id,
          name: report.template?.name,
          message: 'Report template saved for future use.',
        } : undefined,
        exportOptions: {
          availableFormats: ['pdf', 'excel', 'csv', 'json'],
          downloadUrl: `/api/reports/export?reportId=${report.id}`,
        },
        metadata: {
          processingTime: report.metadata.processingTime,
          dataPoints: report.metadata.dataPoints,
          accuracy: report.metadata.accuracy,
          lastRefresh: report.metadata.lastRefresh,
        },
      });
    } catch (serviceError) {
      console.error('Generate custom report error:', serviceError);

      if (serviceError instanceof Error) {
        if (serviceError.message === 'Insufficient data') {
          return res.status(400).json({
            error: 'Insufficient data',
            message: 'Not enough data available for the specified date range and filters.',
          });
        }

        if (serviceError.message === 'Template name exists') {
          return res.status(409).json({
            error: 'Template name exists',
            message: 'A report template with this name already exists.',
          });
        }

        if (serviceError.message === 'Invalid filters') {
          return res.status(400).json({
            error: 'Invalid filters',
            message: 'One or more filter values are invalid.',
          });
        }
      }

      res.status(500).json({
        error: 'Failed to generate custom report',
        message: 'Failed to generate the custom report. Please try again.',
      });
    }
  } catch (error) {
    console.error('Custom report endpoint error:', error);

    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to generate custom report. Please try again.',
    });
  }
}