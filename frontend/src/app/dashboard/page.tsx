'use client'

import { Suspense } from 'react'
import Header from '@/components/layout/header'
import Sidebar from '@/components/navigation/sidebar'
import MetricsCards from '@/components/dashboard/metrics-cards'
import CashFlowChart from '@/components/dashboard/cash-flow-chart'
import RecentActivity from '@/components/dashboard/recent-activity'
import UpcomingEvents from '@/components/dashboard/upcoming-events'
import FinancialInsights from '@/components/dashboard/insights'
import AlertNotifications from '@/components/dashboard/alerts'
import QuickActions from '@/components/dashboard/quick-actions'
import Loading from '@/components/ui/loading'

interface User {
  name: string
  email: string
  role: string
  initials: string
}

export default function DashboardPage() {
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
        <Sidebar>
          {/* Main Content */}
          <main className="flex-1 p-6 ml-[280px]">
          <div className="max-w-7xl mx-auto space-y-6">

            {/* Welcome Section */}
            <div className="glass-card p-6 border-kgiq-primary/20 bg-gradient-to-r from-glass-bg to-glass-bg-light">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-primary mb-2">
                    Welcome back, {user.name.split(' ')[0]} 👋
                  </h1>
                  <p className="text-muted text-lg">
                    Here's your family's financial overview for today
                  </p>
                </div>
                <div className="hidden lg:flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm text-muted">Johnson Family</p>
                    <p className="text-xs text-accent font-medium">Powered by KGiQ</p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-kgiq-primary/20 flex items-center justify-center">
                    <span className="text-kgiq-primary text-2xl">💰</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Alert Notifications */}
            <Suspense fallback={<Loading message="Loading alerts..." />}>
              <AlertNotifications />
            </Suspense>

            {/* Metrics Cards */}
            <Suspense fallback={<Loading message="Loading financial metrics..." />}>
              <MetricsCards />
            </Suspense>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* Left Column - Cash Flow Chart */}
              <div className="lg:col-span-2 space-y-6">
                <Suspense fallback={<Loading message="Loading cash flow chart..." />}>
                  <CashFlowChart />
                </Suspense>

                <Suspense fallback={<Loading message="Loading recent activity..." />}>
                  <RecentActivity />
                </Suspense>
              </div>

              {/* Right Column - Side Widgets */}
              <div className="space-y-6">
                <Suspense fallback={<Loading message="Loading quick actions..." />}>
                  <QuickActions />
                </Suspense>

                <Suspense fallback={<Loading message="Loading upcoming events..." />}>
                  <UpcomingEvents />
                </Suspense>

                <Suspense fallback={<Loading message="Loading insights..." />}>
                  <FinancialInsights />
                </Suspense>
              </div>

            </div>

            {/* Footer Section */}
            <div className="glass-card p-4 border-glass-border/50">
              <div className="flex items-center justify-between text-sm text-muted">
                <div className="flex items-center gap-2">
                  <span className="text-accent">⚡</span>
                  <span>Powered by KGiQ Family Finance</span>
                </div>
                <div className="flex items-center gap-4">
                  <span>Last updated: {new Date().toLocaleDateString()}</span>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-success animate-pulse"></div>
                    <span className="text-success">Live</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
          </main>
        </Sidebar>
      </div>
    </div>
  )
}