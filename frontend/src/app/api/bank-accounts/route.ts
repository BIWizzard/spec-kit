import { NextRequest, NextResponse } from 'next/server';
import { BankService, BankAccountFilter, ConnectBankAccountData } from '@/lib/services/bank.service';
import { ValidationService } from '@/lib/services/validation.service';
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

interface ConnectBankAccountRequest {
  publicToken: string;
  metadata: {
    institution: {
      name: string;
      institution_id: string;
    };
    accounts: Array<{
      id: string;
      name: string;
      mask: string;
      type: string;
      subtype: string;
    }>;
  };
}

interface ConnectBankAccountResponse {
  message: string;
  bankAccounts: Array<{
    id: string;
    institutionName: string;
    accountName: string;
    accountType: string;
    accountNumber: string;
    currentBalance: string;
    availableBalance: string;
    syncStatus: string;
    lastSyncAt: string;
  }>;
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { publicToken, metadata }: ConnectBankAccountRequest = body;

    // Extract user from JWT token
    let familyId: string;
    let userId: string;
    try {
      const tokenData = await extractUserFromToken(request);
      familyId = tokenData.familyId;
      userId = tokenData.userId;
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

    // Validate input
    const validationErrors = ValidationService.validateConnectBankAccount({
      publicToken,
      metadata,
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

    try {
      const connectData: ConnectBankAccountData = {
        publicToken,
        metadata,
      };

      // Connect bank account through service
      const bankAccounts = await BankService.connectBankAccount(familyId, userId, connectData);

      const response: ConnectBankAccountResponse = {
        message: 'Bank accounts connected successfully.',
        bankAccounts: bankAccounts.map(account => ({
          id: account.id,
          institutionName: account.institutionName,
          accountName: account.accountName,
          accountType: account.accountType,
          accountNumber: account.accountNumber,
          currentBalance: account.currentBalance.toString(),
          availableBalance: account.availableBalance.toString(),
          syncStatus: account.syncStatus,
          lastSyncAt: account.lastSyncAt.toISOString(),
        })),
      };

      return NextResponse.json(response, { status: 201 });
    } catch (serviceError) {
      console.error('Connect bank account error:', serviceError);

      if (serviceError instanceof Error) {
        if (serviceError.message.includes('not authorized') || serviceError.message.includes('not found')) {
          return NextResponse.json(
            {
              error: 'Authorization error',
              message: 'User not found or not authorized to connect bank accounts.',
            },
            { status: 403 }
          );
        }

        if (serviceError.message.includes('Insufficient permissions')) {
          return NextResponse.json(
            {
              error: 'Insufficient permissions',
              message: 'You do not have permission to connect bank accounts.',
            },
            { status: 403 }
          );
        }

        if (serviceError.message.includes('Plaid') || serviceError.message.includes('link token')) {
          return NextResponse.json(
            {
              error: 'Bank connection error',
              message: 'Failed to connect to banking provider. Please try again.',
            },
            { status: 400 }
          );
        }
      }

      return NextResponse.json(
        {
          error: 'Failed to connect bank account',
          message: 'Failed to connect bank account. Please try again.',
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Connect bank account endpoint error:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to connect bank account. Please try again.',
      },
      { status: 500 }
    );
  }
}