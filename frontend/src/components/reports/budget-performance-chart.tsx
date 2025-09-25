'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Target, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

interface BudgetPerformanceData {
  categoryId: string;
  categoryName: string;
  budgeted: number;
  actual: number;
  variance: number;
  variancePercentage: number;
  status: 'under' | 'over' | 'on-track';
  color: string;
  trend?: 'improving' | 'worsening' | 'stable';
}

interface BudgetPerformanceChartProps {
  data: BudgetPerformanceData[];
  period?: 'week' | 'month' | 'quarter' | 'year';
  viewType?: 'variance' | 'utilization' | 'trend';
  onPeriodChange?: (period: 'week' | 'month' | 'quarter' | 'year') => void;
  onViewChange?: (view: 'variance' | 'utilization' | 'trend') => void;
  isLoading?: boolean;
}

export default function BudgetPerformanceChart({
  data = [],
  period = 'month',
  viewType = 'variance',
  onPeriodChange,
  onViewChange,
  isLoading = false
}: BudgetPerformanceChartProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const performanceStats = useMemo(() => {
    if (!data.length) return null;

    const totalBudgeted = data.reduce((sum, d) => sum + d.budgeted, 0);
    const totalActual = data.reduce((sum, d) => sum + d.actual, 0);
    const totalVariance = totalActual - totalBudgeted;
    const overBudgetCategories = data.filter(d => d.status === 'over').length;
    const underBudgetCategories = data.filter(d => d.status === 'under').length;
    const onTrackCategories = data.filter(d => d.status === 'on-track').length;
    const utilizationRate = totalBudgeted > 0 ? (totalActual / totalBudgeted) * 100 : 0;

    return {
      totalBudgeted,
      totalActual,
      totalVariance,
      overBudgetCategories,
      underBudgetCategories,
      onTrackCategories,
      utilizationRate
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'over': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'under': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'on-track': return <Target className="h-4 w-4 text-blue-500" />;
      default: return null;
    }
  };

  const getTrendIcon = (trend?: string) => {
    switch (trend) {
      case 'improving': return <TrendingUp className="h-3 w-3 text-green-500" />;
      case 'worsening': return <TrendingDown className="h-3 w-3 text-red-500" />;
      default: return null;
    }
  };

  const getVarianceColor = (variance: number) => {
    if (variance > 0) return 'text-red-500';
    if (variance < 0) return 'text-green-500';
    return 'text-gray-500';
  };

  const VarianceView = () => {
    const maxVariance = Math.max(...data.map(d => Math.abs(d.variance)));

    return (
      <div className="space-y-4">
        {data.map((item, index) => (
          <div
            key={item.categoryId}
            className={`p-4 rounded-lg border transition-colors cursor-pointer ${
              selectedCategory === item.categoryId
                ? 'bg-white/20 border-white/40'
                : 'bg-white/5 border-white/20 hover:bg-white/10'
            }`}
            onClick={() => setSelectedCategory(
              selectedCategory === item.categoryId ? null : item.categoryId
            )}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                {getStatusIcon(item.status)}
                <h4 className="font-medium text-white">{item.categoryName}</h4>
                {getTrendIcon(item.trend)}
              </div>
              <Badge
                variant="outline"
                className={`${
                  item.status === 'over' ? 'text-red-500 border-red-500' :
                  item.status === 'under' ? 'text-green-500 border-green-500' :
                  'text-blue-500 border-blue-500'
                }`}
              >
                {item.status === 'over' ? 'Over Budget' :
                 item.status === 'under' ? 'Under Budget' : 'On Track'}
              </Badge>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-3">
              <div>
                <div className="text-xs text-white/70">Budgeted</div>
                <div className="font-semibold text-white">{formatCurrency(item.budgeted)}</div>
              </div>
              <div>
                <div className="text-xs text-white/70">Actual</div>
                <div className="font-semibold text-white">{formatCurrency(item.actual)}</div>
              </div>
              <div>
                <div className="text-xs text-white/70">Variance</div>
                <div className={`font-semibold ${getVarianceColor(item.variance)}`}>
                  {item.variance > 0 ? '+' : ''}{formatCurrency(item.variance)}
                </div>
              </div>
            </div>

            {/* Variance Bar */}
            <div className="relative h-2 bg-gray-300/20 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  item.variance > 0 ? 'bg-red-500' : 'bg-green-500'
                }`}
                style={{
                  width: `${Math.abs(item.variance) / maxVariance * 100}%`
                }}
              />
            </div>

            <div className="mt-2 text-xs text-white/60 text-right">
              {item.variancePercentage > 0 ? '+' : ''}{item.variancePercentage.toFixed(1)}% vs budget
            </div>
          </div>
        ))}
      </div>
    );
  };

  const UtilizationView = () => {
    return (
      <div className="space-y-4">
        {data.map((item, index) => {
          const utilizationRate = item.budgeted > 0 ? (item.actual / item.budgeted) * 100 : 0;

          return (
            <div key={item.categoryId} className="p-4 bg-white/5 rounded-lg border border-white/20">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-white">{item.categoryName}</h4>
                <div className="text-right">
                  <div className="font-semibold text-white">
                    {formatCurrency(item.actual)} / {formatCurrency(item.budgeted)}
                  </div>
                  <div className={`text-sm ${
                    utilizationRate > 100 ? 'text-red-400' :
                    utilizationRate > 80 ? 'text-yellow-400' : 'text-green-400'
                  }`}>
                    {utilizationRate.toFixed(1)}% utilized
                  </div>
                </div>
              </div>

              {/* Utilization Bar */}
              <div className="relative h-4 bg-gray-300/20 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    utilizationRate > 100 ? 'bg-red-500' :
                    utilizationRate > 80 ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                  style={{
                    width: `${Math.min(utilizationRate, 100)}%`
                  }}
                />

                {/* Over-utilization indicator */}
                {utilizationRate > 100 && (
                  <div className="absolute right-0 top-0 h-full flex items-center pr-2">
                    <AlertTriangle className="h-3 w-3 text-red-300" />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const TrendView = () => {
    return (
      <div className="text-center py-8 text-white/60">
        <TrendingUp className="h-8 w-8 mx-auto mb-2" />
        <p>Trend analysis visualization</p>
        <p className="text-sm">Historical performance trends will be displayed here</p>
      </div>
    );
  };

  return (
    <Card className="w-full bg-white/10 backdrop-blur-md border border-white/20">
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
          <CardTitle className="text-xl font-semibold text-white">
            Budget Performance
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

            <Select value={viewType} onValueChange={onViewChange}>
              <SelectTrigger className="w-[140px] bg-white/10 border-white/20 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                <SelectItem value="variance">Variance</SelectItem>
                <SelectItem value="utilization">Utilization</SelectItem>
                <SelectItem value="trend">Trend</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Summary Stats */}
        {performanceStats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="flex items-center justify-center mb-1">
                <Target className="h-4 w-4 text-blue-400 mr-1" />
                <span className="text-sm text-white/70">Total Budgeted</span>
              </div>
              <div className="text-lg font-semibold text-blue-400">
                {formatCurrency(performanceStats.totalBudgeted)}
              </div>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center mb-1">
                <TrendingDown className="h-4 w-4 text-white/70 mr-1" />
                <span className="text-sm text-white/70">Total Actual</span>
              </div>
              <div className="text-lg font-semibold text-white">
                {formatCurrency(performanceStats.totalActual)}
              </div>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center mb-1">
                <span className="text-sm text-white/70">Utilization</span>
              </div>
              <div className={`text-lg font-semibold ${
                performanceStats.utilizationRate > 100 ? 'text-red-400' :
                performanceStats.utilizationRate > 80 ? 'text-yellow-400' : 'text-green-400'
              }`}>
                {performanceStats.utilizationRate.toFixed(1)}%
              </div>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center mb-1">
                <span className="text-sm text-white/70">Over Budget</span>
              </div>
              <div className={`text-lg font-semibold ${
                performanceStats.overBudgetCategories > 0 ? 'text-red-400' : 'text-green-400'
              }`}>
                {performanceStats.overBudgetCategories} categories
              </div>
            </div>
          </div>
        )}

        {/* Chart Content */}
        <div className="min-h-[400px]">
          {isLoading ? (
            <div className="flex items-center justify-center h-80 text-white/50">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
              <span className="ml-3">Loading budget performance...</span>
            </div>
          ) : data.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-80 text-white/50">
              <Target className="h-12 w-12 mb-4" />
              <p>No budget performance data available</p>
            </div>
          ) : (
            <>
              {viewType === 'variance' && <VarianceView />}
              {viewType === 'utilization' && <UtilizationView />}
              {viewType === 'trend' && <TrendView />}
            </>
          )}
        </div>

        {/* Performance Summary */}
        {performanceStats && (
          <div className="bg-black/20 rounded-lg p-4">
            <h4 className="font-medium text-white mb-3">Performance Summary</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-white/70">
                  {performanceStats.underBudgetCategories} categories under budget
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <Target className="h-4 w-4 text-blue-500" />
                <span className="text-white/70">
                  {performanceStats.onTrackCategories} categories on track
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <XCircle className="h-4 w-4 text-red-500" />
                <span className="text-white/70">
                  {performanceStats.overBudgetCategories} categories over budget
                </span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}