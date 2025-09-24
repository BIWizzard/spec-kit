'use client'

import { useState } from 'react'
import { RefreshCw, AlertTriangle, Settings, ExternalLink, Trash2 } from 'lucide-react'
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
}

interface AccountListProps {
  onAccountSelect?: (accountId: string) => void
  selectedAccountId?: string
  compact?: boolean
  showActions?: boolean
  filterStatus?: 'all' | 'active' | 'error' | 'disconnected'
}

export default function AccountList({
  onAccountSelect,
  selectedAccountId,
  compact = false,
  showActions = true,
  filterStatus = 'all'
}: AccountListProps) {
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([])
  const queryClient = useQueryClient()

  const { data: accounts = [], isLoading, error } = useQuery<BankAccount[]>({
    queryKey: ['bankAccounts'],
    queryFn: async () => {
      const response = await fetch('/api/bank-accounts')
      if (!response.ok) throw new Error('Failed to fetch bank accounts')
      return response.json()
    }
  })

  const syncMutation = useMutation({
    mutationFn: async (accountId: string) => {
      const response = await fetch(`/api/bank-accounts/${accountId}/sync`, {
        method: 'POST'
      })
      if (!response.ok) throw new Error('Sync failed')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bankAccounts'] })
    }
  })

  const syncAllMutation = useMutation({
    mutationFn: async (accountIds?: string[]) => {
      if (accountIds && accountIds.length > 0) {
        const promises = accountIds.map(id =>
          fetch(`/api/bank-accounts/${id}/sync`, { method: 'POST' })
        )
        await Promise.all(promises)
      } else {
        const response = await fetch('/api/bank-accounts/sync-all', {
          method: 'POST'
        })
        if (!response.ok) throw new Error('Sync all failed')
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bankAccounts'] })
      setSelectedAccounts([])
    }
  })

  const deleteMutation = useMutation({
    mutationFn: async (accountId: string) => {
      const response = await fetch(`/api/bank-accounts/${accountId}`, {
        method: 'DELETE'
      })
      if (!response.ok) throw new Error('Delete failed')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bankAccounts'] })
      setSelectedAccounts(prev => prev.filter(id => id !== accountId))
    }
  })

  const filteredAccounts = accounts.filter(account => {
    if (filterStatus === 'all') return true
    return account.syncStatus === filterStatus
  })

  const handleAccountToggle = (accountId: string) => {
    if (onAccountSelect) {
      onAccountSelect(accountId)
      return
    }

    setSelectedAccounts(prev =>
      prev.includes(accountId)
        ? prev.filter(id => id !== accountId)
        : [...prev, accountId]
    )
  }

  const handleSelectAll = () => {
    if (selectedAccounts.length === filteredAccounts.length) {
      setSelectedAccounts([])
    } else {
      setSelectedAccounts(filteredAccounts.map(a => a.id))
    }
  }

  const formatBalance = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatLastSync = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    return `${diffDays}d ago`
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-sage-600 bg-sage-50 border-sage-200'
      case 'error': return 'text-red-600 bg-red-50 border-red-200'
      case 'disconnected': return 'text-gray-600 bg-gray-50 border-gray-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return '●'
      case 'error': return '⚠'
      case 'disconnected': return '○'
      default: return '○'
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
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse h-20 bg-blue-gray-700/30 rounded-lg"></div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-800/30 backdrop-blur-sm border border-red-700/50 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400" />
          <div>
            <h4 className="font-medium text-red-200">Failed to load accounts</h4>
            <p className="text-red-300 text-sm">Please try again later</p>
          </div>
        </div>
      </div>
    )
  }

  if (filteredAccounts.length === 0) {
    return (
      <div className="bg-blue-gray-800/20 backdrop-blur-sm border border-blue-gray-700/30 rounded-xl p-6 text-center">
        <div className="w-12 h-12 bg-blue-gray-600/30 rounded-full flex items-center justify-center mx-auto mb-3">
          <span className="text-blue-gray-300">🏦</span>
        </div>
        <h3 className="font-medium text-white mb-2">
          {filterStatus === 'all' ? 'No bank accounts' : `No ${filterStatus} accounts`}
        </h3>
        <p className="text-blue-gray-300 text-sm">
          {filterStatus === 'all'
            ? 'Connect your first bank account to get started'
            : `No accounts with ${filterStatus} status`
          }
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Bulk Actions */}
      {showActions && selectedAccounts.length > 0 && (
        <div className="bg-golden-800/20 backdrop-blur-sm border border-golden-700/30 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <span className="text-golden-200 text-sm font-medium">
              {selectedAccounts.length} account{selectedAccounts.length !== 1 ? 's' : ''} selected
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => syncAllMutation.mutate(selectedAccounts)}
                disabled={syncAllMutation.isPending}
                className="px-3 py-1 bg-golden-600/20 backdrop-blur-sm border border-golden-500/30 rounded text-golden-200 hover:bg-golden-600/30 transition-all duration-200 text-sm flex items-center gap-1"
              >
                <RefreshCw className={`w-3 h-3 ${syncAllMutation.isPending ? 'animate-spin' : ''}`} />
                Sync
              </button>
              <button
                onClick={() => setSelectedAccounts([])}
                className="px-3 py-1 bg-blue-gray-600/20 backdrop-blur-sm border border-blue-gray-500/30 rounded text-blue-gray-200 hover:bg-blue-gray-600/30 transition-all duration-200 text-sm"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Account List */}
      <div className="bg-blue-gray-800/20 backdrop-blur-sm border border-blue-gray-700/30 rounded-xl overflow-hidden">
        {/* Header */}
        {!compact && showActions && (
          <div className="p-3 border-b border-blue-gray-700/30">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={selectedAccounts.length === filteredAccounts.length}
                onChange={handleSelectAll}
                className="w-4 h-4 rounded border-blue-gray-500/50 bg-blue-gray-800/50 text-golden-400 focus:ring-golden-400/50"
              />
              <span className="text-blue-gray-300 text-sm font-medium">
                {selectedAccounts.length > 0
                  ? `${selectedAccounts.length} selected`
                  : 'Select All'
                }
              </span>
            </div>
          </div>
        )}

        {/* Account Rows */}
        <div className={compact ? 'divide-y divide-blue-gray-700/30' : 'divide-y divide-blue-gray-700/30'}>
          {filteredAccounts.map(account => (
            <div
              key={account.id}
              className={`p-${compact ? '3' : '4'} hover:bg-blue-gray-700/20 transition-colors duration-150 ${
                selectedAccountId === account.id ? 'bg-golden-500/10 border-l-2 border-golden-400' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                {showActions && (
                  <input
                    type="checkbox"
                    checked={selectedAccounts.includes(account.id) || selectedAccountId === account.id}
                    onChange={() => handleAccountToggle(account.id)}
                    className="w-4 h-4 rounded border-blue-gray-500/50 bg-blue-gray-800/50 text-golden-400 focus:ring-golden-400/50"
                  />
                )}

                {compact ? (
                  /* Compact Layout */
                  <div className="flex-1 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{getAccountTypeIcon(account.accountType)}</span>
                      <div>
                        <p className="font-medium text-white text-sm">{account.institutionName}</p>
                        <p className="text-blue-gray-400 text-xs">•••{account.accountNumber}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-white text-sm">{formatBalance(account.currentBalance)}</p>
                      <div className="flex items-center gap-1">
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(account.syncStatus)}`}>
                          <span className="mr-1">{getStatusIcon(account.syncStatus)}</span>
                          {account.syncStatus}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Full Layout */
                  <>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">{getAccountTypeIcon(account.accountType)}</span>
                        <h3 className="font-medium text-white">{account.institutionName}</h3>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(account.syncStatus)}`}>
                          <span className="mr-1">{getStatusIcon(account.syncStatus)}</span>
                          {account.syncStatus}
                        </span>
                      </div>
                      <p className="text-blue-gray-300 text-sm">
                        {account.accountName} •••{account.accountNumber}
                      </p>
                      {account.syncError && (
                        <p className="text-red-400 text-xs mt-1">{account.syncError}</p>
                      )}
                    </div>

                    <div className="text-right">
                      <p className="font-medium text-white text-lg">{formatBalance(account.currentBalance)}</p>
                      {account.accountType === 'credit' && (
                        <p className="text-blue-gray-400 text-sm">
                          Available: {formatBalance(account.availableBalance)}
                        </p>
                      )}
                      <p className="text-blue-gray-400 text-xs">
                        Last sync: {formatLastSync(account.lastSyncAt)}
                      </p>
                    </div>

                    {showActions && (
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            syncMutation.mutate(account.id)
                          }}
                          disabled={syncMutation.isPending}
                          className="p-2 bg-blue-gray-600/20 backdrop-blur-sm border border-blue-gray-500/30 rounded-lg text-blue-gray-300 hover:text-white hover:bg-blue-gray-600/30 transition-all duration-200"
                          title="Sync account"
                        >
                          <RefreshCw className={`w-4 h-4 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            window.location.href = `/bank-accounts/${account.id}`
                          }}
                          className="p-2 bg-blue-gray-600/20 backdrop-blur-sm border border-blue-gray-500/30 rounded-lg text-blue-gray-300 hover:text-white hover:bg-blue-gray-600/30 transition-all duration-200"
                          title="View details"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            if (confirm('Are you sure you want to remove this account?')) {
                              deleteMutation.mutate(account.id)
                            }
                          }}
                          disabled={deleteMutation.isPending}
                          className="p-2 bg-red-600/20 backdrop-blur-sm border border-red-500/30 rounded-lg text-red-300 hover:text-red-200 hover:bg-red-600/30 transition-all duration-200"
                          title="Remove account"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}