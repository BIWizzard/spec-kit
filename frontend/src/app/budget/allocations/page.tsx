'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Calendar,
  DollarSign,
  PieChart,
  Target,
  Zap,
  RotateCcw,
  Save,
  AlertTriangle,
  TrendingUp,
  Plus,
  Edit3,
  Check
} from 'lucide-react';
import Link from 'next/link';

interface BudgetCategory {
  id: string;
  name: string;
  targetPercentage: number;
  color: string;
  isActive: boolean;
}

interface IncomeEvent {
  id: string;
  name: string;
  amount: number;
  scheduledDate: string;
  status: 'scheduled' | 'received';
}

interface BudgetAllocation {
  id: string;
  incomeEventId: string;
  budgetCategoryId: string;
  amount: number;
  percentage: number;
  createdAt: string;
}

interface AllocationSummary {
  incomeEvent: IncomeEvent;
  allocations: (BudgetAllocation & { category: BudgetCategory })[];
  totalAllocated: number;
  remainingAmount: number;
  categories: BudgetCategory[];
}

const BudgetAllocationsPage = () => {
  const [selectedIncomeEventId, setSelectedIncomeEventId] = useState<string>('');
  const [editingAllocations, setEditingAllocations] = useState<Record<string, number>>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const queryClient = useQueryClient();

  const { data: incomeEvents = [], isLoading: loadingIncome } = useQuery<IncomeEvent[]>({
    queryKey: ['income', 'events', 'upcoming'],
    queryFn: async () => {
      const response = await fetch('/api/income-events/upcoming');
      if (!response.ok) throw new Error('Failed to fetch income events');
      return response.json();
    },
  });

  const { data: allocationSummary, isLoading: loadingAllocations } = useQuery<AllocationSummary>({
    queryKey: ['budget', 'allocations', selectedIncomeEventId],
    queryFn: async () => {
      const response = await fetch(`/api/budget-allocations/${selectedIncomeEventId}/summary`);
      if (!response.ok) throw new Error('Failed to fetch allocation summary');
      return response.json();
    },
    enabled: !!selectedIncomeEventId,
  });

  const generateAllocationsMutation = useMutation({
    mutationFn: async (incomeEventId: string) => {
      const response = await fetch(`/api/budget-allocations/${incomeEventId}/generate`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to generate allocations');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget', 'allocations'] });
      setEditingAllocations({});
      setHasUnsavedChanges(false);
    },
  });

  const updateAllocationMutation = useMutation({
    mutationFn: async ({ id, amount }: { id: string; amount: number }) => {
      const response = await fetch(`/api/budget-allocations/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount }),
      });
      if (!response.ok) throw new Error('Failed to update allocation');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget', 'allocations'] });
      setEditingAllocations({});
      setHasUnsavedChanges(false);
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
      day: 'numeric',
      year: 'numeric',
    });
  };

  const handleAllocationChange = (categoryId: string, amount: number) => {
    setEditingAllocations(prev => ({
      ...prev,
      [categoryId]: amount
    }));
    setHasUnsavedChanges(true);
  };

  const calculateEditedTotal = () => {
    if (!allocationSummary) return 0;

    return allocationSummary.allocations.reduce((sum, allocation) => {
      const editedAmount = editingAllocations[allocation.budgetCategoryId];
      return sum + (editedAmount !== undefined ? editedAmount : allocation.amount);
    }, 0);
  };

  const calculateEditedRemaining = () => {
    if (!allocationSummary) return 0;
    return allocationSummary.incomeEvent.amount - calculateEditedTotal();
  };

  const handleAutoAllocate = () => {
    if (!allocationSummary) return;

    const newAllocations: Record<string, number> = {};
    allocationSummary.categories.forEach(category => {
      if (category.isActive) {
        const amount = Math.round((allocationSummary.incomeEvent.amount * category.targetPercentage) / 100);
        newAllocations[category.id] = amount;
      }
    });

    setEditingAllocations(newAllocations);
    setHasUnsavedChanges(true);
  };

  const handleSaveAllocations = async () => {
    if (!allocationSummary) return;

    try {
      const updates = Object.entries(editingAllocations).map(([categoryId, amount]) => {
        const allocation = allocationSummary.allocations.find(a => a.budgetCategoryId === categoryId);
        return allocation ? updateAllocationMutation.mutateAsync({ id: allocation.id, amount }) : null;
      }).filter(Boolean);

      await Promise.all(updates);
    } catch (error) {
      console.error('Failed to save allocations:', error);
    }
  };

  const handleResetAllocations = () => {
    setEditingAllocations({});
    setHasUnsavedChanges(false);
  };

  if (loadingIncome) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-slate-700 rounded w-64"></div>
            <div className="h-32 bg-slate-700 rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center">
            <Link
              href="/budget"
              className="mr-4 p-2 text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Budget Allocations</h1>
              <p className="text-slate-400">
                Allocate income across your budget categories
              </p>
            </div>
          </div>

          {hasUnsavedChanges && (
            <div className="flex items-center space-x-3">
              <button
                onClick={handleResetAllocations}
                className="inline-flex items-center px-4 py-2 text-slate-300 hover:text-white transition-colors"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset
              </button>
              <button
                onClick={handleSaveAllocations}
                disabled={updateAllocationMutation.isPending}
                className="inline-flex items-center px-4 py-2 bg-[#8FAD77] text-white font-semibold rounded-lg hover:bg-[#8FAD77]/90 transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </button>
            </div>
          )}
        </div>

        {/* Income Event Selector */}
        <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6 mb-8">
          <h2 className="text-lg font-semibold text-white mb-4">Select Income Event</h2>

          {incomeEvents.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <p className="text-slate-400 mb-4">No upcoming income events found</p>
              <Link
                href="/income/create"
                className="inline-flex items-center px-4 py-2 bg-[#FFD166] text-slate-900 font-semibold rounded-lg hover:bg-[#FFD166]/90 transition-colors"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Income Event
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {incomeEvents.map((event) => (
                <button
                  key={event.id}
                  onClick={() => setSelectedIncomeEventId(event.id)}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    selectedIncomeEventId === event.id
                      ? 'border-[#FFD166] bg-[#FFD166]/10'
                      : 'border-white/20 bg-white/5 hover:border-white/40'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-white">{event.name}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      event.status === 'received' ? 'bg-[#8FAD77] text-white' : 'bg-[#FFD166] text-slate-900'
                    }`}>
                      {event.status}
                    </span>
                  </div>
                  <div className="text-2xl font-bold text-[#8FAD77] mb-1">
                    {formatCurrency(event.amount)}
                  </div>
                  <div className="text-sm text-slate-400">
                    {formatDate(event.scheduledDate)}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Allocation Interface */}
        {selectedIncomeEventId && (
          <>
            {loadingAllocations ? (
              <div className="animate-pulse space-y-4">
                <div className="h-32 bg-slate-700 rounded-xl"></div>
                <div className="space-y-4">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-20 bg-slate-700 rounded-xl"></div>
                  ))}
                </div>
              </div>
            ) : allocationSummary ? (
              <>
                {/* Allocation Summary */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                  <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-slate-400 text-sm">Total Income</p>
                        <p className="text-2xl font-bold text-[#8FAD77]">
                          {formatCurrency(allocationSummary.incomeEvent.amount)}
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
                          {formatCurrency(calculateEditedTotal())}
                        </p>
                      </div>
                      <Target className="w-8 h-8 text-[#FFD166]" />
                    </div>
                  </div>

                  <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-slate-400 text-sm">Remaining</p>
                        <p className={`text-2xl font-bold ${
                          calculateEditedRemaining() < 0 ? 'text-red-400' : 'text-white'
                        }`}>
                          {formatCurrency(calculateEditedRemaining())}
                        </p>
                      </div>
                      <TrendingUp className="w-8 h-8 text-[#5E7F9B]" />
                    </div>
                  </div>

                  <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-slate-400 text-sm">Progress</p>
                        <p className="text-2xl font-bold text-white">
                          {Math.round((calculateEditedTotal() / allocationSummary.incomeEvent.amount) * 100)}%
                        </p>
                      </div>
                      <PieChart className="w-8 h-8 text-slate-400" />
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-white">Category Allocations</h2>
                  <div className="flex space-x-3">
                    <button
                      onClick={handleAutoAllocate}
                      className="inline-flex items-center px-4 py-2 bg-[#FFD166] text-slate-900 font-semibold rounded-lg hover:bg-[#FFD166]/90 transition-colors"
                    >
                      <Zap className="w-4 h-4 mr-2" />
                      Auto-Allocate
                    </button>
                    {!allocationSummary.allocations.length && (
                      <button
                        onClick={() => generateAllocationsMutation.mutate(selectedIncomeEventId)}
                        disabled={generateAllocationsMutation.isPending}
                        className="inline-flex items-center px-4 py-2 bg-[#8FAD77] text-white font-semibold rounded-lg hover:bg-[#8FAD77]/90 transition-colors disabled:opacity-50"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        {generateAllocationsMutation.isPending ? 'Generating...' : 'Generate Allocations'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Over-allocation Warning */}
                {calculateEditedRemaining() < 0 && (
                  <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 mb-6 flex items-center">
                    <AlertTriangle className="w-5 h-5 text-red-400 mr-3" />
                    <div>
                      <p className="font-medium text-red-400">Over-allocated!</p>
                      <p className="text-red-300 text-sm">
                        You've allocated {formatCurrency(Math.abs(calculateEditedRemaining()))} more than available income.
                      </p>
                    </div>
                  </div>
                )}

                {/* Category Allocations */}
                <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6">
                  <div className="space-y-4">
                    {allocationSummary.categories.filter(cat => cat.isActive).map((category) => {
                      const allocation = allocationSummary.allocations.find(a => a.budgetCategoryId === category.id);
                      const currentAmount = editingAllocations[category.id] !== undefined
                        ? editingAllocations[category.id]
                        : allocation?.amount || 0;
                      const targetAmount = Math.round((allocationSummary.incomeEvent.amount * category.targetPercentage) / 100);
                      const percentage = allocationSummary.incomeEvent.amount > 0
                        ? (currentAmount / allocationSummary.incomeEvent.amount) * 100
                        : 0;

                      return (
                        <div key={category.id} className="bg-white/5 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center">
                              <div
                                className="w-4 h-4 rounded-full mr-3"
                                style={{ backgroundColor: category.color }}
                              ></div>
                              <div>
                                <span className="font-medium text-white">{category.name}</span>
                                <div className="text-xs text-slate-400">
                                  Target: {category.targetPercentage}% ({formatCurrency(targetAmount)})
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center space-x-3">
                              <div className="text-right">
                                <input
                                  type="number"
                                  value={currentAmount}
                                  onChange={(e) => handleAllocationChange(category.id, parseInt(e.target.value) || 0)}
                                  className="w-24 px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-right focus:ring-2 focus:ring-[#FFD166] focus:border-transparent"
                                />
                                <div className="text-xs text-slate-400">
                                  {percentage.toFixed(1)}%
                                </div>
                              </div>
                              <div className="w-2 h-8 bg-slate-700 rounded-full overflow-hidden">
                                <div
                                  className="bg-gradient-to-t from-slate-600 to-white h-full transition-all duration-300"
                                  style={{
                                    height: `${Math.min(percentage, 100)}%`,
                                    backgroundColor: percentage > category.targetPercentage + 5
                                      ? '#ef4444'
                                      : percentage < category.targetPercentage - 5
                                        ? '#f59e0b'
                                        : category.color
                                  }}
                                ></div>
                              </div>
                            </div>
                          </div>

                          <div className="w-full bg-slate-700 rounded-full h-2">
                            <div
                              className="h-2 rounded-full transition-all duration-300"
                              style={{
                                width: `${Math.min(percentage, 100)}%`,
                                backgroundColor: percentage > category.targetPercentage + 5
                                  ? '#ef4444'
                                  : percentage < category.targetPercentage - 5
                                    ? '#f59e0b'
                                    : category.color
                              }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-12 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl">
                <AlertTriangle className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">No Allocation Data</h3>
                <p className="text-slate-400">
                  Unable to load allocation data for this income event.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default BudgetAllocationsPage;