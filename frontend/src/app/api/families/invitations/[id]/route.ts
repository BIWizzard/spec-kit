import { NextRequest, NextResponse } from 'next/server';
import { FamilyService } from '../../../../../lib/services/family.service';
import jwt from 'jsonwebtoken';

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

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const invitationId = params.id;

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

    let familyId: string;
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

      if (!decoded || !decoded.familyId) {
        return NextResponse.json(
          {
            error: 'Invalid token',
            message: 'The provided token is invalid.',
          },
          { status: 401 }
        );
      }

      familyId = decoded.familyId;
    } catch (jwtError) {
      return NextResponse.json(
        {
          error: 'Invalid token',
          message: 'The provided token is invalid or expired.',
        },
        { status: 401 }
      );
    }

    if (!invitationId) {
      return NextResponse.json(
        {
          error: 'Missing invitation ID',
          message: 'Invitation ID is required.',
        },
        { status: 400 }
      );
    }

    try {
      // Get the specific family member by ID (which represents the invitation)
      const invitation = await FamilyService.getFamilyMemberById(familyId, invitationId);

      if (!invitation) {
        return NextResponse.json(
          {
            error: 'Invitation not found',
            message: 'The invitation was not found.',
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
          },
          { status: 404 }
        );
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

      return NextResponse.json(response, { status: 200 });
    } catch (serviceError) {
      console.error('Get family invitation error:', serviceError);

      if (serviceError instanceof Error) {
        if (serviceError.message === 'Member not found') {
          return NextResponse.json(
            {
              error: 'Invitation not found',
              message: 'The invitation was not found.',
            },
            { status: 404 }
          );
        }
      }

      return NextResponse.json(
        {
          error: 'Failed to get family invitation',
          message: 'Failed to retrieve family invitation. Please try again.',
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Get family invitation endpoint error:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to retrieve family invitation. Please try again.',
      },
      { status: 500 }
    );
  }
}