import { Request, Response } from 'express';
import { PaymentService } from '../../services/payment.service';
import jwt from 'jsonwebtoken';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    familyId: string;
    email: string;
    role: string;
  };
}

export interface PaymentsSummaryResponse {
  message: string;
  summary: {
    totalScheduled: number;
    totalPaid: number;
    count: number;
    paidCount: number;
    overdueCount: number;
    completionRate: number;
    period: {
      startDate: string;
      endDate: string;
    };
  };
}

export async function getPaymentsSummary(req: AuthenticatedRequest, res: Response) {
  try {
    const startDateStr = req.query.startDate as string;
    const endDateStr = req.query.endDate as string;

    if (!startDateStr || !endDateStr) {
      return res.status(400).json({
        error: 'Missing date parameters',
        message: 'Both startDate and endDate are required in YYYY-MM-DD format.',
      });
    }

    let startDate: Date;
    let endDate: Date;

    try {
      startDate = new Date(startDateStr);
      endDate = new Date(endDateStr);

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        throw new Error('Invalid dates');
      }

      if (startDate >= endDate) {
        return res.status(400).json({
          error: 'Invalid date range',
          message: 'Start date must be before end date.',
        });
      }
    } catch (err) {
      return res.status(400).json({
        error: 'Invalid date format',
        message: 'Dates must be in YYYY-MM-DD format.',
      });
    }

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
      const summary = await PaymentService.getPaymentSummary(familyId, startDate, endDate);
      const completionRate = summary.count > 0 ? (summary.paidCount / summary.count) * 100 : 0;

      const response: PaymentsSummaryResponse = {
        message: 'Payments summary retrieved successfully.',
        summary: {
          totalScheduled: summary.totalScheduled,
          totalPaid: summary.totalPaid,
          count: summary.count,
          paidCount: summary.paidCount,
          overdueCount: summary.overdueCount,
          completionRate: Math.round(completionRate * 100) / 100,
          period: {
            startDate: startDate.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0],
          },
        },
      };

      res.status(200).json(response);
    } catch (serviceError) {
      console.error('Get payments summary error:', serviceError);

      res.status(500).json({
        error: 'Failed to get payments summary',
        message: 'Failed to retrieve payments summary. Please try again.',
      });
    }
  } catch (error) {
    console.error('Get payments summary endpoint error:', error);

    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve payments summary. Please try again.',
    });
  }
}