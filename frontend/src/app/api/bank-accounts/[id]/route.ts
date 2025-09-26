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

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { accountName } = body;
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

    // Validate request data
    if (!accountName || typeof accountName !== 'string') {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          message: 'Account name must be a non-empty string.',
        },
        { status: 400 }
      );
    }

    if (accountName.length < 1 || accountName.length > 255) {
      return NextResponse.json(
        {
          error: 'Invalid account name',
          message: 'Account name must be between 1 and 255 characters.',
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
      // Update bank account
      const updatedAccount = await BankService.updateBankAccount(
        familyId,
        accountId,
        { accountName }
      );

      // Format response using existing BankAccountResponse interface
      const response: BankAccountResponse = {
        bankAccount: {
          id: updatedAccount.id,
          familyId: updatedAccount.familyId,
          plaidAccountId: updatedAccount.plaidAccountId,
          plaidItemId: updatedAccount.plaidItemId,
          institutionName: updatedAccount.institutionName,
          institutionId: updatedAccount.institutionId,
          accountName: updatedAccount.accountName,
          accountType: updatedAccount.accountType as 'checking' | 'savings' | 'credit' | 'loan',
          accountSubtype: updatedAccount.accountSubtype,
          accountNumber: updatedAccount.accountNumber,
          currentBalance: updatedAccount.currentBalance.toString(),
          availableBalance: updatedAccount.availableBalance?.toString() || '0',
          lastSyncAt: updatedAccount.lastSyncAt?.toISOString() || '',
          syncStatus: updatedAccount.syncStatus as 'active' | 'error' | 'disconnected',
          createdAt: updatedAccount.createdAt.toISOString(),
          updatedAt: updatedAccount.updatedAt.toISOString(),
          deletedAt: updatedAccount.deletedAt?.toISOString() || null,
        },
      };

      return NextResponse.json(response, { status: 200 });
    } catch (serviceError) {
      console.error('Update bank account error:', serviceError);

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
              message: 'You do not have permission to update this bank account.',
            },
            { status: 403 }
          );
        }

        if (serviceError.message.includes('Invalid')) {
          return NextResponse.json(
            {
              error: 'Invalid request data',
              message: serviceError.message,
            },
            { status: 400 }
          );
        }
      }

      return NextResponse.json(
        {
          error: 'Failed to update bank account',
          message: 'Failed to update bank account. Please try again.',
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Update bank account endpoint error:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to update bank account. Please try again.',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
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
      // Check if account exists and user has permission before deletion
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

      // Delete bank account (soft delete)
      await BankService.deleteBankAccount(familyId, accountId);

      return NextResponse.json(
        {
          message: 'Bank account disconnected successfully.',
        },
        { status: 200 }
      );
    } catch (serviceError) {
      console.error('Delete bank account error:', serviceError);

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
              message: 'You do not have permission to disconnect this bank account.',
            },
            { status: 403 }
          );
        }
      }

      return NextResponse.json(
        {
          error: 'Failed to disconnect bank account',
          message: 'Failed to disconnect bank account. Please try again.',
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Delete bank account endpoint error:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to disconnect bank account. Please try again.',
      },
      { status: 500 }
    );
  }
}