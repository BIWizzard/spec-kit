'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface LoginFormData {
  email: string
  password: string
  rememberMe: boolean
}

interface LoginFormProps {
  onSuccess?: () => void
  redirectTo?: string
}

export default function LoginForm({ onSuccess, redirectTo = '/dashboard' }: LoginFormProps) {
  const router = useRouter()
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: '',
    rememberMe: false,
  })
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState<Partial<LoginFormData>>({})

  const validateForm = (): boolean => {
    const newErrors: Partial<LoginFormData> = {}

    if (!formData.email) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address'
    }

    if (!formData.password) {
      newErrors.password = 'Password is required'
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
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          rememberMe: formData.rememberMe,
        }),
      })

      if (response.ok) {
        const result = await response.json()

        // Handle successful login
        onSuccess?.()
        router.push(redirectTo)

        // Show success toast if available
        if (typeof window !== 'undefined' && 'showToast' in window) {
          ;(window as any).showToast('Welcome back!', 'You have successfully signed in to KGiQ.', 'success')
        }
      } else {
        const error = await response.json()
        setErrors({ email: error.message || 'Invalid email or password' })
      }
    } catch (error) {
      console.error('Login error:', error)
      setErrors({ email: 'Unable to sign in. Please try again.' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (field: keyof LoginFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))

    // Clear errors when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Email Field */}
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

      {/* Password Field */}
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-primary mb-2">
          Password
        </label>
        <div className="relative">
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            required
            value={formData.password}
            onChange={(e) => handleInputChange('password', e.target.value)}
            className={`glass-input pr-12 ${errors.password ? 'border-error focus:border-error' : ''}`}
            placeholder="Enter your password"
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
      </div>

      {/* Remember Me & Forgot Password */}
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={formData.rememberMe}
            onChange={(e) => handleInputChange('rememberMe', e.target.checked)}
            className="w-4 h-4 rounded border-glass-border focus:ring-kgiq-primary text-kgiq-primary"
            disabled={isLoading}
          />
          <span className="text-secondary">Remember me</span>
        </label>

        <Link
          href="/forgot-password"
          className="text-sm text-accent hover:text-primary transition-colors"
        >
          Forgot password?
        </Link>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full glass-button-primary py-3 font-semibold relative"
      >
        {isLoading ? (
          <div className="flex items-center justify-center gap-2">
            <div className="w-4 h-4 border-2 border-bg-primary border-t-transparent rounded-full animate-spin" />
            Signing in...
          </div>
        ) : (
          'Sign In'
        )}
      </button>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-glass-border" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-bg-primary px-2 text-muted">Or continue with</span>
        </div>
      </div>

      {/* OAuth Buttons (Placeholder for future implementation) */}
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          disabled
          className="glass-button-ghost py-3 flex items-center justify-center gap-2 opacity-50 cursor-not-allowed"
        >
          <span>🔗</span>
          Google
        </button>
        <button
          type="button"
          disabled
          className="glass-button-ghost py-3 flex items-center justify-center gap-2 opacity-50 cursor-not-allowed"
        >
          <span>🔗</span>
          Apple
        </button>
      </div>

      {/* Security Note */}
      <div className="text-xs text-muted text-center">
        By signing in, you agree to our{' '}
        <Link href="/terms" className="text-accent hover:underline">
          Terms of Service
        </Link>
        {' '}and{' '}
        <Link href="/privacy" className="text-accent hover:underline">
          Privacy Policy
        </Link>
      </div>
    </form>
  )
}