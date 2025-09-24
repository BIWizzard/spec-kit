'use client'

import { useState } from 'react'
import Link from 'next/link'

interface Payment {
  id: string
  payee: string
  description: string
  amount: number
  paidAmount?: number
  dueDate: string
  paidDate?: string
  status: 'scheduled' | 'paid' | 'overdue' | 'partial' | 'cancelled'
  isRecurring: boolean
  frequency?: 'weekly' | 'bi-weekly' | 'monthly' | 'quarterly' | 'annually'
  category: 'housing' | 'utilities' | 'insurance' | 'transportation' | 'healthcare' | 'subscriptions' | 'food' | 'other'
  paymentMethod?: string
  attributionCount: number
  attributedAmount: number
  priority: 'low' | 'medium' | 'high' | 'critical'
  notes?: string
}

interface PaymentStatusConfig {
  icon: string
  color: string
  bgColor: string
  label: string
}

const statusConfig: Record<Payment['status'], PaymentStatusConfig> = {
  scheduled: {
    icon: '📅',
    color: 'text-kgiq-primary',
    bgColor: 'bg-kgiq-primary/10',
    label: 'Scheduled'
  },
  paid: {
    icon: '✅',
    color: 'text-success',
    bgColor: 'bg-success/10',
    label: 'Paid'
  },
  overdue: {
    icon: '⚠️',
    color: 'text-error',
    bgColor: 'bg-error/10',
    label: 'Overdue'
  },
  partial: {
    icon: '⏳',
    color: 'text-warning',
    bgColor: 'bg-warning/10',
    label: 'Partial'
  },
  cancelled: {
    icon: '❌',
    color: 'text-muted',
    bgColor: 'bg-muted/10',
    label: 'Cancelled'
  }
}

const categoryConfig = {
  housing: { icon: '🏠', label: 'Housing', color: 'text-error' },
  utilities: { icon: '⚡', label: 'Utilities', color: 'text-warning' },
  insurance: { icon: '🛡️', label: 'Insurance', color: 'text-kgiq-secondary' },
  transportation: { icon: '🚗', label: 'Transportation', color: 'text-accent' },
  healthcare: { icon: '🏥', label: 'Healthcare', color: 'text-kgiq-primary' },
  subscriptions: { icon: '📱', label: 'Subscriptions', color: 'text-kgiq-tertiary' },
  food: { icon: '🍽️', label: 'Food', color: 'text-success' },
  other: { icon: '💳', label: 'Other', color: 'text-muted' }
}

const priorityConfig = {
  low: { icon: '🔷', color: 'text-muted', bgColor: 'bg-muted/10' },
  medium: { icon: '🔶', color: 'text-accent', bgColor: 'bg-accent/10' },
  high: { icon: '🔸', color: 'text-warning', bgColor: 'bg-warning/10' },
  critical: { icon: '🚨', color: 'text-error', bgColor: 'bg-error/10' }
}

export default function PaymentList() {
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'status' | 'priority'>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [filterStatus, setFilterStatus] = useState<'all' | Payment['status']>('all')
  const [filterCategory, setFilterCategory] = useState<'all' | Payment['category']>('all')
  const [viewMode, setViewMode] = useState<'list' | 'card'>('list')

  // Mock data - would come from API/context in real app
  const payments: Payment[] = [
    {
      id: '1',
      payee: 'ABC Property Management',
      description: 'Monthly Rent - December 2024',
      amount: 1200,
      dueDate: '2024-12-05',
      status: 'scheduled',
      isRecurring: true,
      frequency: 'monthly',
      category: 'housing',
      paymentMethod: 'Auto-Pay - Chase Checking',
      attributionCount: 1,
      attributedAmount: 1200,
      priority: 'high',
      notes: 'Primary residence rental payment'
    },
    {
      id: '2',
      payee: 'City Electric Company',
      description: 'Electricity Bill - November',
      amount: 150,
      paidAmount: 150,
      dueDate: '2024-11-15',
      paidDate: '2024-11-14',
      status: 'paid',
      isRecurring: true,
      frequency: 'monthly',
      category: 'utilities',
      paymentMethod: 'Manual - Online',
      attributionCount: 1,
      attributedAmount: 150,
      priority: 'medium'
    },
    {
      id: '3',
      payee: 'Auto Insurance Co',
      description: 'Car Insurance Premium',
      amount: 185,
      dueDate: '2024-11-20',
      status: 'overdue',
      isRecurring: true,
      frequency: 'monthly',
      category: 'insurance',
      attributionCount: 1,
      attributedAmount: 185,
      priority: 'critical',
      notes: 'Policy #AI-789456123'
    },
    {
      id: '4',
      payee: 'Netflix',
      description: 'Streaming Subscription',
      amount: 15.99,
      dueDate: '2024-12-12',
      status: 'scheduled',
      isRecurring: true,
      frequency: 'monthly',
      category: 'subscriptions',
      paymentMethod: 'Auto-Pay - Credit Card',
      attributionCount: 1,
      attributedAmount: 15.99,
      priority: 'low'
    },
    {
      id: '5',
      payee: 'Medical Associates',
      description: 'Routine Checkup Co-pay',
      amount: 45,
      dueDate: '2024-11-30',
      status: 'overdue',
      isRecurring: false,
      category: 'healthcare',
      attributionCount: 0,
      attributedAmount: 0,
      priority: 'medium',
      notes: 'Appointment on 11/15/2024'
    },
    {
      id: '6',
      payee: 'Grocery Budget',
      description: 'Weekly Groceries',
      amount: 120,
      paidAmount: 80,
      dueDate: '2024-12-01',
      paidDate: '2024-12-01',
      status: 'partial',
      isRecurring: true,
      frequency: 'weekly',
      category: 'food',
      attributionCount: 1,
      attributedAmount: 120,
      priority: 'medium'
    }
  ]

  const handleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder(field === 'date' ? 'asc' : 'desc')
    }
  }

  const filteredAndSortedPayments = payments
    .filter(payment => filterStatus === 'all' || payment.status === filterStatus)
    .filter(payment => filterCategory === 'all' || payment.category === filterCategory)
    .sort((a, b) => {
      let aValue, bValue
      switch (sortBy) {
        case 'date':
          aValue = new Date(a.dueDate).getTime()
          bValue = new Date(b.dueDate).getTime()
          break
        case 'amount':
          aValue = a.amount
          bValue = b.amount
          break
        case 'status':
          aValue = a.status
          bValue = b.status
          break
        case 'priority':
          const priorityOrder = { low: 0, medium: 1, high: 2, critical: 3 }
          aValue = priorityOrder[a.priority]
          bValue = priorityOrder[b.priority]
          break
        default:
          return 0
      }

      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0
      }
    })

  const totalScheduledAmount = payments
    .filter(payment => payment.status === 'scheduled')
    .reduce((sum, payment) => sum + payment.amount, 0)

  const totalOverdueAmount = payments
    .filter(payment => payment.status === 'overdue')
    .reduce((sum, payment) => sum + payment.amount, 0)

  const totalPaidAmount = payments
    .filter(payment => payment.status === 'paid')
    .reduce((sum, payment) => sum + (payment.paidAmount || payment.amount), 0)

  const isOverdue = (payment: Payment) => {
    return payment.status === 'overdue' || (payment.status === 'scheduled' && new Date(payment.dueDate) < new Date())
  }

  const isDueSoon = (payment: Payment) => {
    const dueDate = new Date(payment.dueDate)
    const soon = new Date()
    soon.setDate(soon.getDate() + 7)
    return payment.status === 'scheduled' && dueDate <= soon && dueDate >= new Date()
  }

  return (
    <div className="space-y-6">

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass-card p-4 border-kgiq-primary/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-kgiq-primary/20 flex items-center justify-center">
              <span className="text-kgiq-primary text-lg">📅</span>
            </div>
            <div>
              <p className="text-sm text-muted">Scheduled Payments</p>
              <p className="text-xl font-bold text-kgiq-primary">${totalScheduledAmount.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="glass-card p-4 border-error/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-error/20 flex items-center justify-center">
              <span className="text-error text-lg">⚠️</span>
            </div>
            <div>
              <p className="text-sm text-muted">Overdue Payments</p>
              <p className="text-xl font-bold text-error">${totalOverdueAmount.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="glass-card p-4 border-success/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-success/20 flex items-center justify-center">
              <span className="text-success text-lg">✅</span>
            </div>
            <div>
              <p className="text-sm text-muted">Paid This Month</p>
              <p className="text-xl font-bold text-success">${totalPaidAmount.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="glass-card p-4 border-accent/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
              <span className="text-accent text-lg">📊</span>
            </div>
            <div>
              <p className="text-sm text-muted">Total Payments</p>
              <p className="text-xl font-bold text-accent">{payments.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="glass-card p-4 border-glass-border/50">
        <div className="flex flex-wrap items-center justify-between gap-4">

          {/* Filters */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-muted">Status:</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="px-3 py-1.5 bg-glass-bg border border-glass-border/50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-error/50"
              >
                <option value="all">All Status</option>
                <option value="scheduled">Scheduled</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
                <option value="partial">Partial</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-muted">Category:</label>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value as any)}
                className="px-3 py-1.5 bg-glass-bg border border-glass-border/50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-error/50"
              >
                <option value="all">All Categories</option>
                <option value="housing">Housing</option>
                <option value="utilities">Utilities</option>
                <option value="insurance">Insurance</option>
                <option value="transportation">Transportation</option>
                <option value="healthcare">Healthcare</option>
                <option value="subscriptions">Subscriptions</option>
                <option value="food">Food</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          {/* Sort and View Controls */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-muted">Sort:</label>
              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [field, order] = e.target.value.split('-')
                  setSortBy(field as typeof sortBy)
                  setSortOrder(order as typeof sortOrder)
                }}
                className="px-3 py-1.5 bg-glass-bg border border-glass-border/50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-error/50"
              >
                <option value="date-asc">Due Date (Soonest)</option>
                <option value="date-desc">Due Date (Latest)</option>
                <option value="amount-desc">Amount (High to Low)</option>
                <option value="amount-asc">Amount (Low to High)</option>
                <option value="priority-desc">Priority (Critical First)</option>
                <option value="status-asc">Status (A-Z)</option>
              </select>
            </div>

            <div className="flex items-center border border-glass-border/50 rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1.5 text-sm transition-colors ${
                  viewMode === 'list' ? 'bg-error text-white' : 'text-muted hover:text-primary'
                }`}
              >
                📋 List
              </button>
              <button
                onClick={() => setViewMode('card')}
                className={`px-3 py-1.5 text-sm transition-colors ${
                  viewMode === 'card' ? 'bg-error text-white' : 'text-muted hover:text-primary'
                }`}
              >
                📇 Cards
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Payment List */}
      {viewMode === 'list' ? (
        <div className="glass-card border-glass-border/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-glass-border/30">
                  <th className="text-left p-4 text-sm font-medium text-muted">Payment</th>
                  <th className="text-left p-4 text-sm font-medium text-muted">Payee</th>
                  <th className="text-left p-4 text-sm font-medium text-muted">Amount</th>
                  <th className="text-left p-4 text-sm font-medium text-muted">Due Date</th>
                  <th className="text-left p-4 text-sm font-medium text-muted">Status</th>
                  <th className="text-left p-4 text-sm font-medium text-muted">Attribution</th>
                  <th className="text-left p-4 text-sm font-medium text-muted">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedPayments.map((payment) => {
                  const status = statusConfig[payment.status]
                  const category = categoryConfig[payment.category]
                  const priority = priorityConfig[payment.priority]
                  const attributionPercentage = payment.amount > 0 ? (payment.attributedAmount / payment.amount * 100) : 0

                  return (
                    <tr key={payment.id} className={`border-b border-glass-border/20 hover:bg-glass-bg-light/50 transition-colors ${
                      isOverdue(payment) ? 'bg-error/5' : isDueSoon(payment) ? 'bg-warning/5' : ''
                    }`}>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg ${category.color.replace('text-', 'bg-')}/20 flex items-center justify-center`}>
                            <span className="text-sm">{category.icon}</span>
                          </div>
                          <div>
                            <Link href={`/payments/${payment.id}`} className="font-medium text-primary hover:text-accent transition-colors">
                              {payment.description}
                            </Link>
                            <p className="text-sm text-muted">{category.label}</p>
                            <div className="flex items-center gap-2 mt-1">
                              {payment.isRecurring && (
                                <span className="inline-block px-2 py-0.5 bg-accent/20 text-accent text-xs rounded-full">
                                  🔄 {payment.frequency}
                                </span>
                              )}
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 ${priority.bgColor} ${priority.color} text-xs rounded-full`}>
                                {priority.icon} {payment.priority}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <p className="text-primary">{payment.payee}</p>
                        {payment.paymentMethod && <p className="text-sm text-muted">{payment.paymentMethod}</p>}
                      </td>
                      <td className="p-4">
                        <p className="font-semibold text-error">${payment.amount.toLocaleString()}</p>
                        {payment.paidAmount && payment.paidAmount !== payment.amount && (
                          <p className="text-sm text-success">Paid: ${payment.paidAmount.toLocaleString()}</p>
                        )}
                      </td>
                      <td className="p-4">
                        <p className={`${
                          isOverdue(payment) ? 'text-error font-medium' :
                          isDueSoon(payment) ? 'text-warning font-medium' :
                          'text-primary'
                        }`}>
                          {new Date(payment.dueDate).toLocaleDateString()}
                        </p>
                        {payment.paidDate && (
                          <p className="text-sm text-success">Paid: {new Date(payment.paidDate).toLocaleDateString()}</p>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 ${status.bgColor} ${status.color} text-xs rounded-full`}>
                            {status.icon} {status.label}
                          </span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="space-y-1">
                          <p className="text-sm text-primary">{payment.attributionCount} sources</p>
                          <p className="text-sm text-muted">${payment.attributedAmount.toLocaleString()} ({attributionPercentage.toFixed(0)}%)</p>
                          {attributionPercentage < 100 && (
                            <p className="text-xs text-warning">⚠️ Under-attributed</p>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Link href={`/payments/${payment.id}`} className="p-1 text-muted hover:text-primary transition-colors" title="View Details">
                            <span className="text-sm">👁️</span>
                          </Link>
                          <Link href={`/payments/${payment.id}/edit`} className="p-1 text-muted hover:text-accent transition-colors" title="Edit">
                            <span className="text-sm">✏️</span>
                          </Link>
                          {payment.status === 'scheduled' && (
                            <button className="p-1 text-muted hover:text-success transition-colors" title="Mark Paid">
                              <span className="text-sm">✅</span>
                            </button>
                          )}
                          <button className="p-1 text-muted hover:text-error transition-colors" title="Delete">
                            <span className="text-sm">🗑️</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredAndSortedPayments.map((payment) => {
            const status = statusConfig[payment.status]
            const category = categoryConfig[payment.category]
            const priority = priorityConfig[payment.priority]
            const attributionPercentage = payment.amount > 0 ? (payment.attributedAmount / payment.amount * 100) : 0

            return (
              <div key={payment.id} className={`glass-card p-6 border-glass-border/50 hover:border-error/30 transition-colors ${
                isOverdue(payment) ? 'border-error/30 bg-error/5' : isDueSoon(payment) ? 'border-warning/30 bg-warning/5' : ''
              }`}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg ${category.color.replace('text-', 'bg-')}/20 flex items-center justify-center`}>
                      <span className="text-lg">{category.icon}</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-primary">{payment.payee}</h3>
                      <p className="text-sm text-muted">{payment.description}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 ${status.bgColor} ${status.color} text-xs rounded-full`}>
                      {status.icon} {status.label}
                    </span>
                    <span className={`inline-flex items-center gap-1 px-2 py-1 ${priority.bgColor} ${priority.color} text-xs rounded-full`}>
                      {priority.icon} {payment.priority}
                    </span>
                  </div>
                </div>

                <div className="space-y-3 mb-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted">Amount</span>
                    <span className="font-semibold text-error">${payment.amount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted">Due Date</span>
                    <span className={`${
                      isOverdue(payment) ? 'text-error font-medium' :
                      isDueSoon(payment) ? 'text-warning font-medium' :
                      'text-primary'
                    }`}>
                      {new Date(payment.dueDate).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted">Attributed</span>
                    <div className="text-right">
                      <p className="text-accent">{payment.attributionCount} sources ({attributionPercentage.toFixed(0)}%)</p>
                      {attributionPercentage < 100 && (
                        <p className="text-xs text-warning">⚠️ Under-attributed</p>
                      )}
                    </div>
                  </div>
                  {payment.paidAmount && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted">Paid</span>
                      <span className="text-success font-semibold">${payment.paidAmount.toLocaleString()}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    {payment.isRecurring && (
                      <span className="px-2 py-1 bg-accent/20 text-accent text-xs rounded-full">
                        🔄 {payment.frequency}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Link href={`/payments/${payment.id}`} className="p-2 text-muted hover:text-primary transition-colors" title="View Details">
                      <span>👁️</span>
                    </Link>
                    <Link href={`/payments/${payment.id}/edit`} className="p-2 text-muted hover:text-accent transition-colors" title="Edit">
                      <span>✏️</span>
                    </Link>
                    {payment.status === 'scheduled' && (
                      <button className="p-2 text-muted hover:text-success transition-colors" title="Mark Paid">
                        <span>✅</span>
                      </button>
                    )}
                    <button className="p-2 text-muted hover:text-error transition-colors" title="Delete">
                      <span>🗑️</span>
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {filteredAndSortedPayments.length === 0 && (
        <div className="glass-card p-12 border-glass-border/50 text-center">
          <div className="w-16 h-16 rounded-lg bg-muted/20 flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">💳</span>
          </div>
          <h3 className="text-lg font-semibold text-primary mb-2">No Payments Found</h3>
          <p className="text-muted mb-4">
            {filterStatus === 'all' && filterCategory === 'all'
              ? 'You haven\'t created any payments yet.'
              : 'No payments match your current filters.'}
          </p>
          <Link
            href="/payments/create"
            className="inline-flex items-center gap-2 px-6 py-3 bg-error hover:bg-error/90 text-white font-medium rounded-lg transition-colors"
          >
            <span className="text-xl">+</span>
            Create Your First Payment
          </Link>
        </div>
      )}

    </div>
  )
}