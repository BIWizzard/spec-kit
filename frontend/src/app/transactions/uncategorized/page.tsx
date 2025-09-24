'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, Tag, RefreshCw, CheckCircle, Lightbulb, Zap, Filter } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

interface UncategorizedTransaction {
  id: string
  bankAccountId: string
  bankAccountName: string
  institutionName: string
  amount: number
  date: string
  description: string
  merchantName?: string
  pending: boolean
  suggestedCategory?: {
    id: string
    name: string
    confidence: number
    reason: string
  }
  possibleMatches?: {
    id: string
    name: string
    confidence: number
  }[]
}

interface SpendingCategory {
  id: string
  name: string
  color: string
  icon: string
  parentCategoryId?: string
  budgetCategoryId: string
  budgetCategoryName: string
}

interface BankAccount {
  id: string
  institutionName: string
  accountName: string
}

interface CategorizeRule {
  merchantPattern: string
  descriptionPattern: string
  categoryId: string
  categoryName: string
}

export default function UncategorizedTransactionsPage() {
  const router = useRouter()
  const queryClient = useQueryClient()

  const [selectedTransactions, setSelectedTransactions] = useState<string[]>([])
  const [selectedCategory, setSelectedCategory] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(true)
  const [filterAccount, setFilterAccount] = useState('')
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'merchant'>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [bulkCategorizing, setBulkCategorizing] = useState(false)

  const { data: transactions = [], isLoading, refetch } = useQuery<UncategorizedTransaction[]>({
    queryKey: ['uncategorizedTransactions', filterAccount, sortBy, sortOrder],
    queryFn: async () => {
      const params = new URLSearchParams({
        uncategorized: 'true',
        sort: `${sortBy}:${sortOrder}`
      })
      if (filterAccount) params.set('bankAccountId', filterAccount)

      const response = await fetch(`/api/transactions?${params.toString()}`)
      if (!response.ok) throw new Error('Failed to fetch uncategorized transactions')
      return response.json()
    }
  })

  const { data: categories = [] } = useQuery<SpendingCategory[]>({
    queryKey: ['spendingCategories'],
    queryFn: async () => {
      const response = await fetch('/api/spending-categories')
      if (!response.ok) throw new Error('Failed to fetch categories')
      return response.json()
    }
  })

  const { data: bankAccounts = [] } = useQuery<BankAccount[]>({
    queryKey: ['bankAccounts', 'simple'],
    queryFn: async () => {
      const response = await fetch('/api/bank-accounts?fields=id,institutionName,accountName')
      if (!response.ok) throw new Error('Failed to fetch bank accounts')
      return response.json()
    }
  })

  const categorizeMutation = useMutation({
    mutationFn: async ({ transactionIds, categoryId }: { transactionIds: string[]; categoryId: string }) => {
      const response = await fetch('/api/transactions/categorize-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionIds, categoryId })
      })
      if (!response.ok) throw new Error('Failed to categorize transactions')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['uncategorizedTransactions'] })
      setSelectedTransactions([])
      setSelectedCategory('')
    }
  })

  const autoCategorizeMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/transactions/auto-categorize', {
        method: 'POST'
      })
      if (!response.ok) throw new Error('Auto-categorization failed')
      return response.json()
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['uncategorizedTransactions'] })
    }
  })

  const createRuleMutation = useMutation({
    mutationFn: async ({ transactionId, categoryId }: { transactionId: string; categoryId: string }) => {
      const transaction = transactions.find(t => t.id === transactionId)
      if (!transaction) throw new Error('Transaction not found')

      // Create a categorization rule based on the transaction
      const response = await fetch('/api/categorization-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchantPattern: transaction.merchantName || '',
          descriptionPattern: transaction.description,
          categoryId
        })
      })
      if (!response.ok) throw new Error('Failed to create rule')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['uncategorizedTransactions'] })
    }
  })

  const handleTransactionSelect = (transactionId: string) => {
    setSelectedTransactions(prev =>
      prev.includes(transactionId)
        ? prev.filter(id => id !== transactionId)
        : [...prev, transactionId]
    )
  }

  const handleSelectAll = () => {
    if (selectedTransactions.length === transactions.length) {
      setSelectedTransactions([])
    } else {
      setSelectedTransactions(transactions.map(t => t.id))
    }
  }

  const handleCategorizeSelected = () => {
    if (selectedTransactions.length > 0 && selectedCategory) {
      setBulkCategorizing(true)
      categorizeMutation.mutate({ transactionIds: selectedTransactions, categoryId: selectedCategory })
    }
  }

  const handleQuickCategorize = (transactionId: string, categoryId: string, createRule = false) => {
    categorizeMutation.mutate({ transactionIds: [transactionId], categoryId })
    if (createRule) {
      createRuleMutation.mutate({ transactionId, categoryId })
    }
  }

  const handleSort = (column: typeof sortBy) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(column)
      setSortOrder('desc')
    }
  }

  const formatBalance = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(Math.abs(amount))
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-sage-400'
    if (confidence >= 0.6) return 'text-golden-400'
    return 'text-blue-gray-400'
  }

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.8) return 'High'
    if (confidence >= 0.6) return 'Medium'
    return 'Low'
  }

  const categorizedCount = transactions.filter(t => t.suggestedCategory && t.suggestedCategory.confidence >= 0.7).length

  useEffect(() => {
    if (categorizeMutation.isSuccess && bulkCategorizing) {
      setBulkCategorizing(false)
    }
  }, [categorizeMutation.isSuccess, bulkCategorizing])

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/transactions')}
            className="w-10 h-10 bg-blue-gray-800/50 backdrop-blur-sm border border-blue-gray-700/50 rounded-lg flex items-center justify-center text-blue-gray-300 hover:text-white hover:bg-blue-gray-700/50 transition-all duration-200"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-semibold text-white flex items-center gap-2">
              <Tag className="w-6 h-6 text-golden-400" />
              Uncategorized Transactions
            </h1>
            <p className="text-blue-gray-300 mt-1">
              {transactions.length} transactions need categorization
              {categorizedCount > 0 && ` • ${categorizedCount} have suggestions`}
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => autoCategorizeMutation.mutate()}
            disabled={autoCategorizeMutation.isPending}
            className="px-4 py-2 bg-sage-600/20 backdrop-blur-sm border border-sage-500/30 rounded-lg text-sage-200 hover:bg-sage-600/30 transition-all duration-200 flex items-center gap-2"
          >
            <Zap className={`w-4 h-4 ${autoCategorizeMutation.isPending ? 'animate-pulse' : ''}`} />
            Auto-Categorize
          </button>
          <button
            onClick={() => refetch()}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-gray-600/20 backdrop-blur-sm border border-blue-gray-500/30 rounded-lg text-blue-gray-200 hover:bg-blue-gray-600/30 transition-all duration-200 flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      {categorizedCount > 0 && (
        <div className="bg-sage-800/20 backdrop-blur-sm border border-sage-700/30 rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-sage-600/30 rounded-full flex items-center justify-center">
                <Lightbulb className="w-5 h-5 text-sage-400" />
              </div>
              <div>
                <h3 className="font-medium text-white">Smart Suggestions Available</h3>
                <p className="text-sage-300 text-sm">
                  {categorizedCount} transactions have high-confidence category suggestions
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                const highConfidenceTransactions = transactions
                  .filter(t => t.suggestedCategory && t.suggestedCategory.confidence >= 0.7)
                  .map(t => ({ id: t.id, categoryId: t.suggestedCategory!.id }))

                highConfidenceTransactions.forEach(({ id, categoryId }) => {
                  handleQuickCategorize(id, categoryId)
                })
              }}
              className="px-4 py-2 bg-sage-500/20 backdrop-blur-sm border border-sage-400/30 rounded-lg text-sage-200 hover:bg-sage-500/30 transition-all duration-200"
            >
              Accept All Suggestions
            </button>
          </div>
        </div>
      )}

      {/* Filters and Bulk Actions */}
      <div className="bg-blue-gray-800/20 backdrop-blur-sm border border-blue-gray-700/30 rounded-xl p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-blue-gray-400" />
            <select
              value={filterAccount}
              onChange={(e) => setFilterAccount(e.target.value)}
              className="px-3 py-2 bg-blue-gray-700/30 border border-blue-gray-600/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-golden-400/50"
            >
              <option value="">All Accounts</option>
              {bankAccounts.map(account => (
                <option key={account.id} value={account.id}>
                  {account.institutionName} - {account.accountName}
                </option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={showSuggestions}
              onChange={(e) => setShowSuggestions(e.target.checked)}
              className="w-4 h-4 rounded border-blue-gray-500/50 bg-blue-gray-800/50 text-golden-400 focus:ring-golden-400/50"
            />
            <span className="text-blue-gray-300 text-sm">Show AI suggestions</span>
          </label>

          <div className="flex-1" />

          {selectedTransactions.length > 0 && (
            <div className="flex items-center gap-3">
              <span className="text-blue-gray-300 text-sm">
                {selectedTransactions.length} selected
              </span>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 bg-blue-gray-700/30 border border-blue-gray-600/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-golden-400/50"
              >
                <option value="">Choose category...</option>
                {categories.map(category => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
              <button
                onClick={handleCategorizeSelected}
                disabled={!selectedCategory || categorizeMutation.isPending}
                className="px-4 py-2 bg-golden-500/20 backdrop-blur-sm border border-golden-400/30 rounded-lg text-golden-200 hover:bg-golden-500/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {bulkCategorizing ? 'Categorizing...' : 'Categorize'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Transactions List */}
      <div className="bg-blue-gray-800/20 backdrop-blur-sm border border-blue-gray-700/30 rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <RefreshCw className="w-8 h-8 text-blue-gray-400 animate-spin mx-auto mb-4" />
            <p className="text-blue-gray-300">Loading uncategorized transactions...</p>
          </div>
        ) : transactions.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-sage-600/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-sage-400" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">All caught up!</h3>
            <p className="text-blue-gray-300 mb-4">All your transactions have been categorized</p>
            <button
              onClick={() => router.push('/transactions')}
              className="px-4 py-2 bg-golden-500/20 backdrop-blur-sm border border-golden-400/30 rounded-lg text-golden-200 hover:bg-golden-500/30 transition-all duration-200"
            >
              View All Transactions
            </button>
          </div>
        ) : (
          <>
            {/* Table Header */}
            <div className="p-4 border-b border-blue-gray-700/30">
              <div className="flex items-center gap-4">
                <input
                  type="checkbox"
                  checked={selectedTransactions.length === transactions.length}
                  onChange={handleSelectAll}
                  className="w-4 h-4 rounded border-blue-gray-500/50 bg-blue-gray-800/50 text-golden-400 focus:ring-golden-400/50"
                />
                <div className="flex-1 grid grid-cols-6 gap-4 items-center">
                  <button
                    onClick={() => handleSort('date')}
                    className="text-left text-blue-gray-300 hover:text-white font-medium"
                  >
                    Date {sortBy === 'date' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </button>
                  <button
                    onClick={() => handleSort('merchant')}
                    className="text-left text-blue-gray-300 hover:text-white font-medium"
                  >
                    Transaction {sortBy === 'merchant' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </button>
                  <span className="text-blue-gray-300 font-medium">Account</span>
                  <button
                    onClick={() => handleSort('amount')}
                    className="text-right text-blue-gray-300 hover:text-white font-medium"
                  >
                    Amount {sortBy === 'amount' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </button>
                  <span className="text-blue-gray-300 font-medium">Suggestion</span>
                  <span className="text-blue-gray-300 font-medium">Actions</span>
                </div>
              </div>
            </div>

            {/* Transaction Rows */}
            <div className="divide-y divide-blue-gray-700/30">
              {transactions.map((transaction) => (
                <div key={transaction.id} className="p-4 hover:bg-blue-gray-700/20 transition-colors duration-150">
                  <div className="flex items-center gap-4">
                    <input
                      type="checkbox"
                      checked={selectedTransactions.includes(transaction.id)}
                      onChange={() => handleTransactionSelect(transaction.id)}
                      className="w-4 h-4 rounded border-blue-gray-500/50 bg-blue-gray-800/50 text-golden-400 focus:ring-golden-400/50"
                    />
                    <div className="flex-1 grid grid-cols-6 gap-4 items-center">
                      <div>
                        <p className="text-white text-sm">{formatDate(transaction.date)}</p>
                        {transaction.pending && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-800/30 text-yellow-300 border border-yellow-700/50">
                            Pending
                          </span>
                        )}
                      </div>

                      <div>
                        <p className="font-medium text-white text-sm">
                          {transaction.merchantName || transaction.description}
                        </p>
                        {transaction.merchantName && transaction.description !== transaction.merchantName && (
                          <p className="text-blue-gray-400 text-xs">{transaction.description}</p>
                        )}
                      </div>

                      <div>
                        <p className="text-blue-gray-300 text-sm">{transaction.institutionName}</p>
                        <p className="text-blue-gray-400 text-xs">{transaction.bankAccountName}</p>
                      </div>

                      <div className="text-right">
                        <p className={`font-medium text-sm ${transaction.amount < 0 ? 'text-red-400' : 'text-sage-400'}`}>
                          {transaction.amount < 0 ? '-' : '+'}{formatBalance(transaction.amount)}
                        </p>
                      </div>

                      <div>
                        {showSuggestions && transaction.suggestedCategory ? (
                          <div>
                            <p className="text-white text-sm font-medium">{transaction.suggestedCategory.name}</p>
                            <div className="flex items-center gap-2">
                              <span className={`text-xs ${getConfidenceColor(transaction.suggestedCategory.confidence)}`}>
                                {getConfidenceLabel(transaction.suggestedCategory.confidence)} confidence
                              </span>
                              <span className="text-blue-gray-500">•</span>
                              <span className="text-blue-gray-400 text-xs">{transaction.suggestedCategory.reason}</span>
                            </div>
                          </div>
                        ) : (
                          <p className="text-blue-gray-400 text-sm">No suggestions</p>
                        )}
                      </div>

                      <div className="flex gap-2">
                        {transaction.suggestedCategory ? (
                          <>
                            <button
                              onClick={() => handleQuickCategorize(transaction.id, transaction.suggestedCategory!.id)}
                              className="px-3 py-1 bg-sage-600/20 backdrop-blur-sm border border-sage-500/30 rounded text-sage-200 hover:bg-sage-600/30 transition-all duration-200 text-xs"
                            >
                              Accept
                            </button>
                            <button
                              onClick={() => handleQuickCategorize(transaction.id, transaction.suggestedCategory!.id, true)}
                              className="px-3 py-1 bg-golden-600/20 backdrop-blur-sm border border-golden-500/30 rounded text-golden-200 hover:bg-golden-600/30 transition-all duration-200 text-xs"
                              title="Accept and create rule for similar transactions"
                            >
                              Accept + Rule
                            </button>
                          </>
                        ) : (
                          <select
                            onChange={(e) => {
                              if (e.target.value) {
                                handleQuickCategorize(transaction.id, e.target.value)
                                e.target.value = ''
                              }
                            }}
                            className="px-2 py-1 bg-blue-gray-700/30 border border-blue-gray-600/50 rounded text-white focus:outline-none focus:ring-2 focus:ring-golden-400/50 text-xs"
                          >
                            <option value="">Choose...</option>
                            {categories.map(category => (
                              <option key={category.id} value={category.id}>{category.name}</option>
                            ))}
                          </select>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}