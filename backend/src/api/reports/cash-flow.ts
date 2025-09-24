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

export async function getCashFlowReport(req: AuthenticatedRequest, res: Response) {
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
    const fromDate = req.query.fromDate ? new Date(req.query.fromDate as string) : new Date(new Date().getFullYear(), new Date().getMonth() - 5, 1);
    const toDate = req.query.toDate ? new Date(req.query.toDate as string) : new Date();
    const groupBy = (req.query.groupBy as 'day' | 'week' | 'month' | 'quarter' | 'year') || 'month';
    const includeProjections = req.query.includeProjections === 'true';

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

    // Generate the report
    const cashFlowData = await ReportsService.generateCashFlowReport(
      familyId,
      { fromDate, toDate },
      groupBy,
      includeProjections
    );

    // Calculate summary statistics
    const totalIncome = cashFlowData.reduce((sum, period) => sum + period.totalIncome, 0);
    const totalExpenses = cashFlowData.reduce((sum, period) => sum + period.totalExpenses, 0);
    const netCashFlow = totalIncome - totalExpenses;

    return res.status(200).json({
      dateRange: {
        from: fromDate.toISOString(),
        to: toDate.toISOString()
      },
      groupBy,
      summary: {
        totalIncome,
        totalExpenses,
        netCashFlow,
        averageMonthlyIncome: cashFlowData.length > 0 ? totalIncome / cashFlowData.length : 0,
        averageMonthlyExpenses: cashFlowData.length > 0 ? totalExpenses / cashFlowData.length : 0
      },
      periods: cashFlowData,
      includesProjections: includeProjections
    });

  } catch (error) {
    console.error('Cash flow report error:', error);
    return res.status(500).json({
      error: 'Failed to generate cash flow report',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}