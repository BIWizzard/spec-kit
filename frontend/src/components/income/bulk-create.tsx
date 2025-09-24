'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface BulkIncomeEvent {
  id: string
  description: string
  source: string
  expectedAmount: string
  expectedDate: string
  category: 'salary' | 'freelance' | 'bonus' | 'tax_refund' | 'investment' | 'other'
  isRecurring: boolean
  frequency?: 'weekly' | 'bi-weekly' | 'monthly' | 'quarterly' | 'annually'
  notes: string
  errors: Record<string, string>
}

interface BulkCreateProps {
  onSuccess?: () => void
  onCancel?: () => void
}

const categoryOptions = [
  { value: 'salary', label: 'Salary', icon: '💼' },
  { value: 'freelance', label: 'Freelance', icon: '🎨' },
  { value: 'bonus', label: 'Bonus', icon: '🎁' },
  { value: 'tax_refund', label: 'Tax Refund', icon: '🏛️' },
  { value: 'investment', label: 'Investment', icon: '📈' },
  { value: 'other', label: 'Other', icon: '💰' }
]

const frequencyOptions = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'bi-weekly', label: 'Bi-weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'annually', label: 'Annually' }
]

export default function BulkIncomeCreation({ onSuccess, onCancel }: BulkCreateProps) {
  const router = useRouter()
  const [events, setEvents] = useState<BulkIncomeEvent[]>([
    {
      id: '1',
      description: '',
      source: '',
      expectedAmount: '',
      expectedDate: '',
      category: 'salary',
      isRecurring: false,
      notes: '',
      errors: {}
    }
  ])

  const [isLoading, setIsLoading] = useState(false)
  const [importMode, setImportMode] = useState<'manual' | 'template' | 'csv'>('manual')
  const [csvData, setCsvData] = useState('')
  const [showPreview, setShowPreview] = useState(false)

  const addEvent = () => {
    const newEvent: BulkIncomeEvent = {
      id: Date.now().toString(),
      description: '',
      source: '',
      expectedAmount: '',
      expectedDate: '',
      category: 'salary',
      isRecurring: false,
      notes: '',
      errors: {}
    }
    setEvents(prev => [...prev, newEvent])
  }

  const removeEvent = (id: string) => {
    setEvents(prev => prev.filter(event => event.id !== id))
  }

  const updateEvent = (id: string, field: keyof BulkIncomeEvent, value: any) => {
    setEvents(prev => prev.map(event =>
      event.id === id
        ? { ...event, [field]: value, errors: { ...event.errors, [field]: '' } }
        : event
    ))
  }

  const duplicateEvent = (id: string) => {
    const eventToDuplicate = events.find(event => event.id === id)
    if (eventToDuplicate) {
      const newEvent = {
        ...eventToDuplicate,
        id: Date.now().toString(),
        expectedDate: '',
        errors: {}
      }
      setEvents(prev => [...prev, newEvent])
    }
  }

  const validateEvents = (): boolean => {
    let isValid = true

    setEvents(prev => prev.map(event => {
      const newErrors: Record<string, string> = {}

      if (!event.description.trim()) {
        newErrors.description = 'Description is required'
        isValid = false
      }

      if (!event.source.trim()) {
        newErrors.source = 'Source is required'
        isValid = false
      }

      if (!event.expectedAmount) {
        newErrors.expectedAmount = 'Amount is required'
        isValid = false
      } else {
        const amount = parseFloat(event.expectedAmount)
        if (isNaN(amount) || amount <= 0) {
          newErrors.expectedAmount = 'Amount must be a positive number'
          isValid = false
        }
      }

      if (!event.expectedDate) {
        newErrors.expectedDate = 'Date is required'
        isValid = false
      } else {
        const selectedDate = new Date(event.expectedDate)
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        if (selectedDate < today) {
          newErrors.expectedDate = 'Date cannot be in the past'
          isValid = false
        }
      }

      if (event.isRecurring && !event.frequency) {
        newErrors.frequency = 'Frequency is required for recurring income'
        isValid = false
      }

      return { ...event, errors: newErrors }
    }))

    return isValid
  }

  const handleSubmit = async () => {
    if (!validateEvents()) return

    setIsLoading(true)
    try {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 2000))

      console.log('Creating bulk income events:', events)

      onSuccess?.()
      router.push('/income')
    } catch (error) {
      console.error('Bulk creation error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadTemplate = (templateName: string) => {
    let templateEvents: Partial<BulkIncomeEvent>[] = []

    switch (templateName) {
      case 'monthly-salary':
        templateEvents = [
          {
            description: 'Monthly Salary - January',
            source: 'Employer Name',
            expectedAmount: '',
            category: 'salary',
            isRecurring: true,
            frequency: 'monthly'
          },
          {
            description: 'Monthly Salary - February',
            source: 'Employer Name',
            expectedAmount: '',
            category: 'salary',
            isRecurring: true,
            frequency: 'monthly'
          },
          {
            description: 'Monthly Salary - March',
            source: 'Employer Name',
            expectedAmount: '',
            category: 'salary',
            isRecurring: true,
            frequency: 'monthly'
          }
        ]
        break
      case 'freelance-projects':
        templateEvents = [
          {
            description: 'Website Design Project',
            source: 'Client Name',
            expectedAmount: '',
            category: 'freelance',
            isRecurring: false
          },
          {
            description: 'Logo Design Project',
            source: 'Client Name',
            expectedAmount: '',
            category: 'freelance',
            isRecurring: false
          }
        ]
        break
      case 'quarterly-dividends':
        templateEvents = [
          {
            description: 'Q1 Investment Dividends',
            source: 'Investment Portfolio',
            expectedAmount: '',
            category: 'investment',
            isRecurring: true,
            frequency: 'quarterly'
          },
          {
            description: 'Q2 Investment Dividends',
            source: 'Investment Portfolio',
            expectedAmount: '',
            category: 'investment',
            isRecurring: true,
            frequency: 'quarterly'
          }
        ]
        break
    }

    const newEvents = templateEvents.map((template, index) => ({
      id: Date.now().toString() + index,
      description: template.description || '',
      source: template.source || '',
      expectedAmount: template.expectedAmount || '',
      expectedDate: '',
      category: template.category || 'salary',
      isRecurring: template.isRecurring || false,
      frequency: template.frequency,
      notes: '',
      errors: {}
    }))

    setEvents(newEvents)
  }

  const parseCsvData = () => {
    if (!csvData.trim()) return

    const lines = csvData.trim().split('\n')
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase())

    const newEvents = lines.slice(1).map((line, index) => {
      const values = line.split(',').map(v => v.trim())

      return {
        id: Date.now().toString() + index,
        description: values[headers.indexOf('description')] || '',
        source: values[headers.indexOf('source')] || '',
        expectedAmount: values[headers.indexOf('amount')] || '',
        expectedDate: values[headers.indexOf('date')] || '',
        category: (values[headers.indexOf('category')] as any) || 'salary',
        isRecurring: values[headers.indexOf('recurring')]?.toLowerCase() === 'true',
        frequency: values[headers.indexOf('frequency')] as any,
        notes: values[headers.indexOf('notes')] || '',
        errors: {}
      }
    }).filter(event => event.description || event.source || event.expectedAmount)

    if (newEvents.length > 0) {
      setEvents(newEvents)
      setShowPreview(true)
    }
  }

  const totalAmount = events
    .filter(event => event.expectedAmount)
    .reduce((sum, event) => sum + parseFloat(event.expectedAmount || '0'), 0)

  const validEvents = events.filter(event =>
    event.description && event.source && event.expectedAmount && event.expectedDate
  ).length

  return (
    <div className="space-y-6">

      {/* Header and Mode Selection */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-primary">Bulk Income Creation</h2>
          <p className="text-muted">Create multiple income events efficiently</p>
        </div>

        <div className="flex items-center border border-glass-border/50 rounded-lg overflow-hidden">
          <button
            onClick={() => setImportMode('manual')}
            className={`px-4 py-2 text-sm transition-colors ${
              importMode === 'manual' ? 'bg-kgiq-primary text-white' : 'text-muted hover:text-primary'
            }`}
          >
            ✏️ Manual
          </button>
          <button
            onClick={() => setImportMode('template')}
            className={`px-4 py-2 text-sm transition-colors ${
              importMode === 'template' ? 'bg-kgiq-primary text-white' : 'text-muted hover:text-primary'
            }`}
          >
            📋 Template
          </button>
          <button
            onClick={() => setImportMode('csv')}
            className={`px-4 py-2 text-sm transition-colors ${
              importMode === 'csv' ? 'bg-kgiq-primary text-white' : 'text-muted hover:text-primary'
            }`}
          >
            📊 CSV Import
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-card p-4 border-kgiq-primary/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-kgiq-primary/20 flex items-center justify-center">
              <span className="text-kgiq-primary text-lg">📝</span>
            </div>
            <div>
              <p className="text-sm text-muted">Total Events</p>
              <p className="text-xl font-bold text-primary">{events.length}</p>
            </div>
          </div>
        </div>

        <div className="glass-card p-4 border-success/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-success/20 flex items-center justify-center">
              <span className="text-success text-lg">✅</span>
            </div>
            <div>
              <p className="text-sm text-muted">Valid Events</p>
              <p className="text-xl font-bold text-success">{validEvents}</p>
            </div>
          </div>
        </div>

        <div className="glass-card p-4 border-accent/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
              <span className="text-accent text-lg">💰</span>
            </div>
            <div>
              <p className="text-sm text-muted">Total Amount</p>
              <p className="text-xl font-bold text-accent">${totalAmount.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Template Selection */}
      {importMode === 'template' && (
        <div className="glass-card p-6 border-kgiq-secondary/20">
          <h3 className="text-lg font-semibold text-primary mb-4">Choose a Template</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => loadTemplate('monthly-salary')}
              className="text-left p-4 border border-glass-border/50 rounded-lg hover:border-kgiq-primary/30 transition-colors"
            >
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">💼</span>
                <h4 className="font-semibold text-primary">Monthly Salary</h4>
              </div>
              <p className="text-sm text-muted">3 months of recurring salary payments</p>
            </button>

            <button
              onClick={() => loadTemplate('freelance-projects')}
              className="text-left p-4 border border-glass-border/50 rounded-lg hover:border-kgiq-primary/30 transition-colors"
            >
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">🎨</span>
                <h4 className="font-semibold text-primary">Freelance Projects</h4>
              </div>
              <p className="text-sm text-muted">Common freelance project templates</p>
            </button>

            <button
              onClick={() => loadTemplate('quarterly-dividends')}
              className="text-left p-4 border border-glass-border/50 rounded-lg hover:border-kgiq-primary/30 transition-colors"
            >
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">📈</span>
                <h4 className="font-semibold text-primary">Quarterly Dividends</h4>
              </div>
              <p className="text-sm text-muted">Quarterly investment dividend payments</p>
            </button>
          </div>
        </div>
      )}

      {/* CSV Import */}
      {importMode === 'csv' && (
        <div className="glass-card p-6 border-kgiq-tertiary/20">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-primary">CSV Import</h3>
            <button
              onClick={() => setCsvData('description,source,amount,date,category,recurring,frequency,notes\nMonthly Salary,ABC Corp,2100,2024-12-15,salary,true,monthly,Regular payroll\nFreelance Project,XYZ Client,850,2024-12-20,freelance,false,,Website design')}
              className="px-3 py-1 bg-accent/20 hover:bg-accent/30 text-accent text-sm rounded-lg transition-colors"
            >
              Load Sample
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                CSV Data (Headers: description, source, amount, date, category, recurring, frequency, notes)
              </label>
              <textarea
                value={csvData}
                onChange={(e) => setCsvData(e.target.value)}
                rows={6}
                className="w-full px-4 py-3 bg-glass-bg border border-glass-border/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-kgiq-primary/50 transition-colors resize-none font-mono text-sm"
                placeholder="description,source,amount,date,category,recurring,frequency,notes"
              />
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={parseCsvData}
                disabled={!csvData.trim()}
                className="px-6 py-3 bg-kgiq-tertiary hover:bg-kgiq-tertiary/90 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Parse CSV
              </button>
              {showPreview && (
                <span className="text-success text-sm flex items-center gap-1">
                  <span>✅</span> CSV parsed successfully
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Manual Event Entry */}
      {importMode === 'manual' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-primary">Income Events</h3>
            <button
              onClick={addEvent}
              className="px-4 py-2 bg-kgiq-primary hover:bg-kgiq-primary/90 text-white font-medium rounded-lg transition-colors"
            >
              + Add Event
            </button>
          </div>

          {events.map((event, index) => {
            const categoryIcon = categoryOptions.find(cat => cat.value === event.category)?.icon || '💰'

            return (
              <div key={event.id} className="glass-card p-6 border-glass-border/50">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{categoryIcon}</span>
                    <h4 className="font-semibold text-primary">Event #{index + 1}</h4>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => duplicateEvent(event.id)}
                      className="p-2 text-muted hover:text-accent transition-colors"
                      title="Duplicate event"
                    >
                      <span className="text-sm">📋</span>
                    </button>
                    {events.length > 1 && (
                      <button
                        onClick={() => removeEvent(event.id)}
                        className="p-2 text-muted hover:text-error transition-colors"
                        title="Remove event"
                      >
                        <span className="text-sm">🗑️</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                  {/* Left Column */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-primary">
                        Description <span className="text-error">*</span>
                      </label>
                      <input
                        type="text"
                        value={event.description}
                        onChange={(e) => updateEvent(event.id, 'description', e.target.value)}
                        className={`w-full px-4 py-3 bg-glass-bg border rounded-lg focus:outline-none focus:ring-2 focus:ring-kgiq-primary/50 transition-colors ${
                          event.errors.description ? 'border-error' : 'border-glass-border/50'
                        }`}
                        placeholder="e.g., Monthly Salary - December 2024"
                      />
                      {event.errors.description && (
                        <p className="text-sm text-error">{event.errors.description}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-primary">
                        Source <span className="text-error">*</span>
                      </label>
                      <input
                        type="text"
                        value={event.source}
                        onChange={(e) => updateEvent(event.id, 'source', e.target.value)}
                        className={`w-full px-4 py-3 bg-glass-bg border rounded-lg focus:outline-none focus:ring-2 focus:ring-kgiq-primary/50 transition-colors ${
                          event.errors.source ? 'border-error' : 'border-glass-border/50'
                        }`}
                        placeholder="e.g., ABC Corporation"
                      />
                      {event.errors.source && (
                        <p className="text-sm text-error">{event.errors.source}</p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-primary">
                          Amount <span className="text-error">*</span>
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted">$</span>
                          <input
                            type="number"
                            value={event.expectedAmount}
                            onChange={(e) => updateEvent(event.id, 'expectedAmount', e.target.value)}
                            className={`w-full pl-8 pr-4 py-3 bg-glass-bg border rounded-lg focus:outline-none focus:ring-2 focus:ring-kgiq-primary/50 transition-colors ${
                              event.errors.expectedAmount ? 'border-error' : 'border-glass-border/50'
                            }`}
                            placeholder="0.00"
                            step="0.01"
                            min="0"
                          />
                        </div>
                        {event.errors.expectedAmount && (
                          <p className="text-sm text-error">{event.errors.expectedAmount}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-primary">
                          Date <span className="text-error">*</span>
                        </label>
                        <input
                          type="date"
                          value={event.expectedDate}
                          onChange={(e) => updateEvent(event.id, 'expectedDate', e.target.value)}
                          className={`w-full px-4 py-3 bg-glass-bg border rounded-lg focus:outline-none focus:ring-2 focus:ring-kgiq-primary/50 transition-colors ${
                            event.errors.expectedDate ? 'border-error' : 'border-glass-border/50'
                          }`}
                        />
                        {event.errors.expectedDate && (
                          <p className="text-sm text-error">{event.errors.expectedDate}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-primary">Category</label>
                      <select
                        value={event.category}
                        onChange={(e) => updateEvent(event.id, 'category', e.target.value)}
                        className="w-full px-4 py-3 bg-glass-bg border border-glass-border/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-kgiq-primary/50 transition-colors"
                      >
                        {categoryOptions.map((category) => (
                          <option key={category.value} value={category.value}>
                            {category.icon} {category.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-3">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={event.isRecurring}
                          onChange={(e) => updateEvent(event.id, 'isRecurring', e.target.checked)}
                          className="w-4 h-4 text-kgiq-primary bg-glass-bg border border-glass-border/50 rounded focus:ring-kgiq-primary/50"
                        />
                        <span className="text-primary">Recurring income</span>
                      </label>

                      {event.isRecurring && (
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-primary">
                            Frequency <span className="text-error">*</span>
                          </label>
                          <select
                            value={event.frequency || ''}
                            onChange={(e) => updateEvent(event.id, 'frequency', e.target.value)}
                            className={`w-full px-4 py-3 bg-glass-bg border rounded-lg focus:outline-none focus:ring-2 focus:ring-kgiq-primary/50 transition-colors ${
                              event.errors.frequency ? 'border-error' : 'border-glass-border/50'
                            }`}
                          >
                            <option value="">Select frequency</option>
                            {frequencyOptions.map((freq) => (
                              <option key={freq.value} value={freq.value}>{freq.label}</option>
                            ))}
                          </select>
                          {event.errors.frequency && (
                            <p className="text-sm text-error">{event.errors.frequency}</p>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-primary">Notes (Optional)</label>
                      <textarea
                        value={event.notes}
                        onChange={(e) => updateEvent(event.id, 'notes', e.target.value)}
                        rows={3}
                        className="w-full px-4 py-3 bg-glass-bg border border-glass-border/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-kgiq-primary/50 transition-colors resize-none"
                        placeholder="Additional notes..."
                      />
                    </div>
                  </div>

                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-4 pt-6 border-t border-glass-border/30">
        <button
          onClick={onCancel || (() => router.push('/income'))}
          disabled={isLoading}
          className="px-6 py-3 border border-glass-border/50 bg-glass-bg hover:bg-glass-bg-light text-muted hover:text-primary rounded-lg transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={isLoading || validEvents === 0}
          className="inline-flex items-center gap-2 px-8 py-3 bg-kgiq-primary hover:bg-kgiq-primary/90 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
        >
          {isLoading && (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          )}
          Create {events.length} Income Event{events.length !== 1 ? 's' : ''}
        </button>
      </div>

    </div>
  )
}