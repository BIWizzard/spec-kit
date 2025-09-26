import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

// Import services from backend - we'll need to copy or create these
// For now, let's create placeholder imports that we'll implement
import { UserService } from '@/lib/services/user.service';
import { EmailService } from '@/lib/services/email.service';
import { ValidationService } from '@/lib/services/validation.service';

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

export async function POST(request: NextRequest) {
  try {
    const body: RegisterRequest = await request.json();

    const {
      email,
      password,
      firstName,
      lastName,
      familyName,
      timezone = 'America/New_York',
      currency = 'USD',
      invitationToken,
    } = body;

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
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationErrors,
        },
        { status: 400 }
      );
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
    const jwtSecret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'dev-jwt-secret-change-this-in-production-make-it-really-long';
    const refreshSecret = process.env.JWT_REFRESH_SECRET || process.env.NEXTAUTH_SECRET || 'dev-jwt-secret-change-this-in-production-make-it-really-long';

    const accessToken = jwt.sign(
      {
        userId: user.id,
        familyId: userWithFamily.familyId,
        email: user.email,
        role: user.role,
      },
      jwtSecret,
      { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
      {
        userId: user.id,
        type: 'refresh',
      },
      refreshSecret,
      { expiresIn: '7d' }
    );

    // Send verification email
    try {
      EmailService.initialize();
      await EmailService.sendVerificationEmail(user.email, verificationToken);
      console.log(`Verification email sent to: ${user.email} with token: ${verificationToken}`);
    } catch (error) {
      console.error('Failed to send verification email:', error);
      // Don't fail registration if email fails - user can resend later
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

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Registration error:', error);

    if (error instanceof Error) {
      if (error.message === 'User already exists with this email') {
        return NextResponse.json(
          {
            error: 'Email already registered',
            message: 'An account with this email address already exists.',
          },
          { status: 409 }
        );
      }

      if (error.message.includes('invitation')) {
        return NextResponse.json(
          {
            error: 'Invalid invitation',
            message: error.message,
          },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Registration failed. Please try again.',
      },
      { status: 500 }
    );
  }
}