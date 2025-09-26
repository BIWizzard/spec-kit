import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { PaymentService } from '@/lib/services/payment.service';

export interface UpcomingPaymentsQuery {
  days?: number;
}

export async function GET(request: NextRequest) {
  try {
    // Extract JWT token from Authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        {
          error: 'Authentication required',
          message: 'Please provide a valid authorization token.',
        },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify and decode JWT token
    let familyId: string;
    try {
      const jwtSecret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'dev-jwt-secret-change-this-in-production-make-it-really-long';
      const decoded = jwt.verify(token, jwtSecret) as any;

      if (!decoded || !decoded.familyId) {
        return NextResponse.json(
          {
            error: 'Invalid token',
            message: 'Token does not contain required family information.',
          },
          { status: 401 }
        );
      }

      familyId = decoded.familyId;
    } catch (error) {
      return NextResponse.json(
        {
          error: 'Invalid or expired token',
          message: 'Please log in again.',
        },
        { status: 401 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const daysParam = searchParams.get('days');
    const days = daysParam ? parseInt(daysParam, 10) : 30;

    // Validate days parameter
    if (isNaN(days) || days < 1 || days > 365) {
      return NextResponse.json(
        {
          error: 'Invalid parameter',
          message: 'Days parameter must be a number between 1 and 365.',
        },
        { status: 400 }
      );
    }

    // Get upcoming payments using PaymentService
    const upcomingPayments = await PaymentService.getUpcomingPayments(familyId, days);

    return NextResponse.json({
      payments: upcomingPayments,
      meta: {
        count: upcomingPayments.length,
        daysAhead: days,
      },
    });

  } catch (error) {
    console.error('Error fetching upcoming payments:', error);

    if (error instanceof Error) {
      // Handle specific service errors
      if (error.message.includes('not found') || error.message.includes('not authorized')) {
        return NextResponse.json(
          {
            error: 'Access denied',
            message: 'You do not have permission to access these payments.',
          },
          { status: 403 }
        );
      }
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to retrieve upcoming payments. Please try again.',
      },
      { status: 500 }
    );
  }
}