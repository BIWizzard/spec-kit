import { NextRequest, NextResponse } from 'next/server';

// Import services
import { UserService } from '@/lib/services/user.service';
import { EmailService } from '@/lib/services/email.service';

export interface ResendVerificationRequest {
  email: string;
}

export interface ResendVerificationResponse {
  message: string;
  email: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: ResendVerificationRequest = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        {
          error: 'EMAIL_MISSING',
          message: 'Email address is required',
        },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        {
          error: 'EMAIL_INVALID',
          message: 'Please enter a valid email address',
        },
        { status: 400 }
      );
    }

    // Generate new verification token
    const verificationToken = await UserService.generateEmailVerificationToken(email);

    if (!verificationToken) {
      return NextResponse.json(
        {
          error: 'USER_NOT_FOUND',
          message: 'No user found with this email address',
        },
        { status: 404 }
      );
    }

    // Send verification email
    try {
      EmailService.initialize();
      await EmailService.sendVerificationEmail(email, verificationToken);
      console.log(`Resend verification email sent to: ${email} with token: ${verificationToken}`);
    } catch (error) {
      console.error('Failed to send verification email:', error);
      return NextResponse.json(
        {
          error: 'EMAIL_SEND_FAILED',
          message: 'Failed to send verification email. Please try again.',
        },
        { status: 500 }
      );
    }

    const response: ResendVerificationResponse = {
      message: 'Verification email sent successfully',
      email: email,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Resend verification error:', error);

    if (error instanceof Error) {
      if (error.message.includes('already verified')) {
        return NextResponse.json(
          {
            error: 'ALREADY_VERIFIED',
            message: 'Email address is already verified',
          },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to resend verification email. Please try again.',
      },
      { status: 500 }
    );
  }
}