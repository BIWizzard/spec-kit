import { Request, Response } from 'express';
import { PaymentService, AttributeToIncomeData } from '../../../../services/payment.service';
import jwt from 'jsonwebtoken';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    familyId: string;
    email: string;
    role: string;
  };
}

export interface CreateAttributionRequest {
  incomeEventId: string;
  amount: number;
  attributionType: 'manual' | 'automatic';
}

export interface CreateAttributionResponse {
  message: string;
  attribution: {
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
  };
}

export async function createPaymentAttribution(req: AuthenticatedRequest, res: Response) {
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

    const { incomeEventId, amount, attributionType }: CreateAttributionRequest = req.body;

    if (!incomeEventId || typeof incomeEventId !== 'string') {
      return res.status(400).json({
        error: 'Invalid income event ID',
        message: 'Income event ID is required and must be a valid string.',
      });
    }

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({
        error: 'Invalid amount',
        message: 'Amount is required and must be a positive number.',
      });
    }

    if (!attributionType || !['manual', 'automatic'].includes(attributionType)) {
      return res.status(400).json({
        error: 'Invalid attribution type',
        message: 'Attribution type must be either manual or automatic.',
      });
    }

    try {
      const attributeData: AttributeToIncomeData = {
        incomeEventId,
        amount,
        attributionType,
      };

      const attribution = await PaymentService.attributeToIncome(familyId, paymentId, attributeData, memberId);

      // Get the income event details for response
      const payment = await PaymentService.getPaymentById(familyId, paymentId);
      const incomeEvent = (payment as any)?.paymentAttributions
        ?.find((attr: any) => attr.id === attribution.id)?.incomeEvent;

      const response: CreateAttributionResponse = {
        message: 'Payment attribution created successfully.',
        attribution: {
          id: attribution.id,
          amount: attribution.amount.toNumber(),
          attributionType: attribution.attributionType,
          createdAt: attribution.createdAt.toISOString(),
          incomeEvent: incomeEvent ? {
            id: incomeEvent.id,
            name: incomeEvent.name,
            scheduledDate: incomeEvent.scheduledDate.toISOString().split('T')[0],
            amount: incomeEvent.amount.toNumber(),
          } : {
            id: incomeEventId,
            name: 'Unknown',
            scheduledDate: new Date().toISOString().split('T')[0],
            amount: 0,
          },
        },
      };

      res.status(201).json(response);
    } catch (serviceError) {
      console.error('Create payment attribution error:', serviceError);

      if (serviceError instanceof Error) {
        if (serviceError.message === 'Payment not found') {
          return res.status(404).json({
            error: 'Payment not found',
            message: 'The payment was not found.',
          });
        }

        if (serviceError.message === 'Income event not found') {
          return res.status(404).json({
            error: 'Income event not found',
            message: 'The income event was not found.',
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
        error: 'Failed to create payment attribution',
        message: 'Failed to create payment attribution. Please try again.',
      });
    }
  } catch (error) {
    console.error('Create payment attribution endpoint error:', error);

    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to create payment attribution. Please try again.',
    });
  }
}