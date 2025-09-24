'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import Header from '@/components/layout/header'
import Sidebar from '@/components/navigation/sidebar'
import AttributionModal from '@/components/income/attribution-modal'
import Loading from '@/components/ui/loading'

interface User {
  name: string
  email: string
  role: string
  initials: string
}

export default function IncomeDetailsPage() {
  const params = useParams()
  const incomeId = params?.id as string

  // Mock user data - in real app, this would come from auth context
  const user: User = {
    name: 'Sarah Johnson',
    email: 'sarah@johnson-family.com',
    role: 'Administrator',
    initials: 'SJ'
  }

  // Mock income event data - would come from API
  const incomeEvent = {
    id: incomeId,
    description: 'Monthly Salary - December 2024',
    source: 'Employer - ABC Corp',
    expectedAmount: 2100.00,
    receivedAmount: 2100.00,
    expectedDate: '2024-12-15',
    receivedDate: '2024-12-15',
    status: 'received',
    isRecurring: true,
    frequency: 'monthly',
    category: 'salary',
    bankAccount: 'Chase Checking (...4567)',
    notes: 'Regular biweekly payroll deposit',
    attributions: [
      { id: '1', paymentDescription: 'Rent Payment', amount: 850, percentage: 40.48 },
      { id: '2', paymentDescription: 'Car Payment', amount: 320, percentage: 15.24 },
      { id: '3', paymentDescription: 'Groceries Budget', amount: 200, percentage: 9.52 },
      { id: '4', paymentDescription: 'Savings', amount: 300, percentage: 14.29 }
    ]
  }

  const attributedAmount = incomeEvent.attributions.reduce((sum, attr) => sum + attr.amount, 0)
  const remainingAmount = incomeEvent.receivedAmount - attributedAmount

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
                <Link href="/income" className="text-muted hover:text-accent transition-colors">
                  Income
                </Link>
                <span className="text-muted">/</span>
                <span className="text-primary">Event #{incomeId}</span>
              </nav>
            </div>

            {/* Page Header */}
            <div className="mb-8">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-primary mb-2">
                    Income Event Details
                  </h1>
                  <p className="text-muted text-lg">
                    View and manage your income event information and attributions
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Link
                    href="/income"
                    className="inline-flex items-center gap-2 px-4 py-2 border border-glass-border/50 bg-glass-bg hover:bg-glass-bg-light text-muted hover:text-primary rounded-lg transition-colors"
                  >
                    <span className="text-lg">←</span>
                    Back to Income
                  </Link>
                  <Link
                    href={`/income/${incomeId}/edit`}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-kgiq-primary hover:bg-kgiq-primary/90 text-white font-medium rounded-lg transition-colors"
                  >
                    <span className="text-lg">✏️</span>
                    Edit Event
                  </Link>
                </div>
              </div>
            </div>

            {/* Status and Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">

              {/* Main Event Info */}
              <div className="lg:col-span-2 glass-card p-6 border-kgiq-primary/20">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-success/20 flex items-center justify-center">
                      <span className="text-success text-xl">💰</span>
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-primary">{incomeEvent.description}</h2>
                      <p className="text-muted">{incomeEvent.source}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      incomeEvent.status === 'received'
                        ? 'bg-success/20 text-success'
                        : incomeEvent.status === 'pending'
                        ? 'bg-warning/20 text-warning'
                        : 'bg-muted/20 text-muted'
                    }`}>
                      {incomeEvent.status === 'received' ? '✅ Received' :
                       incomeEvent.status === 'pending' ? '⏳ Pending' :
                       '❌ Overdue'}
                    </span>
                    {incomeEvent.isRecurring && (
                      <span className="px-2 py-1 bg-accent/20 text-accent text-xs rounded-full">
                        🔄 Recurring
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm text-muted">Expected Amount</label>
                      <p className="text-2xl font-bold text-primary">${incomeEvent.expectedAmount.toLocaleString()}</p>
                    </div>
                    <div>
                      <label className="text-sm text-muted">Expected Date</label>
                      <p className="text-lg text-primary">{new Date(incomeEvent.expectedDate).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <label className="text-sm text-muted">Category</label>
                      <p className="text-lg text-primary capitalize">{incomeEvent.category}</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm text-muted">Received Amount</label>
                      <p className="text-2xl font-bold text-success">${incomeEvent.receivedAmount.toLocaleString()}</p>
                    </div>
                    <div>
                      <label className="text-sm text-muted">Received Date</label>
                      <p className="text-lg text-primary">{incomeEvent.receivedDate ? new Date(incomeEvent.receivedDate).toLocaleDateString() : '-'}</p>
                    </div>
                    <div>
                      <label className="text-sm text-muted">Bank Account</label>
                      <p className="text-lg text-primary">{incomeEvent.bankAccount}</p>
                    </div>
                  </div>
                </div>

                {incomeEvent.notes && (
                  <div className="mt-6 pt-6 border-t border-glass-border/30">
                    <label className="text-sm text-muted">Notes</label>
                    <p className="text-primary mt-1">{incomeEvent.notes}</p>
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
                    <p className="text-sm text-muted">Payment allocations</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-glass-bg-light rounded-lg">
                    <span className="text-sm text-muted">Total Attributed</span>
                    <span className="font-semibold text-primary">${attributedAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-glass-bg-light rounded-lg">
                    <span className="text-sm text-muted">Remaining</span>
                    <span className={`font-semibold ${remainingAmount > 0 ? 'text-success' : remainingAmount < 0 ? 'text-error' : 'text-muted'}`}>
                      ${remainingAmount.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-glass-bg-light rounded-lg">
                    <span className="text-sm text-muted">Attribution Rate</span>
                    <span className="font-semibold text-accent">
                      {((attributedAmount / incomeEvent.receivedAmount) * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>

                <button className="w-full mt-4 px-4 py-2 bg-kgiq-secondary/20 hover:bg-kgiq-secondary/30 text-kgiq-secondary font-medium rounded-lg transition-colors">
                  Manage Attributions
                </button>
              </div>

            </div>

            {/* Attributions List */}
            <div className="glass-card p-6 border-glass-border/50 mb-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
                    <span className="text-accent text-lg">📋</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-primary">Payment Attributions</h3>
                    <p className="text-sm text-muted">How this income is allocated to payments</p>
                  </div>
                </div>
                <button className="px-4 py-2 bg-kgiq-primary hover:bg-kgiq-primary/90 text-white font-medium rounded-lg transition-colors">
                  + Add Attribution
                </button>
              </div>

              <div className="space-y-3">
                {incomeEvent.attributions.map((attribution) => (
                  <div key={attribution.id} className="flex items-center justify-between p-4 bg-glass-bg-light rounded-lg border border-glass-border/30">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-kgiq-primary/20 flex items-center justify-center">
                        <span className="text-kgiq-primary text-sm">💸</span>
                      </div>
                      <div>
                        <p className="font-medium text-primary">{attribution.paymentDescription}</p>
                        <p className="text-sm text-muted">{attribution.percentage.toFixed(1)}% of income</p>
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
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Link href={`/income/${incomeId}/edit`} className="glass-card p-4 border-glass-border/50 hover:border-kgiq-primary/30 transition-colors group">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-muted/20 group-hover:bg-kgiq-primary/20 flex items-center justify-center transition-colors">
                    <span className="text-lg">✏️</span>
                  </div>
                  <div>
                    <p className="font-medium text-primary">Edit Event</p>
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
                    <p className="font-medium text-primary">Mark Received</p>
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
                    <p className="text-sm text-muted">Remove event</p>
                  </div>
                </div>
              </button>
            </div>

            {/* Footer */}
            <div className="glass-card p-4 border-glass-border/50">
              <div className="flex items-center justify-between text-sm text-muted">
                <div className="flex items-center gap-2">
                  <span className="text-accent">💼</span>
                  <span>KGiQ Family Finance - Income Event #{incomeId}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span>Created: {new Date(incomeEvent.expectedDate).toLocaleDateString()}</span>
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