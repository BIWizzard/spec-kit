import { Request, Response } from 'express';
import { PaymentService, MarkPaidData } from '../../../services/payment.service';
import jwt from 'jsonwebtoken';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    familyId: string;
    email: string;
    role: string;
  };
}

export interface MarkPaidRequest {
  paidDate: string;
  paidAmount: number;
}

export interface MarkPaidResponse {
  message: string;
  payment: {
    id: string;
    payee: string;
    amount: number;
    dueDate: string;
    paidDate: string;
    paidAmount: number;
    status: string;
    updatedAt: string;
  };
}

export async function markPaymentAsPaid(req: AuthenticatedRequest, res: Response) {
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
    const { paidDate, paidAmount }: MarkPaidRequest = req.body;

    if (!paidDate || typeof paidDate !== 'string') {
      return res.status(400).json({
        error: 'Invalid paid date',
        message: 'Paid date is required and must be a string in YYYY-MM-DD format.',
      });
    }

    if (!paidAmount || typeof paidAmount !== 'number' || paidAmount <= 0) {
      return res.status(400).json({
        error: 'Invalid paid amount',
        message: 'Paid amount is required and must be a positive number.',
      });
    }

    // Parse and validate paid date
    let parsedPaidDate: Date;
    try {
      parsedPaidDate = new Date(paidDate);
      if (isNaN(parsedPaidDate.getTime())) {
        throw new Error('Invalid date');
      }

      // Check if paid date is not in the future
      const today = new Date();
      today.setHours(23, 59, 59, 999); // End of today
      if (parsedPaidDate > today) {
        return res.status(400).json({
          error: 'Invalid paid date',
          message: 'Paid date cannot be in the future.',
        });
      }
    } catch (err) {
      return res.status(400).json({
        error: 'Invalid paid date format',
        message: 'Paid date must be in YYYY-MM-DD format.',
      });
    }

    try {
      // Mark payment as paid
      const markPaidData: MarkPaidData = {
        paidDate: parsedPaidDate,
        paidAmount,
      };

      const payment = await PaymentService.markAsPaid(familyId, paymentId, markPaidData);

      const response: MarkPaidResponse = {
        message: 'Payment marked as paid successfully.',
        payment: {
          id: payment.id,
          payee: payment.payee,
          amount: payment.amount.toNumber(),
          dueDate: payment.dueDate.toISOString().split('T')[0],
          paidDate: payment.paidDate!.toISOString().split('T')[0],
          paidAmount: payment.paidAmount!.toNumber(),
          status: payment.status,
          updatedAt: payment.updatedAt.toISOString(),
        },
      };

      res.status(200).json(response);
    } catch (serviceError) {
      console.error('Mark payment as paid error:', serviceError);

      if (serviceError instanceof Error) {
        if (serviceError.message === 'Payment not found') {
          return res.status(404).json({
            error: 'Payment not found',
            message: 'The payment was not found.',
          });
        }

        if (serviceError.message === 'Payment already marked as paid') {
          return res.status(400).json({
            error: 'Payment already paid',
            message: 'The payment is already marked as paid.',
          });
        }

        if (serviceError.message === 'Cannot mark cancelled payment as paid') {
          return res.status(400).json({
            error: 'Cannot mark cancelled payment as paid',
            message: 'Cannot mark a cancelled payment as paid.',
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
        error: 'Failed to mark payment as paid',
        message: 'Failed to mark payment as paid. Please try again.',
      });
    }
  } catch (error) {
    console.error('Mark payment as paid endpoint error:', error);

    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to mark payment as paid. Please try again.',
    });
  }
}