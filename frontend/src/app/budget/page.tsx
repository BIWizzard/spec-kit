'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  PieChart,
  BarChart,
  TrendingUp,
  DollarSign,
  Target,
  AlertTriangle,
  Settings,
  Plus,
  Download
} from 'lucide-react';
import Link from 'next/link';

interface BudgetCategory {
  id: string;
  name: string;
  targetPercentage: number;
  color: string;
  actualSpent: number;
  allocated: number;
  isActive: boolean;
}

interface BudgetOverview {
  totalIncome: number;
  totalAllocated: number;
  totalSpent: number;
  unallocated: number;
  categories: BudgetCategory[];
  performanceMetrics: {
    onBudgetCategories: number;
    overBudgetCategories: number;
    underBudgetCategories: number;
    overallVariance: number;
  };
}

const BudgetOverviewPage = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('month');

  const { data: budgetOverview, isLoading } = useQuery<BudgetOverview>({
    queryKey: ['budget', 'overview', selectedPeriod],
    queryFn: async () => {
      const response = await fetch(`/api/budget/overview?period=${selectedPeriod}`);
      if (!response.ok) throw new Error('Failed to fetch budget overview');
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

  const getProgressColor = (actual: number, allocated: number) => {
    const percentage = allocated > 0 ? (actual / allocated) * 100 : 0;
    if (percentage > 100) return 'bg-red-500';
    if (percentage > 85) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getVarianceIcon = (variance: number) => {
    if (variance > 0) return <TrendingUp className="w-4 h-4 text-red-400" />;
    if (variance < 0) return <TrendingUp className="w-4 h-4 text-green-400 rotate-180" />;
    return <Target className="w-4 h-4 text-blue-400" />;
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="h-96 bg-slate-700 rounded-xl"></div>
              <div className="h-96 bg-slate-700 rounded-xl"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!budgetOverview) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">No Budget Data</h2>
            <p className="text-slate-400 mb-6">
              Set up your budget categories to start tracking your finances.
            </p>
            <Link
              href="/budget/categories"
              className="inline-flex items-center px-6 py-3 bg-[#FFD166] text-slate-900 font-semibold rounded-lg hover:bg-[#FFD166]/90 transition-colors"
            >
              <Plus className="w-5 h-5 mr-2" />
              Create Budget Categories
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Budget Overview</h1>
            <p className="text-slate-400">
              Track your budget performance and spending patterns
            </p>
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

            {/* Action Buttons */}
            <Link
              href="/budget/categories"
              className="inline-flex items-center px-4 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white hover:bg-white/20 transition-colors"
            >
              <Settings className="w-4 h-4 mr-2" />
              Manage Categories
            </Link>

            <button className="inline-flex items-center px-4 py-2 bg-[#FFD166] text-slate-900 font-semibold rounded-lg hover:bg-[#FFD166]/90 transition-colors">
              <Download className="w-4 h-4 mr-2" />
              Export
            </button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Total Income</p>
                <p className="text-2xl font-bold text-white">
                  {formatCurrency(budgetOverview.totalIncome)}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-[#8FAD77]" />
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Allocated</p>
                <p className="text-2xl font-bold text-white">
                  {formatCurrency(budgetOverview.totalAllocated)}
                </p>
                <p className="text-xs text-slate-400">
                  {budgetOverview.totalIncome > 0 ?
                    Math.round((budgetOverview.totalAllocated / budgetOverview.totalIncome) * 100) : 0
                  }% of income
                </p>
              </div>
              <Target className="w-8 h-8 text-[#FFD166]" />
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Spent</p>
                <p className="text-2xl font-bold text-white">
                  {formatCurrency(budgetOverview.totalSpent)}
                </p>
                <p className="text-xs text-slate-400">
                  {budgetOverview.totalAllocated > 0 ?
                    Math.round((budgetOverview.totalSpent / budgetOverview.totalAllocated) * 100) : 0
                  }% of budget
                </p>
              </div>
              <BarChart className="w-8 h-8 text-[#5E7F9B]" />
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Unallocated</p>
                <p className="text-2xl font-bold text-white">
                  {formatCurrency(budgetOverview.unallocated)}
                </p>
                <div className="flex items-center mt-1">
                  {getVarianceIcon(budgetOverview.performanceMetrics.overallVariance)}
                  <span className="text-xs text-slate-400 ml-1">
                    {budgetOverview.performanceMetrics.overallVariance > 0 ? '+' : ''}
                    {budgetOverview.performanceMetrics.overallVariance.toFixed(1)}% variance
                  </span>
                </div>
              </div>
              <TrendingUp className="w-8 h-8 text-slate-400" />
            </div>
          </div>
        </div>

        {/* Performance Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-[#8FAD77] mb-2">
                {budgetOverview.performanceMetrics.onBudgetCategories}
              </div>
              <p className="text-slate-400">Categories On Budget</p>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-red-400 mb-2">
                {budgetOverview.performanceMetrics.overBudgetCategories}
              </div>
              <p className="text-slate-400">Categories Over Budget</p>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-[#FFD166] mb-2">
                {budgetOverview.performanceMetrics.underBudgetCategories}
              </div>
              <p className="text-slate-400">Categories Under Budget</p>
            </div>
          </div>
        </div>

        {/* Budget Categories Breakdown */}
        <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6 mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-white">Category Performance</h2>
            <Link
              href="/budget/performance"
              className="text-[#FFD166] hover:text-[#FFD166]/80 text-sm font-medium"
            >
              View Detailed Performance →
            </Link>
          </div>

          <div className="space-y-4">
            {budgetOverview.categories.map((category) => {
              const spentPercentage = category.allocated > 0 ? (category.actualSpent / category.allocated) * 100 : 0;
              const progressColor = getProgressColor(category.actualSpent, category.allocated);

              return (
                <div key={category.id} className="bg-white/5 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center">
                      <div
                        className="w-4 h-4 rounded-full mr-3"
                        style={{ backgroundColor: category.color }}
                      ></div>
                      <span className="font-medium text-white">{category.name}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-white font-semibold">
                        {formatCurrency(category.actualSpent)} / {formatCurrency(category.allocated)}
                      </div>
                      <div className="text-sm text-slate-400">
                        {spentPercentage.toFixed(1)}% used
                      </div>
                    </div>
                  </div>

                  <div className="w-full bg-slate-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${progressColor}`}
                      style={{ width: `${Math.min(spentPercentage, 100)}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link
            href="/budget/allocations"
            className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6 hover:bg-white/20 transition-colors"
          >
            <PieChart className="w-8 h-8 text-[#FFD166] mb-4" />
            <h3 className="font-semibold text-white mb-2">Manage Allocations</h3>
            <p className="text-slate-400 text-sm">
              Adjust budget allocations for upcoming income
            </p>
          </Link>

          <Link
            href="/budget/projections"
            className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6 hover:bg-white/20 transition-colors"
          >
            <TrendingUp className="w-8 h-8 text-[#8FAD77] mb-4" />
            <h3 className="font-semibold text-white mb-2">View Projections</h3>
            <p className="text-slate-400 text-sm">
              See future budget forecasts and trends
            </p>
          </Link>

          <Link
            href="/budget/templates"
            className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6 hover:bg-white/20 transition-colors"
          >
            <Settings className="w-8 h-8 text-[#5E7F9B] mb-4" />
            <h3 className="font-semibold text-white mb-2">Budget Templates</h3>
            <p className="text-slate-400 text-sm">
              Apply proven budgeting strategies
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default BudgetOverviewPage;