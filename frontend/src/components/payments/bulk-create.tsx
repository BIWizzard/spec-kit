'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface BulkPayment {
  id: string
  description: string
  payee: string
  amount: string
  dueDate: string
  category: 'housing' | 'utilities' | 'insurance' | 'debt' | 'subscription' | 'other'
  isRecurring: boolean
  frequency?: 'weekly' | 'bi-weekly' | 'monthly' | 'quarterly' | 'annually'
  priority: 'low' | 'medium' | 'high'
  autoPay: boolean
  notes: string
  errors: Record<string, string>
}

interface BulkCreateProps {
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

const templates = [
  {
    name: 'Basic Monthly Bills',
    description: 'Common monthly recurring payments',
    payments: [
      { description: 'Rent Payment', payee: '', amount: '', category: 'housing' as const, priority: 'high' as const },
      { description: 'Electric Bill', payee: '', amount: '', category: 'utilities' as const, priority: 'medium' as const },
      { description: 'Internet Bill', payee: '', amount: '', category: 'utilities' as const, priority: 'medium' as const },
      { description: 'Phone Bill', payee: '', amount: '', category: 'utilities' as const, priority: 'low' as const }
    ]
  },
  {
    name: 'Debt Payments',
    description: 'Common debt and loan payments',
    payments: [
      { description: 'Credit Card Payment', payee: '', amount: '', category: 'debt' as const, priority: 'high' as const },
      { description: 'Car Loan Payment', payee: '', amount: '', category: 'debt' as const, priority: 'high' as const },
      { description: 'Student Loan Payment', payee: '', amount: '', category: 'debt' as const, priority: 'medium' as const }
    ]
  },
  {
    name: 'Insurance Payments',
    description: 'Insurance and protection payments',
    payments: [
      { description: 'Auto Insurance', payee: '', amount: '', category: 'insurance' as const, priority: 'high' as const },
      { description: 'Health Insurance', payee: '', amount: '', category: 'insurance' as const, priority: 'high' as const },
      { description: 'Home Insurance', payee: '', amount: '', category: 'insurance' as const, priority: 'medium' as const }
    ]
  }
]

export default function BulkPaymentCreation({ onSuccess, onCancel }: BulkCreateProps) {
  const router = useRouter()
  const [payments, setPayments] = useState<BulkPayment[]>([
    {
      id: '1',
      description: '',
      payee: '',
      amount: '',
      dueDate: '',
      category: 'other',
      isRecurring: false,
      priority: 'medium',
      autoPay: false,
      notes: '',
      errors: {}
    }
  ])

  const [isLoading, setIsLoading] = useState(false)
  const [importMode, setImportMode] = useState<'manual' | 'template' | 'csv'>('manual')
  const [csvData, setCsvData] = useState('')
  const [showPreview, setShowPreview] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState('')

  const addPayment = () => {
    const newPayment: BulkPayment = {
      id: Date.now().toString(),
      description: '',
      payee: '',
      amount: '',
      dueDate: '',
      category: 'other',
      isRecurring: false,
      priority: 'medium',
      autoPay: false,
      notes: '',
      errors: {}
    }
    setPayments(prev => [...prev, newPayment])
  }

  const removePayment = (id: string) => {
    setPayments(prev => prev.filter(payment => payment.id !== id))
  }

  const updatePayment = (id: string, field: keyof BulkPayment, value: any) => {
    setPayments(prev => prev.map(payment =>
      payment.id === id
        ? { ...payment, [field]: value, errors: { ...payment.errors, [field]: '' } }
        : payment
    ))
  }

  const duplicatePayment = (id: string) => {
    const paymentToDuplicate = payments.find(payment => payment.id === id)
    if (paymentToDuplicate) {
      const newPayment = {
        ...paymentToDuplicate,
        id: Date.now().toString(),
        dueDate: '',
        errors: {}
      }
      setPayments(prev => [...prev, newPayment])
    }
  }

  const applyTemplate = () => {
    const template = templates.find(t => t.name === selectedTemplate)
    if (template) {
      const templatePayments: BulkPayment[] = template.payments.map((payment, index) => ({
        id: (Date.now() + index).toString(),
        description: payment.description,
        payee: payment.payee,
        amount: payment.amount,
        dueDate: '',
        category: payment.category,
        isRecurring: true,
        frequency: 'monthly',
        priority: payment.priority,
        autoPay: false,
        notes: '',
        errors: {}
      }))
      setPayments(templatePayments)
      setImportMode('manual')
    }
  }

  const parseCsvData = () => {
    try {
      const lines = csvData.trim().split('\n')
      const headers = lines[0].toLowerCase().split(',').map(h => h.trim())

      if (!headers.includes('description') || !headers.includes('payee') || !headers.includes('amount')) {
        throw new Error('CSV must contain description, payee, and amount columns')
      }

      const csvPayments: BulkPayment[] = lines.slice(1).map((line, index) => {
        const values = line.split(',').map(v => v.trim())
        const paymentData: any = {}

        headers.forEach((header, i) => {
          paymentData[header] = values[i] || ''
        })

        return {
          id: (Date.now() + index).toString(),
          description: paymentData.description || '',
          payee: paymentData.payee || '',
          amount: paymentData.amount || '',
          dueDate: paymentData.duedate || paymentData.due_date || '',
          category: categoryOptions.find(c => c.value === paymentData.category)?.value || 'other',
          isRecurring: paymentData.recurring === 'true' || paymentData.is_recurring === 'true',
          frequency: frequencyOptions.find(f => f.value === paymentData.frequency)?.value,
          priority: ['low', 'medium', 'high'].includes(paymentData.priority) ? paymentData.priority : 'medium',
          autoPay: paymentData.autopay === 'true' || paymentData.auto_pay === 'true',
          notes: paymentData.notes || '',
          errors: {}
        } as BulkPayment
      })

      setPayments(csvPayments)
      setShowPreview(true)
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Error parsing CSV data')
    }
  }

  const validatePayments = () => {
    const updatedPayments = payments.map(payment => {
      const errors: Record<string, string> = {}

      if (!payment.description.trim()) errors.description = 'Description is required'
      if (!payment.payee.trim()) errors.payee = 'Payee is required'
      if (!payment.amount || parseFloat(payment.amount) <= 0) errors.amount = 'Valid amount is required'
      if (!payment.dueDate) errors.dueDate = 'Due date is required'
      if (payment.isRecurring && !payment.frequency) errors.frequency = 'Frequency is required for recurring payments'

      return { ...payment, errors }
    })

    setPayments(updatedPayments)
    return updatedPayments.every(payment => Object.keys(payment.errors).length === 0)
  }

  const handleSubmit = async () => {
    if (!validatePayments()) return

    setIsLoading(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 2000))
      onSuccess?.()
      if (!onSuccess) {
        router.push('/payments')
      }
    } catch (error) {
      alert('Error creating payments')
    } finally {
      setIsLoading(false)
    }
  }

  const totalAmount = payments.reduce((sum, payment) => {
    const amount = parseFloat(payment.amount) || 0
    return sum + amount
  }, 0)

  return (
    <div className="glass-card p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-primary">Bulk Payment Creation</h2>
          <p className="text-muted mt-1">Create multiple payments at once</p>
        </div>
        <div className="text-3xl">💸</div>
      </div>

      {/* Import Mode Selector */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setImportMode('manual')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            importMode === 'manual'
              ? 'bg-kgiq-primary text-white'
              : 'bg-glass-bg text-primary hover:bg-glass-bg-light border border-glass-border/50'
          }`}
        >
          Manual Entry
        </button>
        <button
          onClick={() => setImportMode('template')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            importMode === 'template'
              ? 'bg-kgiq-primary text-white'
              : 'bg-glass-bg text-primary hover:bg-glass-bg-light border border-glass-border/50'
          }`}
        >
          Use Template
        </button>
        <button
          onClick={() => setImportMode('csv')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            importMode === 'csv'
              ? 'bg-kgiq-primary text-white'
              : 'bg-glass-bg text-primary hover:bg-glass-bg-light border border-glass-border/50'
          }`}
        >
          CSV Import
        </button>
      </div>

      {/* Template Selection */}
      {importMode === 'template' && (
        <div className="glass-card bg-glass-bg-light p-4 mb-6">
          <h3 className="text-lg font-semibold text-primary mb-4">Select Template</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {templates.map(template => (
              <div
                key={template.name}
                onClick={() => setSelectedTemplate(template.name)}
                className={`p-4 rounded-lg cursor-pointer transition-all ${
                  selectedTemplate === template.name
                    ? 'bg-kgiq-primary/20 border border-kgiq-primary/50'
                    : 'bg-glass-bg border border-glass-border/50 hover:border-glass-border'
                }`}
              >
                <h4 className="font-medium text-primary">{template.name}</h4>
                <p className="text-sm text-muted mt-1">{template.description}</p>
                <p className="text-xs text-accent mt-2">{template.payments.length} payments</p>
              </div>
            ))}
          </div>
          {selectedTemplate && (
            <button
              onClick={applyTemplate}
              className="mt-4 px-6 py-2 bg-kgiq-primary hover:bg-kgiq-primary/90 text-white font-medium rounded-lg transition-colors"
            >
              Apply Template
            </button>
          )}
        </div>
      )}

      {/* CSV Import */}
      {importMode === 'csv' && (
        <div className="glass-card bg-glass-bg-light p-4 mb-6">
          <h3 className="text-lg font-semibold text-primary mb-4">CSV Import</h3>
          <div className="mb-4">
            <p className="text-sm text-muted mb-2">Expected columns: description, payee, amount, duedate, category, recurring, frequency, priority, autopay, notes</p>
            <textarea
              value={csvData}
              onChange={(e) => setCsvData(e.target.value)}
              placeholder="description,payee,amount,duedate,category&#10;Rent Payment,ABC Property,1200,2024-12-01,housing&#10;Electric Bill,Power Company,150,2024-12-05,utilities"
              className="w-full px-4 py-3 bg-glass-bg border border-glass-border/50 rounded-lg text-primary placeholder-muted focus:outline-none focus:ring-2 focus:ring-kgiq-primary/50 transition-colors"
              rows={6}
            />
          </div>
          <button
            onClick={parseCsvData}
            disabled={!csvData.trim()}
            className="px-6 py-2 bg-kgiq-primary hover:bg-kgiq-primary/90 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            Parse CSV Data
          </button>
        </div>
      )}

      {/* Payment List */}
      {(importMode === 'manual' || showPreview) && (
        <div className="space-y-4 mb-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-primary">
              Payments ({payments.length}) - Total: ${totalAmount.toLocaleString()}
            </h3>
            {importMode === 'manual' && (
              <button
                onClick={addPayment}
                className="px-4 py-2 bg-kgiq-secondary/20 hover:bg-kgiq-secondary/30 text-kgiq-secondary font-medium rounded-lg transition-colors"
              >
                + Add Payment
              </button>
            )}
          </div>

          {payments.map((payment, index) => (
            <div key={payment.id} className="glass-card bg-glass-bg-light p-4">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-accent">Payment #{index + 1}</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => duplicatePayment(payment.id)}
                    className="p-2 text-muted hover:text-primary transition-colors"
                    title="Duplicate"
                  >
                    📄
                  </button>
                  {payments.length > 1 && (
                    <button
                      onClick={() => removePayment(payment.id)}
                      className="p-2 text-muted hover:text-error transition-colors"
                      title="Remove"
                    >
                      🗑️
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="lg:col-span-2">
                  <label className="block text-sm font-medium text-primary mb-1">
                    Description *
                  </label>
                  <input
                    type="text"
                    value={payment.description}
                    onChange={(e) => updatePayment(payment.id, 'description', e.target.value)}
                    className={`w-full px-3 py-2 bg-glass-bg border rounded-lg text-primary placeholder-muted focus:outline-none focus:ring-2 focus:ring-kgiq-primary/50 transition-colors ${
                      payment.errors.description ? 'border-error' : 'border-glass-border/50'
                    }`}
                    placeholder="e.g., Monthly rent payment"
                  />
                  {payment.errors.description && (
                    <p className="text-sm text-error mt-1">{payment.errors.description}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-primary mb-1">
                    Payee *
                  </label>
                  <input
                    type="text"
                    value={payment.payee}
                    onChange={(e) => updatePayment(payment.id, 'payee', e.target.value)}
                    className={`w-full px-3 py-2 bg-glass-bg border rounded-lg text-primary placeholder-muted focus:outline-none focus:ring-2 focus:ring-kgiq-primary/50 transition-colors ${
                      payment.errors.payee ? 'border-error' : 'border-glass-border/50'
                    }`}
                    placeholder="e.g., ABC Property"
                  />
                  {payment.errors.payee && (
                    <p className="text-sm text-error mt-1">{payment.errors.payee}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-primary mb-1">
                    Amount *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={payment.amount}
                      onChange={(e) => updatePayment(payment.id, 'amount', e.target.value)}
                      className={`w-full pl-8 pr-3 py-2 bg-glass-bg border rounded-lg text-primary placeholder-muted focus:outline-none focus:ring-2 focus:ring-kgiq-primary/50 transition-colors ${
                        payment.errors.amount ? 'border-error' : 'border-glass-border/50'
                      }`}
                      placeholder="0.00"
                    />
                  </div>
                  {payment.errors.amount && (
                    <p className="text-sm text-error mt-1">{payment.errors.amount}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-primary mb-1">
                    Due Date *
                  </label>
                  <input
                    type="date"
                    value={payment.dueDate}
                    onChange={(e) => updatePayment(payment.id, 'dueDate', e.target.value)}
                    className={`w-full px-3 py-2 bg-glass-bg border rounded-lg text-primary focus:outline-none focus:ring-2 focus:ring-kgiq-primary/50 transition-colors ${
                      payment.errors.dueDate ? 'border-error' : 'border-glass-border/50'
                    }`}
                  />
                  {payment.errors.dueDate && (
                    <p className="text-sm text-error mt-1">{payment.errors.dueDate}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-primary mb-1">
                    Category
                  </label>
                  <select
                    value={payment.category}
                    onChange={(e) => updatePayment(payment.id, 'category', e.target.value)}
                    className="w-full px-3 py-2 bg-glass-bg border border-glass-border/50 rounded-lg text-primary focus:outline-none focus:ring-2 focus:ring-kgiq-primary/50 transition-colors"
                  >
                    {categoryOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.icon} {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-primary mb-1">
                    Priority
                  </label>
                  <select
                    value={payment.priority}
                    onChange={(e) => updatePayment(payment.id, 'priority', e.target.value)}
                    className="w-full px-3 py-2 bg-glass-bg border border-glass-border/50 rounded-lg text-primary focus:outline-none focus:ring-2 focus:ring-kgiq-primary/50 transition-colors"
                  >
                    <option value="low">🟢 Low</option>
                    <option value="medium">🟡 Medium</option>
                    <option value="high">🔴 High</option>
                  </select>
                </div>

                <div className="flex items-center space-x-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={payment.isRecurring}
                      onChange={(e) => updatePayment(payment.id, 'isRecurring', e.target.checked)}
                      className="w-4 h-4 text-kgiq-primary border-glass-border/50 rounded focus:ring-2 focus:ring-kgiq-primary/50"
                    />
                    <span className="ml-2 text-sm text-primary">Recurring</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={payment.autoPay}
                      onChange={(e) => updatePayment(payment.id, 'autoPay', e.target.checked)}
                      className="w-4 h-4 text-kgiq-primary border-glass-border/50 rounded focus:ring-2 focus:ring-kgiq-primary/50"
                    />
                    <span className="ml-2 text-sm text-primary">AutoPay</span>
                  </label>
                </div>

                {payment.isRecurring && (
                  <div>
                    <label className="block text-sm font-medium text-primary mb-1">
                      Frequency *
                    </label>
                    <select
                      value={payment.frequency || ''}
                      onChange={(e) => updatePayment(payment.id, 'frequency', e.target.value)}
                      className={`w-full px-3 py-2 bg-glass-bg border rounded-lg text-primary focus:outline-none focus:ring-2 focus:ring-kgiq-primary/50 transition-colors ${
                        payment.errors.frequency ? 'border-error' : 'border-glass-border/50'
                      }`}
                    >
                      <option value="">Select frequency</option>
                      {frequencyOptions.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    {payment.errors.frequency && (
                      <p className="text-sm text-error mt-1">{payment.errors.frequency}</p>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-primary mb-1">
                  Notes
                </label>
                <input
                  type="text"
                  value={payment.notes}
                  onChange={(e) => updatePayment(payment.id, 'notes', e.target.value)}
                  className="w-full px-3 py-2 bg-glass-bg border border-glass-border/50 rounded-lg text-primary placeholder-muted focus:outline-none focus:ring-2 focus:ring-kgiq-primary/50 transition-colors"
                  placeholder="Optional notes"
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-6 border-t border-glass-border/30">
        <button
          onClick={() => onCancel ? onCancel() : router.back()}
          className="px-6 py-3 text-muted hover:text-primary border border-glass-border/50 rounded-lg hover:border-glass-border transition-colors"
        >
          Cancel
        </button>

        <div className="flex items-center gap-4">
          {showPreview && (
            <button
              onClick={() => setShowPreview(false)}
              className="px-6 py-3 bg-glass-bg hover:bg-glass-bg-light text-primary border border-glass-border/50 rounded-lg transition-colors"
            >
              Edit CSV Data
            </button>
          )}

          <button
            onClick={handleSubmit}
            disabled={isLoading || payments.length === 0}
            className="px-8 py-3 bg-kgiq-primary text-white font-medium rounded-lg hover:bg-kgiq-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {isLoading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            Create {payments.length} Payment{payments.length !== 1 ? 's' : ''}
          </button>
        </div>
      </div>

      {/* KGiQ Footer */}
      <div className="flex items-center justify-center mt-8 pt-6 border-t border-glass-border/30">
        <div className="text-xs text-muted flex items-center gap-2">
          <span className="text-kgiq-primary">💸</span>
          <span>Bulk payment creation powered by KGiQ Finance</span>
        </div>
      </div>
    </div>
  )
}