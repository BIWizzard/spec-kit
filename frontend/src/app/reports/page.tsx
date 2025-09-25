'use client'

import { Suspense, useState } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/layout/header'
import Sidebar from '@/components/navigation/sidebar'
import ReportsDashboard from '@/components/reports/reports-dashboard'
import Loading from '@/components/ui/loading'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  FileBarChart,
  Plus,
  Download,
  Settings,
  TrendingUp,
  PieChart,
  Calendar,
  DollarSign
} from 'lucide-react'

interface User {
  name: string
  email: string
  role: string
  initials: string
}

interface ReportSummary {
  id: string
  name: string
  type: 'cash-flow' | 'spending' | 'budget' | 'income' | 'net-worth' | 'savings'
  value: number
  change: number
  period: string
  status: 'up' | 'down' | 'neutral'
  lastUpdated: string
}

// Mock data - in real app, this would come from API
const mockReports: ReportSummary[] = [
  {
    id: '1',
    name: 'Monthly Cash Flow',
    type: 'cash-flow',
    value: 1350,
    change: 12.5,
    period: 'March 2024',
    status: 'up',
    lastUpdated: '2 hours ago'
  },
  {
    id: '2',
    name: 'Spending Analysis',
    type: 'spending',
    value: 3890,
    change: -8.2,
    period: 'March 2024',
    status: 'down',
    lastUpdated: '4 hours ago'
  },
  {
    id: '3',
    name: 'Budget Performance',
    type: 'budget',
    value: 85.4,
    change: 5.7,
    period: 'March 2024',
    status: 'up',
    lastUpdated: '6 hours ago'
  },
  {
    id: '4',
    name: 'Income Analysis',
    type: 'income',
    value: 5240,
    change: 3.1,
    period: 'March 2024',
    status: 'up',
    lastUpdated: '8 hours ago'
  },
  {
    id: '5',
    name: 'Net Worth Growth',
    type: 'net-worth',
    value: 42130,
    change: 18.9,
    period: 'Q1 2024',
    status: 'up',
    lastUpdated: '1 day ago'
  },
  {
    id: '6',
    name: 'Savings Rate',
    type: 'savings',
    value: 25.8,
    change: 2.3,
    period: 'March 2024',
    status: 'up',
    lastUpdated: '1 day ago'
  }
]

export default function ReportsPage() {
  const router = useRouter()
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Mock user data - in real app, this would come from auth context
  const user: User = {
    name: 'Sarah Johnson',
    email: 'sarah@johnson-family.com',
    role: 'Administrator',
    initials: 'SJ'
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000))
    setIsRefreshing(false)
  }

  const handleExportReport = (reportId: string) => {
    console.log('Exporting report:', reportId)
    // In real app, this would trigger report export
  }

  const handleViewReport = (reportId: string) => {
    // Navigate to specific report page based on type
    const report = mockReports.find(r => r.id === reportId)
    if (!report) return

    const routeMap = {
      'cash-flow': '/reports/cash-flow',
      'spending': '/reports/spending',
      'budget': '/reports/budget-performance',
      'income': '/reports/income-analysis',
      'net-worth': '/reports/net-worth',
      'savings': '/reports/savings-rate'
    }

    const route = routeMap[report.type]
    if (route) {
      router.push(route)
    }
  }

  const handleScheduleReport = () => {
    router.push('/reports/scheduled')
  }

  const handleCreateCustomReport = () => {
    router.push('/reports/custom')
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
                    <FileBarChart className="text-kgiq-primary text-2xl h-6 w-6" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-primary mb-1">
                      Financial Reports
                    </h1>
                    <p className="text-muted text-lg">
                      Comprehensive insights into your family's financial health
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    className="glass-button"
                    onClick={handleCreateCustomReport}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Custom Report
                  </Button>
                  <Button
                    variant="outline"
                    className="glass-button"
                    onClick={handleScheduleReport}
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    Schedule Report
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

            {/* Quick Access Report Links */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card
                className="glass-card border-glass-border/50 cursor-pointer hover:border-kgiq-primary/30 transition-all duration-200"
                onClick={() => router.push('/reports/cash-flow')}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-kgiq-primary/20 flex items-center justify-center">
                      <TrendingUp className="h-5 w-5 text-kgiq-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-primary">Cash Flow Report</h3>
                      <p className="text-sm text-muted">Income vs. expenses over time</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card
                className="glass-card border-glass-border/50 cursor-pointer hover:border-kgiq-accent/30 transition-all duration-200"
                onClick={() => router.push('/reports/spending')}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-kgiq-accent/20 flex items-center justify-center">
                      <PieChart className="h-5 w-5 text-kgiq-accent" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-primary">Spending Analysis</h3>
                      <p className="text-sm text-muted">Category breakdown and trends</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card
                className="glass-card border-glass-border/50 cursor-pointer hover:border-success/30 transition-all duration-200"
                onClick={() => router.push('/reports/budget-performance')}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-success/20 flex items-center justify-center">
                      <DollarSign className="h-5 w-5 text-success" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-primary">Budget Performance</h3>
                      <p className="text-sm text-muted">Target vs. actual spending</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card
                className="glass-card border-glass-border/50 cursor-pointer hover:border-warning/30 transition-all duration-200"
                onClick={() => router.push('/reports/income-analysis')}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-warning/20 flex items-center justify-center">
                      <TrendingUp className="h-5 w-5 text-warning" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-primary">Income Analysis</h3>
                      <p className="text-sm text-muted">Revenue sources and growth</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card
                className="glass-card border-glass-border/50 cursor-pointer hover:border-info/30 transition-all duration-200"
                onClick={() => router.push('/reports/net-worth')}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-info/20 flex items-center justify-center">
                      <DollarSign className="h-5 w-5 text-info" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-primary">Net Worth</h3>
                      <p className="text-sm text-muted">Assets minus liabilities</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card
                className="glass-card border-glass-border/50 cursor-pointer hover:border-accent/30 transition-all duration-200"
                onClick={() => router.push('/reports/savings-rate')}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
                      <TrendingUp className="h-5 w-5 text-accent" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-primary">Savings Rate</h3>
                      <p className="text-sm text-muted">Savings as percentage of income</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Reports Dashboard Component */}
            <Suspense fallback={<Loading message="Loading reports dashboard..." />}>
              <ReportsDashboard
                reports={mockReports}
                isLoading={isRefreshing}
                onRefresh={handleRefresh}
                onExportReport={handleExportReport}
                onViewReport={handleViewReport}
                onScheduleReport={handleScheduleReport}
              />
            </Suspense>

            {/* Footer Section */}
            <div className="glass-card p-4 border-glass-border/50">
              <div className="flex items-center justify-between text-sm text-muted">
                <div className="flex items-center gap-2">
                  <span className="text-accent">📊</span>
                  <span>Powered by KGiQ Family Finance - Reports Center</span>
                </div>
                <div className="flex items-center gap-4">
                  <span>Data as of: {new Date().toLocaleDateString()}</span>
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