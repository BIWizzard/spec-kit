import { Request, Response } from 'express';
import { FamilyService } from '../../services/family.service';
import jwt from 'jsonwebtoken';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    familyId: string;
    email: string;
    role: string;
  };
}

export interface FamilyActivity {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  changes: Record<string, any>;
  metadata: Record<string, any>;
  performedBy: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
  performedAt: string;
}

export interface FamilyActivityResponse {
  message: string;
  activities: FamilyActivity[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export async function getFamilyActivity(req: AuthenticatedRequest, res: Response) {
  try {
    // Extract pagination parameters
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100); // Max 100 items
    const offset = Math.max(parseInt(req.query.offset as string) || 0, 0);

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

    try {
      // Check user permissions (basic member access should be sufficient)
      const user = await FamilyService.getFamilyMemberById(familyId, userId);
      if (!user) {
        return res.status(403).json({
          error: 'Access denied',
          message: 'You do not have access to this family.',
        });
      }

      // Get family activity
      const activities = await FamilyService.getFamilyActivity(familyId, limit, offset);

      // Calculate total for pagination (in a real system, you'd optimize this)
      const allActivities = await FamilyService.getFamilyActivity(familyId, 10000, 0); // Get all to count
      const total = allActivities.length;
      const hasMore = offset + limit < total;

      const activityData: FamilyActivity[] = activities.map((activity) => ({
        id: activity.id,
        action: activity.action,
        entityType: activity.entityType,
        entityId: activity.entityId,
        changes: activity.changes as Record<string, any>,
        metadata: activity.metadata as Record<string, any>,
        performedBy: activity.familyMember ? {
          id: activity.familyMember.id,
          firstName: activity.familyMember.firstName,
          lastName: activity.familyMember.lastName,
          email: activity.familyMember.email,
        } : null,
        performedAt: activity.createdAt.toISOString(),
      }));

      const response: FamilyActivityResponse = {
        message: 'Family activity retrieved successfully.',
        activities: activityData,
        pagination: {
          total,
          limit,
          offset,
          hasMore,
        },
      };

      res.status(200).json(response);
    } catch (serviceError) {
      console.error('Get family activity error:', serviceError);

      if (serviceError instanceof Error) {
        if (serviceError.message === 'Family not found') {
          return res.status(404).json({
            error: 'Family not found',
            message: 'The family was not found.',
          });
        }
      }

      res.status(500).json({
        error: 'Failed to get family activity',
        message: 'Failed to retrieve family activity. Please try again.',
      });
    }
  } catch (error) {
    console.error('Get family activity endpoint error:', error);

    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve family activity. Please try again.',
    });
  }
}