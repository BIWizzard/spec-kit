'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Mail,
  Clock,
  Check,
  X,
  RefreshCw,
  Send,
  AlertCircle,
  Copy,
  Eye,
  Edit2,
  Crown,
  Filter,
  Calendar
} from 'lucide-react';

interface FamilyInvitation {
  id: string;
  email: string;
  role: 'admin' | 'editor' | 'viewer';
  status: 'pending' | 'accepted' | 'expired' | 'cancelled';
  invitedBy: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
  acceptedAt: string | null;
  inviteLink?: string;
}

interface InvitationsListProps {
  limit?: number;
  showFilters?: boolean;
  onInviteSuccess?: () => void;
}

export const InvitationsList: React.FC<InvitationsListProps> = ({
  limit,
  showFilters = true,
  onInviteSuccess,
}) => {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data: invitations, isLoading } = useQuery<FamilyInvitation[]>({
    queryKey: ['family', 'invitations'],
    queryFn: async () => {
      const response = await fetch('/api/families/invitations');
      if (!response.ok) throw new Error('Failed to fetch invitations');
      return response.json();
    },
  });

  const cancelInvitationMutation = useMutation({
    mutationFn: async (invitationId: string) => {
      const response = await fetch(`/api/families/invitations/${invitationId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to cancel invitation');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['family', 'invitations'] });
    },
  });

  const resendInvitationMutation = useMutation({
    mutationFn: async (invitationId: string) => {
      const response = await fetch(`/api/families/invitations/${invitationId}/resend`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to resend invitation');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['family', 'invitations'] });
      onInviteSuccess?.();
    },
  });

  const filteredInvitations = React.useMemo(() => {
    let filtered = invitations?.filter(invitation => {
      return statusFilter === 'all' || invitation.status === statusFilter;
    }) || [];

    if (limit) {
      filtered = filtered.slice(0, limit);
    }

    return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [invitations, statusFilter, limit]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getDaysUntilExpiry = (expiresAt: string) => {
    const expiry = new Date(expiresAt);
    const now = new Date();
    const diffMs = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4 text-[#FFD166]" />;
      case 'accepted': return <Check className="w-4 h-4 text-[#8FAD77]" />;
      case 'expired': return <AlertCircle className="w-4 h-4 text-red-400" />;
      case 'cancelled': return <X className="w-4 h-4 text-slate-400" />;
      default: return <Mail className="w-4 h-4 text-slate-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-[#FFD166] bg-[#FFD166]/10 border-[#FFD166]/20';
      case 'accepted': return 'text-[#8FAD77] bg-[#8FAD77]/10 border-[#8FAD77]/20';
      case 'expired': return 'text-red-400 bg-red-400/10 border-red-400/20';
      case 'cancelled': return 'text-slate-400 bg-slate-400/10 border-slate-400/20';
      default: return 'text-slate-400 bg-slate-400/10 border-slate-400/20';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <Crown className="w-3 h-3 text-[#FFD166]" />;
      case 'editor': return <Edit2 className="w-3 h-3 text-[#8FAD77]" />;
      case 'viewer': return <Eye className="w-3 h-3 text-[#5E7F9B]" />;
      default: return <Mail className="w-3 h-3 text-slate-400" />;
    }
  };

  const copyInviteLink = async (link: string) => {
    if (link) {
      await navigator.clipboard.writeText(link);
      // Could add toast notification here
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-slate-700 rounded-full"></div>
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
      {/* Filter Bar */}
      {showFilters && (
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white focus:ring-2 focus:ring-[#FFD166] focus:border-transparent text-sm"
          >
            <option value="all">All Invitations</option>
            <option value="pending">Pending</option>
            <option value="accepted">Accepted</option>
            <option value="expired">Expired</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <span className="text-slate-400 text-sm">
            {filteredInvitations.length} invitation{filteredInvitations.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      {/* Invitations List */}
      <div className="space-y-3">
        {filteredInvitations.map((invitation) => {
          const daysUntilExpiry = getDaysUntilExpiry(invitation.expiresAt);
          const isExpiring = daysUntilExpiry <= 2 && invitation.status === 'pending';

          return (
            <div
              key={invitation.id}
              className={`bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4 hover:bg-white/20 transition-colors ${
                isExpiring ? 'ring-1 ring-[#FFD166]/50' : ''
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-[#5E7F9B] to-[#FFD166] flex items-center justify-center">
                    <Mail className="w-5 h-5 text-white" />
                  </div>

                  {/* Invitation Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <h3 className="font-medium text-white truncate">{invitation.email}</h3>
                      {getRoleIcon(invitation.role)}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-400">
                      <span>
                        Invited by {invitation.invitedBy.firstName} {invitation.invitedBy.lastName}
                      </span>
                      <span className="flex items-center">
                        <Calendar className="w-3 h-3 mr-1" />
                        {formatDate(invitation.createdAt)}
                      </span>
                    </div>

                    {invitation.status === 'pending' && (
                      <div className="mt-1">
                        <span className={`text-xs ${isExpiring ? 'text-[#FFD166] font-medium' : 'text-slate-400'}`}>
                          Expires in {daysUntilExpiry > 0 ? `${daysUntilExpiry} days` : 'less than a day'}
                          {isExpiring && ' ⚠️'}
                        </span>
                      </div>
                    )}

                    {invitation.acceptedAt && (
                      <div className="mt-1">
                        <span className="text-xs text-[#8FAD77]">
                          Accepted {formatDate(invitation.acceptedAt)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Status and Actions */}
                <div className="flex items-center space-x-2">
                  {/* Status Badge */}
                  <div className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium border ${getStatusColor(invitation.status)}`}>
                    {getStatusIcon(invitation.status)}
                    <span className="ml-1 capitalize">{invitation.status}</span>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center space-x-1">
                    {invitation.status === 'pending' && (
                      <>
                        <button
                          onClick={() => resendInvitationMutation.mutate(invitation.id)}
                          disabled={resendInvitationMutation.isPending}
                          className="p-1 rounded hover:bg-white/10 transition-colors"
                          title="Resend invitation"
                        >
                          <RefreshCw className="w-3 h-3 text-[#8FAD77]" />
                        </button>

                        {invitation.inviteLink && (
                          <button
                            onClick={() => copyInviteLink(invitation.inviteLink!)}
                            className="p-1 rounded hover:bg-white/10 transition-colors"
                            title="Copy invite link"
                          >
                            <Copy className="w-3 h-3 text-[#5E7F9B]" />
                          </button>
                        )}

                        <button
                          onClick={() => cancelInvitationMutation.mutate(invitation.id)}
                          disabled={cancelInvitationMutation.isPending}
                          className="p-1 rounded hover:bg-white/10 transition-colors"
                          title="Cancel invitation"
                        >
                          <X className="w-3 h-3 text-red-400" />
                        </button>
                      </>
                    )}

                    {invitation.status === 'expired' && (
                      <button
                        onClick={() => resendInvitationMutation.mutate(invitation.id)}
                        disabled={resendInvitationMutation.isPending}
                        className="p-1 rounded hover:bg-white/10 transition-colors"
                        title="Send new invitation"
                      >
                        <Send className="w-3 h-3 text-[#FFD166]" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredInvitations.length === 0 && !isLoading && (
        <div className="text-center py-8 bg-white/5 rounded-xl">
          <Mail className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-white mb-2">No Invitations Found</h3>
          <p className="text-slate-400 text-sm">
            {statusFilter !== 'all'
              ? `No ${statusFilter} invitations at this time`
              : 'You haven\'t sent any invitations yet'}
          </p>
        </div>
      )}

      {/* Loading States */}
      {(resendInvitationMutation.isPending || cancelInvitationMutation.isPending) && (
        <div className="text-center py-2">
          <div className="inline-flex items-center text-sm text-slate-400">
            <div className="animate-spin w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full mr-2"></div>
            {resendInvitationMutation.isPending ? 'Resending invitation...' : 'Cancelling invitation...'}
          </div>
        </div>
      )}
    </div>
  );
};

export default InvitationsList;