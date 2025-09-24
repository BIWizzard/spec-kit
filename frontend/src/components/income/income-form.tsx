'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface IncomeFormData {
  description: string
  source: string
  expectedAmount: string
  expectedDate: string
  category: 'salary' | 'freelance' | 'bonus' | 'tax_refund' | 'investment' | 'other'
  isRecurring: boolean
  frequency?: 'weekly' | 'bi-weekly' | 'monthly' | 'quarterly' | 'annually'
  bankAccountId?: string
  notes: string
  tags: string[]
  priority: 'low' | 'medium' | 'high'
  autoAttribute: boolean
  sendReminders: boolean
}

interface IncomeFormProps {
  mode: 'create' | 'edit'
  incomeId?: string
  onSuccess?: () => void
  onCancel?: () => void
}

const categoryOptions = [
  { value: 'salary', label: 'Salary', icon: '💼', description: 'Regular employment income' },
  { value: 'freelance', label: 'Freelance', icon: '🎨', description: 'Project-based work' },
  { value: 'bonus', label: 'Bonus', icon: '🎁', description: 'Performance or holiday bonuses' },
  { value: 'tax_refund', label: 'Tax Refund', icon: '🏛️', description: 'Government tax returns' },
  { value: 'investment', label: 'Investment', icon: '📈', description: 'Dividends and returns' },
  { value: 'other', label: 'Other', icon: '💰', description: 'Other income sources' }
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

export default function IncomeForm({ mode, incomeId, onSuccess, onCancel }: IncomeFormProps) {
  const router = useRouter()
  const [formData, setFormData] = useState<IncomeFormData>({
    description: '',
    source: '',
    expectedAmount: '',
    expectedDate: '',
    category: 'salary',
    isRecurring: false,
    notes: '',
    tags: [],
    priority: 'medium',
    autoAttribute: true,
    sendReminders: true
  })

  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<keyof IncomeFormData, string>>>({})
  const [tagInput, setTagInput] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)

  // Load existing data for edit mode
  useEffect(() => {
    if (mode === 'edit' && incomeId) {
      // Mock data loading - would come from API in real app
      setFormData({
        description: 'Monthly Salary - December 2024',
        source: 'ABC Corp',
        expectedAmount: '2100.00',
        expectedDate: '2024-12-15',
        category: 'salary',
        isRecurring: true,
        frequency: 'monthly',
        bankAccountId: '1',
        notes: 'Regular biweekly payroll deposit',
        tags: ['payroll', 'monthly'],
        priority: 'high',
        autoAttribute: true,
        sendReminders: true
      })
    }
  }, [mode, incomeId])

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof IncomeFormData, string>> = {}

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required'
    }

    if (!formData.source.trim()) {
      newErrors.source = 'Income source is required'
    }

    if (!formData.expectedAmount) {
      newErrors.expectedAmount = 'Expected amount is required'
    } else {
      const amount = parseFloat(formData.expectedAmount)
      if (isNaN(amount) || amount <= 0) {
        newErrors.expectedAmount = 'Amount must be a positive number'
      }
    }

    if (!formData.expectedDate) {
      newErrors.expectedDate = 'Expected date is required'
    } else {
      const selectedDate = new Date(formData.expectedDate)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      if (selectedDate < today) {
        newErrors.expectedDate = 'Expected date cannot be in the past'
      }
    }

    if (formData.isRecurring && !formData.frequency) {
      newErrors.frequency = 'Frequency is required for recurring income'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    setIsLoading(true)
    try {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 1500))

      if (mode === 'create') {
        console.log('Creating income event:', formData)
        router.push('/income')
      } else {
        console.log('Updating income event:', incomeId, formData)
        router.push(`/income/${incomeId}`)
      }

      onSuccess?.()
    } catch (error) {
      console.error('Form submission error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    if (onCancel) {
      onCancel()
    } else {
      router.back()
    }
  }

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }))
      setTagInput('')
    }
  }

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }))
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addTag()
    }
  }

  const selectedCategory = categoryOptions.find(cat => cat.value === formData.category)

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      {/* Basic Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-primary flex items-center gap-2">
          <span className="text-kgiq-primary">📋</span>
          Basic Information
        </h3>

        {/* Description */}
        <div className="space-y-2">
          <label htmlFor="description" className="block text-sm font-medium text-primary">
            Description <span className="text-error">*</span>
          </label>
          <input
            type="text"
            id="description"
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            className={`w-full px-4 py-3 bg-glass-bg border rounded-lg focus:outline-none focus:ring-2 focus:ring-kgiq-primary/50 transition-colors ${
              errors.description ? 'border-error' : 'border-glass-border/50'
            }`}
            placeholder="e.g., Monthly Salary - December 2024"
          />
          {errors.description && (
            <p className="text-sm text-error flex items-center gap-1">
              <span>⚠️</span> {errors.description}
            </p>
          )}
        </div>

        {/* Source */}
        <div className="space-y-2">
          <label htmlFor="source" className="block text-sm font-medium text-primary">
            Income Source <span className="text-error">*</span>
          </label>
          <input
            type="text"
            id="source"
            value={formData.source}
            onChange={(e) => setFormData(prev => ({ ...prev, source: e.target.value }))}
            className={`w-full px-4 py-3 bg-glass-bg border rounded-lg focus:outline-none focus:ring-2 focus:ring-kgiq-primary/50 transition-colors ${
              errors.source ? 'border-error' : 'border-glass-border/50'
            }`}
            placeholder="e.g., ABC Corporation, XYZ Client"
          />
          {errors.source && (
            <p className="text-sm text-error flex items-center gap-1">
              <span>⚠️</span> {errors.source}
            </p>
          )}
        </div>

        {/* Amount and Date */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label htmlFor="expectedAmount" className="block text-sm font-medium text-primary">
              Expected Amount <span className="text-error">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted">$</span>
              <input
                type="number"
                id="expectedAmount"
                value={formData.expectedAmount}
                onChange={(e) => setFormData(prev => ({ ...prev, expectedAmount: e.target.value }))}
                className={`w-full pl-8 pr-4 py-3 bg-glass-bg border rounded-lg focus:outline-none focus:ring-2 focus:ring-kgiq-primary/50 transition-colors ${
                  errors.expectedAmount ? 'border-error' : 'border-glass-border/50'
                }`}
                placeholder="0.00"
                step="0.01"
                min="0"
              />
            </div>
            {errors.expectedAmount && (
              <p className="text-sm text-error flex items-center gap-1">
                <span>⚠️</span> {errors.expectedAmount}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="expectedDate" className="block text-sm font-medium text-primary">
              Expected Date <span className="text-error">*</span>
            </label>
            <input
              type="date"
              id="expectedDate"
              value={formData.expectedDate}
              onChange={(e) => setFormData(prev => ({ ...prev, expectedDate: e.target.value }))}
              className={`w-full px-4 py-3 bg-glass-bg border rounded-lg focus:outline-none focus:ring-2 focus:ring-kgiq-primary/50 transition-colors ${
                errors.expectedDate ? 'border-error' : 'border-glass-border/50'
              }`}
            />
            {errors.expectedDate && (
              <p className="text-sm text-error flex items-center gap-1">
                <span>⚠️</span> {errors.expectedDate}
              </p>
            )}
          </div>
        </div>

        {/* Category */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-primary">
            Income Category <span className="text-error">*</span>
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {categoryOptions.map((category) => (
              <label
                key={category.value}
                className={`relative flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                  formData.category === category.value
                    ? 'border-kgiq-primary bg-kgiq-primary/10'
                    : 'border-glass-border/50 hover:border-kgiq-primary/30'
                }`}
              >
                <input
                  type="radio"
                  name="category"
                  value={category.value}
                  checked={formData.category === category.value}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value as any }))}
                  className="sr-only"
                />
                <span className="text-xl">{category.icon}</span>
                <div>
                  <p className="font-medium text-primary">{category.label}</p>
                  <p className="text-xs text-muted">{category.description}</p>
                </div>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Recurring Settings */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-primary flex items-center gap-2">
          <span className="text-kgiq-secondary">🔄</span>
          Recurring Settings
        </h3>

        <div className="flex items-center gap-3">
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={formData.isRecurring}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                isRecurring: e.target.checked,
                frequency: e.target.checked ? prev.frequency || 'monthly' : undefined
              }))}
              className="sr-only peer"
            />
            <div className="relative w-11 h-6 bg-glass-bg peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-kgiq-primary/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-kgiq-primary border border-glass-border/50"></div>
          </label>
          <span className="text-primary">This is a recurring income event</span>
        </div>

        {formData.isRecurring && (
          <div className="space-y-2">
            <label htmlFor="frequency" className="block text-sm font-medium text-primary">
              Frequency <span className="text-error">*</span>
            </label>
            <select
              id="frequency"
              value={formData.frequency || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, frequency: e.target.value as any }))}
              className={`w-full px-4 py-3 bg-glass-bg border rounded-lg focus:outline-none focus:ring-2 focus:ring-kgiq-primary/50 transition-colors ${
                errors.frequency ? 'border-error' : 'border-glass-border/50'
              }`}
            >
              <option value="">Select frequency</option>
              {frequencyOptions.map((freq) => (
                <option key={freq.value} value={freq.value}>{freq.label}</option>
              ))}
            </select>
            {errors.frequency && (
              <p className="text-sm text-error flex items-center gap-1">
                <span>⚠️</span> {errors.frequency}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Advanced Options */}
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-2 text-accent hover:text-primary transition-colors"
        >
          <span className={`transform transition-transform ${showAdvanced ? 'rotate-90' : ''}`}>
            ▶️
          </span>
          Advanced Options
        </button>

        {showAdvanced && (
          <div className="space-y-4 pl-6 border-l-2 border-glass-border/30">

            {/* Bank Account */}
            <div className="space-y-2">
              <label htmlFor="bankAccount" className="block text-sm font-medium text-primary">
                Bank Account (Optional)
              </label>
              <select
                id="bankAccount"
                value={formData.bankAccountId || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, bankAccountId: e.target.value || undefined }))}
                className="w-full px-4 py-3 bg-glass-bg border border-glass-border/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-kgiq-primary/50 transition-colors"
              >
                <option value="">Select bank account</option>
                {bankAccountOptions.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name} {account.number} ({account.type})
                  </option>
                ))}
              </select>
            </div>

            {/* Priority */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-primary">Priority</label>
              <div className="flex gap-3">
                {[
                  { value: 'low', label: 'Low', color: 'text-muted' },
                  { value: 'medium', label: 'Medium', color: 'text-warning' },
                  { value: 'high', label: 'High', color: 'text-error' }
                ].map((priority) => (
                  <label
                    key={priority.value}
                    className={`flex items-center gap-2 p-3 border rounded-lg cursor-pointer transition-colors ${
                      formData.priority === priority.value
                        ? 'border-kgiq-primary bg-kgiq-primary/10'
                        : 'border-glass-border/50 hover:border-kgiq-primary/30'
                    }`}
                  >
                    <input
                      type="radio"
                      name="priority"
                      value={priority.value}
                      checked={formData.priority === priority.value}
                      onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as any }))}
                      className="sr-only"
                    />
                    <span className={`font-medium ${priority.color}`}>{priority.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-primary">Tags</label>
              <div className="flex gap-2 mb-2 flex-wrap">
                {formData.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-accent/20 text-accent text-sm rounded-full"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="text-accent/70 hover:text-accent"
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="flex-1 px-3 py-2 bg-glass-bg border border-glass-border/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-kgiq-primary/50 transition-colors"
                  placeholder="Add a tag and press Enter"
                />
                <button
                  type="button"
                  onClick={addTag}
                  className="px-4 py-2 bg-accent/20 hover:bg-accent/30 text-accent rounded-lg transition-colors"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Automation Options */}
            <div className="space-y-3">
              <h4 className="font-medium text-primary">Automation</h4>
              <div className="space-y-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.autoAttribute}
                    onChange={(e) => setFormData(prev => ({ ...prev, autoAttribute: e.target.checked }))}
                    className="w-4 h-4 text-kgiq-primary bg-glass-bg border border-glass-border/50 rounded focus:ring-kgiq-primary/50"
                  />
                  <span className="text-primary">Automatically attribute to payments</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.sendReminders}
                    onChange={(e) => setFormData(prev => ({ ...prev, sendReminders: e.target.checked }))}
                    className="w-4 h-4 text-kgiq-primary bg-glass-bg border border-glass-border/50 rounded focus:ring-kgiq-primary/50"
                  />
                  <span className="text-primary">Send reminder notifications</span>
                </label>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <label htmlFor="notes" className="block text-sm font-medium text-primary">
          Notes (Optional)
        </label>
        <textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
          rows={3}
          className="w-full px-4 py-3 bg-glass-bg border border-glass-border/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-kgiq-primary/50 transition-colors resize-none"
          placeholder="Additional notes about this income event..."
        />
      </div>

      {/* Form Actions */}
      <div className="flex items-center justify-end gap-4 pt-6 border-t border-glass-border/30">
        <button
          type="button"
          onClick={handleCancel}
          disabled={isLoading}
          className="px-6 py-3 border border-glass-border/50 bg-glass-bg hover:bg-glass-bg-light text-muted hover:text-primary rounded-lg transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-8 py-3 bg-kgiq-primary hover:bg-kgiq-primary/90 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
        >
          {isLoading && (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          )}
          {mode === 'create' ? 'Create Income Event' : 'Update Income Event'}
        </button>
      </div>

    </form>
  )
}