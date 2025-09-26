import { NextRequest, NextResponse } from 'next/server';
import { UserService } from '@/lib/services/user.service';
import { ValidationService } from '@/lib/services/validation.service';

export interface VerifyEmailRequest {
  token: string;
  userId?: string;
}

export interface VerifyEmailResponse {
  message: string;
  success: boolean;
  user?: {
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

    // Validate input
    const validationErrors = ValidationService.validateEmailVerification({
      token: body.token,
      userId: body.userId,
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
      // Verify email with token
      const userService = new UserService();
      const result = await userService.verifyEmailToken(body.token, body.userId);

      if (result.success && result.user) {
        return NextResponse.json(
          {
            message: 'Email verified successfully',
            success: true,
            user: {
              id: result.user.id,
              email: result.user.email,
              firstName: result.user.firstName,
              lastName: result.user.lastName,
              emailVerified: result.user.emailVerified,
            },
          },
          { status: 200 }
        );
      } else {
        // Handle specific error cases
        const status = result.error?.includes('expired') ? 410 :
                     result.error?.includes('invalid') || result.error?.includes('used') ? 400 : 500;

        return NextResponse.json(
          {
            message: result.error || 'Email verification failed',
            success: false,
            code: result.error?.includes('expired') ? 'TOKEN_EXPIRED' :
                  result.error?.includes('invalid') ? 'TOKEN_INVALID' :
                  result.error?.includes('used') ? 'TOKEN_USED' : 'VERIFICATION_FAILED'
          },
          { status }
        );
      }
    } catch (serviceError) {
      console.error('Email verification service error:', serviceError);

      return NextResponse.json(
        {
          message: 'Email verification failed',
          success: false,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Verify email endpoint error:', error);

    return NextResponse.json(
      {
        message: 'Internal server error',
        success: false,
      },
      { status: 500 }
    );
  }
}