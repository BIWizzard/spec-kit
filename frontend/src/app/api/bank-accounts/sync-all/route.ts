import { NextRequest, NextResponse } from 'next/server';
import { BankService } from '@/lib/services/bank.service';
import jwt from 'jsonwebtoken';

export interface SyncAllBankAccountsResponse {
  message: string;
  results: {
    totalAccounts: number;
    successCount: number;
    errorCount: number;
    syncResults: Array<{
      accountId: string;
      status: 'success' | 'error';
      error?: string;
      newCount?: number;
      updatedCount?: number;
    }>;
  };
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

    // Sync all bank accounts for the family
    const syncResults = await BankService.syncAllBankAccounts(familyId);

    const response: SyncAllBankAccountsResponse = {
      message: `Sync completed for ${syncResults.totalAccounts} accounts`,
      results: {
        totalAccounts: syncResults.totalAccounts,
        successCount: syncResults.successCount,
        errorCount: syncResults.errorCount,
        syncResults: syncResults.results,
      },
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Bank accounts sync error:', error);

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

      if (error.message.includes('Plaid') || error.message.includes('sync')) {
        return NextResponse.json(
          {
            error: 'Sync Failed',
            message: error.message,
          },
          { status: 422 }
        );
      }
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to sync bank accounts. Please try again.',
      },
      { status: 500 }
    );
  }
}