'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  CalculatorIcon,
  ArrowPathIcon,
  ChartPieIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  InformationCircleIcon,
  PlusCircleIcon,
  MinusCircleIcon
} from '@heroicons/react/24/outline'

interface BudgetCategory {
  id: string
  name: string
  targetPercentage: number
  color: string
  isActive: boolean
}

interface BudgetAllocation {
  id?: string
  categoryId: string
  amount: number
  percentage: number
}

interface IncomeEvent {
  id: string
  name: string
  amount: number
  scheduledDate: string
}

interface AllocationProps {
  incomeEvent: IncomeEvent
  categories: BudgetCategory[]
  existingAllocations?: BudgetAllocation[]
  onAllocationsChange: (allocations: BudgetAllocation[]) => void
  onSave: (allocations: BudgetAllocation[]) => void
  mode?: 'manual' | 'auto' | 'hybrid'
  enableQuickAllocation?: boolean
  showSuggestions?: boolean
  className?: string
}

interface AllocationSuggestion {
  type: 'template' | 'historical' | 'smart'
  name: string
  allocations: BudgetAllocation[]
  confidence: number
}

export default function Allocation({
  incomeEvent,
  categories,
  existingAllocations = [],
  onAllocationsChange,
  onSave,
  mode = 'manual',
  enableQuickAllocation = true,
  showSuggestions = true,
  className = ''
}: AllocationProps) {
  const [allocations, setAllocations] = useState<BudgetAllocation[]>([])
  const [allocationMode, setAllocationMode] = useState(mode)
  const [isCalculating, setIsCalculating] = useState(false)
  const [suggestions, setSuggestions] = useState<AllocationSuggestion[]>([])
  const [selectedSuggestion, setSelectedSuggestion] = useState<string | null>(null)
  const [showAdvanced, setShowAdvanced] = useState(false)

  const activeCategories = categories.filter(cat => cat.isActive)

  // Calculate totals and validation
  const totalAllocated = useMemo(() =>
    allocations.reduce((sum, allocation) => sum + allocation.amount, 0)
  , [allocations])

  const remainingAmount = incomeEvent.amount - totalAllocated
  const totalPercentage = (totalAllocated / incomeEvent.amount) * 100
  const isFullyAllocated = Math.abs(remainingAmount) < 0.01
  const isOverAllocated = remainingAmount < -0.01

  // Initialize allocations
  useEffect(() => {
    if (existingAllocations.length > 0) {
      setAllocations(existingAllocations)
    } else {
      // Initialize with empty allocations for all active categories
      const initialAllocations = activeCategories.map(category => ({
        categoryId: category.id,
        amount: 0,
        percentage: 0
      }))
      setAllocations(initialAllocations)
    }
  }, [existingAllocations, activeCategories])

  // Generate suggestions
  useEffect(() => {
    if (showSuggestions && activeCategories.length > 0) {
      generateSuggestions()
    }
  }, [incomeEvent, activeCategories, showSuggestions])

  const generateSuggestions = () => {
    const suggestions: AllocationSuggestion[] = []

    // Template-based suggestion (50/30/20 rule adaptation)
    const templateAllocation = activeCategories.map(category => {
      const percentage = category.targetPercentage
      return {
        categoryId: category.id,
        amount: (incomeEvent.amount * percentage) / 100,
        percentage
      }
    })

    suggestions.push({
      type: 'template',
      name: 'Budget Template',
      allocations: templateAllocation,
      confidence: 0.9
    })

    // Smart even distribution
    const evenAmount = incomeEvent.amount / activeCategories.length
    const evenAllocation = activeCategories.map(category => ({
      categoryId: category.id,
      amount: evenAmount,
      percentage: (evenAmount / incomeEvent.amount) * 100
    }))

    suggestions.push({
      type: 'smart',
      name: 'Even Distribution',
      allocations: evenAllocation,
      confidence: 0.6
    })

    // Priority-based (give more to essential categories)
    const priorityOrder = ['Housing', 'Food', 'Transportation', 'Healthcare']
    const priorityAllocation = activeCategories.map(category => {
      const isPriority = priorityOrder.some(p =>
        category.name.toLowerCase().includes(p.toLowerCase())
      )
      const basePercentage = category.targetPercentage
      const adjustedPercentage = isPriority ? basePercentage * 1.2 : basePercentage * 0.8

      return {
        categoryId: category.id,
        amount: (incomeEvent.amount * Math.min(adjustedPercentage, 100)) / 100,
        percentage: adjustedPercentage
      }
    })

    suggestions.push({
      type: 'smart',
      name: 'Priority Focus',
      allocations: priorityAllocation,
      confidence: 0.75
    })

    setSuggestions(suggestions)
  }

  const handleAllocationChange = (categoryId: string, amount: number) => {
    const newAllocations = allocations.map(allocation =>
      allocation.categoryId === categoryId
        ? {
            ...allocation,
            amount: Math.max(0, amount),
            percentage: (Math.max(0, amount) / incomeEvent.amount) * 100
          }
        : allocation
    )
    setAllocations(newAllocations)
    onAllocationsChange(newAllocations)
  }

  const handlePercentageChange = (categoryId: string, percentage: number) => {
    const amount = (incomeEvent.amount * percentage) / 100
    handleAllocationChange(categoryId, amount)
  }

  const autoAllocate = async () => {
    setIsCalculating(true)

    try {
      const newAllocations = activeCategories.map(category => ({
        categoryId: category.id,
        amount: (incomeEvent.amount * category.targetPercentage) / 100,
        percentage: category.targetPercentage
      }))

      setAllocations(newAllocations)
      onAllocationsChange(newAllocations)
    } catch (error) {
      console.error('Auto allocation failed:', error)
    } finally {
      setIsCalculating(false)
    }
  }

  const applySuggestion = (suggestion: AllocationSuggestion) => {
    setAllocations(suggestion.allocations)
    onAllocationsChange(suggestion.allocations)
    setSelectedSuggestion(null)
  }

  const quickAdjust = (amount: number) => {
    const adjustment = amount / activeCategories.length
    const newAllocations = allocations.map(allocation => ({
      ...allocation,
      amount: Math.max(0, allocation.amount + adjustment),
      percentage: (Math.max(0, allocation.amount + adjustment) / incomeEvent.amount) * 100
    }))
    setAllocations(newAllocations)
    onAllocationsChange(newAllocations)
  }

  const clearAllocations = () => {
    const clearedAllocations = allocations.map(allocation => ({
      ...allocation,
      amount: 0,
      percentage: 0
    }))
    setAllocations(clearedAllocations)
    onAllocationsChange(clearedAllocations)
  }

  const getCategoryById = (categoryId: string) =>
    categories.find(cat => cat.id === categoryId)

  return (
    <div className={`glassmorphic p-6 rounded-lg border border-white/10 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-white mb-1">Budget Allocation</h3>
          <p className="text-sm text-gray-400">
            Allocate ${incomeEvent.amount.toLocaleString()} from {incomeEvent.name}
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {enableQuickAllocation && (
            <button
              onClick={autoAllocate}
              disabled={isCalculating}
              className="inline-flex items-center px-3 py-1.5 bg-primary hover:bg-primary/80 disabled:bg-gray-600 text-white rounded-lg transition-colors text-sm"
            >
              {isCalculating ? (
                <ArrowPathIcon className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <CalculatorIcon className="w-4 h-4 mr-1" />
              )}
              Auto Allocate
            </button>
          )}

          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
            title="Advanced options"
          >
            <ChartPieIcon className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>

      {/* Status Summary */}
      <div className="glassmorphic p-4 rounded-lg border border-white/10 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className={`flex items-center space-x-2 ${
              isOverAllocated ? 'text-error' :
              isFullyAllocated ? 'text-success' : 'text-warning'
            }`}>
              {isOverAllocated ? (
                <ExclamationTriangleIcon className="w-5 h-5" />
              ) : isFullyAllocated ? (
                <CheckCircleIcon className="w-5 h-5" />
              ) : (
                <InformationCircleIcon className="w-5 h-5" />
              )}
              <span className="font-medium">
                ${Math.abs(remainingAmount).toLocaleString()} {
                  isOverAllocated ? 'over-allocated' :
                  isFullyAllocated ? 'fully allocated' : 'remaining'
                }
              </span>
            </div>

            <div className="text-sm text-gray-400">
              {totalPercentage.toFixed(1)}% allocated
            </div>
          </div>

          {!isFullyAllocated && remainingAmount > 0 && (
            <div className="flex items-center space-x-2">
              <button
                onClick={() => quickAdjust(remainingAmount)}
                className="text-xs text-primary hover:text-primary/80"
              >
                Distribute Remaining
              </button>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        <div className="mt-3">
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className={`rounded-full h-2 transition-all duration-300 ${
                isOverAllocated ? 'bg-error' :
                isFullyAllocated ? 'bg-success' : 'bg-primary'
              }`}
              style={{ width: `${Math.min(totalPercentage, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Suggestions */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-white mb-3">Quick Suggestions</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => applySuggestion(suggestion)}
                className="p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors text-left"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-white text-sm">{suggestion.name}</span>
                  <span className="text-xs text-gray-400">
                    {(suggestion.confidence * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="text-xs text-gray-400">
                  {suggestion.type === 'template' ? 'Based on budget template' :
                   suggestion.type === 'historical' ? 'Based on past allocations' :
                   'Smart recommendation'}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Allocation Controls */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-white">Category Allocations</h4>
          <div className="flex items-center space-x-2">
            <button
              onClick={clearAllocations}
              className="text-xs text-gray-400 hover:text-white"
            >
              Clear All
            </button>
            {remainingAmount !== 0 && (
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => quickAdjust(-100)}
                  className="p-1 hover:bg-white/10 rounded"
                >
                  <MinusCircleIcon className="w-4 h-4 text-gray-400" />
                </button>
                <button
                  onClick={() => quickAdjust(100)}
                  className="p-1 hover:bg-white/10 rounded"
                >
                  <PlusCircleIcon className="w-4 h-4 text-gray-400" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Category Allocations */}
        <div className="space-y-3">
          {allocations.map((allocation) => {
            const category = getCategoryById(allocation.categoryId)
            if (!category) return null

            return (
              <div
                key={allocation.categoryId}
                className="glassmorphic p-4 rounded-lg border border-white/10"
              >
                <div className="flex items-center space-x-3 mb-3">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: category.color }}
                  />
                  <span className="font-medium text-white flex-1">{category.name}</span>
                  <span className="text-sm text-gray-400">
                    Target: {category.targetPercentage}%
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Amount Input */}
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Amount</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                        $
                      </span>
                      <input
                        type="number"
                        min="0"
                        max={incomeEvent.amount}
                        step="0.01"
                        value={allocation.amount || ''}
                        onChange={(e) => handleAllocationChange(
                          allocation.categoryId,
                          parseFloat(e.target.value) || 0
                        )}
                        className="w-full pl-7 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent"
                      />
                    </div>
                  </div>

                  {/* Percentage Input */}
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Percentage</label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={allocation.percentage.toFixed(1)}
                        onChange={(e) => handlePercentageChange(
                          allocation.categoryId,
                          parseFloat(e.target.value) || 0
                        )}
                        className="w-full pr-8 pl-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent"
                      />
                      <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                        %
                      </span>
                    </div>
                  </div>
                </div>

                {/* Category Progress */}
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>vs Target</span>
                    <span>
                      {allocation.percentage > 0
                        ? `${(allocation.percentage / category.targetPercentage * 100).toFixed(0)}%`
                        : '0%'
                      }
                    </span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-1.5">
                    <div
                      className="bg-primary rounded-full h-1.5 transition-all duration-300"
                      style={{
                        width: `${Math.min((allocation.percentage / category.targetPercentage * 100), 100)}%`
                      }}
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Advanced Options */}
      {showAdvanced && (
        <div className="mt-6 glassmorphic p-4 rounded-lg border border-white/10">
          <h4 className="text-sm font-medium text-white mb-3">Advanced Options</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-2">Allocation Mode</label>
              <select
                value={allocationMode}
                onChange={(e) => setAllocationMode(e.target.value as 'manual' | 'auto' | 'hybrid')}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="manual">Manual</option>
                <option value="auto">Auto</option>
                <option value="hybrid">Hybrid</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={() => onSave(allocations)}
                disabled={isOverAllocated}
                className="w-full px-4 py-2 bg-success hover:bg-success/80 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
              >
                Save Allocation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}