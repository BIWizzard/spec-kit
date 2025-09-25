'use client'

import { Suspense, useState } from 'react'
import Header from '@/components/layout/header'
import Sidebar from '@/components/navigation/sidebar'
import CashFlowCalendar from '@/components/calendar/cash-flow-calendar'
import Loading from '@/components/ui/loading'
// import { Button } from '@/components/ui/button'
// import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar as CalendarIcon, Filter, Download, Settings } from 'lucide-react'

interface User {
  name: string
  email: string
  role: string
  initials: string
}

// Mock data - in real app, this would come from API
const mockCashFlowEvents = [
  {
    id: '1',
    type: 'income' as const,
    name: 'Bi-weekly Salary',
    amount: 3200,
    date: new Date(2024, 2, 15),
    category: 'Salary',
    status: 'completed' as const
  },
  {
    id: '2',
    type: 'payment' as const,
    name: 'Mortgage Payment',
    amount: 1850,
    date: new Date(2024, 2, 1),
    category: 'Housing',
    status: 'completed' as const
  },
  {
    id: '3',
    type: 'payment' as const,
    name: 'Electric Bill',
    amount: 120,
    date: new Date(2024, 2, 5),
    category: 'Utilities',
    status: 'scheduled' as const
  },
  {
    id: '4',
    type: 'income' as const,
    name: 'Bi-weekly Salary',
    amount: 3200,
    date: new Date(2024, 2, 29),
    category: 'Salary',
    status: 'scheduled' as const
  },
  {
    id: '5',
    type: 'payment' as const,
    name: 'Car Payment',
    amount: 450,
    date: new Date(2024, 2, 10),
    category: 'Transportation',
    status: 'overdue' as const
  },
  {
    id: '6',
    type: 'payment' as const,
    name: 'Grocery Budget',
    amount: 600,
    date: new Date(2024, 2, 20),
    category: 'Food',
    status: 'scheduled' as const
  }
]

export default function CalendarPage() {
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [filterType, setFilterType] = useState<'all' | 'income' | 'payment'>('all')

  // Mock user data - in real app, this would come from auth context
  const user: User = {
    name: 'Sarah Johnson',
    email: 'sarah@johnson-family.com',
    role: 'Administrator',
    initials: 'SJ'
  }

  const filteredEvents = mockCashFlowEvents.filter(event => {
    if (filterType === 'all') return true
    return event.type === filterType
  })

  const handleDateClick = (date: Date) => {
    console.log('Date clicked:', date)
    // In real app, this might open a modal to add events or show day details
  }

  const handleEventClick = (event: any) => {
    console.log('Event clicked:', event)
    setSelectedEvent(event)
    // In real app, this might open event details modal
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
          <div className="max-w-7xl mx-auto space-y-6">

            {/* Header Section */}
            <div className="glass-card p-6 border-kgiq-primary/20 bg-gradient-to-r from-glass-bg to-glass-bg-light">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-kgiq-primary/20 flex items-center justify-center">
                    <CalendarIcon className="text-kgiq-primary text-2xl h-6 w-6" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-primary mb-1">
                      Cash Flow Calendar
                    </h1>
                    <p className="text-muted text-lg">
                      Track your income and payments across time
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    className="glass-button"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                  <Button
                    variant="outline"
                    className="glass-button"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                  </Button>
                </div>
              </div>
            </div>

            {/* Filter Controls */}
            <Card className="glass-card border-glass-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-primary flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Filter Events
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <Button
                    variant={filterType === 'all' ? 'default' : 'outline'}
                    className={filterType === 'all' ? 'bg-kgiq-primary text-white' : 'glass-button'}
                    onClick={() => setFilterType('all')}
                  >
                    All Events
                  </Button>
                  <Button
                    variant={filterType === 'income' ? 'default' : 'outline'}
                    className={filterType === 'income' ? 'bg-success text-white' : 'glass-button'}
                    onClick={() => setFilterType('income')}
                  >
                    Income Only
                  </Button>
                  <Button
                    variant={filterType === 'payment' ? 'default' : 'outline'}
                    className={filterType === 'payment' ? 'bg-warning text-white' : 'glass-button'}
                    onClick={() => setFilterType('payment')}
                  >
                    Payments Only
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Calendar Component */}
            <Suspense fallback={<Loading message="Loading calendar..." />}>
              <CashFlowCalendar
                events={filteredEvents}
                startingBalance={5000}
                onDateClick={handleDateClick}
                onEventClick={handleEventClick}
              />
            </Suspense>

            {/* Summary Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="glass-card border-glass-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted">This Month</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted">Total Income</span>
                      <span className="font-semibold text-success">
                        ${filteredEvents.filter(e => e.type === 'income').reduce((sum, e) => sum + e.amount, 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted">Total Payments</span>
                      <span className="font-semibold text-warning">
                        ${filteredEvents.filter(e => e.type === 'payment').reduce((sum, e) => sum + e.amount, 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="border-t pt-2 mt-2 border-glass-border/30">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-primary">Net Flow</span>
                        <span className={`font-bold ${
                          filteredEvents.filter(e => e.type === 'income').reduce((sum, e) => sum + e.amount, 0) -
                          filteredEvents.filter(e => e.type === 'payment').reduce((sum, e) => sum + e.amount, 0) > 0
                          ? 'text-success' : 'text-destructive'
                        }`}>
                          ${(
                            filteredEvents.filter(e => e.type === 'income').reduce((sum, e) => sum + e.amount, 0) -
                            filteredEvents.filter(e => e.type === 'payment').reduce((sum, e) => sum + e.amount, 0)
                          ).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card border-glass-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted">Event Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted">Completed</span>
                      <span className="font-semibold text-success">
                        {filteredEvents.filter(e => e.status === 'completed').length}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted">Scheduled</span>
                      <span className="font-semibold text-kgiq-accent">
                        {filteredEvents.filter(e => e.status === 'scheduled').length}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted">Overdue</span>
                      <span className="font-semibold text-destructive">
                        {filteredEvents.filter(e => e.status === 'overdue').length}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card border-glass-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full glass-button justify-start"
                    >
                      Add Income Event
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full glass-button justify-start"
                    >
                      Add Payment
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full glass-button justify-start"
                    >
                      Sync Bank Accounts
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Footer Section */}
            <div className="glass-card p-4 border-glass-border/50">
              <div className="flex items-center justify-between text-sm text-muted">
                <div className="flex items-center gap-2">
                  <span className="text-accent">📅</span>
                  <span>Powered by KGiQ Family Finance - Calendar View</span>
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
      </div>
    </div>
  )
}