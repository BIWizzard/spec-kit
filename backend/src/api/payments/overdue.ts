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

export interface OverduePaymentInfo {
  id: string;
  payee: string;
  amount: number;
  dueDate: string;
  daysPastDue: number;
  status: string;
  spendingCategory: {
    name: string;
    color: string;
  };
  autoPayEnabled: boolean;
}

export interface OverduePaymentsResponse {
  message: string;
  payments: OverduePaymentInfo[];
  summary: {
    totalAmount: number;
    count: number;
    oldestDaysPastDue: number;
  };
}

export async function getOverduePayments(req: AuthenticatedRequest, res: Response) {
  try {
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
      const payments = await PaymentService.getOverduePayments(familyId);
      const today = new Date();

      const paymentData: OverduePaymentInfo[] = payments.map((payment) => {
        const dueDate = new Date(payment.dueDate);
        const daysPastDue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

        return {
          id: payment.id,
          payee: payment.payee,
          amount: payment.amount.toNumber(),
          dueDate: payment.dueDate.toISOString().split('T')[0],
          daysPastDue: Math.max(0, daysPastDue),
          status: payment.status,
          spendingCategory: {
            name: (payment as any).spendingCategory?.name || 'Unknown',
            color: (payment as any).spendingCategory?.color || '#000000',
          },
          autoPayEnabled: payment.autoPayEnabled,
        };
      });

      const totalAmount = paymentData.reduce((sum, payment) => sum + payment.amount, 0);
      const oldestDaysPastDue = paymentData.length > 0
        ? Math.max(...paymentData.map(p => p.daysPastDue))
        : 0;

      const response: OverduePaymentsResponse = {
        message: 'Overdue payments retrieved successfully.',
        payments: paymentData,
        summary: {
          totalAmount,
          count: paymentData.length,
          oldestDaysPastDue,
        },
      };

      res.status(200).json(response);
    } catch (serviceError) {
      console.error('Get overdue payments error:', serviceError);

      res.status(500).json({
        error: 'Failed to get overdue payments',
        message: 'Failed to retrieve overdue payments. Please try again.',
      });
    }
  } catch (error) {
    console.error('Get overdue payments endpoint error:', error);

    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve overdue payments. Please try again.',
    });
  }
}