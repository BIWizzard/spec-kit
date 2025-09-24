'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'

interface MFASetupProps {
  onSuccess?: (recoveryCode: string) => void
  onSkip?: () => void
  required?: boolean
}

interface MFASetupData {
  secret: string
  qrCode: string
  recoveryCode: string
  verificationCode: string
}

export default function MFASetup({ onSuccess, onSkip, required = false }: MFASetupProps) {
  const [step, setStep] = useState<'intro' | 'setup' | 'verify' | 'complete'>('intro')
  const [mfaData, setMfaData] = useState<MFASetupData>({
    secret: '',
    qrCode: '',
    recoveryCode: '',
    verificationCode: '',
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string>('')

  // Generate MFA setup data
  useEffect(() => {
    if (step === 'setup' && !mfaData.secret) {
      generateMFASetup()
    }
  }, [step, mfaData.secret])

  const generateMFASetup = async () => {
    setIsLoading(true)
    try {
      // TODO: Replace with actual API call
      const response = await fetch('/api/auth/mfa/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const data = await response.json()
        setMfaData({
          secret: data.secret,
          qrCode: data.qrCode,
          recoveryCode: data.recoveryCode,
          verificationCode: '',
        })
      } else {
        setError('Failed to generate MFA setup. Please try again.')
      }
    } catch (err) {
      setError('Failed to generate MFA setup. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerifyMFA = async () => {
    if (!mfaData.verificationCode || mfaData.verificationCode.length !== 6) {
      setError('Please enter a 6-digit verification code')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      // TODO: Replace with actual API call
      const response = await fetch('/api/auth/mfa/enable', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          secret: mfaData.secret,
          code: mfaData.verificationCode,
        }),
      })

      if (response.ok) {
        setStep('complete')
      } else {
        const error = await response.json()
        setError(error.message || 'Invalid verification code. Please try again.')
      }
    } catch (err) {
      setError('Failed to verify code. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleComplete = () => {
    onSuccess?.(mfaData.recoveryCode)
  }

  const handleSkip = () => {
    if (required) return
    onSkip?.()
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      // Show success toast if available
      if (typeof window !== 'undefined' && 'showToast' in window) {
        ;(window as any).showToast('Copied!', `${label} copied to clipboard`, 'success')
      }
    }).catch(() => {
      console.log(`${label}:`, text)
      alert(`${label} logged to console: ${text}`)
    })
  }

  // Intro Step
  if (step === 'intro') {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="text-6xl mb-4">🔐</div>
          <h3 className="text-primary text-lg font-semibold mb-2">
            Secure Your Account
          </h3>
          <p className="text-secondary text-sm">
            Set up two-factor authentication to add an extra layer of security to your KGiQ account
          </p>
        </div>

        <div className="space-y-4">
          <div className="glass-card-sm bg-success/5 border-success/20">
            <div className="flex items-start gap-3">
              <span className="text-success text-lg flex-shrink-0">🛡️</span>
              <div className="text-xs text-secondary">
                <p className="font-semibold text-success mb-1">Why enable 2FA?</p>
                <ul className="space-y-1">
                  <li>• Protects your financial data from unauthorized access</li>
                  <li>• Required for family administrators</li>
                  <li>• Prevents account takeover even if password is compromised</li>
                  <li>• Industry standard for financial applications</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="glass-card-sm bg-info/5 border-info/20">
            <div className="flex items-start gap-3">
              <span className="text-info text-lg flex-shrink-0">📱</span>
              <div className="text-xs text-secondary">
                <p className="font-semibold text-info mb-1">You'll need:</p>
                <ul className="space-y-1">
                  <li>• A smartphone or tablet</li>
                  <li>• An authenticator app (Google Authenticator, Authy, etc.)</li>
                  <li>• About 2-3 minutes to set up</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={() => setStep('setup')}
            className="glass-button-primary"
          >
            Set up 2FA now
          </button>

          {!required && (
            <button
              onClick={handleSkip}
              className="glass-button-ghost text-sm"
            >
              Skip for now
            </button>
          )}
        </div>
      </div>
    )
  }

  // Setup Step
  if (step === 'setup') {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="text-4xl mb-4">📲</div>
          <h3 className="text-primary text-lg font-semibold mb-2">
            Scan QR Code
          </h3>
          <p className="text-secondary text-sm">
            Use your authenticator app to scan this QR code
          </p>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin text-accent text-2xl mb-4">⟳</div>
            <p className="text-secondary">Generating setup code...</p>
          </div>
        ) : mfaData.qrCode ? (
          <div className="space-y-4">
            <div className="flex justify-center">
              <div className="glass-card-sm p-4">
                <Image
                  src={mfaData.qrCode}
                  alt="MFA QR Code"
                  width={200}
                  height={200}
                  className="rounded"
                />
              </div>
            </div>

            <div className="glass-card-sm bg-warning/5 border-warning/20">
              <div className="space-y-3">
                <p className="text-xs font-semibold text-warning">
                  Can't scan the QR code?
                </p>
                <p className="text-xs text-secondary">
                  Manually enter this secret key in your authenticator app:
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs font-mono bg-glass-bg px-2 py-1 rounded">
                    {mfaData.secret}
                  </code>
                  <button
                    onClick={() => copyToClipboard(mfaData.secret, 'Secret key')}
                    className="glass-button-ghost p-2 text-xs"
                  >
                    Copy
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-6">
            <p className="text-error">Failed to generate QR code</p>
            <button
              onClick={generateMFASetup}
              className="glass-button-ghost mt-2"
            >
              Try again
            </button>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={() => setStep('verify')}
            disabled={!mfaData.secret}
            className="flex-1 glass-button-primary"
          >
            I've added it to my app
          </button>

          <button
            onClick={() => setStep('intro')}
            className="glass-button-ghost"
          >
            Back
          </button>
        </div>
      </div>
    )
  }

  // Verify Step
  if (step === 'verify') {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="text-4xl mb-4">🔢</div>
          <h3 className="text-primary text-lg font-semibold mb-2">
            Enter Verification Code
          </h3>
          <p className="text-secondary text-sm">
            Enter the 6-digit code from your authenticator app
          </p>
        </div>

        <div>
          <label htmlFor="verificationCode" className="block text-sm font-medium text-primary mb-2">
            Verification Code
          </label>
          <input
            id="verificationCode"
            type="text"
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            value={mfaData.verificationCode}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, '')
              setMfaData(prev => ({ ...prev, verificationCode: value }))
              setError('')
            }}
            className={`glass-input text-center text-lg tracking-widest ${error ? 'border-error' : ''}`}
            placeholder="000000"
            disabled={isLoading}
          />
          {error && (
            <p className="text-error text-xs mt-1 flex items-center gap-1">
              <span>⚠️</span>
              {error}
            </p>
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleVerifyMFA}
            disabled={isLoading || mfaData.verificationCode.length !== 6}
            className="flex-1 glass-button-primary"
          >
            {isLoading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-bg-primary border-t-transparent rounded-full animate-spin" />
                Verifying...
              </div>
            ) : (
              'Verify & Enable'
            )}
          </button>

          <button
            onClick={() => setStep('setup')}
            disabled={isLoading}
            className="glass-button-ghost"
          >
            Back
          </button>
        </div>
      </div>
    )
  }

  // Complete Step
  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="text-6xl mb-4">✅</div>
        <h3 className="text-success text-lg font-semibold mb-2">
          2FA Setup Complete!
        </h3>
        <p className="text-secondary text-sm">
          Your account is now protected with two-factor authentication
        </p>
      </div>

      <div className="glass-card-sm bg-error/5 border-error/20">
        <div className="flex items-start gap-3">
          <span className="text-error text-lg flex-shrink-0">🔑</span>
          <div className="text-xs text-secondary">
            <p className="font-semibold text-error mb-2">
              IMPORTANT: Save your recovery code
            </p>
            <p className="mb-2">
              If you lose access to your authenticator app, you can use this recovery code to regain access:
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs font-mono bg-glass-bg px-2 py-1 rounded text-primary">
                {mfaData.recoveryCode}
              </code>
              <button
                onClick={() => copyToClipboard(mfaData.recoveryCode, 'Recovery code')}
                className="glass-button-ghost p-1 text-xs"
              >
                Copy
              </button>
            </div>
            <p className="mt-2 text-xs">
              Store this code in a safe place. You'll need it if you lose your phone.
            </p>
          </div>
        </div>
      </div>

      <button
        onClick={handleComplete}
        className="w-full glass-button-primary"
      >
        Continue to Dashboard
      </button>
    </div>
  )
}