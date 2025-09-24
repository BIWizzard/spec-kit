import { Request, Response } from 'express';
import { UserService } from '../../services/user.service';
import { ValidationService } from '../../services/validation.service';
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

export async function login(req: Request, res: Response) {
  try {
    const {
      email,
      password,
      totpCode,
      rememberMe = false,
    }: LoginRequest = req.body;

    const userAgent = req.get('User-Agent') || 'Unknown';
    const ipAddress = req.ip || req.connection.remoteAddress || 'Unknown';

    // Validate input
    const validationErrors = ValidationService.validateLogin({
      email,
      password,
      totpCode,
    });

    if (validationErrors.length > 0) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validationErrors,
      });
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
        return res.status(401).json({
          error: 'Invalid credentials',
          message: 'The email or password you entered is incorrect.',
        });
      }

      const { user, session } = authResult;

      // Generate JWT tokens
      const tokenExpiry = rememberMe ? '7d' : '15m';
      const refreshExpiry = rememberMe ? '30d' : '7d';

      const accessToken = jwt.sign(
        {
          userId: user.id,
          familyId: user.familyId,
          email: user.email,
          role: user.role,
          sessionId: session.id,
        },
        process.env.JWT_SECRET!,
        { expiresIn: tokenExpiry }
      );

      const refreshToken = jwt.sign(
        {
          userId: user.id,
          sessionId: session.id,
          type: 'refresh',
        },
        process.env.JWT_REFRESH_SECRET!,
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

      res.status(200).json(response);
    } catch (authError: unknown) {
      const errorMessage = authError instanceof Error ? authError.message : 'Authentication failed';

      if (errorMessage === 'MFA token required') {
        // User has MFA enabled but didn't provide token
        return res.status(200).json({
          message: 'MFA token required',
          mfaRequired: true,
          user: null,
          tokens: null,
        });
      }

      if (errorMessage === 'Invalid MFA token') {
        return res.status(401).json({
          error: 'Invalid MFA token',
          message: 'The verification code you entered is incorrect.',
        });
      }

      if (errorMessage === 'Email not verified') {
        return res.status(401).json({
          error: 'Email not verified',
          message: 'Please verify your email address before logging in.',
        });
      }

      if (errorMessage === 'MFA not properly configured') {
        return res.status(401).json({
          error: 'MFA configuration error',
          message: 'Multi-factor authentication is not properly configured. Please contact support.',
        });
      }

      // For security, don't reveal whether email exists
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'The email or password you entered is incorrect.',
      });
    }
  } catch (error) {
    console.error('Login error:', error);

    res.status(500).json({
      error: 'Internal server error',
      message: 'Login failed. Please try again.',
    });
  }
}