import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/prisma';

interface JWTPayload {
  userId: string;
  familyId: string;
  role: string;
}

interface DebtAccount {
  id: string;
  accountName: string;
  accountType: string;
  currentBalance: number;
  interestRate?: number;
  minimumPayment?: number;
  dueDate?: Date;
}

interface DebtAnalysisData {
  totalDebt: number;
  monthlyMinimumPayments: number;
  debtToIncomeRatio: number;
  accounts: DebtAccount[];
  payoffStrategies: {
    snowball: Array<{
      accountId: string;
      accountName: string;
      balance: number;
      order: number;
    }>;
    avalanche: Array<{
      accountId: string;
      accountName: string;
      balance: number;
      interestRate: number;
      order: number;
    }>;
  };
  projectedPayoffTimeline: {
    minimumPayments: number; // months
    aggressive: number; // months with extra payments
  };
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

    // Get debt accounts (credit cards and loans)
    const debtAccounts = await prisma.bankAccount.findMany({
      where: {
        familyId: decoded.familyId,
        accountType: {
          in: ['credit', 'loan']
        },
        deletedAt: null,
      },
      select: {
        id: true,
        accountName: true,
        accountType: true,
        currentBalance: true,
        // Note: Interest rate and minimum payment would need to be added to schema
        // For now, we'll calculate estimates
      }
    });

    // Calculate debt analysis
    const debtAccountsData: DebtAccount[] = debtAccounts.map(account => ({
      id: account.id,
      accountName: account.accountName,
      accountType: account.accountType,
      currentBalance: Math.abs(Number(account.currentBalance)), // Convert to positive for debt amount
      interestRate: account.accountType === 'credit' ? 18.5 : 6.5, // Estimated rates
      minimumPayment: Math.abs(Number(account.currentBalance)) * 0.02, // Estimated 2% minimum
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Estimated 30 days
    }));

    const totalDebt = debtAccountsData.reduce((sum, account) => sum + account.currentBalance, 0);
    const monthlyMinimumPayments = debtAccountsData.reduce((sum, account) => sum + (account.minimumPayment || 0), 0);

    // Get monthly income for debt-to-income ratio
    const monthStart = new Date();
    monthStart.setDate(1);
    const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);

    const recentIncome = await prisma.incomeEvent.findMany({
      where: {
        familyId: decoded.familyId,
        actualDate: { gte: monthStart, lte: monthEnd },
        status: 'received',
      },
    });

    const monthlyIncome = recentIncome.reduce((sum, event) => sum + Number(event.actualAmount || event.amount), 0);
    const debtToIncomeRatio = monthlyIncome > 0 ? (monthlyMinimumPayments / monthlyIncome) * 100 : 0;

    // Debt Snowball Strategy (smallest balance first)
    const snowballOrder = [...debtAccountsData]
      .sort((a, b) => a.currentBalance - b.currentBalance)
      .map((account, index) => ({
        accountId: account.id,
        accountName: account.accountName,
        balance: account.currentBalance,
        order: index + 1,
      }));

    // Debt Avalanche Strategy (highest interest rate first)
    const avalancheOrder = [...debtAccountsData]
      .sort((a, b) => (b.interestRate || 0) - (a.interestRate || 0))
      .map((account, index) => ({
        accountId: account.id,
        accountName: account.accountName,
        balance: account.currentBalance,
        interestRate: account.interestRate || 0,
        order: index + 1,
      }));

    // Calculate payoff timeline estimates
    const minimumPayoffMonths = totalDebt > 0 && monthlyMinimumPayments > 0
      ? Math.ceil(totalDebt / monthlyMinimumPayments)
      : 0;
    const aggressivePayoffMonths = totalDebt > 0 && monthlyMinimumPayments > 0
      ? Math.ceil(totalDebt / (monthlyMinimumPayments * 1.5))
      : 0;

    const debtAnalysisData: DebtAnalysisData = {
      totalDebt,
      monthlyMinimumPayments,
      debtToIncomeRatio,
      accounts: debtAccountsData,
      payoffStrategies: {
        snowball: snowballOrder,
        avalanche: avalancheOrder,
      },
      projectedPayoffTimeline: {
        minimumPayments: minimumPayoffMonths,
        aggressive: aggressivePayoffMonths,
      },
    };

    return NextResponse.json({
      data: debtAnalysisData,
      meta: {
        familyId: decoded.familyId,
        totalAccounts: debtAccountsData.length,
        analysisDate: new Date().toISOString(),
      }
    });

  } catch (error) {
    console.error('Error generating debt analysis:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}