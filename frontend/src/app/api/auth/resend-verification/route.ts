import { NextRequest, NextResponse } from 'next/server';
import { UserService } from '@/lib/services/user.service';
import { EmailService } from '@/lib/services/email.service';
import { ValidationService } from '@/lib/services/validation.service';

export interface ResendVerificationRequest {
  email: string;
}

export interface ResendVerificationResponse {
  message: string;
  success: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const body: ResendVerificationRequest = await request.json();

    // Validate input
    const validationErrors = ValidationService.validateResendVerification({
      email: body.email
    });

    if (validationErrors.length > 0) {
      return NextResponse.json(
        {
          message: 'Validation failed',
          success: false,
          errors: validationErrors,
        },
        { status: 400 }
      );
    }

    try {
      // Resend verification email
      const userService = new UserService();
      const verificationToken = await userService.resendVerificationEmail(body.email);

      // Send verification email if user exists and needs verification
      if (verificationToken) {
        try {
          const emailService = new EmailService();
          await emailService.sendVerificationEmail(body.email, verificationToken);
        } catch (emailError) {
          console.error('Failed to send verification email:', emailError);
          // Don't fail the request if email sending fails - continue with success response
        }
      }

      // Always return success message regardless of whether email exists
      // (prevents email enumeration attacks)
      const response: ResendVerificationResponse = {
        message: 'If an account with that email address exists and is not already verified, we have sent you a new verification link.',
        success: true,
      };

      return NextResponse.json(response, { status: 200 });

    } catch (serviceError) {
      console.error('Resend verification service error:', serviceError);

      // Still return success message to prevent email enumeration
      const response: ResendVerificationResponse = {
        message: 'If an account with that email address exists and is not already verified, we have sent you a new verification link.',
        success: true,
      };

      return NextResponse.json(response, { status: 200 });
    }
  } catch (error) {
    console.error('Resend verification endpoint error:', error);

    return NextResponse.json(
      {
        message: 'Failed to resend verification email. Please try again.',
        success: false,
      },
      { status: 500 }
    );
  }
}