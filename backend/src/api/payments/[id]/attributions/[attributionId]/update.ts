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

export interface UpdateAttributionRequest {
  amount: number;
  attributionType?: 'manual' | 'automatic';
}

export interface UpdateAttributionResponse {
  message: string;
  attribution: {
    id: string;
    amount: number;
    attributionType: string;
    updatedAt: string;
  };
}

export async function updatePaymentAttribution(req: AuthenticatedRequest, res: Response) {
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
    let memberId: string;

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      if (!decoded || !decoded.familyId || !decoded.id) {
        return res.status(401).json({
          error: 'Invalid token',
          message: 'The provided token is invalid.',
        });
      }
      familyId = decoded.familyId;
      memberId = decoded.id;
    } catch (jwtError) {
      return res.status(401).json({
        error: 'Invalid token',
        message: 'The provided token is invalid or expired.',
      });
    }

    const { amount, attributionType }: UpdateAttributionRequest = req.body;

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({
        error: 'Invalid amount',
        message: 'Amount is required and must be a positive number.',
      });
    }

    if (attributionType && !['manual', 'automatic'].includes(attributionType)) {
      return res.status(400).json({
        error: 'Invalid attribution type',
        message: 'Attribution type must be either manual or automatic.',
      });
    }

    try {
      // Note: The service doesn't have an update method, so we'll remove and recreate
      // First, get the existing attribution to get income event ID
      const payment = await PaymentService.getPaymentById(familyId, paymentId);
      if (!payment) {
        return res.status(404).json({
          error: 'Payment not found',
          message: 'The payment was not found.',
        });
      }

      const existingAttribution = (payment as any).paymentAttributions?.find((attr: any) => attr.id === attributionId);
      if (!existingAttribution) {
        return res.status(404).json({
          error: 'Attribution not found',
          message: 'The payment attribution was not found.',
        });
      }

      // Remove existing attribution
      await PaymentService.removeAttribution(familyId, paymentId, attributionId);

      // Create new attribution with updated values
      const newAttribution = await PaymentService.attributeToIncome(
        familyId,
        paymentId,
        {
          incomeEventId: existingAttribution.incomeEventId,
          amount,
          attributionType: attributionType || existingAttribution.attributionType,
        },
        memberId
      );

      const response: UpdateAttributionResponse = {
        message: 'Payment attribution updated successfully.',
        attribution: {
          id: newAttribution.id,
          amount: newAttribution.amount.toNumber(),
          attributionType: newAttribution.attributionType,
          updatedAt: newAttribution.createdAt.toISOString(), // createdAt since it's a new record
        },
      };

      res.status(200).json(response);
    } catch (serviceError) {
      console.error('Update payment attribution error:', serviceError);

      if (serviceError instanceof Error) {
        if (serviceError.message === 'Attribution not found') {
          return res.status(404).json({
            error: 'Attribution not found',
            message: 'The payment attribution was not found.',
          });
        }

        if (serviceError.message === 'Attribution amount exceeds payment amount') {
          return res.status(400).json({
            error: 'Attribution amount exceeds payment amount',
            message: 'The attribution amount would exceed the total payment amount.',
          });
        }

        if (serviceError.message === 'Attribution amount exceeds available income') {
          return res.status(400).json({
            error: 'Attribution amount exceeds available income',
            message: 'The attribution amount exceeds the available income balance.',
          });
        }
      }

      res.status(500).json({
        error: 'Failed to update payment attribution',
        message: 'Failed to update payment attribution. Please try again.',
      });
    }
  } catch (error) {
    console.error('Update payment attribution endpoint error:', error);

    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to update payment attribution. Please try again.',
    });
  }
}