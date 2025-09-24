import { Request, Response } from 'express';
import { UserService } from '../../../services/user.service';
import jwt from 'jsonwebtoken';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    familyId: string;
    email: string;
    role: string;
  };
}

export interface DeleteAllSessionsResponse {
  message: string;
  deletedCount: number;
}

export async function deleteAllSessions(req: AuthenticatedRequest, res: Response) {
  try {
    // Extract user from JWT token
    const authHeader = req.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'No token provided',
        message: 'Authentication token is required.',
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    let userId: string;
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

      if (!decoded || !decoded.userId) {
        return res.status(401).json({
          error: 'Invalid token',
          message: 'The provided token is invalid.',
        });
      }

      userId = decoded.userId;
    } catch (jwtError) {
      return res.status(401).json({
        error: 'Invalid token',
        message: 'The provided token is invalid or expired.',
      });
    }

    try {
      // Get count of current sessions before deletion
      const currentSessions = await UserService.getUserSessions(userId);
      const sessionCount = currentSessions.length;

      // Delete all user sessions
      await UserService.deleteAllSessions(userId);

      const response: DeleteAllSessionsResponse = {
        message: 'All sessions have been terminated successfully. You will need to log in again.',
        deletedCount: sessionCount,
      };

      res.status(200).json(response);
    } catch (serviceError) {
      console.error('Delete all sessions error:', serviceError);

      if (serviceError instanceof Error) {
        if (serviceError.message === 'User not found') {
          return res.status(404).json({
            error: 'User not found',
            message: 'The user account was not found.',
          });
        }
      }

      res.status(500).json({
        error: 'Failed to delete sessions',
        message: 'Failed to delete user sessions. Please try again.',
      });
    }
  } catch (error) {
    console.error('Delete all sessions endpoint error:', error);

    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to delete user sessions. Please try again.',
    });
  }
}