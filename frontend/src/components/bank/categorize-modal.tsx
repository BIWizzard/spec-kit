'use client'

import { useState, useEffect, useMemo } from 'react'
import { X, Search, Plus, Sparkles, Check, ArrowLeft, ArrowRight, Undo, Redo, Tag, AlertCircle, TrendingUp, Calendar, DollarSign } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

interface Transaction {
  id: string
  bankAccountId: string
  bankAccountName: string
  institutionName: string
  amount: number
  date: string
  description: string
  merchantName?: string
  pending: boolean
  spendingCategoryId?: string
  categoryName?: string
  userCategorized: boolean
  notes?: string
}

interface SpendingCategory {
  id: string
  name: string
  color: string
  icon: string
  parentCategoryId?: string
  subcategories?: SpendingCategory[]
}

interface AISuggestion {
  categoryId: string
  categoryName: string
  confidence: number
  reason: string
}

interface CategorizationRule {
  id?: string
  merchantPattern: string
  categoryId: string
  categoryName: string
  confidence: number
}

interface CategorizeModalProps {
  isOpen: boolean
  onClose: () => void
  transactions: Transaction[]
  mode?: 'single' | 'multiple'
}

interface CategorizationPreview {
  transactionId: string
  oldCategoryId?: string
  oldCategoryName?: string
  newCategoryId: string
  newCategoryName: string
  confidence?: number
  isAISuggestion?: boolean
}

interface HistoryEntry {
  type: 'categorize' | 'rule_create'
  previews: CategorizationPreview[]
  rule?: CategorizationRule
  timestamp: number
}

export default function CategorizeModal({
  isOpen,
  onClose,
  transactions,
  mode = 'single'
}: CategorizeModalProps) {
  const queryClient = useQueryClient()
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState('')
  const [showNewCategoryForm, setShowNewCategoryForm] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newCategoryColor, setNewCategoryColor] = useState('#8FAD77')
  const [newCategoryIcon, setNewCategoryIcon] = useState('📁')
  const [createRule, setCreateRule] = useState(false)
  const [rulePattern, setRulePattern] = useState('')
  const [showPreview, setShowPreview] = useState(false)
  const [previews, setPreviews] = useState<CategorizationPreview[]>([])
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [isProcessing, setIsProcessing] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  // Fetch categories
  const { data: categories = [] } = useQuery<SpendingCategory[]>({
    queryKey: ['spendingCategories'],
    queryFn: async () => {
      const response = await fetch('/api/spending-categories')
      if (!response.ok) throw new Error('Failed to fetch categories')
      return response.json()
    },
    enabled: isOpen
  })

  // Fetch AI suggestions
  const { data: aiSuggestions = [] } = useQuery<AISuggestion[]>({
    queryKey: ['aiSuggestions', transactions.map(t => t.id)],
    queryFn: async () => {
      const response = await fetch('/api/transactions/ai-suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionIds: transactions.map(t => t.id)
        })
      })
      if (!response.ok) throw new Error('Failed to fetch AI suggestions')
      return response.json()
    },
    enabled: isOpen && transactions.length > 0
  })

  // Create category mutation
  const createCategoryMutation = useMutation({
    mutationFn: async (category: { name: string; color: string; icon: string }) => {
      const response = await fetch('/api/spending-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(category)
      })
      if (!response.ok) throw new Error('Failed to create category')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spendingCategories'] })
      setShowNewCategoryForm(false)
      setNewCategoryName('')
    }
  })

  // Categorize transactions mutation
  const categorizeMutation = useMutation({
    mutationFn: async (data: {
      transactionIds: string[]
      categoryId: string
      createRule?: boolean
      rulePattern?: string
    }) => {
      const response = await fetch('/api/transactions/categorize-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      if (!response.ok) throw new Error('Failed to categorize transactions')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      setShowSuccess(true)
      setTimeout(() => {
        setShowSuccess(false)
        onClose()
      }, 2000)
    }
  })

  // Filter and search categories
  const filteredCategories = useMemo(() => {
    return categories.filter(category =>
      category.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [categories, searchTerm])

  // Get best AI suggestion for single transaction
  const bestAISuggestion = useMemo(() => {
    if (mode === 'single' && aiSuggestions.length > 0) {
      return aiSuggestions.reduce((best, current) =>
        current.confidence > best.confidence ? current : best
      )
    }
    return null
  }, [aiSuggestions, mode])

  // Auto-suggest rule pattern based on selected transactions
  useEffect(() => {
    if (transactions.length === 1) {
      const transaction = transactions[0]
      const merchant = transaction.merchantName || transaction.description
      setRulePattern(merchant)
    } else if (transactions.length > 1) {
      // Find common merchant patterns
      const merchants = transactions.map(t => t.merchantName || t.description)
      const commonPrefix = merchants.reduce((prefix, current) => {
        let i = 0
        while (i < prefix.length && i < current.length && prefix[i] === current[i]) {
          i++
        }
        return prefix.substring(0, i)
      })
      setRulePattern(commonPrefix.trim() || 'Multiple transactions')
    }
  }, [transactions])

  // Generate categorization previews
  const generatePreviews = (categoryId: string, categoryName: string) => {
    const newPreviews: CategorizationPreview[] = transactions.map(transaction => ({
      transactionId: transaction.id,
      oldCategoryId: transaction.spendingCategoryId,
      oldCategoryName: transaction.categoryName,
      newCategoryId: categoryId,
      newCategoryName: categoryName,
      confidence: aiSuggestions.find(s => s.categoryId === categoryId)?.confidence || 1.0,
      isAISuggestion: aiSuggestions.some(s => s.categoryId === categoryId)
    }))
    setPreviews(newPreviews)
  }

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategoryId(categoryId)
    const category = categories.find(c => c.id === categoryId)
    if (category) {
      generatePreviews(categoryId, category.name)
      setShowPreview(true)
    }
  }

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return

    try {
      const result = await createCategoryMutation.mutateAsync({
        name: newCategoryName.trim(),
        color: newCategoryColor,
        icon: newCategoryIcon
      })

      handleCategorySelect(result.id)
    } catch (error) {
      console.error('Failed to create category:', error)
    }
  }

  const handleApplyCategorization = async () => {
    if (!selectedCategoryId || isProcessing) return

    setIsProcessing(true)

    try {
      // Add to history
      const newHistoryEntry: HistoryEntry = {
        type: createRule ? 'rule_create' : 'categorize',
        previews: [...previews],
        rule: createRule ? {
          merchantPattern: rulePattern,
          categoryId: selectedCategoryId,
          categoryName: categories.find(c => c.id === selectedCategoryId)?.name || '',
          confidence: 0.9
        } : undefined,
        timestamp: Date.now()
      }

      setHistory(prev => [...prev.slice(0, historyIndex + 1), newHistoryEntry])
      setHistoryIndex(prev => prev + 1)

      await categorizeMutation.mutateAsync({
        transactionIds: transactions.map(t => t.id),
        categoryId: selectedCategoryId,
        createRule,
        rulePattern: createRule ? rulePattern : undefined
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleUndo = () => {
    if (historyIndex >= 0) {
      setHistoryIndex(prev => prev - 1)
      // In a real implementation, you'd reverse the categorization
      console.log('Undo operation:', history[historyIndex])
    }
  }

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(prev => prev + 1)
      // In a real implementation, you'd reapply the categorization
      console.log('Redo operation:', history[historyIndex + 1])
    }
  }

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(Math.abs(amount))
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    })
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-sage-400'
    if (confidence >= 0.6) return 'text-golden-400'
    return 'text-red-400'
  }

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.8) return 'High'
    if (confidence >= 0.6) return 'Medium'
    return 'Low'
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-blue-gray-900/90 backdrop-blur-xl border border-blue-gray-700/30 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-blue-gray-700/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-golden-500/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
                <Tag className="w-5 h-5 text-golden-400" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">
                  Categorize Transaction{transactions.length > 1 ? 's' : ''}
                </h2>
                <p className="text-blue-gray-300 text-sm">
                  {transactions.length} transaction{transactions.length > 1 ? 's' : ''} selected
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Undo/Redo */}
              <button
                onClick={handleUndo}
                disabled={historyIndex < 0}
                className="p-2 bg-blue-gray-600/20 backdrop-blur-sm border border-blue-gray-500/30 rounded-lg text-blue-gray-300 hover:text-white hover:bg-blue-gray-600/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                title="Undo"
              >
                <Undo className="w-4 h-4" />
              </button>
              <button
                onClick={handleRedo}
                disabled={historyIndex >= history.length - 1}
                className="p-2 bg-blue-gray-600/20 backdrop-blur-sm border border-blue-gray-500/30 rounded-lg text-blue-gray-300 hover:text-white hover:bg-blue-gray-600/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                title="Redo"
              >
                <Redo className="w-4 h-4" />
              </button>
              <button
                onClick={onClose}
                className="p-2 bg-blue-gray-600/20 backdrop-blur-sm border border-blue-gray-500/30 rounded-lg text-blue-gray-300 hover:text-white hover:bg-blue-gray-600/30 transition-all duration-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex h-[calc(90vh-140px)]">
          {/* Transaction Details Sidebar */}
          <div className="w-80 border-r border-blue-gray-700/30 p-4 overflow-y-auto bg-blue-gray-800/20">
            <h3 className="font-medium text-white mb-3 flex items-center gap-2">
              <span>Transaction Details</span>
              {transactions.length > 1 && (
                <span className="px-2 py-0.5 bg-golden-500/20 rounded-full text-xs text-golden-300">
                  {transactions.length}
                </span>
              )}
            </h3>

            <div className="space-y-3">
              {transactions.slice(0, 5).map((transaction, index) => (
                <div key={transaction.id} className="bg-blue-gray-700/20 backdrop-blur-sm rounded-lg p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white text-sm truncate">
                        {transaction.merchantName || transaction.description}
                      </p>
                      <p className="text-blue-gray-400 text-xs">
                        {transaction.institutionName} • {formatDate(transaction.date)}
                      </p>
                    </div>
                    <div className="text-right ml-2">
                      <p className={`font-medium text-sm ${transaction.amount < 0 ? 'text-red-400' : 'text-sage-400'}`}>
                        {transaction.amount < 0 ? '-' : '+'}{formatAmount(transaction.amount)}
                      </p>
                      {transaction.pending && (
                        <span className="inline-block px-1.5 py-0.5 bg-yellow-800/30 text-yellow-300 rounded text-xs">
                          Pending
                        </span>
                      )}
                    </div>
                  </div>

                  {transaction.description !== transaction.merchantName && (
                    <p className="text-blue-gray-400 text-xs mb-2">{transaction.description}</p>
                  )}

                  {transaction.categoryName && (
                    <div className="flex items-center gap-1">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-sage-800/30 text-sage-300 border border-sage-700/50">
                        <Tag className="w-2.5 h-2.5 mr-1" />
                        {transaction.categoryName}
                      </span>
                    </div>
                  )}
                </div>
              ))}

              {transactions.length > 5 && (
                <div className="text-center py-2">
                  <span className="text-blue-gray-400 text-sm">
                    +{transactions.length - 5} more transactions
                  </span>
                </div>
              )}
            </div>

            {/* AI Suggestions */}
            {bestAISuggestion && (
              <div className="mt-6">
                <h4 className="font-medium text-white mb-3 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-golden-400" />
                  AI Suggestion
                </h4>
                <div className="bg-golden-500/10 backdrop-blur-sm border border-golden-500/20 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium text-golden-200">{bestAISuggestion.categoryName}</p>
                    <span className={`text-xs font-medium ${getConfidenceColor(bestAISuggestion.confidence)}`}>
                      {getConfidenceLabel(bestAISuggestion.confidence)}
                    </span>
                  </div>
                  <p className="text-golden-300 text-sm">{bestAISuggestion.reason}</p>
                  <button
                    onClick={() => handleCategorySelect(bestAISuggestion.categoryId)}
                    className="mt-2 w-full px-3 py-2 bg-golden-500/20 backdrop-blur-sm border border-golden-400/30 rounded-lg text-golden-200 hover:bg-golden-500/30 transition-all duration-200 text-sm flex items-center justify-center gap-2"
                  >
                    <Sparkles className="w-3 h-3" />
                    Apply AI Suggestion
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col">
            {!showPreview ? (
              /* Category Selection */
              <div className="flex-1 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium text-white">Select Category</h3>
                  <button
                    onClick={() => setShowNewCategoryForm(true)}
                    className="px-3 py-2 bg-sage-500/20 backdrop-blur-sm border border-sage-400/30 rounded-lg text-sage-200 hover:bg-sage-500/30 transition-all duration-200 text-sm flex items-center gap-2"
                  >
                    <Plus className="w-3 h-3" />
                    New Category
                  </button>
                </div>

                {/* Search */}
                <div className="relative mb-4">
                  <Search className="w-5 h-5 text-blue-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search categories..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-blue-gray-700/30 border border-blue-gray-600/50 rounded-lg text-white placeholder-blue-gray-400 focus:outline-none focus:ring-2 focus:ring-golden-400/50"
                  />
                </div>

                {/* New Category Form */}
                {showNewCategoryForm && (
                  <div className="bg-blue-gray-800/30 backdrop-blur-sm border border-blue-gray-700/50 rounded-lg p-4 mb-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-white">Create New Category</h4>
                      <button
                        onClick={() => setShowNewCategoryForm(false)}
                        className="text-blue-gray-400 hover:text-white"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-3 mb-3">
                      <div className="col-span-2">
                        <input
                          type="text"
                          placeholder="Category name"
                          value={newCategoryName}
                          onChange={(e) => setNewCategoryName(e.target.value)}
                          className="w-full px-3 py-2 bg-blue-gray-700/30 border border-blue-gray-600/50 rounded text-white placeholder-blue-gray-400 focus:outline-none focus:ring-2 focus:ring-golden-400/50"
                        />
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="📁"
                          value={newCategoryIcon}
                          onChange={(e) => setNewCategoryIcon(e.target.value)}
                          className="w-12 px-2 py-2 bg-blue-gray-700/30 border border-blue-gray-600/50 rounded text-white text-center focus:outline-none focus:ring-2 focus:ring-golden-400/50"
                        />
                        <input
                          type="color"
                          value={newCategoryColor}
                          onChange={(e) => setNewCategoryColor(e.target.value)}
                          className="w-12 h-10 bg-blue-gray-700/30 border border-blue-gray-600/50 rounded cursor-pointer"
                        />
                      </div>
                    </div>

                    <button
                      onClick={handleCreateCategory}
                      disabled={!newCategoryName.trim() || createCategoryMutation.isPending}
                      className="w-full px-4 py-2 bg-sage-500/20 backdrop-blur-sm border border-sage-400/30 rounded text-sage-200 hover:bg-sage-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                    >
                      {createCategoryMutation.isPending ? 'Creating...' : 'Create Category'}
                    </button>
                  </div>
                )}

                {/* Categories List */}
                <div className="grid grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                  {filteredCategories.map(category => (
                    <button
                      key={category.id}
                      onClick={() => handleCategorySelect(category.id)}
                      className={`p-3 rounded-lg border text-left transition-all duration-200 ${
                        selectedCategoryId === category.id
                          ? 'bg-golden-500/20 border-golden-400/50 text-golden-200'
                          : 'bg-blue-gray-700/20 border-blue-gray-600/30 text-blue-gray-300 hover:bg-blue-gray-600/30 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{category.icon}</span>
                        <span className="font-medium">{category.name}</span>
                      </div>
                    </button>
                  ))}
                </div>

                {filteredCategories.length === 0 && searchTerm && (
                  <div className="text-center py-8">
                    <p className="text-blue-gray-400">No categories found matching "{searchTerm}"</p>
                    <button
                      onClick={() => {
                        setNewCategoryName(searchTerm)
                        setShowNewCategoryForm(true)
                      }}
                      className="mt-2 px-4 py-2 bg-sage-500/20 backdrop-blur-sm border border-sage-400/30 rounded-lg text-sage-200 hover:bg-sage-500/30 transition-all duration-200 text-sm"
                    >
                      Create "{searchTerm}" category
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* Preview */
              <div className="flex-1 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <button
                    onClick={() => setShowPreview(false)}
                    className="p-2 bg-blue-gray-600/20 backdrop-blur-sm border border-blue-gray-500/30 rounded-lg text-blue-gray-300 hover:text-white hover:bg-blue-gray-600/30 transition-all duration-200"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <h3 className="font-medium text-white">Preview Categorization</h3>
                </div>

                {/* Create Rule Option */}
                <div className="bg-blue-gray-800/30 backdrop-blur-sm border border-blue-gray-700/50 rounded-lg p-4 mb-4">
                  <div className="flex items-center gap-3 mb-3">
                    <input
                      type="checkbox"
                      id="createRule"
                      checked={createRule}
                      onChange={(e) => setCreateRule(e.target.checked)}
                      className="w-4 h-4 rounded border-blue-gray-500/50 bg-blue-gray-800/50 text-golden-400 focus:ring-golden-400/50"
                    />
                    <label htmlFor="createRule" className="font-medium text-white">
                      Create categorization rule
                    </label>
                  </div>

                  {createRule && (
                    <div>
                      <label className="block text-blue-gray-300 text-sm mb-2">
                        Always categorize transactions matching:
                      </label>
                      <input
                        type="text"
                        value={rulePattern}
                        onChange={(e) => setRulePattern(e.target.value)}
                        placeholder="Enter merchant name or pattern"
                        className="w-full px-3 py-2 bg-blue-gray-700/30 border border-blue-gray-600/50 rounded text-white placeholder-blue-gray-400 focus:outline-none focus:ring-2 focus:ring-golden-400/50"
                      />
                      <p className="text-blue-gray-400 text-xs mt-1">
                        Future transactions matching this pattern will be automatically categorized
                      </p>
                    </div>
                  )}
                </div>

                {/* Preview List */}
                <div className="space-y-2 max-h-64 overflow-y-auto mb-4">
                  {previews.map(preview => {
                    const transaction = transactions.find(t => t.id === preview.transactionId)
                    if (!transaction) return null

                    return (
                      <div key={preview.transactionId} className="bg-blue-gray-700/20 backdrop-blur-sm rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-white text-sm truncate">
                              {transaction.merchantName || transaction.description}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              {preview.oldCategoryName ? (
                                <span className="text-xs text-red-400 line-through">
                                  {preview.oldCategoryName}
                                </span>
                              ) : (
                                <span className="text-xs text-blue-gray-400">Uncategorized</span>
                              )}
                              <ArrowRight className="w-3 h-3 text-blue-gray-400" />
                              <span className="text-xs text-sage-400 font-medium">
                                {preview.newCategoryName}
                              </span>
                              {preview.isAISuggestion && (
                                <Sparkles className="w-3 h-3 text-golden-400" />
                              )}
                            </div>
                          </div>
                          <div className="text-right ml-3">
                            <p className={`font-medium text-sm ${transaction.amount < 0 ? 'text-red-400' : 'text-sage-400'}`}>
                              {transaction.amount < 0 ? '-' : '+'}{formatAmount(transaction.amount)}
                            </p>
                            {preview.confidence && (
                              <span className={`text-xs ${getConfidenceColor(preview.confidence)}`}>
                                {Math.round(preview.confidence * 100)}%
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Apply Button */}
                <div className="flex gap-3 pt-4 border-t border-blue-gray-700/30">
                  <button
                    onClick={() => setShowPreview(false)}
                    className="px-4 py-2 bg-blue-gray-600/20 backdrop-blur-sm border border-blue-gray-500/30 rounded-lg text-blue-gray-300 hover:text-white hover:bg-blue-gray-600/30 transition-all duration-200"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleApplyCategorization}
                    disabled={isProcessing || categorizeMutation.isPending}
                    className="flex-1 px-4 py-2 bg-sage-500/20 backdrop-blur-sm border border-sage-400/30 rounded-lg text-sage-200 hover:bg-sage-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
                  >
                    {isProcessing || categorizeMutation.isPending ? (
                      <>
                        <div className="w-4 h-4 border-2 border-sage-400/30 border-t-sage-400 rounded-full animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        Apply Categorization
                        {createRule && ' & Create Rule'}
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Success Toast */}
        {showSuccess && (
          <div className="absolute top-6 right-6 bg-sage-800/90 backdrop-blur-sm border border-sage-700/50 rounded-lg p-4 flex items-center gap-3 text-sage-200">
            <Check className="w-5 h-5 text-sage-400" />
            <span>Categorization applied successfully!</span>
          </div>
        )}
      </div>
    </div>
  )
}