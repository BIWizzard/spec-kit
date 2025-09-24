import { Request, Response } from 'express';
import { IncomeService } from '../../../services/income.service';
import jwt from 'jsonwebtoken';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    familyId: string;
    email: string;
    role: string;
  };
}

export interface IncomeEventInfo {
  id: string;
  sourceId: string;
  sourceName: string;
  amount: number;
  receivedDate: string;
  description: string | null;
  metadata: Record<string, any> | null;
  createdAt: string;
  updatedAt: string;
}

export interface IncomeEventResponse {
  message: string;
  incomeEvent: IncomeEventInfo;
}

export async function getIncomeEvent(req: AuthenticatedRequest, res: Response) {
  try {
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

    if (!eventId) {
      return res.status(400).json({
        error: 'Missing event ID',
        message: 'Income event ID is required.',
      });
    }

    try {
      // Get income event by ID
      const incomeEvent = await IncomeService.getIncomeEventById(familyId, eventId);

      if (!incomeEvent) {
        return res.status(404).json({
          error: 'Income event not found',
          message: 'The income event was not found.',
        });
      }

      const incomeEventData: IncomeEventInfo = {
        id: incomeEvent.id,
        sourceId: incomeEvent.sourceId,
        sourceName: incomeEvent.source.name,
        amount: incomeEvent.amount.toNumber(),
        receivedDate: incomeEvent.receivedDate.toISOString().split('T')[0], // Date only
        description: incomeEvent.description,
        metadata: incomeEvent.metadata as Record<string, any>,
        createdAt: incomeEvent.createdAt.toISOString(),
        updatedAt: incomeEvent.updatedAt.toISOString(),
      };

      const response: IncomeEventResponse = {
        message: 'Income event retrieved successfully.',
        incomeEvent: incomeEventData,
      };

      res.status(200).json(response);
    } catch (serviceError) {
      console.error('Get income event error:', serviceError);

      if (serviceError instanceof Error) {
        if (serviceError.message === 'Income event not found') {
          return res.status(404).json({
            error: 'Income event not found',
            message: 'The income event was not found.',
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
        error: 'Failed to get income event',
        message: 'Failed to retrieve income event. Please try again.',
      });
    }
  } catch (error) {
    console.error('Get income event endpoint error:', error);

    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve income event. Please try again.',
    });
  }
}