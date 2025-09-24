'use client'

import { Suspense } from 'react'
import Link from 'next/link'
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

export default function CreateIncomePage() {
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
                <span className="text-primary">Create Event</span>
              </nav>
            </div>

            {/* Page Header */}
            <div className="mb-8">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-primary mb-2">
                    Create Income Event
                  </h1>
                  <p className="text-muted text-lg">
                    Add a new expected income event to track and manage paycheck attribution
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
                </div>
              </div>
            </div>

            {/* Income Form */}
            <div className="glass-card p-6 border-kgiq-primary/20">
              <div className="mb-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-kgiq-primary/20 flex items-center justify-center">
                    <span className="text-kgiq-primary text-lg">💰</span>
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-primary">Income Event Details</h2>
                    <p className="text-sm text-muted">Enter the information for your new income event</p>
                  </div>
                </div>
              </div>

              <Suspense fallback={<Loading message="Loading form..." />}>
                <IncomeForm mode="create" />
              </Suspense>
            </div>

            {/* Tips and Help */}
            <div className="mt-6 glass-card p-6 border-kgiq-secondary/20">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-accent text-sm">💡</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-primary mb-3">Tips for Creating Income Events</h3>
                  <div className="space-y-3 text-sm text-muted">
                    <div className="flex items-start gap-2">
                      <span className="text-success mt-1">•</span>
                      <div>
                        <strong className="text-primary">Regular Paychecks:</strong> Set up recurring events for your salary or hourly wages with accurate expected dates
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-success mt-1">•</span>
                      <div>
                        <strong className="text-primary">Freelance Work:</strong> Create one-time events for project payments and contract work
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-success mt-1">•</span>
                      <div>
                        <strong className="text-primary">Additional Income:</strong> Track bonuses, tax refunds, and other irregular income sources
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-warning mt-1">•</span>
                      <div>
                        <strong className="text-primary">Accurate Amounts:</strong> Use net amounts (after taxes) for better budget planning
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link href="/income" className="glass-card p-4 border-glass-border/50 hover:border-kgiq-primary/30 transition-colors group">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-muted/20 group-hover:bg-kgiq-primary/20 flex items-center justify-center transition-colors">
                    <span className="text-lg">📋</span>
                  </div>
                  <div>
                    <p className="font-medium text-primary">View All Events</p>
                    <p className="text-sm text-muted">Return to income list</p>
                  </div>
                </div>
              </Link>

              <button className="glass-card p-4 border-glass-border/50 hover:border-kgiq-secondary/30 transition-colors group">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-muted/20 group-hover:bg-kgiq-secondary/20 flex items-center justify-center transition-colors">
                    <span className="text-lg">📅</span>
                  </div>
                  <div>
                    <p className="font-medium text-primary">Bulk Create</p>
                    <p className="text-sm text-muted">Add multiple events</p>
                  </div>
                </div>
              </button>

              <button className="glass-card p-4 border-glass-border/50 hover:border-accent/30 transition-colors group">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-muted/20 group-hover:bg-accent/20 flex items-center justify-center transition-colors">
                    <span className="text-lg">📊</span>
                  </div>
                  <div>
                    <p className="font-medium text-primary">View Calendar</p>
                    <p className="text-sm text-muted">Income schedule</p>
                  </div>
                </div>
              </button>
            </div>

            {/* Footer */}
            <div className="mt-8 glass-card p-4 border-glass-border/50">
              <div className="flex items-center justify-between text-sm text-muted">
                <div className="flex items-center gap-2">
                  <span className="text-accent">✨</span>
                  <span>KGiQ Family Finance - Income Management</span>
                </div>
                <div className="flex items-center gap-4">
                  <span>Auto-save enabled</span>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-success animate-pulse"></div>
                    <span className="text-success">Ready</span>
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