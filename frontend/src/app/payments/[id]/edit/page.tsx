'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import Header from '@/components/layout/header'
import Sidebar from '@/components/navigation/sidebar'
import PaymentForm from '@/components/payments/payment-form'
import Loading from '@/components/ui/loading'

interface User {
  name: string
  email: string
  role: string
  initials: string
}

export default function EditPaymentPage() {
  const params = useParams()
  const paymentId = params?.id as string

  // Mock user data - in real app, this would come from auth context
  const user: User = {
    name: 'Sarah Johnson',
    email: 'sarah@johnson-family.com',
    role: 'Administrator',
    initials: 'SJ'
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
          <div className="max-w-4xl mx-auto">

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
                <Link href={`/payments/${paymentId}`} className="text-muted hover:text-accent transition-colors">
                  Payment #{paymentId}
                </Link>
                <span className="text-muted">/</span>
                <span className="text-primary">Edit</span>
              </nav>
            </div>

            {/* Page Header */}
            <div className="mb-8">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-primary mb-2">
                    Edit Payment
                  </h1>
                  <p className="text-muted text-lg">
                    Modify payment details, due dates, and attribution settings
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Link
                    href={`/payments/${paymentId}`}
                    className="inline-flex items-center gap-2 px-4 py-2 border border-glass-border/50 bg-glass-bg hover:bg-glass-bg-light text-muted hover:text-primary rounded-lg transition-colors"
                  >
                    <span className="text-lg">←</span>
                    Back to Payment
                  </Link>
                </div>
              </div>
            </div>

            {/* Current Payment Info */}
            <div className="mb-6 glass-card p-4 border-error/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-error/20 flex items-center justify-center">
                  <span className="text-error text-lg">ℹ️</span>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-primary mb-1">Current Payment Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-muted">Status: </span>
                      <span className="text-warning font-medium">Scheduled</span>
                    </div>
                    <div>
                      <span className="text-muted">Amount: </span>
                      <span className="text-error">$450.00</span>
                    </div>
                    <div>
                      <span className="text-muted">Due Date: </span>
                      <span className="text-primary">Dec 5, 2024</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mt-2">
                    <div>
                      <span className="text-muted">Payee: </span>
                      <span className="text-primary">City Electric Company</span>
                    </div>
                    <div>
                      <span className="text-muted">Category: </span>
                      <span className="text-accent">Utilities</span>
                    </div>
                    <div>
                      <span className="text-muted">Attribution: </span>
                      <span className="text-success">Assigned</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 bg-warning/20 text-warning text-xs rounded-full">
                    Due Soon
                  </span>
                </div>
              </div>
            </div>

            {/* Edit Form */}
            <div className="glass-card p-6 border-error/20">
              <div className="mb-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-error/20 flex items-center justify-center">
                    <span className="text-error text-lg">✏️</span>
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-primary">Update Payment Details</h2>
                    <p className="text-sm text-muted">Make changes to your payment information</p>
                  </div>
                </div>
              </div>

              <Suspense fallback={<Loading message="Loading payment data..." />}>
                <PaymentForm mode="edit" paymentId={paymentId} />
              </Suspense>
            </div>

            {/* Warning and Actions */}
            <div className="mt-6 glass-card p-6 border-warning/20">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-warning/20 flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-warning text-sm">⚠️</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-primary mb-3">Important Considerations</h3>
                  <div className="space-y-3 text-sm text-muted">
                    <div className="flex items-start gap-2">
                      <span className="text-warning mt-1">•</span>
                      <div>
                        <strong className="text-primary">Attribution Impact:</strong> Changing the amount may affect existing income event attributions and budget calculations
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-warning mt-1">•</span>
                      <div>
                        <strong className="text-primary">Due Date Changes:</strong> Modifying due dates may impact cash flow timing and require re-attribution
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-warning mt-1">•</span>
                      <div>
                        <strong className="text-primary">Recurring Payments:</strong> Changes to recurring payments will affect future occurrences and schedules
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-error mt-1">•</span>
                      <div>
                        <strong className="text-primary">Auto-Pay Settings:</strong> Review automatic payment settings if changing amount or account details
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Attribution Status */}
            <div className="mt-6 glass-card p-4 border-kgiq-secondary/20 bg-kgiq-secondary/5">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-kgiq-secondary/20 flex items-center justify-center">
                  <span className="text-kgiq-secondary text-lg">🔗</span>
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-primary mb-1">Attribution Status</h4>
                  <div className="text-sm text-muted">
                    This payment is currently attributed to <span className="text-success font-medium">Salary - Dec 1st</span> ($450 of $2,100 remaining).
                    Changes may require updating attribution assignments.
                  </div>
                </div>
                <button className="px-3 py-1.5 bg-kgiq-secondary/20 hover:bg-kgiq-secondary/30 text-kgiq-secondary rounded-lg text-sm font-medium transition-colors">
                  Manage Attribution
                </button>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link href={`/payments/${paymentId}`} className="glass-card p-4 border-glass-border/50 hover:border-error/30 transition-colors group">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-muted/20 group-hover:bg-error/20 flex items-center justify-center transition-colors">
                    <span className="text-lg">👁️</span>
                  </div>
                  <div>
                    <p className="font-medium text-primary">View Details</p>
                    <p className="text-sm text-muted">See full payment info</p>
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

              <button className="glass-card p-4 border-glass-border/50 hover:border-accent/30 transition-colors group">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-muted/20 group-hover:bg-accent/20 flex items-center justify-center transition-colors">
                    <span className="text-lg">📋</span>
                  </div>
                  <div>
                    <p className="font-medium text-primary">Duplicate</p>
                    <p className="text-sm text-muted">Create similar payment</p>
                  </div>
                </div>
              </button>
            </div>

            {/* Footer */}
            <div className="mt-8 glass-card p-4 border-glass-border/50">
              <div className="flex items-center justify-between text-sm text-muted">
                <div className="flex items-center gap-2">
                  <span className="text-error">📝</span>
                  <span>KGiQ Family Finance - Edit Payment</span>
                </div>
                <div className="flex items-center gap-4">
                  <span>Last modified: {new Date().toLocaleDateString()}</span>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-success animate-pulse"></div>
                    <span className="text-success">Auto-save</span>
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