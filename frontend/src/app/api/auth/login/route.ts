import { NextRequest, NextResponse } from 'next/server';
import { UserService } from '@/lib/services/user.service';
import { ValidationService } from '@/lib/services/validation.service';
import jwt from 'jsonwebtoken';

export interface LoginRequest {
  email: string;
  password: string;
  totpCode?: string;
  rememberMe?: boolean;
}

export interface LoginResponse {
  message: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    emailVerified: boolean;
    mfaEnabled: boolean;
  };
  tokens: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    tokenType: string;
  };
  mfaRequired?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const {
      email,
      password,
      totpCode,
      rememberMe = false,
    }: LoginRequest = await request.json();

    const userAgent = request.headers.get('User-Agent') || 'Unknown';
    const ipAddress = request.headers.get('x-forwarded-for') ||
                     request.headers.get('x-real-ip') ||
                     'Unknown';

    // Validate input
    const validationErrors = ValidationService.validateLogin({
      email,
      password,
      totpCode,
    });

    if (validationErrors.length > 0) {
      return NextResponse.json({
        error: 'Validation failed',
        details: validationErrors,
      }, { status: 400 });
    }

    try {
      // Attempt authentication
      const authResult = await UserService.authenticate(
        {
          email,
          password,
          mfaToken: totpCode,
        },
        userAgent,
        ipAddress
      );

      if (!authResult) {
        return NextResponse.json({
          error: 'Invalid credentials',
          message: 'The email or password you entered is incorrect.',
        }, { status: 401 });
      }

      const { user, session } = authResult;

      // Generate JWT tokens
      const tokenExpiry = rememberMe ? '7d' : '15m';
      const refreshExpiry = rememberMe ? '30d' : '7d';

      const jwtSecret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET;
      const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || process.env.NEXTAUTH_SECRET;

      if (!jwtSecret || !jwtRefreshSecret) {
        throw new Error('JWT secrets not configured');
      }

      const accessToken = jwt.sign(
        {
          userId: user.id,
          familyId: user.familyId,
          email: user.email,
          role: user.role,
          sessionId: session.id,
        },
        jwtSecret,
        { expiresIn: tokenExpiry }
      );

      const refreshToken = jwt.sign(
        {
          userId: user.id,
          sessionId: session.id,
          type: 'refresh',
        },
        jwtRefreshSecret,
        { expiresIn: refreshExpiry }
      );

      const response: LoginResponse = {
        message: 'Login successful',
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          emailVerified: user.emailVerified,
          mfaEnabled: user.mfaEnabled,
        },
        tokens: {
          accessToken,
          refreshToken,
          expiresIn: rememberMe ? 604800 : 900, // 7 days or 15 minutes in seconds
          tokenType: 'Bearer',
        },
      };

      return NextResponse.json(response, { status: 200 });
    } catch (authError: unknown) {
      const errorMessage = authError instanceof Error ? authError.message : 'Authentication failed';

      if (errorMessage === 'MFA token required') {
        // User has MFA enabled but didn't provide token
        return NextResponse.json({
          message: 'MFA token required',
          mfaRequired: true,
          user: null,
          tokens: null,
        }, { status: 200 });
      }

      if (errorMessage === 'Invalid MFA token') {
        return NextResponse.json({
          error: 'Invalid MFA token',
          message: 'The verification code you entered is incorrect.',
        }, { status: 401 });
      }

      if (errorMessage === 'Email not verified') {
        return NextResponse.json({
          error: 'Email not verified',
          message: 'Please verify your email address before logging in.',
        }, { status: 401 });
      }

      if (errorMessage === 'MFA not properly configured') {
        return NextResponse.json({
          error: 'MFA configuration error',
          message: 'Multi-factor authentication is not properly configured. Please contact support.',
        }, { status: 401 });
      }

      // For security, don't reveal whether email exists
      return NextResponse.json({
        error: 'Invalid credentials',
        message: 'The email or password you entered is incorrect.',
      }, { status: 401 });
    }
  } catch (error) {
    console.error('Login error:', error);

    return NextResponse.json({
      error: 'Internal server error',
      message: 'Login failed. Please try again.',
    }, { status: 500 });
  }
}