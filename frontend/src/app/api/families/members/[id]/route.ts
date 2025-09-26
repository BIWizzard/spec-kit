import { NextRequest, NextResponse } from 'next/server';
import { FamilyService } from '../../../../../lib/services/family.service';
import { ValidationService } from '../../../../../lib/services/validation.service';
import jwt from 'jsonwebtoken';

export interface UpdateFamilyMemberRequest {
  role?: 'admin' | 'editor' | 'viewer';
  permissions?: {
    canManageBankAccounts?: boolean;
    canEditPayments?: boolean;
    canViewReports?: boolean;
    canManageFamily?: boolean;
  };
}

export interface UpdateFamilyMemberResponse {
  message: string;
  member: {
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
    updatedAt: string;
  };
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body: UpdateFamilyMemberRequest = await request.json();
    const { role, permissions } = body;
    const memberId = params.id;

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
    let userId: string;
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

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

    if (!memberId) {
      return NextResponse.json(
        {
          error: 'Missing member ID',
          message: 'Member ID is required.',
        },
        { status: 400 }
      );
    }

    // Validate input
    const validationErrors = ValidationService.validateUpdateFamilyMember({
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
      // Update family member
      const updatedMember = await FamilyService.updateFamilyMember(
        familyId,
        memberId,
        userId,
        {
          role,
          permissions,
        }
      );

      const response: UpdateFamilyMemberResponse = {
        message: 'Family member updated successfully.',
        member: {
          id: updatedMember.id,
          email: updatedMember.email,
          firstName: updatedMember.firstName,
          lastName: updatedMember.lastName,
          role: updatedMember.role as 'admin' | 'editor' | 'viewer',
          permissions: updatedMember.permissions as {
            canManageBankAccounts: boolean;
            canEditPayments: boolean;
            canViewReports: boolean;
            canManageFamily: boolean;
          },
          updatedAt: updatedMember.updatedAt.toISOString(),
        },
      };

      return NextResponse.json(response, { status: 200 });
    } catch (serviceError) {
      console.error('Update family member error:', serviceError);

      if (serviceError instanceof Error) {
        if (serviceError.message === 'Insufficient permissions to update family members') {
          return NextResponse.json(
            {
              error: 'Insufficient permissions',
              message: 'You do not have permission to update family members.',
            },
            { status: 403 }
          );
        }

        if (serviceError.message === 'Member not found') {
          return NextResponse.json(
            {
              error: 'Member not found',
              message: 'The family member was not found.',
            },
            { status: 404 }
          );
        }

        if (serviceError.message === 'Maximum of 3 admin members allowed per family') {
          return NextResponse.json(
            {
              error: 'Admin limit reached',
              message: 'Maximum of 3 admin members allowed per family.',
            },
            { status: 400 }
          );
        }

        if (serviceError.message === 'Cannot remove admin privileges from yourself') {
          return NextResponse.json(
            {
              error: 'Invalid operation',
              message: 'You cannot remove admin privileges from yourself.',
            },
            { status: 400 }
          );
        }
      }

      return NextResponse.json(
        {
          error: 'Failed to update family member',
          message: 'Failed to update family member. Please try again.',
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Update family member endpoint error:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to update family member. Please try again.',
      },
      { status: 500 }
    );
  }
}