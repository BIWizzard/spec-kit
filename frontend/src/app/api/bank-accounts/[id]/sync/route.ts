import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { BankService } from '@/lib/services/bank.service';

export interface SyncResponse {
  message: string;
  syncId: string;
  status: string;
  estimatedCompletionTime: string;
}

interface RouteParams {
  params: {
    id: string;
  };
}

export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id: accountId } = params;

    // Validate required parameters
    if (!accountId) {
      return NextResponse.json(
        {
          error: 'Missing account ID',
          message: 'Bank account ID is required.',
        },
        { status: 400 }
      );
    }

    // Extract user from JWT token
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        {
          error: 'No token provided',
          message: 'Authentication token is required.',
        },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);

    let familyId: string;
    let userId: string;
    try {
      const jwtSecret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'dev-jwt-secret-change-this-in-production-make-it-really-long';
      const decoded = jwt.verify(token, jwtSecret) as any;

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

    try {
      // Check if account exists
      const existingAccount = await BankService.getBankAccountById(familyId, accountId);
      if (!existingAccount) {
        return NextResponse.json(
          {
            error: 'Bank account not found',
            message: 'The specified bank account was not found.',
          },
          { status: 404 }
        );
      }

      // Perform sync
      const syncResult = await BankService.syncTransactions(familyId, accountId);

      // Generate mock sync ID and estimated completion time
      const syncId = 'sync-' + Math.random().toString(36).substr(2, 9);
      const estimatedCompletionTime = new Date(Date.now() + 30000).toISOString(); // 30 seconds from now

      const response: SyncResponse = {
        message: 'Transaction sync initiated successfully.',
        syncId,
        status: 'completed',
        estimatedCompletionTime,
      };

      return NextResponse.json(response, { status: 200 });
    } catch (serviceError) {
      console.error('Sync bank account error:', serviceError);

      if (serviceError instanceof Error) {
        if (serviceError.message.includes('not found')) {
          return NextResponse.json(
            {
              error: 'Bank account not found',
              message: 'The specified bank account was not found.',
            },
            { status: 404 }
          );
        }

        if (serviceError.message.includes('not authorized') || serviceError.message.includes('permissions')) {
          return NextResponse.json(
            {
              error: 'Insufficient permissions',
              message: 'You do not have permission to sync this bank account.',
            },
            { status: 403 }
          );
        }

        if (serviceError.message.includes('rate limit') || serviceError.message.includes('too many')) {
          return NextResponse.json(
            {
              error: 'Sync rate limit exceeded',
              message: 'Too many sync requests. Please wait before trying again.',
            },
            { status: 429 }
          );
        }

        if (serviceError.message.includes('not properly connected') || serviceError.message.includes('access_token')) {
          return NextResponse.json(
            {
              error: 'Bank account connection issue',
              message: 'Bank account needs to be reconnected. Please use the reconnect endpoint.',
            },
            { status: 400 }
          );
        }
      }

      return NextResponse.json(
        {
          error: 'Failed to sync bank account',
          message: 'Failed to sync bank account transactions. Please try again.',
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Sync bank account endpoint error:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to sync bank account. Please try again.',
      },
      { status: 500 }
    );
  }
}