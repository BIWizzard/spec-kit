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

export interface UpcomingPaymentInfo {
  id: string;
  payee: string;
  amount: number;
  dueDate: string;
  status: string;
  spendingCategory: {
    name: string;
    color: string;
  };
  autoPayEnabled: boolean;
}

export interface UpcomingPaymentsResponse {
  message: string;
  payments: UpcomingPaymentInfo[];
  summary: {
    totalAmount: number;
    count: number;
    daysAhead: number;
  };
}

export async function getUpcomingPayments(req: AuthenticatedRequest, res: Response) {
  try {
    const days = parseInt(req.query.days as string) || 30;

    if (days < 1 || days > 365) {
      return res.status(400).json({
        error: 'Invalid days parameter',
        message: 'Days must be between 1 and 365.',
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
      const payments = await PaymentService.getUpcomingPayments(familyId, days);

      const paymentData: UpcomingPaymentInfo[] = payments.map((payment) => ({
        id: payment.id,
        payee: payment.payee,
        amount: payment.amount.toNumber(),
        dueDate: payment.dueDate.toISOString().split('T')[0],
        status: payment.status,
        spendingCategory: {
          name: (payment as any).spendingCategory?.name || 'Unknown',
          color: (payment as any).spendingCategory?.color || '#000000',
        },
        autoPayEnabled: payment.autoPayEnabled,
      }));

      const totalAmount = paymentData.reduce((sum, payment) => sum + payment.amount, 0);

      const response: UpcomingPaymentsResponse = {
        message: 'Upcoming payments retrieved successfully.',
        payments: paymentData,
        summary: {
          totalAmount,
          count: paymentData.length,
          daysAhead: days,
        },
      };

      res.status(200).json(response);
    } catch (serviceError) {
      console.error('Get upcoming payments error:', serviceError);

      res.status(500).json({
        error: 'Failed to get upcoming payments',
        message: 'Failed to retrieve upcoming payments. Please try again.',
      });
    }
  } catch (error) {
    console.error('Get upcoming payments endpoint error:', error);

    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve upcoming payments. Please try again.',
    });
  }
}