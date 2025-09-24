import { Request, Response } from 'express';
import { UserService } from '../../services/user.service';
import { ValidationService } from '../../services/validation.service';

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

export interface ResetPasswordResponse {
  message: string;
}

export async function resetPassword(req: Request, res: Response) {
  try {
    const { token, newPassword }: ResetPasswordRequest = req.body;

    // Validate input
    const validationErrors = ValidationService.validateResetPassword({
      token,
      newPassword,
    });

    if (validationErrors.length > 0) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validationErrors,
      });
    }

    try {
      // Reset password using the token
      await UserService.resetPassword(token, newPassword);

      const response: ResetPasswordResponse = {
        message: 'Your password has been reset successfully. You can now log in with your new password.',
      };

      res.status(200).json(response);
    } catch (resetError) {
      console.error('Password reset error:', resetError);

      if (resetError instanceof Error) {
        if (resetError.message === 'Invalid or expired reset token') {
          return res.status(400).json({
            error: 'Invalid or expired token',
            message: 'The password reset token is invalid or has expired. Please request a new one.',
          });
        }

        if (resetError.message === 'User not found') {
          return res.status(400).json({
            error: 'Invalid or expired token',
            message: 'The password reset token is invalid or has expired. Please request a new one.',
          });
        }
      }

      res.status(500).json({
        error: 'Password reset failed',
        message: 'Failed to reset password. Please try again or request a new reset link.',
      });
    }
  } catch (error) {
    console.error('Reset password endpoint error:', error);

    res.status(500).json({
      error: 'Internal server error',
      message: 'Password reset failed. Please try again.',
    });
  }
}