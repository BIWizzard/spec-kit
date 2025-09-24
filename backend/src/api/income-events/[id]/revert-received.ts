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

export interface RevertReceivedResponse {
  message: string;
  incomeEvent: {
    id: string;
    sourceId: string;
    sourceName: string;
    amount: number;
    receivedDate: string;
    status: 'pending' | 'received';
    updatedAt: string;
  };
}

export async function revertIncomeEventReceived(req: AuthenticatedRequest, res: Response) {
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
      // Check user permissions (editors and admins can revert received status)
      const user = await FamilyService.getFamilyMemberById(familyId, userId);
      if (!user || (!user.permissions.canEditPayments && user.role !== 'admin')) {
        return res.status(403).json({
          error: 'Insufficient permissions',
          message: 'You do not have permission to revert income event received status.',
        });
      }

      // Revert income event received status
      const incomeEvent = await IncomeService.revertIncomeEventReceived(familyId, eventId, userId);

      const response: RevertReceivedResponse = {
        message: 'Income event received status reverted successfully.',
        incomeEvent: {
          id: incomeEvent.id,
          sourceId: incomeEvent.sourceId,
          sourceName: incomeEvent.source.name,
          amount: incomeEvent.amount.toNumber(),
          receivedDate: incomeEvent.receivedDate.toISOString().split('T')[0], // Date only
          status: 'pending',
          updatedAt: incomeEvent.updatedAt.toISOString(),
        },
      };

      res.status(200).json(response);
    } catch (serviceError) {
      console.error('Revert income event received error:', serviceError);

      if (serviceError instanceof Error) {
        if (serviceError.message === 'Income event not found') {
          return res.status(404).json({
            error: 'Income event not found',
            message: 'The income event was not found.',
          });
        }

        if (serviceError.message === 'Income event not received') {
          return res.status(400).json({
            error: 'Not received',
            message: 'The income event has not been marked as received.',
          });
        }

        if (serviceError.message === 'Cannot revert received income event with attributions') {
          return res.status(400).json({
            error: 'Cannot revert attributed event',
            message: 'Cannot revert received status of an income event that has been attributed to budgets or goals.',
          });
        }
      }

      res.status(500).json({
        error: 'Failed to revert income event received status',
        message: 'Failed to revert income event received status. Please try again.',
      });
    }
  } catch (error) {
    console.error('Revert income event received endpoint error:', error);

    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to revert income event received status. Please try again.',
    });
  }
}