import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { FamilyService } from '@/lib/services/family.service';

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