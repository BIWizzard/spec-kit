import { Request, Response } from 'express';
import { IncomeService } from '../../../services/income.service';
import { FamilyService } from '../../../services/family.service';
import jwt from 'jsonwebtoken';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    familyId: string;
    email: string;
    role: string;
  };
}

export interface MarkReceivedRequest {
  actualAmount?: number;
  actualDate?: string;
  notes?: string;
}

export interface MarkReceivedResponse {
  message: string;
  incomeEvent: {
    id: string;
    sourceId: string;
    sourceName: string;
    amount: number;
    receivedDate: string;
    status: 'pending' | 'received';
    actualAmount?: number;
    actualDate?: string;
    notes?: string;
    updatedAt: string;
  };
}

export async function markIncomeEventReceived(req: AuthenticatedRequest, res: Response) {
  try {
    const { actualAmount, actualDate, notes }: MarkReceivedRequest = req.body;
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

    try {
      // Check user permissions (editors and admins can mark events as received)
      const user = await FamilyService.getFamilyMemberById(familyId, userId);
      if (!user || (!user.permissions.canEditPayments && user.role !== 'admin')) {
        return res.status(403).json({
          error: 'Insufficient permissions',
          message: 'You do not have permission to mark income events as received.',
        });
      }

      // Prepare mark received data
      const markReceivedData: any = {
        markedBy: userId,
      };

      if (actualAmount !== undefined) markReceivedData.actualAmount = actualAmount;
      if (actualDate !== undefined) markReceivedData.actualDate = new Date(actualDate);
      if (notes !== undefined) markReceivedData.notes = notes;

      // Mark income event as received
      const incomeEvent = await IncomeService.markIncomeEventReceived(familyId, eventId, markReceivedData);

      const response: MarkReceivedResponse = {
        message: 'Income event marked as received successfully.',
        incomeEvent: {
          id: incomeEvent.id,
          sourceId: incomeEvent.sourceId,
          sourceName: incomeEvent.source.name,
          amount: incomeEvent.amount.toNumber(),
          receivedDate: incomeEvent.receivedDate.toISOString().split('T')[0], // Date only
          status: 'received',
          ...(incomeEvent.actualAmount && { actualAmount: incomeEvent.actualAmount.toNumber() }),
          ...(incomeEvent.actualDate && { actualDate: incomeEvent.actualDate.toISOString().split('T')[0] }),
          ...(incomeEvent.notes && { notes: incomeEvent.notes }),
          updatedAt: incomeEvent.updatedAt.toISOString(),
        },
      };

      res.status(200).json(response);
    } catch (serviceError) {
      console.error('Mark income event received error:', serviceError);

      if (serviceError instanceof Error) {
        if (serviceError.message === 'Income event not found') {
          return res.status(404).json({
            error: 'Income event not found',
            message: 'The income event was not found.',
          });
        }

        if (serviceError.message === 'Income event already received') {
          return res.status(400).json({
            error: 'Already received',
            message: 'The income event has already been marked as received.',
          });
        }

        if (serviceError.message.includes('Invalid date')) {
          return res.status(400).json({
            error: 'Invalid date',
            message: 'Please provide a valid date in YYYY-MM-DD format.',
          });
        }
      }

      res.status(500).json({
        error: 'Failed to mark income event as received',
        message: 'Failed to mark income event as received. Please try again.',
      });
    }
  } catch (error) {
    console.error('Mark income event received endpoint error:', error);

    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to mark income event as received. Please try again.',
    });
  }
}