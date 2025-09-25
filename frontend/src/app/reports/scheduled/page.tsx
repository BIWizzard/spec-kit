'use client'

import { Suspense, useState } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/layout/header'
import Sidebar from '@/components/navigation/sidebar'
import ScheduledReports from '@/components/reports/scheduled-reports'
import Loading from '@/components/ui/loading'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Calendar,
  ArrowLeft,
  Download,
  Settings,
  Clock,
  Mail,
  Play,
  Pause,
  CheckCircle,
  AlertTriangle,
  FileText,
  BarChart3,
  TrendingUp,
  Activity
} from 'lucide-react'

interface User {
  name: string
  email: string
  role: string
  initials: string
}

interface ScheduledReport {
  id: string
  name: string
  description: string
  reportType: 'cash-flow' | 'spending' | 'budget' | 'income' | 'custom'
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly'
  dayOfWeek?: number
  dayOfMonth?: number
  time: string
  timezone: string
  enabled: boolean
  format: 'pdf' | 'csv' | 'xlsx'
  recipients: string[]
  lastRun?: string
  nextRun: string
  status: 'active' | 'paused' | 'failed'
  createdAt: string
  config?: Record<string, any>
}

interface ScheduledReportRun {
  id: string
  reportId: string
  scheduledAt: string
  startedAt?: string
  completedAt?: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  error?: string
  downloadUrl?: string
}

// Mock data - in real app, this would come from API
const mockScheduledReports: ScheduledReport[] = [
  {
    id: '1',
    name: 'Monthly Budget Performance',
    description: 'Comprehensive budget vs actual spending analysis with variance reporting',
    reportType: 'budget',
    frequency: 'monthly',
    dayOfMonth: 1,
    time: '09:00',
    timezone: 'America/New_York',
    enabled: true,
    format: 'pdf',
    recipients: ['sarah@johnson-family.com', 'finance@johnson-family.com'],
    lastRun: '2024-06-01T09:00:00Z',
    nextRun: '2024-07-01T09:00:00Z',
    status: 'active',
    createdAt: '2024-01-15T10:30:00Z'
  },
  {
    id: '2',
    name: 'Weekly Cash Flow Summary',
    description: 'Income vs expenses summary with upcoming payment alerts',
    reportType: 'cash-flow',
    frequency: 'weekly',
    dayOfWeek: 1, // Monday
    time: '08:00',
    timezone: 'America/New_York',
    enabled: true,
    format: 'pdf',
    recipients: ['sarah@johnson-family.com'],
    lastRun: '2024-06-10T08:00:00Z',
    nextRun: '2024-06-17T08:00:00Z',
    status: 'active',
    createdAt: '2024-02-01T14:20:00Z'
  },
  {
    id: '3',
    name: 'Quarterly Income Analysis',
    description: 'Detailed income trends and source diversification report',
    reportType: 'income',
    frequency: 'quarterly',
    dayOfMonth: 1,
    time: '10:00',
    timezone: 'America/New_York',
    enabled: false,
    format: 'xlsx',
    recipients: ['sarah@johnson-family.com', 'accountant@financial-advisors.com'],
    lastRun: '2024-04-01T10:00:00Z',
    nextRun: '2024-07-01T10:00:00Z',
    status: 'paused',
    createdAt: '2024-01-05T16:45:00Z'
  },
  {
    id: '4',
    name: 'Daily Spending Alerts',
    description: 'High-level spending overview with budget warnings',
    reportType: 'spending',
    frequency: 'daily',
    time: '18:00',
    timezone: 'America/New_York',
    enabled: true,
    format: 'csv',
    recipients: ['sarah@johnson-family.com'],
    lastRun: '2024-06-14T18:00:00Z',
    nextRun: '2024-06-15T18:00:00Z',
    status: 'active',
    createdAt: '2024-03-10T11:15:00Z'
  },
  {
    id: '5',
    name: 'Custom Investment Report',
    description: 'Portfolio performance and asset allocation analysis',
    reportType: 'custom',
    frequency: 'monthly',
    dayOfMonth: 15,
    time: '11:30',
    timezone: 'America/New_York',
    enabled: true,
    format: 'pdf',
    recipients: ['sarah@johnson-family.com', 'investment@advisors.com'],
    nextRun: '2024-07-15T11:30:00Z',
    status: 'failed',
    createdAt: '2024-05-20T09:00:00Z'
  }
]

const mockRecentRuns: ScheduledReportRun[] = [
  {
    id: '1',
    reportId: '1',
    scheduledAt: '2024-06-01T09:00:00Z',
    startedAt: '2024-06-01T09:00:15Z',
    completedAt: '2024-06-01T09:02:30Z',
    status: 'completed',
    downloadUrl: '/reports/downloads/budget-2024-06.pdf'
  },
  {
    id: '2',
    reportId: '2',
    scheduledAt: '2024-06-10T08:00:00Z',
    startedAt: '2024-06-10T08:00:10Z',
    completedAt: '2024-06-10T08:01:45Z',
    status: 'completed',
    downloadUrl: '/reports/downloads/cashflow-2024-06-10.pdf'
  },
  {
    id: '3',
    reportId: '4',
    scheduledAt: '2024-06-14T18:00:00Z',
    startedAt: '2024-06-14T18:00:05Z',
    completedAt: '2024-06-14T18:00:20Z',
    status: 'completed',
    downloadUrl: '/reports/downloads/spending-2024-06-14.csv'
  },
  {
    id: '4',
    reportId: '5',
    scheduledAt: '2024-06-15T11:30:00Z',
    startedAt: '2024-06-15T11:30:05Z',
    status: 'failed',
    error: 'API connection timeout'
  },
  {
    id: '5',
    reportId: '2',
    scheduledAt: '2024-06-17T08:00:00Z',
    status: 'pending'
  }
]

export default function ScheduledReportsPage() {
  const router = useRouter()
  const [reports, setReports] = useState<ScheduledReport[]>(mockScheduledReports)
  const [recentRuns] = useState<ScheduledReportRun[]>(mockRecentRuns)
  const [isLoading, setIsLoading] = useState(false)

  // Mock user data - in real app, this would come from auth context
  const user: User = {
    name: 'Sarah Johnson',
    email: 'sarah@johnson-family.com',
    role: 'Administrator',
    initials: 'SJ'
  }

  const handleCreateReport = async (reportData: Partial<ScheduledReport>) => {
    setIsLoading(true)
    console.log('Creating scheduled report:', reportData)

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500))

    const newReport: ScheduledReport = {
      id: Math.random().toString(36).substr(2, 9),
      ...reportData as ScheduledReport
    }

    setReports(prev => [...prev, newReport])
    setIsLoading(false)
  }

  const handleUpdateReport = async (id: string, updates: Partial<ScheduledReport>) => {
    setIsLoading(true)
    console.log('Updating report:', id, updates)

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))

    setReports(prev => prev.map(report =>
      report.id === id ? { ...report, ...updates } : report
    ))
    setIsLoading(false)
  }

  const handleDeleteReport = async (id: string) => {
    setIsLoading(true)
    console.log('Deleting report:', id)

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))

    setReports(prev => prev.filter(report => report.id !== id))
    setIsLoading(false)
  }

  const handleToggleReport = async (id: string, enabled: boolean) => {
    setIsLoading(true)
    console.log('Toggling report:', id, enabled)

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500))

    setReports(prev => prev.map(report =>
      report.id === id ? {
        ...report,
        enabled,
        status: enabled ? 'active' : 'paused'
      } : report
    ))
    setIsLoading(false)
  }

  const handleRunNow = async (id: string) => {
    setIsLoading(true)
    console.log('Running report now:', id)

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000))

    setIsLoading(false)
  }

  const handleExportAll = () => {
    console.log('Exporting all scheduled reports configuration')
  }

  // Calculate stats
  const activeReports = reports.filter(r => r.enabled).length
  const totalReports = reports.length
  const recentFailures = recentRuns.filter(run => run.status === 'failed').length
  const completedToday = recentRuns.filter(run =>
    run.status === 'completed' &&
    new Date(run.completedAt || '').toDateString() === new Date().toDateString()
  ).length

  const getReportTypeIcon = (type: string) => {
    switch (type) {
      case 'cash-flow': return <TrendingUp className="h-4 w-4" />
      case 'spending': return <BarChart3 className="h-4 w-4" />
      case 'budget': return <Activity className="h-4 w-4" />
      case 'income': return <TrendingUp className="h-4 w-4" />
      case 'custom': return <Settings className="h-4 w-4" />
      default: return <FileText className="h-4 w-4" />
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-bg-primary via-bg-secondary to-bg-tertiary">
      <Header user={user} />

      <div className="flex">
        <Sidebar />

        <main className="flex-1 p-6 ml-[280px]">
          <div className="max-w-7xl mx-auto space-y-6">

            {/* Header Section */}
            <div className="glass-card p-6 border-kgiq-primary/20 bg-gradient-to-r from-glass-bg to-glass-bg-light">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="glass-button"
                    onClick={() => router.back()}
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>
                  <div className="w-12 h-12 rounded-full bg-kgiq-primary/20 flex items-center justify-center">
                    <Calendar className="text-kgiq-primary text-2xl h-6 w-6" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-primary mb-1">
                      Scheduled Reports
                    </h1>
                    <p className="text-muted text-lg">
                      Automate your financial reporting and stay informed
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    className="glass-button"
                    onClick={handleExportAll}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export Config
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

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="glass-card border-glass-border/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-success/20 flex items-center justify-center">
                      <CheckCircle className="h-5 w-5 text-success" />
                    </div>
                    <div>
                      <p className="text-sm text-muted">Active Reports</p>
                      <p className="text-xl font-bold text-success">
                        {activeReports}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card border-glass-border/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-info/20 flex items-center justify-center">
                      <FileText className="h-5 w-5 text-info" />
                    </div>
                    <div>
                      <p className="text-sm text-muted">Total Reports</p>
                      <p className="text-xl font-bold text-info">
                        {totalReports}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card border-glass-border/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-kgiq-primary/20 flex items-center justify-center">
                      <Play className="h-5 w-5 text-kgiq-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted">Completed Today</p>
                      <p className="text-xl font-bold text-kgiq-primary">
                        {completedToday}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card border-glass-border/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      recentFailures > 0 ? 'bg-destructive/20' : 'bg-success/20'
                    }`}>
                      {recentFailures > 0 ? (
                        <AlertTriangle className="h-5 w-5 text-destructive" />
                      ) : (
                        <CheckCircle className="h-5 w-5 text-success" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm text-muted">Recent Failures</p>
                      <p className={`text-xl font-bold ${
                        recentFailures > 0 ? 'text-destructive' : 'text-success'
                      }`}>
                        {recentFailures}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Report Summary */}
            <Card className="glass-card border-glass-border/50">
              <CardHeader>
                <CardTitle className="text-primary flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Upcoming Reports
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {reports
                    .filter(r => r.enabled)
                    .sort((a, b) => new Date(a.nextRun).getTime() - new Date(b.nextRun).getTime())
                    .slice(0, 6)
                    .map((report) => (
                      <div key={report.id} className="p-3 rounded-lg bg-glass-bg/30 border border-glass-border/30">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="text-kgiq-primary">
                              {getReportTypeIcon(report.reportType)}
                            </div>
                            <div>
                              <h4 className="font-medium text-primary text-sm line-clamp-1">
                                {report.name}
                              </h4>
                              <Badge
                                variant="outline"
                                className="text-xs mt-1 text-muted border-muted"
                              >
                                {report.frequency}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <div className="text-xs text-muted space-y-1">
                          <div className="flex items-center justify-between">
                            <span>Next Run:</span>
                            <span className="font-medium text-primary">
                              {new Date(report.nextRun).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>Recipients:</span>
                            <span className="font-medium text-primary">
                              {report.recipients.length}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>Format:</span>
                            <Badge variant="outline" className="text-xs">
                              {report.format.toUpperCase()}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>

                {reports.filter(r => r.enabled).length === 0 && (
                  <div className="text-center py-8 text-muted">
                    <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No active scheduled reports</p>
                    <p className="text-sm">Create a scheduled report to automate your financial reporting</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Scheduled Reports Management */}
            <Suspense fallback={<Loading message="Loading scheduled reports..." />}>
              <ScheduledReports
                reports={reports}
                recentRuns={recentRuns}
                onCreateReport={handleCreateReport}
                onUpdateReport={handleUpdateReport}
                onDeleteReport={handleDeleteReport}
                onToggleReport={handleToggleReport}
                onRunNow={handleRunNow}
                isLoading={isLoading}
              />
            </Suspense>

            {/* Footer Section */}
            <div className="glass-card p-4 border-glass-border/50">
              <div className="flex items-center justify-between text-sm text-muted">
                <div className="flex items-center gap-2">
                  <span className="text-accent">📅</span>
                  <span>Powered by KGiQ Family Finance - Automated Financial Reporting</span>
                </div>
                <div className="flex items-center gap-4">
                  <span>Active: {activeReports}/{totalReports}</span>
                  <span>Timezone: EST</span>
                  <span>Generated: {new Date().toLocaleDateString()}</span>
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