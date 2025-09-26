import { NextRequest, NextResponse } from 'next/server';
import { UserService } from '@/lib/services/user.service';
import jwt from 'jsonwebtoken';

export interface UserProfileResponse {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    emailVerified: boolean;
    mfaEnabled: boolean;
    lastLoginAt: string | null;
    createdAt: string;
    permissions: {
      canManageBankAccounts: boolean;
      canEditPayments: boolean;
      canViewReports: boolean;
      canManageFamily: boolean;
    };
  };
  family: {
    id: string;
    name: string;
    settings: {
      timezone: string;
      currency: string;
      fiscalYearStart: number;
    };
    subscriptionStatus: string;
  };
}

export async function GET(request: NextRequest) {
  try {
    // Extract user from JWT token
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        {
          error: 'No token provided',
          message: 'Authentication token is required.',
        },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    let userId: string;
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

      if (!decoded || !decoded.userId) {
        return NextResponse.json(
          {
            error: 'Invalid token',
            message: 'The provided token is invalid.',
          },
          { status: 401 }
        );
      }

      userId = decoded.userId;
    } catch (jwtError) {
      return NextResponse.json(
        {
          error: 'Invalid token',
          message: 'The provided token is invalid or expired.',
        },
        { status: 401 }
      );
    }

    try {
      // Get user with family data
      const userWithFamily = await UserService.getUserWithFamily(userId);

      if (!userWithFamily) {
        return NextResponse.json(
          {
            error: 'User not found',
            message: 'The user account was not found.',
          },
          { status: 404 }
        );
      }

      const response: UserProfileResponse = {
        user: {
          id: userWithFamily.id,
          email: userWithFamily.email,
          firstName: userWithFamily.firstName,
          lastName: userWithFamily.lastName,
          role: userWithFamily.role,
          emailVerified: userWithFamily.emailVerified,
          mfaEnabled: userWithFamily.mfaEnabled,
          lastLoginAt: userWithFamily.lastLoginAt?.toISOString() || null,
          createdAt: userWithFamily.createdAt.toISOString(),
          permissions: userWithFamily.permissions as {
            canManageBankAccounts: boolean;
            canEditPayments: boolean;
            canViewReports: boolean;
            canManageFamily: boolean;
          },
        },
        family: {
          id: userWithFamily.family.id,
          name: userWithFamily.family.name,
          settings: userWithFamily.family.settings as {
            timezone: string;
            currency: string;
            fiscalYearStart: number;
          },
          subscriptionStatus: userWithFamily.family.subscriptionStatus,
        },
      };

      return NextResponse.json(response, { status: 200 });
    } catch (serviceError) {
      console.error('Get user profile error:', serviceError);

      if (serviceError instanceof Error) {
        if (serviceError.message === 'User not found') {
          return NextResponse.json(
            {
              error: 'User not found',
              message: 'The user account was not found.',
            },
            { status: 404 }
          );
        }
      }

      return NextResponse.json(
        {
          error: 'Failed to get user profile',
          message: 'Failed to retrieve user profile. Please try again.',
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Get me endpoint error:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to retrieve user profile. Please try again.',
      },
      { status: 500 }
    );
  }
}