'use client'

import { useState, useEffect } from 'react'
import { Shield, Lock, RefreshCw, AlertTriangle, CheckCircle, X, ExternalLink } from 'lucide-react'
import { useMutation } from '@tanstack/react-query'

interface PlaidLinkConfig {
  linkToken: string
  publicKey: string
  environment: 'sandbox' | 'development' | 'production'
}

interface PlaidHandler {
  open: () => void
  exit: () => void
  destroy: () => void
}

interface BankAccount {
  id: string
  institutionName: string
  accountName: string
  accountType: string
  accountNumber: string
  currentBalance: number
}

declare global {
  interface Window {
    Plaid: {
      create: (config: {
        token: string
        onSuccess: (publicToken: string, metadata: any) => void
        onExit: (error: any, metadata: any) => void
        onEvent: (eventName: string, metadata: any) => void
      }) => PlaidHandler
    }
  }
}

interface ConnectBankModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: (accounts: BankAccount[]) => void
  onError?: (error: string) => void
}

export default function ConnectBankModal({
  isOpen,
  onClose,
  onSuccess,
  onError
}: ConnectBankModalProps) {
  const [linkConfig, setLinkConfig] = useState<PlaidLinkConfig | null>(null)
  const [plaidHandler, setPlaidHandler] = useState<PlaidHandler | null>(null)
  const [isLoadingScript, setIsLoadingScript] = useState(true)
  const [connectionStep, setConnectionStep] = useState<'prepare' | 'connecting' | 'success' | 'error'>('prepare')
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [connectedAccounts, setConnectedAccounts] = useState<BankAccount[]>([])

  const linkTokenMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/plaid/link-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({ userId: 'temp-user-id' }) // Would use actual user ID
      })
      if (!response.ok) throw new Error('Failed to create link token')
      return response.json()
    },
    onSuccess: (data) => {
      setLinkConfig(data)
    },
    onError: (error) => {
      console.error('Failed to get link token:', error)
      setErrorMessage('Failed to initialize bank connection. Please check your internet connection and try again.')
      setConnectionStep('error')
      onError?.('Failed to initialize bank connection')
    }
  })

  const exchangeTokenMutation = useMutation({
    mutationFn: async ({ publicToken, metadata }: { publicToken: string; metadata: any }) => {
      const response = await fetch('/api/bank-accounts/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({ publicToken, metadata })
      })
      if (!response.ok) throw new Error('Failed to connect bank account')
      return response.json()
    },
    onSuccess: (data) => {
      setConnectionStep('success')
      setConnectedAccounts(data.accounts || [])
      onSuccess?.(data.accounts || [])
    },
    onError: (error) => {
      console.error('Failed to exchange token:', error)
      setConnectionStep('error')
      setErrorMessage('Failed to connect your bank account. This might be due to a temporary issue with your bank. Please try again.')
      onError?.('Failed to connect bank account')
    }
  })

  // Load Plaid script and initialize
  useEffect(() => {
    if (!isOpen) return

    // Reset state when modal opens
    setConnectionStep('prepare')
    setErrorMessage('')
    setConnectedAccounts([])

    // Get link token
    linkTokenMutation.mutate()

    // Load Plaid script
    const loadPlaidScript = () => {
      if (window.Plaid) {
        setIsLoadingScript(false)
        return
      }

      const script = document.createElement('script')
      script.src = 'https://cdn.plaid.com/link/v2/stable/link-initialize.js'
      script.onload = () => setIsLoadingScript(false)
      script.onerror = () => {
        setErrorMessage('Failed to load secure connection service. Please check your internet connection and try again.')
        setConnectionStep('error')
        setIsLoadingScript(false)
        onError?.('Failed to load Plaid')
      }
      document.head.appendChild(script)
    }

    loadPlaidScript()

    // Cleanup function
    return () => {
      if (plaidHandler) {
        plaidHandler.destroy()
        setPlaidHandler(null)
      }
    }
  }, [isOpen])

  // Initialize Plaid handler when script and config are ready
  useEffect(() => {
    if (!isLoadingScript && linkConfig && window.Plaid && !plaidHandler && isOpen) {
      const handler = window.Plaid.create({
        token: linkConfig.linkToken,
        onSuccess: (publicToken: string, metadata: any) => {
          setConnectionStep('connecting')
          exchangeTokenMutation.mutate({ publicToken, metadata })
        },
        onExit: (error: any, metadata: any) => {
          if (error) {
            console.error('Plaid Link exit error:', error)
            setConnectionStep('error')
            setErrorMessage('Bank connection was cancelled or failed. Please try again or contact your bank if the issue persists.')
            onError?.('Connection cancelled or failed')
          }
          // If no error, user cancelled intentionally - don't show error
        },
        onEvent: (eventName: string, metadata: any) => {
          console.log('Plaid event:', eventName, metadata)
        }
      })

      setPlaidHandler(handler)
    }
  }, [isLoadingScript, linkConfig, plaidHandler, exchangeTokenMutation, isOpen])

  const handleConnectClick = () => {
    if (plaidHandler) {
      plaidHandler.open()
    }
  }

  const handleRetryConnection = () => {
    setConnectionStep('prepare')
    setErrorMessage('')
    setConnectedAccounts([])
    linkTokenMutation.mutate()
  }

  const handleClose = () => {
    if (plaidHandler) {
      plaidHandler.destroy()
      setPlaidHandler(null)
    }
    setConnectionStep('prepare')
    setErrorMessage('')
    setConnectedAccounts([])
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg max-h-[90vh] bg-blue-gray-900/95 backdrop-blur-xl border border-blue-gray-700/50 rounded-xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-blue-gray-700/50">
          <div>
            <h2 className="text-xl font-semibold text-white">Connect Bank Account</h2>
            <p className="text-blue-gray-300 text-sm mt-1">Secure connection powered by Plaid</p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-blue-gray-400 hover:text-white hover:bg-blue-gray-700/50 rounded-lg transition-all duration-200"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[calc(90vh-160px)] overflow-y-auto">
          {connectionStep === 'prepare' && (
            <div className="space-y-6">
              {/* Security Icon */}
              <div className="text-center">
                <div className="w-16 h-16 bg-golden-500/20 backdrop-blur-sm border border-golden-400/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-8 h-8 text-golden-400" />
                </div>
                <h3 className="text-lg font-medium text-white mb-2">Bank-Level Security</h3>
                <p className="text-blue-gray-300 text-sm">
                  Your credentials are encrypted and never shared with us
                </p>
              </div>

              {/* Security Features */}
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-3 bg-blue-gray-800/30 backdrop-blur-sm border border-blue-gray-700/30 rounded-lg">
                  <div className="w-8 h-8 bg-sage-500/20 backdrop-blur-sm border border-sage-400/30 rounded-full flex items-center justify-center flex-shrink-0">
                    <Lock className="w-4 h-4 text-sage-400" />
                  </div>
                  <div>
                    <h4 className="font-medium text-white text-sm mb-1">256-bit Encryption</h4>
                    <p className="text-blue-gray-400 text-xs">
                      Your login credentials are protected with the same encryption banks use
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-blue-gray-800/30 backdrop-blur-sm border border-blue-gray-700/30 rounded-lg">
                  <div className="w-8 h-8 bg-sage-500/20 backdrop-blur-sm border border-sage-400/30 rounded-full flex items-center justify-center flex-shrink-0">
                    <RefreshCw className="w-4 h-4 text-sage-400" />
                  </div>
                  <div>
                    <h4 className="font-medium text-white text-sm mb-1">Read-Only Access</h4>
                    <p className="text-blue-gray-400 text-xs">
                      We can only view your transactions, never move money or change accounts
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-blue-gray-800/30 backdrop-blur-sm border border-blue-gray-700/30 rounded-lg">
                  <div className="w-8 h-8 bg-sage-500/20 backdrop-blur-sm border border-sage-400/30 rounded-full flex items-center justify-center flex-shrink-0">
                    <Shield className="w-4 h-4 text-sage-400" />
                  </div>
                  <div>
                    <h4 className="font-medium text-white text-sm mb-1">Trusted by Millions</h4>
                    <p className="text-blue-gray-400 text-xs">
                      Plaid is used by leading financial apps and trusted by major banks
                    </p>
                  </div>
                </div>
              </div>

              {/* Supported Account Types */}
              <div className="bg-blue-gray-800/20 backdrop-blur-sm border border-blue-gray-700/30 rounded-lg p-4">
                <h4 className="font-medium text-white mb-3 text-sm">Supported Account Types:</h4>
                <div className="grid grid-cols-2 gap-2 text-blue-gray-300 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-golden-400">•</span>
                    Checking accounts
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-golden-400">•</span>
                    Savings accounts
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-golden-400">•</span>
                    Credit cards
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-golden-400">•</span>
                    Investment accounts
                  </div>
                </div>
              </div>

              {/* Connect Button */}
              <button
                onClick={handleConnectClick}
                disabled={!plaidHandler || linkTokenMutation.isPending || isLoadingScript}
                className="w-full py-3 bg-gradient-to-r from-golden-500/20 to-golden-400/20 backdrop-blur-sm border border-golden-400/50 rounded-lg text-golden-200 hover:from-golden-500/30 hover:to-golden-400/30 hover:border-golden-400/70 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {linkTokenMutation.isPending || isLoadingScript ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Preparing Connection...
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4" />
                    Connect Securely
                  </>
                )}
              </button>
            </div>
          )}

          {connectionStep === 'connecting' && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-blue-gray-600/30 backdrop-blur-sm border border-blue-gray-500/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <RefreshCw className="w-8 h-8 text-blue-gray-300 animate-spin" />
              </div>
              <h3 className="text-lg font-medium text-white mb-2">Connecting Your Account</h3>
              <p className="text-blue-gray-300 text-sm mb-6">
                Please wait while we securely connect your bank account...
              </p>
              <div className="bg-blue-gray-800/30 backdrop-blur-sm border border-blue-gray-700/30 rounded-lg p-4">
                <div className="flex items-center justify-center gap-2 text-blue-gray-300 text-sm">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Processing secure connection...</span>
                </div>
              </div>
            </div>
          )}

          {connectionStep === 'success' && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-sage-500/20 backdrop-blur-sm border border-sage-400/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-sage-400" />
              </div>
              <h3 className="text-lg font-medium text-white mb-2">Successfully Connected!</h3>
              <p className="text-blue-gray-300 text-sm mb-6">
                {connectedAccounts.length === 1
                  ? 'Your bank account has been connected successfully.'
                  : `${connectedAccounts.length} bank accounts have been connected successfully.`
                }
              </p>

              {/* Connected Accounts List */}
              {connectedAccounts.length > 0 && (
                <div className="bg-sage-800/20 backdrop-blur-sm border border-sage-700/30 rounded-lg p-4 mb-6">
                  <h4 className="font-medium text-sage-200 text-sm mb-3">Connected Accounts:</h4>
                  <div className="space-y-2">
                    {connectedAccounts.map((account, index) => (
                      <div key={account.id} className="flex items-center justify-between text-xs">
                        <span className="text-sage-300">
                          {account.institutionName} - {account.accountName}
                        </span>
                        <span className="text-sage-400 font-medium">
                          •••{account.accountNumber.slice(-4)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-sage-800/20 backdrop-blur-sm border border-sage-700/30 rounded-lg p-3 mb-6">
                <p className="text-sage-300 text-xs">
                  <CheckCircle className="w-3 h-3 inline mr-1" />
                  We're now syncing your transactions. This may take a few minutes.
                </p>
              </div>

              <button
                onClick={handleClose}
                className="w-full py-3 bg-gradient-to-r from-golden-500/20 to-golden-400/20 backdrop-blur-sm border border-golden-400/50 rounded-lg text-golden-200 hover:from-golden-500/30 hover:to-golden-400/30 hover:border-golden-400/70 transition-all duration-200 font-medium"
              >
                Done
              </button>
            </div>
          )}

          {connectionStep === 'error' && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-red-500/20 backdrop-blur-sm border border-red-400/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-red-400" />
              </div>
              <h3 className="text-lg font-medium text-white mb-2">Connection Failed</h3>
              <p className="text-blue-gray-300 text-sm mb-6">
                {errorMessage || 'Something went wrong while connecting your bank account.'}
              </p>

              <div className="bg-red-800/20 backdrop-blur-sm border border-red-700/30 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                  <div className="text-left">
                    <p className="text-red-300 text-xs mb-2">Common solutions:</p>
                    <ul className="text-red-300 text-xs space-y-1">
                      <li>• Check your internet connection</li>
                      <li>• Verify your bank credentials are correct</li>
                      <li>• Try again in a few minutes</li>
                      <li>• Contact your bank if issues persist</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleRetryConnection}
                  className="flex-1 py-3 bg-gradient-to-r from-golden-500/20 to-golden-400/20 backdrop-blur-sm border border-golden-400/50 rounded-lg text-golden-200 hover:from-golden-500/30 hover:to-golden-400/30 hover:border-golden-400/70 transition-all duration-200 font-medium text-sm"
                >
                  Try Again
                </button>
                <button
                  onClick={handleClose}
                  className="flex-1 py-3 bg-blue-gray-600/20 backdrop-blur-sm border border-blue-gray-500/30 rounded-lg text-blue-gray-200 hover:bg-blue-gray-600/30 hover:border-blue-gray-500/50 transition-all duration-200 font-medium text-sm"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer - Plaid branding and security notice */}
        <div className="border-t border-blue-gray-700/30 p-4">
          <div className="flex items-center justify-center gap-2 text-blue-gray-400 text-xs">
            <Shield className="w-4 h-4" />
            <span>Powered by Plaid</span>
            <span>•</span>
            <span>Bank-level security</span>
            <span>•</span>
            <a
              href="https://plaid.com/safety"
              target="_blank"
              rel="noopener noreferrer"
              className="text-golden-400 hover:text-golden-300 flex items-center gap-1"
            >
              Learn more <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}