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

export interface CreatePaymentRequest {
  payee: string;
  amount: number;
  dueDate: string;
  paymentType: 'once' | 'recurring' | 'variable';
  frequency?: 'once' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'annual';
  spendingCategoryId: string;
  autoPayEnabled?: boolean;
  notes?: string;
}

export interface CreatePaymentResponse {
  message: string;
  payment: {
    id: string;
    payee: string;
    amount: number;
    dueDate: string;
    paymentType: string;
    frequency: string;
    nextDueDate: string | null;
    status: string;
    spendingCategoryId: string;
    autoPayEnabled: boolean;
    notes: string | null;
    createdAt: string;
  };
}

export async function createPayment(req: AuthenticatedRequest, res: Response) {
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

    // Validate request body
    const {
      payee,
      amount,
      dueDate,
      paymentType,
      frequency,
      spendingCategoryId,
      autoPayEnabled,
      notes,
    }: CreatePaymentRequest = req.body;

    // Required fields validation
    if (!payee || typeof payee !== 'string') {
      return res.status(400).json({
        error: 'Invalid payee',
        message: 'Payee is required and must be a string.',
      });
    }

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({
        error: 'Invalid amount',
        message: 'Amount is required and must be a positive number.',
      });
    }

    if (!dueDate || typeof dueDate !== 'string') {
      return res.status(400).json({
        error: 'Invalid due date',
        message: 'Due date is required and must be a string in YYYY-MM-DD format.',
      });
    }

    if (!paymentType || !['once', 'recurring', 'variable'].includes(paymentType)) {
      return res.status(400).json({
        error: 'Invalid payment type',
        message: 'Payment type must be one of: once, recurring, variable.',
      });
    }

    if (!spendingCategoryId || typeof spendingCategoryId !== 'string') {
      return res.status(400).json({
        error: 'Invalid spending category',
        message: 'Spending category ID is required.',
      });
    }

    // Parse and validate due date
    let parsedDueDate: Date;
    try {
      parsedDueDate = new Date(dueDate);
      if (isNaN(parsedDueDate.getTime())) {
        throw new Error('Invalid date');
      }
    } catch (err) {
      return res.status(400).json({
        error: 'Invalid due date format',
        message: 'Due date must be in YYYY-MM-DD format.',
      });
    }

    // Validate frequency for recurring payments
    if (paymentType === 'recurring') {
      if (!frequency || !['weekly', 'biweekly', 'monthly', 'quarterly', 'annual'].includes(frequency)) {
        return res.status(400).json({
          error: 'Invalid frequency',
          message: 'Frequency is required for recurring payments and must be one of: weekly, biweekly, monthly, quarterly, annual.',
        });
      }
    }

    try {
      // Create payment data
      const createData: CreatePaymentData = {
        payee: payee.trim(),
        amount,
        dueDate: parsedDueDate,
        paymentType,
        frequency: frequency || 'once',
        spendingCategoryId,
        autoPayEnabled: autoPayEnabled || false,
        notes: notes?.trim() || null,
      };

      // Create the payment
      const payment = await PaymentService.createPayment(familyId, createData);

      const response: CreatePaymentResponse = {
        message: 'Payment created successfully.',
        payment: {
          id: payment.id,
          payee: payment.payee,
          amount: payment.amount.toNumber(),
          dueDate: payment.dueDate.toISOString().split('T')[0],
          paymentType: payment.paymentType,
          frequency: payment.frequency,
          nextDueDate: payment.nextDueDate ? payment.nextDueDate.toISOString().split('T')[0] : null,
          status: payment.status,
          spendingCategoryId: payment.spendingCategoryId,
          autoPayEnabled: payment.autoPayEnabled,
          notes: payment.notes,
          createdAt: payment.createdAt.toISOString(),
        },
      };

      res.status(201).json(response);
    } catch (serviceError) {
      console.error('Create payment error:', serviceError);

      if (serviceError instanceof Error) {
        if (serviceError.message === 'Invalid spending category') {
          return res.status(400).json({
            error: 'Invalid spending category',
            message: 'The specified spending category does not exist or is not active.',
          });
        }

        if (serviceError.message === 'Family not found') {
          return res.status(404).json({
            error: 'Family not found',
            message: 'The family was not found.',
          });
        }
      }

      res.status(500).json({
        error: 'Failed to create payment',
        message: 'Failed to create payment. Please try again.',
      });
    }
  } catch (error) {
    console.error('Create payment endpoint error:', error);

    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to create payment. Please try again.',
    });
  }
}