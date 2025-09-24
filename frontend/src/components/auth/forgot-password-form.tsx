'use client'

import { useState } from 'react'
import Link from 'next/link'

interface ForgotPasswordFormData {
  email: string
}

interface ForgotPasswordFormProps {
  onSuccess?: (email: string) => void
}

export default function ForgotPasswordForm({ onSuccess }: ForgotPasswordFormProps) {
  const [formData, setFormData] = useState<ForgotPasswordFormData>({
    email: '',
  })
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [errors, setErrors] = useState<Partial<ForgotPasswordFormData>>({})

  const validateForm = (): boolean => {
    const newErrors: Partial<ForgotPasswordFormData> = {}

    if (!formData.email) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    setIsLoading(true)

    try {
      // TODO: Replace with actual API call
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
        }),
      })

      if (response.ok) {
        setIsSuccess(true)
        onSuccess?.(formData.email)

        // Show success toast if available
        if (typeof window !== 'undefined' && 'showToast' in window) {
          ;(window as any).showToast(
            'Reset email sent!',
            'Check your email for password reset instructions.',
            'success'
          )
        }
      } else {
        const error = await response.json()
        setErrors({ email: error.message || 'Unable to send reset email. Please try again.' })
      }
    } catch (error) {
      console.error('Forgot password error:', error)
      setErrors({ email: 'Unable to send reset email. Please try again.' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (field: keyof ForgotPasswordFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))

    // Clear errors when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  const handleResend = () => {
    setIsSuccess(false)
    setErrors({})
    handleSubmit({ preventDefault: () => {} } as React.FormEvent)
  }

  if (isSuccess) {
    return (
      <div className="text-center space-y-6">
        <div className="text-6xl mb-4">📧</div>

        <div>
          <h3 className="text-primary text-lg font-semibold mb-2">
            Check your email
          </h3>
          <p className="text-secondary text-sm">
            We've sent a password reset link to{' '}
            <span className="text-accent font-medium">{formData.email}</span>
          </p>
        </div>

        <div className="glass-card-sm bg-info/5 border-info/20 text-left">
          <div className="flex items-start gap-3">
            <span className="text-info text-lg flex-shrink-0">💡</span>
            <div className="text-xs text-secondary">
              <p className="font-semibold text-info mb-1">Next steps:</p>
              <ul className="space-y-1">
                <li>• Check your email inbox</li>
                <li>• Look for an email from KGiQ</li>
                <li>• Click the reset link within 15 minutes</li>
                <li>• Create your new password</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={handleResend}
            disabled={isLoading}
            className="glass-button-ghost"
          >
            {isLoading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Resending...
              </div>
            ) : (
              'Resend email'
            )}
          </button>

          <Link href="/login" className="glass-button-primary text-center">
            Back to sign in
          </Link>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-primary mb-2">
          Email Address
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={formData.email}
          onChange={(e) => handleInputChange('email', e.target.value)}
          className={`glass-input ${errors.email ? 'border-error focus:border-error' : ''}`}
          placeholder="Enter your email address"
          disabled={isLoading}
        />
        {errors.email && (
          <p className="text-error text-xs mt-1 flex items-center gap-1">
            <span>⚠️</span>
            {errors.email}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full glass-button-primary py-3 font-semibold"
      >
        {isLoading ? (
          <div className="flex items-center justify-center gap-2">
            <div className="w-4 h-4 border-2 border-bg-primary border-t-transparent rounded-full animate-spin" />
            Sending reset email...
          </div>
        ) : (
          'Send reset email'
        )}
      </button>

      <div className="text-center">
        <Link href="/login" className="text-sm text-secondary hover:text-primary transition-colors">
          ← Back to sign in
        </Link>
      </div>
    </form>
  )
}