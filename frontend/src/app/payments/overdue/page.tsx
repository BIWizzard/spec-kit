'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import Header from '@/components/layout/header'
import Sidebar from '@/components/navigation/sidebar'
import Loading from '@/components/ui/loading'

interface User {
  name: string
  email: string
  role: string
  initials: string
}

export default function OverduePaymentsPage() {
  // Mock user data - in real app, this would come from auth context
  const user: User = {
    name: 'Sarah Johnson',
    email: 'sarah@johnson-family.com',
    role: 'Administrator',
    initials: 'SJ'
  }

  // Mock overdue payments data - would come from API
  const overduePayments = [
    {
      id: '1',
      payee: 'City Water Department',
      description: 'Water & Sewer - November 2024',
      amount: 125.50,
      dueDate: '2024-11-28',
      daysPastDue: 8,
      category: 'Utilities',
      lateFee: 15.00,
      totalOwed: 140.50,
      status: 'overdue',
      priority: 'high'
    },
    {
      id: '2',
      payee: 'Medical Associates',
      description: 'Routine Checkup Co-pay',
      amount: 45.00,
      dueDate: '2024-11-20',
      daysPastDue: 16,
      category: 'Healthcare',
      lateFee: 25.00,
      totalOwed: 70.00,
      status: 'overdue',
      priority: 'medium'
    },
    {
      id: '3',
      payee: 'Auto Insurance Co',
      description: 'Monthly Premium - November',
      amount: 185.00,
      dueDate: '2024-11-15',
      daysPastDue: 21,
      category: 'Insurance',
      lateFee: 35.00,
      totalOwed: 220.00,
      status: 'overdue',
      priority: 'critical'
    },
    {
      id: '4',
      payee: 'Credit Card Payment',
      description: 'Minimum Payment - November',
      amount: 95.00,
      dueDate: '2024-11-25',
      daysPastDue: 11,
      category: 'Credit Cards',
      lateFee: 39.00,
      totalOwed: 134.00,
      status: 'overdue',
      priority: 'high'
    }
  ]

  const totalOverdue = overduePayments.reduce((sum, payment) => sum + payment.totalOwed, 0)
  const totalLateFees = overduePayments.reduce((sum, payment) => sum + payment.lateFee, 0)
  const criticalCount = overduePayments.filter(p => p.priority === 'critical').length
  const highCount = overduePayments.filter(p => p.priority === 'high').length

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'text-error bg-error/20 border-error/30'
      case 'high': return 'text-warning bg-warning/20 border-warning/30'
      case 'medium': return 'text-accent bg-accent/20 border-accent/30'
      default: return 'text-muted bg-muted/20 border-muted/30'
    }
  }

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'critical': return '🚨'
      case 'high': return '⚠️'
      case 'medium': return '📋'
      default: return '📄'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-bg-primary via-bg-secondary to-bg-tertiary">
      {/* Header */}
      <Header user={user} />

      <div className="flex">
        {/* Sidebar */}
        <Sidebar />

        {/* Main Content */}
        <main className="flex-1 p-6 ml-[280px]">
          <div className="max-w-7xl mx-auto">

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
                <span className="text-primary">Overdue Payments</span>
              </nav>
            </div>

            {/* Page Header */}
            <div className="mb-8">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-error mb-2">
                    Overdue Payments
                  </h1>
                  <p className="text-muted text-lg">
                    Urgent payments requiring immediate attention to avoid additional fees and credit impact
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
                  <button className="inline-flex items-center gap-2 px-6 py-3 bg-error hover:bg-error/90 text-white font-medium rounded-lg transition-colors">
                    <span className="text-lg">💳</span>
                    Pay All Now
                  </button>
                </div>
              </div>
            </div>

            {/* Critical Alert */}
            {criticalCount > 0 && (
              <div className="mb-6 glass-card p-4 border-error/30 bg-error/5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-error/20 flex items-center justify-center animate-pulse">
                    <span className="text-error text-lg">🚨</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-error mb-1">Critical Payment Alert</h3>
                    <p className="text-sm text-muted">
                      You have {criticalCount} critical payment{criticalCount !== 1 ? 's' : ''} that may significantly impact your credit score.
                      Immediate action is recommended to avoid further penalties.
                    </p>
                  </div>
                  <button className="px-4 py-2 bg-error/20 hover:bg-error/30 text-error font-medium rounded-lg transition-colors">
                    Take Action
                  </button>
                </div>
              </div>
            )}

            {/* Overview Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="glass-card p-4 border-error/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-error/20 flex items-center justify-center">
                    <span className="text-error text-lg">💸</span>
                  </div>
                  <div>
                    <p className="text-sm text-muted">Total Overdue</p>
                    <p className="text-xl font-bold text-error">${totalOverdue.toFixed(2)}</p>
                  </div>
                </div>
              </div>

              <div className="glass-card p-4 border-warning/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-warning/20 flex items-center justify-center">
                    <span className="text-warning text-lg">🏦</span>
                  </div>
                  <div>
                    <p className="text-sm text-muted">Late Fees</p>
                    <p className="text-xl font-bold text-warning">${totalLateFees.toFixed(2)}</p>
                  </div>
                </div>
              </div>

              <div className="glass-card p-4 border-error/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-error/20 flex items-center justify-center">
                    <span className="text-error text-lg">🚨</span>
                  </div>
                  <div>
                    <p className="text-sm text-muted">Critical Items</p>
                    <p className="text-xl font-bold text-error">{criticalCount}</p>
                  </div>
                </div>
              </div>

              <div className="glass-card p-4 border-warning/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-warning/20 flex items-center justify-center">
                    <span className="text-warning text-lg">⚠️</span>
                  </div>
                  <div>
                    <p className="text-sm text-muted">High Priority</p>
                    <p className="text-xl font-bold text-warning">{highCount}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Bar */}
            <div className="glass-card p-4 mb-6 border-glass-border/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-muted">Sort by:</label>
                    <select className="px-3 py-1.5 bg-glass-bg border border-glass-border/50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-error/50">
                      <option value="priority">Priority</option>
                      <option value="amount">Amount</option>
                      <option value="due-date">Due Date</option>
                      <option value="days-overdue">Days Overdue</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-muted">Priority:</label>
                    <select className="px-3 py-1.5 bg-glass-bg border border-glass-border/50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-error/50">
                      <option value="all">All Priorities</option>
                      <option value="critical">Critical Only</option>
                      <option value="high">High Priority</option>
                      <option value="medium">Medium Priority</option>
                    </select>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button className="px-4 py-2 bg-kgiq-primary hover:bg-kgiq-primary/90 text-white font-medium rounded-lg transition-colors">
                    Bulk Pay
                  </button>
                  <button className="p-2 text-muted hover:text-primary transition-colors" title="Export">
                    <span className="text-lg">📊</span>
                  </button>
                  <button className="p-2 text-muted hover:text-primary transition-colors" title="Print">
                    <span className="text-lg">🖨️</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Overdue Payments List */}
            <div className="space-y-4 mb-6">
              {overduePayments.map((payment) => (
                <div key={payment.id} className={`glass-card p-6 border-l-4 ${
                  payment.priority === 'critical' ? 'border-l-error border-error/20' :
                  payment.priority === 'high' ? 'border-l-warning border-warning/20' :
                  'border-l-accent border-accent/20'
                }`}>
                  <div className="flex items-start justify-between">

                    {/* Payment Details */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-xl">{getPriorityIcon(payment.priority)}</span>
                        <div>
                          <h3 className="text-lg font-semibold text-primary">{payment.payee}</h3>
                          <p className="text-sm text-muted">{payment.description}</p>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(payment.priority)}`}>
                          {payment.priority.toUpperCase()}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                        <div>
                          <p className="text-sm text-muted">Original Amount</p>
                          <p className="font-semibold text-primary">${payment.amount.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted">Due Date</p>
                          <p className="font-semibold text-error">{new Date(payment.dueDate).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted">Days Overdue</p>
                          <p className="font-semibold text-error">{payment.daysPastDue} days</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted">Late Fees</p>
                          <p className="font-semibold text-warning">${payment.lateFee.toFixed(2)}</p>
                        </div>
                      </div>
                    </div>

                    {/* Payment Actions */}
                    <div className="flex flex-col items-end gap-3 ml-6">
                      <div className="text-right">
                        <p className="text-sm text-muted">Total Owed</p>
                        <p className="text-2xl font-bold text-error">${payment.totalOwed.toFixed(2)}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <Link
                          href={`/payments/${payment.id}`}
                          className="px-3 py-1.5 bg-glass-bg hover:bg-glass-bg-light border border-glass-border/50 text-muted hover:text-primary rounded text-sm transition-colors"
                        >
                          View Details
                        </Link>
                        <button className="px-4 py-1.5 bg-error hover:bg-error/90 text-white font-medium rounded text-sm transition-colors">
                          Pay Now
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Warning Banner for Critical Items */}
                  {payment.priority === 'critical' && (
                    <div className="mt-4 p-3 bg-error/10 border border-error/20 rounded-lg">
                      <div className="flex items-center gap-2">
                        <span className="text-error">🚨</span>
                        <span className="text-sm font-medium text-error">
                          CRITICAL: This payment is significantly overdue and may impact your credit score.
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Credit Impact Warning */}
            <div className="glass-card p-6 border-warning/20 mb-6">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-warning/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-warning text-lg">📉</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-primary mb-2">Credit Impact Warning</h3>
                  <div className="space-y-2 text-sm text-muted">
                    <p>• Payments over 30 days late may be reported to credit bureaus</p>
                    <p>• Late payments can lower your credit score by 60-110 points</p>
                    <p>• Multiple late payments compound the negative impact</p>
                    <p>• Consider setting up automatic payments to prevent future occurrences</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Payment Options */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <button className="glass-card p-4 border-error/20 hover:border-error/40 transition-colors group">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-error/20 group-hover:bg-error/30 flex items-center justify-center transition-colors">
                    <span className="text-error text-lg">🚨</span>
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-primary">Pay Critical First</h3>
                    <p className="text-sm text-muted">Focus on highest priority items</p>
                  </div>
                </div>
              </button>

              <button className="glass-card p-4 border-kgiq-primary/20 hover:border-kgiq-primary/40 transition-colors group">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-kgiq-primary/20 group-hover:bg-kgiq-primary/30 flex items-center justify-center transition-colors">
                    <span className="text-kgiq-primary text-lg">💳</span>
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-primary">Pay All at Once</h3>
                    <p className="text-sm text-muted">Clear all overdue payments</p>
                  </div>
                </div>
              </button>

              <button className="glass-card p-4 border-accent/20 hover:border-accent/40 transition-colors group">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-accent/20 group-hover:bg-accent/30 flex items-center justify-center transition-colors">
                    <span className="text-accent text-lg">🔄</span>
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-primary">Setup Auto-Pay</h3>
                    <p className="text-sm text-muted">Prevent future late payments</p>
                  </div>
                </div>
              </button>
            </div>

            {/* Footer */}
            <div className="glass-card p-4 border-glass-border/50">
              <div className="flex items-center justify-between text-sm text-muted">
                <div className="flex items-center gap-2">
                  <span className="text-error">🚨</span>
                  <span>KGiQ Family Finance - Overdue Payment Management</span>
                </div>
                <div className="flex items-center gap-4">
                  <span>Last updated: {new Date().toLocaleString()}</span>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-error animate-pulse"></div>
                    <span className="text-error">Requires Attention</span>
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