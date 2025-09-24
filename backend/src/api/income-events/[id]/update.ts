import { Request, Response } from 'express';
import { IncomeService } from '../../../services/income.service';
import { ValidationService } from '../../../services/validation.service';
import jwt from 'jsonwebtoken';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    familyId: string;
    email: string;
    role: string;
  };
}

export interface UpdateIncomeEventRequest {
  amount?: number;
  receivedDate?: string;
  description?: string;
  metadata?: Record<string, any>;
}

export interface UpdateIncomeEventResponse {
  message: string;
  incomeEvent: {
    id: string;
    sourceId: string;
    sourceName: string;
    amount: number;
    receivedDate: string;
    description: string | null;
    metadata: Record<string, any> | null;
    updatedAt: string;
  };
}

export async function updateIncomeEvent(req: AuthenticatedRequest, res: Response) {
  try {
    const { amount, receivedDate, description, metadata }: UpdateIncomeEventRequest = req.body;
    const eventId = req.params.id;

    // Extract user from JWT token
    const authHeader = req.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'No token provided',
        message: 'Authentication token is required.',
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    let familyId: string;
    let userId: string;
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

      if (!decoded || !decoded.familyId || !decoded.userId) {
        return res.status(401).json({
          error: 'Invalid token',
          message: 'The provided token is invalid.',
        });
      }

      familyId = decoded.familyId;
      userId = decoded.userId;
    } catch (jwtError) {
      return res.status(401).json({
        error: 'Invalid token',
        message: 'The provided token is invalid or expired.',
      });
    }

    if (!eventId) {
      return res.status(400).json({
        error: 'Missing event ID',
        message: 'Income event ID is required.',
      });
    }

    // Validate input
    const validationErrors = ValidationService.validateUpdateIncomeEvent({
      amount,
      receivedDate,
      description,
      metadata,
    });

    if (validationErrors.length > 0) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validationErrors,
      });
    }

    try {
      // Update income event
      const updateData: any = {};
      if (amount !== undefined) updateData.amount = amount;
      if (receivedDate !== undefined) updateData.receivedDate = new Date(receivedDate);
      if (description !== undefined) updateData.description = description;
      if (metadata !== undefined) updateData.metadata = metadata;

      const incomeEvent = await IncomeService.updateIncomeEvent(familyId, eventId, updateData, userId);

      const response: UpdateIncomeEventResponse = {
        message: 'Income event updated successfully.',
        incomeEvent: {
          id: incomeEvent.id,
          sourceId: incomeEvent.sourceId,
          sourceName: incomeEvent.source.name,
          amount: incomeEvent.amount.toNumber(),
          receivedDate: incomeEvent.receivedDate.toISOString().split('T')[0], // Date only
          description: incomeEvent.description,
          metadata: incomeEvent.metadata as Record<string, any>,
          updatedAt: incomeEvent.updatedAt.toISOString(),
        },
      };

      res.status(200).json(response);
    } catch (serviceError) {
      console.error('Update income event error:', serviceError);

      if (serviceError instanceof Error) {
        if (serviceError.message === 'Income event not found') {
          return res.status(404).json({
            error: 'Income event not found',
            message: 'The income event was not found.',
          });
        }

        if (serviceError.message === 'Invalid date') {
          return res.status(400).json({
            error: 'Invalid date',
            message: 'Please provide a valid date in YYYY-MM-DD format.',
          });
        }

        if (serviceError.message === 'Cannot update received income event') {
          return res.status(400).json({
            error: 'Cannot update received event',
            message: 'Cannot update an income event that has already been marked as received.',
          });
        }
      }

      res.status(500).json({
        error: 'Failed to update income event',
        message: 'Failed to update income event. Please try again.',
      });
    }
  } catch (error) {
    console.error('Update income event endpoint error:', error);

    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to update income event. Please try again.',
    });
  }
}