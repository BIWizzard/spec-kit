'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

interface ResetPasswordFormData {
  password: string
  confirmPassword: string
}

interface ResetPasswordFormProps {
  onSuccess?: () => void
}

export default function ResetPasswordForm({ onSuccess }: ResetPasswordFormProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [formData, setFormData] = useState<ResetPasswordFormData>({
    password: '',
    confirmPassword: '',
  })
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [errors, setErrors] = useState<Partial<ResetPasswordFormData & { token: string }>>({})
  const [token, setToken] = useState<string>('')

  useEffect(() => {
    const tokenParam = searchParams.get('token')
    if (!tokenParam) {
      setErrors({ token: 'Invalid or missing reset token' })
    } else {
      setToken(tokenParam)
    }
  }, [searchParams])

  const validatePassword = (password: string): string[] => {
    const issues = []
    if (password.length < 12) issues.push('At least 12 characters')
    if (!/[a-z]/.test(password)) issues.push('One lowercase letter')
    if (!/[A-Z]/.test(password)) issues.push('One uppercase letter')
    if (!/\d/.test(password)) issues.push('One number')
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) issues.push('One special character')
    return issues
  }

  const validateForm = (): boolean => {
    const newErrors: Partial<ResetPasswordFormData> = {}

    const passwordIssues = validatePassword(formData.password)
    if (passwordIssues.length > 0) {
      newErrors.password = `Password must include: ${passwordIssues.join(', ')}`
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!token) {
      setErrors({ token: 'Invalid or missing reset token' })
      return
    }

    if (!validateForm()) return

    setIsLoading(true)

    try {
      // TODO: Replace with actual API call
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          password: formData.password,
        }),
      })

      if (response.ok) {
        setIsSuccess(true)
        onSuccess?.()

        // Show success toast if available
        if (typeof window !== 'undefined' && 'showToast' in window) {
          ;(window as any).showToast(
            'Password updated!',
            'Your password has been successfully changed.',
            'success'
          )
        }

        // Redirect to login after 3 seconds
        setTimeout(() => {
          router.push('/login?message=password-reset-success')
        }, 3000)
      } else {
        const error = await response.json()
        if (error.code === 'TOKEN_EXPIRED') {
          setErrors({ token: 'Reset link has expired. Please request a new one.' })
        } else if (error.code === 'TOKEN_INVALID') {
          setErrors({ token: 'Invalid reset link. Please request a new one.' })
        } else {
          setErrors({ password: error.message || 'Unable to reset password. Please try again.' })
        }
      }
    } catch (error) {
      console.error('Reset password error:', error)
      setErrors({ password: 'Unable to reset password. Please try again.' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (field: keyof ResetPasswordFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))

    // Clear errors when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  // Show error state for invalid/missing token
  if (errors.token) {
    return (
      <div className="text-center space-y-6">
        <div className="text-6xl mb-4">⚠️</div>

        <div>
          <h3 className="text-error text-lg font-semibold mb-2">
            Invalid Reset Link
          </h3>
          <p className="text-secondary text-sm">
            {errors.token}
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <Link href="/forgot-password" className="glass-button-primary">
            Request new reset link
          </Link>

          <Link href="/login" className="glass-button-ghost">
            Back to sign in
          </Link>
        </div>
      </div>
    )
  }

  if (isSuccess) {
    return (
      <div className="text-center space-y-6">
        <div className="text-6xl mb-4">✅</div>

        <div>
          <h3 className="text-success text-lg font-semibold mb-2">
            Password Updated!
          </h3>
          <p className="text-secondary text-sm">
            Your password has been successfully changed.
          </p>
        </div>

        <div className="glass-card-sm bg-success/5 border-success/20">
          <p className="text-xs text-secondary">
            You'll be redirected to the sign-in page in a few seconds, or you can click below.
          </p>
        </div>

        <Link href="/login" className="glass-button-primary inline-block">
          Sign in with new password
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* New Password */}
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-primary mb-2">
          New Password
        </label>
        <div className="relative">
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            required
            value={formData.password}
            onChange={(e) => handleInputChange('password', e.target.value)}
            className={`glass-input pr-12 ${errors.password ? 'border-error focus:border-error' : ''}`}
            placeholder="Create a strong password"
            disabled={isLoading}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted hover:text-primary transition-colors"
            disabled={isLoading}
          >
            {showPassword ? '🙈' : '👁️'}
          </button>
        </div>
        {errors.password && (
          <p className="text-error text-xs mt-1 flex items-center gap-1">
            <span>⚠️</span>
            {errors.password}
          </p>
        )}

        {/* Password strength indicator */}
        {formData.password && (
          <div className="mt-2 space-y-1">
            <div className="text-xs text-muted">Password strength:</div>
            <div className="flex gap-1">
              {Array.from({ length: 4 }, (_, i) => {
                const passwordIssues = validatePassword(formData.password)
                const strength = 4 - passwordIssues.length
                return (
                  <div
                    key={i}
                    className={`h-1 flex-1 rounded ${
                      i < strength
                        ? strength <= 1
                          ? 'bg-error'
                          : strength <= 2
                          ? 'bg-warning'
                          : 'bg-success'
                        : 'bg-glass-border'
                    }`}
                  />
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Confirm Password */}
      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-primary mb-2">
          Confirm New Password
        </label>
        <div className="relative">
          <input
            id="confirmPassword"
            type={showConfirmPassword ? 'text' : 'password'}
            autoComplete="new-password"
            required
            value={formData.confirmPassword}
            onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
            className={`glass-input pr-12 ${errors.confirmPassword ? 'border-error focus:border-error' : ''}`}
            placeholder="Confirm your new password"
            disabled={isLoading}
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted hover:text-primary transition-colors"
            disabled={isLoading}
          >
            {showConfirmPassword ? '🙈' : '👁️'}
          </button>
        </div>
        {errors.confirmPassword && (
          <p className="text-error text-xs mt-1 flex items-center gap-1">
            <span>⚠️</span>
            {errors.confirmPassword}
          </p>
        )}
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full glass-button-primary py-3 font-semibold"
      >
        {isLoading ? (
          <div className="flex items-center justify-center gap-2">
            <div className="w-4 h-4 border-2 border-bg-primary border-t-transparent rounded-full animate-spin" />
            Updating password...
          </div>
        ) : (
          'Update password'
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