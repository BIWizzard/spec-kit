import { NextRequest, NextResponse } from 'next/server';

// Import services
import { UserService } from '@/lib/services/user.service';

export interface VerifyEmailRequest {
  token: string;
}

export interface VerifyEmailResponse {
  message: string;
  email: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    emailVerified: boolean;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: VerifyEmailRequest = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json(
        {
          error: 'TOKEN_MISSING',
          message: 'Verification token is required',
        },
        { status: 400 }
      );
    }

    // Verify the email token
    const result = await UserService.verifyEmail(token);

    if (!result) {
      return NextResponse.json(
        {
          error: 'TOKEN_INVALID',
          message: 'Invalid or expired verification token',
        },
        { status: 400 }
      );
    }

    const response: VerifyEmailResponse = {
      message: 'Email verified successfully',
      email: result.email,
      user: {
        id: result.id,
        email: result.email,
        firstName: result.firstName,
        lastName: result.lastName,
        emailVerified: result.emailVerified,
      },
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Email verification error:', error);

    if (error instanceof Error) {
      if (error.message.includes('expired')) {
        return NextResponse.json(
          {
            error: 'TOKEN_EXPIRED',
            message: 'Verification token has expired',
          },
          { status: 400 }
        );
      }

      if (error.message.includes('already verified')) {
        return NextResponse.json(
          {
            error: 'TOKEN_USED',
            message: 'Email address has already been verified',
          },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Email verification failed. Please try again.',
      },
      { status: 500 }
    );
  }
}