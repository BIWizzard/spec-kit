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

export interface AutoAttributeResponse {
  message: string;
  attributedCount: number;
}

export async function autoAttributePayments(req: AuthenticatedRequest, res: Response) {
  try {
    // Extract payment ID from URL (optional - if provided, auto-attribute specific payment)
    const { id: paymentId } = req.params;

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
      // If specific payment ID provided, validate it exists first
      if (paymentId) {
        const payment = await PaymentService.getPaymentById(familyId, paymentId);
        if (!payment) {
          return res.status(404).json({
            error: 'Payment not found',
            message: 'The payment was not found.',
          });
        }
      }

      // Run auto-attribution for all unattributed payments in the family
      const attributedCount = await PaymentService.autoAttributePayments(familyId);

      const message = paymentId
        ? `Auto-attribution completed for payment ${paymentId}.`
        : 'Auto-attribution completed for all unattributed payments.';

      const response: AutoAttributeResponse = {
        message,
        attributedCount,
      };

      res.status(200).json(response);
    } catch (serviceError) {
      console.error('Auto-attribute payments error:', serviceError);

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

        if (serviceError.message === 'No available income events') {
          return res.status(400).json({
            error: 'No available income events',
            message: 'No income events with remaining balance are available for attribution.',
          });
        }
      }

      res.status(500).json({
        error: 'Failed to auto-attribute payments',
        message: 'Failed to auto-attribute payments. Please try again.',
      });
    }
  } catch (error) {
    console.error('Auto-attribute payments endpoint error:', error);

    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to auto-attribute payments. Please try again.',
    });
  }
}