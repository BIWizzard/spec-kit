import { Request, Response } from 'express';
import { FamilyService } from '../../../../services/family.service';
import { ValidationService } from '../../../../services/validation.service';
import jwt from 'jsonwebtoken';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    familyId: string;
    email: string;
    role: string;
  };
}

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

export async function updateFamilyMember(req: AuthenticatedRequest, res: Response) {
  try {
    const { role, permissions }: UpdateFamilyMemberRequest = req.body;
    const memberId = req.params.id;

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

    if (!memberId) {
      return res.status(400).json({
        error: 'Missing member ID',
        message: 'Member ID is required.',
      });
    }

    // Validate input
    const validationErrors = ValidationService.validateUpdateFamilyMember({
      role,
      permissions,
    });

    if (validationErrors.length > 0) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validationErrors,
      });
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

      res.status(200).json(response);
    } catch (serviceError) {
      console.error('Update family member error:', serviceError);

      if (serviceError instanceof Error) {
        if (serviceError.message === 'Insufficient permissions to update family members') {
          return res.status(403).json({
            error: 'Insufficient permissions',
            message: 'You do not have permission to update family members.',
          });
        }

        if (serviceError.message === 'Member not found') {
          return res.status(404).json({
            error: 'Member not found',
            message: 'The family member was not found.',
          });
        }

        if (serviceError.message === 'Maximum of 3 admin members allowed per family') {
          return res.status(400).json({
            error: 'Admin limit reached',
            message: 'Maximum of 3 admin members allowed per family.',
          });
        }

        if (serviceError.message === 'Cannot remove admin privileges from yourself') {
          return res.status(400).json({
            error: 'Invalid operation',
            message: 'You cannot remove admin privileges from yourself.',
          });
        }
      }

      res.status(500).json({
        error: 'Failed to update family member',
        message: 'Failed to update family member. Please try again.',
      });
    }
  } catch (error) {
    console.error('Update family member endpoint error:', error);

    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to update family member. Please try again.',
    });
  }
}