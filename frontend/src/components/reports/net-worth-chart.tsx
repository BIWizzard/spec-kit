'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrendingUp, TrendingDown, DollarSign, PieChart, Target, Wallet } from 'lucide-react';

interface NetWorthData {
  date: string;
  assets: {
    total: number;
    categories: Array<{
      name: string;
      amount: number;
      type: 'liquid' | 'investment' | 'property' | 'other';
      color: string;
    }>;
  };
  liabilities: {
    total: number;
    categories: Array<{
      name: string;
      amount: number;
      type: 'credit' | 'loan' | 'mortgage' | 'other';
      color: string;
    }>;
  };
  netWorth: number;
  change: number;
  changePercentage: number;
}

interface NetWorthChartProps {
  data: NetWorthData[];
  period?: 'month' | 'quarter' | 'year';
  viewType?: 'trend' | 'breakdown' | 'composition';
  onPeriodChange?: (period: 'month' | 'quarter' | 'year') => void;
  onViewChange?: (view: 'trend' | 'breakdown' | 'composition') => void;
  isLoading?: boolean;
}

export default function NetWorthChart({
  data = [],
  period = 'month',
  viewType = 'trend',
  onPeriodChange,
  onViewChange,
  isLoading = false
}: NetWorthChartProps) {
  const currentData = data[data.length - 1] || null;

  const netWorthStats = useMemo(() => {
    if (!currentData) return null;

    const debtToAssetRatio = currentData.assets.total > 0 
      ? (currentData.liabilities.total / currentData.assets.total) * 100 
      : 0;
    
    const liquidAssets = currentData.assets.categories
      .filter(cat => cat.type === 'liquid')
      .reduce((sum, cat) => sum + cat.amount, 0);

    const emergencyFundMonths = liquidAssets / 3000; // Assuming $3k monthly expenses

    return {
      totalAssets: currentData.assets.total,
      totalLiabilities: currentData.liabilities.total,
      netWorth: currentData.netWorth,
      debtToAssetRatio,
      liquidAssets,
      emergencyFundMonths
    };
  }, [currentData]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getChangeColor = (change: number) => {
    if (change > 0) return 'text-green-500';
    if (change < 0) return 'text-red-500';
    return 'text-gray-500';
  };

  const TrendView = () => {
    const maxValue = Math.max(...data.map(d => Math.max(d.assets.total, d.liabilities.total)));

    return (
      <div className="space-y-6">
        {/* Timeline Chart */}
        <div className="relative h-64">
          <div className="flex items-end justify-center h-full space-x-2">
            {data.map((item, index) => (
              <div key={index} className="flex-1 flex flex-col items-center max-w-[80px]">
                <div className="flex flex-col items-center justify-end h-full w-full">
                  {/* Assets Bar */}
                  <div
                    className="w-full bg-green-400/70 rounded-t-sm mb-1 relative group cursor-pointer"
                    style={{ height: `${(item.assets.total / maxValue) * 80}%` }}
                  >
                    <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-black/80 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      Assets: {formatCurrency(item.assets.total)}
                    </div>
                  </div>

                  {/* Liabilities Bar */}
                  <div
                    className="w-full bg-red-400/70 rounded-t-sm relative group cursor-pointer"
                    style={{ height: `${(item.liabilities.total / maxValue) * 80}%` }}
                  >
                    <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-black/80 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      Liabilities: {formatCurrency(item.liabilities.total)}
                    </div>
                  </div>
                </div>

                {/* Date */}
                <div className="text-xs text-white/60 mt-2">
                  {new Date(item.date).toLocaleDateString('en-US', { month: 'short' })}
                </div>

                {/* Net Worth */}
                <div className={`text-xs font-medium ${getChangeColor(item.netWorth)}`}>
                  {formatCurrency(item.netWorth)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="flex justify-center space-x-6 text-sm">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-400/70 rounded mr-2"></div>
            <span className="text-white/70">Assets</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-red-400/70 rounded mr-2"></div>
            <span className="text-white/70">Liabilities</span>
          </div>
        </div>
      </div>
    );
  };

  const BreakdownView = () => {
    if (!currentData) return null;

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Assets Breakdown */}
        <div className="space-y-4">
          <h4 className="font-medium text-white flex items-center">
            <TrendingUp className="h-4 w-4 mr-2 text-green-400" />
            Assets ({formatCurrency(currentData.assets.total)})
          </h4>
          <div className="space-y-2">
            {currentData.assets.categories.map((category, index) => {
              const percentage = (category.amount / currentData.assets.total) * 100;
              return (
                <div key={index} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: category.color }}
                    ></div>
                    <span className="text-white">{category.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-white font-medium">{formatCurrency(category.amount)}</div>
                    <div className="text-white/60 text-sm">{percentage.toFixed(1)}%</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Liabilities Breakdown */}
        <div className="space-y-4">
          <h4 className="font-medium text-white flex items-center">
            <TrendingDown className="h-4 w-4 mr-2 text-red-400" />
            Liabilities ({formatCurrency(currentData.liabilities.total)})
          </h4>
          <div className="space-y-2">
            {currentData.liabilities.categories.map((category, index) => {
              const percentage = currentData.liabilities.total > 0 
                ? (category.amount / currentData.liabilities.total) * 100 
                : 0;
              return (
                <div key={index} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: category.color }}
                    ></div>
                    <span className="text-white">{category.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-white font-medium">{formatCurrency(category.amount)}</div>
                    <div className="text-white/60 text-sm">{percentage.toFixed(1)}%</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const CompositionView = () => {
    if (!currentData) return null;

    return (
      <div className="text-center py-8 text-white/60">
        <PieChart className="h-8 w-8 mx-auto mb-2" />
        <p>Asset composition visualization</p>
        <p className="text-sm">Interactive pie chart will be displayed here</p>
      </div>
    );
  };

  return (
    <Card className="w-full bg-white/10 backdrop-blur-md border border-white/20">
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
          <CardTitle className="text-xl font-semibold text-white">
            Net Worth Analysis
          </CardTitle>

          <div className="flex items-center space-x-2">
            <Select value={period} onValueChange={onPeriodChange}>
              <SelectTrigger className="w-[120px] bg-white/10 border-white/20 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                <SelectItem value="month">Month</SelectItem>
                <SelectItem value="quarter">Quarter</SelectItem>
                <SelectItem value="year">Year</SelectItem>
              </SelectContent>
            </Select>

            <Select value={viewType} onValueChange={onViewChange}>
              <SelectTrigger className="w-[140px] bg-white/10 border-white/20 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                <SelectItem value="trend">Trend</SelectItem>
                <SelectItem value="breakdown">Breakdown</SelectItem>
                <SelectItem value="composition">Composition</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Summary Stats */}
        {netWorthStats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="flex items-center justify-center mb-1">
                <TrendingUp className="h-4 w-4 text-green-400 mr-1" />
                <span className="text-sm text-white/70">Total Assets</span>
              </div>
              <div className="text-lg font-semibold text-green-400">
                {formatCurrency(netWorthStats.totalAssets)}
              </div>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center mb-1">
                <TrendingDown className="h-4 w-4 text-red-400 mr-1" />
                <span className="text-sm text-white/70">Total Debt</span>
              </div>
              <div className="text-lg font-semibold text-red-400">
                {formatCurrency(netWorthStats.totalLiabilities)}
              </div>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center mb-1">
                <DollarSign className="h-4 w-4 text-white/70 mr-1" />
                <span className="text-sm text-white/70">Net Worth</span>
              </div>
              <div className={`text-lg font-semibold ${
                netWorthStats.netWorth >= 0 ? 'text-green-400' : 'text-red-400'
              }`}>
                {formatCurrency(netWorthStats.netWorth)}
              </div>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center mb-1">
                <Wallet className="h-4 w-4 text-blue-400 mr-1" />
                <span className="text-sm text-white/70">Liquid Assets</span>
              </div>
              <div className="text-lg font-semibold text-blue-400">
                {formatCurrency(netWorthStats.liquidAssets)}
              </div>
            </div>
          </div>
        )}

        {/* Current Month Change */}
        {currentData && (
          <div className="flex items-center justify-center space-x-4 p-4 bg-black/20 rounded-lg">
            <div className="text-center">
              <div className="text-sm text-white/70">This Period Change</div>
              <div className={`text-xl font-bold flex items-center justify-center ${
                getChangeColor(currentData.change)
              }`}>
                {currentData.change > 0 ? (
                  <TrendingUp className="h-5 w-5 mr-1" />
                ) : (
                  <TrendingDown className="h-5 w-5 mr-1" />
                )}
                {currentData.change > 0 ? '+' : ''}{formatCurrency(currentData.change)}
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-white/70">Percentage Change</div>
              <div className={`text-xl font-bold ${getChangeColor(currentData.changePercentage)}`}>
                {currentData.changePercentage > 0 ? '+' : ''}{currentData.changePercentage.toFixed(1)}%
              </div>
            </div>
          </div>
        )}

        {/* Chart Content */}
        <div className="min-h-[300px]">
          {isLoading ? (
            <div className="flex items-center justify-center h-80 text-white/50">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
              <span className="ml-3">Loading net worth data...</span>
            </div>
          ) : data.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-80 text-white/50">
              <DollarSign className="h-12 w-12 mb-4" />
              <p>No net worth data available</p>
            </div>
          ) : (
            <>
              {viewType === 'trend' && <TrendView />}
              {viewType === 'breakdown' && <BreakdownView />}
              {viewType === 'composition' && <CompositionView />}
            </>
          )}
        </div>

        {/* Financial Health Indicators */}
        {netWorthStats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-black/20 rounded-lg p-4">
              <h4 className="font-medium text-white mb-2">Debt-to-Asset Ratio</h4>
              <div className="flex items-center space-x-2">
                <Badge
                  variant="outline"
                  className={`${
                    netWorthStats.debtToAssetRatio < 30 ? 'text-green-500 border-green-500' :
                    netWorthStats.debtToAssetRatio < 50 ? 'text-yellow-500 border-yellow-500' :
                    'text-red-500 border-red-500'
                  }`}
                >
                  {netWorthStats.debtToAssetRatio.toFixed(1)}%
                </Badge>
                <span className="text-white/70 text-sm">
                  {netWorthStats.debtToAssetRatio < 30 ? 'Excellent' :
                   netWorthStats.debtToAssetRatio < 50 ? 'Good' : 'Needs Improvement'}
                </span>
              </div>
            </div>

            <div className="bg-black/20 rounded-lg p-4">
              <h4 className="font-medium text-white mb-2">Emergency Fund</h4>
              <div className="flex items-center space-x-2">
                <Badge
                  variant="outline"
                  className={`${
                    netWorthStats.emergencyFundMonths >= 6 ? 'text-green-500 border-green-500' :
                    netWorthStats.emergencyFundMonths >= 3 ? 'text-yellow-500 border-yellow-500' :
                    'text-red-500 border-red-500'
                  }`}
                >
                  {netWorthStats.emergencyFundMonths.toFixed(1)} months
                </Badge>
                <span className="text-white/70 text-sm">
                  {netWorthStats.emergencyFundMonths >= 6 ? 'Well protected' :
                   netWorthStats.emergencyFundMonths >= 3 ? 'Adequate' : 'Build up fund'}
                </span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}