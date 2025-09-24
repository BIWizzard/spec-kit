import { Request, Response } from 'express';
import { FamilyService } from '../../services/family.service';
import { ValidationService } from '../../services/validation.service';
import jwt from 'jsonwebtoken';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    familyId: string;
    email: string;
    role: string;
  };
}

export interface UpdateFamilyRequest {
  name?: string;
  settings?: {
    timezone?: string;
    currency?: string;
    fiscalYearStart?: number;
  };
}

export interface UpdateFamilyResponse {
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

export async function updateFamily(req: AuthenticatedRequest, res: Response) {
  try {
    const { name, settings }: UpdateFamilyRequest = req.body;

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

    // Validate input
    const validationErrors = ValidationService.validateFamilyUpdate({
      name,
      settings,
    });

    if (validationErrors.length > 0) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validationErrors,
      });
    }

    try {
      // Check user permissions
      const user = await FamilyService.getFamilyMemberById(familyId, userId);
      if (!user || !user.permissions.canManageFamily) {
        return res.status(403).json({
          error: 'Insufficient permissions',
          message: 'You do not have permission to update family settings.',
        });
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

      res.status(200).json(response);
    } catch (serviceError) {
      console.error('Update family error:', serviceError);

      if (serviceError instanceof Error) {
        if (serviceError.message === 'Family not found') {
          return res.status(404).json({
            error: 'Family not found',
            message: 'The family was not found.',
          });
        }

        if (serviceError.message === 'Insufficient permissions') {
          return res.status(403).json({
            error: 'Insufficient permissions',
            message: 'You do not have permission to update family settings.',
          });
        }
      }

      res.status(500).json({
        error: 'Failed to update family',
        message: 'Failed to update family settings. Please try again.',
      });
    }
  } catch (error) {
    console.error('Update family endpoint error:', error);

    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to update family settings. Please try again.',
    });
  }
}