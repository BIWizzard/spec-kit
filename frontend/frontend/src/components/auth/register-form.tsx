'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface RegisterFormData {
  familyName: string
  firstName: string
  lastName: string
  email: string
  password: string
  confirmPassword: string
  agreeToTerms: boolean
  subscribeToUpdates: boolean
}

interface RegisterFormProps {
  onSuccess?: () => void
  redirectTo?: string
}

export default function RegisterForm({ onSuccess, redirectTo = '/verify-email' }: RegisterFormProps) {
  const router = useRouter()
  const [formData, setFormData] = useState<RegisterFormData>({
    familyName: '',
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    agreeToTerms: false,
    subscribeToUpdates: true,
  })
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [errors, setErrors] = useState<Partial<RegisterFormData>>({})

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
    const newErrors: Partial<RegisterFormData> = {}

    if (!formData.familyName.trim()) {
      newErrors.familyName = 'Family name is required'
    }

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required'
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required'
    }

    if (!formData.email) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address'
    }

    const passwordIssues = validatePassword(formData.password)
    if (passwordIssues.length > 0) {
      newErrors.password = `Password must include: ${passwordIssues.join(', ')}`
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
    }

    if (!formData.agreeToTerms) {
      newErrors.agreeToTerms = 'You must agree to the Terms of Service'
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
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          familyName: formData.familyName.trim(),
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          email: formData.email,
          password: formData.password,
          subscribeToUpdates: formData.subscribeToUpdates,
        }),
      })

      if (response.ok) {
        const result = await response.json()

        // Handle successful registration
        onSuccess?.()
        router.push(`${redirectTo}?email=${encodeURIComponent(formData.email)}`)

        // Show success toast if available
        if (typeof window !== 'undefined' && 'showToast' in window) {
          ;(window as any).showToast('Account created!', 'Please check your email to verify your account.', 'success')
        }
      } else {
        const error = await response.json()
        if (error.field) {
          setErrors({ [error.field]: error.message })
        } else {
          setErrors({ email: error.message || 'Registration failed. Please try again.' })
        }
      }
    } catch (error) {
      console.error('Registration error:', error)
      setErrors({ email: 'Unable to create account. Please try again.' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (field: keyof RegisterFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))

    // Clear errors when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Family Name */}
      <div>
        <label htmlFor="familyName" className="block text-sm font-medium text-primary mb-2">
          Family Name
        </label>
        <input
          id="familyName"
          type="text"
          required
          value={formData.familyName}
          onChange={(e) => handleInputChange('familyName', e.target.value)}
          className={`glass-input ${errors.familyName ? 'border-error focus:border-error' : ''}`}
          placeholder="The Smith Family"
          disabled={isLoading}
        />
        {errors.familyName && (
          <p className="text-error text-xs mt-1 flex items-center gap-1">
            <span>⚠️</span>
            {errors.familyName}
          </p>
        )}
      </div>

      {/* First & Last Name */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="firstName" className="block text-sm font-medium text-primary mb-2">
            First Name
          </label>
          <input
            id="firstName"
            type="text"
            autoComplete="given-name"
            required
            value={formData.firstName}
            onChange={(e) => handleInputChange('firstName', e.target.value)}
            className={`glass-input ${errors.firstName ? 'border-error focus:border-error' : ''}`}
            placeholder="John"
            disabled={isLoading}
          />
          {errors.firstName && (
            <p className="text-error text-xs mt-1 flex items-center gap-1">
              <span>⚠️</span>
              {errors.firstName}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="lastName" className="block text-sm font-medium text-primary mb-2">
            Last Name
          </label>
          <input
            id="lastName"
            type="text"
            autoComplete="family-name"
            required
            value={formData.lastName}
            onChange={(e) => handleInputChange('lastName', e.target.value)}
            className={`glass-input ${errors.lastName ? 'border-error focus:border-error' : ''}`}
            placeholder="Smith"
            disabled={isLoading}
          />
          {errors.lastName && (
            <p className="text-error text-xs mt-1 flex items-center gap-1">
              <span>⚠️</span>
              {errors.lastName}
            </p>
          )}
        </div>
      </div>

      {/* Email */}
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
          placeholder="john@example.com"
          disabled={isLoading}
        />
        {errors.email && (
          <p className="text-error text-xs mt-1 flex items-center gap-1">
            <span>⚠️</span>
            {errors.email}
          </p>
        )}
      </div>

      {/* Password */}
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-primary mb-2">
          Password
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
      </div>

      {/* Confirm Password */}
      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-primary mb-2">
          Confirm Password
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
            placeholder="Confirm your password"
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

      {/* Checkboxes */}
      <div className="space-y-3">
        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            checked={formData.agreeToTerms}
            onChange={(e) => handleInputChange('agreeToTerms', e.target.checked)}
            className={`w-4 h-4 rounded border-glass-border focus:ring-kgiq-primary text-kgiq-primary mt-0.5 ${
              errors.agreeToTerms ? 'border-error' : ''
            }`}
            disabled={isLoading}
          />
          <span className="text-secondary">
            I agree to the{' '}
            <Link href="/terms" className="text-accent hover:underline">
              Terms of Service
            </Link>
            {' '}and{' '}
            <Link href="/privacy" className="text-accent hover:underline">
              Privacy Policy
            </Link>
          </span>
        </label>
        {errors.agreeToTerms && (
          <p className="text-error text-xs flex items-center gap-1 ml-7">
            <span>⚠️</span>
            {errors.agreeToTerms}
          </p>
        )}

        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            checked={formData.subscribeToUpdates}
            onChange={(e) => handleInputChange('subscribeToUpdates', e.target.checked)}
            className="w-4 h-4 rounded border-glass-border focus:ring-kgiq-primary text-kgiq-primary mt-0.5"
            disabled={isLoading}
          />
          <span className="text-secondary">
            Send me updates about new features and financial tips
          </span>
        </label>
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
            Creating account...
          </div>
        ) : (
          'Create KGiQ Account'
        )}
      </button>
    </form>
  )
}