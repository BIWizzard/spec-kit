import { NextRequest, NextResponse } from 'next/server';
import { FamilyService } from '../../../lib/services/family.service';
import { ValidationService } from '../../../lib/services/validation.service';
import * as jwt from 'jsonwebtoken';

interface FamilyInfo {
  id: string;
  name: string;
  settings: {
    timezone: string;
    currency: string;
    fiscalYearStart: number;
  };
  subscriptionStatus: string;
  dataRetentionConsent: boolean;
  createdAt: string;
  updatedAt: string;
  memberCount: number;
}

interface FamiliesResponse {
  family: FamilyInfo;
}

interface UpdateFamilyRequest {
  name?: string;
  settings?: {
    timezone?: string;
    currency?: string;
    fiscalYearStart?: number;
  };
}

interface UpdateFamilyResponse {
  message: string;
  family: {
    id: string;
    name: string;
    settings: {
      timezone: string;
      currency: string;
      fiscalYearStart: number;
    };
    updatedAt: string;
  };
}

async function extractUserFromToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('No token provided');
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

    if (!decoded || !decoded.familyId) {
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

export async function GET(request: NextRequest) {
  try {
    // Extract user from JWT token
    let familyId: string;
    try {
      const tokenData = await extractUserFromToken(request);
      familyId = tokenData.familyId;
    } catch (tokenError) {
      return NextResponse.json(
        {
          error: 'Authentication error',
          message: tokenError.message === 'No token provided'
            ? 'Authentication token is required.'
            : 'The provided token is invalid or expired.',
        },
        { status: 401 }
      );
    }

    try {
      // Get family information
      const family = await FamilyService.getFamilyById(familyId);

      if (!family) {
        return NextResponse.json(
          {
            error: 'Family not found',
            message: 'The family was not found.',
          },
          { status: 404 }
        );
      }

      // Get member count
      const memberCount = await FamilyService.getFamilyMemberCount(familyId);

      const familyInfo: FamilyInfo = {
        id: family.id,
        name: family.name,
        settings: family.settings as {
          timezone: string;
          currency: string;
          fiscalYearStart: number;
        },
        subscriptionStatus: family.subscriptionStatus,
        dataRetentionConsent: family.dataRetentionConsent,
        createdAt: family.createdAt.toISOString(),
        updatedAt: family.updatedAt.toISOString(),
        memberCount,
      };

      const response: FamiliesResponse = {
        family: familyInfo,
      };

      return NextResponse.json(response);
    } catch (serviceError) {
      console.error('Get family error:', serviceError);

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
          error: 'Failed to get family',
          message: 'Failed to retrieve family information. Please try again.',
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Get families endpoint error:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to retrieve family information. Please try again.',
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, settings }: UpdateFamilyRequest = body;

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
        },
        { status: 401 }
      );
    }

    // Validate input
    const validationErrors = ValidationService.validateFamilyUpdate({
      name,
      settings,
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
      // Check user permissions
      const user = await FamilyService.getFamilyMemberById(familyId, userId);
      const permissions = user?.permissions as any;
      if (!user || !permissions?.canManageFamily) {
        return NextResponse.json(
          {
            error: 'Insufficient permissions',
            message: 'You do not have permission to update family settings.',
          },
          { status: 403 }
        );
      }

      // Update family
      const updatedFamily = await FamilyService.updateFamily(familyId, {
        name,
        settings,
      });

      const response: UpdateFamilyResponse = {
        message: 'Family settings updated successfully.',
        family: {
          id: updatedFamily.id,
          name: updatedFamily.name,
          settings: updatedFamily.settings as {
            timezone: string;
            currency: string;
            fiscalYearStart: number;
          },
          updatedAt: updatedFamily.updatedAt.toISOString(),
        },
      };

      return NextResponse.json(response);
    } catch (serviceError) {
      console.error('Update family error:', serviceError);

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

        if (serviceError.message === 'Insufficient permissions') {
          return NextResponse.json(
            {
              error: 'Insufficient permissions',
              message: 'You do not have permission to update family settings.',
            },
            { status: 403 }
          );
        }
      }

      return NextResponse.json(
        {
          error: 'Failed to update family',
          message: 'Failed to update family settings. Please try again.',
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Update family endpoint error:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to update family settings. Please try again.',
      },
      { status: 500 }
    );
  }
}