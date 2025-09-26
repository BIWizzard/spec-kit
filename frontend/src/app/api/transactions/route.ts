import { NextRequest, NextResponse } from 'next/server';
import { TransactionService, TransactionFilter } from '@/lib/services/transaction.service';
import { ValidationService } from '@/lib/services/validation.service';
import jwt from 'jsonwebtoken';

interface TransactionInfo {
  id: string;
  plaidTransactionId: string;
  amount: number;
  date: string;
  description: string;
  merchantName: string | null;
  pending: boolean;
  spendingCategory: {
    id: string;
    name: string;
    color: string;
    icon: string;
  } | null;
  categoryConfidence: number;
  userCategorized: boolean;
  bankAccount: {
    id: string;
    institutionName: string;
    accountName: string;
  };
}

interface TransactionsResponse {
  transactions: TransactionInfo[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
  summary: {
    totalAmount: number;
    incomeAmount: number;
    expenseAmount: number;
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

function validateQueryParameters(searchParams: URLSearchParams) {
  const errors: string[] = [];

  // Validate pagination parameters
  const limitParam = searchParams.get('limit');
  const offsetParam = searchParams.get('offset');

  let limit = 50; // Default limit
  let offset = 0; // Default offset

  if (limitParam !== null) {
    const parsedLimit = parseInt(limitParam, 10);
    if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 500) {
      errors.push('limit must be a number between 1 and 500');
    } else {
      limit = parsedLimit;
    }
  }

  if (offsetParam !== null) {
    const parsedOffset = parseInt(offsetParam, 10);
    if (isNaN(parsedOffset) || parsedOffset < 0) {
      errors.push('offset must be a non-negative number');
    } else {
      offset = parsedOffset;
    }
  }

  // Validate date parameters
  const fromDate = searchParams.get('fromDate');
  const toDate = searchParams.get('toDate');
  let startDate: Date | undefined;
  let endDate: Date | undefined;

  if (fromDate) {
    const parsedFromDate = new Date(fromDate);
    if (isNaN(parsedFromDate.getTime())) {
      errors.push('fromDate must be a valid date in ISO format');
    } else {
      startDate = parsedFromDate;
    }
  }

  if (toDate) {
    const parsedToDate = new Date(toDate);
    if (isNaN(parsedToDate.getTime())) {
      errors.push('toDate must be a valid date in ISO format');
    } else {
      endDate = parsedToDate;
    }
  }

  // Validate amount parameters
  const minAmountParam = searchParams.get('minAmount');
  const maxAmountParam = searchParams.get('maxAmount');
  let minAmount: number | undefined;
  let maxAmount: number | undefined;

  if (minAmountParam !== null) {
    const parsedMinAmount = parseFloat(minAmountParam);
    if (isNaN(parsedMinAmount) || parsedMinAmount < 0) {
      errors.push('minAmount must be a non-negative number');
    } else {
      minAmount = parsedMinAmount;
    }
  }

  if (maxAmountParam !== null) {
    const parsedMaxAmount = parseFloat(maxAmountParam);
    if (isNaN(parsedMaxAmount) || parsedMaxAmount < 0) {
      errors.push('maxAmount must be a non-negative number');
    } else {
      maxAmount = parsedMaxAmount;
    }
  }

  // Validate accountId (UUID format)
  const accountId = searchParams.get('accountId');
  if (accountId && !ValidationService.isValidUUID(accountId)) {
    errors.push('accountId must be a valid UUID');
  }

  // Validate pending parameter
  const pendingParam = searchParams.get('pending');
  let pending: boolean | undefined;
  if (pendingParam !== null) {
    if (pendingParam === 'true') {
      pending = true;
    } else if (pendingParam === 'false') {
      pending = false;
    } else {
      errors.push('pending must be true or false');
    }
  }

  // Validate sorting parameters
  const sortBy = searchParams.get('sortBy');
  const sortOrder = searchParams.get('sortOrder');

  if (sortBy && !['date', 'amount', 'description', 'merchantName'].includes(sortBy)) {
    errors.push('sortBy must be one of: date, amount, description, merchantName');
  }

  if (sortOrder && !['asc', 'desc'].includes(sortOrder)) {
    errors.push('sortOrder must be asc or desc');
  }

  // Validate search term
  const search = searchParams.get('search');

  return {
    errors,
    validatedParams: {
      limit,
      offset,
      startDate,
      endDate,
      minAmount,
      maxAmount,
      accountId,
      pending,
      sortBy,
      sortOrder,
      search,
    }
  };
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
          error: 'Not authenticated',
          message: tokenError.message === 'No token provided'
            ? 'Authentication token is required.'
            : 'The provided token is invalid or expired.',
          code: 'AUTH_REQUIRED'
        },
        { status: 401 }
      );
    }

    try {
      // Parse and validate query parameters
      const { searchParams } = new URL(request.url);
      const { errors, validatedParams } = validateQueryParameters(searchParams);

      if (errors.length > 0) {
        return NextResponse.json(
          {
            error: 'Invalid request data',
            message: 'One or more parameters are invalid.',
            details: errors,
          },
          { status: 400 }
        );
      }

      const {
        limit,
        offset,
        startDate,
        endDate,
        minAmount,
        maxAmount,
        accountId,
        pending,
        search,
      } = validatedParams;

      // Build transaction filter
      const filter: TransactionFilter = {
        ...(accountId && { bankAccountIds: [accountId] }),
        ...(startDate && { startDate }),
        ...(endDate && { endDate }),
        ...(pending !== undefined && { pending }),
        ...(search && { searchTerm: search }),
        ...(minAmount !== undefined || maxAmount !== undefined ? {
          amountRange: {
            ...(minAmount !== undefined && { min: minAmount }),
            ...(maxAmount !== undefined && { max: maxAmount }),
          }
        } : {}),
      };

      // Get transactions from service
      const { transactions, total } = await TransactionService.getTransactions(
        familyId,
        filter,
        limit,
        offset
      );

      // Transform transactions to API format
      const transactionInfos: TransactionInfo[] = transactions.map(transaction => ({
        id: transaction.id,
        plaidTransactionId: transaction.plaidTransactionId,
        amount: Number(transaction.amount),
        date: transaction.date.toISOString(),
        description: transaction.description,
        merchantName: transaction.merchantName,
        pending: transaction.pending,
        spendingCategory: transaction.spendingCategory ? {
          id: transaction.spendingCategory.id,
          name: transaction.spendingCategory.name,
          color: transaction.spendingCategory.color,
          icon: transaction.spendingCategory.icon,
        } : null,
        categoryConfidence: Number(transaction.categoryConfidence),
        userCategorized: transaction.userCategorized,
        bankAccount: {
          id: transaction.bankAccount.id,
          institutionName: transaction.bankAccount.institutionName,
          accountName: transaction.bankAccount.accountName,
        },
      }));

      // Calculate summary statistics
      const summary = {
        totalAmount: transactions.reduce((sum, t) => sum + Number(t.amount), 0),
        incomeAmount: transactions.filter(t => Number(t.amount) > 0).reduce((sum, t) => sum + Number(t.amount), 0),
        expenseAmount: Math.abs(transactions.filter(t => Number(t.amount) < 0).reduce((sum, t) => sum + Number(t.amount), 0)),
      };

      const response: TransactionsResponse = {
        transactions: transactionInfos,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total,
        },
        summary,
      };

      // Set cache headers (short TTL for financial data)
      const headers = {
        'Cache-Control': 'max-age=60, must-revalidate',
      };

      return NextResponse.json(response, { status: 200, headers });
    } catch (serviceError) {
      console.error('Get transactions error:', serviceError);

      return NextResponse.json(
        {
          error: 'Failed to get transactions',
          message: 'Failed to retrieve transactions. Please try again.',
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Get transactions endpoint error:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to retrieve transactions. Please try again.',
      },
      { status: 500 }
    );
  }
}