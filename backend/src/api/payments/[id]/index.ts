import { Request, Response } from 'express';
import { PaymentService } from '../../../services/payment.service';
import jwt from 'jsonwebtoken';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    familyId: string;
    email: string;
    role: string;
  };
}

export interface PaymentDetailInfo {
  id: string;
  payee: string;
  amount: number;
  dueDate: string;
  paidDate: string | null;
  paidAmount: number | null;
  paymentType: string;
  frequency: string;
  nextDueDate: string | null;
  status: string;
  spendingCategory: {
    id: string;
    name: string;
    color: string;
    icon: string;
    budgetCategoryId: string;
  };
  autoPayEnabled: boolean;
  notes: string | null;
  paymentAttributions: Array<{
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
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentDetailResponse {
  message: string;
  payment: PaymentDetailInfo;
}

export async function getPaymentById(req: AuthenticatedRequest, res: Response) {
  try {
    // Extract payment ID from URL
    const { id: paymentId } = req.params;

    if (!paymentId || typeof paymentId !== 'string') {
      return res.status(400).json({
        error: 'Invalid payment ID',
        message: 'Payment ID is required and must be a valid string.',
      });
    }

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

    try {
      // Get payment by ID
      const payment = await PaymentService.getPaymentById(familyId, paymentId);

      if (!payment) {
        return res.status(404).json({
          error: 'Payment not found',
          message: 'The payment was not found.',
        });
      }

      const paymentData: PaymentDetailInfo = {
        id: payment.id,
        payee: payment.payee,
        amount: payment.amount.toNumber(),
        dueDate: payment.dueDate.toISOString().split('T')[0],
        paidDate: payment.paidDate ? payment.paidDate.toISOString().split('T')[0] : null,
        paidAmount: payment.paidAmount ? payment.paidAmount.toNumber() : null,
        paymentType: payment.paymentType,
        frequency: payment.frequency,
        nextDueDate: payment.nextDueDate ? payment.nextDueDate.toISOString().split('T')[0] : null,
        status: payment.status,
        spendingCategory: {
          id: (payment as any).spendingCategory?.id || '',
          name: (payment as any).spendingCategory?.name || 'Unknown',
          color: (payment as any).spendingCategory?.color || '#000000',
          icon: (payment as any).spendingCategory?.icon || 'default',
          budgetCategoryId: (payment as any).spendingCategory?.budgetCategoryId || '',
        },
        autoPayEnabled: payment.autoPayEnabled,
        notes: payment.notes,
        paymentAttributions: (payment as any).paymentAttributions?.map((attr: any) => ({
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
        })) || [],
        createdAt: payment.createdAt.toISOString(),
        updatedAt: payment.updatedAt.toISOString(),
      };

      const response: PaymentDetailResponse = {
        message: 'Payment retrieved successfully.',
        payment: paymentData,
      };

      res.status(200).json(response);
    } catch (serviceError) {
      console.error('Get payment details error:', serviceError);

      if (serviceError instanceof Error) {
        if (serviceError.message === 'Family not found') {
          return res.status(404).json({
            error: 'Family not found',
            message: 'The family was not found.',
          });
        }

        if (serviceError.message === 'Payment not found') {
          return res.status(404).json({
            error: 'Payment not found',
            message: 'The payment was not found.',
          });
        }
      }

      res.status(500).json({
        error: 'Failed to get payment details',
        message: 'Failed to retrieve payment details. Please try again.',
      });
    }
  } catch (error) {
    console.error('Get payment details endpoint error:', error);

    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve payment details. Please try again.',
    });
  }
}