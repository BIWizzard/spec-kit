import { Request, Response } from 'express';
import { UserService } from '../../services/user.service';
import { EmailService } from '../../services/email.service';
import { ValidationService } from '../../services/validation.service';

export interface ForgotPasswordRequest {
  email: string;
}

export interface ForgotPasswordResponse {
  message: string;
}

export async function forgotPassword(req: Request, res: Response) {
  try {
    const { email }: ForgotPasswordRequest = req.body;

    // Validate input
    const validationErrors = ValidationService.validateForgotPassword({ email });

    if (validationErrors.length > 0) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validationErrors,
      });
    }

    try {
      // Generate reset token (this will return a token even if user doesn't exist for security)
      const resetToken = await UserService.forgotPassword(email);

      // Send password reset email if user exists
      // The service returns a token regardless of whether user exists to prevent email enumeration
      try {
        await EmailService.sendPasswordResetEmail(email, resetToken);
      } catch (emailError) {
        console.error('Failed to send password reset email:', emailError);
        // Don't fail the request if email sending fails
      }

      // Always return success message regardless of whether email exists
      // This prevents email enumeration attacks
      const response: ForgotPasswordResponse = {
        message: 'If an account with that email address exists, we have sent you a password reset link.',
      };

      res.status(200).json(response);
    } catch (serviceError) {
      console.error('Forgot password service error:', serviceError);

      // Still return success message to prevent email enumeration
      const response: ForgotPasswordResponse = {
        message: 'If an account with that email address exists, we have sent you a password reset link.',
      };

      res.status(200).json(response);
    }
  } catch (error) {
    console.error('Forgot password endpoint error:', error);

    res.status(500).json({
      error: 'Internal server error',
      message: 'Password reset request failed. Please try again.',
    });
  }
}