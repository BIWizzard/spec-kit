import { Request, Response } from 'express';
import { FamilyService } from '../../../services/family.service';
import jwt from 'jsonwebtoken';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    familyId: string;
    email: string;
    role: string;
  };
}

export interface FamilyMemberInfo {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'editor' | 'viewer';
  permissions: {
    canManageBankAccounts: boolean;
    canEditPayments: boolean;
    canViewReports: boolean;
    canManageFamily: boolean;
  };
  mfaEnabled: boolean;
  emailVerified: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface FamilyMembersResponse {
  message: string;
  members: FamilyMemberInfo[];
}

export async function getFamilyMembers(req: AuthenticatedRequest, res: Response) {
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

    let familyId: string;
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

      if (!decoded || !decoded.familyId) {
        return res.status(401).json({
          error: 'Invalid token',
          message: 'The provided token is invalid.',
        });
      }

      familyId = decoded.familyId;
    } catch (jwtError) {
      return res.status(401).json({
        error: 'Invalid token',
        message: 'The provided token is invalid or expired.',
      });
    }

    try {
      // Get family with members
      const familyWithMembers = await FamilyService.getFamilyWithMembers(familyId);

      if (!familyWithMembers) {
        return res.status(404).json({
          error: 'Family not found',
          message: 'The family was not found.',
        });
      }

      const members: FamilyMemberInfo[] = familyWithMembers.members.map((member) => ({
        id: member.id,
        email: member.email,
        firstName: member.firstName,
        lastName: member.lastName,
        role: member.role as 'admin' | 'editor' | 'viewer',
        permissions: member.permissions as {
          canManageBankAccounts: boolean;
          canEditPayments: boolean;
          canViewReports: boolean;
          canManageFamily: boolean;
        },
        mfaEnabled: member.mfaEnabled,
        emailVerified: member.emailVerified,
        lastLoginAt: member.lastLoginAt ? member.lastLoginAt.toISOString() : null,
        createdAt: member.createdAt.toISOString(),
      }));

      const response: FamilyMembersResponse = {
        message: 'Family members retrieved successfully.',
        members,
      };

      res.status(200).json(response);
    } catch (serviceError) {
      console.error('Get family members error:', serviceError);

      if (serviceError instanceof Error) {
        if (serviceError.message === 'Family not found') {
          return res.status(404).json({
            error: 'Family not found',
            message: 'The family was not found.',
          });
        }
      }

      res.status(500).json({
        error: 'Failed to get family members',
        message: 'Failed to retrieve family members. Please try again.',
      });
    }
  } catch (error) {
    console.error('Get family members endpoint error:', error);

    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve family members. Please try again.',
    });
  }
}