'use client'

import { useState, useEffect } from 'react'

interface Attribution {
  id: string
  paymentId: string
  paymentDescription: string
  amount: number
  percentage: number
  createdDate: string
  notes?: string
}

interface Payment {
  id: string
  description: string
  amount: number
  dueDate: string
  status: 'pending' | 'paid' | 'overdue'
  category: string
  remainingAmount: number
}

interface AttributionModalProps {
  isOpen: boolean
  onClose: () => void
  incomeEventId: string
  incomeAmount: number
  incomeDescription: string
  existingAttributions?: Attribution[]
  onSave: (attributions: Attribution[]) => void
}

export default function AttributionModal({
  isOpen,
  onClose,
  incomeEventId,
  incomeAmount,
  incomeDescription,
  existingAttributions = [],
  onSave
}: AttributionModalProps) {
  const [attributions, setAttributions] = useState<Attribution[]>(existingAttributions)
  const [availablePayments, setAvailablePayments] = useState<Payment[]>([])
  const [selectedPaymentId, setSelectedPaymentId] = useState('')
  const [attributionAmount, setAttributionAmount] = useState('')
  const [attributionNotes, setAttributionNotes] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Mock payment data - would come from API in real app
  useEffect(() => {
    if (isOpen) {
      setAvailablePayments([
        {
          id: '1',
          description: 'Rent Payment',
          amount: 850,
          dueDate: '2024-12-01',
          status: 'pending',
          category: 'Housing',
          remainingAmount: 850
        },
        {
          id: '2',
          description: 'Car Payment',
          amount: 320,
          dueDate: '2024-12-05',
          status: 'pending',
          category: 'Transportation',
          remainingAmount: 320
        },
        {
          id: '3',
          description: 'Groceries Budget',
          amount: 200,
          dueDate: '2024-12-10',
          status: 'pending',
          category: 'Food',
          remainingAmount: 200
        },
        {
          id: '4',
          description: 'Electric Bill',
          amount: 120,
          dueDate: '2024-12-15',
          status: 'pending',
          category: 'Utilities',
          remainingAmount: 120
        },
        {
          id: '5',
          description: 'Phone Bill',
          amount: 80,
          dueDate: '2024-12-20',
          status: 'pending',
          category: 'Utilities',
          remainingAmount: 80
        }
      ])
    }
  }, [isOpen])

  const totalAttributed = attributions.reduce((sum, attr) => sum + attr.amount, 0)
  const remainingAmount = incomeAmount - totalAttributed
  const attributionPercentage = incomeAmount > 0 ? (totalAttributed / incomeAmount) * 100 : 0

  const handleAddAttribution = () => {
    const newErrors: Record<string, string> = {}

    if (!selectedPaymentId) {
      newErrors.payment = 'Please select a payment'
    }

    const amount = parseFloat(attributionAmount)
    if (!attributionAmount || isNaN(amount) || amount <= 0) {
      newErrors.amount = 'Amount must be a positive number'
    } else if (amount > remainingAmount) {
      newErrors.amount = `Amount cannot exceed remaining income ($${remainingAmount.toLocaleString()})`
    }

    // Check if payment is already attributed
    if (selectedPaymentId && attributions.some(attr => attr.paymentId === selectedPaymentId)) {
      newErrors.payment = 'This payment is already attributed'
    }

    setErrors(newErrors)

    if (Object.keys(newErrors).length === 0) {
      const selectedPayment = availablePayments.find(p => p.id === selectedPaymentId)
      if (selectedPayment) {
        const newAttribution: Attribution = {
          id: Date.now().toString(),
          paymentId: selectedPaymentId,
          paymentDescription: selectedPayment.description,
          amount: amount,
          percentage: (amount / incomeAmount) * 100,
          createdDate: new Date().toISOString(),
          notes: attributionNotes || undefined
        }

        setAttributions(prev => [...prev, newAttribution])

        // Reset form
        setSelectedPaymentId('')
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
        ? { ...attr, amount, percentage: (amount / incomeAmount) * 100 }
        : attr
    ))
  }

  const handleSave = async () => {
    setIsLoading(true)
    try {
      // Mock API call
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
    if (availablePayments.length === 0) return

    const unattributedPayments = availablePayments.filter(payment =>
      !attributions.some(attr => attr.paymentId === payment.id)
    )

    if (unattributedPayments.length === 0) return

    const totalPaymentAmount = unattributedPayments.reduce((sum, payment) => sum + payment.amount, 0)

    if (totalPaymentAmount <= remainingAmount) {
      // If we can cover all payments, attribute full amounts
      const newAttributions = unattributedPayments.map(payment => ({
        id: Date.now().toString() + payment.id,
        paymentId: payment.id,
        paymentDescription: payment.description,
        amount: payment.amount,
        percentage: (payment.amount / incomeAmount) * 100,
        createdDate: new Date().toISOString()
      }))

      setAttributions(prev => [...prev, ...newAttributions])
    } else {
      // Proportionally distribute remaining amount
      const newAttributions = unattributedPayments.map(payment => {
        const proportionalAmount = (payment.amount / totalPaymentAmount) * remainingAmount
        return {
          id: Date.now().toString() + payment.id,
          paymentId: payment.id,
          paymentDescription: payment.description,
          amount: Math.round(proportionalAmount * 100) / 100,
          percentage: (proportionalAmount / incomeAmount) * 100,
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

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-glass-border/30">
          <div>
            <h2 className="text-2xl font-bold text-primary">Manage Payment Attributions</h2>
            <p className="text-muted mt-1">{incomeDescription}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-muted hover:text-primary transition-colors"
          >
            <span className="text-xl">✕</span>
          </button>
        </div>

        <div className="overflow-y-auto max-h-[calc(90vh-120px)]">

          {/* Income Summary */}
          <div className="p-6 border-b border-glass-border/30">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="glass-card p-4 border-kgiq-primary/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-kgiq-primary/20 flex items-center justify-center">
                    <span className="text-kgiq-primary text-lg">💰</span>
                  </div>
                  <div>
                    <p className="text-sm text-muted">Total Income</p>
                    <p className="text-xl font-bold text-primary">${incomeAmount.toLocaleString()}</p>
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
                    <span className="text-warning text-lg">💸</span>
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

          {/* Add New Attribution */}
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
                <label className="block text-sm font-medium text-primary mb-2">Payment</label>
                <select
                  value={selectedPaymentId}
                  onChange={(e) => setSelectedPaymentId(e.target.value)}
                  className={`w-full px-4 py-3 bg-glass-bg border rounded-lg focus:outline-none focus:ring-2 focus:ring-kgiq-primary/50 transition-colors ${
                    errors.payment ? 'border-error' : 'border-glass-border/50'
                  }`}
                >
                  <option value="">Select a payment</option>
                  {availablePayments
                    .filter(payment => !attributions.some(attr => attr.paymentId === payment.id))
                    .map(payment => (
                    <option key={payment.id} value={payment.id}>
                      {payment.description} - ${payment.amount.toLocaleString()} ({payment.category})
                    </option>
                  ))}
                </select>
                {errors.payment && (
                  <p className="text-sm text-error mt-1">{errors.payment}</p>
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
                <span>⚠️</span> All income has been attributed
              </p>
            )}
          </div>

          {/* Current Attributions */}
          <div className="p-6">
            <h3 className="text-lg font-semibold text-primary mb-4">Current Attributions</h3>

            {attributions.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-lg bg-muted/20 flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">📋</span>
                </div>
                <p className="text-muted">No attributions yet</p>
                <p className="text-sm text-muted mt-1">Add attributions to track how this income covers your payments</p>
              </div>
            ) : (
              <div className="space-y-3">
                {attributions.map((attribution) => (
                  <div key={attribution.id} className="flex items-center justify-between p-4 bg-glass-bg-light rounded-lg border border-glass-border/30">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-kgiq-primary/20 flex items-center justify-center">
                        <span className="text-kgiq-primary text-sm">💸</span>
                      </div>
                      <div>
                        <p className="font-medium text-primary">{attribution.paymentDescription}</p>
                        <div className="flex items-center gap-4 text-sm text-muted">
                          <span>{attribution.percentage.toFixed(1)}% of income</span>
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

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-glass-border/30">
          <div className="text-sm text-muted">
            {attributions.length} attribution{attributions.length !== 1 ? 's' : ''} •
            ${totalAttributed.toLocaleString()} of ${incomeAmount.toLocaleString()} attributed
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