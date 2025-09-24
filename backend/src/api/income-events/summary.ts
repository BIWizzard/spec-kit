import { Request, Response } from 'express';
import { IncomeService } from '../../services/income.service';
import jwt from 'jsonwebtoken';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    familyId: string;
    email: string;
    role: string;
  };
}

export interface IncomeSourceSummary {
  sourceId: string;
  sourceName: string;
  totalEvents: number;
  totalAmount: number;
  receivedEvents: number;
  receivedAmount: number;
  pendingEvents: number;
  pendingAmount: number;
  averageAmount: number;
}

export interface IncomeSummaryResponse {
  message: string;
  dateRange: {
    startDate: string;
    endDate: string;
  };
  totals: {
    totalEvents: number;
    totalAmount: number;
    receivedEvents: number;
    receivedAmount: number;
    pendingEvents: number;
    pendingAmount: number;
    receivedPercentage: number;
  };
  sourceBreakdown: IncomeSourceSummary[];
  monthlyTrends: Array<{
    month: string;
    totalEvents: number;
    totalAmount: number;
    receivedEvents: number;
    receivedAmount: number;
  }>;
}

export async function getIncomeEventsSummary(req: AuthenticatedRequest, res: Response) {
  try {
    // Extract query parameters
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;
    const groupBy = (req.query.groupBy as string) || 'month'; // month, week, day

    // Extract user from JWT token
    const authHeader = req.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'No token provided',
        message: 'Authentication token is required.',
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

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
      // Default date range to current month if not provided
      const today = new Date();
      const defaultStartDate = startDate ? new Date(startDate) : new Date(today.getFullYear(), today.getMonth(), 1);
      const defaultEndDate = endDate ? new Date(endDate) : new Date(today.getFullYear(), today.getMonth() + 1, 0);

      // Get income events summary
      const summary = await IncomeService.getIncomeEventsSummary(familyId, {
        startDate: defaultStartDate,
        endDate: defaultEndDate,
        groupBy: groupBy as 'month' | 'week' | 'day',
      });

      const sourceBreakdownData: IncomeSourceSummary[] = summary.sourceBreakdown.map((source) => ({
        sourceId: source.sourceId,
        sourceName: source.sourceName,
        totalEvents: source.totalEvents,
        totalAmount: source.totalAmount,
        receivedEvents: source.receivedEvents,
        receivedAmount: source.receivedAmount,
        pendingEvents: source.totalEvents - source.receivedEvents,
        pendingAmount: source.totalAmount - source.receivedAmount,
        averageAmount: source.totalEvents > 0 ? source.totalAmount / source.totalEvents : 0,
      }));

      const monthlyTrendsData = summary.trends.map((trend) => ({
        month: trend.period,
        totalEvents: trend.totalEvents,
        totalAmount: trend.totalAmount,
        receivedEvents: trend.receivedEvents,
        receivedAmount: trend.receivedAmount,
      }));

      const receivedPercentage = summary.totals.totalAmount > 0
        ? (summary.totals.receivedAmount / summary.totals.totalAmount) * 100
        : 0;

      const response: IncomeSummaryResponse = {
        message: 'Income events summary retrieved successfully.',
        dateRange: {
          startDate: defaultStartDate.toISOString().split('T')[0],
          endDate: defaultEndDate.toISOString().split('T')[0],
        },
        totals: {
          totalEvents: summary.totals.totalEvents,
          totalAmount: summary.totals.totalAmount,
          receivedEvents: summary.totals.receivedEvents,
          receivedAmount: summary.totals.receivedAmount,
          pendingEvents: summary.totals.totalEvents - summary.totals.receivedEvents,
          pendingAmount: summary.totals.totalAmount - summary.totals.receivedAmount,
          receivedPercentage: Math.round(receivedPercentage * 100) / 100, // Round to 2 decimals
        },
        sourceBreakdown: sourceBreakdownData,
        monthlyTrends: monthlyTrendsData,
      };

      res.status(200).json(response);
    } catch (serviceError) {
      console.error('Get income events summary error:', serviceError);

      if (serviceError instanceof Error) {
        if (serviceError.message === 'Family not found') {
          return res.status(404).json({
            error: 'Family not found',
            message: 'The family was not found.',
          });
        }

        if (serviceError.message.includes('Invalid date')) {
          return res.status(400).json({
            error: 'Invalid date format',
            message: 'Please provide dates in YYYY-MM-DD format.',
          });
        }
      }

      res.status(500).json({
        error: 'Failed to get income events summary',
        message: 'Failed to retrieve income events summary. Please try again.',
      });
    }
  } catch (error) {
    console.error('Get income events summary endpoint error:', error);

    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve income events summary. Please try again.',
    });
  }
}