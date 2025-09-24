import { Request, Response } from 'express';
import { IncomeService } from '../../services/income.service';
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

export interface IncomeEventsResponse {
  message: string;
  incomeEvents: IncomeEventInfo[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export async function getIncomeEvents(req: AuthenticatedRequest, res: Response) {
  try {
    // Extract pagination and filter parameters
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100); // Max 100 items
    const offset = Math.max(parseInt(req.query.offset as string) || 0, 0);
    const sourceId = req.query.sourceId as string;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;

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

    try {
      // Get income events with filters
      const filters = {
        ...(sourceId && { sourceId }),
        ...(startDate && { startDate: new Date(startDate) }),
        ...(endDate && { endDate: new Date(endDate) }),
      };

      const incomeEvents = await IncomeService.getIncomeEvents(familyId, {
        ...filters,
        limit,
        offset,
      });

      // Get total count for pagination
      const totalCount = await IncomeService.getIncomeEventsCount(familyId, filters);
      const hasMore = offset + limit < totalCount;

      const incomeEventData: IncomeEventInfo[] = incomeEvents.map((event) => ({
        id: event.id,
        sourceId: event.sourceId,
        sourceName: event.source.name,
        amount: event.amount.toNumber(),
        receivedDate: event.receivedDate.toISOString().split('T')[0], // Date only
        description: event.description,
        metadata: event.metadata as Record<string, any>,
        createdAt: event.createdAt.toISOString(),
        updatedAt: event.updatedAt.toISOString(),
      }));

      const response: IncomeEventsResponse = {
        message: 'Income events retrieved successfully.',
        incomeEvents: incomeEventData,
        pagination: {
          total: totalCount,
          limit,
          offset,
          hasMore,
        },
      };

      res.status(200).json(response);
    } catch (serviceError) {
      console.error('Get income events error:', serviceError);

      if (serviceError instanceof Error) {
        if (serviceError.message === 'Family not found') {
          return res.status(404).json({
            error: 'Family not found',
            message: 'The family was not found.',
          });
        }

        if (serviceError.message.includes('Invalid date')) {
          return res.status(400).json({
            error: 'Invalid date format',
            message: 'Please provide dates in YYYY-MM-DD format.',
          });
        }
      }

      res.status(500).json({
        error: 'Failed to get income events',
        message: 'Failed to retrieve income events. Please try again.',
      });
    }
  } catch (error) {
    console.error('Get income events endpoint error:', error);

    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve income events. Please try again.',
    });
  }
}