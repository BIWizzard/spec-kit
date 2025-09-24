'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, RefreshCw, AlertTriangle, Settings, Download, Trash2, ExternalLink } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

interface BankAccount {
  id: string
  institutionName: string
  accountName: string
  accountType: 'checking' | 'savings' | 'credit' | 'loan'
  accountNumber: string
  currentBalance: number
  availableBalance: number
  lastSyncAt: string
  syncStatus: 'active' | 'error' | 'disconnected'
  syncError?: string
  createdAt: string
}

interface Transaction {
  id: string
  amount: number
  date: string
  description: string
  merchantName?: string
  pending: boolean
  spendingCategoryId?: string
  categoryName?: string
  userCategorized: boolean
}

interface SyncHistory {
  timestamp: string
  status: 'success' | 'error'
  message?: string
  transactionCount?: number
}

export default function BankAccountDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const accountId = params.id as string
  const queryClient = useQueryClient()

  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showReconnectModal, setShowReconnectModal] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'sync-history'>('overview')

  const { data: account, isLoading } = useQuery<BankAccount>({
    queryKey: ['bankAccount', accountId],
    queryFn: async () => {
      const response = await fetch(`/api/bank-accounts/${accountId}`)
      if (!response.ok) throw new Error('Failed to fetch account')
      return response.json()
    }
  })

  const { data: recentTransactions = [], isLoading: isLoadingTransactions } = useQuery<Transaction[]>({
    queryKey: ['transactions', accountId, 'recent'],
    queryFn: async () => {
      const response = await fetch(`/api/transactions?bankAccountId=${accountId}&limit=10`)
      if (!response.ok) throw new Error('Failed to fetch transactions')
      return response.json()
    },
    enabled: !!accountId
  })

  const { data: syncHistory = [], isLoading: isLoadingSyncHistory } = useQuery<SyncHistory[]>({
    queryKey: ['syncHistory', accountId],
    queryFn: async () => {
      // Mock sync history - would come from audit logs
      return [
        { timestamp: '2024-01-15T10:30:00Z', status: 'success', transactionCount: 15 },
        { timestamp: '2024-01-14T10:30:00Z', status: 'success', transactionCount: 8 },
        { timestamp: '2024-01-13T10:30:00Z', status: 'error', message: 'Institution temporarily unavailable' },
        { timestamp: '2024-01-12T10:30:00Z', status: 'success', transactionCount: 12 }
      ]
    },
    enabled: activeTab === 'sync-history'
  })

  const syncMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/bank-accounts/${accountId}/sync`, {
        method: 'POST'
      })
      if (!response.ok) throw new Error('Sync failed')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bankAccount', accountId] })
      queryClient.invalidateQueries({ queryKey: ['transactions', accountId] })
    }
  })

  const reconnectMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/bank-accounts/${accountId}/reconnect`, {
        method: 'POST'
      })
      if (!response.ok) throw new Error('Reconnection failed')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bankAccount', accountId] })
      setShowReconnectModal(false)
    }
  })

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/bank-accounts/${accountId}`, {
        method: 'DELETE'
      })
      if (!response.ok) throw new Error('Deletion failed')
    },
    onSuccess: () => {
      router.push('/bank-accounts')
    }
  })

  const formatBalance = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-sage-600 bg-sage-50 border-sage-200'
      case 'error': return 'text-red-600 bg-red-50 border-red-200'
      case 'disconnected': return 'text-gray-600 bg-gray-50 border-gray-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getAccountTypeIcon = (accountType: string) => {
    switch (accountType) {
      case 'checking': return '🏦'
      case 'savings': return '💰'
      case 'credit': return '💳'
      case 'loan': return '📋'
      default: return '🏦'
    }
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-300 rounded w-1/3 mb-6"></div>
          <div className="h-32 bg-gray-300 rounded-lg mb-6"></div>
          <div className="h-64 bg-gray-300 rounded-lg"></div>
        </div>
      </div>
    )
  }

  if (!account) {
    return (
      <div className="p-6 text-center">
        <div className="text-red-400 mb-4">Account not found</div>
        <button
          onClick={() => router.push('/bank-accounts')}
          className="px-4 py-2 bg-blue-gray-600/20 text-blue-gray-200 rounded-lg"
        >
          Back to Accounts
        </button>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/bank-accounts')}
            className="w-10 h-10 bg-blue-gray-800/50 backdrop-blur-sm border border-blue-gray-700/50 rounded-lg flex items-center justify-center text-blue-gray-300 hover:text-white hover:bg-blue-gray-700/50 transition-all duration-200"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-semibold text-white flex items-center gap-2">
              <span className="text-xl">{getAccountTypeIcon(account.accountType)}</span>
              {account.accountName}
            </h1>
            <p className="text-blue-gray-300">{account.institutionName} •••{account.accountNumber}</p>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
            className="px-4 py-2 bg-blue-gray-600/20 backdrop-blur-sm border border-blue-gray-500/30 rounded-lg text-blue-gray-200 hover:bg-blue-gray-600/30 transition-all duration-200 flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
            Sync Now
          </button>

          {account.syncStatus === 'error' || account.syncStatus === 'disconnected' ? (
            <button
              onClick={() => setShowReconnectModal(true)}
              className="px-4 py-2 bg-golden-500/20 backdrop-blur-sm border border-golden-400/30 rounded-lg text-golden-200 hover:bg-golden-500/30 transition-all duration-200"
            >
              Reconnect
            </button>
          ) : null}

          <button
            onClick={() => setShowDeleteModal(true)}
            className="px-4 py-2 bg-red-600/20 backdrop-blur-sm border border-red-500/30 rounded-lg text-red-200 hover:bg-red-600/30 transition-all duration-200 flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Remove
          </button>
        </div>
      </div>

      {/* Account Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-gray-800/30 backdrop-blur-sm border border-blue-gray-700/50 rounded-xl p-6">
          <h3 className="text-blue-gray-300 text-sm font-medium mb-2">Current Balance</h3>
          <p className="text-3xl font-semibold text-white">{formatBalance(account.currentBalance)}</p>
        </div>

        {account.accountType === 'credit' && (
          <div className="bg-blue-gray-800/30 backdrop-blur-sm border border-blue-gray-700/50 rounded-xl p-6">
            <h3 className="text-blue-gray-300 text-sm font-medium mb-2">Available Balance</h3>
            <p className="text-3xl font-semibold text-white">{formatBalance(account.availableBalance)}</p>
          </div>
        )}

        <div className="bg-blue-gray-800/30 backdrop-blur-sm border border-blue-gray-700/50 rounded-xl p-6">
          <h3 className="text-blue-gray-300 text-sm font-medium mb-2">Connection Status</h3>
          <div className="flex items-center justify-between">
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium border ${getStatusColor(account.syncStatus)}`}>
              {account.syncStatus}
            </span>
            <span className="text-blue-gray-400 text-sm">
              {formatDate(account.lastSyncAt)}
            </span>
          </div>
          {account.syncError && (
            <p className="text-red-400 text-xs mt-2">{account.syncError}</p>
          )}
        </div>
      </div>

      {/* Error Alert */}
      {account.syncStatus === 'error' && (
        <div className="bg-red-800/30 backdrop-blur-sm border border-red-700/50 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-red-200 mb-1">Connection Issue</h4>
              <p className="text-red-300 text-sm">
                {account.syncError || 'Unable to sync with your bank. This may be temporary.'}
              </p>
              <button
                onClick={() => setShowReconnectModal(true)}
                className="mt-2 text-red-200 hover:text-white text-sm underline"
              >
                Try reconnecting your account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-blue-gray-700/50 mb-6">
        {[
          { key: 'overview', label: 'Overview', count: null },
          { key: 'transactions', label: 'Recent Transactions', count: recentTransactions.length },
          { key: 'sync-history', label: 'Sync History', count: null }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`px-4 py-2 border-b-2 transition-colors duration-200 ${
              activeTab === tab.key
                ? 'border-golden-400 text-golden-200'
                : 'border-transparent text-blue-gray-300 hover:text-white'
            }`}
          >
            {tab.label}
            {tab.count !== null && (
              <span className="ml-2 px-2 py-0.5 bg-blue-gray-700/50 rounded-full text-xs">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-blue-gray-800/20 backdrop-blur-sm border border-blue-gray-700/30 rounded-xl p-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-white mb-3">Account Information</h4>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-blue-gray-300">Institution</span>
                    <span className="text-white">{account.institutionName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-gray-300">Account Type</span>
                    <span className="text-white capitalize">{account.accountType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-gray-300">Account Number</span>
                    <span className="text-white">•••••{account.accountNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-gray-300">Connected</span>
                    <span className="text-white">{formatDate(account.createdAt)}</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-white mb-3">Quick Actions</h4>
                <div className="space-y-2">
                  <button
                    onClick={() => router.push('/transactions?bankAccountId=' + accountId)}
                    className="w-full flex items-center justify-between p-3 bg-blue-gray-700/30 hover:bg-blue-gray-700/50 rounded-lg transition-colors duration-200"
                  >
                    <span className="text-white">View All Transactions</span>
                    <ExternalLink className="w-4 h-4 text-blue-gray-300" />
                  </button>
                  <button className="w-full flex items-center justify-between p-3 bg-blue-gray-700/30 hover:bg-blue-gray-700/50 rounded-lg transition-colors duration-200">
                    <span className="text-white">Export Transactions</span>
                    <Download className="w-4 h-4 text-blue-gray-300" />
                  </button>
                  <button className="w-full flex items-center justify-between p-3 bg-blue-gray-700/30 hover:bg-blue-gray-700/50 rounded-lg transition-colors duration-200">
                    <span className="text-white">Account Settings</span>
                    <Settings className="w-4 h-4 text-blue-gray-300" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'transactions' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h4 className="font-medium text-white">Recent Transactions</h4>
              <button
                onClick={() => router.push('/transactions?bankAccountId=' + accountId)}
                className="text-golden-300 hover:text-golden-200 text-sm flex items-center gap-1"
              >
                View All
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>

            {isLoadingTransactions ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="animate-pulse h-16 bg-blue-gray-700/30 rounded-lg"></div>
                ))}
              </div>
            ) : recentTransactions.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-blue-gray-300">No transactions found</p>
              </div>
            ) : (
              <div className="divide-y divide-blue-gray-700/30">
                {recentTransactions.map(transaction => (
                  <div key={transaction.id} className="py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-gray-700/50 rounded-full flex items-center justify-center">
                        <span className="text-xs">💳</span>
                      </div>
                      <div>
                        <p className="font-medium text-white">
                          {transaction.merchantName || transaction.description}
                        </p>
                        <p className="text-blue-gray-400 text-sm">
                          {new Date(transaction.date).toLocaleDateString()}
                          {transaction.pending && (
                            <span className="ml-2 text-yellow-400 text-xs">Pending</span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-medium ${transaction.amount < 0 ? 'text-red-400' : 'text-sage-400'}`}>
                        {formatBalance(Math.abs(transaction.amount))}
                      </p>
                      {transaction.categoryName && (
                        <p className="text-blue-gray-400 text-xs">{transaction.categoryName}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'sync-history' && (
          <div>
            <h4 className="font-medium text-white mb-4">Sync History</h4>
            {isLoadingSyncHistory ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="animate-pulse h-12 bg-blue-gray-700/30 rounded-lg"></div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {syncHistory.map((sync, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-blue-gray-700/20 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${sync.status === 'success' ? 'bg-sage-400' : 'bg-red-400'}`} />
                      <div>
                        <p className="text-white text-sm">
                          {sync.status === 'success' ? 'Successful sync' : 'Sync failed'}
                        </p>
                        <p className="text-blue-gray-400 text-xs">
                          {formatDate(sync.timestamp)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      {sync.transactionCount && (
                        <p className="text-blue-gray-300 text-sm">
                          {sync.transactionCount} transactions
                        </p>
                      )}
                      {sync.message && (
                        <p className="text-red-400 text-xs">{sync.message}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-blue-gray-800/90 backdrop-blur-sm border border-blue-gray-700/50 rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-white mb-4">Remove Bank Account</h3>
            <p className="text-blue-gray-300 mb-6">
              Are you sure you want to remove this account? This will stop syncing transactions and remove all associated data.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 px-4 py-2 bg-blue-gray-600/20 text-blue-gray-200 hover:bg-blue-gray-600/30 rounded-lg transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
                className="flex-1 px-4 py-2 bg-red-600/20 text-red-200 hover:bg-red-600/30 rounded-lg transition-colors duration-200 disabled:opacity-50"
              >
                {deleteMutation.isPending ? 'Removing...' : 'Remove Account'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reconnect Modal */}
      {showReconnectModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-blue-gray-800/90 backdrop-blur-sm border border-blue-gray-700/50 rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-white mb-4">Reconnect Account</h3>
            <p className="text-blue-gray-300 mb-6">
              We'll help you reconnect your account to resume syncing transactions.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowReconnectModal(false)}
                className="flex-1 px-4 py-2 bg-blue-gray-600/20 text-blue-gray-200 hover:bg-blue-gray-600/30 rounded-lg transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                onClick={() => reconnectMutation.mutate()}
                disabled={reconnectMutation.isPending}
                className="flex-1 px-4 py-2 bg-golden-500/20 text-golden-200 hover:bg-golden-500/30 rounded-lg transition-colors duration-200 disabled:opacity-50"
              >
                {reconnectMutation.isPending ? 'Reconnecting...' : 'Reconnect'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}