import { Request, Response } from 'express';
import { FamilyService } from '../../../services/family.service';
import { ValidationService } from '../../../services/validation.service';
import { EmailService } from '../../../services/email.service';
import jwt from 'jsonwebtoken';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    familyId: string;
    email: string;
    role: string;
  };
}

export interface InviteMemberRequest {
  email: string;
  role: 'admin' | 'editor' | 'viewer';
  permissions?: {
    canManageBankAccounts?: boolean;
    canEditPayments?: boolean;
    canViewReports?: boolean;
    canManageFamily?: boolean;
  };
}

export interface InviteMemberResponse {
  message: string;
  invitation: {
    id: string;
    email: string;
    role: 'admin' | 'editor' | 'viewer';
    permissions: {
      canManageBankAccounts: boolean;
      canEditPayments: boolean;
      canViewReports: boolean;
      canManageFamily: boolean;
    };
    invitedAt: string;
  };
}

export async function inviteFamilyMember(req: AuthenticatedRequest, res: Response) {
  try {
    const { email, role, permissions }: InviteMemberRequest = req.body;

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
    let userId: string;
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

      if (!decoded || !decoded.familyId || !decoded.userId) {
        return res.status(401).json({
          error: 'Invalid token',
          message: 'The provided token is invalid.',
        });
      }

      familyId = decoded.familyId;
      userId = decoded.userId;
    } catch (jwtError) {
      return res.status(401).json({
        error: 'Invalid token',
        message: 'The provided token is invalid or expired.',
      });
    }

    // Validate input
    const validationErrors = ValidationService.validateInviteFamilyMember({
      email,
      role,
      permissions,
    });

    if (validationErrors.length > 0) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validationErrors,
      });
    }

    try {
      // Invite family member
      const invitation = await FamilyService.inviteFamilyMember(familyId, userId, {
        email,
        role,
        permissions,
      });

      // Send invitation email
      await EmailService.sendInvitationEmail(
        email,
        invitation.token,
        familyId
      );

      // Get the created member details for response
      const member = await FamilyService.getFamilyMemberById(familyId, invitation.invitationId);

      if (!member) {
        throw new Error('Failed to retrieve invited member details');
      }

      const response: InviteMemberResponse = {
        message: 'Family member invited successfully.',
        invitation: {
          id: member.id,
          email: member.email,
          role: member.role as 'admin' | 'editor' | 'viewer',
          permissions: member.permissions as {
            canManageBankAccounts: boolean;
            canEditPayments: boolean;
            canViewReports: boolean;
            canManageFamily: boolean;
          },
          invitedAt: member.createdAt.toISOString(),
        },
      };

      res.status(201).json(response);
    } catch (serviceError) {
      console.error('Invite family member error:', serviceError);

      if (serviceError instanceof Error) {
        if (serviceError.message === 'Inviter not found or not authorized') {
          return res.status(404).json({
            error: 'User not found',
            message: 'The user was not found or is not authorized.',
          });
        }

        if (serviceError.message === 'Insufficient permissions to invite members') {
          return res.status(403).json({
            error: 'Insufficient permissions',
            message: 'You do not have permission to invite family members.',
          });
        }

        if (serviceError.message === 'User is already a member of this family') {
          return res.status(409).json({
            error: 'Member already exists',
            message: 'This user is already a member of the family.',
          });
        }

        if (serviceError.message === 'Maximum number of family members reached') {
          return res.status(400).json({
            error: 'Member limit reached',
            message: 'The maximum number of family members has been reached.',
          });
        }
      }

      res.status(500).json({
        error: 'Failed to invite family member',
        message: 'Failed to invite family member. Please try again.',
      });
    }
  } catch (error) {
    console.error('Invite family member endpoint error:', error);

    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to invite family member. Please try again.',
    });
  }
}