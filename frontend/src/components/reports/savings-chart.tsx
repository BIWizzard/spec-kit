'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrendingUp, TrendingDown, Target, DollarSign, Percent, PiggyBank } from 'lucide-react';

interface SavingsData {
  period: string;
  income: number;
  expenses: number;
  savings: number;
  savingsRate: number;
  target: number;
  targetRate: number;
  categories: Array<{
    name: string;
    amount: number;
    type: 'emergency' | 'retirement' | 'goals' | 'investment';
    color: string;
  }>;
}

interface SavingsChartProps {
  data: SavingsData[];
  period?: 'month' | 'quarter' | 'year';
  viewType?: 'rate' | 'amount' | 'goals' | 'projection';
  onPeriodChange?: (period: 'month' | 'quarter' | 'year') => void;
  onViewChange?: (view: 'rate' | 'amount' | 'goals' | 'projection') => void;
  isLoading?: boolean;
}

export default function SavingsChart({
  data = [],
  period = 'month',
  viewType = 'rate',
  onPeriodChange,
  onViewChange,
  isLoading = false
}: SavingsChartProps) {
  const currentData = data[data.length - 1] || null;

  const savingsStats = useMemo(() => {
    if (!data.length) return null;

    const totalSavings = data.reduce((sum, d) => sum + d.savings, 0);
    const avgSavingsRate = data.reduce((sum, d) => sum + d.savingsRate, 0) / data.length;
    const avgTarget = data.reduce((sum, d) => sum + d.targetRate, 0) / data.length;
    const periodsOnTarget = data.filter(d => d.savingsRate >= d.targetRate).length;
    const targetHitRate = (periodsOnTarget / data.length) * 100;

    // Calculate trend
    const recentPeriods = data.slice(-3);
    const trend = recentPeriods.length >= 2 
      ? recentPeriods[recentPeriods.length - 1].savingsRate - recentPeriods[0].savingsRate
      : 0;

    return {
      totalSavings,
      avgSavingsRate,
      avgTarget,
      targetHitRate,
      trend
    };
  }, [data]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getRateColor = (rate: number, target: number) => {
    if (rate >= target) return 'text-green-500';
    if (rate >= target * 0.8) return 'text-yellow-500';
    return 'text-red-500';
  };

  const RateView = () => {
    const maxRate = Math.max(...data.map(d => Math.max(d.savingsRate, d.targetRate)));

    return (
      <div className="space-y-6">
        {/* Rate Chart */}
        <div className="relative h-64">
          <div className="flex items-end justify-center h-full space-x-2">
            {data.map((item, index) => (
              <div key={index} className="flex-1 flex flex-col items-center max-w-[80px]">
                <div className="flex flex-col items-center justify-end h-full w-full space-y-1">
                  {/* Target Rate Bar (background) */}
                  <div
                    className="w-full bg-gray-400/30 rounded-t-sm absolute bottom-8"
                    style={{ height: `${(item.targetRate / maxRate) * 80}%` }}
                  />

                  {/* Actual Savings Rate Bar */}
                  <div
                    className={`w-full rounded-t-sm relative group cursor-pointer ${
                      item.savingsRate >= item.targetRate ? 'bg-green-500/70' : 'bg-red-500/70'
                    }`}
                    style={{ height: `${(item.savingsRate / maxRate) * 80}%` }}
                  >
                    <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-black/80 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      Rate: {item.savingsRate.toFixed(1)}%<br />
                      Target: {item.targetRate.toFixed(1)}%
                    </div>
                  </div>
                </div>

                {/* Period Label */}
                <div className="text-xs text-white/60 mt-2">
                  {new Date(item.period).toLocaleDateString('en-US', { month: 'short' })}
                </div>

                {/* Rate Value */}
                <div className={`text-xs font-medium ${getRateColor(item.savingsRate, item.targetRate)}`}>
                  {item.savingsRate.toFixed(1)}%
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="flex justify-center space-x-6 text-sm">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-500/70 rounded mr-2"></div>
            <span className="text-white/70">Savings Rate</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-gray-400/30 rounded mr-2"></div>
            <span className="text-white/70">Target Rate</span>
          </div>
        </div>
      </div>
    );
  };

  const AmountView = () => {
    const maxAmount = Math.max(...data.map(d => d.income));

    return (
      <div className="space-y-6">
        {data.map((item, index) => (
          <div key={index} className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-white font-medium">
                {new Date(item.period).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </span>
              <div className="text-right">
                <div className="text-white font-medium">{formatCurrency(item.savings)}</div>
                <div className="text-white/60 text-sm">saved</div>
              </div>
            </div>

            {/* Stacked Bar */}
            <div className="relative h-8 bg-white/10 rounded-full overflow-hidden">
              {/* Expenses */}
              <div
                className="h-full bg-red-400/70 absolute left-0 top-0"
                style={{ width: `${(item.expenses / item.income) * 100}%` }}
              />
              
              {/* Savings */}
              <div
                className="h-full bg-green-400/70 absolute top-0"
                style={{ 
                  left: `${(item.expenses / item.income) * 100}%`,
                  width: `${(item.savings / item.income) * 100}%`
                }}
              />
            </div>

            <div className="flex justify-between text-xs text-white/60">
              <span>Expenses: {formatCurrency(item.expenses)}</span>
              <span>Savings: {item.savingsRate.toFixed(1)}%</span>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const GoalsView = () => {
    if (!currentData) return null;

    return (
      <div className="space-y-4">
        <h4 className="font-medium text-white mb-4">Savings Categories</h4>
        
        {currentData.categories.map((category, index) => {
          const percentage = (category.amount / currentData.savings) * 100;
          
          return (
            <div key={index} className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
              <div className="flex items-center space-x-3">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: category.color }}
                ></div>
                <div>
                  <div className="text-white font-medium">{category.name}</div>
                  <div className="text-white/60 text-sm capitalize">{category.type}</div>
                </div>
              </div>
              
              <div className="text-right">
                <div className="text-white font-medium">{formatCurrency(category.amount)}</div>
                <div className="text-white/60 text-sm">{percentage.toFixed(1)}%</div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const ProjectionView = () => {
    return (
      <div className="text-center py-8 text-white/60">
        <TrendingUp className="h-8 w-8 mx-auto mb-2" />
        <p>Savings projection visualization</p>
        <p className="text-sm">Future savings projections will be displayed here</p>
      </div>
    );
  };

  return (
    <Card className="w-full bg-white/10 backdrop-blur-md border border-white/20">
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
          <CardTitle className="text-xl font-semibold text-white">
            Savings Rate Analysis
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
              <SelectTrigger className="w-[120px] bg-white/10 border-white/20 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                <SelectItem value="rate">Rate</SelectItem>
                <SelectItem value="amount">Amount</SelectItem>
                <SelectItem value="goals">Goals</SelectItem>
                <SelectItem value="projection">Projection</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Summary Stats */}
        {savingsStats && currentData && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="flex items-center justify-center mb-1">
                <Percent className="h-4 w-4 text-green-400 mr-1" />
                <span className="text-sm text-white/70">Current Rate</span>
              </div>
              <div className={`text-lg font-semibold ${
                getRateColor(currentData.savingsRate, currentData.targetRate)
              }`}>
                {currentData.savingsRate.toFixed(1)}%
              </div>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center mb-1">
                <Target className="h-4 w-4 text-blue-400 mr-1" />
                <span className="text-sm text-white/70">Target Rate</span>
              </div>
              <div className="text-lg font-semibold text-blue-400">
                {currentData.targetRate.toFixed(1)}%
              </div>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center mb-1">
                <PiggyBank className="h-4 w-4 text-yellow-400 mr-1" />
                <span className="text-sm text-white/70">This Period</span>
              </div>
              <div className="text-lg font-semibold text-yellow-400">
                {formatCurrency(currentData.savings)}
              </div>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center mb-1">
                <DollarSign className="h-4 w-4 text-white/70 mr-1" />
                <span className="text-sm text-white/70">Total Saved</span>
              </div>
              <div className="text-lg font-semibold text-white">
                {formatCurrency(savingsStats.totalSavings)}
              </div>
            </div>
          </div>
        )}

        {/* Performance Indicator */}
        {savingsStats && currentData && (
          <div className="flex items-center justify-center space-x-4 p-4 bg-black/20 rounded-lg">
            <div className="text-center">
              <div className="text-sm text-white/70">Target Hit Rate</div>
              <div className={`text-xl font-bold ${
                savingsStats.targetHitRate >= 80 ? 'text-green-400' :
                savingsStats.targetHitRate >= 60 ? 'text-yellow-400' : 'text-red-400'
              }`}>
                {savingsStats.targetHitRate.toFixed(0)}%
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-sm text-white/70">Trend</div>
              <div className={`text-xl font-bold flex items-center justify-center ${
                savingsStats.trend > 0 ? 'text-green-400' : 
                savingsStats.trend < 0 ? 'text-red-400' : 'text-gray-400'
              }`}>
                {savingsStats.trend > 0 ? (
                  <TrendingUp className="h-5 w-5 mr-1" />
                ) : savingsStats.trend < 0 ? (
                  <TrendingDown className="h-5 w-5 mr-1" />
                ) : null}
                {savingsStats.trend > 0 ? '+' : ''}{savingsStats.trend.toFixed(1)}%
              </div>
            </div>
          </div>
        )}

        {/* Chart Content */}
        <div className="min-h-[300px]">
          {isLoading ? (
            <div className="flex items-center justify-center h-80 text-white/50">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
              <span className="ml-3">Loading savings data...</span>
            </div>
          ) : data.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-80 text-white/50">
              <PiggyBank className="h-12 w-12 mb-4" />
              <p>No savings data available</p>
            </div>
          ) : (
            <>
              {viewType === 'rate' && <RateView />}
              {viewType === 'amount' && <AmountView />}
              {viewType === 'goals' && <GoalsView />}
              {viewType === 'projection' && <ProjectionView />}
            </>
          )}
        </div>

        {/* Savings Health Summary */}
        {currentData && (
          <div className="bg-black/20 rounded-lg p-4">
            <h4 className="font-medium text-white mb-3">Savings Health</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="flex items-center space-x-2">
                <Badge
                  variant="outline"
                  className={`${
                    currentData.savingsRate >= 20 ? 'text-green-500 border-green-500' :
                    currentData.savingsRate >= 10 ? 'text-yellow-500 border-yellow-500' :
                    'text-red-500 border-red-500'
                  }`}
                >
                  {currentData.savingsRate >= 20 ? 'Excellent' :
                   currentData.savingsRate >= 10 ? 'Good' : 'Needs Improvement'}
                </Badge>
                <span className="text-white/70">
                  {currentData.savingsRate.toFixed(1)}% savings rate
                </span>
              </div>
              
              <div className="flex items-center space-x-2">
                <Badge
                  variant="outline"
                  className={`${
                    currentData.savingsRate >= currentData.targetRate ? 'text-green-500 border-green-500' :
                    currentData.savingsRate >= currentData.targetRate * 0.8 ? 'text-yellow-500 border-yellow-500' :
                    'text-red-500 border-red-500'
                  }`}
                >
                  {currentData.savingsRate >= currentData.targetRate ? 'On Track' :
                   currentData.savingsRate >= currentData.targetRate * 0.8 ? 'Close' : 'Behind'}
                </Badge>
                <span className="text-white/70">vs target goal</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}