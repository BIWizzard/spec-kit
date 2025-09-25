'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  PieChart,
  BarChart3,
  Calendar,
  Download,
  Settings,
  RefreshCw,
  Eye,
  FileText,
  Target
} from 'lucide-react';

interface ReportSummary {
  id: string;
  name: string;
  type: 'cash-flow' | 'spending' | 'budget' | 'income' | 'net-worth' | 'savings';
  value: number;
  change: number;
  period: string;
  status: 'up' | 'down' | 'neutral';
  lastUpdated: string;
}

interface QuickMetric {
  label: string;
  value: string;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: React.ReactNode;
}

interface ReportsDashboardProps {
  reports?: ReportSummary[];
  isLoading?: boolean;
  onRefresh?: () => void;
  onExportReport?: (reportId: string) => void;
  onViewReport?: (reportId: string) => void;
  onScheduleReport?: () => void;
}

export default function ReportsDashboard({
  reports = [],
  isLoading = false,
  onRefresh,
  onExportReport,
  onViewReport,
  onScheduleReport
}: ReportsDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview');

  const quickMetrics: QuickMetric[] = [
    {
      label: 'Monthly Income',
      value: '$5,240',
      change: '+8.2%',
      changeType: 'positive',
      icon: <TrendingUp className="h-4 w-4" />
    },
    {
      label: 'Monthly Expenses',
      value: '$3,890',
      change: '-2.1%',
      changeType: 'positive',
      icon: <TrendingDown className="h-4 w-4" />
    },
    {
      label: 'Net Worth',
      value: '$42,130',
      change: '+12.5%',
      changeType: 'positive',
      icon: <DollarSign className="h-4 w-4" />
    },
    {
      label: 'Savings Rate',
      value: '25.8%',
      change: '+3.2%',
      changeType: 'positive',
      icon: <Target className="h-4 w-4" />
    }
  ];

  const getStatusIcon = (type: string) => {
    switch (type) {
      case 'cash-flow': return <BarChart3 className="h-4 w-4" />;
      case 'spending': return <PieChart className="h-4 w-4" />;
      case 'budget': return <Target className="h-4 w-4" />;
      case 'income': return <TrendingUp className="h-4 w-4" />;
      case 'net-worth': return <DollarSign className="h-4 w-4" />;
      case 'savings': return <TrendingUp className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getChangeColor = (status: string) => {
    switch (status) {
      case 'up': return 'text-green-500';
      case 'down': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getMetricChangeColor = (changeType?: string) => {
    switch (changeType) {
      case 'positive': return 'text-green-500';
      case 'negative': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-3xl font-bold text-white">Reports Dashboard</h1>
          <p className="text-white/70">Financial insights and analytics</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isLoading}
            className="bg-white/10 border-white/20 text-white hover:bg-white/20"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onScheduleReport}
            className="bg-white/10 border-white/20 text-white hover:bg-white/20"
          >
            <Calendar className="h-4 w-4 mr-2" />
            Schedule Report
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="bg-white/10 border-white/20 text-white hover:bg-white/20"
          >
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-white/10 border-white/20">
          <TabsTrigger value="overview" className="text-white data-[state=active]:bg-white/20">
            Overview
          </TabsTrigger>
          <TabsTrigger value="trends" className="text-white data-[state=active]:bg-white/20">
            Trends
          </TabsTrigger>
          <TabsTrigger value="detailed" className="text-white data-[state=active]:bg-white/20">
            Detailed
          </TabsTrigger>
          <TabsTrigger value="scheduled" className="text-white data-[state=active]:bg-white/20">
            Scheduled
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-6">
          {/* Quick Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickMetrics.map((metric, index) => (
              <Card key={index} className="bg-white/10 backdrop-blur-md border border-white/20">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="p-2 bg-[#FFD166]/20 rounded-lg text-[#FFD166]">
                        {metric.icon}
                      </div>
                      <div>
                        <p className="text-sm text-white/70">{metric.label}</p>
                        <p className="text-xl font-bold text-white">{metric.value}</p>
                      </div>
                    </div>
                    {metric.change && (
                      <Badge variant="outline" className={`${getMetricChangeColor(metric.changeType)} border-current`}>
                        {metric.change}
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Recent Reports */}
          <Card className="bg-white/10 backdrop-blur-md border border-white/20">
            <CardHeader>
              <CardTitle className="text-white">Recent Reports</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {reports.map((report) => (
                  <div key={report.id} className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-[#8FAD77]/20 rounded-lg text-[#8FAD77]">
                        {getStatusIcon(report.type)}
                      </div>
                      <div>
                        <h3 className="font-medium text-white">{report.name}</h3>
                        <p className="text-sm text-white/70">{report.period}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className="font-medium text-white">${report.value.toLocaleString()}</p>
                        <p className={`text-sm ${getChangeColor(report.status)}`}>
                          {report.change > 0 ? '+' : ''}{report.change.toFixed(1)}%
                        </p>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onViewReport?.(report.id)}
                          className="h-8 w-8 p-0 text-white hover:bg-white/20"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onExportReport?.(report.id)}
                          className="h-8 w-8 p-0 text-white hover:bg-white/20"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}

                {reports.length === 0 && (
                  <div className="text-center py-8 text-white/70">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No reports available</p>
                    <p className="text-sm">Generate your first report to get started</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-6 mt-6">
          <Card className="bg-white/10 backdrop-blur-md border border-white/20">
            <CardHeader>
              <CardTitle className="text-white">Trends Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-white/70 text-center py-8">
                Trends analysis charts will be displayed here
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="detailed" className="space-y-6 mt-6">
          <Card className="bg-white/10 backdrop-blur-md border border-white/20">
            <CardHeader>
              <CardTitle className="text-white">Detailed Reports</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-white/70 text-center py-8">
                Detailed report breakdowns will be displayed here
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scheduled" className="space-y-6 mt-6">
          <Card className="bg-white/10 backdrop-blur-md border border-white/20">
            <CardHeader>
              <CardTitle className="text-white">Scheduled Reports</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-white/70 text-center py-8">
                Scheduled report management will be displayed here
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}