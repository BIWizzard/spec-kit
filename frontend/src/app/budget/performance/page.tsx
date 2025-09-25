'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Target,
  AlertTriangle,
  Calendar,
  BarChart3,
  PieChart,
  Activity,
  Download,
  Filter
} from 'lucide-react';
import Link from 'next/link';

interface CategoryPerformance {
  id: string;
  name: string;
  color: string;
  allocated: number;
  spent: number;
  variance: number;
  variancePercent: number;
  trend: 'up' | 'down' | 'stable';
  status: 'on_budget' | 'over_budget' | 'under_budget';
}

interface BudgetPerformance {
  period: string;
  totalBudget: number;
  totalSpent: number;
  overallVariance: number;
  overallVariancePercent: number;
  categories: CategoryPerformance[];
  monthlyTrends: {
    month: string;
    budgeted: number;
    actual: number;
  }[];
}

const BudgetPerformancePage = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [viewType, setViewType] = useState<'chart' | 'table'>('chart');

  const { data: performance, isLoading } = useQuery<BudgetPerformance>({
    queryKey: ['budget', 'performance', selectedPeriod],
    queryFn: async () => {
      const response = await fetch(`/api/budget/performance?period=${selectedPeriod}`);
      if (!response.ok) throw new Error('Failed to fetch performance data');
      return response.json();
    },
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'on_budget': return 'text-[#8FAD77]';
      case 'over_budget': return 'text-red-400';
      case 'under_budget': return 'text-[#FFD166]';
      default: return 'text-slate-400';
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'on_budget': return 'bg-[#8FAD77]';
      case 'over_budget': return 'bg-red-400';
      case 'under_budget': return 'bg-[#FFD166]';
      default: return 'bg-slate-400';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-4 h-4 text-red-400" />;
      case 'down': return <TrendingDown className="w-4 h-4 text-[#8FAD77]" />;
      default: return <Target className="w-4 h-4 text-slate-400" />;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-slate-700 rounded w-64"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-slate-700 rounded-xl"></div>
              ))}
            </div>
            <div className="h-96 bg-slate-700 rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!performance) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">No Performance Data</h2>
            <p className="text-slate-400">
              No budget performance data available for the selected period.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const filteredCategories = selectedCategory === 'all'
    ? performance.categories
    : performance.categories.filter(cat => cat.id === selectedCategory);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
          <div className="flex items-center">
            <Link
              href="/budget"
              className="mr-4 p-2 text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Budget Performance</h1>
              <p className="text-slate-400">
                Track your actual spending vs budget allocations
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 mt-4 sm:mt-0">
            {/* Period Selector */}
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="px-4 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white focus:ring-2 focus:ring-[#FFD166] focus:border-transparent"
            >
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="quarter">This Quarter</option>
              <option value="year">This Year</option>
            </select>

            {/* View Toggle */}
            <div className="flex bg-white/10 rounded-lg p-1">
              <button
                onClick={() => setViewType('chart')}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  viewType === 'chart' ? 'bg-[#FFD166] text-slate-900' : 'text-white hover:text-[#FFD166]'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewType('table')}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  viewType === 'table' ? 'bg-[#FFD166] text-slate-900' : 'text-white hover:text-[#FFD166]'
                }`}
              >
                <Activity className="w-4 h-4" />
              </button>
            </div>

            <button className="inline-flex items-center px-4 py-2 bg-[#FFD166] text-slate-900 font-semibold rounded-lg hover:bg-[#FFD166]/90 transition-colors">
              <Download className="w-4 h-4 mr-2" />
              Export
            </button>
          </div>
        </div>

        {/* Performance Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Total Budget</p>
                <p className="text-2xl font-bold text-white">
                  {formatCurrency(performance.totalBudget)}
                </p>
              </div>
              <Target className="w-8 h-8 text-[#FFD166]" />
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Total Spent</p>
                <p className="text-2xl font-bold text-white">
                  {formatCurrency(performance.totalSpent)}
                </p>
              </div>
              <BarChart3 className="w-8 h-8 text-[#5E7F9B]" />
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Variance</p>
                <p className={`text-2xl font-bold ${
                  performance.overallVariance > 0 ? 'text-red-400' : 'text-[#8FAD77]'
                }`}>
                  {performance.overallVariance > 0 ? '+' : ''}{formatCurrency(performance.overallVariance)}
                </p>
                <p className="text-xs text-slate-400">
                  {performance.overallVariancePercent > 0 ? '+' : ''}{performance.overallVariancePercent.toFixed(1)}%
                </p>
              </div>
              {getTrendIcon(performance.overallVariance > 0 ? 'up' : performance.overallVariance < 0 ? 'down' : 'stable')}
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Utilization</p>
                <p className="text-2xl font-bold text-white">
                  {performance.totalBudget > 0 ? Math.round((performance.totalSpent / performance.totalBudget) * 100) : 0}%
                </p>
              </div>
              <PieChart className="w-8 h-8 text-[#8FAD77]" />
            </div>
          </div>
        </div>

        {/* Category Filter */}
        <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white flex items-center">
              <Filter className="w-5 h-5 mr-2" />
              Category Filter
            </h2>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedCategory === 'all'
                  ? 'bg-[#FFD166] text-slate-900'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              All Categories
            </button>
            {performance.categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center ${
                  selectedCategory === category.id
                    ? 'bg-[#FFD166] text-slate-900'
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                <div
                  className="w-3 h-3 rounded-full mr-2"
                  style={{ backgroundColor: category.color }}
                ></div>
                {category.name}
              </button>
            ))}
          </div>
        </div>

        {/* Performance Visualization */}
        {viewType === 'chart' ? (
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6 mb-8">
            <h2 className="text-xl font-bold text-white mb-6">Category Performance Chart</h2>

            <div className="space-y-6">
              {filteredCategories.map((category) => {
                const spentPercentage = category.allocated > 0 ? (category.spent / category.allocated) * 100 : 0;

                return (
                  <div key={category.id} className="bg-white/5 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center">
                        <div
                          className="w-4 h-4 rounded-full mr-3"
                          style={{ backgroundColor: category.color }}
                        ></div>
                        <div>
                          <h3 className="font-semibold text-white">{category.name}</h3>
                          <p className="text-sm text-slate-400">
                            Budget: {formatCurrency(category.allocated)} | Spent: {formatCurrency(category.spent)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-lg font-bold ${getStatusColor(category.status)}`}>
                          {category.variance > 0 ? '+' : ''}{formatCurrency(category.variance)}
                        </div>
                        <div className="flex items-center text-sm text-slate-400">
                          {getTrendIcon(category.trend)}
                          <span className="ml-1">
                            {category.variancePercent > 0 ? '+' : ''}{category.variancePercent.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="relative">
                      <div className="w-full bg-slate-700 rounded-full h-4 mb-2">
                        <div
                          className={`h-4 rounded-full transition-all duration-300 ${getStatusBg(category.status)}`}
                          style={{ width: `${Math.min(spentPercentage, 100)}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between text-xs text-slate-400">
                        <span>$0</span>
                        <span className="font-medium text-white">
                          {spentPercentage.toFixed(1)}% utilized
                        </span>
                        <span>{formatCurrency(category.allocated)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6 mb-8">
            <h2 className="text-xl font-bold text-white mb-6">Performance Table</h2>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/20">
                    <th className="pb-3 text-slate-300 font-medium">Category</th>
                    <th className="pb-3 text-slate-300 font-medium text-right">Budgeted</th>
                    <th className="pb-3 text-slate-300 font-medium text-right">Spent</th>
                    <th className="pb-3 text-slate-300 font-medium text-right">Variance</th>
                    <th className="pb-3 text-slate-300 font-medium text-right">Status</th>
                    <th className="pb-3 text-slate-300 font-medium text-center">Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCategories.map((category) => (
                    <tr key={category.id} className="border-b border-white/10">
                      <td className="py-4">
                        <div className="flex items-center">
                          <div
                            className="w-3 h-3 rounded-full mr-3"
                            style={{ backgroundColor: category.color }}
                          ></div>
                          <span className="font-medium text-white">{category.name}</span>
                        </div>
                      </td>
                      <td className="py-4 text-right text-white">{formatCurrency(category.allocated)}</td>
                      <td className="py-4 text-right text-white">{formatCurrency(category.spent)}</td>
                      <td className={`py-4 text-right font-semibold ${getStatusColor(category.status)}`}>
                        {category.variance > 0 ? '+' : ''}{formatCurrency(category.variance)}
                      </td>
                      <td className="py-4 text-right">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          category.status === 'on_budget' ? 'bg-[#8FAD77]/20 text-[#8FAD77]' :
                          category.status === 'over_budget' ? 'bg-red-400/20 text-red-400' :
                          'bg-[#FFD166]/20 text-[#FFD166]'
                        }`}>
                          {category.status === 'on_budget' ? 'On Budget' :
                           category.status === 'over_budget' ? 'Over Budget' :
                           'Under Budget'}
                        </span>
                      </td>
                      <td className="py-4 text-center">
                        {getTrendIcon(category.trend)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Monthly Trends */}
        {performance.monthlyTrends.length > 0 && (
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-6">Monthly Trends</h2>

            <div className="space-y-4">
              {performance.monthlyTrends.map((trend, index) => (
                <div key={index} className="flex items-center justify-between py-3 border-b border-white/10 last:border-b-0">
                  <div>
                    <h3 className="font-medium text-white">{trend.month}</h3>
                  </div>
                  <div className="flex items-center space-x-6">
                    <div className="text-right">
                      <p className="text-sm text-slate-400">Budgeted</p>
                      <p className="font-semibold text-[#FFD166]">{formatCurrency(trend.budgeted)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-slate-400">Actual</p>
                      <p className="font-semibold text-white">{formatCurrency(trend.actual)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-slate-400">Variance</p>
                      <p className={`font-semibold ${
                        trend.actual > trend.budgeted ? 'text-red-400' : 'text-[#8FAD77]'
                      }`}>
                        {trend.actual > trend.budgeted ? '+' : ''}{formatCurrency(trend.actual - trend.budgeted)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BudgetPerformancePage;