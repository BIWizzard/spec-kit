'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrendingUp, TrendingDown, DollarSign, Calendar, BarChart } from 'lucide-react';

interface CashFlowData {
  date: string;
  income: number;
  expenses: number;
  netFlow: number;
  cumulativeFlow: number;
}

interface CashFlowChartProps {
  data: CashFlowData[];
  period?: 'week' | 'month' | 'quarter' | 'year';
  onPeriodChange?: (period: 'week' | 'month' | 'quarter' | 'year') => void;
  isLoading?: boolean;
}

export default function CashFlowChart({
  data = [],
  period = 'month',
  onPeriodChange,
  isLoading = false
}: CashFlowChartProps) {
  const [viewType, setViewType] = useState<'flow' | 'cumulative'>('flow');

  const chartStats = useMemo(() => {
    if (!data.length) return null;

    const totalIncome = data.reduce((sum, d) => sum + d.income, 0);
    const totalExpenses = data.reduce((sum, d) => sum + d.expenses, 0);
    const netFlow = totalIncome - totalExpenses;
    const avgDailyFlow = netFlow / data.length;

    return {
      totalIncome,
      totalExpenses,
      netFlow,
      avgDailyFlow
    };
  }, [data]);

  const maxValue = useMemo(() => {
    if (!data.length) return 0;

    if (viewType === 'cumulative') {
      return Math.max(...data.map(d => Math.abs(d.cumulativeFlow)));
    } else {
      return Math.max(...data.map(d => Math.max(d.income, Math.abs(d.expenses), Math.abs(d.netFlow))));
    }
  }, [data, viewType]);

  const getBarHeight = (value: number) => {
    if (maxValue === 0) return 0;
    return Math.abs(value / maxValue) * 100;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    switch (period) {
      case 'week':
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      case 'month':
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      case 'quarter':
        return date.toLocaleDateString('en-US', { month: 'short' });
      case 'year':
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
      default:
        return date.toLocaleDateString();
    }
  };

  return (
    <Card className="w-full bg-white/10 backdrop-blur-md border border-white/20">
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
          <CardTitle className="text-xl font-semibold text-white">
            Cash Flow Analysis
          </CardTitle>

          <div className="flex items-center space-x-2">
            <Select value={period} onValueChange={onPeriodChange}>
              <SelectTrigger className="w-[120px] bg-white/10 border-white/20 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                <SelectItem value="week">Week</SelectItem>
                <SelectItem value="month">Month</SelectItem>
                <SelectItem value="quarter">Quarter</SelectItem>
                <SelectItem value="year">Year</SelectItem>
              </SelectContent>
            </Select>

            <Select value={viewType} onValueChange={(value: 'flow' | 'cumulative') => setViewType(value)}>
              <SelectTrigger className="w-[140px] bg-white/10 border-white/20 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                <SelectItem value="flow">Cash Flow</SelectItem>
                <SelectItem value="cumulative">Cumulative</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Summary Stats */}
        {chartStats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="flex items-center justify-center mb-1">
                <TrendingUp className="h-4 w-4 text-green-400 mr-1" />
                <span className="text-sm text-white/70">Total Income</span>
              </div>
              <div className="text-lg font-semibold text-green-400">
                {formatCurrency(chartStats.totalIncome)}
              </div>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center mb-1">
                <TrendingDown className="h-4 w-4 text-red-400 mr-1" />
                <span className="text-sm text-white/70">Total Expenses</span>
              </div>
              <div className="text-lg font-semibold text-red-400">
                {formatCurrency(chartStats.totalExpenses)}
              </div>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center mb-1">
                <DollarSign className="h-4 w-4 text-white/70 mr-1" />
                <span className="text-sm text-white/70">Net Flow</span>
              </div>
              <div className={`text-lg font-semibold ${
                chartStats.netFlow >= 0 ? 'text-green-400' : 'text-red-400'
              }`}>
                {formatCurrency(chartStats.netFlow)}
              </div>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center mb-1">
                <BarChart className="h-4 w-4 text-white/70 mr-1" />
                <span className="text-sm text-white/70">Avg Daily</span>
              </div>
              <div className={`text-lg font-semibold ${
                chartStats.avgDailyFlow >= 0 ? 'text-green-400' : 'text-red-400'
              }`}>
                {formatCurrency(chartStats.avgDailyFlow)}
              </div>
            </div>
          </div>
        )}

        {/* Chart */}
        <div className="relative">
          {isLoading ? (
            <div className="flex items-center justify-center h-80 text-white/50">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
              <span className="ml-3">Loading chart data...</span>
            </div>
          ) : data.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-80 text-white/50">
              <BarChart className="h-12 w-12 mb-4" />
              <p>No data available for the selected period</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Chart Area */}
              <div className="relative bg-black/20 rounded-lg p-4" style={{ height: '320px' }}>
                <div className="flex items-end justify-center h-full space-x-1">
                  {data.map((item, index) => (
                    <div key={index} className="flex-1 flex flex-col items-center max-w-[60px]">
                      {viewType === 'flow' ? (
                        <div className="flex flex-col items-center justify-end h-full w-full">
                          {/* Income Bar */}
                          <div
                            className="w-full bg-green-400/70 rounded-t-sm mb-1 min-h-[2px] relative group cursor-pointer"
                            style={{ height: `${getBarHeight(item.income)}%` }}
                          >
                            <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-black/80 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                              Income: {formatCurrency(item.income)}
                            </div>
                          </div>

                          {/* Expenses Bar */}
                          <div
                            className="w-full bg-red-400/70 rounded-t-sm mb-1 min-h-[2px] relative group cursor-pointer"
                            style={{ height: `${getBarHeight(item.expenses)}%` }}
                          >
                            <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-black/80 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                              Expenses: {formatCurrency(item.expenses)}
                            </div>
                          </div>

                          {/* Net Flow Indicator */}
                          <div className="w-full h-1 rounded relative">
                            <div
                              className={`h-full rounded ${
                                item.netFlow >= 0 ? 'bg-green-500' : 'bg-red-500'
                              } relative group cursor-pointer`}
                            >
                              <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-black/80 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                Net: {formatCurrency(item.netFlow)}
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-end h-full w-full">
                          {/* Cumulative Flow Bar */}
                          <div
                            className={`w-full rounded-t-sm min-h-[2px] relative group cursor-pointer ${
                              item.cumulativeFlow >= 0 ? 'bg-green-400/70' : 'bg-red-400/70'
                            }`}
                            style={{ height: `${getBarHeight(item.cumulativeFlow)}%` }}
                          >
                            <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-black/80 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                              Cumulative: {formatCurrency(item.cumulativeFlow)}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Date Label */}
                      <div className="text-xs text-white/60 mt-2 text-center transform -rotate-45 origin-top-left">
                        {formatDate(item.date)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Legend */}
              <div className="flex justify-center space-x-6 text-sm">
                {viewType === 'flow' ? (
                  <>
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-green-400/70 rounded mr-2"></div>
                      <span className="text-white/70">Income</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-red-400/70 rounded mr-2"></div>
                      <span className="text-white/70">Expenses</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-3 h-1 bg-green-500 rounded mr-2"></div>
                      <span className="text-white/70">Positive Net</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-3 h-1 bg-red-500 rounded mr-2"></div>
                      <span className="text-white/70">Negative Net</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-green-400/70 rounded mr-2"></div>
                      <span className="text-white/70">Positive Balance</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-red-400/70 rounded mr-2"></div>
                      <span className="text-white/70">Negative Balance</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Insights */}
        {chartStats && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-black/20 rounded-lg p-4">
              <h4 className="font-medium text-white mb-2">Cash Flow Health</h4>
              <div className="flex items-center space-x-2">
                <Badge
                  variant="outline"
                  className={`${
                    chartStats.netFlow >= 1000 ? 'text-green-500 border-green-500' :
                    chartStats.netFlow >= 0 ? 'text-yellow-500 border-yellow-500' :
                    'text-red-500 border-red-500'
                  }`}
                >
                  {chartStats.netFlow >= 1000 ? 'Excellent' :
                   chartStats.netFlow >= 0 ? 'Good' : 'Needs Attention'}
                </Badge>
                <span className="text-white/70 text-sm">
                  {chartStats.netFlow >= 0
                    ? 'Positive cash flow trend'
                    : 'Consider reducing expenses'
                  }
                </span>
              </div>
            </div>

            <div className="bg-black/20 rounded-lg p-4">
              <h4 className="font-medium text-white mb-2">Expense Ratio</h4>
              <div className="flex items-center space-x-2">
                <Badge
                  variant="outline"
                  className="text-[#FFD166] border-[#FFD166]"
                >
                  {chartStats.totalIncome > 0 ? Math.round((chartStats.totalExpenses / chartStats.totalIncome) * 100) : 0}%
                </Badge>
                <span className="text-white/70 text-sm">
                  of income spent on expenses
                </span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}