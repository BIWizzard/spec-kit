'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, Shield, Lock, RefreshCw } from 'lucide-react'
import { useRouter } from 'next/navigation'
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

export default function ConnectBankPage() {
  const [linkConfig, setLinkConfig] = useState<PlaidLinkConfig | null>(null)
  const [plaidHandler, setPlaidHandler] = useState<PlaidHandler | null>(null)
  const [isLoadingScript, setIsLoadingScript] = useState(true)
  const [connectionStep, setConnectionStep] = useState<'prepare' | 'connecting' | 'success' | 'error'>('prepare')
  const [errorMessage, setErrorMessage] = useState<string>('')
  const router = useRouter()

  const linkTokenMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/plaid/link-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      if (!response.ok) throw new Error('Failed to create link token')
      return response.json()
    },
    onSuccess: (data) => {
      setLinkConfig(data)
    },
    onError: (error) => {
      console.error('Failed to get link token:', error)
      setErrorMessage('Failed to initialize bank connection. Please try again.')
    }
  })

  const exchangeTokenMutation = useMutation({
    mutationFn: async ({ publicToken, metadata }: { publicToken: string; metadata: any }) => {
      const response = await fetch('/api/bank-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicToken, metadata })
      })
      if (!response.ok) throw new Error('Failed to connect bank account')
      return response.json()
    },
    onSuccess: () => {
      setConnectionStep('success')
    },
    onError: (error) => {
      console.error('Failed to exchange token:', error)
      setConnectionStep('error')
      setErrorMessage('Failed to connect your bank account. Please try again.')
    }
  })

  useEffect(() => {
    linkTokenMutation.mutate()
  }, [])

  useEffect(() => {
    const loadPlaidScript = () => {
      if (window.Plaid) {
        setIsLoadingScript(false)
        return
      }

      const script = document.createElement('script')
      script.src = 'https://cdn.plaid.com/link/v2/stable/link-initialize.js'
      script.onload = () => setIsLoadingScript(false)
      script.onerror = () => {
        setErrorMessage('Failed to load Plaid. Please check your connection and try again.')
        setIsLoadingScript(false)
      }
      document.head.appendChild(script)
    }

    loadPlaidScript()
  }, [])

  useEffect(() => {
    if (!isLoadingScript && linkConfig && window.Plaid && !plaidHandler) {
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
            setErrorMessage('Bank connection was cancelled or failed. Please try again.')
          }
        },
        onEvent: (eventName: string, metadata: any) => {
          console.log('Plaid event:', eventName, metadata)
        }
      })

      setPlaidHandler(handler)
    }
  }, [isLoadingScript, linkConfig, plaidHandler, exchangeTokenMutation])

  const handleConnectClick = () => {
    if (plaidHandler) {
      plaidHandler.open()
    }
  }

  const handleRetryConnection = () => {
    setConnectionStep('prepare')
    setErrorMessage('')
    linkTokenMutation.mutate()
  }

  const handleGoToDashboard = () => {
    router.push('/bank-accounts')
  }

  const renderContent = () => {
    switch (connectionStep) {
      case 'prepare':
        return (
          <>
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-golden-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-golden-400" />
              </div>
              <h2 className="text-2xl font-semibold text-white mb-2">Connect Your Bank Account</h2>
              <p className="text-blue-gray-300">
                Securely connect your bank account to start tracking your finances automatically
              </p>
            </div>

            <div className="space-y-6 mb-8">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-sage-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <Lock className="w-4 h-4 text-sage-400" />
                </div>
                <div>
                  <h3 className="font-medium text-white mb-1">Bank-Level Security</h3>
                  <p className="text-blue-gray-300 text-sm">
                    We use Plaid's secure technology, trusted by thousands of financial apps. Your login credentials are never shared with us.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-sage-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <RefreshCw className="w-4 h-4 text-sage-400" />
                </div>
                <div>
                  <h3 className="font-medium text-white mb-1">Automatic Updates</h3>
                  <p className="text-blue-gray-300 text-sm">
                    Your transactions and balances will sync automatically, so you always have up-to-date information.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-sage-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <Shield className="w-4 h-4 text-sage-400" />
                </div>
                <div>
                  <h3 className="font-medium text-white mb-1">Read-Only Access</h3>
                  <p className="text-blue-gray-300 text-sm">
                    We can only view your account information. We cannot move money or make changes to your accounts.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-blue-gray-800/30 rounded-lg p-4 mb-6">
              <h4 className="font-medium text-white mb-2">Supported Account Types:</h4>
              <div className="grid grid-cols-2 gap-2 text-blue-gray-300 text-sm">
                <div>• Checking accounts</div>
                <div>• Savings accounts</div>
                <div>• Credit cards</div>
                <div>• Investment accounts</div>
              </div>
            </div>

            <button
              onClick={handleConnectClick}
              disabled={!plaidHandler || linkTokenMutation.isPending}
              className="w-full py-3 bg-golden-500/20 backdrop-blur-sm border border-golden-400/30 rounded-lg text-golden-200 hover:bg-golden-500/30 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {linkTokenMutation.isPending || isLoadingScript ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Preparing Connection...
                </>
              ) : (
                'Connect Bank Account'
              )}
            </button>
          </>
        )

      case 'connecting':
        return (
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-gray-600/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <RefreshCw className="w-8 h-8 text-blue-gray-300 animate-spin" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">Connecting Your Account</h2>
            <p className="text-blue-gray-300 mb-6">
              Please wait while we securely connect your bank account...
            </p>
            <div className="bg-blue-gray-800/30 rounded-lg p-4">
              <div className="flex items-center justify-center gap-2 text-blue-gray-300">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Processing connection...</span>
              </div>
            </div>
          </div>
        )

      case 'success':
        return (
          <div className="text-center">
            <div className="w-16 h-16 bg-sage-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-sage-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">Successfully Connected!</h2>
            <p className="text-blue-gray-300 mb-6">
              Your bank account has been connected and we're now syncing your transactions.
            </p>
            <div className="bg-sage-800/30 rounded-lg p-4 mb-6">
              <p className="text-sage-300 text-sm">
                It may take a few minutes for all your transactions to appear. You can view your accounts now.
              </p>
            </div>
            <button
              onClick={handleGoToDashboard}
              className="w-full py-3 bg-golden-500/20 backdrop-blur-sm border border-golden-400/30 rounded-lg text-golden-200 hover:bg-golden-500/30 transition-all duration-200 font-medium"
            >
              View Bank Accounts
            </button>
          </div>
        )

      case 'error':
        return (
          <div className="text-center">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">Connection Failed</h2>
            <p className="text-blue-gray-300 mb-6">
              {errorMessage || 'Something went wrong while connecting your bank account.'}
            </p>
            <div className="bg-red-800/30 rounded-lg p-4 mb-6">
              <p className="text-red-300 text-sm">
                This might be due to a temporary issue with your bank or network. Please try again.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleRetryConnection}
                className="flex-1 py-3 bg-golden-500/20 backdrop-blur-sm border border-golden-400/30 rounded-lg text-golden-200 hover:bg-golden-500/30 transition-all duration-200 font-medium"
              >
                Try Again
              </button>
              <button
                onClick={() => router.push('/bank-accounts')}
                className="flex-1 py-3 bg-blue-gray-600/20 backdrop-blur-sm border border-blue-gray-500/30 rounded-lg text-blue-gray-200 hover:bg-blue-gray-600/30 transition-all duration-200 font-medium"
              >
                Go Back
              </button>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-gray-900 via-blue-gray-800 to-blue-gray-900 p-6">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.push('/bank-accounts')}
            className="w-10 h-10 bg-blue-gray-800/50 backdrop-blur-sm border border-blue-gray-700/50 rounded-lg flex items-center justify-center text-blue-gray-300 hover:text-white hover:bg-blue-gray-700/50 transition-all duration-200"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-semibold text-white">Connect Bank Account</h1>
            <p className="text-blue-gray-400 text-sm">Step-by-step secure connection</p>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-blue-gray-800/20 backdrop-blur-sm border border-blue-gray-700/30 rounded-xl p-6">
          {renderContent()}
        </div>

        {/* Security Notice */}
        <div className="mt-6 bg-blue-gray-800/10 backdrop-blur-sm border border-blue-gray-700/20 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-sage-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-white text-sm mb-1">Powered by Plaid</h4>
              <p className="text-blue-gray-300 text-xs">
                Your data is protected by bank-level security and encryption.
                We never see or store your banking credentials.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}