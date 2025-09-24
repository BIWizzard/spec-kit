import { Request, Response } from 'express';
import { PaymentService, UpdatePaymentData } from '../../../services/payment.service';
import jwt from 'jsonwebtoken';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    familyId: string;
    email: string;
    role: string;
  };
}

export interface UpdatePaymentRequest {
  payee?: string;
  amount?: number;
  dueDate?: string;
  paymentType?: 'once' | 'recurring' | 'variable';
  frequency?: 'once' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'annual';
  spendingCategoryId?: string;
  autoPayEnabled?: boolean;
  notes?: string;
}

export interface UpdatePaymentResponse {
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
    updatedAt: string;
  };
}

export async function updatePayment(req: AuthenticatedRequest, res: Response) {
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
    }: UpdatePaymentRequest = req.body;

    // Validate provided fields
    if (payee !== undefined && (typeof payee !== 'string' || payee.trim().length === 0)) {
      return res.status(400).json({
        error: 'Invalid payee',
        message: 'Payee must be a non-empty string.',
      });
    }

    if (amount !== undefined && (typeof amount !== 'number' || amount <= 0)) {
      return res.status(400).json({
        error: 'Invalid amount',
        message: 'Amount must be a positive number.',
      });
    }

    if (dueDate !== undefined && typeof dueDate !== 'string') {
      return res.status(400).json({
        error: 'Invalid due date',
        message: 'Due date must be a string in YYYY-MM-DD format.',
      });
    }

    if (paymentType !== undefined && !['once', 'recurring', 'variable'].includes(paymentType)) {
      return res.status(400).json({
        error: 'Invalid payment type',
        message: 'Payment type must be one of: once, recurring, variable.',
      });
    }

    if (spendingCategoryId !== undefined && typeof spendingCategoryId !== 'string') {
      return res.status(400).json({
        error: 'Invalid spending category',
        message: 'Spending category ID must be a string.',
      });
    }

    // Parse and validate due date if provided
    let parsedDueDate: Date | undefined;
    if (dueDate !== undefined) {
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
    }

    // Validate frequency for recurring payments
    if (paymentType === 'recurring' && frequency !== undefined) {
      if (!['weekly', 'biweekly', 'monthly', 'quarterly', 'annual'].includes(frequency)) {
        return res.status(400).json({
          error: 'Invalid frequency',
          message: 'Frequency must be one of: weekly, biweekly, monthly, quarterly, annual.',
        });
      }
    }

    try {
      // Create update data
      const updateData: UpdatePaymentData = {};

      if (payee !== undefined) updateData.payee = payee.trim();
      if (amount !== undefined) updateData.amount = amount;
      if (parsedDueDate !== undefined) updateData.dueDate = parsedDueDate;
      if (paymentType !== undefined) updateData.paymentType = paymentType;
      if (frequency !== undefined) updateData.frequency = frequency;
      if (spendingCategoryId !== undefined) updateData.spendingCategoryId = spendingCategoryId;
      if (autoPayEnabled !== undefined) updateData.autoPayEnabled = autoPayEnabled;
      if (notes !== undefined) updateData.notes = notes?.trim() || null;

      // Update the payment
      const payment = await PaymentService.updatePayment(familyId, paymentId, updateData);

      const response: UpdatePaymentResponse = {
        message: 'Payment updated successfully.',
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
          updatedAt: payment.updatedAt.toISOString(),
        },
      };

      res.status(200).json(response);
    } catch (serviceError) {
      console.error('Update payment error:', serviceError);

      if (serviceError instanceof Error) {
        if (serviceError.message === 'Payment not found') {
          return res.status(404).json({
            error: 'Payment not found',
            message: 'The payment was not found.',
          });
        }

        if (serviceError.message === 'Cannot update paid payment') {
          return res.status(400).json({
            error: 'Cannot update paid payment',
            message: 'Cannot update a payment that has already been marked as paid.',
          });
        }

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
        error: 'Failed to update payment',
        message: 'Failed to update payment. Please try again.',
      });
    }
  } catch (error) {
    console.error('Update payment endpoint error:', error);

    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to update payment. Please try again.',
    });
  }
}