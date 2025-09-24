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

export interface RevertPaidResponse {
  message: string;
  payment: {
    id: string;
    payee: string;
    amount: number;
    dueDate: string;
    status: string;
    updatedAt: string;
  };
}

export async function revertPaymentPaid(req: AuthenticatedRequest, res: Response) {
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
      const payment = await PaymentService.revertPaid(familyId, paymentId);

      const response: RevertPaidResponse = {
        message: 'Payment payment status reverted successfully.',
        payment: {
          id: payment.id,
          payee: payment.payee,
          amount: payment.amount.toNumber(),
          dueDate: payment.dueDate.toISOString().split('T')[0],
          status: payment.status,
          updatedAt: payment.updatedAt.toISOString(),
        },
      };

      res.status(200).json(response);
    } catch (serviceError) {
      console.error('Revert payment paid error:', serviceError);

      if (serviceError instanceof Error) {
        if (serviceError.message === 'Payment not found') {
          return res.status(404).json({
            error: 'Payment not found',
            message: 'The payment was not found.',
          });
        }

        if (serviceError.message === 'Payment is not marked as paid') {
          return res.status(400).json({
            error: 'Payment not paid',
            message: 'The payment is not currently marked as paid.',
          });
        }
      }

      res.status(500).json({
        error: 'Failed to revert payment status',
        message: 'Failed to revert payment status. Please try again.',
      });
    }
  } catch (error) {
    console.error('Revert payment paid endpoint error:', error);

    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to revert payment status. Please try again.',
    });
  }
}