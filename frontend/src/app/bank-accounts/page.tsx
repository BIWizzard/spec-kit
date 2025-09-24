'use client'

import { useState } from 'react'
import { Plus, RefreshCw, AlertTriangle } from 'lucide-react'
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
}

interface ConnectionStats {
  total: number
  active: number
  errors: number
  disconnected: number
}

export default function BankAccountsPage() {
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([])
  const [showConnectModal, setShowConnectModal] = useState(false)
  const queryClient = useQueryClient()

  const { data: accounts = [], isLoading } = useQuery<BankAccount[]>({
    queryKey: ['bankAccounts'],
    queryFn: async () => {
      const response = await fetch('/api/bank-accounts')
      if (!response.ok) throw new Error('Failed to fetch bank accounts')
      return response.json()
    }
  })

  const syncMutation = useMutation({
    mutationFn: async (accountIds: string[]) => {
      const promises = accountIds.map(id =>
        fetch(`/api/bank-accounts/${id}/sync`, { method: 'POST' })
      )
      await Promise.all(promises)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bankAccounts'] })
      setSelectedAccounts([])
    }
  })

  const syncAllMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/bank-accounts/sync-all', {
        method: 'POST'
      })
      if (!response.ok) throw new Error('Sync failed')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bankAccounts'] })
    }
  })

  const connectionStats: ConnectionStats = accounts.reduce(
    (stats, account) => {
      stats.total++
      if (account.syncStatus === 'active') stats.active++
      else if (account.syncStatus === 'error') stats.errors++
      else stats.disconnected++
      return stats
    },
    { total: 0, active: 0, errors: 0, disconnected: 0 }
  )

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

  const handleAccountSelect = (accountId: string) => {
    setSelectedAccounts(prev =>
      prev.includes(accountId)
        ? prev.filter(id => id !== accountId)
        : [...prev, accountId]
    )
  }

  const handleSelectAll = () => {
    if (selectedAccounts.length === accounts.length) {
      setSelectedAccounts([])
    } else {
      setSelectedAccounts(accounts.map(a => a.id))
    }
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-300 rounded w-1/3 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-300 rounded-lg"></div>
            ))}
          </div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-300 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-white">Bank Accounts</h1>
          <p className="text-blue-gray-300 mt-1">
            Manage your connected bank accounts and sync financial data
          </p>
        </div>
        <div className="flex gap-3">
          {selectedAccounts.length > 0 && (
            <button
              onClick={() => syncMutation.mutate(selectedAccounts)}
              disabled={syncMutation.isPending}
              className="px-4 py-2 bg-blue-gray-600/20 backdrop-blur-sm border border-blue-gray-500/30 rounded-lg text-blue-gray-200 hover:bg-blue-gray-600/30 transition-all duration-200 flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
              Sync Selected ({selectedAccounts.length})
            </button>
          )}
          <button
            onClick={() => syncAllMutation.mutate()}
            disabled={syncAllMutation.isPending}
            className="px-4 py-2 bg-blue-gray-600/20 backdrop-blur-sm border border-blue-gray-500/30 rounded-lg text-blue-gray-200 hover:bg-blue-gray-600/30 transition-all duration-200 flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${syncAllMutation.isPending ? 'animate-spin' : ''}`} />
            Sync All
          </button>
          <button
            onClick={() => setShowConnectModal(true)}
            className="px-4 py-2 bg-golden-500/20 backdrop-blur-sm border border-golden-400/30 rounded-lg text-golden-200 hover:bg-golden-500/30 transition-all duration-200 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Connect Bank
          </button>
        </div>
      </div>

      {/* Connection Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-blue-gray-800/30 backdrop-blur-sm border border-blue-gray-700/50 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-gray-300 text-sm">Total Accounts</p>
              <p className="text-2xl font-semibold text-white">{connectionStats.total}</p>
            </div>
            <div className="w-8 h-8 bg-blue-gray-600/30 rounded-full flex items-center justify-center">
              <span className="text-blue-gray-200">🏦</span>
            </div>
          </div>
        </div>

        <div className="bg-sage-800/30 backdrop-blur-sm border border-sage-700/50 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sage-300 text-sm">Active</p>
              <p className="text-2xl font-semibold text-white">{connectionStats.active}</p>
            </div>
            <div className="w-8 h-8 bg-sage-600/30 rounded-full flex items-center justify-center">
              <span className="text-sage-200">●</span>
            </div>
          </div>
        </div>

        <div className="bg-red-800/30 backdrop-blur-sm border border-red-700/50 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-300 text-sm">Errors</p>
              <p className="text-2xl font-semibold text-white">{connectionStats.errors}</p>
            </div>
            <div className="w-8 h-8 bg-red-600/30 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-red-200" />
            </div>
          </div>
        </div>

        <div className="bg-gray-800/30 backdrop-blur-sm border border-gray-700/50 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-300 text-sm">Disconnected</p>
              <p className="text-2xl font-semibold text-white">{connectionStats.disconnected}</p>
            </div>
            <div className="w-8 h-8 bg-gray-600/30 rounded-full flex items-center justify-center">
              <span className="text-gray-200">○</span>
            </div>
          </div>
        </div>
      </div>

      {/* Accounts List */}
      <div className="bg-blue-gray-800/20 backdrop-blur-sm border border-blue-gray-700/30 rounded-xl overflow-hidden">
        {accounts.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-blue-gray-600/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl text-blue-gray-300">🏦</span>
            </div>
            <h3 className="text-lg font-medium text-white mb-2">No bank accounts connected</h3>
            <p className="text-blue-gray-300 mb-4">Connect your first bank account to start tracking your finances</p>
            <button
              onClick={() => setShowConnectModal(true)}
              className="px-6 py-2 bg-golden-500/20 backdrop-blur-sm border border-golden-400/30 rounded-lg text-golden-200 hover:bg-golden-500/30 transition-all duration-200"
            >
              Connect Your First Bank
            </button>
          </div>
        ) : (
          <>
            {/* List Header */}
            <div className="p-4 border-b border-blue-gray-700/30">
              <div className="flex items-center gap-4">
                <input
                  type="checkbox"
                  checked={selectedAccounts.length === accounts.length}
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

            {/* Account List */}
            <div className="divide-y divide-blue-gray-700/30">
              {accounts.map(account => (
                <div key={account.id} className="p-4 hover:bg-blue-gray-700/20 transition-colors duration-150">
                  <div className="flex items-center gap-4">
                    <input
                      type="checkbox"
                      checked={selectedAccounts.includes(account.id)}
                      onChange={() => handleAccountSelect(account.id)}
                      className="w-4 h-4 rounded border-blue-gray-500/50 bg-blue-gray-800/50 text-golden-400 focus:ring-golden-400/50"
                    />

                    <div className="flex-1 grid grid-cols-1 lg:grid-cols-6 gap-4 items-center">
                      <div className="lg:col-span-2">
                        <h3 className="font-medium text-white">{account.institutionName}</h3>
                        <p className="text-blue-gray-300 text-sm">
                          {account.accountName} •••{account.accountNumber}
                        </p>
                      </div>

                      <div>
                        <p className="text-blue-gray-300 text-xs uppercase tracking-wide">Type</p>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-gray-700/50 text-blue-gray-200 capitalize">
                          {account.accountType}
                        </span>
                      </div>

                      <div>
                        <p className="text-blue-gray-300 text-xs uppercase tracking-wide">Balance</p>
                        <p className="font-medium text-white">{formatBalance(account.currentBalance)}</p>
                        {account.accountType === 'credit' && (
                          <p className="text-blue-gray-400 text-xs">
                            Available: {formatBalance(account.availableBalance)}
                          </p>
                        )}
                      </div>

                      <div>
                        <p className="text-blue-gray-300 text-xs uppercase tracking-wide">Status</p>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(account.syncStatus)}`}>
                          <span className="mr-1">{getStatusIcon(account.syncStatus)}</span>
                          {account.syncStatus}
                        </span>
                      </div>

                      <div>
                        <p className="text-blue-gray-300 text-xs uppercase tracking-wide">Last Sync</p>
                        <p className="text-blue-gray-200 text-sm">{formatLastSync(account.lastSyncAt)}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => window.location.href = `/bank-accounts/${account.id}`}
                      className="px-3 py-2 text-blue-gray-300 hover:text-white hover:bg-blue-gray-700/30 rounded-lg transition-all duration-150"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Connect Modal Placeholder */}
      {showConnectModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-blue-gray-800/90 backdrop-blur-sm border border-blue-gray-700/50 rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-white mb-4">Connect Bank Account</h3>
            <p className="text-blue-gray-300 mb-4">
              This will open the Plaid Link flow to connect your bank account securely.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowConnectModal(false)}
                className="px-4 py-2 text-blue-gray-300 hover:text-white transition-colors duration-150"
              >
                Cancel
              </button>
              <button
                onClick={() => window.location.href = '/bank-accounts/connect'}
                className="px-4 py-2 bg-golden-500/20 backdrop-blur-sm border border-golden-400/30 rounded-lg text-golden-200 hover:bg-golden-500/30 transition-all duration-200"
              >
                Connect Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}