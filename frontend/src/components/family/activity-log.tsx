'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  User,
  Clock,
  Edit,
  Trash2,
  Plus,
  LogIn,
  LogOut,
  RefreshCw,
  Eye,
  ChevronDown,
  Filter,
  Calendar,
  MapPin
} from 'lucide-react';

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

interface ActivityLogProps {
  limit?: number;
  showFilters?: boolean;
  memberId?: string;
  entityType?: string;
  actions?: string[];
}

export const ActivityLog: React.FC<ActivityLogProps> = ({
  limit = 20,
  showFilters = true,
  memberId,
  entityType,
  actions,
}) => {
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [timeFilter, setTimeFilter] = useState<string>('7d');
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());

  const { data: activityLog, isLoading } = useQuery<AuditLogEntry[]>({
    queryKey: ['family', 'activity', timeFilter, memberId, entityType, actionFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        period: timeFilter,
        limit: String(limit),
      });

      if (memberId) params.append('memberId', memberId);
      if (entityType) params.append('entityType', entityType);
      if (actionFilter !== 'all') params.append('action', actionFilter);

      const response = await fetch(`/api/families/activity?${params}`);
      if (!response.ok) throw new Error('Failed to fetch activity log');
      return response.json();
    },
  });

  const filteredActivity = React.useMemo(() => {
    let filtered = activityLog || [];

    if (actions && actions.length > 0) {
      filtered = filtered.filter(entry => actions.includes(entry.action));
    }

    return filtered;
  }, [activityLog, actions]);

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
      case 'create': return 'bg-[#8FAD77]/10';
      case 'update': return 'bg-[#FFD166]/10';
      case 'delete': return 'bg-red-400/10';
      case 'login': return 'bg-[#5E7F9B]/10';
      case 'logout': return 'bg-slate-400/10';
      case 'sync': return 'bg-[#FFD166]/10';
      default: return 'bg-slate-400/10';
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
    const entityName = entry.metadata?.entityName || `${formatEntityType(entry.entityType)}`;
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
        {changes.slice(0, 3).map((change, index) => (
          <p key={index} className="text-xs text-slate-300 font-mono bg-slate-800/50 px-2 py-1 rounded">
            {change}
          </p>
        ))}
        {changes.length > 3 && (
          <p className="text-xs text-slate-400 italic">
            +{changes.length - 3} more changes
          </p>
        )}
      </div>
    ) : null;
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="animate-pulse bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-slate-700 rounded-lg"></div>
              <div className="flex-1">
                <div className="h-4 bg-slate-700 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-slate-700 rounded w-1/2"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      {showFilters && (
        <div className="flex items-center gap-3 text-sm">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="px-3 py-1 bg-white/10 backdrop-blur-sm border border-white/20 rounded text-white focus:ring-2 focus:ring-[#FFD166] focus:border-transparent"
          >
            <option value="all">All Actions</option>
            <option value="create">Creates</option>
            <option value="update">Updates</option>
            <option value="delete">Deletes</option>
            <option value="login">Logins</option>
            <option value="sync">Syncs</option>
          </select>

          <select
            value={timeFilter}
            onChange={(e) => setTimeFilter(e.target.value)}
            className="px-3 py-1 bg-white/10 backdrop-blur-sm border border-white/20 rounded text-white focus:ring-2 focus:ring-[#FFD166] focus:border-transparent"
          >
            <option value="1d">Last 24 hours</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>

          <span className="text-slate-400 ml-auto">
            {filteredActivity.length} event{filteredActivity.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      {/* Activity Log */}
      <div className="space-y-2">
        {filteredActivity.map((entry) => {
          const isExpanded = expandedEntries.has(entry.id);
          const hasDetails = entry.oldValues || entry.newValues || entry.metadata?.userAgent;

          return (
            <div
              key={entry.id}
              className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4 hover:bg-white/20 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1">
                  {/* Action Icon */}
                  <div className={`p-2 rounded-lg ${getActionColor(entry.action)}`}>
                    {getActionIcon(entry.action)}
                  </div>

                  {/* Activity Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-1">
                      <p className="text-white text-sm font-medium">
                        {getActivityDescription(entry)}
                      </p>
                      <div className="flex items-center text-slate-400 text-xs ml-4">
                        <Clock className="w-3 h-3 mr-1" />
                        {formatDate(entry.createdAt)}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-400">
                      <span className="flex items-center">
                        <User className="w-3 h-3 mr-1" />
                        {entry.familyMember.email}
                      </span>
                      {entry.ipAddress && (
                        <span className="flex items-center">
                          <MapPin className="w-3 h-3 mr-1" />
                          {entry.ipAddress}
                        </span>
                      )}
                      <span className="px-2 py-1 bg-slate-700 rounded text-xs">
                        {formatEntityType(entry.entityType)}
                      </span>
                    </div>

                    {/* Expanded Details */}
                    {isExpanded && hasDetails && (
                      <div className="mt-3 p-3 bg-slate-800/30 rounded-lg">
                        {entry.metadata?.userAgent && (
                          <div className="mb-2">
                            <p className="text-xs text-slate-400 font-medium">User Agent:</p>
                            <p className="text-xs text-slate-300 font-mono break-all">
                              {entry.metadata.userAgent}
                            </p>
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
                    className="ml-2 p-1 rounded hover:bg-white/10 transition-colors"
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

      {/* Empty State */}
      {filteredActivity.length === 0 && !isLoading && (
        <div className="text-center py-8 bg-white/5 rounded-xl">
          <Activity className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-white mb-2">No Activity Found</h3>
          <p className="text-slate-400 text-sm">
            {actionFilter !== 'all'
              ? `No ${actionFilter} activities in the selected time period`
              : 'No recent activity to display'}
          </p>
        </div>
      )}
    </div>
  );
};

export default ActivityLog;