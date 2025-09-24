import { Request, Response } from 'express';
import { UserService } from '../../services/user.service';
import { EmailService } from '../../services/email.service';
import { ValidationService } from '../../services/validation.service';

export interface ResendVerificationRequest {
  email: string;
}

export interface ResendVerificationResponse {
  message: string;
}

export async function resendVerification(req: Request, res: Response) {
  try {
    const { email }: ResendVerificationRequest = req.body;

    // Validate input
    const validationErrors = ValidationService.validateResendVerification({ email });

    if (validationErrors.length > 0) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validationErrors,
      });
    }

    try {
      // Resend verification email
      const verificationToken = await UserService.resendVerificationEmail(email);

      // Send verification email
      try {
        await EmailService.sendVerificationEmail(email, verificationToken);
      } catch (emailError) {
        console.error('Failed to send verification email:', emailError);
        // Don't fail the request if email sending fails
      }

      // Always return success message regardless of whether email exists (prevents enumeration)
      const response: ResendVerificationResponse = {
        message: 'If an account with that email address exists and is not already verified, we have sent you a new verification link.',
      };

      res.status(200).json(response);
    } catch (serviceError) {
      console.error('Resend verification service error:', serviceError);

      // Still return success message to prevent email enumeration
      const response: ResendVerificationResponse = {
        message: 'If an account with that email address exists and is not already verified, we have sent you a new verification link.',
      };

      res.status(200).json(response);
    }
  } catch (error) {
    console.error('Resend verification endpoint error:', error);

    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to resend verification email. Please try again.',
    });
  }
}