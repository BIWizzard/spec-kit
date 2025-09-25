'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Calendar,
  Clock,
  Plus,
  Edit,
  Trash2,
  Play,
  Pause,
  Mail,
  FileText,
  Settings,
  CheckCircle,
  XCircle,
  AlertTriangle
} from 'lucide-react';

interface ScheduledReport {
  id: string;
  name: string;
  description: string;
  reportType: 'cash-flow' | 'spending' | 'budget' | 'income' | 'custom';
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  dayOfWeek?: number; // 0-6, Sunday = 0
  dayOfMonth?: number; // 1-31
  time: string; // HH:MM format
  timezone: string;
  enabled: boolean;
  format: 'pdf' | 'csv' | 'xlsx';
  recipients: string[];
  lastRun?: string;
  nextRun: string;
  status: 'active' | 'paused' | 'failed';
  createdAt: string;
  config?: Record<string, any>;
}

interface ScheduledReportRun {
  id: string;
  reportId: string;
  scheduledAt: string;
  startedAt?: string;
  completedAt?: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  error?: string;
  downloadUrl?: string;
}

interface ScheduledReportsProps {
  reports?: ScheduledReport[];
  recentRuns?: ScheduledReportRun[];
  onCreateReport?: (report: Partial<ScheduledReport>) => void;
  onUpdateReport?: (id: string, updates: Partial<ScheduledReport>) => void;
  onDeleteReport?: (id: string) => void;
  onToggleReport?: (id: string, enabled: boolean) => void;
  onRunNow?: (id: string) => void;
  isLoading?: boolean;
}

export default function ScheduledReports({
  reports = [],
  recentRuns = [],
  onCreateReport,
  onUpdateReport,
  onDeleteReport,
  onToggleReport,
  onRunNow,
  isLoading = false
}: ScheduledReportsProps) {
  const [activeTab, setActiveTab] = useState('list');
  const [editingReport, setEditingReport] = useState<ScheduledReport | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  
  const [newReport, setNewReport] = useState<Partial<ScheduledReport>>({
    name: '',
    description: '',
    reportType: 'cash-flow',
    frequency: 'monthly',
    time: '09:00',
    timezone: 'America/New_York',
    enabled: true,
    format: 'pdf',
    recipients: []
  });

  const [emailInput, setEmailInput] = useState('');

  const handleCreateReport = () => {
    if (newReport.name && newReport.recipients?.length) {
      onCreateReport?.({
        ...newReport,
        nextRun: calculateNextRun(newReport as ScheduledReport),
        status: 'active',
        createdAt: new Date().toISOString()
      });
      setNewReport({
        name: '',
        description: '',
        reportType: 'cash-flow',
        frequency: 'monthly',
        time: '09:00',
        timezone: 'America/New_York',
        enabled: true,
        format: 'pdf',
        recipients: []
      });
      setIsCreating(false);
      setActiveTab('list');
    }
  };

  const addEmail = () => {
    if (emailInput.includes('@') && !newReport.recipients?.includes(emailInput)) {
      setNewReport(prev => ({
        ...prev,
        recipients: [...(prev.recipients || []), emailInput]
      }));
      setEmailInput('');
    }
  };

  const removeEmail = (email: string) => {
    setNewReport(prev => ({
      ...prev,
      recipients: prev.recipients?.filter(r => r !== email) || []
    }));
  };

  const calculateNextRun = (report: ScheduledReport): string => {
    const now = new Date();
    const [hours, minutes] = report.time.split(':').map(Number);
    
    let nextRun = new Date(now);
    nextRun.setHours(hours, minutes, 0, 0);
    
    // If the time has passed today, move to next occurrence
    if (nextRun <= now) {
      switch (report.frequency) {
        case 'daily':
          nextRun.setDate(nextRun.getDate() + 1);
          break;
        case 'weekly':
          nextRun.setDate(nextRun.getDate() + 7);
          break;
        case 'monthly':
          nextRun.setMonth(nextRun.getMonth() + 1);
          break;
        case 'quarterly':
          nextRun.setMonth(nextRun.getMonth() + 3);
          break;
      }
    }
    
    return nextRun.toISOString();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'paused': return <Pause className="h-4 w-4 text-yellow-500" />;
      case 'failed': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getRunStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'running': return <Clock className="h-4 w-4 text-yellow-500 animate-spin" />;
      default: return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatFrequency = (frequency: string) => {
    return frequency.charAt(0).toUpperCase() + frequency.slice(1);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-2xl font-bold text-white">Scheduled Reports</h1>
          <p className="text-white/70">Automate your financial reporting</p>
        </div>
        
        <Button
          onClick={() => {
            setIsCreating(true);
            setActiveTab('create');
          }}
          className="bg-[#FFD166] hover:bg-[#FFD166]/90 text-black font-medium"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Scheduled Report
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-white/10 border-white/20">
          <TabsTrigger value="list" className="text-white data-[state=active]:bg-white/20">
            Active Reports ({reports.filter(r => r.enabled).length})
          </TabsTrigger>
          <TabsTrigger value="history" className="text-white data-[state=active]:bg-white/20">
            Run History
          </TabsTrigger>
          <TabsTrigger value="create" className="text-white data-[state=active]:bg-white/20">
            Create New
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4 mt-6">
          {reports.length > 0 ? (
            reports.map((report) => (
              <Card key={report.id} className="bg-white/10 backdrop-blur-md border border-white/20">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        {getStatusIcon(report.status)}
                        <h3 className="font-semibold text-white">{report.name}</h3>
                        <Badge
                          variant="outline"
                          className={`${
                            report.enabled 
                              ? 'text-green-400 border-green-400' 
                              : 'text-gray-400 border-gray-400'
                          }`}
                        >
                          {report.enabled ? 'Active' : 'Paused'}
                        </Badge>
                      </div>
                      
                      {report.description && (
                        <p className="text-white/70 text-sm mb-3">{report.description}</p>
                      )}
                      
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-white/60">Frequency:</span>
                          <div className="text-white font-medium">{formatFrequency(report.frequency)}</div>
                        </div>
                        <div>
                          <span className="text-white/60">Format:</span>
                          <div className="text-white font-medium uppercase">{report.format}</div>
                        </div>
                        <div>
                          <span className="text-white/60">Recipients:</span>
                          <div className="text-white font-medium">{report.recipients.length}</div>
                        </div>
                        <div>
                          <span className="text-white/60">Next Run:</span>
                          <div className="text-white font-medium">{formatDate(report.nextRun)}</div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={report.enabled}
                        onCheckedChange={(checked) => onToggleReport?.(report.id, checked)}
                      />
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onRunNow?.(report.id)}
                        disabled={isLoading}
                        className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                      >
                        <Play className="h-4 w-4" />
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingReport(report)}
                        className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onDeleteReport?.(report.id)}
                        className="bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="bg-white/10 backdrop-blur-md border border-white/20">
              <CardContent className="text-center py-12">
                <Calendar className="h-12 w-12 mx-auto mb-4 text-white/50" />
                <h3 className="text-lg font-medium text-white mb-2">No Scheduled Reports</h3>
                <p className="text-white/70 mb-4">Create your first scheduled report to automate your financial reporting</p>
                <Button
                  onClick={() => {
                    setIsCreating(true);
                    setActiveTab('create');
                  }}
                  className="bg-[#FFD166] hover:bg-[#FFD166]/90 text-black"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Scheduled Report
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4 mt-6">
          <Card className="bg-white/10 backdrop-blur-md border border-white/20">
            <CardHeader>
              <CardTitle className="text-white">Recent Report Runs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentRuns.length > 0 ? (
                  recentRuns.map((run) => {
                    const report = reports.find(r => r.id === run.reportId);
                    return (
                      <div key={run.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                        <div className="flex items-center space-x-3">
                          {getRunStatusIcon(run.status)}
                          <div>
                            <div className="font-medium text-white">{report?.name || 'Unknown Report'}</div>
                            <div className="text-sm text-white/60">
                              Scheduled: {formatDate(run.scheduledAt)}
                              {run.completedAt && ` • Completed: ${formatDate(run.completedAt)}`}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          {run.status === 'failed' && run.error && (
                            <Badge variant="outline" className="text-red-400 border-red-400">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              {run.error}
                            </Badge>
                          )}
                          
                          {run.status === 'completed' && run.downloadUrl && (
                            <Button
                              variant="outline"
                              size="sm"
                              asChild
                              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                            >
                              <a href={run.downloadUrl} download>
                                <FileText className="h-4 w-4" />
                              </a>
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8 text-white/60">
                    <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No recent runs</p>
                    <p className="text-sm">Report execution history will appear here</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="create" className="space-y-6 mt-6">
          <Card className="bg-white/10 backdrop-blur-md border border-white/20">
            <CardHeader>
              <CardTitle className="text-white">Create Scheduled Report</CardTitle>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="report-name" className="text-white">Report Name *</Label>
                  <Input
                    id="report-name"
                    placeholder="e.g., Monthly Cash Flow Report"
                    value={newReport.name || ''}
                    onChange={(e) => setNewReport(prev => ({ ...prev, name: e.target.value }))}
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                  />
                </div>
                
                <div>
                  <Label className="text-white">Report Type</Label>
                  <Select
                    value={newReport.reportType}
                    onValueChange={(value) => setNewReport(prev => ({ ...prev, reportType: value as any }))}
                  >
                    <SelectTrigger className="bg-white/10 border-white/20 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700">
                      <SelectItem value="cash-flow">Cash Flow</SelectItem>
                      <SelectItem value="spending">Spending Analysis</SelectItem>
                      <SelectItem value="budget">Budget Performance</SelectItem>
                      <SelectItem value="income">Income Analysis</SelectItem>
                      <SelectItem value="custom">Custom Report</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <Label htmlFor="description" className="text-white">Description</Label>
                <Input
                  id="description"
                  placeholder="Brief description of this report"
                  value={newReport.description || ''}
                  onChange={(e) => setNewReport(prev => ({ ...prev, description: e.target.value }))}
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                />
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label className="text-white">Frequency</Label>
                  <Select
                    value={newReport.frequency}
                    onValueChange={(value) => setNewReport(prev => ({ ...prev, frequency: value as any }))}
                  >
                    <SelectTrigger className="bg-white/10 border-white/20 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700">
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="time" className="text-white">Time</Label>
                  <Input
                    id="time"
                    type="time"
                    value={newReport.time || '09:00'}
                    onChange={(e) => setNewReport(prev => ({ ...prev, time: e.target.value }))}
                    className="bg-white/10 border-white/20 text-white"
                  />
                </div>
                
                <div>
                  <Label className="text-white">Format</Label>
                  <Select
                    value={newReport.format}
                    onValueChange={(value) => setNewReport(prev => ({ ...prev, format: value as any }))}
                  >
                    <SelectTrigger className="bg-white/10 border-white/20 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700">
                      <SelectItem value="pdf">PDF</SelectItem>
                      <SelectItem value="csv">CSV</SelectItem>
                      <SelectItem value="xlsx">Excel</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <Label className="text-white mb-2 block">Email Recipients *</Label>
                <div className="flex space-x-2 mb-2">
                  <Input
                    placeholder="Enter email address"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addEmail()}
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                  />
                  <Button
                    variant="outline"
                    onClick={addEmail}
                    disabled={!emailInput.includes('@')}
                    className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                  >
                    Add
                  </Button>
                </div>
                
                {newReport.recipients && newReport.recipients.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {newReport.recipients.map((email, index) => (
                      <Badge
                        key={index}
                        variant="outline"
                        className="text-white border-white/30 bg-white/10"
                      >
                        {email}
                        <button
                          onClick={() => removeEmail(email)}
                          className="ml-2 text-white/60 hover:text-white"
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsCreating(false);
                    setActiveTab('list');
                  }}
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateReport}
                  disabled={!newReport.name || !newReport.recipients?.length}
                  className="bg-[#FFD166] hover:bg-[#FFD166]/90 text-black"
                >
                  Create Schedule
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}