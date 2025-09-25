'use client'

import { useState, useEffect } from 'react'

interface Attribution {
  id: string
  incomeEventId: string
  incomeDescription: string
  amount: number
  percentage: number
  createdDate: string
  notes?: string
}

interface IncomeEvent {
  id: string
  description: string
  amount: number
  scheduledDate: string
  status: 'scheduled' | 'received' | 'cancelled'
  source: string
  remainingAmount: number
}

interface PaymentAttributionProps {
  isOpen: boolean
  onClose: () => void
  paymentId: string
  paymentAmount: number
  paymentDescription: string
  existingAttributions?: Attribution[]
  onSave: (attributions: Attribution[]) => void
}

export default function PaymentAttribution({
  isOpen,
  onClose,
  paymentId,
  paymentAmount,
  paymentDescription,
  existingAttributions = [],
  onSave
}: PaymentAttributionProps) {
  const [attributions, setAttributions] = useState<Attribution[]>(existingAttributions)
  const [availableIncomeEvents, setAvailableIncomeEvents] = useState<IncomeEvent[]>([])
  const [selectedIncomeId, setSelectedIncomeId] = useState('')
  const [attributionAmount, setAttributionAmount] = useState('')
  const [attributionNotes, setAttributionNotes] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (isOpen) {
      setAvailableIncomeEvents([
        {
          id: '1',
          description: 'Salary Paycheck - John',
          amount: 2500,
          scheduledDate: '2024-12-01',
          status: 'scheduled',
          source: 'Primary Job',
          remainingAmount: 1850
        },
        {
          id: '2',
          description: 'Freelance Payment',
          amount: 800,
          scheduledDate: '2024-12-15',
          status: 'received',
          source: 'Side Work',
          remainingAmount: 800
        },
        {
          id: '3',
          description: 'Salary Paycheck - Jane',
          amount: 2200,
          scheduledDate: '2024-12-05',
          status: 'scheduled',
          source: 'Partner Job',
          remainingAmount: 1500
        },
        {
          id: '4',
          description: 'Bonus Payment',
          amount: 1200,
          scheduledDate: '2024-12-20',
          status: 'scheduled',
          source: 'Year-end Bonus',
          remainingAmount: 1200
        },
        {
          id: '5',
          description: 'Investment Dividend',
          amount: 350,
          scheduledDate: '2024-12-10',
          status: 'received',
          source: 'Portfolio',
          remainingAmount: 350
        }
      ])
    }
  }, [isOpen])

  const totalAttributed = attributions.reduce((sum, attr) => sum + attr.amount, 0)
  const remainingAmount = paymentAmount - totalAttributed
  const attributionPercentage = paymentAmount > 0 ? (totalAttributed / paymentAmount) * 100 : 0

  const handleAddAttribution = () => {
    const newErrors: Record<string, string> = {}

    if (!selectedIncomeId) {
      newErrors.income = 'Please select an income event'
    }

    const amount = parseFloat(attributionAmount)
    if (!attributionAmount || isNaN(amount) || amount <= 0) {
      newErrors.amount = 'Amount must be a positive number'
    } else if (amount > remainingAmount) {
      newErrors.amount = `Amount cannot exceed remaining payment ($${remainingAmount.toLocaleString()})`
    }

    if (selectedIncomeId && attributions.some(attr => attr.incomeEventId === selectedIncomeId)) {
      newErrors.income = 'This income event is already attributed'
    }

    setErrors(newErrors)

    if (Object.keys(newErrors).length === 0) {
      const selectedIncome = availableIncomeEvents.find(i => i.id === selectedIncomeId)
      if (selectedIncome) {
        const newAttribution: Attribution = {
          id: Date.now().toString(),
          incomeEventId: selectedIncomeId,
          incomeDescription: selectedIncome.description,
          amount: amount,
          percentage: (amount / paymentAmount) * 100,
          createdDate: new Date().toISOString(),
          notes: attributionNotes || undefined
        }

        setAttributions(prev => [...prev, newAttribution])

        setSelectedIncomeId('')
        setAttributionAmount('')
        setAttributionNotes('')
        setErrors({})
      }
    }
  }

  const handleRemoveAttribution = (attributionId: string) => {
    setAttributions(prev => prev.filter(attr => attr.id !== attributionId))
  }

  const handleUpdateAttribution = (attributionId: string, amount: number) => {
    if (amount <= 0) return

    setAttributions(prev => prev.map(attr =>
      attr.id === attributionId
        ? { ...attr, amount, percentage: (amount / paymentAmount) * 100 }
        : attr
    ))
  }

  const handleSave = async () => {
    setIsLoading(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 1000))
      onSave(attributions)
      onClose()
    } catch (error) {
      console.error('Error saving attributions:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAutoDistribute = () => {
    if (availableIncomeEvents.length === 0) return

    const unattributedIncomeEvents = availableIncomeEvents.filter(income =>
      !attributions.some(attr => attr.incomeEventId === income.id)
    )

    if (unattributedIncomeEvents.length === 0) return

    const totalAvailableIncome = unattributedIncomeEvents.reduce((sum, income) =>
      sum + Math.min(income.remainingAmount, remainingAmount), 0
    )

    if (totalAvailableIncome >= remainingAmount) {
      const sortedIncomeEvents = unattributedIncomeEvents
        .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime())

      let remainingToAttribute = remainingAmount
      const newAttributions: Attribution[] = []

      for (const income of sortedIncomeEvents) {
        if (remainingToAttribute <= 0) break

        const attributionAmount = Math.min(remainingToAttribute, income.remainingAmount)

        newAttributions.push({
          id: Date.now().toString() + income.id,
          incomeEventId: income.id,
          incomeDescription: income.description,
          amount: attributionAmount,
          percentage: (attributionAmount / paymentAmount) * 100,
          createdDate: new Date().toISOString()
        })

        remainingToAttribute -= attributionAmount
      }

      setAttributions(prev => [...prev, ...newAttributions])
    } else {
      const newAttributions = unattributedIncomeEvents.map(income => {
        const proportionalAmount = (income.remainingAmount / totalAvailableIncome) * remainingAmount
        return {
          id: Date.now().toString() + income.id,
          incomeEventId: income.id,
          incomeDescription: income.description,
          amount: Math.round(proportionalAmount * 100) / 100,
          percentage: (proportionalAmount / paymentAmount) * 100,
          createdDate: new Date().toISOString()
        }
      })

      setAttributions(prev => [...prev, ...newAttributions])
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-4xl max-h-[90vh] bg-glass-bg border border-glass-border/50 rounded-xl shadow-2xl overflow-hidden">

        <div className="flex items-center justify-between p-6 border-b border-glass-border/30">
          <div>
            <h2 className="text-2xl font-bold text-primary">Payment Attribution</h2>
            <p className="text-muted mt-1">{paymentDescription}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-muted hover:text-primary transition-colors"
          >
            <span className="text-xl">✕</span>
          </button>
        </div>

        <div className="overflow-y-auto max-h-[calc(90vh-120px)]">

          <div className="p-6 border-b border-glass-border/30">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="glass-card p-4 border-kgiq-primary/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-kgiq-primary/20 flex items-center justify-center">
                    <span className="text-kgiq-primary text-lg">💸</span>
                  </div>
                  <div>
                    <p className="text-sm text-muted">Total Payment</p>
                    <p className="text-xl font-bold text-primary">${paymentAmount.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <div className="glass-card p-4 border-success/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-success/20 flex items-center justify-center">
                    <span className="text-success text-lg">✅</span>
                  </div>
                  <div>
                    <p className="text-sm text-muted">Attributed</p>
                    <p className="text-xl font-bold text-success">${totalAttributed.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <div className="glass-card p-4 border-warning/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-warning/20 flex items-center justify-center">
                    <span className="text-warning text-lg">💰</span>
                  </div>
                  <div>
                    <p className="text-sm text-muted">Remaining</p>
                    <p className="text-xl font-bold text-warning">${remainingAmount.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <div className="glass-card p-4 border-accent/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
                    <span className="text-accent text-lg">📊</span>
                  </div>
                  <div>
                    <p className="text-sm text-muted">Coverage</p>
                    <p className="text-xl font-bold text-accent">{attributionPercentage.toFixed(1)}%</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 border-b border-glass-border/30">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-primary">Add Attribution</h3>
              <button
                onClick={handleAutoDistribute}
                disabled={remainingAmount <= 0}
                className="px-4 py-2 bg-kgiq-secondary/20 hover:bg-kgiq-secondary/30 text-kgiq-secondary font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                🎯 Auto Distribute
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              <div className="lg:col-span-5">
                <label className="block text-sm font-medium text-primary mb-2">Income Event</label>
                <select
                  value={selectedIncomeId}
                  onChange={(e) => setSelectedIncomeId(e.target.value)}
                  className={`w-full px-4 py-3 bg-glass-bg border rounded-lg focus:outline-none focus:ring-2 focus:ring-kgiq-primary/50 transition-colors ${
                    errors.income ? 'border-error' : 'border-glass-border/50'
                  }`}
                >
                  <option value="">Select an income event</option>
                  {availableIncomeEvents
                    .filter(income => !attributions.some(attr => attr.incomeEventId === income.id))
                    .map(income => (
                    <option key={income.id} value={income.id}>
                      {income.description} - ${income.amount.toLocaleString()} ({income.source})
                    </option>
                  ))}
                </select>
                {errors.income && (
                  <p className="text-sm text-error mt-1">{errors.income}</p>
                )}
              </div>

              <div className="lg:col-span-3">
                <label className="block text-sm font-medium text-primary mb-2">Amount</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted">$</span>
                  <input
                    type="number"
                    value={attributionAmount}
                    onChange={(e) => setAttributionAmount(e.target.value)}
                    className={`w-full pl-8 pr-4 py-3 bg-glass-bg border rounded-lg focus:outline-none focus:ring-2 focus:ring-kgiq-primary/50 transition-colors ${
                      errors.amount ? 'border-error' : 'border-glass-border/50'
                    }`}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    max={remainingAmount}
                  />
                </div>
                {errors.amount && (
                  <p className="text-sm text-error mt-1">{errors.amount}</p>
                )}
              </div>

              <div className="lg:col-span-3">
                <label className="block text-sm font-medium text-primary mb-2">Notes (Optional)</label>
                <input
                  type="text"
                  value={attributionNotes}
                  onChange={(e) => setAttributionNotes(e.target.value)}
                  className="w-full px-4 py-3 bg-glass-bg border border-glass-border/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-kgiq-primary/50 transition-colors"
                  placeholder="Optional notes"
                />
              </div>

              <div className="lg:col-span-1 flex items-end">
                <button
                  onClick={handleAddAttribution}
                  disabled={remainingAmount <= 0}
                  className="w-full px-4 py-3 bg-kgiq-primary hover:bg-kgiq-primary/90 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  +
                </button>
              </div>
            </div>

            {remainingAmount <= 0 && (
              <p className="text-sm text-warning mt-2 flex items-center gap-1">
                <span>⚠️</span> Payment is fully attributed
              </p>
            )}
          </div>

          <div className="p-6">
            <h3 className="text-lg font-semibold text-primary mb-4">Current Attributions</h3>

            {attributions.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-lg bg-muted/20 flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">📋</span>
                </div>
                <p className="text-muted">No attributions yet</p>
                <p className="text-sm text-muted mt-1">Add attributions to link this payment to income events</p>
              </div>
            ) : (
              <div className="space-y-3">
                {attributions.map((attribution) => (
                  <div key={attribution.id} className="flex items-center justify-between p-4 bg-glass-bg-light rounded-lg border border-glass-border/30">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-kgiq-primary/20 flex items-center justify-center">
                        <span className="text-kgiq-primary text-sm">💰</span>
                      </div>
                      <div>
                        <p className="font-medium text-primary">{attribution.incomeDescription}</p>
                        <div className="flex items-center gap-4 text-sm text-muted">
                          <span>{attribution.percentage.toFixed(1)}% of payment</span>
                          {attribution.notes && <span>• {attribution.notes}</span>}
                          <span>• Added {new Date(attribution.createdDate).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="relative">
                          <span className="text-sm text-muted mr-2">$</span>
                          <input
                            type="number"
                            value={attribution.amount}
                            onChange={(e) => handleUpdateAttribution(attribution.id, parseFloat(e.target.value) || 0)}
                            className="w-20 px-2 py-1 bg-transparent border-b border-glass-border/30 focus:border-kgiq-primary focus:outline-none text-right text-primary font-semibold"
                            step="0.01"
                            min="0"
                          />
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveAttribution(attribution.id)}
                        className="p-1 text-muted hover:text-error transition-colors"
                        title="Remove attribution"
                      >
                        <span className="text-sm">🗑️</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        <div className="flex items-center justify-between p-6 border-t border-glass-border/30">
          <div className="text-sm text-muted">
            {attributions.length} attribution{attributions.length !== 1 ? 's' : ''} •
            ${totalAttributed.toLocaleString()} of ${paymentAmount.toLocaleString()} attributed
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="px-6 py-3 border border-glass-border/50 bg-glass-bg hover:bg-glass-bg-light text-muted hover:text-primary rounded-lg transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isLoading}
              className="inline-flex items-center gap-2 px-8 py-3 bg-kgiq-primary hover:bg-kgiq-primary/90 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {isLoading && (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              )}
              Save Attributions
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}