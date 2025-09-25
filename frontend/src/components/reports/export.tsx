'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Download,
  FileText,
  FileSpreadsheet,
  FileImage,
  Mail,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Settings
} from 'lucide-react';

interface ExportFormat {
  id: 'pdf' | 'csv' | 'xlsx' | 'png' | 'json';
  name: string;
  description: string;
  icon: React.ReactNode;
  supportedTypes: ('table' | 'chart' | 'dashboard')[];
}

interface ExportOptions {
  format: 'pdf' | 'csv' | 'xlsx' | 'png' | 'json';
  includeCharts: boolean;
  includeSummary: boolean;
  pageOrientation?: 'portrait' | 'landscape';
  dateRange?: {
    start: string;
    end: string;
  };
  email?: {
    enabled: boolean;
    recipients: string[];
    subject: string;
    message: string;
  };
}

interface ExportJob {
  id: string;
  reportName: string;
  format: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number;
  createdAt: string;
  completedAt?: string;
  downloadUrl?: string;
  error?: string;
}

interface ReportExportProps {
  reportName: string;
  reportType: 'table' | 'chart' | 'dashboard';
  onExport?: (options: ExportOptions) => void;
  recentExports?: ExportJob[];
  isExporting?: boolean;
}

const EXPORT_FORMATS: ExportFormat[] = [
  {
    id: 'pdf',
    name: 'PDF Document',
    description: 'Formatted report with charts and tables',
    icon: <FileText className="h-4 w-4" />,
    supportedTypes: ['table', 'chart', 'dashboard']
  },
  {
    id: 'csv',
    name: 'CSV Spreadsheet',
    description: 'Data only, no formatting or charts',
    icon: <FileSpreadsheet className="h-4 w-4" />,
    supportedTypes: ['table']
  },
  {
    id: 'xlsx',
    name: 'Excel Workbook',
    description: 'Formatted spreadsheet with multiple sheets',
    icon: <FileSpreadsheet className="h-4 w-4" />,
    supportedTypes: ['table', 'dashboard']
  },
  {
    id: 'png',
    name: 'PNG Image',
    description: 'High-quality image of charts',
    icon: <FileImage className="h-4 w-4" />,
    supportedTypes: ['chart']
  },
  {
    id: 'json',
    name: 'JSON Data',
    description: 'Raw data in JSON format for API integration',
    icon: <FileText className="h-4 w-4" />,
    supportedTypes: ['table', 'chart', 'dashboard']
  }
];

export default function ReportExport({
  reportName,
  reportType,
  onExport,
  recentExports = [],
  isExporting = false
}: ReportExportProps) {
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'pdf',
    includeCharts: true,
    includeSummary: true,
    pageOrientation: 'portrait',
    email: {
      enabled: false,
      recipients: [],
      subject: `${reportName} Export`,
      message: 'Please find the attached report export.'
    }
  });

  const [emailRecipient, setEmailRecipient] = useState('');

  const availableFormats = EXPORT_FORMATS.filter(format => 
    format.supportedTypes.includes(reportType)
  );

  const selectedFormat = EXPORT_FORMATS.find(f => f.id === exportOptions.format);

  const handleExport = () => {
    onExport?.(exportOptions);
  };

  const addEmailRecipient = () => {
    if (emailRecipient.trim() && emailRecipient.includes('@')) {
      setExportOptions(prev => ({
        ...prev,
        email: {
          ...prev.email!,
          recipients: [...prev.email!.recipients, emailRecipient.trim()]
        }
      }));
      setEmailRecipient('');
    }
  };

  const removeEmailRecipient = (email: string) => {
    setExportOptions(prev => ({
      ...prev,
      email: {
        ...prev.email!,
        recipients: prev.email!.recipients.filter(r => r !== email)
      }
    }));
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'processing': return <Clock className="h-4 w-4 text-yellow-500" />;
      default: return <Clock className="h-4 w-4 text-gray-500" />;
    }
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
      {/* Export Configuration */}
      <Card className="bg-white/10 backdrop-blur-md border border-white/20">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-white flex items-center">
            <Download className="h-5 w-5 mr-2" />
            Export Report: {reportName}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Format Selection */}
          <div>
            <Label className="text-white mb-3 block">Export Format</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {availableFormats.map((format) => (
                <div
                  key={format.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    exportOptions.format === format.id
                      ? 'bg-white/20 border-white/40'
                      : 'bg-white/5 border-white/20 hover:bg-white/10'
                  }`}
                  onClick={() => setExportOptions(prev => ({ ...prev, format: format.id }))}
                >
                  <div className="flex items-center space-x-2 mb-2">
                    {format.icon}
                    <span className="font-medium text-white">{format.name}</span>
                  </div>
                  <p className="text-sm text-white/70">{format.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Format-specific Options */}
          {selectedFormat && (
            <div className="space-y-4 p-4 bg-black/20 rounded-lg">
              <h4 className="font-medium text-white">Export Options</h4>
              
              {selectedFormat.supportedTypes.includes('chart') && (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={exportOptions.includeCharts}
                    onCheckedChange={(checked) => 
                      setExportOptions(prev => ({ ...prev, includeCharts: checked as boolean }))
                    }
                  />
                  <Label className="text-white">Include charts and visualizations</Label>
                </div>
              )}

              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={exportOptions.includeSummary}
                  onCheckedChange={(checked) => 
                    setExportOptions(prev => ({ ...prev, includeSummary: checked as boolean }))
                  }
                />
                <Label className="text-white">Include summary statistics</Label>
              </div>

              {exportOptions.format === 'pdf' && (
                <div>
                  <Label className="text-white">Page Orientation</Label>
                  <Select
                    value={exportOptions.pageOrientation}
                    onValueChange={(value) => 
                      setExportOptions(prev => ({ ...prev, pageOrientation: value as 'portrait' | 'landscape' }))
                    }
                  >
                    <SelectTrigger className="w-[180px] bg-white/10 border-white/20 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700">
                      <SelectItem value="portrait">Portrait</SelectItem>
                      <SelectItem value="landscape">Landscape</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          {/* Email Options */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                checked={exportOptions.email?.enabled || false}
                onCheckedChange={(checked) => 
                  setExportOptions(prev => ({
                    ...prev,
                    email: { ...prev.email!, enabled: checked as boolean }
                  }))
                }
              />
              <Label className="text-white flex items-center">
                <Mail className="h-4 w-4 mr-1" />
                Email report after export
              </Label>
            </div>

            {exportOptions.email?.enabled && (
              <div className="space-y-3 p-4 bg-black/20 rounded-lg">
                <div className="flex space-x-2">
                  <Input
                    placeholder="Enter email address"
                    value={emailRecipient}
                    onChange={(e) => setEmailRecipient(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addEmailRecipient()}
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                  />
                  <Button
                    variant="outline"
                    onClick={addEmailRecipient}
                    disabled={!emailRecipient.includes('@')}
                    className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                  >
                    Add
                  </Button>
                </div>

                {exportOptions.email.recipients.length > 0 && (
                  <div>
                    <Label className="text-white text-sm">Recipients:</Label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {exportOptions.email.recipients.map((email, index) => (
                        <Badge
                          key={index}
                          variant="outline"
                          className="text-white border-white/30 bg-white/10"
                        >
                          {email}
                          <button
                            onClick={() => removeEmailRecipient(email)}
                            className="ml-2 text-white/60 hover:text-white"
                          >
                            ×
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <Label className="text-white">Subject</Label>
                  <Input
                    value={exportOptions.email.subject}
                    onChange={(e) => 
                      setExportOptions(prev => ({
                        ...prev,
                        email: { ...prev.email!, subject: e.target.value }
                      }))
                    }
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Export Button */}
          <div className="flex justify-end">
            <Button
              onClick={handleExport}
              disabled={isExporting}
              className="bg-[#FFD166] hover:bg-[#FFD166]/90 text-black font-medium"
            >
              {isExporting ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Export {selectedFormat?.name}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Exports */}
      <Card className="bg-white/10 backdrop-blur-md border border-white/20">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-white">
            Recent Exports
          </CardTitle>
        </CardHeader>

        <CardContent>
          <div className="space-y-3">
            {recentExports.length > 0 ? (
              recentExports.map((job) => (
                <div key={job.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(job.status)}
                    <div>
                      <div className="font-medium text-white">{job.reportName}</div>
                      <div className="text-sm text-white/60">
                        {job.format.toUpperCase()} • {formatDate(job.createdAt)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {job.status === 'processing' && job.progress && (
                      <div className="text-sm text-white/70">
                        {job.progress}%
                      </div>
                    )}
                    
                    {job.status === 'completed' && job.downloadUrl && (
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                        className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                      >
                        <a href={job.downloadUrl} download>
                          <Download className="h-4 w-4" />
                        </a>
                      </Button>
                    )}

                    {job.status === 'failed' && (
                      <Badge variant="outline" className="text-red-400 border-red-400">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Failed
                      </Badge>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-white/60">
                <Download className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No recent exports</p>
                <p className="text-sm">Your exported reports will appear here</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}