'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PieChart, BarChart3, TrendingUp, TrendingDown, Filter, Target } from 'lucide-react';

interface SpendingData {
  category: string;
  amount: number;
  percentage: number;
  change: number;
  budget?: number;
  color: string;
  subcategories?: Array<{
    name: string;
    amount: number;
    percentage: number;
  }>;
}

interface SpendingChartProps {
  data: SpendingData[];
  period?: 'week' | 'month' | 'quarter' | 'year';
  viewType?: 'pie' | 'bar' | 'breakdown';
  onPeriodChange?: (period: 'week' | 'month' | 'quarter' | 'year') => void;
  onViewChange?: (view: 'pie' | 'bar' | 'breakdown') => void;
  isLoading?: boolean;
}

export default function SpendingChart({
  data = [],
  period = 'month',
  viewType = 'pie',
  onPeriodChange,
  onViewChange,
  isLoading = false
}: SpendingChartProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const chartStats = useMemo(() => {
    if (!data.length) return null;

    const totalSpending = data.reduce((sum, d) => sum + d.amount, 0);
    const totalBudget = data.reduce((sum, d) => sum + (d.budget || 0), 0);
    const overBudgetCategories = data.filter(d => d.budget && d.amount > d.budget);
    const avgCategorySpend = totalSpending / data.length;

    return {
      totalSpending,
      totalBudget,
      budgetUtilization: totalBudget > 0 ? (totalSpending / totalBudget) * 100 : 0,
      overBudgetCount: overBudgetCategories.length,
      avgCategorySpend
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

  const getChangeColor = (change: number) => {
    if (change > 0) return 'text-red-500';
    if (change < 0) return 'text-green-500';
    return 'text-gray-500';
  };

  const getBudgetStatus = (amount: number, budget?: number) => {
    if (!budget) return null;
    const utilization = (amount / budget) * 100;

    if (utilization > 100) return { status: 'over', color: 'text-red-500', label: 'Over Budget' };
    if (utilization > 80) return { status: 'high', color: 'text-yellow-500', label: 'Near Limit' };
    return { status: 'good', color: 'text-green-500', label: 'On Track' };
  };

  const PieChart = () => {
    const radius = 80;
    const centerX = 100;
    const centerY = 100;
    let currentAngle = -90;

    return (
      <div className="relative">
        <svg width="200" height="200" className="mx-auto">
          {data.map((item, index) => {
            const angle = (item.percentage / 100) * 360;
            const startAngle = (currentAngle * Math.PI) / 180;
            const endAngle = ((currentAngle + angle) * Math.PI) / 180;

            const x1 = centerX + radius * Math.cos(startAngle);
            const y1 = centerY + radius * Math.sin(startAngle);
            const x2 = centerX + radius * Math.cos(endAngle);
            const y2 = centerY + radius * Math.sin(endAngle);

            const largeArcFlag = angle > 180 ? 1 : 0;

            const pathData = [
              `M ${centerX} ${centerY}`,
              `L ${x1} ${y1}`,
              `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
              'Z'
            ].join(' ');

            currentAngle += angle;

            return (
              <path
                key={index}
                d={pathData}
                fill={item.color}
                className={`cursor-pointer transition-opacity hover:opacity-80 ${
                  selectedCategory === item.category ? 'opacity-100' : 'opacity-70'
                }`}
                onClick={() => setSelectedCategory(selectedCategory === item.category ? null : item.category)}
              />
            );
          })}

          {/* Center circle */}
          <circle
            cx={centerX}
            cy={centerY}
            r={30}
            fill="rgba(0,0,0,0.6)"
            className="cursor-pointer"
            onClick={() => setSelectedCategory(null)}
          />

          {/* Total amount in center */}
          <text
            x={centerX}
            y={centerY - 5}
            textAnchor="middle"
            className="fill-white text-sm font-semibold"
          >
            Total
          </text>
          <text
            x={centerX}
            y={centerY + 10}
            textAnchor="middle"
            className="fill-white text-xs"
          >
            {formatCurrency(chartStats?.totalSpending || 0)}
          </text>
        </svg>

        {/* Legend */}
        <div className="mt-4 space-y-2">
          {data.map((item, index) => (
            <div
              key={index}
              className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors ${
                selectedCategory === item.category ? 'bg-white/20' : 'hover:bg-white/10'
              }`}
              onClick={() => setSelectedCategory(selectedCategory === item.category ? null : item.category)}
            >
              <div className="flex items-center space-x-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: item.color }}
                ></div>
                <span className="text-sm text-white">{item.category}</span>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium text-white">
                  {formatCurrency(item.amount)} ({item.percentage.toFixed(1)}%)
                </div>
                {item.change !== 0 && (
                  <div className={`text-xs ${getChangeColor(item.change)}`}>
                    {item.change > 0 ? '+' : ''}{item.change.toFixed(1)}%
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const BarChart = () => {
    const maxAmount = Math.max(...data.map(d => Math.max(d.amount, d.budget || 0)));

    return (
      <div className="space-y-3">
        {data.map((item, index) => (
          <div key={index} className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-white font-medium">{item.category}</span>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-white">{formatCurrency(item.amount)}</span>
                {item.budget && (
                  <Badge variant="outline" className="text-xs h-4 px-1 text-white/70 border-white/30">
                    of {formatCurrency(item.budget)}
                  </Badge>
                )}
              </div>
            </div>

            <div className="relative">
              {/* Budget bar (background) */}
              {item.budget && (
                <div
                  className="h-6 bg-white/10 rounded-full absolute top-0 left-0"
                  style={{ width: '100%' }}
                />
              )}

              {/* Spending bar */}
              <div
                className="h-6 rounded-full relative overflow-hidden transition-all duration-500"
                style={{
                  width: `${item.budget ? (item.amount / item.budget) * 100 : (item.amount / maxAmount) * 100}%`,
                  backgroundColor: item.color,
                  maxWidth: '100%'
                }}
              >
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/20" />
              </div>

              {/* Budget status indicator */}
              {item.budget && item.amount > item.budget && (
                <div className="absolute right-0 top-0 h-6 flex items-center">
                  <TrendingUp className="h-4 w-4 text-red-400 ml-1" />
                </div>
              )}
            </div>

            {/* Budget status */}
            {item.budget && (
              <div className="flex justify-between items-center text-xs">
                <span className="text-white/60">
                  {((item.amount / item.budget) * 100).toFixed(1)}% of budget
                </span>
                {(() => {
                  const status = getBudgetStatus(item.amount, item.budget);
                  return status && (
                    <Badge variant="outline" className={`${status.color} border-current text-xs h-4 px-1`}>
                      {status.label}
                    </Badge>
                  );
                })()}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  const BreakdownView = () => {
    const selectedItem = data.find(d => d.category === selectedCategory);

    return (
      <div className="space-y-4">
        {/* Category selector */}
        <Select value={selectedCategory || ''} onValueChange={setSelectedCategory}>
          <SelectTrigger className="bg-white/10 border-white/20 text-white">
            <SelectValue placeholder="Select category for breakdown" />
          </SelectTrigger>
          <SelectContent className="bg-gray-800 border-gray-700">
            {data.map((item) => (
              <SelectItem key={item.category} value={item.category}>
                {item.category} - {formatCurrency(item.amount)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Subcategory breakdown */}
        {selectedItem?.subcategories && (
          <div className="space-y-3">
            <h4 className="font-medium text-white">{selectedItem.category} Breakdown</h4>
            {selectedItem.subcategories.map((sub, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <span className="text-white/90">{sub.name}</span>
                <div className="text-right">
                  <div className="text-white font-medium">{formatCurrency(sub.amount)}</div>
                  <div className="text-white/60 text-sm">{sub.percentage.toFixed(1)}% of category</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!selectedCategory && (
          <div className="text-center py-8 text-white/60">
            <Filter className="h-8 w-8 mx-auto mb-2" />
            <p>Select a category to view detailed breakdown</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <Card className="w-full bg-white/10 backdrop-blur-md border border-white/20">
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
          <CardTitle className="text-xl font-semibold text-white">
            Spending Analysis
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
              <SelectTrigger className="w-[120px] bg-white/10 border-white/20 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                <SelectItem value="pie">Pie Chart</SelectItem>
                <SelectItem value="bar">Bar Chart</SelectItem>
                <SelectItem value="breakdown">Breakdown</SelectItem>
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
                <TrendingDown className="h-4 w-4 text-red-400 mr-1" />
                <span className="text-sm text-white/70">Total Spent</span>
              </div>
              <div className="text-lg font-semibold text-white">
                {formatCurrency(chartStats.totalSpending)}
              </div>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center mb-1">
                <Target className="h-4 w-4 text-blue-400 mr-1" />
                <span className="text-sm text-white/70">Total Budget</span>
              </div>
              <div className="text-lg font-semibold text-blue-400">
                {formatCurrency(chartStats.totalBudget)}
              </div>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center mb-1">
                <BarChart3 className="h-4 w-4 text-yellow-400 mr-1" />
                <span className="text-sm text-white/70">Budget Usage</span>
              </div>
              <div className={`text-lg font-semibold ${
                chartStats.budgetUtilization > 100 ? 'text-red-400' :
                chartStats.budgetUtilization > 80 ? 'text-yellow-400' : 'text-green-400'
              }`}>
                {chartStats.budgetUtilization.toFixed(1)}%
              </div>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center mb-1">
                <TrendingUp className="h-4 w-4 text-white/70 mr-1" />
                <span className="text-sm text-white/70">Over Budget</span>
              </div>
              <div className={`text-lg font-semibold ${
                chartStats.overBudgetCount > 0 ? 'text-red-400' : 'text-green-400'
              }`}>
                {chartStats.overBudgetCount} categories
              </div>
            </div>
          </div>
        )}

        {/* Chart Content */}
        <div className="min-h-[300px]">
          {isLoading ? (
            <div className="flex items-center justify-center h-80 text-white/50">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
              <span className="ml-3">Loading spending data...</span>
            </div>
          ) : data.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-80 text-white/50">
              <PieChart className="h-12 w-12 mb-4" />
              <p>No spending data available for the selected period</p>
            </div>
          ) : (
            <>
              {viewType === 'pie' && <PieChart />}
              {viewType === 'bar' && <BarChart />}
              {viewType === 'breakdown' && <BreakdownView />}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}