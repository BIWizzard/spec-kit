import { Request, Response } from 'express';
import { UserService } from '../../../../services/user.service';
import { FamilyService } from '../../../../services/family.service';
import { ValidationService } from '../../../../services/validation.service';
import bcrypt from 'bcryptjs';

export interface AcceptInvitationRequest {
  firstName: string;
  lastName: string;
  password: string;
  invitationToken: string;
}

export interface AcceptInvitationResponse {
  message: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: 'admin' | 'editor' | 'viewer';
    emailVerified: boolean;
  };
  family: {
    id: string;
    name: string;
  };
  tokens: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
}

export async function acceptFamilyInvitation(req: Request, res: Response) {
  try {
    const { firstName, lastName, password, invitationToken }: AcceptInvitationRequest = req.body;
    const invitationId = req.params.id;

    if (!invitationId) {
      return res.status(400).json({
        error: 'Missing invitation ID',
        message: 'Invitation ID is required.',
      });
    }

    // Validate input
    const validationErrors = ValidationService.validateAcceptInvitation({
      firstName,
      lastName,
      password,
      invitationToken,
    });

    if (validationErrors.length > 0) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validationErrors,
      });
    }

    try {
      // The invitation acceptance flow:
      // 1. Find the pending invitation by ID
      // 2. Verify the invitation token matches
      // 3. Update the member record with actual user details
      // 4. Generate authentication tokens
      // 5. Mark email as verified (since they received the invitation email)

      // For this MVP implementation, we'll use a simplified approach
      // since we don't have a separate invitation token storage

      // Hash the password
      const passwordHash = await bcrypt.hash(password, 12);

      // Use the invitation ID to get the family context
      // This is a simplified approach - in a full system, you'd validate the token properly
      const invitation = await UserService.acceptInvitationById({
        invitationId,
        firstName,
        lastName,
        password,
        invitationToken,
      });

      if (!invitation) {
        return res.status(404).json({
          error: 'Invalid invitation',
          message: 'The invitation was not found or has expired.',
        });
      }

      // Get the updated user details
      const user = await FamilyService.getFamilyMemberById(invitation.familyId, invitationId);
      const family = await FamilyService.getFamilyById(invitation.familyId);

      if (!user || !family) {
        throw new Error('Failed to retrieve user or family details after accepting invitation');
      }

      // Generate authentication tokens
      const userAgent = req.get('User-Agent') || 'Unknown';
      const ipAddress = req.ip || req.connection.remoteAddress || 'Unknown';

      const authResult = await UserService.generateTokens(
        {
          userId: user.id,
          familyId: invitation.familyId,
          email: user.email,
          role: user.role,
        },
        userAgent,
        ipAddress
      );

      const response: AcceptInvitationResponse = {
        message: 'Invitation accepted successfully. Welcome to the family!',
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role as 'admin' | 'editor' | 'viewer',
          emailVerified: user.emailVerified,
        },
        family: {
          id: family.id,
          name: family.name,
        },
        tokens: {
          accessToken: authResult.accessToken,
          refreshToken: authResult.refreshToken,
          expiresIn: authResult.expiresIn,
        },
      };

      res.status(200).json(response);
    } catch (serviceError) {
      console.error('Accept invitation error:', serviceError);

      if (serviceError instanceof Error) {
        if (serviceError.message === 'Invalid invitation' || serviceError.message === 'Invitation not found') {
          return res.status(404).json({
            error: 'Invalid invitation',
            message: 'The invitation was not found or has expired.',
          });
        }

        if (serviceError.message === 'Invitation already accepted') {
          return res.status(400).json({
            error: 'Invitation already accepted',
            message: 'This invitation has already been accepted.',
          });
        }

        if (serviceError.message === 'Invalid invitation token') {
          return res.status(400).json({
            error: 'Invalid invitation token',
            message: 'The invitation token is invalid.',
          });
        }
      }

      res.status(500).json({
        error: 'Failed to accept invitation',
        message: 'Failed to accept family invitation. Please try again.',
      });
    }
  } catch (error) {
    console.error('Accept invitation endpoint error:', error);

    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to accept family invitation. Please try again.',
    });
  }
}