import { NextRequest, NextResponse } from 'next/server';
import { BankService } from '@/lib/services/bank.service';
import jwt from 'jsonwebtoken';

interface BankAccountResponse {
  bankAccount: {
    id: string;
    familyId: string;
    plaidAccountId: string;
    plaidItemId: string;
    institutionName: string;
    institutionId: string;
    accountName: string;
    accountType: 'checking' | 'savings' | 'credit' | 'loan';
    accountSubtype: string;
    accountNumber: string;
    currentBalance: string;
    availableBalance: string;
    lastSyncAt: string;
    syncStatus: 'active' | 'error' | 'disconnected';
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
  };
}

async function extractUserFromToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('No token provided');
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix

  try {
    const jwtSecret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'dev-jwt-secret-change-this-in-production-make-it-really-long';
    const decoded = jwt.verify(token, jwtSecret) as any;

    if (!decoded || !decoded.familyId) {
      throw new Error('Invalid token');
    }

    return {
      familyId: decoded.familyId,
      userId: decoded.userId,
    };
  } catch (jwtError) {
    throw new Error('Invalid token');
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        {
          error: 'Bank account ID required',
          message: 'Bank account ID is required.',
        },
        { status: 400 }
      );
    }

    // Extract user from JWT token
    let familyId: string;
    try {
      const tokenData = await extractUserFromToken(request);
      familyId = tokenData.familyId;
    } catch (tokenError) {
      return NextResponse.json(
        {
          error: 'Authentication error',
          message: tokenError.message === 'No token provided'
            ? 'Authentication token is required.'
            : 'The provided token is invalid or expired.',
        },
        { status: 401 }
      );
    }

    try {
      // Get bank account by ID
      const bankAccount = await BankService.getBankAccountById(familyId, id);

      if (!bankAccount) {
        return NextResponse.json(
          {
            error: 'Bank account not found',
            message: 'The bank account was not found.',
          },
          { status: 404 }
        );
      }

      const response: BankAccountResponse = {
        bankAccount: {
          id: bankAccount.id,
          familyId: bankAccount.familyId,
          plaidAccountId: bankAccount.plaidAccountId,
          plaidItemId: bankAccount.plaidItemId,
          institutionName: bankAccount.institutionName,
          institutionId: bankAccount.institutionId,
          accountName: bankAccount.accountName,
          accountType: bankAccount.accountType as 'checking' | 'savings' | 'credit' | 'loan',
          accountSubtype: bankAccount.accountSubtype,
          accountNumber: bankAccount.accountNumber,
          currentBalance: bankAccount.currentBalance.toString(),
          availableBalance: bankAccount.availableBalance.toString(),
          lastSyncAt: bankAccount.lastSyncAt?.toISOString() || '',
          syncStatus: bankAccount.syncStatus as 'active' | 'error' | 'disconnected',
          createdAt: bankAccount.createdAt.toISOString(),
          updatedAt: bankAccount.updatedAt.toISOString(),
          deletedAt: bankAccount.deletedAt?.toISOString() || null,
        },
      };

      return NextResponse.json(response);
    } catch (serviceError) {
      console.error('Get bank account error:', serviceError);

      if (serviceError instanceof Error) {
        if (serviceError.message === 'Bank account not found') {
          return NextResponse.json(
            {
              error: 'Bank account not found',
              message: 'The bank account was not found.',
            },
            { status: 404 }
          );
        }
      }

      return NextResponse.json(
        {
          error: 'Failed to get bank account',
          message: 'Failed to retrieve bank account. Please try again.',
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Get bank account endpoint error:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to retrieve bank account. Please try again.',
      },
      { status: 500 }
    );
  }
}