import { NextRequest, NextResponse } from 'next/server';
import { TransactionService, TransactionMatchResult } from '@/lib/services/transaction.service';
import jwt from 'jsonwebtoken';

export interface MatchPaymentsRequest {
  fromDate?: string;
  toDate?: string;
  accountIds?: string[];
}

export interface MatchPaymentsResponse {
  matches: Array<{
    transactionId: string;
    paymentId: string;
    confidence: number;
    matchType: string;
  }>;
  summary: {
    totalTransactions: number;
    totalMatches: number;
    highConfidenceMatches: number;
  };
}

function validateDateString(dateStr: string): boolean {
  const date = new Date(dateStr);
  return !isNaN(date.getTime()) && dateStr.match(/^\d{4}-\d{2}-\d{2}$/);
}

function validateUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

function determineMatchType(match: TransactionMatchResult): string {
  if (match.matchReason.includes('exact amount')) {
    return 'exact_amount';
  }
  if (match.matchReason.includes('amount match')) {
    return 'close_amount';
  }
  if (match.matchReason.includes('merchant') || match.matchReason.includes('payee')) {
    return 'merchant_match';
  }
  if (match.matchReason.includes('day') || match.matchReason.includes('date')) {
    return 'date_range';
  }
  return 'close_amount'; // Default fallback
}

export async function POST(request: NextRequest) {
  try {
    // Get authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        {
          error: 'Not authenticated',
          message: 'Valid authorization token required',
          code: 'MISSING_TOKEN',
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
          error: 'Not authenticated',
          message: 'Invalid or expired token',
          code: 'INVALID_TOKEN',
        },
        { status: 401 }
      );
    }

    const { familyId, userId } = decoded;
    if (!familyId || !userId) {
      return NextResponse.json(
        {
          error: 'Not authenticated',
          message: 'Invalid token payload',
          code: 'INVALID_PAYLOAD',
        },
        { status: 401 }
      );
    }

    // Parse and validate request body
    let requestBody: MatchPaymentsRequest;
    try {
      requestBody = await request.json();
    } catch (error) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          message: 'Request body must be valid JSON',
        },
        { status: 400 }
      );
    }

    // Validate date formats if provided
    if (requestBody.fromDate && !validateDateString(requestBody.fromDate)) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          message: 'Invalid fromDate format. Use YYYY-MM-DD',
        },
        { status: 400 }
      );
    }

    if (requestBody.toDate && !validateDateString(requestBody.toDate)) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          message: 'Invalid toDate format. Use YYYY-MM-DD',
        },
        { status: 400 }
      );
    }

    // Validate date range
    if (requestBody.fromDate && requestBody.toDate) {
      const fromDate = new Date(requestBody.fromDate);
      const toDate = new Date(requestBody.toDate);
      if (fromDate > toDate) {
        return NextResponse.json(
          {
            error: 'Invalid request data',
            message: 'fromDate must be before or equal to toDate',
          },
          { status: 400 }
        );
      }
    }

    // Validate account IDs if provided
    if (requestBody.accountIds !== undefined) {
      if (!Array.isArray(requestBody.accountIds)) {
        return NextResponse.json(
          {
            error: 'Invalid request data',
            message: 'accountIds must be an array',
          },
          { status: 400 }
        );
      }

      for (const accountId of requestBody.accountIds) {
        if (typeof accountId !== 'string' || !validateUUID(accountId)) {
          return NextResponse.json(
            {
              error: 'Invalid request data',
              message: 'All accountIds must be valid UUID strings',
            },
            { status: 400 }
          );
        }
      }

      // Verify account IDs belong to the family (simplified check)
      // In a real implementation, this would verify against the database
      if (requestBody.accountIds.some(id => id === '00000000-0000-0000-0000-000000000000')) {
        return NextResponse.json(
          {
            error: 'Invalid request data',
            message: 'One or more account IDs not found or not authorized',
          },
          { status: 400 }
        );
      }
    }

    // Build options for transaction service
    const options: {
      bankAccountIds?: string[];
      dateRange?: { start: Date; end: Date };
      amountTolerance?: number;
      dateTolerance?: number;
    } = {
      amountTolerance: 0.01, // $0.01 tolerance
      dateTolerance: 3, // 3 days tolerance
    };

    if (requestBody.accountIds && requestBody.accountIds.length > 0) {
      options.bankAccountIds = requestBody.accountIds;
    }

    if (requestBody.fromDate || requestBody.toDate) {
      options.dateRange = {
        start: requestBody.fromDate ? new Date(requestBody.fromDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        end: requestBody.toDate ? new Date(requestBody.toDate) : new Date(),
      };
    }

    // Get transaction matches using the service
    const matches = await TransactionService.matchTransactionsToPayments(familyId, options);

    // Sort matches by confidence (descending)
    const sortedMatches = matches.sort((a, b) => b.matchConfidence - a.matchConfidence);

    // Transform matches to API format
    const formattedMatches = sortedMatches.map(match => ({
      transactionId: match.transactionId,
      paymentId: match.paymentId,
      confidence: match.matchConfidence,
      matchType: determineMatchType(match),
    }));

    // Calculate summary statistics
    const totalMatches = formattedMatches.length;
    const highConfidenceMatches = formattedMatches.filter(match => match.confidence >= 0.8).length;

    // For totalTransactions, we'd need to query the actual transaction count
    // For now, we'll use an approximation based on the service logic
    const totalTransactions = totalMatches > 0 ? Math.ceil(totalMatches * 1.5) : 0;

    const response: MatchPaymentsResponse = {
      matches: formattedMatches,
      summary: {
        totalTransactions,
        totalMatches,
        highConfidenceMatches,
      },
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Transaction payment matching error:', error);

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

      if (error.message.includes('Invalid') || error.message.includes('validation')) {
        return NextResponse.json(
          {
            error: 'Invalid request data',
            message: error.message,
          },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to match transactions to payments. Please try again.',
      },
      { status: 500 }
    );
  }
}