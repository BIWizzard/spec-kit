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

export interface UpcomingIncomeEvent {
  id: string;
  sourceId: string;
  sourceName: string;
  amount: number;
  expectedDate: string;
  description?: string;
  isOverdue: boolean;
  daysUntilDue: number;
}

export interface UpcomingIncomeResponse {
  message: string;
  upcomingEvents: UpcomingIncomeEvent[];
  summary: {
    totalEvents: number;
    totalAmount: number;
    overdueCount: number;
    overdueAmount: number;
    nextWeekCount: number;
    nextWeekAmount: number;
  };
}

export async function getUpcomingIncomeEvents(req: AuthenticatedRequest, res: Response) {
  try {
    // Extract query parameters
    const daysAhead = Math.min(parseInt(req.query.days as string) || 30, 365); // Max 1 year ahead
    const includeOverdue = req.query.includeOverdue === 'true';

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
      // Get upcoming income events
      const upcomingEvents = await IncomeService.getUpcomingIncomeEvents(familyId, {
        daysAhead,
        includeOverdue,
      });

      const today = new Date();
      const nextWeekDate = new Date();
      nextWeekDate.setDate(today.getDate() + 7);

      const eventData: UpcomingIncomeEvent[] = upcomingEvents.map((event) => {
        const expectedDate = new Date(event.receivedDate);
        const timeDiff = expectedDate.getTime() - today.getTime();
        const daysUntilDue = Math.ceil(timeDiff / (1000 * 3600 * 24));
        const isOverdue = daysUntilDue < 0;

        return {
          id: event.id,
          sourceId: event.sourceId,
          sourceName: event.source.name,
          amount: event.amount.toNumber(),
          expectedDate: event.receivedDate.toISOString().split('T')[0], // Date only
          description: event.description || undefined,
          isOverdue,
          daysUntilDue,
        };
      });

      // Calculate summary statistics
      const overdueEvents = eventData.filter(e => e.isOverdue);
      const nextWeekEvents = eventData.filter(e => !e.isOverdue && e.daysUntilDue <= 7);

      const summary = {
        totalEvents: eventData.length,
        totalAmount: eventData.reduce((sum, event) => sum + event.amount, 0),
        overdueCount: overdueEvents.length,
        overdueAmount: overdueEvents.reduce((sum, event) => sum + event.amount, 0),
        nextWeekCount: nextWeekEvents.length,
        nextWeekAmount: nextWeekEvents.reduce((sum, event) => sum + event.amount, 0),
      };

      const response: UpcomingIncomeResponse = {
        message: 'Upcoming income events retrieved successfully.',
        upcomingEvents: eventData,
        summary,
      };

      res.status(200).json(response);
    } catch (serviceError) {
      console.error('Get upcoming income events error:', serviceError);

      if (serviceError instanceof Error) {
        if (serviceError.message === 'Family not found') {
          return res.status(404).json({
            error: 'Family not found',
            message: 'The family was not found.',
          });
        }
      }

      res.status(500).json({
        error: 'Failed to get upcoming income events',
        message: 'Failed to retrieve upcoming income events. Please try again.',
      });
    }
  } catch (error) {
    console.error('Get upcoming income events endpoint error:', error);

    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve upcoming income events. Please try again.',
    });
  }
}