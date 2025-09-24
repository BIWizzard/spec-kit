import { Request, Response } from 'express';
import { IncomeService } from '../../services/income.service';
import { ValidationService } from '../../services/validation.service';
import jwt from 'jsonwebtoken';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    familyId: string;
    email: string;
    role: string;
  };
}

export interface CreateIncomeEventRequest {
  sourceId: string;
  amount: number;
  receivedDate: string;
  description?: string;
  metadata?: Record<string, any>;
}

export interface CreateIncomeEventResponse {
  message: string;
  incomeEvent: {
    id: string;
    sourceId: string;
    sourceName: string;
    amount: number;
    receivedDate: string;
    description: string | null;
    metadata: Record<string, any> | null;
    createdAt: string;
  };
}

export async function createIncomeEvent(req: AuthenticatedRequest, res: Response) {
  try {
    const { sourceId, amount, receivedDate, description, metadata }: CreateIncomeEventRequest = req.body;

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

    // Validate input
    const validationErrors = ValidationService.validateCreateIncomeEvent({
      sourceId,
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
      // Create income event
      const incomeEvent = await IncomeService.createIncomeEvent(familyId, {
        sourceId,
        amount,
        receivedDate: new Date(receivedDate),
        description: description || null,
        metadata: metadata || null,
        createdBy: userId,
      });

      const response: CreateIncomeEventResponse = {
        message: 'Income event created successfully.',
        incomeEvent: {
          id: incomeEvent.id,
          sourceId: incomeEvent.sourceId,
          sourceName: incomeEvent.source.name,
          amount: incomeEvent.amount.toNumber(),
          receivedDate: incomeEvent.receivedDate.toISOString().split('T')[0], // Date only
          description: incomeEvent.description,
          metadata: incomeEvent.metadata as Record<string, any>,
          createdAt: incomeEvent.createdAt.toISOString(),
        },
      };

      res.status(201).json(response);
    } catch (serviceError) {
      console.error('Create income event error:', serviceError);

      if (serviceError instanceof Error) {
        if (serviceError.message === 'Income source not found') {
          return res.status(404).json({
            error: 'Income source not found',
            message: 'The specified income source was not found.',
          });
        }

        if (serviceError.message === 'Income source not active') {
          return res.status(400).json({
            error: 'Income source not active',
            message: 'The specified income source is not active.',
          });
        }

        if (serviceError.message === 'Invalid date') {
          return res.status(400).json({
            error: 'Invalid date',
            message: 'Please provide a valid date in YYYY-MM-DD format.',
          });
        }
      }

      res.status(500).json({
        error: 'Failed to create income event',
        message: 'Failed to create income event. Please try again.',
      });
    }
  } catch (error) {
    console.error('Create income event endpoint error:', error);

    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to create income event. Please try again.',
    });
  }
}