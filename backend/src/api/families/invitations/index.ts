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

export interface FamilyInvitation {
  id: string;
  email: string;
  role: 'admin' | 'editor' | 'viewer';
  permissions: {
    canManageBankAccounts: boolean;
    canEditPayments: boolean;
    canViewReports: boolean;
    canManageFamily: boolean;
  };
  status: 'pending' | 'accepted' | 'expired' | 'cancelled';
  invitedBy: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
  invitedAt: string;
  expiresAt: string | null;
}

export interface FamilyInvitationsResponse {
  message: string;
  invitations: FamilyInvitation[];
}

export async function getFamilyInvitations(req: AuthenticatedRequest, res: Response) {
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
      // Get family with members to find pending invitations
      const familyWithMembers = await FamilyService.getFamilyWithMembers(familyId);

      if (!familyWithMembers) {
        return res.status(404).json({
          error: 'Family not found',
          message: 'The family was not found.',
        });
      }

      // Filter to get only pending invitations (members with empty passwords/names)
      const pendingInvitations = familyWithMembers.members.filter(
        (member) => member.passwordHash === '' && member.firstName === '' && member.lastName === ''
      );

      const invitations: FamilyInvitation[] = pendingInvitations.map((invitation) => ({
        id: invitation.id,
        email: invitation.email,
        role: invitation.role as 'admin' | 'editor' | 'viewer',
        permissions: invitation.permissions as {
          canManageBankAccounts: boolean;
          canEditPayments: boolean;
          canViewReports: boolean;
          canManageFamily: boolean;
        },
        status: 'pending' as const,
        invitedBy: null, // Could be enhanced to track who sent the invitation
        invitedAt: invitation.createdAt.toISOString(),
        expiresAt: null, // Could be enhanced to track invitation expiration
      }));

      const response: FamilyInvitationsResponse = {
        message: 'Family invitations retrieved successfully.',
        invitations,
      };

      res.status(200).json(response);
    } catch (serviceError) {
      console.error('Get family invitations error:', serviceError);

      if (serviceError instanceof Error) {
        if (serviceError.message === 'Family not found') {
          return res.status(404).json({
            error: 'Family not found',
            message: 'The family was not found.',
          });
        }
      }

      res.status(500).json({
        error: 'Failed to get family invitations',
        message: 'Failed to retrieve family invitations. Please try again.',
      });
    }
  } catch (error) {
    console.error('Get family invitations endpoint error:', error);

    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve family invitations. Please try again.',
    });
  }
}