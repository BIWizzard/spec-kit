import { NextRequest, NextResponse } from 'next/server';
import { PaymentService } from '@/lib/services/payment.service';
import { verifyJWT } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyJWT(request);
    if (!authResult.success) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { familyId, userId } = authResult.payload;
    const data = await request.json();

    // Validate required fields
    if (!data.payments || !Array.isArray(data.payments) || data.payments.length === 0) {
      return NextResponse.json(
        { error: 'Missing or invalid payments array' },
        { status: 400 }
      );
    }

    // Validate each payment in the array
    for (const payment of data.payments) {
      if (!payment.payee || !payment.amount || !payment.dueDate || !payment.spendingCategoryId) {
        return NextResponse.json(
          { error: 'Each payment must have payee, amount, dueDate, and spendingCategoryId' },
          { status: 400 }
        );
      }
    }

    const results = await PaymentService.bulkCreatePayments(
      familyId,
      data.payments,
      userId
    );

    return NextResponse.json({
      message: 'Bulk payments created successfully',
      created: results.length,
      payments: results
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating bulk payments:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}