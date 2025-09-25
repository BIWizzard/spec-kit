'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  TrendingUp,
  Target,
  Calendar,
  BarChart3,
  PieChart,
  AlertTriangle,
  Settings,
  Download,
  Zap,
  Eye,
  EyeOff
} from 'lucide-react';
import Link from 'next/link';

interface ProjectionScenario {
  name: string;
  confidence: number;
  color: string;
  description: string;
}

interface CategoryProjection {
  id: string;
  name: string;
  color: string;
  currentBudget: number;
  scenarios: {
    optimistic: number;
    realistic: number;
    pessimistic: number;
  };
  trend: 'increasing' | 'decreasing' | 'stable';
  projectedGrowth: number;
}

interface BudgetProjections {
  period: string;
  timeHorizon: number; // months
  totalCurrentBudget: number;
  projectedTotals: {
    optimistic: number;
    realistic: number;
    pessimistic: number;
  };
  categories: CategoryProjection[];
  monthlyProjections: {
    month: string;
    optimistic: number;
    realistic: number;
    pessimistic: number;
    actual?: number;
  }[];
  goals: {
    id: string;
    name: string;
    target: number;
    deadline: string;
    progress: number;
    projectedCompletion: string;
    feasibility: 'likely' | 'possible' | 'unlikely';
  }[];
  assumptions: string[];
}

const BudgetProjectionsPage = () => {
  const [selectedTimeHorizon, setSelectedTimeHorizon] = useState(12); // months
  const [selectedScenarios, setSelectedScenarios] = useState<string[]>(['realistic', 'optimistic']);
  const [viewType, setViewType] = useState<'overview' | 'categories' | 'goals'>('overview');

  const scenarios: ProjectionScenario[] = [
    {
      name: 'optimistic',
      confidence: 25,
      color: '#8FAD77',
      description: 'Best case scenario with favorable conditions'
    },
    {
      name: 'realistic',
      confidence: 50,
      color: '#FFD166',
      description: 'Most likely outcome based on current trends'
    },
    {
      name: 'pessimistic',
      confidence: 25,
      color: '#ef4444',
      description: 'Conservative scenario with potential challenges'
    }
  ];

  const { data: projections, isLoading } = useQuery<BudgetProjections>({
    queryKey: ['budget', 'projections', selectedTimeHorizon],
    queryFn: async () => {
      const response = await fetch(`/api/budget/projections?horizon=${selectedTimeHorizon}`);
      if (!response.ok) throw new Error('Failed to fetch projections');
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric',
    });
  };

  const toggleScenario = (scenario: string) => {
    setSelectedScenarios(prev =>
      prev.includes(scenario)
        ? prev.filter(s => s !== scenario)
        : [...prev, scenario]
    );
  };

  const getGoalStatusColor = (feasibility: string) => {
    switch (feasibility) {
      case 'likely': return 'text-[#8FAD77]';
      case 'possible': return 'text-[#FFD166]';
      case 'unlikely': return 'text-red-400';
      default: return 'text-slate-400';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing': return <TrendingUp className="w-4 h-4 text-red-400" />;
      case 'decreasing': return <TrendingUp className="w-4 h-4 text-[#8FAD77] rotate-180" />;
      default: return <Target className="w-4 h-4 text-slate-400" />;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-slate-700 rounded w-64"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-32 bg-slate-700 rounded-xl"></div>
              ))}
            </div>
            <div className="h-96 bg-slate-700 rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!projections) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">No Projection Data</h2>
            <p className="text-slate-400">
              Unable to generate budget projections. Ensure you have budget categories and historical data.
            </p>
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
          <div className="flex items-center">
            <Link
              href="/budget"
              className="mr-4 p-2 text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Budget Projections</h1>
              <p className="text-slate-400">
                Forecast your budget performance and track financial goals
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 mt-4 sm:mt-0">
            {/* Time Horizon Selector */}
            <select
              value={selectedTimeHorizon}
              onChange={(e) => setSelectedTimeHorizon(parseInt(e.target.value))}
              className="px-4 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white focus:ring-2 focus:ring-[#FFD166] focus:border-transparent"
            >
              <option value={3}>3 Months</option>
              <option value={6}>6 Months</option>
              <option value={12}>12 Months</option>
              <option value={24}>24 Months</option>
            </select>

            <button className="inline-flex items-center px-4 py-2 bg-[#FFD166] text-slate-900 font-semibold rounded-lg hover:bg-[#FFD166]/90 transition-colors">
              <Download className="w-4 h-4 mr-2" />
              Export
            </button>
          </div>
        </div>

        {/* View Navigation */}
        <div className="flex space-x-1 bg-white/10 backdrop-blur-sm rounded-lg p-1 mb-8 w-fit">
          <button
            onClick={() => setViewType('overview')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              viewType === 'overview' ? 'bg-[#FFD166] text-slate-900' : 'text-white hover:text-[#FFD166]'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setViewType('categories')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              viewType === 'categories' ? 'bg-[#FFD166] text-slate-900' : 'text-white hover:text-[#FFD166]'
            }`}
          >
            Categories
          </button>
          <button
            onClick={() => setViewType('goals')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              viewType === 'goals' ? 'bg-[#FFD166] text-slate-900' : 'text-white hover:text-[#FFD166]'
            }`}
          >
            Goals
          </button>
        </div>

        {/* Scenario Toggle */}
        <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6 mb-8">
          <h2 className="text-lg font-semibold text-white mb-4">Projection Scenarios</h2>
          <div className="flex flex-wrap gap-3">
            {scenarios.map((scenario) => (
              <button
                key={scenario.name}
                onClick={() => toggleScenario(scenario.name)}
                className={`px-4 py-3 rounded-lg border-2 transition-all ${
                  selectedScenarios.includes(scenario.name)
                    ? 'border-white bg-white/10'
                    : 'border-white/20 bg-white/5 hover:border-white/40'
                }`}
              >
                <div className="flex items-center">
                  <div
                    className="w-4 h-4 rounded-full mr-3"
                    style={{ backgroundColor: scenario.color }}
                  ></div>
                  <div className="text-left">
                    <div className="flex items-center">
                      <span className="font-medium text-white capitalize">{scenario.name}</span>
                      {selectedScenarios.includes(scenario.name) ? (
                        <Eye className="w-4 h-4 ml-2 text-[#8FAD77]" />
                      ) : (
                        <EyeOff className="w-4 h-4 ml-2 text-slate-400" />
                      )}
                    </div>
                    <p className="text-xs text-slate-400">{scenario.confidence}% confidence</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {viewType === 'overview' && (
          <>
            {/* Projection Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {selectedScenarios.map((scenarioName) => {
                const scenario = scenarios.find(s => s.name === scenarioName);
                const total = projections.projectedTotals[scenarioName as keyof typeof projections.projectedTotals];
                const growth = ((total - projections.totalCurrentBudget) / projections.totalCurrentBudget) * 100;

                return (
                  <div key={scenarioName} className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center">
                        <div
                          className="w-4 h-4 rounded-full mr-3"
                          style={{ backgroundColor: scenario?.color }}
                        ></div>
                        <h3 className="font-semibold text-white capitalize">{scenarioName}</h3>
                      </div>
                      <div className={`text-sm font-medium ${growth > 0 ? 'text-red-400' : 'text-[#8FAD77]'}`}>
                        {growth > 0 ? '+' : ''}{growth.toFixed(1)}%
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-white mb-2">
                      {formatCurrency(total)}
                    </div>
                    <p className="text-sm text-slate-400">
                      Projected in {selectedTimeHorizon} months
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Monthly Trend Chart */}
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6 mb-8">
              <h2 className="text-xl font-bold text-white mb-6">Monthly Projections</h2>

              <div className="space-y-4">
                {projections.monthlyProjections.slice(0, 6).map((month, index) => (
                  <div key={index} className="bg-white/5 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-medium text-white">{month.month}</h3>
                      {month.actual && (
                        <span className="px-2 py-1 bg-[#8FAD77]/20 text-[#8FAD77] rounded-full text-xs font-medium">
                          Actual: {formatCurrency(month.actual)}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      {selectedScenarios.map((scenarioName) => {
                        const scenario = scenarios.find(s => s.name === scenarioName);
                        const value = month[scenarioName as keyof typeof month] as number;

                        return (
                          <div key={scenarioName} className="text-center">
                            <div className="text-xs text-slate-400 mb-1 capitalize">{scenarioName}</div>
                            <div
                              className="text-lg font-semibold"
                              style={{ color: scenario?.color }}
                            >
                              {formatCurrency(value)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {viewType === 'categories' && (
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6 mb-8">
            <h2 className="text-xl font-bold text-white mb-6">Category Projections</h2>

            <div className="space-y-6">
              {projections.categories.map((category) => (
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
                          Current: {formatCurrency(category.currentBudget)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getTrendIcon(category.trend)}
                      <span className={`text-sm font-medium ${
                        category.projectedGrowth > 0 ? 'text-red-400' : 'text-[#8FAD77]'
                      }`}>
                        {category.projectedGrowth > 0 ? '+' : ''}{category.projectedGrowth.toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    {Object.entries(category.scenarios).map(([scenarioName, value]) => {
                      if (!selectedScenarios.includes(scenarioName)) return null;

                      const scenario = scenarios.find(s => s.name === scenarioName);

                      return (
                        <div key={scenarioName} className="text-center p-3 bg-white/5 rounded-lg">
                          <div className="text-xs text-slate-400 mb-1 capitalize">{scenarioName}</div>
                          <div
                            className="text-lg font-semibold"
                            style={{ color: scenario?.color }}
                          >
                            {formatCurrency(value)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {viewType === 'goals' && (
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Financial Goals</h2>
              <Link
                href="/goals/create"
                className="inline-flex items-center px-4 py-2 bg-[#8FAD77] text-white font-semibold rounded-lg hover:bg-[#8FAD77]/90 transition-colors"
              >
                <Target className="w-4 h-4 mr-2" />
                Add Goal
              </Link>
            </div>

            {projections.goals.length === 0 ? (
              <div className="text-center py-8">
                <Target className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                <p className="text-slate-400 mb-4">No financial goals set</p>
                <p className="text-sm text-slate-500">
                  Set financial goals to track your progress and get projections
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {projections.goals.map((goal) => (
                  <div key={goal.id} className="bg-white/5 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-white">{goal.name}</h3>
                        <p className="text-sm text-slate-400">
                          Target: {formatCurrency(goal.target)} by {formatDate(goal.deadline)}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className={`text-lg font-bold ${getGoalStatusColor(goal.feasibility)}`}>
                          {goal.progress.toFixed(1)}%
                        </div>
                        <div className="text-xs text-slate-400 capitalize">
                          {goal.feasibility}
                        </div>
                      </div>
                    </div>

                    <div className="w-full bg-slate-700 rounded-full h-2 mb-2">
                      <div
                        className="h-2 rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.min(goal.progress, 100)}%`,
                          backgroundColor: goal.feasibility === 'likely' ? '#8FAD77' :
                                         goal.feasibility === 'possible' ? '#FFD166' : '#ef4444'
                        }}
                      ></div>
                    </div>

                    <p className="text-sm text-slate-400">
                      Projected completion: {formatDate(goal.projectedCompletion)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Assumptions */}
        <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center">
            <Settings className="w-5 h-5 mr-2" />
            Projection Assumptions
          </h2>
          <div className="space-y-2">
            {projections.assumptions.map((assumption, index) => (
              <div key={index} className="flex items-start">
                <div className="w-2 h-2 bg-[#FFD166] rounded-full mt-2 mr-3 flex-shrink-0"></div>
                <p className="text-slate-300 text-sm">{assumption}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BudgetProjectionsPage;