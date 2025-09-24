'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import Header from '@/components/layout/header'
import Sidebar from '@/components/navigation/sidebar'
import IncomeList from '@/components/income/income-list'
import Loading from '@/components/ui/loading'

interface User {
  name: string
  email: string
  role: string
  initials: string
}

export default function IncomePage() {
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
                    Income Events
                  </h1>
                  <p className="text-muted text-lg">
                    Manage your expected income and track paycheck attribution
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Link
                    href="/income/create"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-kgiq-primary hover:bg-kgiq-primary/90 text-white font-medium rounded-lg transition-colors"
                  >
                    <span className="text-xl">+</span>
                    Add Income Event
                  </Link>
                </div>
              </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="glass-card p-4 border-kgiq-secondary/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-success/20 flex items-center justify-center">
                    <span className="text-success text-lg">💰</span>
                  </div>
                  <div>
                    <p className="text-sm text-muted">Total This Month</p>
                    <p className="text-xl font-bold text-success">$4,200</p>
                  </div>
                </div>
              </div>

              <div className="glass-card p-4 border-kgiq-secondary/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-kgiq-primary/20 flex items-center justify-center">
                    <span className="text-kgiq-primary text-lg">⏰</span>
                  </div>
                  <div>
                    <p className="text-sm text-muted">Upcoming</p>
                    <p className="text-xl font-bold text-primary">3 Events</p>
                  </div>
                </div>
              </div>

              <div className="glass-card p-4 border-kgiq-secondary/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-warning/20 flex items-center justify-center">
                    <span className="text-warning text-lg">⚡</span>
                  </div>
                  <div>
                    <p className="text-sm text-muted">Pending</p>
                    <p className="text-xl font-bold text-warning">1 Event</p>
                  </div>
                </div>
              </div>

              <div className="glass-card p-4 border-kgiq-secondary/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
                    <span className="text-accent text-lg">📊</span>
                  </div>
                  <div>
                    <p className="text-sm text-muted">Avg Monthly</p>
                    <p className="text-xl font-bold text-accent">$3,950</p>
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
                      <option value="all">All Events</option>
                      <option value="upcoming">Upcoming</option>
                      <option value="received">Received</option>
                      <option value="overdue">Overdue</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-muted">Source:</label>
                    <select className="px-3 py-1.5 bg-glass-bg border border-glass-border/50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-kgiq-primary/50">
                      <option value="all">All Sources</option>
                      <option value="employer">Employer</option>
                      <option value="freelance">Freelance</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button className="p-2 text-muted hover:text-primary transition-colors">
                    <span className="text-lg">🔄</span>
                  </button>
                  <button className="p-2 text-muted hover:text-primary transition-colors">
                    <span className="text-lg">📅</span>
                  </button>
                  <button className="p-2 text-muted hover:text-primary transition-colors">
                    <span className="text-lg">⚙️</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Income List */}
            <Suspense fallback={<Loading message="Loading income events..." />}>
              <IncomeList />
            </Suspense>

            {/* Footer */}
            <div className="mt-8 glass-card p-4 border-glass-border/50">
              <div className="flex items-center justify-between text-sm text-muted">
                <div className="flex items-center gap-2">
                  <span className="text-accent">📈</span>
                  <span>KGiQ Family Finance - Income Management</span>
                </div>
                <div className="flex items-center gap-4">
                  <span>Last sync: {new Date().toLocaleString()}</span>
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