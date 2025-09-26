import { NextRequest, NextResponse } from 'next/server';
import { BankService, BankAccountFilter } from '@/lib/services/bank.service';
import jwt from 'jsonwebtoken';

interface BankAccountInfo {
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
  currentBalance: number;
  availableBalance: number;
  lastSyncAt: string | null;
  syncStatus: 'active' | 'error' | 'disconnected';
  createdAt: string;
  updatedAt: string;
}

interface BankAccountsResponse {
  accounts: BankAccountInfo[];
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

export async function GET(request: NextRequest) {
  try {
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
      // Parse query parameters
      const { searchParams } = new URL(request.url);
      const includeDisconnected = searchParams.get('includeDisconnected') === 'true';
      const accountType = searchParams.get('accountType') as 'checking' | 'savings' | 'credit' | 'loan' | undefined;
      const syncStatus = searchParams.get('syncStatus') as 'active' | 'error' | 'disconnected' | undefined;

      const filter: BankAccountFilter = {
        includeDisconnected,
        accountType,
        syncStatus,
      };

      // Get bank accounts
      const accounts = await BankService.getBankAccounts(familyId, filter);

      const bankAccountsInfo: BankAccountInfo[] = accounts.map(account => ({
        id: account.id,
        familyId: account.familyId,
        plaidAccountId: account.plaidAccountId,
        plaidItemId: account.plaidItemId,
        institutionName: account.institutionName,
        institutionId: account.institutionId,
        accountName: account.accountName,
        accountType: account.accountType,
        accountSubtype: account.accountSubtype,
        accountNumber: account.accountNumber,
        currentBalance: Number(account.currentBalance),
        availableBalance: Number(account.availableBalance),
        lastSyncAt: account.lastSyncAt?.toISOString() || null,
        syncStatus: account.syncStatus,
        createdAt: account.createdAt.toISOString(),
        updatedAt: account.updatedAt.toISOString(),
      }));

      const response: BankAccountsResponse = {
        accounts: bankAccountsInfo,
      };

      return NextResponse.json(response);
    } catch (serviceError) {
      console.error('Get bank accounts error:', serviceError);

      return NextResponse.json(
        {
          error: 'Failed to get bank accounts',
          message: 'Failed to retrieve bank accounts. Please try again.',
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Get bank accounts endpoint error:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to retrieve bank accounts. Please try again.',
      },
      { status: 500 }
    );
  }
}