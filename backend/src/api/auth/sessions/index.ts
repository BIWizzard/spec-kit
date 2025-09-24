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

export interface SessionInfo {
  id: string;
  ipAddress: string;
  userAgent: string;
  isCurrent: boolean;
  createdAt: string;
  expiresAt: string;
}

export interface SessionsListResponse {
  sessions: SessionInfo[];
}

export async function getSessions(req: AuthenticatedRequest, res: Response) {
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
    let currentSessionId: string | undefined;
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

      if (!decoded || !decoded.userId) {
        return res.status(401).json({
          error: 'Invalid token',
          message: 'The provided token is invalid.',
        });
      }

      userId = decoded.userId;
      currentSessionId = decoded.sessionId;
    } catch (jwtError) {
      return res.status(401).json({
        error: 'Invalid token',
        message: 'The provided token is invalid or expired.',
      });
    }

    try {
      // Get all user sessions
      const sessions = await UserService.getUserSessions(userId);

      const sessionInfos: SessionInfo[] = sessions.map(session => ({
        id: session.id,
        ipAddress: session.ipAddress,
        userAgent: session.userAgent,
        isCurrent: session.id === currentSessionId,
        createdAt: session.createdAt.toISOString(),
        expiresAt: session.expiresAt.toISOString(),
      }));

      const response: SessionsListResponse = {
        sessions: sessionInfos,
      };

      res.status(200).json(response);
    } catch (serviceError) {
      console.error('Get sessions error:', serviceError);

      if (serviceError instanceof Error) {
        if (serviceError.message === 'User not found') {
          return res.status(404).json({
            error: 'User not found',
            message: 'The user account was not found.',
          });
        }
      }

      res.status(500).json({
        error: 'Failed to get sessions',
        message: 'Failed to retrieve user sessions. Please try again.',
      });
    }
  } catch (error) {
    console.error('Get sessions endpoint error:', error);

    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve user sessions. Please try again.',
    });
  }
}