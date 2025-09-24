import { Request, Response } from 'express';
import { UserService } from '../../services/user.service';
import { ValidationService } from '../../services/validation.service';

export interface VerifyEmailRequest {
  token: string;
  userId?: string;
}

export interface VerifyEmailResponse {
  message: string;
}

export async function verifyEmail(req: Request, res: Response) {
  try {
    const { token, userId }: VerifyEmailRequest = req.body;

    // Validate input
    const validationErrors = ValidationService.validateEmailVerification({
      token,
      userId,
    });

    if (validationErrors.length > 0) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validationErrors,
      });
    }

    try {
      // Verify email using the token
      // For simplicity, we're passing userId if provided, otherwise we'll derive from token
      await UserService.verifyEmail(userId || 'token-derived', token);

      const response: VerifyEmailResponse = {
        message: 'Your email address has been verified successfully. You can now access all features.',
      };

      res.status(200).json(response);
    } catch (verifyError) {
      console.error('Email verification error:', verifyError);

      if (verifyError instanceof Error) {
        if (verifyError.message === 'User not found') {
          return res.status(400).json({
            error: 'Invalid verification token',
            message: 'The verification token is invalid or has expired.',
          });
        }

        if (verifyError.message === 'Invalid verification token') {
          return res.status(400).json({
            error: 'Invalid verification token',
            message: 'The verification token is invalid or has expired.',
          });
        }
      }

      res.status(500).json({
        error: 'Email verification failed',
        message: 'Failed to verify email address. Please try again or request a new verification email.',
      });
    }
  } catch (error) {
    console.error('Verify email endpoint error:', error);

    res.status(500).json({
      error: 'Internal server error',
      message: 'Email verification failed. Please try again.',
    });
  }
}