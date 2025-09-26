import { NextRequest, NextResponse } from 'next/server';
import { FamilyService } from '../../../../lib/services/family.service';
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

export interface FamilyInvitationsResponse {
  message: string;
  invitations: FamilyInvitation[];
}

export async function GET(request: NextRequest): Promise<NextResponse> {
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

    try {
      // Get family with members to find pending invitations
      const familyWithMembers = await FamilyService.getFamilyWithMembers(familyId);

      if (!familyWithMembers) {
        return NextResponse.json(
          {
            error: 'Family not found',
            message: 'The family was not found.',
          },
          { status: 404 }
        );
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

      return NextResponse.json(response, { status: 200 });
    } catch (serviceError) {
      console.error('Get family invitations error:', serviceError);

      if (serviceError instanceof Error) {
        if (serviceError.message === 'Family not found') {
          return NextResponse.json(
            {
              error: 'Family not found',
              message: 'The family was not found.',
            },
            { status: 404 }
          );
        }
      }

      return NextResponse.json(
        {
          error: 'Failed to get family invitations',
          message: 'Failed to retrieve family invitations. Please try again.',
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Get family invitations endpoint error:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to retrieve family invitations. Please try again.',
      },
      { status: 500 }
    );
  }
}