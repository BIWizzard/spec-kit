import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { PaymentService } from '@/lib/services/payment.service';

export interface OverduePaymentInfo {
  id: string;
  payee: string;
  amount: number;
  dueDate: string;
  daysPastDue: number;
  status: string;
  spendingCategory: {
    name: string;
    color: string;
  };
  autoPayEnabled: boolean;
}

export interface OverduePaymentsResponse {
  message: string;
  payments: OverduePaymentInfo[];
  summary: {
    totalAmount: number;
    count: number;
    oldestDaysPastDue: number;
  };
}

export async function GET(request: NextRequest) {
  try {
    // Extract JWT token from Authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        {
          error: 'No token provided',
          message: 'Authentication token is required.',
        },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    let familyId: string;

    try {
      const jwtSecret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'dev-jwt-secret-change-this-in-production-make-it-really-long';
      const decoded = jwt.verify(token, jwtSecret) as any;

      if (!decoded || !decoded.familyId) {
        return NextResponse.json(
          {
            error: 'Invalid token',
            message: 'The provided token is invalid.',
          },
          { status: 401 }
        );
      }
      familyId = decoded.familyId;
    } catch (jwtError) {
      return NextResponse.json(
        {
          error: 'Invalid token',
          message: 'The provided token is invalid or expired.',
        },
        { status: 401 }
      );
    }

    try {
      const payments = await PaymentService.getOverduePayments(familyId);
      const today = new Date();

      const paymentData: OverduePaymentInfo[] = payments.map((payment) => {
        const dueDate = new Date(payment.dueDate);
        const daysPastDue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

        return {
          id: payment.id,
          payee: payment.payee,
          amount: payment.amount.toNumber(),
          dueDate: payment.dueDate.toISOString().split('T')[0],
          daysPastDue: Math.max(0, daysPastDue),
          status: payment.status,
          spendingCategory: {
            name: (payment as any).spendingCategory?.name || 'Unknown',
            color: (payment as any).spendingCategory?.color || '#000000',
          },
          autoPayEnabled: payment.autoPayEnabled,
        };
      });

      const totalAmount = paymentData.reduce((sum, payment) => sum + payment.amount, 0);
      const oldestDaysPastDue = paymentData.length > 0
        ? Math.max(...paymentData.map(p => p.daysPastDue))
        : 0;

      const response: OverduePaymentsResponse = {
        message: 'Overdue payments retrieved successfully.',
        payments: paymentData,
        summary: {
          totalAmount,
          count: paymentData.length,
          oldestDaysPastDue,
        },
      };

      return NextResponse.json(response, { status: 200 });
    } catch (serviceError) {
      console.error('Get overdue payments error:', serviceError);

      return NextResponse.json(
        {
          error: 'Failed to get overdue payments',
          message: 'Failed to retrieve overdue payments. Please try again.',
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Get overdue payments endpoint error:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to retrieve overdue payments. Please try again.',
      },
      { status: 500 }
    );
  }
}