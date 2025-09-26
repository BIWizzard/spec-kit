import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

import { BankService } from '@/lib/services/bank.service';
import { ValidationService } from '@/lib/services/validation.service';

export interface ReconnectBankAccountRequest {
  publicToken: string;
}

export interface ReconnectBankAccountResponse {
  message: string;
  account: {
    id: string;
    accountName: string;
    institutionName: string;
    accountType: string;
    currentBalance: number;
    syncStatus: string;
    lastSyncAt: string;
  };
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const accountId = params.id;
    const body: ReconnectBankAccountRequest = await request.json();

    const { publicToken } = body;

    // Validate input
    const validationErrors = ValidationService.validateBankAccountReconnect({
      publicToken,
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

    // Extract JWT token from Authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const jwtSecret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'dev-jwt-secret-change-this-in-production-make-it-really-long';

    let decoded: any;
    try {
      decoded = jwt.verify(token, jwtSecret);
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    const { familyId } = decoded;

    // Reconnect bank account
    const updatedAccount = await BankService.reconnectBankAccount(
      familyId,
      accountId,
      publicToken
    );

    const response: ReconnectBankAccountResponse = {
      message: 'Bank account reconnected successfully',
      account: {
        id: updatedAccount.id,
        accountName: updatedAccount.accountName,
        institutionName: updatedAccount.institutionName,
        accountType: updatedAccount.accountType,
        currentBalance: parseFloat(updatedAccount.currentBalance.toString()),
        syncStatus: updatedAccount.syncStatus,
        lastSyncAt: updatedAccount.lastSyncAt?.toISOString() || '',
      },
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Bank account reconnect error:', error);

    if (error instanceof Error) {
      if (error.message === 'Bank account not found') {
        return NextResponse.json(
          {
            error: 'Bank account not found',
            message: 'The specified bank account was not found or you do not have access to it.',
          },
          { status: 404 }
        );
      }

      if (error.message.includes('Failed to reconnect bank account')) {
        return NextResponse.json(
          {
            error: 'Reconnection failed',
            message: error.message,
          },
          { status: 400 }
        );
      }

      if (error.message.includes('Insufficient permissions')) {
        return NextResponse.json(
          {
            error: 'Insufficient permissions',
            message: 'You do not have permission to reconnect bank accounts.',
          },
          { status: 403 }
        );
      }
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to reconnect bank account. Please try again.',
      },
      { status: 500 }
    );
  }
}