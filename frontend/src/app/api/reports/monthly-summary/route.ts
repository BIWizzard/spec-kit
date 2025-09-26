import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { ReportsService } from '@/lib/services/reports.service';

interface JWTPayload {
  userId: string;
  familyId: string;
  role: string;
}

export async function GET(request: NextRequest) {
  try {
    // Extract JWT token from Authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authorization token required' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    let decoded: JWTPayload;

    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    // Extract query parameters
    const { searchParams } = new URL(request.url);
    const monthStr = searchParams.get('month');

    // Use current month if not provided
    const targetMonth = monthStr ? new Date(monthStr + '-01') : new Date();

    // Validate month parameter
    if (monthStr && isNaN(targetMonth.getTime())) {
      return NextResponse.json(
        { error: 'Invalid month format. Use YYYY-MM format' },
        { status: 400 }
      );
    }

    // Ensure we're using the first day of the month
    const month = new Date(targetMonth.getFullYear(), targetMonth.getMonth(), 1);

    // Generate monthly summary report
    const monthlySummaryData = await ReportsService.generateMonthlySummary(
      decoded.familyId,
      month
    );

    return NextResponse.json({
      data: monthlySummaryData,
      meta: {
        familyId: decoded.familyId,
        month: month.toISOString().substring(0, 7), // YYYY-MM format
        generatedAt: new Date().toISOString(),
      }
    });

  } catch (error) {
    console.error('Error generating monthly summary:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}