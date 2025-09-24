import { Request, Response } from 'express';
import { PaymentService } from '../../services/payment.service';
import jwt from 'jsonwebtoken';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    familyId: string;
    email: string;
    role: string;
  };
}

export interface PaymentInfo {
  id: string;
  payee: string;
  amount: number;
  dueDate: string;
  paidDate: string | null;
  paidAmount: number | null;
  paymentType: string;
  frequency: string;
  nextDueDate: string | null;
  status: string;
  spendingCategory: {
    name: string;
    color: string;
    icon: string;
  };
  autoPayEnabled: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentsResponse {
  message: string;
  payments: PaymentInfo[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export async function getPayments(req: AuthenticatedRequest, res: Response) {
  try {
    // Extract pagination and filter parameters
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = Math.max(parseInt(req.query.offset as string) || 0, 0);
    const status = req.query.status as string;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;
    const spendingCategoryId = req.query.spendingCategoryId as string;
    const paymentType = req.query.paymentType as string;
    const search = req.query.search as string;
    const overdueOnly = req.query.overdueOnly === 'true';

    // Extract user from JWT token
    const authHeader = req.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'No token provided',
        message: 'Authentication token is required.',
      });
    }

    const token = authHeader.substring(7);

    let familyId: string;
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

      if (!decoded || !decoded.familyId) {
        return res.status(401).json({
          error: 'Invalid token',
          message: 'The provided token is invalid.',
        });
      }

      familyId = decoded.familyId;
    } catch (jwtError) {
      return res.status(401).json({
        error: 'Invalid token',
        message: 'The provided token is invalid or expired.',
      });
    }

    try {
      // Build filters
      const filters: any = {};

      if (status) {
        if (!['scheduled', 'paid', 'overdue', 'cancelled', 'partial'].includes(status)) {
          return res.status(400).json({
            error: 'Invalid status',
            message: 'Status must be one of: scheduled, paid, overdue, cancelled, partial.',
          });
        }
        filters.status = status;
      }

      if (startDate) {
        try {
          filters.startDate = new Date(startDate);
        } catch (err) {
          return res.status(400).json({
            error: 'Invalid start date',
            message: 'Please provide start date in YYYY-MM-DD format.',
          });
        }
      }

      if (endDate) {
        try {
          filters.endDate = new Date(endDate);
        } catch (err) {
          return res.status(400).json({
            error: 'Invalid end date',
            message: 'Please provide end date in YYYY-MM-DD format.',
          });
        }
      }

      if (spendingCategoryId) {
        filters.spendingCategoryId = spendingCategoryId;
      }

      if (paymentType) {
        if (!['once', 'recurring', 'variable'].includes(paymentType)) {
          return res.status(400).json({
            error: 'Invalid payment type',
            message: 'Payment type must be one of: once, recurring, variable.',
          });
        }
        filters.paymentType = paymentType;
      }

      if (search) {
        filters.search = search;
      }

      if (overdueOnly) {
        filters.overdueOnly = true;
      }

      // Get payments
      const payments = await PaymentService.getPayments(familyId, filters, limit, offset);

      // Get total count for pagination - for now, we'll use the returned count
      // In a production system, you'd want a separate count query for exact pagination
      const hasMore = payments.length === limit;

      const paymentData: PaymentInfo[] = payments.map((payment) => ({
        id: payment.id,
        payee: payment.payee,
        amount: payment.amount.toNumber(),
        dueDate: payment.dueDate.toISOString().split('T')[0],
        paidDate: payment.paidDate ? payment.paidDate.toISOString().split('T')[0] : null,
        paidAmount: payment.paidAmount ? payment.paidAmount.toNumber() : null,
        paymentType: payment.paymentType,
        frequency: payment.frequency,
        nextDueDate: payment.nextDueDate ? payment.nextDueDate.toISOString().split('T')[0] : null,
        status: payment.status,
        spendingCategory: {
          name: (payment as any).spendingCategory?.name || 'Unknown',
          color: (payment as any).spendingCategory?.color || '#000000',
          icon: (payment as any).spendingCategory?.icon || 'default',
        },
        autoPayEnabled: payment.autoPayEnabled,
        notes: payment.notes,
        createdAt: payment.createdAt.toISOString(),
        updatedAt: payment.updatedAt.toISOString(),
      }));

      const response: PaymentsResponse = {
        message: 'Payments retrieved successfully.',
        payments: paymentData,
        pagination: {
          total: payments.length, // This would be actual count in production
          limit,
          offset,
          hasMore,
        },
      };

      res.status(200).json(response);
    } catch (serviceError) {
      console.error('Get payments error:', serviceError);

      if (serviceError instanceof Error) {
        if (serviceError.message === 'Family not found') {
          return res.status(404).json({
            error: 'Family not found',
            message: 'The family was not found.',
          });
        }

        if (serviceError.message.includes('Invalid date')) {
          return res.status(400).json({
            error: 'Invalid date format',
            message: 'Please provide dates in YYYY-MM-DD format.',
          });
        }
      }

      res.status(500).json({
        error: 'Failed to get payments',
        message: 'Failed to retrieve payments. Please try again.',
      });
    }
  } catch (error) {
    console.error('Get payments endpoint error:', error);

    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve payments. Please try again.',
    });
  }
}