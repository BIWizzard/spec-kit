import { Request, Response } from 'express';
import { UserService } from '../../services/user.service';
import jwt from 'jsonwebtoken';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    familyId: string;
    email: string;
    role: string;
    sessionId: string;
  };
}

export interface LogoutResponse {
  message: string;
}

export async function logout(req: AuthenticatedRequest, res: Response) {
  try {
    // Extract token from Authorization header
    const authHeader = req.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'No token provided',
        message: 'Authentication token is required.',
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    try {
      // Verify and decode the JWT token to get session information
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

      if (!decoded || !decoded.sessionId) {
        return res.status(401).json({
          error: 'Invalid token',
          message: 'The provided token is invalid.',
        });
      }

      // Get session token from database to invalidate
      const session = await UserService.getSessionById(decoded.sessionId);
      if (session) {
        await UserService.logout(session.token);
      }

      const response: LogoutResponse = {
        message: 'Logout successful',
      };

      res.status(200).json(response);
    } catch (jwtError) {
      // Token might be expired or invalid, but we still want to attempt logout
      // Try to extract session info from the token without verification
      try {
        const decoded = jwt.decode(token) as any;
        if (decoded && decoded.sessionId) {
          const session = await UserService.getSessionById(decoded.sessionId);
          if (session) {
            await UserService.logout(session.token);
          }
        }
      } catch (decodeError) {
        // If we can't decode, just return success anyway
        console.warn('Could not decode token for logout:', decodeError);
      }

      const response: LogoutResponse = {
        message: 'Logout successful',
      };

      res.status(200).json(response);
    }
  } catch (error) {
    console.error('Logout error:', error);

    // Even if there's an error, we should still return success for logout
    // This prevents client-side issues with invalid tokens
    const response: LogoutResponse = {
      message: 'Logout successful',
    };

    res.status(200).json(response);
  }
}