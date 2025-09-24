import { Request, Response } from 'express';
import { PaymentService } from '../../../../services/payment.service';
import jwt from 'jsonwebtoken';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    familyId: string;
    email: string;
    role: string;
  };
}

export interface PaymentAttributionInfo {
  id: string;
  amount: number;
  attributionType: string;
  createdAt: string;
  incomeEvent: {
    id: string;
    name: string;
    scheduledDate: string;
    amount: number;
  };
}

export interface PaymentAttributionsResponse {
  message: string;
  attributions: PaymentAttributionInfo[];
  summary: {
    totalAttributed: number;
    remainingAmount: number;
    paymentAmount: number;
    attributionCount: number;
  };
}

export async function getPaymentAttributions(req: AuthenticatedRequest, res: Response) {
  try {
    const { id: paymentId } = req.params;

    if (!paymentId || typeof paymentId !== 'string') {
      return res.status(400).json({
        error: 'Invalid payment ID',
        message: 'Payment ID is required and must be a valid string.',
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
      const payment = await PaymentService.getPaymentById(familyId, paymentId);

      if (!payment) {
        return res.status(404).json({
          error: 'Payment not found',
          message: 'The payment was not found.',
        });
      }

      const attributions = (payment as any).paymentAttributions || [];
      const totalAttributed = attributions.reduce((sum: number, attr: any) => sum + attr.amount.toNumber(), 0);
      const paymentAmount = payment.amount.toNumber();

      const attributionData: PaymentAttributionInfo[] = attributions.map((attr: any) => ({
        id: attr.id,
        amount: attr.amount.toNumber(),
        attributionType: attr.attributionType,
        createdAt: attr.createdAt.toISOString(),
        incomeEvent: {
          id: attr.incomeEvent.id,
          name: attr.incomeEvent.name,
          scheduledDate: attr.incomeEvent.scheduledDate.toISOString().split('T')[0],
          amount: attr.incomeEvent.amount.toNumber(),
        },
      }));

      const response: PaymentAttributionsResponse = {
        message: 'Payment attributions retrieved successfully.',
        attributions: attributionData,
        summary: {
          totalAttributed,
          remainingAmount: paymentAmount - totalAttributed,
          paymentAmount,
          attributionCount: attributions.length,
        },
      };

      res.status(200).json(response);
    } catch (serviceError) {
      console.error('Get payment attributions error:', serviceError);

      res.status(500).json({
        error: 'Failed to get payment attributions',
        message: 'Failed to retrieve payment attributions. Please try again.',
      });
    }
  } catch (error) {
    console.error('Get payment attributions endpoint error:', error);

    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve payment attributions. Please try again.',
    });
  }
}