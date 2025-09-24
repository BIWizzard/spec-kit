import { Request, Response } from 'express';
import { FamilyService } from '../../../../services/family.service';
import jwt from 'jsonwebtoken';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    familyId: string;
    email: string;
    role: string;
  };
}

export interface DeleteFamilyMemberResponse {
  message: string;
}

export async function deleteFamilyMember(req: AuthenticatedRequest, res: Response) {
  try {
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

    try {
      // Check user permissions before attempting deletion
      const user = await FamilyService.getFamilyMemberById(familyId, userId);
      if (!user || !user.permissions.canManageFamily) {
        return res.status(403).json({
          error: 'Insufficient permissions',
          message: 'You do not have permission to remove family members.',
        });
      }

      // Prevent users from deleting themselves
      if (memberId === userId) {
        return res.status(400).json({
          error: 'Invalid operation',
          message: 'You cannot remove yourself from the family.',
        });
      }

      // Delete family member (soft delete)
      await FamilyService.deleteFamilyMember(familyId, memberId);

      const response: DeleteFamilyMemberResponse = {
        message: 'Family member removed successfully.',
      };

      res.status(200).json(response);
    } catch (serviceError) {
      console.error('Delete family member error:', serviceError);

      if (serviceError instanceof Error) {
        if (serviceError.message === 'Member not found or already deleted') {
          return res.status(404).json({
            error: 'Member not found',
            message: 'The family member was not found or has already been removed.',
          });
        }

        if (serviceError.message === 'Cannot delete the last admin member') {
          return res.status(400).json({
            error: 'Cannot remove last admin',
            message: 'Cannot remove the last admin member from the family.',
          });
        }

        if (serviceError.message === 'Insufficient permissions') {
          return res.status(403).json({
            error: 'Insufficient permissions',
            message: 'You do not have permission to remove family members.',
          });
        }
      }

      res.status(500).json({
        error: 'Failed to remove family member',
        message: 'Failed to remove family member. Please try again.',
      });
    }
  } catch (error) {
    console.error('Delete family member endpoint error:', error);

    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to remove family member. Please try again.',
    });
  }
}