'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { CheckCircleIcon, ExclamationTriangleIcon, InformationCircleIcon } from '@heroicons/react/24/outline'

interface BudgetCategory {
  id: string
  name: string
  targetPercentage: number
  color: string
  sortOrder: number
  isActive: boolean
}

interface ValidationResult {
  isValid: boolean
  total: number
  remaining: number
  status: 'valid' | 'warning' | 'error'
  message: string
  suggestions: PercentageSuggestion[]
}

interface PercentageSuggestion {
  type: 'distribute' | 'adjust' | 'remove_excess'
  description: string
  action: () => void
}

interface PercentageValidatorProps {
  categories: BudgetCategory[]
  onCategoriesChange: (categories: BudgetCategory[]) => void
  maxPercentagePerCategory?: number
  enableAutoBalance?: boolean
  enableUndoRedo?: boolean
  className?: string
}

interface HistoryState {
  categories: BudgetCategory[]
  timestamp: number
}

export default function PercentageValidator({
  categories,
  onCategoriesChange,
  maxPercentagePerCategory = 100,
  enableAutoBalance = true,
  enableUndoRedo = true,
  className = ''
}: PercentageValidatorProps) {
  const [history, setHistory] = useState<HistoryState[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [isAutoBalancing, setIsAutoBalancing] = useState(false)

  // Save to history when categories change
  useEffect(() => {
    if (categories.length > 0) {
      const newState: HistoryState = {
        categories: JSON.parse(JSON.stringify(categories)),
        timestamp: Date.now()
      }

      const newHistory = history.slice(0, historyIndex + 1)
      newHistory.push(newState)

      // Keep only last 20 states
      if (newHistory.length > 20) {
        newHistory.shift()
      }

      setHistory(newHistory)
      setHistoryIndex(newHistory.length - 1)
    }
  }, [categories])

  // Calculate validation result
  const validationResult: ValidationResult = useMemo(() => {
    const activeCategories = categories.filter(cat => cat.isActive)
    const total = activeCategories.reduce((sum, cat) => sum + cat.targetPercentage, 0)
    const remaining = 100 - total

    let status: 'valid' | 'warning' | 'error'
    let message: string
    let suggestions: PercentageSuggestion[] = []

    if (Math.abs(remaining) < 0.01) {
      status = 'valid'
      message = 'Budget allocation is perfectly balanced!'
    } else if (remaining > 0) {
      if (remaining > 10) {
        status = 'error'
        message = `${remaining.toFixed(1)}% unallocated - significant portion of budget unused`
      } else {
        status = 'warning'
        message = `${remaining.toFixed(1)}% unallocated budget remaining`
      }

      suggestions.push({
        type: 'distribute',
        description: `Distribute remaining ${remaining.toFixed(1)}% across categories`,
        action: () => distributeRemaining()
      })
    } else {
      status = 'error'
      message = `Budget exceeds 100% by ${Math.abs(remaining).toFixed(1)}%`

      suggestions.push({
        type: 'remove_excess',
        description: `Remove excess ${Math.abs(remaining).toFixed(1)}% proportionally`,
        action: () => removeExcess()
      })
    }

    // Check individual category limits
    const overLimitCategories = activeCategories.filter(cat => cat.targetPercentage > maxPercentagePerCategory)
    if (overLimitCategories.length > 0) {
      status = 'error'
      message += ` ${overLimitCategories.length} categories exceed ${maxPercentagePerCategory}% limit`
    }

    return {
      isValid: status === 'valid',
      total,
      remaining,
      status,
      message,
      suggestions
    }
  }, [categories, maxPercentagePerCategory])

  const distributeRemaining = useCallback(() => {
    if (validationResult.remaining <= 0) return

    setIsAutoBalancing(true)
    const activeCategories = categories.filter(cat => cat.isActive)
    const remainingPerCategory = validationResult.remaining / activeCategories.length

    const updatedCategories = categories.map(cat => {
      if (!cat.isActive) return cat
      return {
        ...cat,
        targetPercentage: Math.round((cat.targetPercentage + remainingPerCategory) * 100) / 100
      }
    })

    onCategoriesChange(updatedCategories)
    setTimeout(() => setIsAutoBalancing(false), 500)
  }, [categories, validationResult.remaining, onCategoriesChange])

  const removeExcess = useCallback(() => {
    if (validationResult.remaining >= 0) return

    setIsAutoBalancing(true)
    const activeCategories = categories.filter(cat => cat.isActive)
    const excessAmount = Math.abs(validationResult.remaining)
    const totalCurrent = validationResult.total

    const updatedCategories = categories.map(cat => {
      if (!cat.isActive) return cat
      const reductionRatio = cat.targetPercentage / totalCurrent
      const reduction = excessAmount * reductionRatio
      return {
        ...cat,
        targetPercentage: Math.max(0, Math.round((cat.targetPercentage - reduction) * 100) / 100)
      }
    })

    onCategoriesChange(updatedCategories)
    setTimeout(() => setIsAutoBalancing(false), 500)
  }, [categories, validationResult.remaining, validationResult.total, onCategoriesChange])

  const autoBalance = useCallback(() => {
    setIsAutoBalancing(true)
    const activeCategories = categories.filter(cat => cat.isActive)
    const equalPercentage = Math.floor(10000 / activeCategories.length) / 100 // Precise calculation
    let remainder = 100 - (equalPercentage * activeCategories.length)

    const updatedCategories = categories.map((cat, index) => {
      if (!cat.isActive) return cat

      const activeIndex = categories.slice(0, index).filter(c => c.isActive).length
      let percentage = equalPercentage

      // Add remainder to first few categories
      if (remainder > 0 && activeIndex < Math.round(remainder * 100)) {
        percentage += 0.01
        remainder -= 0.01
      }

      return {
        ...cat,
        targetPercentage: Math.round(percentage * 100) / 100
      }
    })

    onCategoriesChange(updatedCategories)
    setTimeout(() => setIsAutoBalancing(false), 500)
  }, [categories, onCategoriesChange])

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const previousState = history[historyIndex - 1]
      onCategoriesChange(previousState.categories)
      setHistoryIndex(historyIndex - 1)
    }
  }, [history, historyIndex, onCategoriesChange])

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1]
      onCategoriesChange(nextState.categories)
      setHistoryIndex(historyIndex + 1)
    }
  }, [history, historyIndex, onCategoriesChange])

  const getStatusIcon = () => {
    switch (validationResult.status) {
      case 'valid':
        return <CheckCircleIcon className="h-5 w-5 text-[#8FAD77]" />
      case 'warning':
        return <InformationCircleIcon className="h-5 w-5 text-[#FFD166]" />
      case 'error':
        return <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
    }
  }

  const getStatusColor = () => {
    switch (validationResult.status) {
      case 'valid': return '#8FAD77'
      case 'warning': return '#FFD166'
      case 'error': return '#ef4444'
    }
  }

  return (
    <div className={`glassmorphic p-6 space-y-4 ${className}`}>
      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Budget Allocation</h3>
          <div className="flex items-center space-x-2">
            {getStatusIcon()}
            <span className="text-sm font-medium text-white">
              {validationResult.total.toFixed(1)}%
            </span>
          </div>
        </div>

        <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${isAutoBalancing ? 'animate-pulse' : ''}`}
            style={{
              width: `${Math.min(validationResult.total, 100)}%`,
              backgroundColor: getStatusColor()
            }}
          />
          {validationResult.total > 100 && (
            <div
              className="h-full bg-red-500/70 animate-pulse"
              style={{
                width: `${validationResult.total - 100}%`,
                marginLeft: `${100 - (validationResult.total - 100)}%`
              }}
            />
          )}
        </div>

        <div className="flex justify-between text-xs text-white/70">
          <span>0%</span>
          <span>50%</span>
          <span>100%</span>
        </div>
      </div>

      {/* Status Message */}
      <div className={`p-3 rounded-lg border ${
        validationResult.status === 'valid'
          ? 'bg-[#8FAD77]/10 border-[#8FAD77]/30 text-[#8FAD77]'
          : validationResult.status === 'warning'
          ? 'bg-[#FFD166]/10 border-[#FFD166]/30 text-[#FFD166]'
          : 'bg-red-400/10 border-red-400/30 text-red-400'
      }`}>
        <div className="flex items-center space-x-2">
          {getStatusIcon()}
          <span className="text-sm font-medium">{validationResult.message}</span>
        </div>
      </div>

      {/* Category Validation */}
      {categories.filter(cat => cat.isActive && cat.targetPercentage > maxPercentagePerCategory).length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-white">Categories exceeding {maxPercentagePerCategory}% limit:</h4>
          <div className="space-y-1">
            {categories
              .filter(cat => cat.isActive && cat.targetPercentage > maxPercentagePerCategory)
              .map(cat => (
                <div key={cat.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span className="text-white">{cat.name}</span>
                  </div>
                  <span className="text-red-400 font-medium">
                    {cat.targetPercentage.toFixed(1)}%
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-4 border-t border-white/10">
        <div className="flex space-x-2">
          {enableAutoBalance && (
            <>
              <button
                onClick={autoBalance}
                disabled={isAutoBalancing}
                className="px-3 py-2 bg-[#5E7F9B]/20 hover:bg-[#5E7F9B]/30 border border-[#5E7F9B]/30 rounded-lg text-sm font-medium text-[#5E7F9B] transition-colors disabled:opacity-50"
              >
                Auto Balance
              </button>
              {validationResult.suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={suggestion.action}
                  disabled={isAutoBalancing}
                  className="px-3 py-2 bg-[#FFD166]/20 hover:bg-[#FFD166]/30 border border-[#FFD166]/30 rounded-lg text-sm font-medium text-[#FFD166] transition-colors disabled:opacity-50"
                >
                  {suggestion.type === 'distribute' ? 'Distribute' : 'Fix Excess'}
                </button>
              ))}
            </>
          )}
        </div>

        {enableUndoRedo && (
          <div className="flex space-x-2">
            <button
              onClick={undo}
              disabled={historyIndex <= 0}
              className="px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50"
              title="Undo (Ctrl+Z)"
            >
              Undo
            </button>
            <button
              onClick={redo}
              disabled={historyIndex >= history.length - 1}
              className="px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50"
              title="Redo (Ctrl+Y)"
            >
              Redo
            </button>
          </div>
        )}
      </div>

      {/* Keyboard shortcuts */}
      {enableUndoRedo && (
        <div className="text-xs text-white/50 pt-2 border-t border-white/10">
          <p>Keyboard shortcuts: Ctrl+Z (Undo), Ctrl+Y (Redo)</p>
        </div>
      )}
    </div>
  )
}