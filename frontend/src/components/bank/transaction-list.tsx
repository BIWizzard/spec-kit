'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'

interface Transaction {
  id: string
  bankAccountId: string
  bankAccountName: string
  plaidTransactionId: string
  amount: number
  date: string
  description: string
  merchantName?: string
  pending: boolean
  spendingCategoryId?: string
  categoryName?: string
  categoryIcon?: string
  categoryColor?: string
  categoryConfidence?: number
  userCategorized: boolean
  plaidCategory?: string
  accountOwner?: string
  notes?: string
}

interface TransactionListProps {
  transactions?: Transaction[]
  loading?: boolean
  compact?: boolean
  showBulkActions?: boolean
  showExport?: boolean
  onBulkAction?: (action: string, transactionIds: string[]) => void
  onExport?: () => void
  className?: string
}

const categoryIcons: Record<string, string> = {
  'Food and Drink': '🍽️',
  'Shops': '🛍️',
  'Transportation': '🚗',
  'Healthcare': '🏥',
  'Entertainment': '🎭',
  'Travel': '✈️',
  'Home': '🏠',
  'Bills': '📄',
  'Subscription': '📱',
  'Investment': '📈',
  'Transfer': '↔️',
  'Other': '💳'
}

const getTransactionIcon = (category?: string, merchantName?: string): string => {
  if (category && categoryIcons[category]) {
    return categoryIcons[category]
  }

  if (merchantName) {
    const merchant = merchantName.toLowerCase()
    if (merchant.includes('grocery') || merchant.includes('food')) return '🍽️'
    if (merchant.includes('gas') || merchant.includes('fuel')) return '⛽'
    if (merchant.includes('coffee') || merchant.includes('starbucks')) return '☕'
    if (merchant.includes('amazon') || merchant.includes('walmart')) return '🛍️'
    if (merchant.includes('netflix') || merchant.includes('spotify')) return '📱'
    if (merchant.includes('bank') || merchant.includes('transfer')) return '🏦'
  }

  return '💳'
}

export default function TransactionList({
  transactions = [],
  loading = false,
  compact = false,
  showBulkActions = true,
  showExport = true,
  onBulkAction,
  onExport,
  className = ''
}: TransactionListProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [dateRange, setDateRange] = useState({ start: '', end: '' })
  const [amountRange, setAmountRange] = useState({ min: '', max: '' })
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [accountFilter, setAccountFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'cleared'>('all')
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'description' | 'merchant'>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [viewMode, setViewMode] = useState<'compact' | 'expanded'>('compact')
  const [selectedTransactions, setSelectedTransactions] = useState<Set<string>>(new Set())
  const [showFilters, setShowFilters] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 50

  // Mock data for demonstration
  const mockTransactions: Transaction[] = [
    {
      id: '1',
      bankAccountId: 'acc1',
      bankAccountName: 'Chase Checking (...4567)',
      plaidTransactionId: 'plaid1',
      amount: -85.32,
      date: '2024-12-10',
      description: 'Whole Foods Market',
      merchantName: 'Whole Foods Market',
      pending: false,
      spendingCategoryId: 'cat1',
      categoryName: 'Food and Drink',
      categoryIcon: '🍽️',
      categoryColor: '#10B981',
      categoryConfidence: 0.95,
      userCategorized: false,
      plaidCategory: 'Shops, Supermarkets and Groceries',
      notes: 'Weekly grocery shopping'
    },
    {
      id: '2',
      bankAccountId: 'acc1',
      bankAccountName: 'Chase Checking (...4567)',
      plaidTransactionId: 'plaid2',
      amount: -45.00,
      date: '2024-12-09',
      description: 'Shell Gas Station',
      merchantName: 'Shell',
      pending: true,
      spendingCategoryId: 'cat2',
      categoryName: 'Transportation',
      categoryIcon: '⛽',
      categoryColor: '#F59E0B',
      categoryConfidence: 0.88,
      userCategorized: false,
      plaidCategory: 'Transportation, Gas Stations'
    },
    {
      id: '3',
      bankAccountId: 'acc2',
      bankAccountName: 'Wells Fargo Savings (...8901)',
      plaidTransactionId: 'plaid3',
      amount: 2500.00,
      date: '2024-12-08',
      description: 'Direct Deposit - ABC CORP',
      merchantName: 'ABC CORP',
      pending: false,
      spendingCategoryId: 'cat3',
      categoryName: 'Transfer',
      categoryIcon: '💰',
      categoryColor: '#10B981',
      categoryConfidence: 1.00,
      userCategorized: false,
      plaidCategory: 'Deposit'
    },
    {
      id: '4',
      bankAccountId: 'acc1',
      bankAccountName: 'Chase Checking (...4567)',
      plaidTransactionId: 'plaid4',
      amount: -15.99,
      date: '2024-12-07',
      description: 'Netflix Subscription',
      merchantName: 'Netflix',
      pending: false,
      spendingCategoryId: 'cat4',
      categoryName: 'Subscription',
      categoryIcon: '📱',
      categoryColor: '#8B5CF6',
      categoryConfidence: 0.98,
      userCategorized: true,
      plaidCategory: 'Recreation, Subscription Services'
    },
    {
      id: '5',
      bankAccountId: 'acc1',
      bankAccountName: 'Chase Checking (...4567)',
      plaidTransactionId: 'plaid5',
      amount: -125.50,
      date: '2024-12-06',
      description: 'Amazon Purchase',
      merchantName: 'Amazon',
      pending: false,
      categoryName: 'Shops',
      categoryIcon: '🛍️',
      categoryColor: '#EF4444',
      categoryConfidence: 0.75,
      userCategorized: false,
      plaidCategory: 'Shops, General Merchandise',
      notes: 'Office supplies and electronics'
    }
  ]

  const displayTransactions = transactions.length > 0 ? transactions : mockTransactions

  // Filter and sort transactions
  const filteredAndSortedTransactions = useMemo(() => {
    let filtered = displayTransactions.filter(transaction => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchesSearch =
          transaction.description.toLowerCase().includes(query) ||
          transaction.merchantName?.toLowerCase().includes(query) ||
          transaction.categoryName?.toLowerCase().includes(query) ||
          transaction.notes?.toLowerCase().includes(query)
        if (!matchesSearch) return false
      }

      // Date range filter
      if (dateRange.start && new Date(transaction.date) < new Date(dateRange.start)) return false
      if (dateRange.end && new Date(transaction.date) > new Date(dateRange.end)) return false

      // Amount range filter
      const amount = Math.abs(transaction.amount)
      if (amountRange.min && amount < parseFloat(amountRange.min)) return false
      if (amountRange.max && amount > parseFloat(amountRange.max)) return false

      // Category filter
      if (categoryFilter !== 'all' && transaction.categoryName !== categoryFilter) return false

      // Account filter
      if (accountFilter !== 'all' && transaction.bankAccountId !== accountFilter) return false

      // Status filter
      if (statusFilter === 'pending' && !transaction.pending) return false
      if (statusFilter === 'cleared' && transaction.pending) return false

      return true
    })

    // Sort transactions
    filtered.sort((a, b) => {
      let aValue: any, bValue: any

      switch (sortBy) {
        case 'date':
          aValue = new Date(a.date).getTime()
          bValue = new Date(b.date).getTime()
          break
        case 'amount':
          aValue = Math.abs(a.amount)
          bValue = Math.abs(b.amount)
          break
        case 'description':
          aValue = a.description.toLowerCase()
          bValue = b.description.toLowerCase()
          break
        case 'merchant':
          aValue = (a.merchantName || '').toLowerCase()
          bValue = (b.merchantName || '').toLowerCase()
          break
        default:
          return 0
      }

      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0
      }
    })

    return filtered
  }, [displayTransactions, searchQuery, dateRange, amountRange, categoryFilter, accountFilter, statusFilter, sortBy, sortOrder])

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedTransactions.length / itemsPerPage)
  const paginatedTransactions = filteredAndSortedTransactions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  // Summary calculations
  const totalIncome = filteredAndSortedTransactions
    .filter(t => t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0)

  const totalExpenses = filteredAndSortedTransactions
    .filter(t => t.amount < 0)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0)

  const pendingCount = filteredAndSortedTransactions.filter(t => t.pending).length

  // Get unique categories and accounts for filters
  const uniqueCategories = Array.from(new Set(displayTransactions.map(t => t.categoryName).filter(Boolean)))
  const uniqueAccounts = Array.from(new Set(displayTransactions.map(t => ({ id: t.bankAccountId, name: t.bankAccountName }))))

  const handleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder(field === 'date' ? 'desc' : 'asc')
    }
  }

  const handleSelectAll = () => {
    if (selectedTransactions.size === paginatedTransactions.length) {
      setSelectedTransactions(new Set())
    } else {
      setSelectedTransactions(new Set(paginatedTransactions.map(t => t.id)))
    }
  }

  const handleSelectTransaction = (transactionId: string) => {
    const newSelected = new Set(selectedTransactions)
    if (newSelected.has(transactionId)) {
      newSelected.delete(transactionId)
    } else {
      newSelected.add(transactionId)
    }
    setSelectedTransactions(newSelected)
  }

  const getSortIcon = (field: typeof sortBy) => {
    if (sortBy === field) {
      return sortOrder === 'asc' ? '↑' : '↓'
    }
    return '↕️'
  }

  if (loading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="glass-card p-6 border-glass-border/50">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-glass-bg-light rounded w-1/3"></div>
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-16 bg-glass-bg-light rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Summary Stats */}
      {!compact && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="glass-card p-4 border-kgiq-primary/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-success/20 flex items-center justify-center">
                <span className="text-success text-lg">📈</span>
              </div>
              <div>
                <p className="text-sm text-muted">Total Income</p>
                <p className="text-xl font-bold text-success">${totalIncome.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="glass-card p-4 border-error/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-error/20 flex items-center justify-center">
                <span className="text-error text-lg">📉</span>
              </div>
              <div>
                <p className="text-sm text-muted">Total Expenses</p>
                <p className="text-xl font-bold text-error">${totalExpenses.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="glass-card p-4 border-warning/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-warning/20 flex items-center justify-center">
                <span className="text-warning text-lg">⏳</span>
              </div>
              <div>
                <p className="text-sm text-muted">Pending</p>
                <p className="text-xl font-bold text-warning">{pendingCount}</p>
              </div>
            </div>
          </div>

          <div className="glass-card p-4 border-accent/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
                <span className="text-accent text-lg">💳</span>
              </div>
              <div>
                <p className="text-sm text-muted">Total Transactions</p>
                <p className="text-xl font-bold text-accent">{filteredAndSortedTransactions.length}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search and Controls */}
      <div className="glass-card p-4 border-glass-border/50">
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-muted">🔍</span>
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search transactions, merchants, categories..."
                className="block w-full pl-10 pr-4 py-2 bg-glass-bg border border-glass-border/50 rounded-lg text-sm placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-kgiq-primary/50"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                showFilters
                  ? 'bg-kgiq-primary text-white'
                  : 'bg-glass-bg border border-glass-border/50 text-muted hover:text-primary'
              }`}
            >
              🎛️ Filters
            </button>
            {showExport && (
              <button
                onClick={onExport}
                className="px-4 py-2 bg-glass-bg border border-glass-border/50 rounded-lg text-sm text-muted hover:text-primary transition-colors"
              >
                📤 Export
              </button>
            )}
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 p-4 bg-glass-bg/50 rounded-lg border border-glass-border/30">
              <div>
                <label className="block text-sm font-medium text-muted mb-1">Date From</label>
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                  className="w-full px-3 py-2 bg-glass-bg border border-glass-border/50 rounded text-sm focus:outline-none focus:ring-2 focus:ring-kgiq-primary/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted mb-1">Date To</label>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                  className="w-full px-3 py-2 bg-glass-bg border border-glass-border/50 rounded text-sm focus:outline-none focus:ring-2 focus:ring-kgiq-primary/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted mb-1">Min Amount</label>
                <input
                  type="number"
                  value={amountRange.min}
                  onChange={(e) => setAmountRange({ ...amountRange, min: e.target.value })}
                  placeholder="0.00"
                  className="w-full px-3 py-2 bg-glass-bg border border-glass-border/50 rounded text-sm focus:outline-none focus:ring-2 focus:ring-kgiq-primary/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted mb-1">Max Amount</label>
                <input
                  type="number"
                  value={amountRange.max}
                  onChange={(e) => setAmountRange({ ...amountRange, max: e.target.value })}
                  placeholder="1000.00"
                  className="w-full px-3 py-2 bg-glass-bg border border-glass-border/50 rounded text-sm focus:outline-none focus:ring-2 focus:ring-kgiq-primary/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted mb-1">Category</label>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-glass-bg border border-glass-border/50 rounded text-sm focus:outline-none focus:ring-2 focus:ring-kgiq-primary/50"
                >
                  <option value="all">All Categories</option>
                  {uniqueCategories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-muted mb-1">Account</label>
                <select
                  value={accountFilter}
                  onChange={(e) => setAccountFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-glass-bg border border-glass-border/50 rounded text-sm focus:outline-none focus:ring-2 focus:ring-kgiq-primary/50"
                >
                  <option value="all">All Accounts</option>
                  {uniqueAccounts.map(account => (
                    <option key={account.id} value={account.id}>{account.name}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Controls Row */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-muted">Status:</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="px-3 py-1.5 bg-glass-bg border border-glass-border/50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-kgiq-primary/50"
                >
                  <option value="all">All</option>
                  <option value="pending">Pending</option>
                  <option value="cleared">Cleared</option>
                </select>
              </div>

              {showBulkActions && selectedTransactions.size > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted">{selectedTransactions.size} selected</span>
                  <button
                    onClick={() => onBulkAction?.('categorize', Array.from(selectedTransactions))}
                    className="px-3 py-1.5 bg-kgiq-secondary text-white rounded text-sm hover:bg-kgiq-secondary/90"
                  >
                    📂 Categorize
                  </button>
                  <button
                    onClick={() => onBulkAction?.('export', Array.from(selectedTransactions))}
                    className="px-3 py-1.5 bg-accent text-white rounded text-sm hover:bg-accent/90"
                  >
                    📤 Export
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-muted">Sort:</label>
                <select
                  value={`${sortBy}-${sortOrder}`}
                  onChange={(e) => {
                    const [field, order] = e.target.value.split('-')
                    setSortBy(field as typeof sortBy)
                    setSortOrder(order as typeof sortOrder)
                  }}
                  className="px-3 py-1.5 bg-glass-bg border border-glass-border/50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-kgiq-primary/50"
                >
                  <option value="date-desc">Date (Newest)</option>
                  <option value="date-asc">Date (Oldest)</option>
                  <option value="amount-desc">Amount (Largest)</option>
                  <option value="amount-asc">Amount (Smallest)</option>
                  <option value="description-asc">Description (A-Z)</option>
                  <option value="merchant-asc">Merchant (A-Z)</option>
                </select>
              </div>

              <div className="flex items-center border border-glass-border/50 rounded-lg overflow-hidden">
                <button
                  onClick={() => setViewMode('compact')}
                  className={`px-3 py-1.5 text-sm transition-colors ${
                    viewMode === 'compact' ? 'bg-kgiq-primary text-white' : 'text-muted hover:text-primary'
                  }`}
                >
                  📋 Compact
                </button>
                <button
                  onClick={() => setViewMode('expanded')}
                  className={`px-3 py-1.5 text-sm transition-colors ${
                    viewMode === 'expanded' ? 'bg-kgiq-primary text-white' : 'text-muted hover:text-primary'
                  }`}
                >
                  📄 Expanded
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Transaction List */}
      {viewMode === 'compact' || compact ? (
        <div className="glass-card border-glass-border/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-glass-border/30">
                  {showBulkActions && (
                    <th className="text-left p-4 w-12">
                      <input
                        type="checkbox"
                        checked={selectedTransactions.size === paginatedTransactions.length && paginatedTransactions.length > 0}
                        onChange={handleSelectAll}
                        className="rounded border-glass-border/50"
                      />
                    </th>
                  )}
                  <th className="text-left p-4 text-sm font-medium text-muted">
                    <button onClick={() => handleSort('date')} className="flex items-center gap-1 hover:text-primary">
                      Date {getSortIcon('date')}
                    </button>
                  </th>
                  <th className="text-left p-4 text-sm font-medium text-muted">
                    <button onClick={() => handleSort('description')} className="flex items-center gap-1 hover:text-primary">
                      Description {getSortIcon('description')}
                    </button>
                  </th>
                  <th className="text-left p-4 text-sm font-medium text-muted">
                    <button onClick={() => handleSort('merchant')} className="flex items-center gap-1 hover:text-primary">
                      Merchant {getSortIcon('merchant')}
                    </button>
                  </th>
                  <th className="text-left p-4 text-sm font-medium text-muted">Category</th>
                  <th className="text-left p-4 text-sm font-medium text-muted">Account</th>
                  <th className="text-right p-4 text-sm font-medium text-muted">
                    <button onClick={() => handleSort('amount')} className="flex items-center gap-1 hover:text-primary">
                      Amount {getSortIcon('amount')}
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedTransactions.map((transaction) => (
                  <tr
                    key={transaction.id}
                    className={`border-b border-glass-border/20 hover:bg-glass-bg-light/50 transition-colors ${
                      transaction.pending ? 'bg-warning/5' : ''
                    }`}
                  >
                    {showBulkActions && (
                      <td className="p-4">
                        <input
                          type="checkbox"
                          checked={selectedTransactions.has(transaction.id)}
                          onChange={() => handleSelectTransaction(transaction.id)}
                          className="rounded border-glass-border/50"
                        />
                      </td>
                    )}
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="text-primary">
                          {new Date(transaction.date).toLocaleDateString()}
                        </span>
                        {transaction.pending && (
                          <span className="text-xs text-warning">Pending</span>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">
                          {getTransactionIcon(transaction.categoryName, transaction.merchantName)}
                        </span>
                        <span className="text-primary font-medium">{transaction.description}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="text-primary">{transaction.merchantName || '-'}</span>
                    </td>
                    <td className="p-4">
                      {transaction.categoryName ? (
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{transaction.categoryIcon}</span>
                          <span className="text-sm text-primary">{transaction.categoryName}</span>
                          {!transaction.userCategorized && transaction.categoryConfidence && transaction.categoryConfidence < 0.9 && (
                            <span className="text-xs text-warning">❓</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-muted italic">Uncategorized</span>
                      )}
                    </td>
                    <td className="p-4">
                      <span className="text-sm text-muted">{transaction.bankAccountName}</span>
                    </td>
                    <td className="p-4 text-right">
                      <span className={`font-semibold ${
                        transaction.amount > 0 ? 'text-success' : 'text-error'
                      }`}>
                        {transaction.amount > 0 ? '+' : ''}${Math.abs(transaction.amount).toLocaleString()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {paginatedTransactions.map((transaction) => (
            <div
              key={transaction.id}
              className={`glass-card p-6 border-glass-border/50 hover:border-kgiq-primary/30 transition-colors ${
                transaction.pending ? 'border-warning/30 bg-warning/5' : ''
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4 flex-1">
                  {showBulkActions && (
                    <input
                      type="checkbox"
                      checked={selectedTransactions.has(transaction.id)}
                      onChange={() => handleSelectTransaction(transaction.id)}
                      className="rounded border-glass-border/50 mt-1"
                    />
                  )}
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-glass-bg-light flex items-center justify-center">
                      <span className="text-xl">
                        {getTransactionIcon(transaction.categoryName, transaction.merchantName)}
                      </span>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-primary">{transaction.description}</h3>
                      <p className="text-sm text-muted">{transaction.merchantName || 'Unknown Merchant'}</p>
                      <div className="flex items-center gap-4 mt-2">
                        <span className="text-sm text-muted">
                          {new Date(transaction.date).toLocaleDateString()}
                        </span>
                        <span className="text-sm text-muted">
                          {transaction.bankAccountName}
                        </span>
                        {transaction.pending && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-warning/20 text-warning text-xs rounded-full">
                            ⏳ Pending
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className={`text-xl font-bold ${
                    transaction.amount > 0 ? 'text-success' : 'text-error'
                  }`}>
                    {transaction.amount > 0 ? '+' : ''}${Math.abs(transaction.amount).toLocaleString()}
                  </div>
                  {transaction.categoryName && (
                    <div className="flex items-center justify-end gap-2 mt-1">
                      <span className="text-sm">{transaction.categoryIcon}</span>
                      <span className="text-sm text-primary">{transaction.categoryName}</span>
                      {!transaction.userCategorized && transaction.categoryConfidence && transaction.categoryConfidence < 0.9 && (
                        <span className="text-xs text-warning" title="Auto-categorized with low confidence">
                          ❓
                        </span>
                      )}
                    </div>
                  )}
                  {!transaction.categoryName && (
                    <div className="text-sm text-muted italic mt-1">
                      Uncategorized
                    </div>
                  )}
                </div>
              </div>

              {transaction.notes && (
                <div className="mt-4 pt-4 border-t border-glass-border/30">
                  <p className="text-sm text-muted">📝 {transaction.notes}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="glass-card p-4 border-glass-border/50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted">
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredAndSortedTransactions.length)} of {filteredAndSortedTransactions.length} transactions
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-3 py-2 bg-glass-bg border border-glass-border/50 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-glass-bg-light"
              >
                ← Previous
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const page = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i
                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
                        currentPage === page
                          ? 'bg-kgiq-primary text-white'
                          : 'bg-glass-bg border border-glass-border/50 text-muted hover:text-primary'
                      }`}
                    >
                      {page}
                    </button>
                  )
                })}
              </div>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-2 bg-glass-bg border border-glass-border/50 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-glass-bg-light"
              >
                Next →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {filteredAndSortedTransactions.length === 0 && (
        <div className="glass-card p-12 border-glass-border/50 text-center">
          <div className="w-16 h-16 rounded-lg bg-muted/20 flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">💳</span>
          </div>
          <h3 className="text-lg font-semibold text-primary mb-2">No Transactions Found</h3>
          <p className="text-muted mb-4">
            {searchQuery || dateRange.start || dateRange.end || categoryFilter !== 'all' || accountFilter !== 'all' || statusFilter !== 'all'
              ? 'No transactions match your current filters.'
              : 'No transactions have been imported yet.'}
          </p>
          {(searchQuery || dateRange.start || dateRange.end || categoryFilter !== 'all' || accountFilter !== 'all' || statusFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchQuery('')
                setDateRange({ start: '', end: '' })
                setAmountRange({ min: '', max: '' })
                setCategoryFilter('all')
                setAccountFilter('all')
                setStatusFilter('all')
              }}
              className="inline-flex items-center gap-2 px-6 py-3 bg-kgiq-primary hover:bg-kgiq-primary/90 text-white font-medium rounded-lg transition-colors"
            >
              🔄 Clear Filters
            </button>
          )}
        </div>
      )}
    </div>
  )
}