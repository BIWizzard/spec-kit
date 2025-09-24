import { Request, Response } from 'express';
import { UserService } from '../../services/user.service';
import { EmailService } from '../../services/email.service';
import { ValidationService } from '../../services/validation.service';
import jwt from 'jsonwebtoken';

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  familyName: string;
  timezone?: string;
  currency?: string;
  invitationToken?: string;
}

export interface RegisterResponse {
  message: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    emailVerified: boolean;
  };
  family: {
    id: string;
    name: string;
    settings: {
      timezone: string;
      currency: string;
      fiscalYearStart: number;
    };
  };
  tokens: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    tokenType: string;
  };
}

export async function register(req: Request, res: Response) {
  try {
    const {
      email,
      password,
      firstName,
      lastName,
      familyName,
      timezone = 'America/New_York',
      currency = 'USD',
      invitationToken,
    }: RegisterRequest = req.body;

    // Validate input
    const validationErrors = ValidationService.validateRegistration({
      email,
      password,
      firstName,
      lastName,
      familyName,
      timezone,
      currency,
    });

    if (validationErrors.length > 0) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validationErrors,
      });
    }

    // Register user and create family
    const { user, verificationToken } = await UserService.register({
      email,
      password,
      firstName,
      lastName,
      invitationToken,
    });

    // Get user with family data
    const userWithFamily = await UserService.getUserWithFamily(user.id);
    if (!userWithFamily) {
      throw new Error('Failed to retrieve user data after registration');
    }

    // Generate tokens
    const accessToken = jwt.sign(
      {
        userId: user.id,
        familyId: userWithFamily.familyId,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET!,
      { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
      {
        userId: user.id,
        type: 'refresh',
      },
      process.env.JWT_REFRESH_SECRET!,
      { expiresIn: '7d' }
    );

    // Send verification email
    try {
      await EmailService.sendVerificationEmail(user.email, verificationToken);
    } catch (error) {
      console.error('Failed to send verification email:', error);
      // Don't fail registration if email fails
    }

    const response: RegisterResponse = {
      message: 'Registration successful. Please check your email to verify your account.',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        emailVerified: user.emailVerified,
      },
      family: {
        id: userWithFamily.familyId,
        name: userWithFamily.family.name,
        settings: userWithFamily.family.settings as {
          timezone: string;
          currency: string;
          fiscalYearStart: number;
        },
      },
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: 900, // 15 minutes in seconds
        tokenType: 'Bearer',
      },
    };

    res.status(201).json(response);
  } catch (error) {
    console.error('Registration error:', error);

    if (error instanceof Error) {
      if (error.message === 'User already exists with this email') {
        return res.status(409).json({
          error: 'Email already registered',
          message: 'An account with this email address already exists.',
        });
      }

      if (error.message.includes('invitation')) {
        return res.status(400).json({
          error: 'Invalid invitation',
          message: error.message,
        });
      }
    }

    res.status(500).json({
      error: 'Internal server error',
      message: 'Registration failed. Please try again.',
    });
  }
}