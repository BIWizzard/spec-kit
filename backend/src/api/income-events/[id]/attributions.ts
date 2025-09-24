import { Request, Response } from 'express';
import { AttributionService } from '../../../services/attribution.service';
import jwt from 'jsonwebtoken';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    familyId: string;
    email: string;
    role: string;
  };
}

export interface AttributionInfo {
  id: string;
  budgetCategoryId?: string;
  budgetCategoryName?: string;
  goalId?: string;
  goalName?: string;
  amount: number;
  percentage: number;
  notes?: string;
  createdAt: string;
}

export interface AttributionsResponse {
  message: string;
  attributions: AttributionInfo[];
  totalAttributed: number;
  totalAmount: number;
  remainingAmount: number;
}

export async function getIncomeEventAttributions(req: AuthenticatedRequest, res: Response) {
  try {
    const eventId = req.params.id;

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

    if (!eventId) {
      return res.status(400).json({
        error: 'Missing event ID',
        message: 'Income event ID is required.',
      });
    }

    try {
      // Get income event attributions
      const attributions = await AttributionService.getIncomeEventAttributions(familyId, eventId);

      const attributionData: AttributionInfo[] = attributions.attributions.map((attribution) => ({
        id: attribution.id,
        ...(attribution.budgetCategoryId && {
          budgetCategoryId: attribution.budgetCategoryId,
          budgetCategoryName: attribution.budgetCategory?.name
        }),
        ...(attribution.goalId && {
          goalId: attribution.goalId,
          goalName: attribution.goal?.name
        }),
        amount: attribution.amount.toNumber(),
        percentage: parseFloat(((attribution.amount.toNumber() / attributions.totalAmount) * 100).toFixed(2)),
        notes: attribution.notes,
        createdAt: attribution.createdAt.toISOString(),
      }));

      const response: AttributionsResponse = {
        message: 'Income event attributions retrieved successfully.',
        attributions: attributionData,
        totalAttributed: attributions.totalAttributed,
        totalAmount: attributions.totalAmount,
        remainingAmount: attributions.remainingAmount,
      };

      res.status(200).json(response);
    } catch (serviceError) {
      console.error('Get income event attributions error:', serviceError);

      if (serviceError instanceof Error) {
        if (serviceError.message === 'Income event not found') {
          return res.status(404).json({
            error: 'Income event not found',
            message: 'The income event was not found.',
          });
        }

        if (serviceError.message === 'Family not found') {
          return res.status(404).json({
            error: 'Family not found',
            message: 'The family was not found.',
          });
        }
      }

      res.status(500).json({
        error: 'Failed to get income event attributions',
        message: 'Failed to retrieve income event attributions. Please try again.',
      });
    }
  } catch (error) {
    console.error('Get income event attributions endpoint error:', error);

    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve income event attributions. Please try again.',
    });
  }
}