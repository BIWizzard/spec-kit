import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { FamilyService } from '@/lib/services/family.service';
import { ValidationService } from '@/lib/services/validation.service';
import { EmailService } from '@/lib/services/email.service';

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

export async function GET(request: NextRequest) {
  try {
    // Extract user from JWT token
    const authHeader = request.headers.get('authorization');
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
      const jwtSecret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'dev-jwt-secret-change-this-in-production-make-it-really-long';
      const decoded = jwt.verify(token, jwtSecret) as any;

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
      // Get family with members
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

      return NextResponse.json(response, { status: 200 });
    } catch (serviceError) {
      console.error('Get family members error:', serviceError);

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
          error: 'Failed to get family members',
          message: 'Failed to retrieve family members. Please try again.',
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Get family members endpoint error:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to retrieve family members. Please try again.',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, role, permissions }: InviteMemberRequest = body;

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
    let userId: string;
    try {
      const jwtSecret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'dev-jwt-secret-change-this-in-production-make-it-really-long';
      const decoded = jwt.verify(token, jwtSecret) as any;

      if (!decoded || !decoded.familyId || !decoded.userId) {
        return NextResponse.json(
          {
            error: 'Invalid token',
            message: 'The provided token is invalid.',
          },
          { status: 401 }
        );
      }

      familyId = decoded.familyId;
      userId = decoded.userId;
    } catch (jwtError) {
      return NextResponse.json(
        {
          error: 'Invalid token',
          message: 'The provided token is invalid or expired.',
        },
        { status: 401 }
      );
    }

    // Validate input
    const validationErrors = ValidationService.validateInviteFamilyMember({
      email,
      role,
      permissions,
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

      return NextResponse.json(response, { status: 201 });
    } catch (serviceError) {
      console.error('Invite family member error:', serviceError);

      if (serviceError instanceof Error) {
        if (serviceError.message === 'Inviter not found or not authorized') {
          return NextResponse.json(
            {
              error: 'User not found',
              message: 'The user was not found or is not authorized.',
            },
            { status: 404 }
          );
        }

        if (serviceError.message === 'Insufficient permissions to invite members') {
          return NextResponse.json(
            {
              error: 'Insufficient permissions',
              message: 'You do not have permission to invite family members.',
            },
            { status: 403 }
          );
        }

        if (serviceError.message === 'User is already a member of this family') {
          return NextResponse.json(
            {
              error: 'Member already exists',
              message: 'This user is already a member of the family.',
            },
            { status: 409 }
          );
        }

        if (serviceError.message === 'Maximum number of family members reached') {
          return NextResponse.json(
            {
              error: 'Member limit reached',
              message: 'The maximum number of family members has been reached.',
            },
            { status: 400 }
          );
        }
      }

      return NextResponse.json(
        {
          error: 'Failed to invite family member',
          message: 'Failed to invite family member. Please try again.',
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Invite family member endpoint error:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to invite family member. Please try again.',
      },
      { status: 500 }
    );
  }
}