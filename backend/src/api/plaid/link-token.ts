import { Request, Response } from 'express';
import { BankService } from '../../services/bank.service';
import jwt from 'jsonwebtoken';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    familyId: string;
    email: string;
    role: string;
  };
}

export interface CreateLinkTokenRequest {
  userId: string;
  mode?: 'connect' | 'update';
  accountId?: string;
}

export interface LinkTokenResponse {
  message: string;
  linkToken: string;
  expiration: string;
}

export async function createLinkToken(req: AuthenticatedRequest, res: Response) {
  try {
    const { userId, mode = 'connect', accountId }: CreateLinkTokenRequest = req.body;

    // Validate required fields
    if (!userId) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'User ID is required.',
      });
    }

    if (mode === 'update' && !accountId) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Account ID is required for update mode.',
      });
    }

    if (mode && !['connect', 'update'].includes(mode)) {
      return res.status(400).json({
        error: 'Invalid mode',
        message: 'Mode must be either connect or update.',
      });
    }

    // Extract user from JWT token
    const authHeader = req.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'No token provided',
        message: 'Authentication token is required.',
      });
    }

    const token = authHeader.substring(7);
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
      // Create Plaid Link token
      const linkToken = await BankService.createLinkToken(familyId, userId);

      // Calculate expiration (Plaid Link tokens typically expire in 2 hours)
      const expiration = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();

      const response: LinkTokenResponse = {
        message: 'Link token created successfully.',
        linkToken,
        expiration,
      };

      res.status(201).json(response);
    } catch (serviceError) {
      console.error('Create link token error:', serviceError);

      if (serviceError instanceof Error) {
        if (serviceError.message.includes('not found') || serviceError.message.includes('not authorized')) {
          return res.status(403).json({
            error: 'Insufficient permissions',
            message: 'You do not have permission to create link tokens.',
          });
        }

        if (serviceError.message.includes('Plaid')) {
          return res.status(500).json({
            error: 'Plaid service error',
            message: 'Failed to create link token with Plaid. Please try again.',
          });
        }
      }

      res.status(500).json({
        error: 'Failed to create link token',
        message: 'Failed to create link token. Please try again.',
      });
    }
  } catch (error) {
    console.error('Create link token endpoint error:', error);

    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to create link token. Please try again.',
    });
  }
}