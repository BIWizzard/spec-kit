import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { TransactionService } from '@/lib/services/transaction.service';
import { ValidationService } from '@/lib/services/validation.service';

interface UpdateTransactionRequest {
  spendingCategoryId?: string;
  notes?: string;
  userCategorized?: boolean;
  categoryConfidence?: number;
}

interface JwtPayload {
  userId: string;
  familyId: string;
  email: string;
  role: string;
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify JWT token
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        {
          error: 'Authentication required',
          message: 'Authorization header with Bearer token is required',
        },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const jwtSecret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'dev-jwt-secret-change-this-in-production-make-it-really-long';

    let decoded: JwtPayload;
    try {
      decoded = jwt.verify(token, jwtSecret) as JwtPayload;
    } catch (error) {
      return NextResponse.json(
        {
          error: 'Invalid token',
          message: 'Authentication token is invalid or expired',
        },
        { status: 401 }
      );
    }

    const { familyId } = decoded;
    const transactionId = params.id;

    // Parse request body
    const body: UpdateTransactionRequest = await request.json();
    const { spendingCategoryId, notes, userCategorized, categoryConfidence } = body;

    // Validate input
    const validationErrors = ValidationService.validateTransactionUpdate({
      transactionId,
      spendingCategoryId,
      notes,
      userCategorized,
      categoryConfidence,
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

    // Update transaction
    const updatedTransaction = await TransactionService.updateTransaction(
      familyId,
      transactionId,
      {
        ...(spendingCategoryId !== undefined && { spendingCategoryId }),
        ...(notes !== undefined && { notes }),
        ...(userCategorized !== undefined && { userCategorized }),
        ...(categoryConfidence !== undefined && { categoryConfidence }),
      }
    );

    return NextResponse.json({
      message: 'Transaction updated successfully',
      transaction: {
        id: updatedTransaction.id,
        amount: updatedTransaction.amount,
        description: updatedTransaction.description,
        date: updatedTransaction.date,
        merchantName: updatedTransaction.merchantName,
        spendingCategoryId: updatedTransaction.spendingCategoryId,
        notes: updatedTransaction.notes,
        userCategorized: updatedTransaction.userCategorized,
        categoryConfidence: updatedTransaction.categoryConfidence,
        pending: updatedTransaction.pending,
        bankAccountId: updatedTransaction.bankAccountId,
        plaidTransactionId: updatedTransaction.plaidTransactionId,
        plaidCategory: updatedTransaction.plaidCategory,
        createdAt: updatedTransaction.createdAt,
        updatedAt: updatedTransaction.updatedAt,
      },
    });
  } catch (error) {
    console.error('Transaction update error:', error);

    if (error instanceof Error) {
      if (error.message === 'Transaction not found') {
        return NextResponse.json(
          {
            error: 'Transaction not found',
            message: 'The specified transaction does not exist or you do not have permission to access it.',
          },
          { status: 404 }
        );
      }

      if (error.message.includes('category') && error.message.includes('not found')) {
        return NextResponse.json(
          {
            error: 'Invalid category',
            message: 'The specified spending category does not exist or is not active.',
          },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to update transaction. Please try again.',
      },
      { status: 500 }
    );
  }
}