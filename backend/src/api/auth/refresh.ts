import { Request, Response } from 'express';
import { UserService } from '../../services/user.service';
import { ValidationService } from '../../services/validation.service';
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

export async function refresh(req: Request, res: Response) {
  try {
    const { refreshToken }: RefreshRequest = req.body;

    // Validate input
    if (!refreshToken) {
      return res.status(400).json({
        error: 'Missing refresh token',
        message: 'Refresh token is required.',
      });
    }

    const validationErrors = ValidationService.validateRefreshToken(refreshToken);

    if (validationErrors.length > 0) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validationErrors,
      });
    }

    try {
      // Verify the refresh token
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!) as any;

      if (!decoded || decoded.type !== 'refresh' || !decoded.userId || !decoded.sessionId) {
        return res.status(401).json({
          error: 'Invalid refresh token',
          message: 'The refresh token is invalid or malformed.',
        });
      }

      // Check if session still exists and is valid
      const session = await UserService.getSessionById(decoded.sessionId);
      if (!session || session.expiresAt < new Date()) {
        return res.status(401).json({
          error: 'Session expired',
          message: 'Your session has expired. Please log in again.',
        });
      }

      // Get user data to include in new token
      const user = await UserService.getUserWithFamily(decoded.userId);
      if (!user || user.deletedAt) {
        return res.status(401).json({
          error: 'User not found',
          message: 'The user associated with this token no longer exists.',
        });
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

      res.status(200).json(response);
    } catch (jwtError) {
      if (jwtError instanceof jwt.TokenExpiredError) {
        return res.status(401).json({
          error: 'Refresh token expired',
          message: 'Your refresh token has expired. Please log in again.',
        });
      }

      if (jwtError instanceof jwt.JsonWebTokenError) {
        return res.status(401).json({
          error: 'Invalid refresh token',
          message: 'The refresh token is invalid.',
        });
      }

      throw jwtError; // Re-throw unexpected errors
    }
  } catch (error) {
    console.error('Token refresh error:', error);

    res.status(500).json({
      error: 'Internal server error',
      message: 'Token refresh failed. Please try again.',
    });
  }
}