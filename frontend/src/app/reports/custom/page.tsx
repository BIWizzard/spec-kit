'use client'

import { Suspense, useState } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/layout/header'
import Sidebar from '@/components/navigation/sidebar'
import CustomReportBuilder from '@/components/reports/custom-report-builder'
import Loading from '@/components/ui/loading'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Settings,
  ArrowLeft,
  Download,
  Plus,
  Edit,
  Trash2,
  Play,
  Clock,
  BarChart3,
  FileText,
  Calendar,
  Filter,
  Zap,
  Copy,
  Share
} from 'lucide-react'

interface User {
  name: string
  email: string
  role: string
  initials: string
}

interface SavedReport {
  id: string
  name: string
  description: string
  type: 'table' | 'bar' | 'line' | 'pie'
  fieldCount: number
  filterCount: number
  lastRun?: string
  createdAt: string
  isScheduled: boolean
  frequency?: string
  category: 'income' | 'expenses' | 'budget' | 'general'
}

interface CustomReportConfig {
  name: string
  description: string
  fields: string[]
  filters: Array<{
    id: string
    field: string
    operator: string
    value: string | number | Array<string>
  }>
  dateRange: {
    start: string
    end: string
    preset?: string
  }
  chart: {
    type: 'bar' | 'line' | 'pie' | 'table'
    aggregation: 'sum' | 'average' | 'count' | 'min' | 'max'
  }
  schedule?: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly'
    enabled: boolean
  }
}

// Mock saved reports - in real app, this would come from API
const mockSavedReports: SavedReport[] = [
  {
    id: '1',
    name: 'Monthly Spending by Category',
    description: 'Breakdown of expenses by spending categories for the current month',
    type: 'pie',
    fieldCount: 3,
    filterCount: 2,
    lastRun: '2024-06-15',
    createdAt: '2024-05-01',
    isScheduled: true,
    frequency: 'monthly',
    category: 'expenses'
  },
  {
    id: '2',
    name: 'Income vs Budget Performance',
    description: 'Compare actual income against budgeted amounts',
    type: 'bar',
    fieldCount: 4,
    filterCount: 1,
    lastRun: '2024-06-10',
    createdAt: '2024-04-15',
    isScheduled: false,
    category: 'budget'
  },
  {
    id: '3',
    name: 'Cash Flow Trends',
    description: 'Track income and expense trends over time',
    type: 'line',
    fieldCount: 5,
    filterCount: 0,
    lastRun: '2024-06-12',
    createdAt: '2024-03-20',
    isScheduled: true,
    frequency: 'weekly',
    category: 'general'
  },
  {
    id: '4',
    name: 'Account Balance Summary',
    description: 'Current balances across all connected bank accounts',
    type: 'table',
    fieldCount: 3,
    filterCount: 1,
    createdAt: '2024-06-01',
    isScheduled: false,
    category: 'general'
  },
  {
    id: '5',
    name: 'Income Sources Analysis',
    description: 'Detailed breakdown of income by source and frequency',
    type: 'bar',
    fieldCount: 4,
    filterCount: 2,
    lastRun: '2024-06-08',
    createdAt: '2024-02-10',
    isScheduled: true,
    frequency: 'monthly',
    category: 'income'
  }
]

export default function CustomReportsPage() {
  const router = useRouter()
  const [activeView, setActiveView] = useState<'builder' | 'saved'>('saved')
  const [editingReport, setEditingReport] = useState<SavedReport | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  // Mock user data - in real app, this would come from auth context
  const user: User = {
    name: 'Sarah Johnson',
    email: 'sarah@johnson-family.com',
    role: 'Administrator',
    initials: 'SJ'
  }

  const handleSaveReport = async (config: CustomReportConfig) => {
    setIsLoading(true)
    console.log('Saving report config:', config)
    await new Promise(resolve => setTimeout(resolve, 1500))
    setIsLoading(false)
    setActiveView('saved')
  }

  const handleRunReport = async (config: CustomReportConfig) => {
    setIsLoading(true)
    console.log('Running report with config:', config)
    await new Promise(resolve => setTimeout(resolve, 2000))
    setIsLoading(false)
  }

  const handleEditReport = (report: SavedReport) => {
    setEditingReport(report)
    setActiveView('builder')
  }

  const handleDeleteReport = (reportId: string) => {
    console.log('Deleting report:', reportId)
  }

  const handleDuplicateReport = (reportId: string) => {
    console.log('Duplicating report:', reportId)
  }

  const filteredReports = selectedCategory === 'all'
    ? mockSavedReports
    : mockSavedReports.filter(report => report.category === selectedCategory)

  const getChartIcon = (type: string) => {
    switch (type) {
      case 'bar': return <BarChart3 className="h-4 w-4" />
      case 'line': return <BarChart3 className="h-4 w-4" style={{ transform: 'rotate(45deg)' }} />
      case 'pie': return <div className="w-4 h-4 rounded-full border-2 border-current" />
      case 'table': return <FileText className="h-4 w-4" />
      default: return <BarChart3 className="h-4 w-4" />
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'income': return 'text-success border-success'
      case 'expenses': return 'text-destructive border-destructive'
      case 'budget': return 'text-kgiq-primary border-kgiq-primary'
      case 'general': return 'text-info border-info'
      default: return 'text-muted border-muted'
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
                    <Settings className="text-kgiq-primary text-2xl h-6 w-6" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-primary mb-1">
                      Custom Reports
                    </h1>
                    <p className="text-muted text-lg">
                      Build and manage personalized financial reports
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    className="glass-button"
                    onClick={() => setActiveView(activeView === 'saved' ? 'builder' : 'saved')}
                  >
                    {activeView === 'saved' ? (
                      <>
                        <Plus className="h-4 w-4 mr-2" />
                        New Report
                      </>
                    ) : (
                      <>
                        <FileText className="h-4 w-4 mr-2" />
                        Saved Reports
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    className="glass-button"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export All
                  </Button>
                </div>
              </div>
            </div>

            {/* View Toggle */}
            <div className="flex items-center justify-center">
              <div className="glass-card p-1 flex">
                <Button
                  variant={activeView === 'saved' ? 'default' : 'ghost'}
                  size="sm"
                  className={activeView === 'saved' ? 'glass-button-active' : 'glass-button'}
                  onClick={() => setActiveView('saved')}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Saved Reports ({mockSavedReports.length})
                </Button>
                <Button
                  variant={activeView === 'builder' ? 'default' : 'ghost'}
                  size="sm"
                  className={activeView === 'builder' ? 'glass-button-active' : 'glass-button'}
                  onClick={() => setActiveView('builder')}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Report Builder
                </Button>
              </div>
            </div>

            {activeView === 'saved' ? (
              <>
                {/* Category Filter */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm text-muted">Filter by category:</span>
                  {[
                    { value: 'all', label: 'All Reports', count: mockSavedReports.length },
                    { value: 'income', label: 'Income', count: mockSavedReports.filter(r => r.category === 'income').length },
                    { value: 'expenses', label: 'Expenses', count: mockSavedReports.filter(r => r.category === 'expenses').length },
                    { value: 'budget', label: 'Budget', count: mockSavedReports.filter(r => r.category === 'budget').length },
                    { value: 'general', label: 'General', count: mockSavedReports.filter(r => r.category === 'general').length }
                  ].map(({ value, label, count }) => (
                    <Badge
                      key={value}
                      variant={selectedCategory === value ? 'default' : 'outline'}
                      className={`cursor-pointer transition-colors ${
                        selectedCategory === value
                          ? 'bg-kgiq-primary text-white'
                          : 'glass-border hover:bg-kgiq-primary/10'
                      }`}
                      onClick={() => setSelectedCategory(value)}
                    >
                      {label} ({count})
                    </Badge>
                  ))}
                </div>

                {/* Saved Reports Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredReports.map((report) => (
                    <Card key={report.id} className="glass-card border-glass-border/50 hover:border-kgiq-primary/30 transition-colors">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`w-8 h-8 rounded-lg bg-glass-bg/30 flex items-center justify-center ${getCategoryColor(report.category)}`}>
                              {getChartIcon(report.type)}
                            </div>
                            <div>
                              <CardTitle className="text-sm font-medium text-primary line-clamp-1">
                                {report.name}
                              </CardTitle>
                              <Badge
                                variant="outline"
                                className={`text-xs mt-1 ${getCategoryColor(report.category)}`}
                              >
                                {report.category}
                              </Badge>
                            </div>
                          </div>
                          {report.isScheduled && (
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3 text-success" />
                              <Badge variant="outline" className="text-xs text-success border-success">
                                {report.frequency}
                              </Badge>
                            </div>
                          )}
                        </div>
                      </CardHeader>

                      <CardContent className="pt-0">
                        <p className="text-sm text-muted mb-4 line-clamp-2">
                          {report.description}
                        </p>

                        <div className="flex items-center justify-between text-xs text-muted mb-4">
                          <div className="flex items-center gap-3">
                            <span className="flex items-center gap-1">
                              <Filter className="h-3 w-3" />
                              {report.fieldCount} fields
                            </span>
                            <span className="flex items-center gap-1">
                              <Settings className="h-3 w-3" />
                              {report.filterCount} filters
                            </span>
                          </div>
                          {report.lastRun && (
                            <span>
                              Last run: {new Date(report.lastRun).toLocaleDateString()}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="glass-button flex-1"
                            onClick={() => handleRunReport({} as CustomReportConfig)}
                          >
                            <Play className="h-3 w-3 mr-1" />
                            Run
                          </Button>

                          <div className="flex items-center gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              className="glass-button p-2"
                              onClick={() => handleEditReport(report)}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>

                            <Button
                              variant="outline"
                              size="sm"
                              className="glass-button p-2"
                              onClick={() => handleDuplicateReport(report.id)}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>

                            <Button
                              variant="outline"
                              size="sm"
                              className="glass-button p-2"
                            >
                              <Share className="h-3 w-3" />
                            </Button>

                            <Button
                              variant="outline"
                              size="sm"
                              className="glass-button p-2 text-destructive border-destructive/20 hover:bg-destructive/10"
                              onClick={() => handleDeleteReport(report.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {filteredReports.length === 0 && (
                  <Card className="glass-card border-glass-border/50">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <div className="w-16 h-16 rounded-full bg-glass-bg/30 flex items-center justify-center mb-4">
                        <FileText className="h-8 w-8 text-muted" />
                      </div>
                      <h3 className="text-lg font-medium text-primary mb-2">
                        No reports found
                      </h3>
                      <p className="text-muted text-center mb-6">
                        {selectedCategory === 'all'
                          ? "You haven't created any custom reports yet."
                          : `No reports found in the ${selectedCategory} category.`
                        }
                      </p>
                      <Button
                        className="glass-button"
                        onClick={() => setActiveView('builder')}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Create Your First Report
                      </Button>
                    </CardContent>
                  </Card>
                )}

                {/* Quick Templates */}
                {selectedCategory === 'all' && filteredReports.length > 0 && (
                  <Card className="glass-card border-glass-border/50">
                    <CardHeader>
                      <CardTitle className="text-primary flex items-center gap-2">
                        <Zap className="h-5 w-5" />
                        Quick Templates
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        {[
                          { name: 'Monthly Budget vs Actual', category: 'budget', icon: <BarChart3 className="h-4 w-4" /> },
                          { name: 'Spending Trends', category: 'expenses', icon: <BarChart3 className="h-4 w-4" style={{ transform: 'rotate(45deg)' }} /> },
                          { name: 'Income Sources', category: 'income', icon: <div className="w-4 h-4 rounded-full border-2 border-current" /> },
                          { name: 'Account Overview', category: 'general', icon: <FileText className="h-4 w-4" /> }
                        ].map((template, index) => (
                          <Button
                            key={index}
                            variant="outline"
                            className="glass-button justify-start h-auto p-3 flex-col items-start space-y-1"
                            onClick={() => setActiveView('builder')}
                          >
                            <div className="flex items-center gap-2 w-full">
                              <div className={`${getCategoryColor(template.category)}`}>
                                {template.icon}
                              </div>
                              <span className="font-medium text-xs">{template.name}</span>
                            </div>
                            <Badge
                              variant="outline"
                              className={`text-xs ${getCategoryColor(template.category)}`}
                            >
                              {template.category}
                            </Badge>
                          </Button>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              /* Report Builder */
              <Suspense fallback={<Loading message="Loading report builder..." />}>
                <CustomReportBuilder
                  onSave={handleSaveReport}
                  onRun={handleRunReport}
                  isLoading={isLoading}
                  initialConfig={editingReport ? {
                    name: editingReport.name,
                    description: editingReport.description
                  } : undefined}
                />
              </Suspense>
            )}

            {/* Footer Section */}
            <div className="glass-card p-4 border-glass-border/50">
              <div className="flex items-center justify-between text-sm text-muted">
                <div className="flex items-center gap-2">
                  <span className="text-accent">📊</span>
                  <span>Powered by KGiQ Family Finance - Custom Report Builder</span>
                </div>
                <div className="flex items-center gap-4">
                  <span>View: {activeView}</span>
                  <span>Reports: {filteredReports.length}</span>
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