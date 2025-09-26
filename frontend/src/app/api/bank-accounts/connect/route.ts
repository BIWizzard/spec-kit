import { NextRequest, NextResponse } from 'next/server';
import { BankService, ConnectBankAccountData } from '@/lib/services/bank.service';
import jwt from 'jsonwebtoken';

export interface ConnectBankAccountResponse {
  message: string;
  bankAccounts: Array<{
    id: string;
    institutionName: string;
    accountName: string;
    accountType: 'checking' | 'savings' | 'credit' | 'loan';
    accountNumber: string;
    currentBalance: number;
    availableBalance: number;
    syncStatus: 'active' | 'error' | 'disconnected';
  }>;
}

export async function POST(request: NextRequest) {
  try {
    // Get authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        {
          error: 'Unauthorized',
          message: 'Valid authorization token required',
        },
        { status: 401 }
      );
    }

    // Extract and verify JWT token
    const token = authHeader.substring(7);
    const jwtSecret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'dev-jwt-secret-change-this-in-production-make-it-really-long';

    let decoded: any;
    try {
      decoded = jwt.verify(token, jwtSecret);
    } catch (error) {
      return NextResponse.json(
        {
          error: 'Unauthorized',
          message: 'Invalid or expired token',
        },
        { status: 401 }
      );
    }

    const { familyId, userId } = decoded;
    if (!familyId || !userId) {
      return NextResponse.json(
        {
          error: 'Unauthorized',
          message: 'Invalid token payload',
        },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { publicToken, metadata } = body as ConnectBankAccountData;

    if (!publicToken || !metadata) {
      return NextResponse.json(
        {
          error: 'Bad Request',
          message: 'publicToken and metadata are required',
        },
        { status: 400 }
      );
    }

    // Validate metadata structure
    if (!metadata.institution || !metadata.accounts || !Array.isArray(metadata.accounts)) {
      return NextResponse.json(
        {
          error: 'Bad Request',
          message: 'Invalid metadata format: institution and accounts array required',
        },
        { status: 400 }
      );
    }

    // Connect bank account using service
    const bankAccounts = await BankService.connectBankAccount(familyId, userId, {
      publicToken,
      metadata,
    });

    const response: ConnectBankAccountResponse = {
      message: `Successfully connected ${bankAccounts.length} bank account(s)`,
      bankAccounts: bankAccounts.map(account => ({
        id: account.id,
        institutionName: account.institutionName,
        accountName: account.accountName,
        accountType: account.accountType as 'checking' | 'savings' | 'credit' | 'loan',
        accountNumber: account.accountNumber,
        currentBalance: parseFloat(account.currentBalance.toString()),
        availableBalance: parseFloat(account.availableBalance.toString()),
        syncStatus: account.syncStatus as 'active' | 'error' | 'disconnected',
      })),
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Bank account connection error:', error);

    if (error instanceof Error) {
      if (error.message.includes('not found') || error.message.includes('not authorized')) {
        return NextResponse.json(
          {
            error: 'Not Found',
            message: error.message,
          },
          { status: 404 }
        );
      }

      if (error.message.includes('permissions') || error.message.includes('Insufficient')) {
        return NextResponse.json(
          {
            error: 'Forbidden',
            message: error.message,
          },
          { status: 403 }
        );
      }

      if (error.message.includes('Plaid') || error.message.includes('connect') || error.message.includes('public_token')) {
        return NextResponse.json(
          {
            error: 'Connection Failed',
            message: error.message,
          },
          { status: 422 }
        );
      }

      if (error.message.includes('duplicate') || error.message.includes('already exists')) {
        return NextResponse.json(
          {
            error: 'Conflict',
            message: 'Bank account already connected',
          },
          { status: 409 }
        );
      }
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to connect bank account. Please try again.',
      },
      { status: 500 }
    );
  }
}