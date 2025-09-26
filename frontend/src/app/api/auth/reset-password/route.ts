import { NextRequest, NextResponse } from 'next/server';
import { UserService } from '@/lib/services/user.service';
import { ValidationService } from '@/lib/services/validation.service';

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

export interface ResetPasswordResponse {
  message: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: ResetPasswordRequest = await request.json();
    const { token, newPassword } = body;

    // Validate input
    const validationErrors = ValidationService.validateResetPassword({
      token,
      newPassword,
    });

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
      // Reset password using the token
      await UserService.resetPassword(token, newPassword);

      const response: ResetPasswordResponse = {
        message: 'Your password has been reset successfully. You can now log in with your new password.',
      };

      return NextResponse.json(response, { status: 200 });
    } catch (resetError) {
      console.error('Password reset error:', resetError);

      if (resetError instanceof Error) {
        if (resetError.message === 'Invalid or expired reset token') {
          return NextResponse.json(
            {
              error: 'Invalid or expired token',
              message: 'The password reset token is invalid or has expired. Please request a new one.',
            },
            { status: 400 }
          );
        }

        if (resetError.message === 'User not found') {
          return NextResponse.json(
            {
              error: 'Invalid or expired token',
              message: 'The password reset token is invalid or has expired. Please request a new one.',
            },
            { status: 400 }
          );
        }
      }

      return NextResponse.json(
        {
          error: 'Password reset failed',
          message: 'Failed to reset password. Please try again or request a new reset link.',
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Reset password endpoint error:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Password reset failed. Please try again.',
      },
      { status: 500 }
    );
  }
}