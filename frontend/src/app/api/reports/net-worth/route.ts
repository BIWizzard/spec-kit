import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, AuthenticationError } from '@/lib/middleware/auth';
import { ReportsService } from '@/lib/services/reports.service';

export async function GET(request: NextRequest) {
  try {
    // Authenticate request
    const user = authenticateRequest(request);

    // Generate net worth report (doesn't require date range as it shows current state)
    const netWorthData = await ReportsService.generateNetWorthReport(user.familyId);

    return NextResponse.json({
      data: netWorthData,
      meta: {
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Net worth report error:', error);

    if (error instanceof AuthenticationError) {
      return NextResponse.json(
        {
          error: 'Authentication failed',
          message: error.message,
        },
        { status: error.statusCode }
      );
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to generate net worth report',
      },
      { status: 500 }
    );
  }
}