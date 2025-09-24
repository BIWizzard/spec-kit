import { Request, Response } from 'express';
import { PaymentService, CreatePaymentData } from '../../services/payment.service';
import jwt from 'jsonwebtoken';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    familyId: string;
    email: string;
    role: string;
  };
}

export interface BulkCreatePaymentRequest {
  payee: string;
  amount: number;
  dueDate: string;
  paymentType: 'once' | 'recurring' | 'variable';
  frequency?: 'once' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'annual';
  spendingCategoryId: string;
  autoPayEnabled?: boolean;
  notes?: string;
}

export interface BulkCreatePaymentsResponse {
  message: string;
  payments: Array<{
    id: string;
    payee: string;
    amount: number;
    dueDate: string;
    status: string;
  }>;
  summary: {
    totalCreated: number;
    totalAmount: number;
  };
}

export async function bulkCreatePayments(req: AuthenticatedRequest, res: Response) {
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

    const { payments }: { payments: BulkCreatePaymentRequest[] } = req.body;

    if (!payments || !Array.isArray(payments) || payments.length === 0) {
      return res.status(400).json({
        error: 'Invalid payments array',
        message: 'Payments must be a non-empty array.',
      });
    }

    if (payments.length > 100) {
      return res.status(400).json({
        error: 'Too many payments',
        message: 'Maximum 100 payments can be created at once.',
      });
    }

    // Validate each payment
    const validatedPayments: CreatePaymentData[] = [];

    for (let i = 0; i < payments.length; i++) {
      const payment = payments[i];
      const index = i + 1;

      if (!payment.payee || typeof payment.payee !== 'string') {
        return res.status(400).json({
          error: `Invalid payee at position ${index}`,
          message: `Payee is required and must be a string at position ${index}.`,
        });
      }

      if (!payment.amount || typeof payment.amount !== 'number' || payment.amount <= 0) {
        return res.status(400).json({
          error: `Invalid amount at position ${index}`,
          message: `Amount must be a positive number at position ${index}.`,
        });
      }

      if (!payment.dueDate || typeof payment.dueDate !== 'string') {
        return res.status(400).json({
          error: `Invalid due date at position ${index}`,
          message: `Due date is required at position ${index}.`,
        });
      }

      if (!payment.paymentType || !['once', 'recurring', 'variable'].includes(payment.paymentType)) {
        return res.status(400).json({
          error: `Invalid payment type at position ${index}`,
          message: `Payment type must be once, recurring, or variable at position ${index}.`,
        });
      }

      if (!payment.spendingCategoryId || typeof payment.spendingCategoryId !== 'string') {
        return res.status(400).json({
          error: `Invalid spending category at position ${index}`,
          message: `Spending category ID is required at position ${index}.`,
        });
      }

      let parsedDueDate: Date;
      try {
        parsedDueDate = new Date(payment.dueDate);
        if (isNaN(parsedDueDate.getTime())) {
          throw new Error('Invalid date');
        }
      } catch (err) {
        return res.status(400).json({
          error: `Invalid due date format at position ${index}`,
          message: `Due date must be in YYYY-MM-DD format at position ${index}.`,
        });
      }

      if (payment.paymentType === 'recurring') {
        if (!payment.frequency || !['weekly', 'biweekly', 'monthly', 'quarterly', 'annual'].includes(payment.frequency)) {
          return res.status(400).json({
            error: `Invalid frequency at position ${index}`,
            message: `Frequency is required for recurring payments at position ${index}.`,
          });
        }
      }

      validatedPayments.push({
        payee: payment.payee.trim(),
        amount: payment.amount,
        dueDate: parsedDueDate,
        paymentType: payment.paymentType,
        frequency: payment.frequency || 'once',
        spendingCategoryId: payment.spendingCategoryId,
        autoPayEnabled: payment.autoPayEnabled || false,
        notes: payment.notes?.trim() || null,
      });
    }

    try {
      const createdPayments = await PaymentService.bulkCreatePayments(familyId, validatedPayments);

      const paymentData = createdPayments.map((payment) => ({
        id: payment.id,
        payee: payment.payee,
        amount: payment.amount.toNumber(),
        dueDate: payment.dueDate.toISOString().split('T')[0],
        status: payment.status,
      }));

      const totalAmount = paymentData.reduce((sum, payment) => sum + payment.amount, 0);

      const response: BulkCreatePaymentsResponse = {
        message: 'Payments created successfully.',
        payments: paymentData,
        summary: {
          totalCreated: createdPayments.length,
          totalAmount,
        },
      };

      res.status(201).json(response);
    } catch (serviceError) {
      console.error('Bulk create payments error:', serviceError);

      if (serviceError instanceof Error) {
        if (serviceError.message === 'Invalid spending category') {
          return res.status(400).json({
            error: 'Invalid spending category',
            message: 'One or more spending categories do not exist or are not active.',
          });
        }
      }

      res.status(500).json({
        error: 'Failed to create payments',
        message: 'Failed to create payments. Please try again.',
      });
    }
  } catch (error) {
    console.error('Bulk create payments endpoint error:', error);

    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to create payments. Please try again.',
    });
  }
}