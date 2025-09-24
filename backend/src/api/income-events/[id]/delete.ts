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

export interface DeleteIncomeEventResponse {
  message: string;
}

export async function deleteIncomeEvent(req: AuthenticatedRequest, res: Response) {
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
      // Check user permissions (editors and admins can delete income events)
      const user = await FamilyService.getFamilyMemberById(familyId, userId);
      if (!user || (!user.permissions.canEditPayments && user.role !== 'admin')) {
        return res.status(403).json({
          error: 'Insufficient permissions',
          message: 'You do not have permission to delete income events.',
        });
      }

      // Delete income event
      await IncomeService.deleteIncomeEvent(familyId, eventId, userId);

      const response: DeleteIncomeEventResponse = {
        message: 'Income event deleted successfully.',
      };

      res.status(200).json(response);
    } catch (serviceError) {
      console.error('Delete income event error:', serviceError);

      if (serviceError instanceof Error) {
        if (serviceError.message === 'Income event not found') {
          return res.status(404).json({
            error: 'Income event not found',
            message: 'The income event was not found.',
          });
        }

        if (serviceError.message === 'Cannot delete received income event') {
          return res.status(400).json({
            error: 'Cannot delete received event',
            message: 'Cannot delete an income event that has already been marked as received.',
          });
        }

        if (serviceError.message === 'Income event has attributions') {
          return res.status(400).json({
            error: 'Cannot delete attributed event',
            message: 'Cannot delete an income event that has been attributed to budgets or goals.',
          });
        }
      }

      res.status(500).json({
        error: 'Failed to delete income event',
        message: 'Failed to delete income event. Please try again.',
      });
    }
  } catch (error) {
    console.error('Delete income event endpoint error:', error);

    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to delete income event. Please try again.',
    });
  }
}