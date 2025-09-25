'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface PaymentFormData {
  description: string
  payee: string
  amount: string
  dueDate: string
  category: 'housing' | 'utilities' | 'insurance' | 'debt' | 'subscription' | 'other'
  isRecurring: boolean
  frequency?: 'weekly' | 'bi-weekly' | 'monthly' | 'quarterly' | 'annually'
  bankAccountId?: string
  notes: string
  tags: string[]
  priority: 'low' | 'medium' | 'high'
  autoPay: boolean
  sendReminders: boolean
}

interface PaymentFormProps {
  mode: 'create' | 'edit'
  paymentId?: string
  onSuccess?: () => void
  onCancel?: () => void
}

const categoryOptions = [
  { value: 'housing', label: 'Housing', icon: '🏠', description: 'Rent, mortgage, property taxes' },
  { value: 'utilities', label: 'Utilities', icon: '💡', description: 'Electric, gas, water, internet' },
  { value: 'insurance', label: 'Insurance', icon: '🛡️', description: 'Health, auto, home insurance' },
  { value: 'debt', label: 'Debt', icon: '💳', description: 'Credit cards, loans, payments' },
  { value: 'subscription', label: 'Subscription', icon: '📱', description: 'Streaming, software, memberships' },
  { value: 'other', label: 'Other', icon: '💸', description: 'Other regular payments' }
]

const frequencyOptions = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'bi-weekly', label: 'Bi-weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'annually', label: 'Annually' }
]

const bankAccountOptions = [
  { id: '1', name: 'Chase Checking', number: '(...4567)', type: 'checking' },
  { id: '2', name: 'Wells Fargo Savings', number: '(...8901)', type: 'savings' },
  { id: '3', name: 'Bank of America Checking', number: '(...2345)', type: 'checking' }
]

export default function PaymentForm({ mode, paymentId, onSuccess, onCancel }: PaymentFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentTag, setCurrentTag] = useState('')

  const [formData, setFormData] = useState<PaymentFormData>({
    description: '',
    payee: '',
    amount: '',
    dueDate: '',
    category: 'other',
    isRecurring: false,
    frequency: undefined,
    bankAccountId: '',
    notes: '',
    tags: [],
    priority: 'medium',
    autoPlay: false,
    sendReminders: true
  })

  // Load existing payment data for edit mode
  useEffect(() => {
    if (mode === 'edit' && paymentId) {
      // In real app, this would fetch from API
      // For now, using mock data
      setFormData({
        description: 'Monthly Rent Payment',
        payee: 'Johnson Property Management',
        amount: '1200',
        dueDate: '2024-02-01',
        category: 'housing',
        isRecurring: true,
        frequency: 'monthly',
        bankAccountId: '1',
        notes: 'Due on 1st of each month',
        tags: ['rent', 'housing'],
        priority: 'high',
        autoPlay: false,
        sendReminders: true
      })
    }
  }, [mode, paymentId])

  const handleInputChange = (field: keyof PaymentFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))

    // Clear error when user starts typing
    if (error) setError(null)
  }

  const addTag = () => {
    if (currentTag.trim() && !formData.tags.includes(currentTag.trim())) {
      handleInputChange('tags', [...formData.tags, currentTag.trim()])
      setCurrentTag('')
    }
  }

  const removeTag = (tagToRemove: string) => {
    handleInputChange('tags', formData.tags.filter(tag => tag !== tagToRemove))
  }

  const validateForm = (): string | null => {
    if (!formData.description.trim()) return 'Description is required'
    if (!formData.payee.trim()) return 'Payee is required'
    if (!formData.amount || parseFloat(formData.amount) <= 0) return 'Valid amount is required'
    if (!formData.dueDate) return 'Due date is required'
    if (formData.isRecurring && !formData.frequency) return 'Frequency is required for recurring payments'
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      // In real app, this would call the API
      const endpoint = mode === 'edit' ? `/api/payments/${paymentId}` : '/api/payments'
      const method = mode === 'edit' ? 'PUT' : 'POST'

      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Success
      onSuccess?.()

      if (!onSuccess) {
        router.push('/payments')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save payment')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="glass-card p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-primary">
            {mode === 'edit' ? 'Edit Payment' : 'Create New Payment'}
          </h2>
          <p className="text-muted mt-1">
            {mode === 'edit' ? 'Update payment details' : 'Add a new payment to track'}
          </p>
        </div>
        <div className="text-3xl">💸</div>
      </div>

      {error && (
        <div className="glass-card bg-error/10 border-error/20 p-4 mb-6">
          <div className="flex items-center gap-2 text-error">
            <span>⚠️</span>
            <span className="font-medium">{error}</span>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Description */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-primary mb-2">
              Payment Description *
            </label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="e.g., Monthly rent payment, Electric bill"
              className="w-full px-4 py-3 bg-glass-bg border border-glass-border/50 rounded-lg text-primary placeholder-muted focus:outline-none focus:ring-2 focus:ring-kgiq-primary/50 focus:border-kgiq-primary/50 transition-colors"
            />
          </div>

          {/* Payee */}
          <div>
            <label className="block text-sm font-medium text-primary mb-2">
              Payee *
            </label>
            <input
              type="text"
              value={formData.payee}
              onChange={(e) => handleInputChange('payee', e.target.value)}
              placeholder="e.g., Johnson Property Management"
              className="w-full px-4 py-3 bg-glass-bg border border-glass-border/50 rounded-lg text-primary placeholder-muted focus:outline-none focus:ring-2 focus:ring-kgiq-primary/50 focus:border-kgiq-primary/50 transition-colors"
            />
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-primary mb-2">
              Amount *
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted">$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.amount}
                onChange={(e) => handleInputChange('amount', e.target.value)}
                placeholder="0.00"
                className="w-full pl-8 pr-4 py-3 bg-glass-bg border border-glass-border/50 rounded-lg text-primary placeholder-muted focus:outline-none focus:ring-2 focus:ring-kgiq-primary/50 focus:border-kgiq-primary/50 transition-colors"
              />
            </div>
          </div>

          {/* Due Date */}
          <div>
            <label className="block text-sm font-medium text-primary mb-2">
              Due Date *
            </label>
            <input
              type="date"
              value={formData.dueDate}
              onChange={(e) => handleInputChange('dueDate', e.target.value)}
              className="w-full px-4 py-3 bg-glass-bg border border-glass-border/50 rounded-lg text-primary focus:outline-none focus:ring-2 focus:ring-kgiq-primary/50 focus:border-kgiq-primary/50 transition-colors"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-primary mb-2">
              Category
            </label>
            <select
              value={formData.category}
              onChange={(e) => handleInputChange('category', e.target.value)}
              className="w-full px-4 py-3 bg-glass-bg border border-glass-border/50 rounded-lg text-primary focus:outline-none focus:ring-2 focus:ring-kgiq-primary/50 focus:border-kgiq-primary/50 transition-colors"
            >
              {categoryOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.icon} {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Recurring Payment */}
        <div className="glass-card bg-glass-bg-light p-4">
          <div className="flex items-center gap-3 mb-3">
            <input
              type="checkbox"
              id="isRecurring"
              checked={formData.isRecurring}
              onChange={(e) => handleInputChange('isRecurring', e.target.checked)}
              className="w-4 h-4 text-kgiq-primary border-glass-border/50 rounded focus:ring-2 focus:ring-kgiq-primary/50"
            />
            <label htmlFor="isRecurring" className="text-primary font-medium">
              🔄 This is a recurring payment
            </label>
          </div>

          {formData.isRecurring && (
            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                Frequency *
              </label>
              <select
                value={formData.frequency || ''}
                onChange={(e) => handleInputChange('frequency', e.target.value)}
                className="w-full px-4 py-3 bg-glass-bg border border-glass-border/50 rounded-lg text-primary focus:outline-none focus:ring-2 focus:ring-kgiq-primary/50 focus:border-kgiq-primary/50 transition-colors"
              >
                <option value="">Select frequency</option>
                {frequencyOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Bank Account */}
        <div>
          <label className="block text-sm font-medium text-primary mb-2">
            Payment Account
          </label>
          <select
            value={formData.bankAccountId || ''}
            onChange={(e) => handleInputChange('bankAccountId', e.target.value)}
            className="w-full px-4 py-3 bg-glass-bg border border-glass-border/50 rounded-lg text-primary focus:outline-none focus:ring-2 focus:ring-kgiq-primary/50 focus:border-kgiq-primary/50 transition-colors"
          >
            <option value="">Select account</option>
            {bankAccountOptions.map(account => (
              <option key={account.id} value={account.id}>
                {account.name} {account.number}
              </option>
            ))}
          </select>
        </div>

        {/* Priority & Settings */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-primary mb-2">
              Priority
            </label>
            <select
              value={formData.priority}
              onChange={(e) => handleInputChange('priority', e.target.value)}
              className="w-full px-4 py-3 bg-glass-bg border border-glass-border/50 rounded-lg text-primary focus:outline-none focus:ring-2 focus:ring-kgiq-primary/50 focus:border-kgiq-primary/50 transition-colors"
            >
              <option value="low">🟢 Low</option>
              <option value="medium">🟡 Medium</option>
              <option value="high">🔴 High</option>
            </select>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="autoPlay"
              checked={formData.autoPlay}
              onChange={(e) => handleInputChange('autoPlay', e.target.checked)}
              className="w-4 h-4 text-kgiq-primary border-glass-border/50 rounded focus:ring-2 focus:ring-kgiq-primary/50"
            />
            <label htmlFor="autoPlay" className="ml-3 text-sm text-primary">
              🏦 Enable AutoPay
            </label>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="sendReminders"
              checked={formData.sendReminders}
              onChange={(e) => handleInputChange('sendReminders', e.target.checked)}
              className="w-4 h-4 text-kgiq-primary border-glass-border/50 rounded focus:ring-2 focus:ring-kgiq-primary/50"
            />
            <label htmlFor="sendReminders" className="ml-3 text-sm text-primary">
              🔔 Send Reminders
            </label>
          </div>
        </div>

        {/* Tags */}
        <div>
          <label className="block text-sm font-medium text-primary mb-2">
            Tags
          </label>
          <div className="flex items-center gap-2 mb-2">
            <input
              type="text"
              value={currentTag}
              onChange={(e) => setCurrentTag(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
              placeholder="Add a tag..."
              className="flex-1 px-4 py-2 bg-glass-bg border border-glass-border/50 rounded-lg text-primary placeholder-muted focus:outline-none focus:ring-2 focus:ring-kgiq-primary/50 focus:border-kgiq-primary/50 transition-colors"
            />
            <button
              type="button"
              onClick={addTag}
              className="px-4 py-2 bg-kgiq-primary/20 text-kgiq-primary border border-kgiq-primary/50 rounded-lg hover:bg-kgiq-primary/30 transition-colors"
            >
              Add
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {formData.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-3 py-1 bg-accent/20 text-accent rounded-full text-sm"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="text-accent hover:text-error transition-colors"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-primary mb-2">
            Notes
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) => handleInputChange('notes', e.target.value)}
            placeholder="Additional notes about this payment..."
            rows={3}
            className="w-full px-4 py-3 bg-glass-bg border border-glass-border/50 rounded-lg text-primary placeholder-muted focus:outline-none focus:ring-2 focus:ring-kgiq-primary/50 focus:border-kgiq-primary/50 transition-colors resize-none"
          />
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-between pt-6 border-t border-glass-border/30">
          <button
            type="button"
            onClick={() => onCancel ? onCancel() : router.back()}
            className="px-6 py-3 text-muted hover:text-primary border border-glass-border/50 rounded-lg hover:border-glass-border transition-colors"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={isSubmitting}
            className="px-8 py-3 bg-kgiq-primary text-white font-medium rounded-lg hover:bg-kgiq-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {isSubmitting && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            {mode === 'edit' ? 'Update Payment' : 'Create Payment'}
          </button>
        </div>
      </form>

      {/* KGiQ Footer */}
      <div className="flex items-center justify-center mt-8 pt-6 border-t border-glass-border/30">
        <div className="text-xs text-muted flex items-center gap-2">
          <span className="text-kgiq-primary">💸</span>
          <span>Payment management powered by KGiQ Finance</span>
        </div>
      </div>
    </div>
  )
}