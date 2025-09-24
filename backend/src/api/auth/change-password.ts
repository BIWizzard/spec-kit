import { Request, Response } from 'express';
import { UserService } from '../../services/user.service';
import { ValidationService } from '../../services/validation.service';
import jwt from 'jsonwebtoken';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    familyId: string;
    email: string;
    role: string;
  };
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface ChangePasswordResponse {
  message: string;
}

export async function changePassword(req: AuthenticatedRequest, res: Response) {
  try {
    const { currentPassword, newPassword }: ChangePasswordRequest = req.body;

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
    const validationErrors = ValidationService.validateChangePassword({
      currentPassword,
      newPassword,
    });

    if (validationErrors.length > 0) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validationErrors,
      });
    }

    try {
      // Change password using UserService
      await UserService.changePassword(userId, {
        currentPassword,
        newPassword,
      });

      const response: ChangePasswordResponse = {
        message: 'Your password has been changed successfully. All other sessions have been terminated.',
      };

      res.status(200).json(response);
    } catch (changeError) {
      console.error('Change password error:', changeError);

      if (changeError instanceof Error) {
        if (changeError.message === 'User not found') {
          return res.status(404).json({
            error: 'User not found',
            message: 'The user account was not found.',
          });
        }

        if (changeError.message === 'Current password is incorrect') {
          return res.status(400).json({
            error: 'Invalid current password',
            message: 'The current password you entered is incorrect.',
          });
        }
      }

      res.status(500).json({
        error: 'Password change failed',
        message: 'Failed to change password. Please try again.',
      });
    }
  } catch (error) {
    console.error('Change password endpoint error:', error);

    res.status(500).json({
      error: 'Internal server error',
      message: 'Password change failed. Please try again.',
    });
  }
}