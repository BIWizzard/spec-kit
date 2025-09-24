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

export interface DeletePaymentResponse {
  message: string;
  paymentId: string;
}

export async function deletePayment(req: AuthenticatedRequest, res: Response) {
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
      // Delete the payment
      await PaymentService.deletePayment(familyId, paymentId);

      const response: DeletePaymentResponse = {
        message: 'Payment deleted successfully.',
        paymentId,
      };

      res.status(200).json(response);
    } catch (serviceError) {
      console.error('Delete payment error:', serviceError);

      if (serviceError instanceof Error) {
        if (serviceError.message === 'Payment not found') {
          return res.status(404).json({
            error: 'Payment not found',
            message: 'The payment was not found.',
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
        error: 'Failed to delete payment',
        message: 'Failed to delete payment. Please try again.',
      });
    }
  } catch (error) {
    console.error('Delete payment endpoint error:', error);

    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to delete payment. Please try again.',
    });
  }
}