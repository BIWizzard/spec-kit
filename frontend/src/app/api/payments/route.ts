import { NextRequest, NextResponse } from 'next/server';
import { PaymentService, PaymentFilters, CreatePaymentData } from '@/lib/services/payment.service';
import { authenticateRequest, AuthenticationError } from '@/lib/middleware/auth';

export interface GetPaymentsResponse {
  payments: any[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  filters: PaymentFilters;
}

export async function GET(request: NextRequest) {
  try {
    // Authenticate the request
    const user = authenticateRequest(request);

    // Extract query parameters
    const { searchParams } = new URL(request.url);

    // Pagination parameters
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100); // Cap at 100
    const offset = (page - 1) * limit;

    // Build filters from query parameters
    const filters: PaymentFilters = {};

    if (searchParams.has('status')) {
      const status = searchParams.get('status');
      if (['scheduled', 'paid', 'overdue', 'cancelled', 'partial'].includes(status || '')) {
        filters.status = status as PaymentFilters['status'];
      }
    }

    if (searchParams.has('startDate')) {
      try {
        filters.startDate = new Date(searchParams.get('startDate')!);
      } catch (error) {
        return NextResponse.json(
          {
            error: 'Invalid startDate format',
            message: 'startDate must be a valid ISO date string',
          },
          { status: 400 }
        );
      }
    }

    if (searchParams.has('endDate')) {
      try {
        filters.endDate = new Date(searchParams.get('endDate')!);
      } catch (error) {
        return NextResponse.json(
          {
            error: 'Invalid endDate format',
            message: 'endDate must be a valid ISO date string',
          },
          { status: 400 }
        );
      }
    }

    if (searchParams.has('spendingCategoryId')) {
      filters.spendingCategoryId = searchParams.get('spendingCategoryId')!;
    }

    if (searchParams.has('paymentType')) {
      const paymentType = searchParams.get('paymentType');
      if (['once', 'recurring', 'variable'].includes(paymentType || '')) {
        filters.paymentType = paymentType as PaymentFilters['paymentType'];
      }
    }

    if (searchParams.has('search')) {
      filters.search = searchParams.get('search')!;
    }

    if (searchParams.has('overdueOnly') && searchParams.get('overdueOnly') === 'true') {
      filters.overdueOnly = true;
    }

    // Validate date range
    if (filters.startDate && filters.endDate && filters.startDate >= filters.endDate) {
      return NextResponse.json(
        {
          error: 'Invalid date range',
          message: 'startDate must be before endDate',
        },
        { status: 400 }
      );
    }

    // Get payments from service
    const payments = await PaymentService.getPayments(
      user.familyId,
      filters,
      limit,
      offset
    );

    // Get total count for pagination (simplified approach)
    // In a production environment, you might want to optimize this with a separate count query
    const totalPayments = await PaymentService.getPayments(
      user.familyId,
      filters,
      1000, // Large number to get approximate total
      0
    );
    const total = totalPayments.length;
    const totalPages = Math.ceil(total / limit);

    const response: GetPaymentsResponse = {
      payments: payments.map(payment => ({
        id: payment.id,
        payee: payment.payee,
        amount: payment.amount.toString(),
        dueDate: payment.dueDate.toISOString(),
        paidDate: payment.paidDate?.toISOString() || null,
        paidAmount: payment.paidAmount?.toString() || null,
        status: payment.status,
        paymentType: payment.paymentType,
        frequency: payment.frequency,
        nextDueDate: payment.nextDueDate?.toISOString() || null,
        autoPayEnabled: payment.autoPayEnabled,
        notes: payment.notes,
        spendingCategory: payment.spendingCategory ? {
          id: payment.spendingCategoryId,
          name: payment.spendingCategory.name,
          color: payment.spendingCategory.color,
          icon: payment.spendingCategory.icon,
        } : null,
        createdAt: payment.createdAt.toISOString(),
        updatedAt: payment.updatedAt.toISOString(),
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
      filters,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('GET /api/payments error:', error);

    if (error instanceof AuthenticationError) {
      return NextResponse.json(
        {
          error: 'Authentication failed',
          message: error.message,
        },
        { status: error.statusCode }
      );
    }

    if (error instanceof Error) {
      // Handle specific known errors
      if (error.message.includes('Invalid spending category')) {
        return NextResponse.json(
          {
            error: 'Invalid filter',
            message: 'The specified spending category does not exist or is inactive',
          },
          { status: 400 }
        );
      }

      if (error.message.includes('database') || error.message.includes('connection')) {
        return NextResponse.json(
          {
            error: 'Database error',
            message: 'Unable to retrieve payments at this time',
          },
          { status: 503 }
        );
      }
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to retrieve payments',
      },
      { status: 500 }
    );
  }
}

export interface CreatePaymentRequest {
  payee: string;
  amount: number;
  dueDate: string;
  paymentType: 'once' | 'recurring' | 'variable';
  frequency?: 'once' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'annual';
  spendingCategoryId: string;
  autoPayEnabled?: boolean;
  notes?: string;
  autoAttribute?: boolean;
}

export interface CreatePaymentResponse {
  id: string;
  payee: string;
  amount: number;
  dueDate: string;
  paymentType: string;
  frequency: string | null;
  status: string;
  spendingCategory: {
    id: string;
    name: string;
    color: string;
    icon: string;
  };
  autoPayEnabled: boolean;
  attributedAmount: number;
  remainingAmount: number;
  notes: string | null;
  nextDueDate?: string;
  createdAt: string;
  updatedAt: string;
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate the request
    const user = authenticateRequest(request);

    // Parse request body
    const body = await request.json();
    const {
      payee,
      amount,
      dueDate,
      paymentType,
      frequency,
      spendingCategoryId,
      autoPayEnabled,
      notes,
      autoAttribute
    }: CreatePaymentRequest = body;

    // Validate required fields
    if (!payee || typeof payee !== 'string' || payee.trim().length === 0) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          message: 'Payee is required and must be a non-empty string.'
        },
        { status: 400 }
      );
    }

    if (!amount || typeof amount !== 'number' || amount <= 0 || amount > 999999.99) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          message: 'Amount must be a number between 0.01 and 999999.99.'
        },
        { status: 400 }
      );
    }

    if (!dueDate || typeof dueDate !== 'string') {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          message: 'Due date is required and must be a valid date string.'
        },
        { status: 400 }
      );
    }

    // Validate date format
    const parsedDueDate = new Date(dueDate);
    if (isNaN(parsedDueDate.getTime())) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          message: 'Due date must be a valid date format.'
        },
        { status: 400 }
      );
    }

    if (!paymentType || !['once', 'recurring', 'variable'].includes(paymentType)) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          message: 'Payment type must be one of: once, recurring, variable.'
        },
        { status: 400 }
      );
    }

    // Validate frequency for recurring/variable payments
    if ((paymentType === 'recurring' || paymentType === 'variable') && !frequency) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          message: 'Frequency is required for recurring and variable payments.'
        },
        { status: 400 }
      );
    }

    if (frequency && !['once', 'weekly', 'biweekly', 'monthly', 'quarterly', 'annual'].includes(frequency)) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          message: 'Frequency must be one of: once, weekly, biweekly, monthly, quarterly, annual.'
        },
        { status: 400 }
      );
    }

    if (!spendingCategoryId || typeof spendingCategoryId !== 'string') {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          message: 'Spending category ID is required.'
        },
        { status: 400 }
      );
    }

    if (notes && (typeof notes !== 'string' || notes.length > 1000)) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          message: 'Notes must be a string with maximum 1000 characters.'
        },
        { status: 400 }
      );
    }

    // Create payment data
    const createPaymentData: CreatePaymentData = {
      payee: payee.trim(),
      amount,
      dueDate: parsedDueDate,
      paymentType,
      frequency: frequency || 'once',
      spendingCategoryId,
      autoPayEnabled: autoPayEnabled || false,
      notes: notes || null,
    };

    // Create payment through service
    const payment = await PaymentService.createPayment(user.familyId, createPaymentData);

    // Determine payment status based on due date
    const now = new Date();
    const status = parsedDueDate < now ? 'overdue' : 'scheduled';

    // Handle auto-attribution if requested
    let attributedAmount = 0;
    if (autoAttribute) {
      try {
        // Auto-attribution logic would be implemented here
        // For now, we'll return 0 as attributedAmount
      } catch (attributionError) {
        console.warn('Auto-attribution failed:', attributionError);
      }
    }

    const response: CreatePaymentResponse = {
      id: payment.id,
      payee: payment.payee,
      amount: Number(payment.amount),
      dueDate: payment.dueDate.toISOString().split('T')[0],
      paymentType: payment.paymentType,
      frequency: payment.paymentType === 'once' ? null : payment.frequency,
      status: status,
      spendingCategory: {
        id: payment.spendingCategoryId,
        name: 'Default Category',
        color: '#8FAD77',
        icon: 'bill'
      },
      autoPayEnabled: payment.autoPayEnabled,
      attributedAmount,
      remainingAmount: Number(payment.amount) - attributedAmount,
      notes: payment.notes,
      nextDueDate: payment.nextDueDate ? payment.nextDueDate.toISOString().split('T')[0] : undefined,
      createdAt: payment.createdAt.toISOString(),
      updatedAt: payment.updatedAt.toISOString(),
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('POST /api/payments error:', error);

    if (error instanceof AuthenticationError) {
      return NextResponse.json(
        {
          error: 'Not authenticated',
          message: error.message,
        },
        { status: error.statusCode }
      );
    }

    if (error instanceof Error) {
      if (error.message.includes('Invalid spending category')) {
        return NextResponse.json(
          {
            error: 'Insufficient permissions',
            message: 'Invalid spending category or you do not have permission to use it.',
          },
          { status: 403 }
        );
      }

      if (error.message.includes('not found') || error.message.includes('not authorized')) {
        return NextResponse.json(
          {
            error: 'Insufficient permissions',
            message: 'You do not have permission to create payments in this family.',
          },
          { status: 403 }
        );
      }

      if (error.message.includes('database') || error.message.includes('connection')) {
        return NextResponse.json(
          {
            error: 'Database error',
            message: 'Unable to create payment at this time',
          },
          { status: 503 }
        );
      }
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to create payment. Please try again.',
      },
      { status: 500 }
    );
  }
}