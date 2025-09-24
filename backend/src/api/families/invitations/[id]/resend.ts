import { Request, Response } from 'express';
import { FamilyService } from '../../../../services/family.service';
import { EmailService } from '../../../../services/email.service';
import jwt from 'jsonwebtoken';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    familyId: string;
    email: string;
    role: string;
  };
}

export interface ResendInvitationResponse {
  message: string;
}

export async function resendFamilyInvitation(req: AuthenticatedRequest, res: Response) {
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

    if (!invitationId) {
      return res.status(400).json({
        error: 'Missing invitation ID',
        message: 'Invitation ID is required.',
      });
    }

    try {
      // Check user permissions before attempting resend
      const user = await FamilyService.getFamilyMemberById(familyId, userId);
      if (!user || !user.permissions.canManageFamily) {
        return res.status(403).json({
          error: 'Insufficient permissions',
          message: 'You do not have permission to resend invitations.',
        });
      }

      // Get the invitation to verify it exists and is pending
      const invitation = await FamilyService.getFamilyMemberById(familyId, invitationId);

      if (!invitation) {
        return res.status(404).json({
          error: 'Invitation not found',
          message: 'The invitation was not found.',
        });
      }

      // Check if this is actually a pending invitation (empty password/name)
      if (invitation.passwordHash !== '' || invitation.firstName !== '' || invitation.lastName !== '') {
        return res.status(400).json({
          error: 'Invalid operation',
          message: 'This invitation has already been accepted and cannot be resent.',
        });
      }

      // Generate a new invitation token (in a full system, you'd store this)
      const newInvitationToken = require('crypto').randomUUID();

      // Resend invitation email
      await EmailService.sendInvitationEmail(
        invitation.email,
        newInvitationToken,
        familyId
      );

      const response: ResendInvitationResponse = {
        message: 'Family invitation resent successfully.',
      };

      res.status(200).json(response);
    } catch (serviceError) {
      console.error('Resend family invitation error:', serviceError);

      if (serviceError instanceof Error) {
        if (serviceError.message === 'Member not found') {
          return res.status(404).json({
            error: 'Invitation not found',
            message: 'The invitation was not found.',
          });
        }

        if (serviceError.message === 'Insufficient permissions') {
          return res.status(403).json({
            error: 'Insufficient permissions',
            message: 'You do not have permission to resend invitations.',
          });
        }
      }

      res.status(500).json({
        error: 'Failed to resend invitation',
        message: 'Failed to resend family invitation. Please try again.',
      });
    }
  } catch (error) {
    console.error('Resend family invitation endpoint error:', error);

    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to resend family invitation. Please try again.',
    });
  }
}