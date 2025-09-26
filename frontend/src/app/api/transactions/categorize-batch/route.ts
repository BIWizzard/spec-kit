import { NextRequest, NextResponse } from 'next/server';
import { TransactionService, BatchCategorizeData } from '@/lib/services/transaction.service';
import { ValidationService } from '@/lib/services/validation.service';
import jwt from 'jsonwebtoken';

interface BatchCategorizeRequest {
  transactionIds: string[];
  spendingCategoryId: string;
  userCategorized?: boolean;
}

interface BatchCategorizeResponse {
  updated: string[];
  errors: Array<{
    transactionId: string;
    error: string;
  }>;
  summary: {
    totalRequested: number;
    totalUpdated: number;
    totalErrors: number;
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

export async function POST(request: NextRequest) {
  try {
    // Extract user from JWT token
    let familyId: string;
    try {
      const tokenData = await extractUserFromToken(request);
      familyId = tokenData.familyId;
    } catch (tokenError) {
      return NextResponse.json(
        {
          error: 'Not authenticated',
          message: tokenError.message === 'No token provided'
            ? 'Authentication token is required.'
            : 'The provided token is invalid or expired.',
          code: 'AUTH_ERROR',
        },
        { status: 401 }
      );
    }

    // Parse request body
    const body: BatchCategorizeRequest = await request.json();
    const { transactionIds, spendingCategoryId, userCategorized = true } = body;

    // Validate required fields
    if (!transactionIds || !Array.isArray(transactionIds) || transactionIds.length === 0) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          message: 'Transaction IDs array is required and must not be empty.',
          code: 'VALIDATION_ERROR',
        },
        { status: 400 }
      );
    }

    if (!spendingCategoryId || typeof spendingCategoryId !== 'string') {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          message: 'Spending category ID is required and must be a string.',
          code: 'VALIDATION_ERROR',
        },
        { status: 400 }
      );
    }

    // Validate batch size limit (100 max per contract test)
    if (transactionIds.length > 100) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          message: 'Maximum batch size is 100 transactions.',
          code: 'VALIDATION_ERROR',
        },
        { status: 400 }
      );
    }

    // Validate transaction IDs format (should be valid UUIDs)
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const invalidIds = transactionIds.filter(id => typeof id !== 'string' || !uuidPattern.test(id));

    if (invalidIds.length > 0) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          message: 'One or more transaction IDs have invalid UUID format.',
          code: 'VALIDATION_ERROR',
        },
        { status: 400 }
      );
    }

    // Validate spending category ID format
    if (!uuidPattern.test(spendingCategoryId)) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          message: 'Spending category ID has invalid UUID format.',
          code: 'VALIDATION_ERROR',
        },
        { status: 400 }
      );
    }

    // Remove duplicate transaction IDs
    const uniqueTransactionIds = [...new Set(transactionIds)];

    // Prepare batch categorize data
    const batchData: BatchCategorizeData = {
      transactionIds: uniqueTransactionIds,
      spendingCategoryId,
      userCategorized,
    };

    try {
      // Call service to perform batch categorization
      const result = await TransactionService.batchCategorizeTransactions(familyId, batchData);

      // Determine which transactions were successfully updated vs had errors
      const updatedIds = uniqueTransactionIds.filter(id =>
        !result.errors.some(error => error.transactionId === id)
      );

      const response: BatchCategorizeResponse = {
        updated: updatedIds,
        errors: result.errors,
        summary: {
          totalRequested: uniqueTransactionIds.length,
          totalUpdated: result.updatedCount,
          totalErrors: result.errors.length,
        }
      };

      return NextResponse.json(response, { status: 200 });

    } catch (serviceError) {
      console.error('Batch categorize service error:', serviceError);

      if (serviceError instanceof Error) {
        // Handle specific service errors
        if (serviceError.message.includes('category not found') ||
            serviceError.message.includes('not authorized')) {
          return NextResponse.json(
            {
              error: 'Invalid request data',
              message: 'Spending category not found or not authorized for this family.',
              code: 'CATEGORY_ERROR',
            },
            { status: 400 }
          );
        }
      }

      return NextResponse.json(
        {
          error: 'Internal server error',
          message: 'Failed to categorize transactions. Please try again.',
          code: 'SERVICE_ERROR',
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Batch categorize endpoint error:', error);

    // Handle JSON parsing errors
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          message: 'Invalid JSON in request body.',
          code: 'PARSE_ERROR',
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to process batch categorization request. Please try again.',
        code: 'SERVER_ERROR',
      },
      { status: 500 }
    );
  }
}