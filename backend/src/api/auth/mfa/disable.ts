import { Request, Response } from 'express';
import { UserService } from '../../../services/user.service';
import { ValidationService } from '../../../services/validation.service';
import jwt from 'jsonwebtoken';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    familyId: string;
    email: string;
    role: string;
  };
}

export interface MfaDisableRequest {
  password: string;
  totpCode?: string;
}

export interface MfaDisableResponse {
  message: string;
}

export async function disableMfa(req: AuthenticatedRequest, res: Response) {
  try {
    const { password, totpCode }: MfaDisableRequest = req.body;

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

    // Validate input
    const validationErrors = ValidationService.validateMfaDisable({ password, totpCode });

    if (validationErrors.length > 0) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validationErrors,
      });
    }

    try {
      // Disable MFA for the user
      await UserService.disableMfa(userId, password);

      const response: MfaDisableResponse = {
        message: 'Multi-factor authentication has been disabled successfully.',
      };

      res.status(200).json(response);
    } catch (disableError) {
      console.error('MFA disable error:', disableError);

      if (disableError instanceof Error) {
        if (disableError.message === 'User not found') {
          return res.status(404).json({
            error: 'User not found',
            message: 'The user account was not found.',
          });
        }

        if (disableError.message === 'Invalid password') {
          return res.status(400).json({
            error: 'Invalid password',
            message: 'The password you entered is incorrect.',
          });
        }
      }

      res.status(500).json({
        error: 'MFA disable failed',
        message: 'Failed to disable multi-factor authentication. Please try again.',
      });
    }
  } catch (error) {
    console.error('MFA disable endpoint error:', error);

    res.status(500).json({
      error: 'Internal server error',
      message: 'MFA disable failed. Please try again.',
    });
  }
}