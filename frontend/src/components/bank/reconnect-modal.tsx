'use client'

import { useState, useEffect, useCallback } from 'react'
import { AlertTriangle, CheckCircle, RefreshCw, X, Link, Settings, Trash2, ArrowRight, Shield, Clock } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'

interface BankAccount {
  id: string
  institutionName: string
  accountName: string
  accountType: 'checking' | 'savings' | 'credit' | 'loan'
  accountNumber: string
  currentBalance: number
  syncStatus: 'active' | 'error' | 'disconnected'
  syncError?: string
  lastSyncAt: string
  plaidItemId: string
  institutionLogo?: string
  institutionColor?: string
}

interface PlaidLinkError {
  error_type: string
  error_code: string
  display_message: string
}

interface ReconnectModalProps {
  isOpen: boolean
  onClose: () => void
  account: BankAccount
  onReconnectSuccess?: (accountId: string) => void
  onAccountRemoved?: (accountId: string) => void
}

type ReconnectionStep =
  | 'initial'
  | 'preparing'
  | 'linking'
  | 'verifying'
  | 'success'
  | 'error'
  | 'remove_confirmation'

interface PlaidLinkHandler {
  open: () => void
  exit: () => void
}

// Mock Plaid Link interface for development
interface PlaidLinkSuccessMetadata {
  institution: {
    name: string
    institution_id: string
  }
  accounts: Array<{
    id: string
    name: string
    type: string
    subtype: string
  }>
  link_session_id: string
  public_token: string
}

export default function ReconnectModal({
  isOpen,
  onClose,
  account,
  onReconnectSuccess,
  onAccountRemoved
}: ReconnectModalProps) {
  const [currentStep, setCurrentStep] = useState<ReconnectionStep>('initial')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [linkToken, setLinkToken] = useState<string | null>(null)
  const [plaidHandler, setPlaidHandler] = useState<PlaidLinkHandler | null>(null)
  const queryClient = useQueryClient()

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentStep('initial')
      setError(null)
      setIsLoading(false)
      setLinkToken(null)
      setPlaidHandler(null)
    }
  }, [isOpen])

  const createLinkTokenMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/bank-accounts/${account.id}/link-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: account.plaidItemId })
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to create link token')
      }
      return response.json()
    },
    onSuccess: (data) => {
      setLinkToken(data.linkToken)
      setCurrentStep('linking')
      initializePlaidLink(data.linkToken)
    },
    onError: (error: Error) => {
      setError(error.message)
      setCurrentStep('error')
    }
  })

  const exchangeTokenMutation = useMutation({
    mutationFn: async (publicToken: string) => {
      const response = await fetch(`/api/bank-accounts/${account.id}/reconnect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicToken })
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to reconnect account')
      }
      return response.json()
    },
    onSuccess: () => {
      setCurrentStep('success')
      queryClient.invalidateQueries({ queryKey: ['bankAccounts'] })
      onReconnectSuccess?.(account.id)
    },
    onError: (error: Error) => {
      setError(error.message)
      setCurrentStep('error')
    }
  })

  const removeAccountMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/bank-accounts/${account.id}`, {
        method: 'DELETE'
      })
      if (!response.ok) throw new Error('Failed to remove account')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bankAccounts'] })
      onAccountRemoved?.(account.id)
      onClose()
    }
  })

  const initializePlaidLink = useCallback((linkToken: string) => {
    // Mock Plaid Link implementation for development
    // In production, this would use the actual Plaid Link SDK
    const mockPlaidLink = {
      open: () => {
        setIsLoading(true)
        setCurrentStep('verifying')

        // Simulate Plaid Link flow
        setTimeout(() => {
          const mockPublicToken = `public-sandbox-${Date.now()}`
          handlePlaidSuccess(mockPublicToken, {
            institution: {
              name: account.institutionName,
              institution_id: 'mock_institution_id'
            },
            accounts: [{
              id: 'mock_account_id',
              name: account.accountName,
              type: account.accountType,
              subtype: account.accountType
            }],
            link_session_id: 'mock_session_id',
            public_token: mockPublicToken
          })
        }, 2000)
      },
      exit: () => {
        setIsLoading(false)
        setCurrentStep('initial')
      }
    }

    setPlaidHandler(mockPlaidLink)
  }, [account])

  const handlePlaidSuccess = (publicToken: string, metadata: PlaidLinkSuccessMetadata) => {
    setIsLoading(false)
    exchangeTokenMutation.mutate(publicToken)
  }

  const handleStartReconnection = () => {
    setCurrentStep('preparing')
    setIsLoading(true)
    createLinkTokenMutation.mutate()
  }

  const handleRemoveAccount = () => {
    setCurrentStep('remove_confirmation')
  }

  const confirmRemoveAccount = () => {
    removeAccountMutation.mutate()
  }

  const handleClose = () => {
    if (!isLoading) {
      onClose()
    }
  }

  const getErrorDetails = () => {
    switch (account.syncStatus) {
      case 'error':
        return {
          title: 'Connection Error',
          description: account.syncError || 'Your bank connection has encountered an error and needs to be refreshed.',
          icon: AlertTriangle,
          iconColor: 'text-red-400'
        }
      case 'disconnected':
        return {
          title: 'Connection Expired',
          description: 'Your bank connection has expired or been revoked. Please reconnect to continue syncing transactions.',
          icon: Clock,
          iconColor: 'text-golden-400'
        }
      default:
        return {
          title: 'Reconnection Required',
          description: 'Your bank connection needs to be refreshed to ensure accurate transaction data.',
          icon: RefreshCw,
          iconColor: 'text-blue-gray-400'
        }
    }
  }

  const getStepContent = () => {
    const errorDetails = getErrorDetails()

    switch (currentStep) {
      case 'initial':
        return (
          <div className="p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className={`w-12 h-12 rounded-xl bg-${errorDetails.iconColor.split('-')[1]}-500/20 flex items-center justify-center`}>
                <errorDetails.icon className={`w-6 h-6 ${errorDetails.iconColor}`} />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-white mb-1">{errorDetails.title}</h3>
                <p className="text-blue-gray-300">{account.institutionName} • •••{account.accountNumber}</p>
              </div>
            </div>

            <div className="bg-blue-gray-800/30 backdrop-blur-sm border border-blue-gray-700/50 rounded-lg p-4 mb-6">
              <p className="text-blue-gray-200 leading-relaxed">{errorDetails.description}</p>
            </div>

            {account.syncError && (
              <div className="bg-red-800/20 backdrop-blur-sm border border-red-700/50 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-red-200 mb-1">Error Details</h4>
                    <p className="text-red-300 text-sm">{account.syncError}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-3 text-sm text-blue-gray-300">
                <Shield className="w-4 h-4 text-sage-400" />
                <span>Secure connection through Plaid - your credentials are never stored</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-blue-gray-300">
                <RefreshCw className="w-4 h-4 text-sage-400" />
                <span>Reconnection takes less than 60 seconds</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-blue-gray-300">
                <CheckCircle className="w-4 h-4 text-sage-400" />
                <span>No interruption to existing transaction data</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleStartReconnection}
                disabled={isLoading}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-golden-600/20 hover:bg-golden-600/30 backdrop-blur-sm border border-golden-500/30 rounded-lg text-golden-200 font-medium transition-all duration-200"
              >
                <Link className="w-4 h-4" />
                Reconnect Account
              </button>
              <button
                onClick={handleRemoveAccount}
                className="px-4 py-3 bg-red-600/20 hover:bg-red-600/30 backdrop-blur-sm border border-red-500/30 rounded-lg text-red-300 transition-all duration-200"
                title="Remove Account"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        )

      case 'preparing':
        return (
          <div className="p-8 text-center">
            <div className="w-16 h-16 rounded-xl bg-golden-500/20 flex items-center justify-center mx-auto mb-4">
              <div className="w-6 h-6 border-2 border-golden-400/30 border-t-golden-400 rounded-full animate-spin"></div>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Preparing Connection</h3>
            <p className="text-blue-gray-300">Setting up secure link to your bank...</p>
          </div>
        )

      case 'linking':
        return (
          <div className="p-8 text-center">
            <div className="w-16 h-16 rounded-xl bg-golden-500/20 flex items-center justify-center mx-auto mb-4">
              <Link className="w-6 h-6 text-golden-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Ready to Reconnect</h3>
            <p className="text-blue-gray-300 mb-6">Click below to securely reconnect your {account.institutionName} account.</p>

            <button
              onClick={() => plaidHandler?.open()}
              disabled={!plaidHandler || isLoading}
              className="px-8 py-3 bg-golden-600 hover:bg-golden-600/90 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              Open Bank Connection
            </button>
          </div>
        )

      case 'verifying':
        return (
          <div className="p-8 text-center">
            <div className="w-16 h-16 rounded-xl bg-sage-500/20 flex items-center justify-center mx-auto mb-4">
              <div className="w-6 h-6 border-2 border-sage-400/30 border-t-sage-400 rounded-full animate-spin"></div>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Verifying Connection</h3>
            <p className="text-blue-gray-300">Confirming your account details...</p>
          </div>
        )

      case 'success':
        return (
          <div className="p-8 text-center">
            <div className="w-16 h-16 rounded-xl bg-sage-500/20 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-6 h-6 text-sage-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Successfully Reconnected!</h3>
            <p className="text-blue-gray-300 mb-6">
              Your {account.institutionName} account is now reconnected and syncing.
            </p>

            <div className="bg-sage-800/20 backdrop-blur-sm border border-sage-700/50 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-3 text-sage-200">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">Connection restored</span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="px-8 py-3 bg-sage-600 hover:bg-sage-600/90 text-white font-medium rounded-lg transition-colors"
            >
              Done
            </button>
          </div>
        )

      case 'error':
        return (
          <div className="p-6">
            <div className="w-16 h-16 rounded-xl bg-red-500/20 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6 text-red-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2 text-center">Reconnection Failed</h3>

            {error && (
              <div className="bg-red-800/20 backdrop-blur-sm border border-red-700/50 rounded-lg p-4 mb-6">
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            )}

            <div className="space-y-3 mb-6 text-sm text-blue-gray-300">
              <h4 className="font-medium text-white">What you can try:</h4>
              <ul className="space-y-2 ml-4">
                <li className="flex items-start gap-2">
                  <ArrowRight className="w-3 h-3 mt-1 text-blue-gray-400" />
                  <span>Make sure you're using the correct login credentials</span>
                </li>
                <li className="flex items-start gap-2">
                  <ArrowRight className="w-3 h-3 mt-1 text-blue-gray-400" />
                  <span>Check if your bank account is still active</span>
                </li>
                <li className="flex items-start gap-2">
                  <ArrowRight className="w-3 h-3 mt-1 text-blue-gray-400" />
                  <span>Try again in a few minutes</span>
                </li>
                <li className="flex items-start gap-2">
                  <ArrowRight className="w-3 h-3 mt-1 text-blue-gray-400" />
                  <span>Contact support if the problem persists</span>
                </li>
              </ul>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setCurrentStep('initial')}
                className="flex-1 px-6 py-3 bg-blue-gray-600/20 hover:bg-blue-gray-600/30 backdrop-blur-sm border border-blue-gray-500/30 rounded-lg text-blue-gray-200 font-medium transition-all duration-200"
              >
                Try Again
              </button>
              <button
                onClick={handleRemoveAccount}
                className="px-4 py-3 bg-red-600/20 hover:bg-red-600/30 backdrop-blur-sm border border-red-500/30 rounded-lg text-red-300 transition-all duration-200"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        )

      case 'remove_confirmation':
        return (
          <div className="p-6">
            <div className="w-16 h-16 rounded-xl bg-red-500/20 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6 text-red-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2 text-center">Remove Account?</h3>

            <div className="bg-red-800/20 backdrop-blur-sm border border-red-700/50 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5" />
                <div>
                  <h4 className="font-medium text-red-200 mb-2">This action cannot be undone</h4>
                  <p className="text-red-300 text-sm">
                    Removing this account will permanently delete all associated transaction data.
                    You'll need to reconnect the account to restore access.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-blue-gray-800/30 backdrop-blur-sm border border-blue-gray-700/50 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-3 text-blue-gray-200">
                <span className="text-lg">{account.accountType === 'checking' ? '🏦' : account.accountType === 'savings' ? '💰' : account.accountType === 'credit' ? '💳' : '📋'}</span>
                <div>
                  <p className="font-medium">{account.institutionName}</p>
                  <p className="text-sm text-blue-gray-400">{account.accountName} •••{account.accountNumber}</p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setCurrentStep('initial')}
                disabled={removeAccountMutation.isPending}
                className="flex-1 px-6 py-3 bg-blue-gray-600/20 hover:bg-blue-gray-600/30 backdrop-blur-sm border border-blue-gray-500/30 rounded-lg text-blue-gray-200 font-medium transition-all duration-200 disabled:opacity-50"
              >
                Keep Account
              </button>
              <button
                onClick={confirmRemoveAccount}
                disabled={removeAccountMutation.isPending}
                className="px-6 py-3 bg-red-600 hover:bg-red-600/90 text-white font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {removeAccountMutation.isPending && (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                )}
                Remove Account
              </button>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-blue-gray-800/30 backdrop-blur-sm border border-blue-gray-700/30 rounded-xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-blue-gray-700/30">
          <h2 className="text-lg font-bold text-white">Bank Connection</h2>
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="p-1 text-blue-gray-400 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="relative">
          {getStepContent()}
        </div>

        {/* Progress indicator for multi-step flow */}
        {['preparing', 'linking', 'verifying'].includes(currentStep) && (
          <div className="px-6 pb-4">
            <div className="w-full bg-blue-gray-700/30 rounded-full h-1">
              <div
                className="bg-golden-400 h-1 rounded-full transition-all duration-500"
                style={{
                  width: currentStep === 'preparing' ? '33%' :
                        currentStep === 'linking' ? '66%' :
                        '100%'
                }}
              />
            </div>
          </div>
        )}

      </div>
    </div>
  )
}