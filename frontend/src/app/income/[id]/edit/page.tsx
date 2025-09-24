'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import Header from '@/components/layout/header'
import Sidebar from '@/components/navigation/sidebar'
import IncomeForm from '@/components/income/income-form'
import Loading from '@/components/ui/loading'

interface User {
  name: string
  email: string
  role: string
  initials: string
}

export default function EditIncomePage() {
  const params = useParams()
  const incomeId = params?.id as string

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
                <Link href="/income" className="text-muted hover:text-accent transition-colors">
                  Income
                </Link>
                <span className="text-muted">/</span>
                <Link href={`/income/${incomeId}`} className="text-muted hover:text-accent transition-colors">
                  Event #{incomeId}
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
                    Edit Income Event
                  </h1>
                  <p className="text-muted text-lg">
                    Modify the details of your income event and update attribution settings
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Link
                    href={`/income/${incomeId}`}
                    className="inline-flex items-center gap-2 px-4 py-2 border border-glass-border/50 bg-glass-bg hover:bg-glass-bg-light text-muted hover:text-primary rounded-lg transition-colors"
                  >
                    <span className="text-lg">←</span>
                    Back to Event
                  </Link>
                </div>
              </div>
            </div>

            {/* Current Event Info */}
            <div className="mb-6 glass-card p-4 border-kgiq-secondary/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-kgiq-secondary/20 flex items-center justify-center">
                  <span className="text-kgiq-secondary text-lg">ℹ️</span>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-primary mb-1">Current Event Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-muted">Status: </span>
                      <span className="text-warning font-medium">Pending</span>
                    </div>
                    <div>
                      <span className="text-muted">Expected: </span>
                      <span className="text-primary">$2,100.00</span>
                    </div>
                    <div>
                      <span className="text-muted">Due Date: </span>
                      <span className="text-primary">Dec 15, 2024</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 bg-warning/20 text-warning text-xs rounded-full">
                    Unverified
                  </span>
                </div>
              </div>
            </div>

            {/* Edit Form */}
            <div className="glass-card p-6 border-kgiq-primary/20">
              <div className="mb-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-kgiq-primary/20 flex items-center justify-center">
                    <span className="text-kgiq-primary text-lg">✏️</span>
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-primary">Update Event Details</h2>
                    <p className="text-sm text-muted">Make changes to your income event information</p>
                  </div>
                </div>
              </div>

              <Suspense fallback={<Loading message="Loading event data..." />}>
                <IncomeForm mode="edit" incomeId={incomeId} />
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
                        <strong className="text-primary">Attribution Impact:</strong> Changing the amount may affect existing payment attributions and budget allocations
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-warning mt-1">•</span>
                      <div>
                        <strong className="text-primary">Date Changes:</strong> Modifying the expected date may impact cash flow projections and payment schedules
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-warning mt-1">•</span>
                      <div>
                        <strong className="text-primary">Status Updates:</strong> Marking as received will trigger budget allocation calculations
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link href={`/income/${incomeId}`} className="glass-card p-4 border-glass-border/50 hover:border-kgiq-primary/30 transition-colors group">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-muted/20 group-hover:bg-kgiq-primary/20 flex items-center justify-center transition-colors">
                    <span className="text-lg">👁️</span>
                  </div>
                  <div>
                    <p className="font-medium text-primary">View Details</p>
                    <p className="text-sm text-muted">See full event info</p>
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

              <button className="glass-card p-4 border-glass-border/50 hover:border-accent/30 transition-colors group">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-muted/20 group-hover:bg-accent/20 flex items-center justify-center transition-colors">
                    <span className="text-lg">🔗</span>
                  </div>
                  <div>
                    <p className="font-medium text-primary">Attributions</p>
                    <p className="text-sm text-muted">Manage payments</p>
                  </div>
                </div>
              </button>
            </div>

            {/* Footer */}
            <div className="mt-8 glass-card p-4 border-glass-border/50">
              <div className="flex items-center justify-between text-sm text-muted">
                <div className="flex items-center gap-2">
                  <span className="text-accent">📝</span>
                  <span>KGiQ Family Finance - Edit Income Event</span>
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