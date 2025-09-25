'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  Search,
  Filter,
  Calendar,
  User,
  Edit,
  Trash2,
  Plus,
  Eye,
  LogIn,
  LogOut,
  RefreshCw,
  Settings,
  AlertCircle,
  Clock,
  ChevronDown,
  Download
} from 'lucide-react';
import Link from 'next/link';

interface AuditLogEntry {
  id: string;
  familyId: string;
  familyMember: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  action: 'create' | 'update' | 'delete' | 'login' | 'logout' | 'sync';
  entityType: string;
  entityId: string;
  oldValues: Record<string, any> | null;
  newValues: Record<string, any> | null;
  ipAddress: string;
  createdAt: string;
  metadata?: {
    userAgent?: string;
    location?: string;
    entityName?: string;
    changes?: string[];
  };
}

const FamilyActivityPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [entityFilter, setEntityFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState('7d');
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());

  const { data: activityLog, isLoading } = useQuery<AuditLogEntry[]>({
    queryKey: ['family', 'activity', dateRange],
    queryFn: async () => {
      const response = await fetch(`/api/families/activity?period=${dateRange}`);
      if (!response.ok) throw new Error('Failed to fetch family activity');
      return response.json();
    },
  });

  const filteredActivity = activityLog?.filter(entry => {
    const matchesSearch =
      entry.familyMember.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.familyMember.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.entityType.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (entry.metadata?.entityName?.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesAction = actionFilter === 'all' || entry.action === actionFilter;
    const matchesEntity = entityFilter === 'all' || entry.entityType === entityFilter;

    return matchesSearch && matchesAction && matchesEntity;
  }) || [];

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'create': return <Plus className="w-4 h-4 text-[#8FAD77]" />;
      case 'update': return <Edit className="w-4 h-4 text-[#FFD166]" />;
      case 'delete': return <Trash2 className="w-4 h-4 text-red-400" />;
      case 'login': return <LogIn className="w-4 h-4 text-[#5E7F9B]" />;
      case 'logout': return <LogOut className="w-4 h-4 text-slate-400" />;
      case 'sync': return <RefreshCw className="w-4 h-4 text-[#FFD166]" />;
      default: return <Activity className="w-4 h-4 text-slate-400" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'create': return 'text-[#8FAD77] bg-[#8FAD77]/10';
      case 'update': return 'text-[#FFD166] bg-[#FFD166]/10';
      case 'delete': return 'text-red-400 bg-red-400/10';
      case 'login': return 'text-[#5E7F9B] bg-[#5E7F9B]/10';
      case 'logout': return 'text-slate-400 bg-slate-400/10';
      case 'sync': return 'text-[#FFD166] bg-[#FFD166]/10';
      default: return 'text-slate-400 bg-slate-400/10';
    }
  };

  const formatEntityType = (entityType: string) => {
    return entityType
      .split(/(?=[A-Z])/)
      .join(' ')
      .toLowerCase()
      .replace(/^\w/, c => c.toUpperCase());
  };

  const getActivityDescription = (entry: AuditLogEntry) => {
    const entityName = entry.metadata?.entityName || `${formatEntityType(entry.entityType)} #${entry.entityId.slice(0, 8)}`;
    const memberName = `${entry.familyMember.firstName} ${entry.familyMember.lastName}`;

    switch (entry.action) {
      case 'create':
        return `${memberName} created ${entityName}`;
      case 'update':
        return `${memberName} updated ${entityName}`;
      case 'delete':
        return `${memberName} deleted ${entityName}`;
      case 'login':
        return `${memberName} logged in`;
      case 'logout':
        return `${memberName} logged out`;
      case 'sync':
        return `${memberName} synced ${entityName}`;
      default:
        return `${memberName} performed ${entry.action} on ${entityName}`;
    }
  };

  const toggleExpanded = (entryId: string) => {
    const newExpanded = new Set(expandedEntries);
    if (newExpanded.has(entryId)) {
      newExpanded.delete(entryId);
    } else {
      newExpanded.add(entryId);
    }
    setExpandedEntries(newExpanded);
  };

  const renderChanges = (entry: AuditLogEntry) => {
    if (!entry.oldValues && !entry.newValues) return null;

    const changes: string[] = [];

    if (entry.newValues && entry.oldValues) {
      Object.keys(entry.newValues).forEach(key => {
        if (entry.oldValues![key] !== entry.newValues![key]) {
          changes.push(`${key}: ${entry.oldValues![key]} → ${entry.newValues![key]}`);
        }
      });
    }

    if (entry.metadata?.changes) {
      changes.push(...entry.metadata.changes);
    }

    return changes.length > 0 ? (
      <div className="mt-2 space-y-1">
        <p className="text-xs text-slate-400 font-medium">Changes:</p>
        {changes.map((change, index) => (
          <p key={index} className="text-xs text-slate-300 font-mono bg-slate-800/50 px-2 py-1 rounded">
            {change}
          </p>
        ))}
      </div>
    ) : null;
  };

  const uniqueEntityTypes = [...new Set(activityLog?.map(entry => entry.entityType) || [])];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-slate-700 rounded w-64"></div>
            <div className="space-y-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-20 bg-slate-700 rounded-xl"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Family Activity</h1>
            <p className="text-slate-400">
              Track all actions and changes made by family members
            </p>
          </div>

          <div className="flex items-center gap-4 mt-4 sm:mt-0">
            <Link
              href="/family"
              className="px-4 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white hover:bg-white/20 transition-colors"
            >
              Back to Settings
            </Link>
            <button className="inline-flex items-center px-4 py-2 bg-[#FFD166] text-slate-900 font-semibold rounded-lg hover:bg-[#FFD166]/90 transition-colors">
              <Download className="w-4 h-4 mr-2" />
              Export Log
            </button>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search activity..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-[#FFD166] focus:border-transparent"
              />
            </div>

            {/* Action Filter */}
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="px-4 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white focus:ring-2 focus:ring-[#FFD166] focus:border-transparent"
            >
              <option value="all">All Actions</option>
              <option value="create">Create</option>
              <option value="update">Update</option>
              <option value="delete">Delete</option>
              <option value="login">Login</option>
              <option value="logout">Logout</option>
              <option value="sync">Sync</option>
            </select>

            {/* Entity Filter */}
            <select
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value)}
              className="px-4 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white focus:ring-2 focus:ring-[#FFD166] focus:border-transparent"
            >
              <option value="all">All Entities</option>
              {uniqueEntityTypes.map(entityType => (
                <option key={entityType} value={entityType}>
                  {formatEntityType(entityType)}
                </option>
              ))}
            </select>

            {/* Date Range */}
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-4 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white focus:ring-2 focus:ring-[#FFD166] focus:border-transparent"
            >
              <option value="1d">Last 24 hours</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
            </select>
          </div>
        </div>

        {/* Activity Log */}
        {filteredActivity.length === 0 ? (
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-12 text-center">
            <Activity className="w-16 h-16 text-slate-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No Activity Found</h3>
            <p className="text-slate-400 mb-6">
              {searchQuery || actionFilter !== 'all' || entityFilter !== 'all'
                ? 'Try adjusting your search or filter criteria'
                : 'No activity recorded for the selected time period'}
            </p>
          </div>
        ) : (
          <div className="space-y-4 mb-8">
            {filteredActivity.map((entry) => {
              const isExpanded = expandedEntries.has(entry.id);
              const hasDetails = entry.oldValues || entry.newValues || entry.metadata?.changes;

              return (
                <div
                  key={entry.id}
                  className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6 hover:bg-white/20 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4 flex-1">
                      {/* Action Icon */}
                      <div className={`p-2 rounded-lg ${getActionColor(entry.action)}`}>
                        {getActionIcon(entry.action)}
                      </div>

                      {/* Activity Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-white font-medium">
                            {getActivityDescription(entry)}
                          </p>
                          <div className="flex items-center text-slate-400 text-sm">
                            <Clock className="w-4 h-4 mr-1" />
                            {formatDate(entry.createdAt)}
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-sm text-slate-400">
                          <span className="flex items-center">
                            <User className="w-3 h-3 mr-1" />
                            {entry.familyMember.email}
                          </span>
                          {entry.ipAddress && (
                            <span>IP: {entry.ipAddress}</span>
                          )}
                          <span className={`px-2 py-1 rounded text-xs ${getActionColor(entry.action)}`}>
                            {entry.action.toUpperCase()}
                          </span>
                          <span className="px-2 py-1 rounded text-xs bg-slate-700 text-slate-300">
                            {formatEntityType(entry.entityType)}
                          </span>
                        </div>

                        {/* Expanded Details */}
                        {isExpanded && hasDetails && (
                          <div className="mt-4 p-4 bg-slate-800/50 rounded-lg">
                            {entry.metadata?.userAgent && (
                              <div className="mb-2">
                                <p className="text-xs text-slate-400 font-medium">User Agent:</p>
                                <p className="text-xs text-slate-300 font-mono">{entry.metadata.userAgent}</p>
                              </div>
                            )}
                            {renderChanges(entry)}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Expand Button */}
                    {hasDetails && (
                      <button
                        onClick={() => toggleExpanded(entry.id)}
                        className="ml-4 p-1 rounded hover:bg-white/10 transition-colors"
                      >
                        <ChevronDown
                          className={`w-4 h-4 text-slate-400 transition-transform ${
                            isExpanded ? 'rotate-180' : ''
                          }`}
                        />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Total Events</p>
                <p className="text-2xl font-bold text-white">{filteredActivity.length}</p>
              </div>
              <Activity className="w-8 h-8 text-[#5E7F9B]" />
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Creates</p>
                <p className="text-2xl font-bold text-white">
                  {filteredActivity.filter(e => e.action === 'create').length}
                </p>
              </div>
              <Plus className="w-8 h-8 text-[#8FAD77]" />
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Updates</p>
                <p className="text-2xl font-bold text-white">
                  {filteredActivity.filter(e => e.action === 'update').length}
                </p>
              </div>
              <Edit className="w-8 h-8 text-[#FFD166]" />
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Logins</p>
                <p className="text-2xl font-bold text-white">
                  {filteredActivity.filter(e => e.action === 'login').length}
                </p>
              </div>
              <LogIn className="w-8 h-8 text-[#5E7F9B]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FamilyActivityPage;