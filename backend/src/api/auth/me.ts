import { Request, Response } from 'express';
import { UserService } from '../../services/user.service';
import jwt from 'jsonwebtoken';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    familyId: string;
    email: string;
    role: string;
  };
}

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

export async function getMe(req: AuthenticatedRequest, res: Response) {
  try {
    // Extract user from JWT token
    const authHeader = req.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'No token provided',
        message: 'Authentication token is required.',
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    let userId: string;
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

      if (!decoded || !decoded.userId) {
        return res.status(401).json({
          error: 'Invalid token',
          message: 'The provided token is invalid.',
        });
      }

      userId = decoded.userId;
    } catch (jwtError) {
      return res.status(401).json({
        error: 'Invalid token',
        message: 'The provided token is invalid or expired.',
      });
    }

    try {
      // Get user with family data
      const userWithFamily = await UserService.getUserWithFamily(userId);

      if (!userWithFamily) {
        return res.status(404).json({
          error: 'User not found',
          message: 'The user account was not found.',
        });
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

      res.status(200).json(response);
    } catch (serviceError) {
      console.error('Get user profile error:', serviceError);

      if (serviceError instanceof Error) {
        if (serviceError.message === 'User not found') {
          return res.status(404).json({
            error: 'User not found',
            message: 'The user account was not found.',
          });
        }
      }

      res.status(500).json({
        error: 'Failed to get user profile',
        message: 'Failed to retrieve user profile. Please try again.',
      });
    }
  } catch (error) {
    console.error('Get me endpoint error:', error);

    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve user profile. Please try again.',
    });
  }
}