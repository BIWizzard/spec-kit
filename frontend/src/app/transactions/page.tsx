'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Search, Filter, Download, RefreshCw, Calendar, Tag, DollarSign } from 'lucide-react'
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

interface BankAccount {
  id: string
  institutionName: string
  accountName: string
  accountType: string
}

interface SpendingCategory {
  id: string
  name: string
  color: string
  icon: string
}

interface TransactionFilters {
  search: string
  bankAccountId: string
  categoryId: string
  dateRange: 'all' | 'last7' | 'last30' | 'last90' | 'thisMonth' | 'lastMonth' | 'custom'
  startDate: string
  endDate: string
  amountMin: string
  amountMax: string
  status: 'all' | 'pending' | 'cleared'
  uncategorized: boolean
}

function TransactionsPageContent() {
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()

  const [filters, setFilters] = useState<TransactionFilters>({
    search: '',
    bankAccountId: searchParams.get('bankAccountId') || '',
    categoryId: '',
    dateRange: 'last30',
    startDate: '',
    endDate: '',
    amountMin: '',
    amountMax: '',
    status: 'all',
    uncategorized: false
  })

  const [showFilters, setShowFilters] = useState(false)
  const [selectedTransactions, setSelectedTransactions] = useState<string[]>([])
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'description'>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [page, setPage] = useState(1)
  const pageSize = 50

  const { data: bankAccounts = [] } = useQuery<BankAccount[]>({
    queryKey: ['bankAccounts', 'simple'],
    queryFn: async () => {
      const response = await fetch('/api/bank-accounts?fields=id,institutionName,accountName,accountType')
      if (!response.ok) throw new Error('Failed to fetch bank accounts')
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

  const buildApiUrl = () => {
    const params = new URLSearchParams()
    params.set('page', page.toString())
    params.set('limit', pageSize.toString())
    params.set('sort', `${sortBy}:${sortOrder}`)

    if (filters.search) params.set('search', filters.search)
    if (filters.bankAccountId) params.set('bankAccountId', filters.bankAccountId)
    if (filters.categoryId) params.set('categoryId', filters.categoryId)
    if (filters.amountMin) params.set('amountMin', filters.amountMin)
    if (filters.amountMax) params.set('amountMax', filters.amountMax)
    if (filters.status !== 'all') params.set('status', filters.status)
    if (filters.uncategorized) params.set('uncategorized', 'true')

    // Date range handling
    if (filters.dateRange === 'custom' && filters.startDate && filters.endDate) {
      params.set('startDate', filters.startDate)
      params.set('endDate', filters.endDate)
    } else if (filters.dateRange !== 'all') {
      const now = new Date()
      let startDate = new Date()

      switch (filters.dateRange) {
        case 'last7':
          startDate.setDate(now.getDate() - 7)
          break
        case 'last30':
          startDate.setDate(now.getDate() - 30)
          break
        case 'last90':
          startDate.setDate(now.getDate() - 90)
          break
        case 'thisMonth':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1)
          break
        case 'lastMonth':
          startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
          const endDate = new Date(now.getFullYear(), now.getMonth(), 0)
          params.set('endDate', endDate.toISOString().split('T')[0])
          break
      }

      params.set('startDate', startDate.toISOString().split('T')[0])
      if (filters.dateRange !== 'lastMonth') {
        params.set('endDate', now.toISOString().split('T')[0])
      }
    }

    return `/api/transactions?${params.toString()}`
  }

  const { data: transactionData, isLoading, refetch } = useQuery({
    queryKey: ['transactions', filters, sortBy, sortOrder, page],
    queryFn: async () => {
      const response = await fetch(buildApiUrl())
      if (!response.ok) throw new Error('Failed to fetch transactions')
      return response.json()
    }
  })

  const { transactions = [], total = 0, totalPages = 0 } = transactionData || {}

  const syncMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/bank-accounts/sync-all', {
        method: 'POST'
      })
      if (!response.ok) throw new Error('Sync failed')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['bankAccounts'] })
    }
  })

  const categorizeTransactionsMutation = useMutation({
    mutationFn: async ({ transactionIds, categoryId }: { transactionIds: string[]; categoryId: string }) => {
      const response = await fetch('/api/transactions/categorize-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionIds, categoryId })
      })
      if (!response.ok) throw new Error('Failed to categorize transactions')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      setSelectedTransactions([])
    }
  })

  const handleFilterChange = (key: keyof TransactionFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setPage(1) // Reset to first page when filters change
  }

  const handleSort = (column: typeof sortBy) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(column)
      setSortOrder('desc')
    }
    setPage(1)
  }

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
      setSelectedTransactions(transactions.map((t: Transaction) => t.id))
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

  const getSortIcon = (column: typeof sortBy) => {
    if (sortBy !== column) return null
    return sortOrder === 'asc' ? '↑' : '↓'
  }

  const exportTransactions = async () => {
    try {
      const response = await fetch(buildApiUrl().replace('/api/transactions', '/api/transactions/export'))
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `transactions-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Export failed:', error)
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-white">Transactions</h1>
          <p className="text-blue-gray-300 mt-1">
            {total.toLocaleString()} transactions • {transactions.length} showing
          </p>
        </div>
        <div className="flex gap-3">
          {selectedTransactions.length > 0 && (
            <select
              onChange={(e) => {
                if (e.target.value) {
                  categorizeTransactionsMutation.mutate({
                    transactionIds: selectedTransactions,
                    categoryId: e.target.value
                  })
                  e.target.value = ''
                }
              }}
              className="px-4 py-2 bg-blue-gray-600/20 backdrop-blur-sm border border-blue-gray-500/30 rounded-lg text-blue-gray-200 focus:outline-none focus:ring-2 focus:ring-golden-400/50"
            >
              <option value="">Categorize {selectedTransactions.length} selected</option>
              {categories.map(category => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
          )}
          <button
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
            className="px-4 py-2 bg-blue-gray-600/20 backdrop-blur-sm border border-blue-gray-500/30 rounded-lg text-blue-gray-200 hover:bg-blue-gray-600/30 transition-all duration-200 flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
            Sync
          </button>
          <button
            onClick={exportTransactions}
            className="px-4 py-2 bg-blue-gray-600/20 backdrop-blur-sm border border-blue-gray-500/30 rounded-lg text-blue-gray-200 hover:bg-blue-gray-600/30 transition-all duration-200 flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="bg-blue-gray-800/20 backdrop-blur-sm border border-blue-gray-700/30 rounded-xl p-4 mb-6">
        <div className="flex gap-4 items-center mb-4">
          <div className="flex-1 relative">
            <Search className="w-5 h-5 text-blue-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search transactions..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-blue-gray-700/30 border border-blue-gray-600/50 rounded-lg text-white placeholder-blue-gray-400 focus:outline-none focus:ring-2 focus:ring-golden-400/50"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-2 backdrop-blur-sm border rounded-lg transition-all duration-200 flex items-center gap-2 ${
              showFilters
                ? 'bg-golden-500/20 border-golden-400/30 text-golden-200'
                : 'bg-blue-gray-600/20 border-blue-gray-500/30 text-blue-gray-200 hover:bg-blue-gray-600/30'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filters
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-blue-gray-700/30">
            <div>
              <label className="block text-blue-gray-300 text-sm font-medium mb-2">Bank Account</label>
              <select
                value={filters.bankAccountId}
                onChange={(e) => handleFilterChange('bankAccountId', e.target.value)}
                className="w-full px-3 py-2 bg-blue-gray-700/30 border border-blue-gray-600/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-golden-400/50"
              >
                <option value="">All Accounts</option>
                {bankAccounts.map(account => (
                  <option key={account.id} value={account.id}>
                    {account.institutionName} - {account.accountName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-blue-gray-300 text-sm font-medium mb-2">Category</label>
              <select
                value={filters.categoryId}
                onChange={(e) => handleFilterChange('categoryId', e.target.value)}
                className="w-full px-3 py-2 bg-blue-gray-700/30 border border-blue-gray-600/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-golden-400/50"
              >
                <option value="">All Categories</option>
                {categories.map(category => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-blue-gray-300 text-sm font-medium mb-2">Date Range</label>
              <select
                value={filters.dateRange}
                onChange={(e) => handleFilterChange('dateRange', e.target.value)}
                className="w-full px-3 py-2 bg-blue-gray-700/30 border border-blue-gray-600/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-golden-400/50"
              >
                <option value="all">All Time</option>
                <option value="last7">Last 7 days</option>
                <option value="last30">Last 30 days</option>
                <option value="last90">Last 90 days</option>
                <option value="thisMonth">This Month</option>
                <option value="lastMonth">Last Month</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>

            <div>
              <label className="block text-blue-gray-300 text-sm font-medium mb-2">Status</label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full px-3 py-2 bg-blue-gray-700/30 border border-blue-gray-600/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-golden-400/50"
              >
                <option value="all">All</option>
                <option value="cleared">Cleared</option>
                <option value="pending">Pending</option>
              </select>
            </div>

            {filters.dateRange === 'custom' && (
              <>
                <div>
                  <label className="block text-blue-gray-300 text-sm font-medium mb-2">Start Date</label>
                  <input
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => handleFilterChange('startDate', e.target.value)}
                    className="w-full px-3 py-2 bg-blue-gray-700/30 border border-blue-gray-600/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-golden-400/50"
                  />
                </div>
                <div>
                  <label className="block text-blue-gray-300 text-sm font-medium mb-2">End Date</label>
                  <input
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => handleFilterChange('endDate', e.target.value)}
                    className="w-full px-3 py-2 bg-blue-gray-700/30 border border-blue-gray-600/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-golden-400/50"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-blue-gray-300 text-sm font-medium mb-2">Min Amount</label>
              <div className="relative">
                <DollarSign className="w-4 h-4 text-blue-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input
                  type="number"
                  placeholder="0.00"
                  value={filters.amountMin}
                  onChange={(e) => handleFilterChange('amountMin', e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-blue-gray-700/30 border border-blue-gray-600/50 rounded-lg text-white placeholder-blue-gray-400 focus:outline-none focus:ring-2 focus:ring-golden-400/50"
                />
              </div>
            </div>

            <div>
              <label className="block text-blue-gray-300 text-sm font-medium mb-2">Max Amount</label>
              <div className="relative">
                <DollarSign className="w-4 h-4 text-blue-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input
                  type="number"
                  placeholder="0.00"
                  value={filters.amountMax}
                  onChange={(e) => handleFilterChange('amountMax', e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-blue-gray-700/30 border border-blue-gray-600/50 rounded-lg text-white placeholder-blue-gray-400 focus:outline-none focus:ring-2 focus:ring-golden-400/50"
                />
              </div>
            </div>

            <div className="flex items-center pt-6">
              <input
                type="checkbox"
                id="uncategorized"
                checked={filters.uncategorized}
                onChange={(e) => handleFilterChange('uncategorized', e.target.checked)}
                className="w-4 h-4 rounded border-blue-gray-500/50 bg-blue-gray-800/50 text-golden-400 focus:ring-golden-400/50"
              />
              <label htmlFor="uncategorized" className="ml-2 text-blue-gray-300 text-sm">
                Uncategorized only
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Transactions Table */}
      <div className="bg-blue-gray-800/20 backdrop-blur-sm border border-blue-gray-700/30 rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <RefreshCw className="w-8 h-8 text-blue-gray-400 animate-spin mx-auto mb-4" />
            <p className="text-blue-gray-300">Loading transactions...</p>
          </div>
        ) : transactions.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-blue-gray-600/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl text-blue-gray-300">💳</span>
            </div>
            <h3 className="text-lg font-medium text-white mb-2">No transactions found</h3>
            <p className="text-blue-gray-300 mb-4">Try adjusting your filters or sync your accounts</p>
            <button
              onClick={() => syncMutation.mutate()}
              disabled={syncMutation.isPending}
              className="px-4 py-2 bg-golden-500/20 backdrop-blur-sm border border-golden-400/30 rounded-lg text-golden-200 hover:bg-golden-500/30 transition-all duration-200"
            >
              Sync Accounts
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
                <div className="flex-1 grid grid-cols-5 gap-4 items-center">
                  <button
                    onClick={() => handleSort('date')}
                    className="text-left text-blue-gray-300 hover:text-white font-medium flex items-center gap-1"
                  >
                    Date {getSortIcon('date')}
                  </button>
                  <button
                    onClick={() => handleSort('description')}
                    className="text-left text-blue-gray-300 hover:text-white font-medium flex items-center gap-1"
                  >
                    Description {getSortIcon('description')}
                  </button>
                  <span className="text-blue-gray-300 font-medium">Category</span>
                  <span className="text-blue-gray-300 font-medium">Account</span>
                  <button
                    onClick={() => handleSort('amount')}
                    className="text-right text-blue-gray-300 hover:text-white font-medium flex items-center justify-end gap-1"
                  >
                    Amount {getSortIcon('amount')}
                  </button>
                </div>
              </div>
            </div>

            {/* Transaction Rows */}
            <div className="divide-y divide-blue-gray-700/30 max-h-96 overflow-y-auto">
              {transactions.map((transaction: Transaction) => (
                <div key={transaction.id} className="p-4 hover:bg-blue-gray-700/20 transition-colors duration-150">
                  <div className="flex items-center gap-4">
                    <input
                      type="checkbox"
                      checked={selectedTransactions.includes(transaction.id)}
                      onChange={() => handleTransactionSelect(transaction.id)}
                      className="w-4 h-4 rounded border-blue-gray-500/50 bg-blue-gray-800/50 text-golden-400 focus:ring-golden-400/50"
                    />
                    <div className="flex-1 grid grid-cols-5 gap-4 items-center">
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
                        {transaction.categoryName ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-sage-800/30 text-sage-300 border border-sage-700/50">
                            <Tag className="w-3 h-3 mr-1" />
                            {transaction.categoryName}
                          </span>
                        ) : (
                          <span className="text-blue-gray-400 text-xs">Uncategorized</span>
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
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="p-4 border-t border-blue-gray-700/30 flex items-center justify-between">
                <p className="text-blue-gray-300 text-sm">
                  Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, total)} of {total.toLocaleString()} transactions
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1}
                    className="px-3 py-1 bg-blue-gray-600/20 border border-blue-gray-500/30 rounded text-blue-gray-200 hover:bg-blue-gray-600/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    Previous
                  </button>
                  <span className="px-3 py-1 text-blue-gray-300">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    onClick={() => setPage(page + 1)}
                    disabled={page === totalPages}
                    className="px-3 py-1 bg-blue-gray-600/20 border border-blue-gray-500/30 rounded text-blue-gray-200 hover:bg-blue-gray-600/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default function TransactionsPage() {
  return (
    <Suspense fallback={
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex justify-center items-center min-h-96">
          <RefreshCw className="w-8 h-8 text-blue-gray-400 animate-spin" />
        </div>
      </div>
    }>
      <TransactionsPageContent />
    </Suspense>
  )
}