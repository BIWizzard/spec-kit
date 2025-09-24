import { Request, Response } from 'express';
import { BankService } from '../../../services/bank.service';
import jwt from 'jsonwebtoken';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    familyId: string;
    email: string;
    role: string;
  };
}

export interface SuccessResponse {
  message: string;
}

export async function deleteBankAccount(req: AuthenticatedRequest, res: Response) {
  try {
    const { id: accountId } = req.params;

    // Validate required parameters
    if (!accountId) {
      return res.status(400).json({
        error: 'Missing account ID',
        message: 'Bank account ID is required.',
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
    let userId: string;
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

      if (!decoded || !decoded.familyId || !decoded.id) {
        return res.status(401).json({
          error: 'Invalid token',
          message: 'The provided token is invalid.',
        });
      }

      familyId = decoded.familyId;
      userId = decoded.id;
    } catch (jwtError) {
      return res.status(401).json({
        error: 'Invalid token',
        message: 'The provided token is invalid or expired.',
      });
    }

    try {
      // Check if account exists and user has permission before deletion
      const existingAccount = await BankService.getBankAccountById(familyId, accountId);
      if (!existingAccount) {
        return res.status(404).json({
          error: 'Bank account not found',
          message: 'The specified bank account was not found.',
        });
      }

      // Delete bank account (soft delete)
      await BankService.deleteBankAccount(familyId, accountId);

      const response: SuccessResponse = {
        message: 'Bank account disconnected successfully.',
      };

      res.status(200).json(response);
    } catch (serviceError) {
      console.error('Delete bank account error:', serviceError);

      if (serviceError instanceof Error) {
        if (serviceError.message.includes('not found')) {
          return res.status(404).json({
            error: 'Bank account not found',
            message: 'The specified bank account was not found.',
          });
        }

        if (serviceError.message.includes('not authorized') || serviceError.message.includes('permissions')) {
          return res.status(403).json({
            error: 'Insufficient permissions',
            message: 'You do not have permission to disconnect this bank account.',
          });
        }
      }

      res.status(500).json({
        error: 'Failed to disconnect bank account',
        message: 'Failed to disconnect bank account. Please try again.',
      });
    }
  } catch (error) {
    console.error('Delete bank account endpoint error:', error);

    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to disconnect bank account. Please try again.',
    });
  }
}