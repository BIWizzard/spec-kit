import { NextRequest, NextResponse } from 'next/server';
import { PaymentService } from '../../../../lib/services/payment.service';
import jwt from 'jsonwebtoken';

export interface PaymentSummaryResponse {
  summary: {
    totalScheduled: number;
    totalPaid: number;
    totalOverdue: number;
    totalUpcoming: number;
    scheduledCount: number;
    paidCount: number;
    overdueCount: number;
    upcomingCount: number;
    averagePaymentAmount: number;
    monthlyTotal: number;
    upcomingPayments: Array<{
      id: string;
      payee: string;
      amount: number;
      dueDate: string;
      status: string;
      spendingCategory: {
        name: string;
        color?: string;
      };
    }>;
    overduePayments: Array<{
      id: string;
      payee: string;
      amount: number;
      dueDate: string;
      daysPastDue: number;
      spendingCategory: {
        name: string;
        color?: string;
      };
    }>;
  };
}

// T539: GET /api/payments/summary - Get payment summary endpoint migration
export async function GET(request: NextRequest) {
  try {
    // Extract token from Authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({
        error: 'No token provided',
        message: 'Authentication token is required.',
      }, { status: 401 });
    }

    const token = authHeader.substring(7);

    let familyId: string;
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

      if (!decoded || !decoded.familyId) {
        return NextResponse.json({
          error: 'Invalid token',
          message: 'The provided token is invalid.',
        }, { status: 401 });
      }

      familyId = decoded.familyId;
    } catch (jwtError) {
      return NextResponse.json({
        error: 'Invalid token',
        message: 'The provided token is invalid or expired.',
      }, { status: 401 });
    }

    // Parse query parameters for filters
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');
    const year = searchParams.get('year');

    let startDate: Date | undefined;
    let endDate: Date | undefined;

    if (month && year) {
      const monthNum = parseInt(month, 10);
      const yearNum = parseInt(year, 10);

      if (isNaN(monthNum) || isNaN(yearNum) || monthNum < 1 || monthNum > 12) {
        return NextResponse.json({
          error: 'Invalid date parameters',
          message: 'Month must be 1-12 and year must be a valid number.',
        }, { status: 400 });
      }

      startDate = new Date(yearNum, monthNum - 1, 1);
      endDate = new Date(yearNum, monthNum, 0); // Last day of the month
    }

    try {
      // Get payment summary from service
      const summary = await PaymentService.getPaymentSummary(familyId, { startDate, endDate });

      const response: PaymentSummaryResponse = {
        summary: {
          totalScheduled: Number(summary.totalScheduled),
          totalPaid: Number(summary.totalPaid),
          totalOverdue: Number(summary.totalOverdue),
          totalUpcoming: Number(summary.totalUpcoming),
          scheduledCount: summary.scheduledCount,
          paidCount: summary.paidCount,
          overdueCount: summary.overdueCount,
          upcomingCount: summary.upcomingCount,
          averagePaymentAmount: Number(summary.averagePaymentAmount),
          monthlyTotal: Number(summary.monthlyTotal),
          upcomingPayments: summary.upcomingPayments.map(payment => ({
            id: payment.id,
            payee: payment.payee,
            amount: Number(payment.amount),
            dueDate: payment.dueDate.toISOString().split('T')[0],
            status: payment.status,
            spendingCategory: {
              name: payment.spendingCategory.name,
              color: payment.spendingCategory.color || undefined,
            },
          })),
          overduePayments: summary.overduePayments.map(payment => ({
            id: payment.id,
            payee: payment.payee,
            amount: Number(payment.amount),
            dueDate: payment.dueDate.toISOString().split('T')[0],
            daysPastDue: Math.floor((new Date().getTime() - payment.dueDate.getTime()) / (1000 * 60 * 60 * 24)),
            spendingCategory: {
              name: payment.spendingCategory.name,
              color: payment.spendingCategory.color || undefined,
            },
          })),
        },
      };

      return NextResponse.json(response, { status: 200 });
    } catch (serviceError) {
      console.error('Payment summary error:', serviceError);

      if (serviceError instanceof Error) {
        if (serviceError.message === 'Family not found') {
          return NextResponse.json({
            error: 'Family not found',
            message: 'The family was not found.',
          }, { status: 404 });
        }
      }

      return NextResponse.json({
        error: 'Failed to get payment summary',
        message: 'Failed to get payment summary. Please try again.',
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Payment summary endpoint error:', error);

    return NextResponse.json({
      error: 'Internal server error',
      message: 'Failed to get payment summary. Please try again.',
    }, { status: 500 });
  }
}