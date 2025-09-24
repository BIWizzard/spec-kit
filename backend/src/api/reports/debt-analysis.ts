import { Request, Response } from 'express';
import { prisma } from '../../lib/prisma';
import jwt from 'jsonwebtoken';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    familyId: string;
    email: string;
    role: string;
  };
}

export async function getDebtAnalysisReport(req: AuthenticatedRequest, res: Response) {
  try {
    const authHeader = req.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'No token provided',
        details: 'Authorization header with Bearer token is required'
      });
    }

    const token = authHeader.slice(7);
    let decoded: any;

    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'default_secret');
    } catch (error) {
      return res.status(401).json({
        error: 'Invalid token',
        details: 'Token is invalid or expired'
      });
    }

    const familyId = decoded.familyId;
    if (!familyId) {
      return res.status(403).json({
        error: 'Access denied',
        details: 'User must belong to a family to access reports'
      });
    }

    // Get all bank accounts for debt analysis
    const bankAccounts = await prisma.bankAccount.findMany({
      where: {
        familyId,
        deletedAt: null,
        accountType: { in: ['credit', 'loan'] }
      },
      orderBy: { currentBalance: 'desc' }
    });

    // Get all debt-related payments
    const debtPayments = await prisma.payment.findMany({
      where: {
        familyId,
        category: { in: ['debt_payment', 'loan_payment', 'credit_card'] },
        dueDate: {
          gte: new Date(new Date().setMonth(new Date().getMonth() - 12)),
          lte: new Date(new Date().setMonth(new Date().getMonth() + 1))
        }
      },
      orderBy: { dueDate: 'desc' }
    });

    // Calculate debt metrics
    const totalDebt = bankAccounts.reduce((sum, account) =>
      sum + Math.abs(Number(account.currentBalance)), 0
    );

    const debtByType = new Map<string, { amount: number; accounts: number; avgBalance: number }>();

    for (const account of bankAccounts) {
      const type = account.accountType;
      if (!debtByType.has(type)) {
        debtByType.set(type, { amount: 0, accounts: 0, avgBalance: 0 });
      }
      const debtInfo = debtByType.get(type)!;
      debtInfo.amount += Math.abs(Number(account.currentBalance));
      debtInfo.accounts += 1;
    }

    // Calculate average balances
    for (const [type, info] of debtByType.entries()) {
      info.avgBalance = info.accounts > 0 ? info.amount / info.accounts : 0;
    }

    // Calculate monthly payment obligations
    const monthlyPayments = debtPayments
      .filter(p => p.frequency === 'monthly')
      .reduce((sum, payment) => sum + Number(payment.amount), 0);

    // Get income for debt-to-income ratio
    const recentIncome = await prisma.incomeEvent.findMany({
      where: {
        familyId,
        actualDate: {
          gte: new Date(new Date().setMonth(new Date().getMonth() - 3)),
          lte: new Date()
        },
        status: 'received'
      }
    });

    const avgMonthlyIncome = recentIncome.length > 0
      ? recentIncome.reduce((sum, event) => sum + Number(event.actualAmount || event.amount), 0) / 3
      : 0;

    const debtToIncomeRatio = avgMonthlyIncome > 0
      ? (monthlyPayments / avgMonthlyIncome) * 100
      : 0;

    // Calculate interest burden (estimated)
    const estimatedMonthlyInterest = totalDebt * 0.015; // Assuming average 18% APR

    // Payment history analysis
    const paidPayments = debtPayments.filter(p => p.status === 'paid');
    const overduePayments = debtPayments.filter(p =>
      p.status === 'pending' && p.dueDate < new Date()
    );
    const paymentRate = debtPayments.length > 0
      ? (paidPayments.length / debtPayments.length) * 100
      : 100;

    // Calculate payoff projections
    const monthsToPayoff = monthlyPayments > estimatedMonthlyInterest
      ? Math.ceil(totalDebt / (monthlyPayments - estimatedMonthlyInterest))
      : -1; // Indicates payments don't cover interest

    const totalInterestProjected = monthsToPayoff > 0
      ? estimatedMonthlyInterest * monthsToPayoff
      : 0;

    // Generate debt health score (0-100)
    let debtHealthScore = 100;

    // High debt-to-income ratio reduces score
    if (debtToIncomeRatio > 40) debtHealthScore -= 30;
    else if (debtToIncomeRatio > 30) debtHealthScore -= 20;
    else if (debtToIncomeRatio > 20) debtHealthScore -= 10;

    // Overdue payments reduce score
    if (overduePayments.length > 0) {
      debtHealthScore -= Math.min(30, overduePayments.length * 10);
    }

    // Low payment rate reduces score
    if (paymentRate < 90) debtHealthScore -= 20;
    else if (paymentRate < 95) debtHealthScore -= 10;

    // Can't cover interest reduces score significantly
    if (monthsToPayoff === -1) debtHealthScore -= 30;

    debtHealthScore = Math.max(0, debtHealthScore);

    // Generate recommendations
    const recommendations = [];

    if (debtToIncomeRatio > 40) {
      recommendations.push({
        type: 'critical',
        message: 'High debt-to-income ratio. Focus on debt reduction as top priority.',
        ratio: debtToIncomeRatio.toFixed(1)
      });
    }

    if (monthsToPayoff === -1) {
      recommendations.push({
        type: 'critical',
        message: 'Monthly payments do not cover interest. Increase payment amounts immediately.',
        shortfall: (estimatedMonthlyInterest - monthlyPayments).toFixed(2)
      });
    }

    if (overduePayments.length > 0) {
      recommendations.push({
        type: 'warning',
        message: `${overduePayments.length} overdue debt payments. Pay immediately to avoid penalties.`,
        totalOverdue: overduePayments.reduce((sum, p) => sum + Number(p.amount), 0)
      });
    }

    if (bankAccounts.length > 5) {
      recommendations.push({
        type: 'info',
        message: 'Consider debt consolidation to simplify payments and potentially reduce interest.',
        currentAccounts: bankAccounts.length
      });
    }

    // Identify highest interest debt (for avalanche method)
    const highestBalanceAccount = bankAccounts[0];

    return res.status(200).json({
      summary: {
        totalDebt,
        monthlyPaymentObligations: monthlyPayments,
        debtToIncomeRatio,
        numberOfDebtAccounts: bankAccounts.length,
        debtHealthScore
      },
      debtBreakdown: Array.from(debtByType.entries()).map(([type, info]) => ({
        type,
        totalAmount: info.amount,
        numberOfAccounts: info.accounts,
        averageBalance: info.avgBalance,
        percentageOfTotal: totalDebt > 0 ? (info.amount / totalDebt) * 100 : 0
      })),
      paymentAnalysis: {
        monthlyPayments,
        estimatedMonthlyInterest,
        netPrincipalReduction: Math.max(0, monthlyPayments - estimatedMonthlyInterest),
        paymentRate,
        overduePayments: overduePayments.length,
        totalOverdueAmount: overduePayments.reduce((sum, p) => sum + Number(p.amount), 0)
      },
      projections: {
        monthsToPayoff: monthsToPayoff > 0 ? monthsToPayoff : null,
        payoffDate: monthsToPayoff > 0
          ? new Date(new Date().setMonth(new Date().getMonth() + monthsToPayoff)).toISOString()
          : null,
        totalInterestProjected,
        totalCostOfDebt: totalDebt + totalInterestProjected
      },
      accounts: bankAccounts.map(account => ({
        id: account.id,
        institutionName: account.institutionName,
        accountName: account.accountName,
        type: account.accountType,
        balance: Math.abs(Number(account.currentBalance)),
        minimumPayment: 50, // Placeholder - would calculate based on balance
        lastUpdated: account.lastSyncedAt
      })),
      strategies: {
        avalanche: {
          description: 'Pay minimum on all debts, extra on highest interest',
          targetAccount: highestBalanceAccount ? {
            name: highestBalanceAccount.accountName,
            balance: Math.abs(Number(highestBalanceAccount.currentBalance))
          } : null
        },
        snowball: {
          description: 'Pay minimum on all debts, extra on smallest balance',
          targetAccount: bankAccounts[bankAccounts.length - 1] ? {
            name: bankAccounts[bankAccounts.length - 1].accountName,
            balance: Math.abs(Number(bankAccounts[bankAccounts.length - 1].currentBalance))
          } : null
        }
      },
      recommendations
    });

  } catch (error) {
    console.error('Debt analysis report error:', error);
    return res.status(500).json({
      error: 'Failed to generate debt analysis report',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}