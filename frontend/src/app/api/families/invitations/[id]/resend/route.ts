import { NextRequest, NextResponse } from 'next/server';
import { FamilyService } from '../../../../../../lib/services/family.service';
import { EmailService } from '../../../../../../lib/services/email.service';
import jwt from 'jsonwebtoken';
import { prisma } from '../../../../../../lib/prisma';

export interface ResendInvitationResponse {
  message: string;
}

async function extractUserFromToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('No token provided');
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix

  try {
    const jwtSecret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'dev-jwt-secret-change-this-in-production-make-it-really-long';
    const decoded = jwt.verify(token, jwtSecret) as any;

    if (!decoded || !decoded.familyId || !decoded.userId) {
      throw new Error('Invalid token');
    }

    return {
      familyId: decoded.familyId,
      userId: decoded.userId,
    };
  } catch (jwtError) {
    throw new Error('Invalid token');
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const invitationId = params.id;

    // Extract user from JWT token
    let familyId: string;
    let userId: string;
    try {
      const tokenData = await extractUserFromToken(request);
      familyId = tokenData.familyId;
      userId = tokenData.userId;
    } catch (tokenError) {
      return NextResponse.json(
        {
          error: 'Authentication error',
          message: tokenError.message === 'No token provided'
            ? 'Authentication token is required.'
            : 'The provided token is invalid or expired.',
          code: 'AUTH_ERROR'
        },
        { status: 401 }
      );
    }

    // Validate invitation ID
    if (!invitationId) {
      return NextResponse.json(
        {
          error: 'Missing invitation ID',
          message: 'Invitation ID is required.',
          code: 'MISSING_INVITATION_ID'
        },
        { status: 400 }
      );
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(invitationId)) {
      return NextResponse.json(
        {
          error: 'Invalid invitation ID',
          message: 'Invalid invitation ID format.',
          code: 'INVALID_INVITATION_ID'
        },
        { status: 400 }
      );
    }

    try {
      // Check user permissions before attempting to resend
      const user = await FamilyService.getFamilyMemberById(familyId, userId);
      const permissions = user?.permissions as any;
      if (!user || !permissions?.canManageFamily) {
        return NextResponse.json(
          {
            error: 'Insufficient permissions',
            message: 'You do not have permission to resend invitations.',
            code: 'INSUFFICIENT_PERMISSIONS'
          },
          { status: 403 }
        );
      }

      // Get the invitation to verify it exists and is pending
      const invitation = await FamilyService.getFamilyMemberById(familyId, invitationId);

      if (!invitation) {
        return NextResponse.json(
          {
            error: 'Invitation not found',
            message: 'The invitation was not found.',
            code: 'INVITATION_NOT_FOUND'
          },
          { status: 404 }
        );
      }

      // Check if this is actually a pending invitation (empty password/name)
      if (invitation.passwordHash !== '' || invitation.firstName !== '' || invitation.lastName !== '') {
        return NextResponse.json(
          {
            error: 'Invitation not found',
            message: 'The invitation was not found or has already been accepted.',
            code: 'INVITATION_NOT_FOUND'
          },
          { status: 404 }
        );
      }

      // Get family details for email
      const family = await FamilyService.getFamilyById(familyId);
      if (!family) {
        return NextResponse.json(
          {
            error: 'Family not found',
            message: 'The family was not found.',
            code: 'FAMILY_NOT_FOUND'
          },
          { status: 404 }
        );
      }

      // Get inviter details
      const inviter = await FamilyService.getFamilyMemberById(familyId, userId);
      const inviterName = inviter ? `${inviter.firstName} ${inviter.lastName}` : 'Admin';

      try {
        // Resend the invitation email
        await EmailService.sendFamilyInvitation(invitation.email, {
          inviterName,
          familyName: family.name,
          acceptUrl: `${process.env.FRONTEND_URL || 'https://budget.kmghub.com'}/accept-invitation?id=${invitationId}`,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        });

        // Log the resend action in audit trail
        await prisma.auditLog.create({
          data: {
            familyId,
            familyMemberId: userId,
            action: 'update',
            entityType: 'invitation',
            entityId: invitationId,
            changes: {
              action: 'resend',
              email: invitation.email,
            },
            description: `Resent invitation email to ${invitation.email}`,
          },
        });

        const response: ResendInvitationResponse = {
          message: 'Family invitation email resent successfully.',
        };

        return NextResponse.json(response, { status: 200 });
      } catch (emailError) {
        console.error('Failed to resend invitation email:', emailError);

        // Still return success to avoid revealing email system issues
        // The audit log will contain the actual error for debugging
        await prisma.auditLog.create({
          data: {
            familyId,
            familyMemberId: userId,
            action: 'update',
            entityType: 'invitation',
            entityId: invitationId,
            changes: {
              action: 'resend_failed',
              error: emailError.message,
            },
            description: `Failed to resend invitation email to ${invitation.email}`,
          },
        });

        const response: ResendInvitationResponse = {
          message: 'Family invitation email resent successfully.',
        };

        return NextResponse.json(response, { status: 200 });
      }
    } catch (serviceError) {
      console.error('Resend family invitation error:', serviceError);

      if (serviceError instanceof Error) {
        if (serviceError.message === 'Member not found') {
          return NextResponse.json(
            {
              error: 'Invitation not found',
              message: 'The invitation was not found.',
              code: 'INVITATION_NOT_FOUND'
            },
            { status: 404 }
          );
        }

        if (serviceError.message === 'Insufficient permissions') {
          return NextResponse.json(
            {
              error: 'Insufficient permissions',
              message: 'You do not have permission to resend invitations.',
              code: 'INSUFFICIENT_PERMISSIONS'
            },
            { status: 403 }
          );
        }
      }

      return NextResponse.json(
        {
          error: 'Failed to resend invitation',
          message: 'Failed to resend family invitation. Please try again.',
          code: 'RESEND_FAILED'
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Resend family invitation endpoint error:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to resend family invitation. Please try again.',
        code: 'INTERNAL_ERROR'
      },
      { status: 500 }
    );
  }
}