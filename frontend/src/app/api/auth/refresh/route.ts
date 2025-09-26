import { NextRequest, NextResponse } from 'next/server';
import { UserService } from '../../../../lib/services/user.service';
import { ValidationService } from '../../../../lib/services/validation.service';
import jwt from 'jsonwebtoken';

export interface RefreshRequest {
  refreshToken: string;
}

export interface TokenResponse {
  tokens: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    tokenType: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: RefreshRequest = await request.json();
    const { refreshToken } = body;

    // Validate input
    if (!refreshToken) {
      return NextResponse.json(
        {
          error: 'Missing refresh token',
          message: 'Refresh token is required.',
        },
        { status: 400 }
      );
    }

    const validationErrors = ValidationService.validateRefreshToken(refreshToken);

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
      // Verify the refresh token
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!) as any;

      if (!decoded || decoded.type !== 'refresh' || !decoded.userId || !decoded.sessionId) {
        return NextResponse.json(
          {
            error: 'Invalid refresh token',
            message: 'The refresh token is invalid or malformed.',
          },
          { status: 401 }
        );
      }

      // Check if session still exists and is valid
      const session = await UserService.getSessionById(decoded.sessionId);
      if (!session || session.expiresAt < new Date()) {
        return NextResponse.json(
          {
            error: 'Session expired',
            message: 'Your session has expired. Please log in again.',
          },
          { status: 401 }
        );
      }

      // Get user data to include in new token
      const user = await UserService.getUserWithFamily(decoded.userId);
      if (!user || user.deletedAt) {
        return NextResponse.json(
          {
            error: 'User not found',
            message: 'The user associated with this token no longer exists.',
          },
          { status: 401 }
        );
      }

      // Update session expiry
      await UserService.extendSession(session.id);

      // Generate new tokens
      const newAccessToken = jwt.sign(
        {
          userId: user.id,
          familyId: user.familyId,
          email: user.email,
          role: user.role,
          sessionId: session.id,
        },
        process.env.JWT_SECRET!,
        { expiresIn: '15m' }
      );

      const newRefreshToken = jwt.sign(
        {
          userId: user.id,
          sessionId: session.id,
          type: 'refresh',
        },
        process.env.JWT_REFRESH_SECRET!,
        { expiresIn: '7d' }
      );

      const response: TokenResponse = {
        tokens: {
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
          expiresIn: 900, // 15 minutes in seconds
          tokenType: 'Bearer',
        },
      };

      return NextResponse.json(response, { status: 200 });
    } catch (jwtError) {
      if (jwtError instanceof jwt.TokenExpiredError) {
        return NextResponse.json(
          {
            error: 'Refresh token expired',
            message: 'Your refresh token has expired. Please log in again.',
          },
          { status: 401 }
        );
      }

      if (jwtError instanceof jwt.JsonWebTokenError) {
        return NextResponse.json(
          {
            error: 'Invalid refresh token',
            message: 'The refresh token is invalid.',
          },
          { status: 401 }
        );
      }

      throw jwtError; // Re-throw unexpected errors
    }
  } catch (error) {
    console.error('Token refresh error:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Token refresh failed. Please try again.',
      },
      { status: 500 }
    );
  }
}