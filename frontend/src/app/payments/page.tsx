'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import Header from '@/components/layout/header'
import Sidebar from '@/components/navigation/sidebar'
import PaymentList from '@/components/payments/payment-list'
import Loading from '@/components/ui/loading'

interface User {
  name: string
  email: string
  role: string
  initials: string
}

export default function PaymentsPage() {
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
          <div className="max-w-7xl mx-auto">

            {/* Page Header */}
            <div className="mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-primary mb-2">
                    Bill & Payment Management
                  </h1>
                  <p className="text-muted text-lg">
                    Track your bills, schedule payments, and manage spending across income events
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Link
                    href="/payments/overdue"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-error/20 hover:bg-error/30 text-error border border-error/20 font-medium rounded-lg transition-colors"
                  >
                    <span className="text-sm">⚠️</span>
                    Overdue (3)
                  </Link>
                  <Link
                    href="/payments/create"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-kgiq-primary hover:bg-kgiq-primary/90 text-white font-medium rounded-lg transition-colors"
                  >
                    <span className="text-xl">+</span>
                    Add Payment
                  </Link>
                </div>
              </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="glass-card p-4 border-kgiq-secondary/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-error/20 flex items-center justify-center">
                    <span className="text-error text-lg">💳</span>
                  </div>
                  <div>
                    <p className="text-sm text-muted">Total This Month</p>
                    <p className="text-xl font-bold text-error">$2,850</p>
                  </div>
                </div>
              </div>

              <div className="glass-card p-4 border-kgiq-secondary/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-warning/20 flex items-center justify-center">
                    <span className="text-warning text-lg">📅</span>
                  </div>
                  <div>
                    <p className="text-sm text-muted">Due This Week</p>
                    <p className="text-xl font-bold text-warning">7 Bills</p>
                  </div>
                </div>
              </div>

              <div className="glass-card p-4 border-kgiq-secondary/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-error/20 flex items-center justify-center">
                    <span className="text-error text-lg">⚠️</span>
                  </div>
                  <div>
                    <p className="text-sm text-muted">Overdue</p>
                    <p className="text-xl font-bold text-error">3 Bills</p>
                  </div>
                </div>
              </div>

              <div className="glass-card p-4 border-kgiq-secondary/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-success/20 flex items-center justify-center">
                    <span className="text-success text-lg">✅</span>
                  </div>
                  <div>
                    <p className="text-sm text-muted">Paid This Month</p>
                    <p className="text-xl font-bold text-success">12 Bills</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Filter and Action Bar */}
            <div className="glass-card p-4 mb-6 border-glass-border/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-muted">Filter:</label>
                    <select className="px-3 py-1.5 bg-glass-bg border border-glass-border/50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-kgiq-primary/50">
                      <option value="all">All Payments</option>
                      <option value="upcoming">Due Soon</option>
                      <option value="overdue">Overdue</option>
                      <option value="paid">Paid</option>
                      <option value="recurring">Recurring</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-muted">Category:</label>
                    <select className="px-3 py-1.5 bg-glass-bg border border-glass-border/50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-kgiq-primary/50">
                      <option value="all">All Categories</option>
                      <option value="housing">Housing</option>
                      <option value="utilities">Utilities</option>
                      <option value="insurance">Insurance</option>
                      <option value="subscriptions">Subscriptions</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-muted">Date Range:</label>
                    <select className="px-3 py-1.5 bg-glass-bg border border-glass-border/50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-kgiq-primary/50">
                      <option value="all">All Time</option>
                      <option value="week">This Week</option>
                      <option value="month">This Month</option>
                      <option value="quarter">This Quarter</option>
                    </select>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button className="p-2 text-muted hover:text-primary transition-colors" title="Refresh">
                    <span className="text-lg">🔄</span>
                  </button>
                  <button className="p-2 text-muted hover:text-primary transition-colors" title="Calendar View">
                    <span className="text-lg">📅</span>
                  </button>
                  <button className="p-2 text-muted hover:text-primary transition-colors" title="Export">
                    <span className="text-lg">📊</span>
                  </button>
                  <button className="p-2 text-muted hover:text-primary transition-colors" title="Settings">
                    <span className="text-lg">⚙️</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Link
                href="/payments/create"
                className="glass-card p-4 border-kgiq-primary/20 hover:border-kgiq-primary/40 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-kgiq-primary/20 flex items-center justify-center group-hover:bg-kgiq-primary/30">
                    <span className="text-kgiq-primary text-lg">+</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-primary">Schedule New Payment</h3>
                    <p className="text-sm text-muted">Add a one-time or recurring bill</p>
                  </div>
                </div>
              </Link>

              <button className="glass-card p-4 border-kgiq-secondary/20 hover:border-kgiq-secondary/40 transition-colors group">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-kgiq-secondary/20 flex items-center justify-center group-hover:bg-kgiq-secondary/30">
                    <span className="text-kgiq-secondary text-lg">📊</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-primary">Bulk Attribution</h3>
                    <p className="text-sm text-muted">Assign multiple bills to income</p>
                  </div>
                </div>
              </button>

              <button className="glass-card p-4 border-accent/20 hover:border-accent/40 transition-colors group">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center group-hover:bg-accent/30">
                    <span className="text-accent text-lg">📋</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-primary">Spending Categories</h3>
                    <p className="text-sm text-muted">Manage payment categories</p>
                  </div>
                </div>
              </button>
            </div>

            {/* Payment List */}
            <Suspense fallback={<Loading message="Loading payments..." />}>
              <PaymentList />
            </Suspense>

            {/* Footer */}
            <div className="mt-8 glass-card p-4 border-glass-border/50">
              <div className="flex items-center justify-between text-sm text-muted">
                <div className="flex items-center gap-2">
                  <span className="text-error">💳</span>
                  <span>KGiQ Family Finance - Payment Management</span>
                </div>
                <div className="flex items-center gap-4">
                  <span>Last updated: {new Date().toLocaleString()}</span>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-success animate-pulse"></div>
                    <span className="text-success">Live</span>
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