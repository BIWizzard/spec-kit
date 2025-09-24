'use client'

import { useState, useEffect } from 'react'
import { Check, X, AlertTriangle, Zap, TrendingUp, Filter, Tag, Plus, ChevronDown, ChevronUp } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

interface Transaction {
  id: string
  description: string
  merchant?: string
  amount: number
  date: string
  accountId: string
  category?: string
  categoryId?: string
  status: 'pending' | 'processed' | 'categorized'
}

interface Category {
  id: string
  name: string
  color: string
  icon: string
  usageCount: number
}

interface BatchResult {
  successCount: number
  failureCount: number
  failures: Array<{
    transactionId: string
    error: string
  }>
}

interface GroupingSuggestion {
  id: string
  type: 'merchant' | 'amount_range' | 'description_pattern'
  label: string
  transactionIds: string[]
  suggestedCategory?: Category
  confidence: number
}

interface BatchCategorizeProps {
  selectedTransactions: Transaction[]
  onClose: () => void
  onSuccess?: (result: BatchResult) => void
}

export default function BatchCategorize({
  selectedTransactions,
  onClose,
  onSuccess
}: BatchCategorizeProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [result, setResult] = useState<BatchResult | null>(null)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [createRule, setCreateRule] = useState(false)
  const [rulePattern, setRulePattern] = useState('')
  const [groupingSuggestions, setGroupingSuggestions] = useState<GroupingSuggestion[]>([])
  const [selectedGroups, setSelectedGroups] = useState<string[]>([])
  const [filterMerchant, setFilterMerchant] = useState('')
  const [filterAmountMin, setFilterAmountMin] = useState('')
  const [filterAmountMax, setFilterAmountMax] = useState('')

  const queryClient = useQueryClient()

  // Calculate totals
  const totalAmount = selectedTransactions.reduce((sum, tx) => sum + Math.abs(tx.amount), 0)
  const transactionCount = selectedTransactions.length

  // Fetch categories with usage stats
  const { data: categories = [], isLoading: categoriesLoading } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await fetch('/api/categories?include_usage=true')
      if (!response.ok) throw new Error('Failed to fetch categories')
      return response.json()
    }
  })

  // Sort categories by usage (most used first)
  const sortedCategories = [...categories].sort((a, b) => b.usageCount - a.usageCount)

  // Generate grouping suggestions
  useEffect(() => {
    if (selectedTransactions.length < 2) return

    const suggestions: GroupingSuggestion[] = []

    // Group by merchant
    const merchantGroups = selectedTransactions.reduce((groups, tx) => {
      if (!tx.merchant) return groups
      if (!groups[tx.merchant]) groups[tx.merchant] = []
      groups[tx.merchant].push(tx)
      return groups
    }, {} as Record<string, Transaction[]>)

    Object.entries(merchantGroups).forEach(([merchant, txs]) => {
      if (txs.length > 1) {
        suggestions.push({
          id: `merchant_${merchant}`,
          type: 'merchant',
          label: `${merchant} (${txs.length} transactions)`,
          transactionIds: txs.map(tx => tx.id),
          confidence: 0.8
        })
      }
    })

    // Group by amount ranges
    const amountRanges = [
      { min: 0, max: 25, label: '$0-25' },
      { min: 25, max: 100, label: '$25-100' },
      { min: 100, max: 500, label: '$100-500' },
      { min: 500, max: Infinity, label: '$500+' }
    ]

    amountRanges.forEach(range => {
      const txs = selectedTransactions.filter(tx =>
        Math.abs(tx.amount) >= range.min && Math.abs(tx.amount) < range.max
      )
      if (txs.length > 1) {
        suggestions.push({
          id: `amount_${range.min}_${range.max}`,
          type: 'amount_range',
          label: `${range.label} (${txs.length} transactions)`,
          transactionIds: txs.map(tx => tx.id),
          confidence: 0.6
        })
      }
    })

    // Group by description patterns (simple word matching)
    const descriptionWords = selectedTransactions.reduce((words, tx) => {
      const txWords = tx.description.toLowerCase().split(/\s+/).filter(word => word.length > 3)
      txWords.forEach(word => {
        if (!words[word]) words[word] = []
        words[word].push(tx)
      })
      return words
    }, {} as Record<string, Transaction[]>)

    Object.entries(descriptionWords).forEach(([word, txs]) => {
      if (txs.length > 1) {
        suggestions.push({
          id: `desc_${word}`,
          type: 'description_pattern',
          label: `Contains "${word}" (${txs.length} transactions)`,
          transactionIds: txs.map(tx => tx.id),
          confidence: 0.7
        })
      }
    })

    setGroupingSuggestions(suggestions.slice(0, 5)) // Limit to top 5 suggestions
  }, [selectedTransactions])

  const batchCategorizeMutation = useMutation({
    mutationFn: async (data: {
      transactionIds: string[]
      categoryId: string
      createRule?: boolean
      rulePattern?: string
    }) => {
      const response = await fetch('/api/transactions/batch-categorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      if (!response.ok) throw new Error('Batch categorization failed')
      return response.json()
    },
    onSuccess: (result: BatchResult) => {
      setResult(result)
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      if (onSuccess) onSuccess(result)
    }
  })

  const handleCategorize = async () => {
    if (!selectedCategory) return

    setIsProcessing(true)

    try {
      await batchCategorizeMutation.mutateAsync({
        transactionIds: getFilteredTransactions().map(tx => tx.id),
        categoryId: selectedCategory,
        createRule,
        rulePattern: createRule ? rulePattern : undefined
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleGroupCategorize = async (groupId: string) => {
    if (!selectedCategory) return

    const group = groupingSuggestions.find(g => g.id === groupId)
    if (!group) return

    setIsProcessing(true)

    try {
      await batchCategorizeMutation.mutateAsync({
        transactionIds: group.transactionIds,
        categoryId: selectedCategory
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const getFilteredTransactions = () => {
    return selectedTransactions.filter(tx => {
      if (filterMerchant && !tx.merchant?.toLowerCase().includes(filterMerchant.toLowerCase())) {
        return false
      }
      if (filterAmountMin && Math.abs(tx.amount) < parseFloat(filterAmountMin)) {
        return false
      }
      if (filterAmountMax && Math.abs(tx.amount) > parseFloat(filterAmountMax)) {
        return false
      }
      return true
    })
  }

  const filteredTransactions = getFilteredTransactions()
  const filteredCount = filteredTransactions.length
  const filteredAmount = filteredTransactions.reduce((sum, tx) => sum + Math.abs(tx.amount), 0)

  const selectedCategoryData = categories.find(c => c.id === selectedCategory)

  if (result) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-blue-gray-900/90 backdrop-blur-xl border border-blue-gray-700/50 rounded-2xl w-full max-w-md shadow-2xl">
          <div className="p-6">
            {/* Success Header */}
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-sage-green-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-sage-green-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">
                Categorization Complete
              </h3>
            </div>

            {/* Results */}
            <div className="space-y-4 mb-6">
              <div className="bg-sage-green-800/20 backdrop-blur-sm border border-sage-green-700/30 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sage-green-200 font-medium">Successful</span>
                  <span className="text-sage-green-300 text-lg font-semibold">{result.successCount}</span>
                </div>
              </div>

              {result.failureCount > 0 && (
                <div className="bg-red-800/20 backdrop-blur-sm border border-red-700/30 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-red-200 font-medium">Failed</span>
                    <span className="text-red-300 text-lg font-semibold">{result.failureCount}</span>
                  </div>
                  {result.failures.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <p className="text-red-300 text-sm font-medium">Failures:</p>
                      {result.failures.slice(0, 3).map((failure, idx) => (
                        <div key={idx} className="text-red-200 text-xs bg-red-900/30 rounded p-2">
                          {failure.error}
                        </div>
                      ))}
                      {result.failures.length > 3 && (
                        <p className="text-red-300 text-xs">
                          +{result.failures.length - 3} more failures
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              {result.failureCount > 0 && (
                <button
                  onClick={() => setResult(null)}
                  className="flex-1 py-2 px-4 bg-golden-600/20 backdrop-blur-sm border border-golden-500/30 rounded-lg text-golden-200 hover:bg-golden-600/30 transition-all duration-200 font-medium"
                >
                  Retry Failures
                </button>
              )}
              <button
                onClick={onClose}
                className="flex-1 py-2 px-4 bg-blue-gray-600/20 backdrop-blur-sm border border-blue-gray-500/30 rounded-lg text-blue-gray-200 hover:bg-blue-gray-600/30 transition-all duration-200 font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-blue-gray-900/90 backdrop-blur-xl border border-blue-gray-700/50 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-blue-gray-700/30">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-white mb-2">
                Batch Categorization
              </h2>
              <div className="flex items-center gap-6">
                <div className="text-golden-300">
                  <span className="font-semibold">{transactionCount}</span> transactions
                </div>
                <div className="text-sage-green-300">
                  <span className="font-semibold">${totalAmount.toLocaleString()}</span> total
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-blue-gray-400 hover:text-white hover:bg-blue-gray-800/50 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex h-full max-h-[calc(90vh-120px)]">
          {/* Main Content */}
          <div className="flex-1 p-6 overflow-y-auto">
            {/* Category Selection */}
            <div className="mb-6">
              <label className="block text-white font-medium mb-3">
                Select Category
              </label>
              {categoriesLoading ? (
                <div className="animate-pulse h-12 bg-blue-gray-700/30 rounded-lg"></div>
              ) : (
                <div className="relative">
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full p-3 bg-blue-gray-800/50 backdrop-blur-sm border border-blue-gray-700/50 rounded-lg text-white focus:border-golden-500/50 focus:outline-none appearance-none"
                  >
                    <option value="">Choose a category...</option>
                    {sortedCategories.slice(0, 5).map(category => (
                      <option key={category.id} value={category.id}>
                        {category.icon} {category.name} ({category.usageCount} used)
                      </option>
                    ))}
                    <option disabled>─────────────</option>
                    {sortedCategories.slice(5).map(category => (
                      <option key={category.id} value={category.id}>
                        {category.icon} {category.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-gray-400 pointer-events-none" />
                </div>
              )}
            </div>

            {/* Filters */}
            <div className="mb-6">
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-2 text-blue-gray-300 hover:text-white transition-colors mb-3"
              >
                <Filter className="w-4 h-4" />
                Advanced Filtering
                {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {showAdvanced && (
                <div className="bg-blue-gray-800/30 backdrop-blur-sm border border-blue-gray-700/30 rounded-lg p-4 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-blue-gray-300 text-sm mb-2">Merchant</label>
                      <input
                        type="text"
                        value={filterMerchant}
                        onChange={(e) => setFilterMerchant(e.target.value)}
                        placeholder="Filter by merchant..."
                        className="w-full p-2 bg-blue-gray-800/50 border border-blue-gray-700/50 rounded text-white placeholder-blue-gray-400 focus:border-golden-500/50 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-blue-gray-300 text-sm mb-2">Min Amount</label>
                      <input
                        type="number"
                        value={filterAmountMin}
                        onChange={(e) => setFilterAmountMin(e.target.value)}
                        placeholder="0"
                        className="w-full p-2 bg-blue-gray-800/50 border border-blue-gray-700/50 rounded text-white placeholder-blue-gray-400 focus:border-golden-500/50 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-blue-gray-300 text-sm mb-2">Max Amount</label>
                      <input
                        type="number"
                        value={filterAmountMax}
                        onChange={(e) => setFilterAmountMax(e.target.value)}
                        placeholder="No limit"
                        className="w-full p-2 bg-blue-gray-800/50 border border-blue-gray-700/50 rounded text-white placeholder-blue-gray-400 focus:border-golden-500/50 focus:outline-none"
                      />
                    </div>
                  </div>

                  {(filterMerchant || filterAmountMin || filterAmountMax) && filteredCount !== transactionCount && (
                    <div className="text-golden-300 text-sm">
                      Filtered to {filteredCount} transactions (${filteredAmount.toLocaleString()})
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Rule Creation */}
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-3">
                <input
                  type="checkbox"
                  id="createRule"
                  checked={createRule}
                  onChange={(e) => setCreateRule(e.target.checked)}
                  className="w-4 h-4 rounded border-blue-gray-500/50 bg-blue-gray-800/50 text-golden-400 focus:ring-golden-400/50"
                />
                <label htmlFor="createRule" className="text-white font-medium">
                  Create categorization rule
                </label>
              </div>

              {createRule && (
                <div className="bg-golden-800/20 backdrop-blur-sm border border-golden-700/30 rounded-lg p-4">
                  <p className="text-golden-200 text-sm mb-3">
                    Create a rule to automatically categorize similar transactions in the future
                  </p>
                  <input
                    type="text"
                    value={rulePattern}
                    onChange={(e) => setRulePattern(e.target.value)}
                    placeholder="e.g., contains 'UBER' or merchant equals 'Starbucks'"
                    className="w-full p-2 bg-golden-900/30 border border-golden-700/50 rounded text-golden-100 placeholder-golden-300 focus:border-golden-500 focus:outline-none"
                  />
                </div>
              )}
            </div>

            {/* Grouping Suggestions */}
            {groupingSuggestions.length > 0 && (
              <div className="mb-6">
                <h3 className="text-white font-medium mb-3 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-golden-400" />
                  Smart Grouping Suggestions
                </h3>
                <div className="space-y-2">
                  {groupingSuggestions.map(suggestion => (
                    <div
                      key={suggestion.id}
                      className="bg-sage-green-800/20 backdrop-blur-sm border border-sage-green-700/30 rounded-lg p-3 hover:bg-sage-green-800/30 transition-colors cursor-pointer"
                      onClick={() => handleGroupCategorize(suggestion.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 bg-sage-green-400 rounded-full"></div>
                          <span className="text-sage-green-200">{suggestion.label}</span>
                          <div className="flex items-center gap-1 text-xs">
                            <TrendingUp className="w-3 h-3" />
                            <span className="text-sage-green-300">{Math.round(suggestion.confidence * 100)}%</span>
                          </div>
                        </div>
                        {selectedCategory && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleGroupCategorize(suggestion.id)
                            }}
                            disabled={isProcessing}
                            className="px-3 py-1 bg-sage-green-600/20 border border-sage-green-500/30 rounded text-sage-green-200 hover:bg-sage-green-600/30 transition-colors text-sm"
                          >
                            Apply
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar - Transaction Preview */}
          <div className="w-80 border-l border-blue-gray-700/30 p-6 bg-blue-gray-800/20 overflow-y-auto">
            <h3 className="text-white font-medium mb-4 flex items-center gap-2">
              <Tag className="w-4 h-4" />
              Transaction Preview
            </h3>

            <div className="space-y-3 mb-6">
              {filteredTransactions.slice(0, 5).map(transaction => (
                <div
                  key={transaction.id}
                  className="bg-blue-gray-800/30 backdrop-blur-sm border border-blue-gray-700/30 rounded-lg p-3"
                >
                  <div className="text-white text-sm font-medium mb-1 truncate">
                    {transaction.description}
                  </div>
                  {transaction.merchant && (
                    <div className="text-blue-gray-300 text-xs mb-2">
                      {transaction.merchant}
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-golden-300 font-medium">
                      ${Math.abs(transaction.amount).toLocaleString()}
                    </span>
                    <span className="text-blue-gray-400 text-xs">
                      {new Date(transaction.date).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}

              {filteredTransactions.length > 5 && (
                <div className="text-center text-blue-gray-400 text-sm py-2">
                  +{filteredTransactions.length - 5} more transactions
                </div>
              )}
            </div>

            {selectedCategoryData && (
              <div className="bg-golden-800/20 backdrop-blur-sm border border-golden-700/30 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{selectedCategoryData.icon}</span>
                  <span className="text-golden-200 font-medium">{selectedCategoryData.name}</span>
                </div>
                <div className="text-golden-300 text-sm">
                  Previously used {selectedCategoryData.usageCount} times
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-blue-gray-700/30 bg-blue-gray-800/30">
          <div className="flex items-center justify-between">
            <div className="text-blue-gray-300 text-sm">
              {isProcessing && (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-golden-400 border-t-transparent rounded-full animate-spin"></div>
                  Processing categorization...
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={onClose}
                disabled={isProcessing}
                className="py-2 px-4 bg-blue-gray-600/20 backdrop-blur-sm border border-blue-gray-500/30 rounded-lg text-blue-gray-200 hover:bg-blue-gray-600/30 transition-all duration-200 font-medium disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCategorize}
                disabled={!selectedCategory || isProcessing || filteredCount === 0}
                className="py-2 px-6 bg-golden-600/20 backdrop-blur-sm border border-golden-500/30 rounded-lg text-golden-200 hover:bg-golden-600/30 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-golden-400 border-t-transparent rounded-full animate-spin"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Categorize {filteredCount} Transaction{filteredCount !== 1 ? 's' : ''}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}