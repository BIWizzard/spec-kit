import { NextRequest, NextResponse } from 'next/server';
import { UserService } from '@/lib/services/user.service';
import { ValidationService } from '@/lib/services/validation.service';
import jwt from 'jsonwebtoken';

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface ChangePasswordResponse {
  message: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: ChangePasswordRequest = await request.json();
    const { currentPassword, newPassword } = body;

    // Extract user from JWT token
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({
        error: 'No token provided',
        message: 'Authentication token is required.',
      }, { status: 401 });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    let userId: string;
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

      if (!decoded || !decoded.userId) {
        return NextResponse.json({
          error: 'Invalid token',
          message: 'The provided token is invalid.',
        }, { status: 401 });
      }

      userId = decoded.userId;
    } catch (jwtError) {
      return NextResponse.json({
        error: 'Invalid token',
        message: 'The provided token is invalid or expired.',
      }, { status: 401 });
    }

    // Validate input
    const validationErrors = ValidationService.validateChangePassword({
      currentPassword,
      newPassword,
    });

    if (validationErrors.length > 0) {
      return NextResponse.json({
        error: 'Validation failed',
        details: validationErrors,
      }, { status: 400 });
    }

    try {
      // Change password using UserService
      await UserService.changePassword(userId, {
        currentPassword,
        newPassword,
      });

      const response: ChangePasswordResponse = {
        message: 'Your password has been changed successfully. All other sessions have been terminated.',
      };

      return NextResponse.json(response, { status: 200 });
    } catch (changeError) {
      console.error('Change password error:', changeError);

      if (changeError instanceof Error) {
        if (changeError.message === 'User not found') {
          return NextResponse.json({
            error: 'User not found',
            message: 'The user account was not found.',
          }, { status: 404 });
        }

        if (changeError.message === 'Current password is incorrect') {
          return NextResponse.json({
            error: 'Invalid current password',
            message: 'The current password you entered is incorrect.',
          }, { status: 400 });
        }
      }

      return NextResponse.json({
        error: 'Password change failed',
        message: 'Failed to change password. Please try again.',
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Change password endpoint error:', error);

    return NextResponse.json({
      error: 'Internal server error',
      message: 'Password change failed. Please try again.',
    }, { status: 500 });
  }
}