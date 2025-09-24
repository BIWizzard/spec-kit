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

export interface MfaEnableRequest {
  totpCode: string;
}

export interface MfaEnableResponse {
  message: string;
  backupCodes: string[];
}

export async function enableMfa(req: AuthenticatedRequest, res: Response) {
  try {
    const { totpCode }: MfaEnableRequest = req.body;

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
    const validationErrors = ValidationService.validateTotpCode(totpCode);

    if (validationErrors.length > 0) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validationErrors,
      });
    }

    try {
      // Enable MFA for the user
      await UserService.enableMfa(userId, totpCode);

      // Generate backup codes (these should be stored securely)
      const backupCodes = Array.from({ length: 10 }, () =>
        Math.random().toString(36).substring(2, 10).toUpperCase()
      );

      const response: MfaEnableResponse = {
        message: 'Multi-factor authentication has been enabled successfully.',
        backupCodes,
      };

      res.status(200).json(response);
    } catch (enableError) {
      console.error('MFA enable error:', enableError);

      if (enableError instanceof Error) {
        if (enableError.message === 'User not found') {
          return res.status(404).json({
            error: 'User not found',
            message: 'The user account was not found.',
          });
        }

        if (enableError.message === 'MFA not set up') {
          return res.status(400).json({
            error: 'MFA not configured',
            message: 'Multi-factor authentication must be set up before it can be enabled.',
          });
        }

        if (enableError.message === 'Invalid MFA token') {
          return res.status(400).json({
            error: 'Invalid verification code',
            message: 'The verification code you entered is incorrect.',
          });
        }
      }

      res.status(500).json({
        error: 'MFA enable failed',
        message: 'Failed to enable multi-factor authentication. Please try again.',
      });
    }
  } catch (error) {
    console.error('MFA enable endpoint error:', error);

    res.status(500).json({
      error: 'Internal server error',
      message: 'MFA enable failed. Please try again.',
    });
  }
}