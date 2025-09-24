'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import Header from '@/components/layout/header'
import Sidebar from '@/components/navigation/sidebar'
import PaymentAttribution from '@/components/payments/attribution'
import Loading from '@/components/ui/loading'

interface User {
  name: string
  email: string
  role: string
  initials: string
}

export default function PaymentDetailsPage() {
  const params = useParams()
  const paymentId = params?.id as string

  // Mock user data - in real app, this would come from auth context
  const user: User = {
    name: 'Sarah Johnson',
    email: 'sarah@johnson-family.com',
    role: 'Administrator',
    initials: 'SJ'
  }

  // Mock payment data - would come from API
  const payment = {
    id: paymentId,
    payee: 'City Electric Company',
    description: 'Monthly Electricity Bill - December 2024',
    amount: 450.00,
    dueDate: '2024-12-05',
    paidDate: null,
    paidAmount: null,
    status: 'scheduled',
    category: 'Utilities',
    isRecurring: true,
    frequency: 'monthly',
    paymentMethod: 'Auto-Pay - Chase Checking (...4567)',
    notes: 'Winter heating season - higher usage expected',
    attributions: [
      { id: '1', incomeDescription: 'Monthly Salary - Dec 1st', amount: 450, percentage: 100 }
    ],
    reminders: [
      { type: 'email', days: 3 },
      { type: 'app', days: 1 }
    ],
    history: [
      { date: '2024-11-05', amount: 385, status: 'paid' },
      { date: '2024-10-05', amount: 342, status: 'paid' },
      { date: '2024-09-05', amount: 298, status: 'paid' }
    ]
  }

  const attributedAmount = payment.attributions.reduce((sum, attr) => sum + attr.amount, 0)
  const remainingAmount = payment.amount - attributedAmount
  const isOverdue = new Date(payment.dueDate) < new Date() && payment.status !== 'paid'
  const isDueSoon = new Date(payment.dueDate) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  return (
    <div className="min-h-screen bg-gradient-to-br from-bg-primary via-bg-secondary to-bg-tertiary">
      {/* Header */}
      <Header user={user} />

      <div className="flex">
        {/* Sidebar */}
        <Sidebar />

        {/* Main Content */}
        <main className="flex-1 p-6 ml-[280px]">
          <div className="max-w-5xl mx-auto">

            {/* Breadcrumb Navigation */}
            <div className="mb-6">
              <nav className="flex items-center gap-2 text-sm">
                <Link href="/dashboard" className="text-muted hover:text-accent transition-colors">
                  Dashboard
                </Link>
                <span className="text-muted">/</span>
                <Link href="/payments" className="text-muted hover:text-accent transition-colors">
                  Payments
                </Link>
                <span className="text-muted">/</span>
                <span className="text-primary">Payment #{paymentId}</span>
              </nav>
            </div>

            {/* Page Header */}
            <div className="mb-8">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-primary mb-2">
                    Payment Details
                  </h1>
                  <p className="text-muted text-lg">
                    View and manage your payment information and attribution settings
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Link
                    href="/payments"
                    className="inline-flex items-center gap-2 px-4 py-2 border border-glass-border/50 bg-glass-bg hover:bg-glass-bg-light text-muted hover:text-primary rounded-lg transition-colors"
                  >
                    <span className="text-lg">←</span>
                    Back to Payments
                  </Link>
                  <Link
                    href={`/payments/${paymentId}/edit`}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-error hover:bg-error/90 text-white font-medium rounded-lg transition-colors"
                  >
                    <span className="text-lg">✏️</span>
                    Edit Payment
                  </Link>
                </div>
              </div>
            </div>

            {/* Status and Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">

              {/* Main Payment Info */}
              <div className="lg:col-span-2 glass-card p-6 border-error/20">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                      isOverdue
                        ? 'bg-error/20'
                        : isDueSoon
                        ? 'bg-warning/20'
                        : 'bg-kgiq-primary/20'
                    }`}>
                      <span className={`text-xl ${
                        isOverdue
                          ? 'text-error'
                          : isDueSoon
                          ? 'text-warning'
                          : 'text-kgiq-primary'
                      }`}>💳</span>
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-primary">{payment.payee}</h2>
                      <p className="text-muted">{payment.description}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      payment.status === 'paid'
                        ? 'bg-success/20 text-success'
                        : isOverdue
                        ? 'bg-error/20 text-error'
                        : isDueSoon
                        ? 'bg-warning/20 text-warning'
                        : 'bg-muted/20 text-muted'
                    }`}>
                      {payment.status === 'paid' ? '✅ Paid' :
                       isOverdue ? '❌ Overdue' :
                       isDueSoon ? '⚠️ Due Soon' :
                       '📅 Scheduled'}
                    </span>
                    {payment.isRecurring && (
                      <span className="px-2 py-1 bg-accent/20 text-accent text-xs rounded-full">
                        🔄 Recurring
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm text-muted">Amount Due</label>
                      <p className="text-2xl font-bold text-error">${payment.amount.toLocaleString()}</p>
                    </div>
                    <div>
                      <label className="text-sm text-muted">Due Date</label>
                      <p className={`text-lg ${isOverdue ? 'text-error' : isDueSoon ? 'text-warning' : 'text-primary'}`}>
                        {new Date(payment.dueDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm text-muted">Category</label>
                      <p className="text-lg text-primary">{payment.category}</p>
                    </div>
                    <div>
                      <label className="text-sm text-muted">Frequency</label>
                      <p className="text-lg text-primary capitalize">{payment.frequency}</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm text-muted">Paid Amount</label>
                      <p className="text-2xl font-bold text-success">
                        {payment.paidAmount ? `$${payment.paidAmount.toLocaleString()}` : '-'}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm text-muted">Paid Date</label>
                      <p className="text-lg text-primary">
                        {payment.paidDate ? new Date(payment.paidDate).toLocaleDateString() : '-'}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm text-muted">Payment Method</label>
                      <p className="text-lg text-primary">{payment.paymentMethod}</p>
                    </div>
                    <div>
                      <label className="text-sm text-muted">Next Due</label>
                      <p className="text-lg text-primary">
                        {payment.isRecurring ? 'Jan 5, 2025' : 'One-time'}
                      </p>
                    </div>
                  </div>
                </div>

                {payment.notes && (
                  <div className="mt-6 pt-6 border-t border-glass-border/30">
                    <label className="text-sm text-muted">Notes</label>
                    <p className="text-primary mt-1">{payment.notes}</p>
                  </div>
                )}
              </div>

              {/* Attribution Summary */}
              <div className="glass-card p-6 border-kgiq-secondary/20">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-kgiq-secondary/20 flex items-center justify-center">
                    <span className="text-kgiq-secondary text-lg">🔗</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-primary">Attribution Summary</h3>
                    <p className="text-sm text-muted">Income assignments</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-glass-bg-light rounded-lg">
                    <span className="text-sm text-muted">Total Attributed</span>
                    <span className="font-semibold text-primary">${attributedAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-glass-bg-light rounded-lg">
                    <span className="text-sm text-muted">Remaining</span>
                    <span className={`font-semibold ${remainingAmount > 0 ? 'text-warning' : remainingAmount < 0 ? 'text-error' : 'text-success'}`}>
                      ${remainingAmount.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-glass-bg-light rounded-lg">
                    <span className="text-sm text-muted">Attribution Rate</span>
                    <span className="font-semibold text-accent">
                      {((attributedAmount / payment.amount) * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>

                <button className="w-full mt-4 px-4 py-2 bg-kgiq-secondary/20 hover:bg-kgiq-secondary/30 text-kgiq-secondary font-medium rounded-lg transition-colors">
                  Manage Attributions
                </button>
              </div>

            </div>

            {/* Attribution Details */}
            <div className="glass-card p-6 border-glass-border/50 mb-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
                    <span className="text-accent text-lg">💰</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-primary">Income Attributions</h3>
                    <p className="text-sm text-muted">How this payment is funded</p>
                  </div>
                </div>
                <button className="px-4 py-2 bg-kgiq-primary hover:bg-kgiq-primary/90 text-white font-medium rounded-lg transition-colors">
                  + Add Attribution
                </button>
              </div>

              <div className="space-y-3">
                {payment.attributions.map((attribution) => (
                  <div key={attribution.id} className="flex items-center justify-between p-4 bg-glass-bg-light rounded-lg border border-glass-border/30">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-success/20 flex items-center justify-center">
                        <span className="text-success text-sm">💰</span>
                      </div>
                      <div>
                        <p className="font-medium text-primary">{attribution.incomeDescription}</p>
                        <p className="text-sm text-muted">{attribution.percentage.toFixed(1)}% of payment</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-semibold text-lg text-primary">${attribution.amount.toLocaleString()}</span>
                      <div className="flex items-center gap-2">
                        <button className="p-1 text-muted hover:text-accent transition-colors">
                          <span className="text-sm">✏️</span>
                        </button>
                        <button className="p-1 text-muted hover:text-error transition-colors">
                          <span className="text-sm">🗑️</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {remainingAmount !== 0 && (
                <div className="mt-4 p-3 bg-warning/10 border border-warning/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="text-warning">⚠️</span>
                    <span className="text-sm font-medium text-warning">
                      {remainingAmount > 0
                        ? `$${remainingAmount.toLocaleString()} still needs attribution`
                        : `Over-attributed by $${Math.abs(remainingAmount).toLocaleString()}`
                      }
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Payment History */}
            <div className="glass-card p-6 border-glass-border/50 mb-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-muted/20 flex items-center justify-center">
                  <span className="text-muted text-lg">📊</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-primary">Payment History</h3>
                  <p className="text-sm text-muted">Recent payment records</p>
                </div>
              </div>

              <div className="space-y-3">
                {payment.history.map((record, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-glass-bg-light rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="text-success">✅</span>
                      <div>
                        <p className="text-sm font-medium text-primary">{new Date(record.date).toLocaleDateString()}</p>
                        <p className="text-xs text-muted">Paid on time</p>
                      </div>
                    </div>
                    <span className="font-medium text-success">${record.amount.toLocaleString()}</span>
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-4 border-t border-glass-border/30">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-sm text-muted">Average</p>
                    <p className="font-semibold text-primary">
                      ${(payment.history.reduce((sum, h) => sum + h.amount, 0) / payment.history.length).toFixed(0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted">On-Time Rate</p>
                    <p className="font-semibold text-success">100%</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted">Last 3 Months</p>
                    <p className="font-semibold text-primary">${payment.history.reduce((sum, h) => sum + h.amount, 0).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Link href={`/payments/${paymentId}/edit`} className="glass-card p-4 border-glass-border/50 hover:border-error/30 transition-colors group">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-muted/20 group-hover:bg-error/20 flex items-center justify-center transition-colors">
                    <span className="text-lg">✏️</span>
                  </div>
                  <div>
                    <p className="font-medium text-primary">Edit Payment</p>
                    <p className="text-sm text-muted">Modify details</p>
                  </div>
                </div>
              </Link>

              <button className="glass-card p-4 border-glass-border/50 hover:border-success/30 transition-colors group">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-muted/20 group-hover:bg-success/20 flex items-center justify-center transition-colors">
                    <span className="text-lg">✅</span>
                  </div>
                  <div>
                    <p className="font-medium text-primary">Mark Paid</p>
                    <p className="text-sm text-muted">Update status</p>
                  </div>
                </div>
              </button>

              <button className="glass-card p-4 border-glass-border/50 hover:border-warning/30 transition-colors group">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-muted/20 group-hover:bg-warning/20 flex items-center justify-center transition-colors">
                    <span className="text-lg">🔄</span>
                  </div>
                  <div>
                    <p className="font-medium text-primary">Duplicate</p>
                    <p className="text-sm text-muted">Create similar</p>
                  </div>
                </div>
              </button>

              <button className="glass-card p-4 border-glass-border/50 hover:border-error/30 transition-colors group">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-muted/20 group-hover:bg-error/20 flex items-center justify-center transition-colors">
                    <span className="text-lg">🗑️</span>
                  </div>
                  <div>
                    <p className="font-medium text-primary">Delete</p>
                    <p className="text-sm text-muted">Remove payment</p>
                  </div>
                </div>
              </button>
            </div>

            {/* Footer */}
            <div className="glass-card p-4 border-glass-border/50">
              <div className="flex items-center justify-between text-sm text-muted">
                <div className="flex items-center gap-2">
                  <span className="text-error">💳</span>
                  <span>KGiQ Family Finance - Payment #{paymentId}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span>Created: {new Date(payment.dueDate).toLocaleDateString()}</span>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-success animate-pulse"></div>
                    <span className="text-success">Synced</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </main>
      </div>
    </div>
  )
}