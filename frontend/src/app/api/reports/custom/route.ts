import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { ReportsService } from '@/lib/services/reports.service';

interface JWTPayload {
  userId: string;
  familyId: string;
  role: string;
}

interface CustomReportRequest {
  reportName: string;
  dateRange: {
    fromDate: string;
    toDate: string;
  };
  reportTypes: Array<
    'cash_flow' | 'spending_analysis' | 'budget_performance' |
    'income_analysis' | 'net_worth' | 'savings_rate'
  >;
  groupBy?: 'day' | 'week' | 'month' | 'quarter' | 'year';
  filters?: {
    categories?: string[];
    accounts?: string[];
    merchants?: string[];
    amountRange?: {
      min?: number;
      max?: number;
    };
  };
  includeProjections?: boolean;
  format?: 'json' | 'csv' | 'pdf';
}

interface CustomReportData {
  reportName: string;
  dateRange: {
    fromDate: string;
    toDate: string;
  };
  reportData: {
    cashFlow?: any;
    spendingAnalysis?: any;
    budgetPerformance?: any;
    incomeAnalysis?: any;
    netWorth?: any;
    savingsRate?: any;
  };
  summary: {
    totalReports: number;
    generatedAt: string;
    dataPoints: number;
  };
}

export async function POST(request: NextRequest) {
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

    // Parse request body
    let requestData: CustomReportRequest;
    try {
      requestData = await request.json();
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid JSON request body' },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!requestData.reportName || !requestData.dateRange || !requestData.reportTypes) {
      return NextResponse.json(
        { error: 'reportName, dateRange, and reportTypes are required' },
        { status: 400 }
      );
    }

    if (!requestData.reportTypes.length) {
      return NextResponse.json(
        { error: 'At least one report type must be specified' },
        { status: 400 }
      );
    }

    // Validate dates
    const fromDate = new Date(requestData.dateRange.fromDate);
    const toDate = new Date(requestData.dateRange.toDate);

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

    const dateRange = { fromDate, toDate };
    const groupBy = requestData.groupBy || 'month';
    const includeProjections = requestData.includeProjections || false;

    // Generate requested reports
    const reportData: any = {};
    let dataPoints = 0;

    for (const reportType of requestData.reportTypes) {
      try {
        switch (reportType) {
          case 'cash_flow':
            reportData.cashFlow = await ReportsService.generateCashFlowReport(
              decoded.familyId,
              dateRange,
              groupBy,
              includeProjections
            );
            dataPoints += reportData.cashFlow.length;
            break;

          case 'spending_analysis':
            reportData.spendingAnalysis = await ReportsService.generateSpendingAnalysis(
              decoded.familyId,
              dateRange
            );
            dataPoints += reportData.spendingAnalysis.categoryBreakdown.length;
            break;

          case 'budget_performance':
            reportData.budgetPerformance = await ReportsService.generateBudgetPerformance(
              decoded.familyId,
              dateRange
            );
            dataPoints += reportData.budgetPerformance.categoryPerformance.length;
            break;

          case 'income_analysis':
            reportData.incomeAnalysis = await ReportsService.generateIncomeAnalysis(
              decoded.familyId,
              dateRange
            );
            dataPoints += reportData.incomeAnalysis.sources.length;
            break;

          case 'net_worth':
            reportData.netWorth = await ReportsService.generateNetWorthReport(
              decoded.familyId
            );
            dataPoints += reportData.netWorth.assets.breakdown.length + reportData.netWorth.liabilities.breakdown.length;
            break;

          case 'savings_rate':
            reportData.savingsRate = await ReportsService.generateSavingsRateReport(
              decoded.familyId,
              dateRange,
              20 // default target savings rate
            );
            dataPoints += reportData.savingsRate.monthlyData.length;
            break;

          default:
            console.warn(`Unknown report type: ${reportType}`);
        }
      } catch (error) {
        console.error(`Error generating ${reportType} report:`, error);
        // Continue with other reports even if one fails
      }
    }

    const customReportData: CustomReportData = {
      reportName: requestData.reportName,
      dateRange: {
        fromDate: requestData.dateRange.fromDate,
        toDate: requestData.dateRange.toDate,
      },
      reportData,
      summary: {
        totalReports: requestData.reportTypes.length,
        generatedAt: new Date().toISOString(),
        dataPoints,
      },
    };

    // Handle different output formats
    const format = requestData.format || 'json';

    if (format === 'json') {
      return NextResponse.json({
        data: customReportData,
        meta: {
          familyId: decoded.familyId,
          format: 'json',
          requestedReports: requestData.reportTypes,
          filters: requestData.filters || {},
        }
      });
    } else if (format === 'csv') {
      // For CSV format, we would convert the data to CSV
      // This is a simplified implementation
      return NextResponse.json(
        { error: 'CSV format not yet implemented' },
        { status: 501 }
      );
    } else if (format === 'pdf') {
      // For PDF format, we would generate a PDF report
      // This is a simplified implementation
      return NextResponse.json(
        { error: 'PDF format not yet implemented' },
        { status: 501 }
      );
    } else {
      return NextResponse.json(
        { error: 'Unsupported format. Use json, csv, or pdf' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Error generating custom report:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}