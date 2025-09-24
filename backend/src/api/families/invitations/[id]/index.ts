import { Request, Response } from 'express';
import { FamilyService } from '../../../../services/family.service';
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

export interface FamilyInvitationResponse {
  message: string;
  invitation: FamilyInvitation;
}

export async function getFamilyInvitation(req: AuthenticatedRequest, res: Response) {
  try {
    const invitationId = req.params.id;

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

    if (!invitationId) {
      return res.status(400).json({
        error: 'Missing invitation ID',
        message: 'Invitation ID is required.',
      });
    }

    try {
      // Get the specific family member by ID (which represents the invitation)
      const invitation = await FamilyService.getFamilyMemberById(familyId, invitationId);

      if (!invitation) {
        return res.status(404).json({
          error: 'Invitation not found',
          message: 'The invitation was not found.',
        });
      }

      // Check if this is actually a pending invitation (empty password/name)
      if (invitation.passwordHash !== '' || invitation.firstName !== '' || invitation.lastName !== '') {
        return res.status(404).json({
          error: 'Invitation not found',
          message: 'The invitation was not found or has already been accepted.',
        });
      }

      const invitationData: FamilyInvitation = {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role as 'admin' | 'editor' | 'viewer',
        permissions: invitation.permissions as {
          canManageBankAccounts: boolean;
          canEditPayments: boolean;
          canViewReports: boolean;
          canManageFamily: boolean;
        },
        status: 'pending',
        invitedBy: null, // Could be enhanced to track who sent the invitation
        invitedAt: invitation.createdAt.toISOString(),
        expiresAt: null, // Could be enhanced to track invitation expiration
      };

      const response: FamilyInvitationResponse = {
        message: 'Family invitation retrieved successfully.',
        invitation: invitationData,
      };

      res.status(200).json(response);
    } catch (serviceError) {
      console.error('Get family invitation error:', serviceError);

      if (serviceError instanceof Error) {
        if (serviceError.message === 'Member not found') {
          return res.status(404).json({
            error: 'Invitation not found',
            message: 'The invitation was not found.',
          });
        }
      }

      res.status(500).json({
        error: 'Failed to get family invitation',
        message: 'Failed to retrieve family invitation. Please try again.',
      });
    }
  } catch (error) {
    console.error('Get family invitation endpoint error:', error);

    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve family invitation. Please try again.',
    });
  }
}