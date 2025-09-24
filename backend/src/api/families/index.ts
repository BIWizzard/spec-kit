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

export interface FamilyInfo {
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

export interface FamiliesResponse {
  family: FamilyInfo;
}

export async function getFamilies(req: AuthenticatedRequest, res: Response) {
  try {
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
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

      if (!decoded || !decoded.familyId) {
        return res.status(401).json({
          error: 'Invalid token',
          message: 'The provided token is invalid.',
        });
      }

      familyId = decoded.familyId;
    } catch (jwtError) {
      return res.status(401).json({
        error: 'Invalid token',
        message: 'The provided token is invalid or expired.',
      });
    }

    try {
      // Get family information
      const family = await FamilyService.getFamilyById(familyId);

      if (!family) {
        return res.status(404).json({
          error: 'Family not found',
          message: 'The family was not found.',
        });
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

      res.status(200).json(response);
    } catch (serviceError) {
      console.error('Get family error:', serviceError);

      if (serviceError instanceof Error) {
        if (serviceError.message === 'Family not found') {
          return res.status(404).json({
            error: 'Family not found',
            message: 'The family was not found.',
          });
        }
      }

      res.status(500).json({
        error: 'Failed to get family',
        message: 'Failed to retrieve family information. Please try again.',
      });
    }
  } catch (error) {
    console.error('Get families endpoint error:', error);

    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve family information. Please try again.',
    });
  }
}