'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

interface EmailVerificationProps {
  onSuccess?: () => void
  onResend?: (email: string) => void
}

export default function EmailVerification({ onSuccess, onResend }: EmailVerificationProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'verifying' | 'success' | 'error' | 'expired' | 'invalid'>('verifying')
  const [email, setEmail] = useState<string>('')
  const [newEmail, setNewEmail] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [countdown, setCountdown] = useState<number>(60)
  const [canResend, setCanResend] = useState<boolean>(false)

  useEffect(() => {
    const token = searchParams.get('token')
    const emailParam = searchParams.get('email')

    if (emailParam) {
      setEmail(decodeURIComponent(emailParam))
    }

    if (token) {
      verifyEmail(token)
    } else {
      setStatus('invalid')
    }
  }, [searchParams])

  // Countdown timer for resend
  useEffect(() => {
    if (countdown > 0 && (status === 'expired' || status === 'error')) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    } else if (countdown === 0) {
      setCanResend(true)
    }
  }, [countdown, status])

  const verifyEmail = async (token: string) => {
    try {
      // TODO: Replace with actual API call
      const response = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      })

      if (response.ok) {
        const data = await response.json()
        setStatus('success')
        setEmail(data.email || email)
        onSuccess?.()

        // Show success toast if available
        if (typeof window !== 'undefined' && 'showToast' in window) {
          ;(window as any).showToast('Email verified!', 'Your email has been successfully verified.', 'success')
        }

        // Auto-redirect to dashboard after 3 seconds
        setTimeout(() => {
          router.push('/dashboard')
        }, 3000)
      } else {
        const error = await response.json()
        if (error.code === 'TOKEN_EXPIRED') {
          setStatus('expired')
        } else if (error.code === 'TOKEN_INVALID' || error.code === 'TOKEN_USED') {
          setStatus('invalid')
        } else {
          setStatus('error')
          setError(error.message || 'Failed to verify email')
        }
      }
    } catch (err) {
      setStatus('error')
      setError('Network error. Please try again.')
    }
  }

  const handleResendVerification = async () => {
    const emailToUse = newEmail || email

    if (!emailToUse) {
      setError('Please enter your email address')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      // TODO: Replace with actual API call
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: emailToUse }),
      })

      if (response.ok) {
        setEmail(emailToUse)
        setNewEmail('')
        setCountdown(60)
        setCanResend(false)
        onResend?.(emailToUse)

        // Show success toast if available
        if (typeof window !== 'undefined' && 'showToast' in window) {
          ;(window as any).showToast('Verification sent!', 'Check your email for the verification link.', 'success')
        }
      } else {
        const error = await response.json()
        setError(error.message || 'Failed to resend verification email')
      }
    } catch (err) {
      setError('Failed to resend verification email')
    } finally {
      setIsLoading(false)
    }
  }

  // Verifying state
  if (status === 'verifying') {
    return (
      <div className="text-center space-y-6">
        <div className="animate-spin text-accent text-4xl mb-4">⟳</div>
        <div>
          <h3 className="text-primary text-lg font-semibold mb-2">
            Verifying your email...
          </h3>
          <p className="text-secondary text-sm">
            Please wait while we verify your email address
          </p>
        </div>
      </div>
    )
  }

  // Success state
  if (status === 'success') {
    return (
      <div className="text-center space-y-6">
        <div className="text-6xl mb-4">✅</div>

        <div>
          <h3 className="text-success text-lg font-semibold mb-2">
            Email Verified!
          </h3>
          <p className="text-secondary text-sm">
            Your email address has been successfully verified.
            {email && (
              <>
                <br />
                <span className="text-accent font-medium">{email}</span>
              </>
            )}
          </p>
        </div>

        <div className="glass-card-sm bg-success/5 border-success/20">
          <p className="text-xs text-secondary">
            You'll be redirected to your dashboard in a few seconds, or you can click below.
          </p>
        </div>

        <Link href="/dashboard" className="glass-button-primary inline-block">
          Go to Dashboard
        </Link>
      </div>
    )
  }

  // Error states (expired, invalid, or general error)
  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="text-6xl mb-4">
          {status === 'expired' ? '⏰' : status === 'invalid' ? '❌' : '⚠️'}
        </div>

        <div>
          <h3 className="text-error text-lg font-semibold mb-2">
            {status === 'expired'
              ? 'Verification Link Expired'
              : status === 'invalid'
              ? 'Invalid Verification Link'
              : 'Verification Failed'
            }
          </h3>
          <p className="text-secondary text-sm">
            {status === 'expired'
              ? 'Your verification link has expired. We can send you a new one.'
              : status === 'invalid'
              ? 'This verification link is invalid or has already been used.'
              : error || 'Something went wrong while verifying your email.'
            }
          </p>
        </div>
      </div>

      {/* Resend verification form */}
      {(status === 'expired' || status === 'error') && (
        <div className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-primary mb-2">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={newEmail || email}
              onChange={(e) => setNewEmail(e.target.value)}
              className="glass-input"
              placeholder="Enter your email address"
              disabled={isLoading || !canResend}
            />
          </div>

          <button
            onClick={handleResendVerification}
            disabled={isLoading || !canResend}
            className="w-full glass-button-primary"
          >
            {isLoading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-bg-primary border-t-transparent rounded-full animate-spin" />
                Sending verification...
              </div>
            ) : !canResend ? (
              `Resend in ${countdown}s`
            ) : (
              'Send new verification email'
            )}
          </button>

          {error && (
            <p className="text-error text-xs text-center flex items-center justify-center gap-1">
              <span>⚠️</span>
              {error}
            </p>
          )}
        </div>
      )}

      {/* Navigation links */}
      <div className="text-center space-y-4">
        <div className="text-sm">
          <Link
            href="/login"
            className="text-accent hover:text-primary transition-colors font-medium"
          >
            Back to sign in
          </Link>
        </div>

        {status === 'invalid' && (
          <div className="text-sm">
            <span className="text-secondary">Need help? </span>
            <a
              href="mailto:support@kgiq.dev"
              className="text-accent hover:text-primary transition-colors"
            >
              Contact support
            </a>
          </div>
        )}
      </div>
    </div>
  )
}