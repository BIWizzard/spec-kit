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
    const fromDateStr = searchParams.get('fromDate');
    const toDateStr = searchParams.get('toDate');
    const targetSavingsRateStr = searchParams.get('targetSavingsRate');

    // Validate required parameters
    if (!fromDateStr || !toDateStr) {
      return NextResponse.json(
        { error: 'fromDate and toDate parameters are required' },
        { status: 400 }
      );
    }

    const fromDate = new Date(fromDateStr);
    const toDate = new Date(toDateStr);
    const targetSavingsRate = targetSavingsRateStr ? parseFloat(targetSavingsRateStr) : 20;

    // Validate dates
    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format. Use YYYY-MM-DD format' },
        { status: 400 }
      );
    }

    if (fromDate >= toDate) {
      return NextResponse.json(
        { error: 'fromDate must be before toDate' },
        { status: 400 }
      );
    }

    // Generate savings rate report
    const savingsRateData = await ReportsService.generateSavingsRateReport(
      decoded.familyId,
      { fromDate, toDate },
      targetSavingsRate
    );

    return NextResponse.json({
      data: savingsRateData,
      meta: {
        familyId: decoded.familyId,
        dateRange: { fromDate: fromDateStr, toDate: toDateStr },
        targetSavingsRate,
        generatedAt: new Date().toISOString(),
      }
    });

  } catch (error) {
    console.error('Error generating savings rate report:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}