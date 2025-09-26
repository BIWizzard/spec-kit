import { NextRequest, NextResponse } from 'next/server';
import { UserService } from '@/lib/services/user.service';
import { EmailService } from '@/lib/services/email.service';
import { ValidationService } from '@/lib/services/validation.service';

export interface ForgotPasswordRequest {
  email: string;
}

export interface ForgotPasswordResponse {
  message: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email }: ForgotPasswordRequest = body;

    // Validate input
    const validationErrors = ValidationService.validateForgotPassword({ email });

    if (validationErrors.length > 0) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationErrors,
        },
        { status: 400 }
      );
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

      return NextResponse.json(response, { status: 200 });
    } catch (serviceError) {
      console.error('Forgot password service error:', serviceError);

      // Still return success message to prevent email enumeration
      const response: ForgotPasswordResponse = {
        message: 'If an account with that email address exists, we have sent you a password reset link.',
      };

      return NextResponse.json(response, { status: 200 });
    }
  } catch (error) {
    console.error('Forgot password endpoint error:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Password reset request failed. Please try again.',
      },
      { status: 500 }
    );
  }
}