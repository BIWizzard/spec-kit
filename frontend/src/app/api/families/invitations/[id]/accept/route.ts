import { NextRequest, NextResponse } from 'next/server';
import { UserService } from '../../../../../../lib/services/user.service';
import { FamilyService } from '../../../../../../lib/services/family.service';
import { ValidationService } from '../../../../../../lib/services/validation.service';
import jwt from 'jsonwebtoken';

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
    tokenType: string;
  };
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const invitationId = params.id;

    if (!invitationId) {
      return NextResponse.json(
        {
          error: 'Missing invitation ID',
          message: 'Invitation ID is required.',
        },
        { status: 400 }
      );
    }

    const body: AcceptInvitationRequest = await request.json();
    const { firstName, lastName, password, invitationToken } = body;

    // Validate input
    const validationErrors = ValidationService.validateAcceptInvitation({
      firstName,
      lastName,
      password,
      invitationToken,
    });

    if (validationErrors.length > 0) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationErrors,
        },
        { status: 400 }
      );
    }

    try {
      // Accept invitation using the UserService
      const invitation = await UserService.acceptInvitationById({
        invitationId,
        firstName,
        lastName,
        password,
        invitationToken,
      });

      if (!invitation) {
        return NextResponse.json(
          {
            error: 'Invalid invitation',
            message: 'The invitation was not found or has expired.',
          },
          { status: 404 }
        );
      }

      // Get the updated user details
      const user = await FamilyService.getFamilyMemberById(invitation.familyId, invitationId);
      const family = await FamilyService.getFamilyById(invitation.familyId);

      if (!user || !family) {
        throw new Error('Failed to retrieve user or family details after accepting invitation');
      }

      // Generate authentication tokens
      const jwtSecret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'dev-jwt-secret-change-this-in-production-make-it-really-long';
      const refreshSecret = process.env.JWT_REFRESH_SECRET || process.env.NEXTAUTH_SECRET || 'dev-jwt-secret-change-this-in-production-make-it-really-long';

      const accessToken = jwt.sign(
        {
          userId: user.id,
          familyId: invitation.familyId,
          email: user.email,
          role: user.role,
        },
        jwtSecret,
        { expiresIn: '15m' }
      );

      const refreshToken = jwt.sign(
        {
          userId: user.id,
          type: 'refresh',
        },
        refreshSecret,
        { expiresIn: '7d' }
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
          accessToken,
          refreshToken,
          expiresIn: 900, // 15 minutes in seconds
          tokenType: 'Bearer',
        },
      };

      return NextResponse.json(response, { status: 200 });
    } catch (serviceError) {
      console.error('Accept invitation error:', serviceError);

      if (serviceError instanceof Error) {
        if (serviceError.message === 'Invalid invitation' || serviceError.message === 'Invitation not found') {
          return NextResponse.json(
            {
              error: 'Invalid invitation',
              message: 'The invitation was not found or has expired.',
            },
            { status: 404 }
          );
        }

        if (serviceError.message === 'Invitation already accepted') {
          return NextResponse.json(
            {
              error: 'Invitation already accepted',
              message: 'This invitation has already been accepted.',
            },
            { status: 400 }
          );
        }

        if (serviceError.message === 'Invalid invitation token') {
          return NextResponse.json(
            {
              error: 'Invalid invitation token',
              message: 'The invitation token is invalid.',
            },
            { status: 400 }
          );
        }
      }

      return NextResponse.json(
        {
          error: 'Failed to accept invitation',
          message: 'Failed to accept family invitation. Please try again.',
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Accept invitation endpoint error:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to accept family invitation. Please try again.',
      },
      { status: 500 }
    );
  }
}