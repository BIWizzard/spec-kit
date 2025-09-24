import { Request, Response } from 'express';
import { PaymentService } from '../../../../../services/payment.service';
import jwt from 'jsonwebtoken';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    familyId: string;
    email: string;
    role: string;
  };
}

export interface DeleteAttributionResponse {
  message: string;
  attributionId: string;
  paymentId: string;
}

export async function deletePaymentAttribution(req: AuthenticatedRequest, res: Response) {
  try {
    const { id: paymentId, attributionId } = req.params;

    if (!paymentId || typeof paymentId !== 'string') {
      return res.status(400).json({
        error: 'Invalid payment ID',
        message: 'Payment ID is required and must be a valid string.',
      });
    }

    if (!attributionId || typeof attributionId !== 'string') {
      return res.status(400).json({
        error: 'Invalid attribution ID',
        message: 'Attribution ID is required and must be a valid string.',
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
      await PaymentService.removeAttribution(familyId, paymentId, attributionId);

      const response: DeleteAttributionResponse = {
        message: 'Payment attribution deleted successfully.',
        attributionId,
        paymentId,
      };

      res.status(200).json(response);
    } catch (serviceError) {
      console.error('Delete payment attribution error:', serviceError);

      if (serviceError instanceof Error) {
        if (serviceError.message === 'Attribution not found') {
          return res.status(404).json({
            error: 'Attribution not found',
            message: 'The payment attribution was not found.',
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
        error: 'Failed to delete payment attribution',
        message: 'Failed to delete payment attribution. Please try again.',
      });
    }
  } catch (error) {
    console.error('Delete payment attribution endpoint error:', error);

    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to delete payment attribution. Please try again.',
    });
  }
}