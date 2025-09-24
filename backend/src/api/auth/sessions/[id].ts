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

export interface DeleteSessionRequest extends AuthenticatedRequest {
  params: {
    id: string;
  };
}

export interface DeleteSessionResponse {
  message: string;
}

export async function deleteSession(req: DeleteSessionRequest, res: Response) {
  try {
    const sessionId = req.params.id;

    if (!sessionId) {
      return res.status(400).json({
        error: 'Missing session ID',
        message: 'Session ID is required in the URL path.',
      });
    }

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
      // Delete specific session
      await UserService.deleteSession(sessionId, userId);

      const response: DeleteSessionResponse = {
        message: 'Session terminated successfully.',
      };

      res.status(200).json(response);
    } catch (serviceError) {
      console.error('Delete session error:', serviceError);

      if (serviceError instanceof Error) {
        if (serviceError.message === 'Session not found') {
          return res.status(404).json({
            error: 'Session not found',
            message: 'The specified session was not found or does not belong to you.',
          });
        }

        if (serviceError.message === 'User not found') {
          return res.status(404).json({
            error: 'User not found',
            message: 'The user account was not found.',
          });
        }
      }

      res.status(500).json({
        error: 'Failed to delete session',
        message: 'Failed to delete the session. Please try again.',
      });
    }
  } catch (error) {
    console.error('Delete session endpoint error:', error);

    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to delete the session. Please try again.',
    });
  }
}