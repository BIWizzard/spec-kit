'use client'

import { useState, useMemo, useEffect } from 'react'
import { Search, RefreshCw, CheckCircle, AlertTriangle, X, ArrowRight, Check, Zap, Target, Calendar, DollarSign, Building2, CreditCard } from 'lucide-react'
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

interface Payment {
  id: string
  payee: string
  description: string
  amount: number
  paidAmount?: number
  dueDate: string
  paidDate?: string
  status: 'scheduled' | 'paid' | 'overdue' | 'partial' | 'cancelled'
  isRecurring: boolean
  frequency?: 'weekly' | 'bi-weekly' | 'monthly' | 'quarterly' | 'annually'
  category: 'housing' | 'utilities' | 'insurance' | 'transportation' | 'healthcare' | 'subscriptions' | 'food' | 'other'
  paymentMethod?: string
  attributionCount: number
  attributedAmount: number
  priority: 'low' | 'medium' | 'high' | 'critical'
  notes?: string
}

interface SuggestedMatch {
  transactionId: string
  paymentId: string
  confidence: number
  matchReasons: string[]
  amountDifference: number
  dateDifference: number
}

interface ConfirmedMatch {
  transactionId: string
  paymentId: string
  matchedAmount: number
  notes?: string
}

interface PaymentMatchingProps {
  onMatchConfirmed?: (matches: ConfirmedMatch[]) => void
  filterBankAccountId?: string
  dateRange?: number // days
}

export default function PaymentMatching({
  onMatchConfirmed,
  filterBankAccountId,
  dateRange = 30
}: PaymentMatchingProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedMatches, setSelectedMatches] = useState<Map<string, ConfirmedMatch>>(new Map())
  const [manualMatches, setManualMatches] = useState<Map<string, string>>(new Map()) // transactionId -> paymentId
  const [showConfidenceFilter, setShowConfidenceFilter] = useState(false)
  const [minConfidence, setMinConfidence] = useState(70)
  const [reviewMode, setReviewMode] = useState(false)
  const queryClient = useQueryClient()

  // Fetch unmatched transactions
  const { data: transactions = [], isLoading: loadingTransactions } = useQuery<Transaction[]>({
    queryKey: ['unmatchedTransactions', filterBankAccountId, dateRange],
    queryFn: async () => {
      const params = new URLSearchParams()
      params.set('unmatched', 'true')
      params.set('limit', '100')

      if (filterBankAccountId) {
        params.set('bankAccountId', filterBankAccountId)
      }

      if (dateRange) {
        const startDate = new Date()
        startDate.setDate(startDate.getDate() - dateRange)
        params.set('startDate', startDate.toISOString().split('T')[0])
      }

      const response = await fetch(`/api/transactions?${params.toString()}`)
      if (!response.ok) throw new Error('Failed to fetch transactions')
      return response.json()
    }
  })

  // Fetch scheduled payments
  const { data: payments = [], isLoading: loadingPayments } = useQuery<Payment[]>({
    queryKey: ['scheduledPayments', dateRange],
    queryFn: async () => {
      const params = new URLSearchParams()
      params.set('status', 'scheduled,overdue')
      params.set('limit', '100')

      if (dateRange) {
        const endDate = new Date()
        endDate.setDate(endDate.getDate() + dateRange)
        params.set('dueDateEnd', endDate.toISOString().split('T')[0])
      }

      const response = await fetch(`/api/payments?${params.toString()}`)
      if (!response.ok) throw new Error('Failed to fetch payments')
      return response.json()
    }
  })

  // Generate smart matching suggestions
  const suggestedMatches = useMemo(() => {
    if (!transactions.length || !payments.length) return []

    const matches: SuggestedMatch[] = []

    transactions.forEach(transaction => {
      payments.forEach(payment => {
        const matchReasons: string[] = []
        let confidence = 0

        // Amount matching (40% weight)
        const amountDifference = Math.abs(Math.abs(transaction.amount) - payment.amount)
        const amountThreshold = Math.max(payment.amount * 0.05, 5) // 5% or $5 minimum

        if (amountDifference <= amountThreshold) {
          confidence += amountDifference === 0 ? 40 : 35
          matchReasons.push(amountDifference === 0 ? 'Exact amount match' : 'Close amount match')
        } else if (amountDifference <= payment.amount * 0.1) {
          confidence += 20
          matchReasons.push('Approximate amount match')
        }

        // Date matching (30% weight)
        const transactionDate = new Date(transaction.date)
        const paymentDate = new Date(payment.dueDate)
        const dateDifference = Math.abs(transactionDate.getTime() - paymentDate.getTime()) / (1000 * 60 * 60 * 24)

        if (dateDifference <= 1) {
          confidence += 30
          matchReasons.push('Same day')
        } else if (dateDifference <= 3) {
          confidence += 25
          matchReasons.push('Within 3 days')
        } else if (dateDifference <= 7) {
          confidence += 15
          matchReasons.push('Within a week')
        }

        // Merchant/Description matching (20% weight)
        const transactionText = `${transaction.merchantName || ''} ${transaction.description}`.toLowerCase()
        const paymentText = `${payment.payee} ${payment.description}`.toLowerCase()

        // Exact payee match
        if (transactionText.includes(payment.payee.toLowerCase())) {
          confidence += 20
          matchReasons.push('Payee name match')
        } else {
          // Fuzzy matching for common words
          const paymentWords = paymentText.split(' ').filter(word => word.length > 3)
          const transactionWords = transactionText.split(' ')

          const matchingWords = paymentWords.filter(word =>
            transactionWords.some(tWord => tWord.includes(word) || word.includes(tWord))
          )

          if (matchingWords.length > 0) {
            confidence += Math.min(15, matchingWords.length * 5)
            matchReasons.push(`Similar description (${matchingWords.length} keywords)`)
          }
        }

        // Recurring pattern bonus (10% weight)
        if (payment.isRecurring) {
          confidence += 10
          matchReasons.push('Recurring payment pattern')
        }

        // Only include matches above minimum threshold
        if (confidence >= 30) {
          matches.push({
            transactionId: transaction.id,
            paymentId: payment.id,
            confidence: Math.min(100, confidence),
            matchReasons,
            amountDifference,
            dateDifference
          })
        }
      })
    })

    // Sort by confidence descending
    return matches.sort((a, b) => b.confidence - a.confidence)
  }, [transactions, payments])

  // Filter matches by search term and confidence
  const filteredMatches = useMemo(() => {
    let filtered = suggestedMatches

    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(match => {
        const transaction = transactions.find(t => t.id === match.transactionId)
        const payment = payments.find(p => p.id === match.paymentId)

        return (transaction?.description.toLowerCase().includes(term) ||
                transaction?.merchantName?.toLowerCase().includes(term) ||
                payment?.payee.toLowerCase().includes(term) ||
                payment?.description.toLowerCase().includes(term))
      })
    }

    if (showConfidenceFilter) {
      filtered = filtered.filter(match => match.confidence >= minConfidence)
    }

    return filtered
  }, [suggestedMatches, searchTerm, showConfidenceFilter, minConfidence, transactions, payments])

  const confirmMatchesMutation = useMutation({
    mutationFn: async (matches: ConfirmedMatch[]) => {
      const response = await fetch('/api/payments/match-transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matches })
      })
      if (!response.ok) throw new Error('Failed to confirm matches')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unmatchedTransactions'] })
      queryClient.invalidateQueries({ queryKey: ['scheduledPayments'] })
      queryClient.invalidateQueries({ queryKey: ['payments'] })
      setSelectedMatches(new Map())
      setManualMatches(new Map())
      if (onMatchConfirmed) {
        onMatchConfirmed(Array.from(selectedMatches.values()))
      }
    }
  })

  const handleMatchSelect = (match: SuggestedMatch) => {
    const transaction = transactions.find(t => t.id === match.transactionId)!
    const payment = payments.find(p => p.id === match.paymentId)!

    const confirmedMatch: ConfirmedMatch = {
      transactionId: match.transactionId,
      paymentId: match.paymentId,
      matchedAmount: Math.abs(transaction.amount),
      notes: `Auto-matched with ${match.confidence}% confidence`
    }

    setSelectedMatches(prev => {
      const updated = new Map(prev)
      const key = `${match.transactionId}-${match.paymentId}`

      if (updated.has(key)) {
        updated.delete(key)
      } else {
        updated.set(key, confirmedMatch)
      }

      return updated
    })
  }

  const handleManualMatch = (transactionId: string, paymentId: string) => {
    setManualMatches(prev => {
      const updated = new Map(prev)
      if (updated.get(transactionId) === paymentId) {
        updated.delete(transactionId)
      } else {
        updated.set(transactionId, paymentId)
      }
      return updated
    })

    // Also add to confirmed matches
    const transaction = transactions.find(t => t.id === transactionId)!
    const payment = payments.find(p => p.id === paymentId)!

    const confirmedMatch: ConfirmedMatch = {
      transactionId,
      paymentId,
      matchedAmount: Math.abs(transaction.amount),
      notes: 'Manually matched'
    }

    setSelectedMatches(prev => {
      const updated = new Map(prev)
      const key = `${transactionId}-${paymentId}`

      if (manualMatches.get(transactionId) === paymentId) {
        updated.delete(key)
      } else {
        updated.set(key, confirmedMatch)
      }

      return updated
    })
  }

  const handleConfirmMatches = () => {
    const matchesToConfirm = Array.from(selectedMatches.values())
    if (matchesToConfirm.length > 0) {
      confirmMatchesMutation.mutate(matchesToConfirm)
    }
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return 'text-sage-400 bg-sage-900/30 border-sage-700'
    if (confidence >= 75) return 'text-golden-400 bg-golden-900/30 border-golden-700'
    if (confidence >= 60) return 'text-blue-400 bg-blue-900/30 border-blue-700'
    return 'text-blue-gray-400 bg-blue-gray-800/30 border-blue-gray-600'
  }

  const formatCurrency = (amount: number) => {
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

  if (loadingTransactions || loadingPayments) {
    return (
      <div className="bg-blue-gray-800/20 backdrop-blur-sm border border-blue-gray-700/30 rounded-xl p-8">
        <div className="flex items-center justify-center">
          <RefreshCw className="w-8 h-8 text-blue-gray-400 animate-spin mr-3" />
          <p className="text-blue-gray-300">Loading transactions and payments...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Controls */}
      <div className="bg-blue-gray-800/20 backdrop-blur-sm border border-blue-gray-700/30 rounded-xl p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <Target className="w-6 h-6 text-golden-400" />
              Payment Matching
            </h2>
            <p className="text-blue-gray-300 mt-1">
              Link bank transactions to scheduled payments • {filteredMatches.length} suggested matches
            </p>
          </div>

          <div className="flex gap-3">
            {selectedMatches.size > 0 && (
              <button
                onClick={handleConfirmMatches}
                disabled={confirmMatchesMutation.isPending}
                className="px-4 py-2 bg-sage-600/20 backdrop-blur-sm border border-sage-500/30 rounded-lg text-sage-200 hover:bg-sage-600/30 transition-all duration-200 flex items-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                Confirm {selectedMatches.size} Match{selectedMatches.size !== 1 ? 'es' : ''}
              </button>
            )}
            <button
              onClick={() => setReviewMode(!reviewMode)}
              className={`px-4 py-2 backdrop-blur-sm border rounded-lg transition-all duration-200 flex items-center gap-2 ${
                reviewMode
                  ? 'bg-golden-500/20 border-golden-400/30 text-golden-200'
                  : 'bg-blue-gray-600/20 border-blue-gray-500/30 text-blue-gray-200 hover:bg-blue-gray-600/30'
              }`}
            >
              <Zap className="w-4 h-4" />
              {reviewMode ? 'Quick Match' : 'Review Mode'}
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="w-5 h-5 text-blue-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search transactions or payments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-blue-gray-700/30 border border-blue-gray-600/50 rounded-lg text-white placeholder-blue-gray-400 focus:outline-none focus:ring-2 focus:ring-golden-400/50"
            />
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-blue-gray-300">
              <input
                type="checkbox"
                checked={showConfidenceFilter}
                onChange={(e) => setShowConfidenceFilter(e.target.checked)}
                className="w-4 h-4 rounded border-blue-gray-500/50 bg-blue-gray-800/50 text-golden-400 focus:ring-golden-400/50"
              />
              Min confidence
            </label>
            {showConfidenceFilter && (
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="30"
                  max="100"
                  step="5"
                  value={minConfidence}
                  onChange={(e) => setMinConfidence(parseInt(e.target.value))}
                  className="w-20"
                />
                <span className="text-blue-gray-300 text-sm w-10">{minConfidence}%</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-gray-800/20 backdrop-blur-sm border border-blue-gray-700/30 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-400/20 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-blue-gray-400">Unmatched Transactions</p>
              <p className="text-lg font-semibold text-white">{transactions.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-blue-gray-800/20 backdrop-blur-sm border border-blue-gray-700/30 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-golden-400/20 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-golden-400" />
            </div>
            <div>
              <p className="text-sm text-blue-gray-400">Scheduled Payments</p>
              <p className="text-lg font-semibold text-white">{payments.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-blue-gray-800/20 backdrop-blur-sm border border-blue-gray-700/30 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-sage-400/20 flex items-center justify-center">
              <Target className="w-5 h-5 text-sage-400" />
            </div>
            <div>
              <p className="text-sm text-blue-gray-400">Suggested Matches</p>
              <p className="text-lg font-semibold text-white">{filteredMatches.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-blue-gray-800/20 backdrop-blur-sm border border-blue-gray-700/30 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-400/20 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-sm text-blue-gray-400">Selected</p>
              <p className="text-lg font-semibold text-white">{selectedMatches.size}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Matches List */}
      {filteredMatches.length === 0 ? (
        <div className="bg-blue-gray-800/20 backdrop-blur-sm border border-blue-gray-700/30 rounded-xl p-12 text-center">
          <div className="w-16 h-16 bg-blue-gray-600/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <Target className="w-8 h-8 text-blue-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-white mb-2">No Matches Found</h3>
          <p className="text-blue-gray-400">
            {suggestedMatches.length === 0
              ? 'No potential matches between transactions and payments'
              : 'Try adjusting your search terms or confidence filter'}
          </p>
        </div>
      ) : (
        <div className="bg-blue-gray-800/20 backdrop-blur-sm border border-blue-gray-700/30 rounded-xl overflow-hidden">
          <div className="divide-y divide-blue-gray-700/30">
            {filteredMatches.map((match, index) => {
              const transaction = transactions.find(t => t.id === match.transactionId)!
              const payment = payments.find(p => p.id === match.paymentId)!
              const isSelected = selectedMatches.has(`${match.transactionId}-${match.paymentId}`)
              const confidenceColor = getConfidenceColor(match.confidence)

              return (
                <div
                  key={`${match.transactionId}-${match.paymentId}`}
                  className={`p-6 hover:bg-blue-gray-700/20 transition-colors duration-150 ${
                    isSelected ? 'bg-sage-800/10 border-l-4 border-sage-400' : ''
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleMatchSelect(match)}
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                          isSelected
                            ? 'bg-sage-400 border-sage-400 text-white'
                            : 'border-blue-gray-500 hover:border-sage-400'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3" />}
                      </button>

                      <div className={`px-3 py-1 rounded-full border text-sm font-medium ${confidenceColor}`}>
                        {match.confidence}% match
                      </div>

                      {match.amountDifference > 0 && (
                        <div className="px-2 py-1 bg-yellow-900/30 text-yellow-400 rounded text-xs border border-yellow-700">
                          ${match.amountDifference.toFixed(2)} difference
                        </div>
                      )}
                    </div>

                    <div className="text-right">
                      <p className="text-sm text-blue-gray-400">
                        {match.dateDifference === 0 ? 'Same day' : `${Math.round(match.dateDifference)} days apart`}
                      </p>
                    </div>
                  </div>

                  {/* Transaction and Payment Details */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Transaction */}
                    <div className="bg-blue-gray-700/20 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <CreditCard className="w-4 h-4 text-blue-400" />
                        <span className="font-medium text-blue-400">Bank Transaction</span>
                        {transaction.pending && (
                          <span className="px-2 py-0.5 bg-yellow-800/30 text-yellow-300 text-xs rounded border border-yellow-700">
                            Pending
                          </span>
                        )}
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-white">
                              {transaction.merchantName || transaction.description}
                            </p>
                            {transaction.merchantName && transaction.description !== transaction.merchantName && (
                              <p className="text-blue-gray-400 text-sm">{transaction.description}</p>
                            )}
                          </div>
                          <p className="font-semibold text-red-400">
                            -{formatCurrency(transaction.amount)}
                          </p>
                        </div>

                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <Building2 className="w-3 h-3 text-blue-gray-400" />
                            <span className="text-blue-gray-400 text-sm">{transaction.institutionName}</span>
                          </div>
                          <span className="text-blue-gray-400 text-sm">
                            {formatDate(transaction.date)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Payment */}
                    <div className="bg-golden-900/20 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Calendar className="w-4 h-4 text-golden-400" />
                        <span className="font-medium text-golden-400">Scheduled Payment</span>
                        {payment.priority === 'critical' && (
                          <span className="px-2 py-0.5 bg-red-800/30 text-red-300 text-xs rounded border border-red-700">
                            Critical
                          </span>
                        )}
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-white">{payment.payee}</p>
                            <p className="text-blue-gray-400 text-sm">{payment.description}</p>
                          </div>
                          <p className="font-semibold text-golden-400">
                            {formatCurrency(payment.amount)}
                          </p>
                        </div>

                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <span className="text-blue-gray-400 text-sm capitalize">{payment.category}</span>
                            {payment.isRecurring && (
                              <span className="px-2 py-0.5 bg-blue-800/30 text-blue-300 text-xs rounded border border-blue-700">
                                {payment.frequency}
                              </span>
                            )}
                          </div>
                          <span className="text-blue-gray-400 text-sm">
                            Due: {formatDate(payment.dueDate)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Match Reasons */}
                  <div className="mt-4 flex items-center gap-2">
                    <ArrowRight className="w-4 h-4 text-blue-gray-500" />
                    <div className="flex flex-wrap gap-2">
                      {match.matchReasons.map((reason, reasonIndex) => (
                        <span
                          key={reasonIndex}
                          className="px-2 py-1 bg-blue-gray-800/50 text-blue-gray-300 text-xs rounded border border-blue-gray-600"
                        >
                          {reason}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Success Message */}
      {confirmMatchesMutation.isSuccess && (
        <div className="bg-sage-800/30 backdrop-blur-sm border border-sage-700/50 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-sage-400" />
            <div>
              <h4 className="font-medium text-sage-200">Matches Confirmed Successfully!</h4>
              <p className="text-sage-300 text-sm">
                {Array.from(selectedMatches.values()).length} payment{Array.from(selectedMatches.values()).length !== 1 ? 's' : ''} have been matched and updated.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {confirmMatchesMutation.isError && (
        <div className="bg-red-800/30 backdrop-blur-sm border border-red-700/50 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <div>
              <h4 className="font-medium text-red-200">Error Confirming Matches</h4>
              <p className="text-red-300 text-sm">
                {confirmMatchesMutation.error?.message || 'Please try again later'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}