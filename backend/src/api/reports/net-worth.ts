import { Request, Response } from 'express';
import { ReportsService } from '../../services/reports.service';
import jwt from 'jsonwebtoken';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    familyId: string;
    email: string;
    role: string;
  };
}

export async function getNetWorthReport(req: AuthenticatedRequest, res: Response) {
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

    // Generate the net worth report
    const netWorthData = await ReportsService.generateNetWorthReport(familyId);

    // Calculate additional metrics
    const debtToAssetRatio = netWorthData.assets.total > 0
      ? (netWorthData.liabilities.total / netWorthData.assets.total) * 100
      : 0;

    const liquidAssets = netWorthData.assets.breakdown
      .filter(asset => asset.accountType === 'checking' || asset.accountType === 'savings')
      .reduce((sum, asset) => sum + asset.amount, 0);

    const liquidityRatio = netWorthData.liabilities.total > 0
      ? (liquidAssets / netWorthData.liabilities.total) * 100
      : 100;

    // Calculate growth if we have historical data
    const monthlyTrends = netWorthData.monthlyTrends || [];
    let growthRate = 0;
    let growthTrend: 'increasing' | 'decreasing' | 'stable' = 'stable';

    if (monthlyTrends.length >= 2) {
      const currentMonth = monthlyTrends[monthlyTrends.length - 1];
      const previousMonth = monthlyTrends[monthlyTrends.length - 2];
      if (previousMonth && previousMonth.netWorth !== 0) {
        growthRate = ((currentMonth.netWorth - previousMonth.netWorth) / Math.abs(previousMonth.netWorth)) * 100;
        growthTrend = growthRate > 1 ? 'increasing' : growthRate < -1 ? 'decreasing' : 'stable';
      }
    }

    // Generate financial health score (0-100)
    let healthScore = 50; // Base score

    // Positive net worth adds to score
    if (netWorthData.currentNetWorth > 0) {
      healthScore += 20;
    }

    // Low debt ratio adds to score
    if (debtToAssetRatio < 30) {
      healthScore += 15;
    } else if (debtToAssetRatio < 50) {
      healthScore += 10;
    }

    // Good liquidity adds to score
    if (liquidityRatio > 100) {
      healthScore += 15;
    } else if (liquidityRatio > 50) {
      healthScore += 10;
    }

    // Cap at 100
    healthScore = Math.min(100, healthScore);

    // Generate recommendations
    const recommendations = [];

    if (netWorthData.currentNetWorth < 0) {
      recommendations.push({
        type: 'critical',
        message: 'Net worth is negative. Focus on debt reduction and building assets.',
        priority: 'high'
      });
    }

    if (debtToAssetRatio > 70) {
      recommendations.push({
        type: 'warning',
        message: 'High debt-to-asset ratio. Consider prioritizing debt reduction.',
        ratio: debtToAssetRatio.toFixed(1)
      });
    }

    if (liquidityRatio < 50) {
      recommendations.push({
        type: 'alert',
        message: 'Low liquidity. Build emergency fund for better financial security.',
        currentLiquidity: liquidityRatio.toFixed(1)
      });
    }

    if (growthTrend === 'decreasing' && growthRate < -5) {
      recommendations.push({
        type: 'info',
        message: 'Net worth is declining. Review spending and saving habits.',
        decline: Math.abs(growthRate).toFixed(1)
      });
    }

    return res.status(200).json({
      currentNetWorth: netWorthData.currentNetWorth,
      assets: {
        ...netWorthData.assets,
        liquidAssets,
        percentageLiquid: netWorthData.assets.total > 0
          ? (liquidAssets / netWorthData.assets.total) * 100
          : 0
      },
      liabilities: netWorthData.liabilities,
      metrics: {
        debtToAssetRatio,
        liquidityRatio,
        healthScore,
        growthRate,
        growthTrend
      },
      monthlyTrends: monthlyTrends,
      recommendations,
      lastUpdated: new Date().toISOString()
    });

  } catch (error) {
    console.error('Net worth report error:', error);
    return res.status(500).json({
      error: 'Failed to generate net worth report',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}