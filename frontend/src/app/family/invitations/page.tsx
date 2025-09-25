'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Mail,
  Plus,
  Search,
  Clock,
  Send,
  X,
  RefreshCw,
  Check,
  AlertCircle,
  Calendar,
  User,
  Copy,
  ExternalLink
} from 'lucide-react';
import Link from 'next/link';

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

const FamilyInvitationsPage = () => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [newInviteEmail, setNewInviteEmail] = useState('');
  const [newInviteRole, setNewInviteRole] = useState<'editor' | 'viewer'>('editor');
  const [selectedInvitation, setSelectedInvitation] = useState<FamilyInvitation | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const { data: invitations, isLoading } = useQuery<FamilyInvitation[]>({
    queryKey: ['family', 'invitations'],
    queryFn: async () => {
      const response = await fetch('/api/families/invitations');
      if (!response.ok) throw new Error('Failed to fetch family invitations');
      return response.json();
    },
  });

  const createInvitationMutation = useMutation({
    mutationFn: async ({ email, role }: { email: string; role: string }) => {
      const response = await fetch('/api/families/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role }),
      });
      if (!response.ok) throw new Error('Failed to create invitation');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['family', 'invitations'] });
      setShowInviteModal(false);
      setNewInviteEmail('');
      setNewInviteRole('editor');
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
      setShowCancelConfirm(false);
      setSelectedInvitation(null);
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
    },
  });

  const filteredInvitations = invitations?.filter(invitation => {
    const matchesSearch = invitation.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || invitation.status === statusFilter;
    return matchesSearch && matchesStatus;
  }) || [];

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getDaysUntilExpiry = (expiresAt: string) => {
    const expiry = new Date(expiresAt);
    const now = new Date();
    const diffMs = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-[#FFD166] bg-[#FFD166]/10';
      case 'accepted': return 'text-[#8FAD77] bg-[#8FAD77]/10';
      case 'expired': return 'text-red-400 bg-red-400/10';
      case 'cancelled': return 'text-slate-400 bg-slate-400/10';
      default: return 'text-slate-400 bg-slate-400/10';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'accepted': return <Check className="w-4 h-4" />;
      case 'expired': return <AlertCircle className="w-4 h-4" />;
      case 'cancelled': return <X className="w-4 h-4" />;
      default: return <Mail className="w-4 h-4" />;
    }
  };

  const handleCreateInvitation = () => {
    if (newInviteEmail.trim()) {
      createInvitationMutation.mutate({
        email: newInviteEmail.trim(),
        role: newInviteRole,
      });
    }
  };

  const handleCancelInvitation = (invitation: FamilyInvitation) => {
    setSelectedInvitation(invitation);
    setShowCancelConfirm(true);
  };

  const confirmCancel = () => {
    if (selectedInvitation) {
      cancelInvitationMutation.mutate(selectedInvitation.id);
    }
  };

  const handleResendInvitation = (invitationId: string) => {
    resendInvitationMutation.mutate(invitationId);
  };

  const copyInviteLink = (link: string) => {
    navigator.clipboard.writeText(link);
    // Could add toast notification here
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-slate-700 rounded w-64"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-48 bg-slate-700 rounded-xl"></div>
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
            <h1 className="text-3xl font-bold text-white mb-2">Family Invitations</h1>
            <p className="text-slate-400">
              Manage pending invitations and invite new family members
            </p>
          </div>

          <div className="flex items-center gap-4 mt-4 sm:mt-0">
            <Link
              href="/family"
              className="px-4 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white hover:bg-white/20 transition-colors"
            >
              Back to Settings
            </Link>
            <button
              onClick={() => setShowInviteModal(true)}
              className="inline-flex items-center px-4 py-2 bg-[#FFD166] text-slate-900 font-semibold rounded-lg hover:bg-[#FFD166]/90 transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              Send Invitation
            </button>
          </div>
        </div>

        {/* Search and Filter Bar */}
        <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6 mb-8">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search invitations by email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-[#FFD166] focus:border-transparent"
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-slate-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white focus:ring-2 focus:ring-[#FFD166] focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="accepted">Accepted</option>
                <option value="expired">Expired</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </div>

        {/* Invitations List */}
        {filteredInvitations.length === 0 ? (
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-12 text-center">
            <Mail className="w-16 h-16 text-slate-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No Invitations Found</h3>
            <p className="text-slate-400 mb-6">
              {searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your search or filter criteria'
                : 'You haven\'t sent any family invitations yet'}
            </p>
            {!searchQuery && statusFilter === 'all' && (
              <button
                onClick={() => setShowInviteModal(true)}
                className="inline-flex items-center px-6 py-3 bg-[#FFD166] text-slate-900 font-semibold rounded-lg hover:bg-[#FFD166]/90 transition-colors"
              >
                <Plus className="w-5 h-5 mr-2" />
                Send First Invitation
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {filteredInvitations.map((invitation) => {
              const daysUntilExpiry = getDaysUntilExpiry(invitation.expiresAt);
              const isExpiring = daysUntilExpiry <= 2 && invitation.status === 'pending';

              return (
                <div
                  key={invitation.id}
                  className={`bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6 hover:bg-white/20 transition-colors ${
                    isExpiring ? 'ring-2 ring-[#FFD166]/50' : ''
                  }`}
                >
                  {/* Invitation Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-r from-[#5E7F9B] to-[#FFD166] flex items-center justify-center">
                        <Mail className="w-6 h-6 text-white" />
                      </div>
                      <div className="ml-3">
                        <h3 className="font-semibold text-white">{invitation.email}</h3>
                        <p className="text-slate-400 text-sm">
                          Role: {invitation.role.charAt(0).toUpperCase() + invitation.role.slice(1)}
                        </p>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2 ${getStatusColor(invitation.status)}`}>
                      {getStatusIcon(invitation.status)}
                      {invitation.status.charAt(0).toUpperCase() + invitation.status.slice(1)}
                    </div>
                  </div>

                  {/* Invitation Details */}
                  <div className="space-y-3 mb-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">Invited by:</span>
                      <span className="text-white">
                        {invitation.invitedBy.firstName} {invitation.invitedBy.lastName}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">Sent:</span>
                      <span className="text-white">{formatDate(invitation.createdAt)}</span>
                    </div>

                    {invitation.status === 'pending' && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-400">Expires:</span>
                        <span className={`${isExpiring ? 'text-[#FFD166] font-semibold' : 'text-white'}`}>
                          {daysUntilExpiry > 0 ? `${daysUntilExpiry} days` : 'Expired'}
                          {isExpiring && ' ⚠️'}
                        </span>
                      </div>
                    )}

                    {invitation.acceptedAt && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-400">Accepted:</span>
                        <span className="text-white">{formatDate(invitation.acceptedAt)}</span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="border-t border-white/20 pt-4">
                    <div className="flex flex-wrap gap-2">
                      {invitation.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleResendInvitation(invitation.id)}
                            disabled={resendInvitationMutation.isPending}
                            className="inline-flex items-center px-3 py-1 bg-[#8FAD77]/20 text-[#8FAD77] rounded-lg hover:bg-[#8FAD77]/30 transition-colors text-sm disabled:opacity-50"
                          >
                            <RefreshCw className="w-3 h-3 mr-1" />
                            Resend
                          </button>

                          {invitation.inviteLink && (
                            <button
                              onClick={() => copyInviteLink(invitation.inviteLink!)}
                              className="inline-flex items-center px-3 py-1 bg-[#5E7F9B]/20 text-[#5E7F9B] rounded-lg hover:bg-[#5E7F9B]/30 transition-colors text-sm"
                            >
                              <Copy className="w-3 h-3 mr-1" />
                              Copy Link
                            </button>
                          )}

                          <button
                            onClick={() => handleCancelInvitation(invitation)}
                            className="inline-flex items-center px-3 py-1 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors text-sm"
                          >
                            <X className="w-3 h-3 mr-1" />
                            Cancel
                          </button>
                        </>
                      )}

                      {invitation.status === 'expired' && (
                        <button
                          onClick={() => handleResendInvitation(invitation.id)}
                          disabled={resendInvitationMutation.isPending}
                          className="inline-flex items-center px-3 py-1 bg-[#FFD166]/20 text-[#FFD166] rounded-lg hover:bg-[#FFD166]/30 transition-colors text-sm disabled:opacity-50"
                        >
                          <Send className="w-3 h-3 mr-1" />
                          Send New
                        </button>
                      )}

                      {invitation.status === 'accepted' && (
                        <Link
                          href="/family/members"
                          className="inline-flex items-center px-3 py-1 bg-[#8FAD77]/20 text-[#8FAD77] rounded-lg hover:bg-[#8FAD77]/30 transition-colors text-sm"
                        >
                          <User className="w-3 h-3 mr-1" />
                          View Member
                        </Link>
                      )}
                    </div>
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
                <p className="text-slate-400 text-sm">Total Sent</p>
                <p className="text-2xl font-bold text-white">{filteredInvitations.length}</p>
              </div>
              <Mail className="w-8 h-8 text-[#5E7F9B]" />
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Pending</p>
                <p className="text-2xl font-bold text-white">
                  {filteredInvitations.filter(i => i.status === 'pending').length}
                </p>
              </div>
              <Clock className="w-8 h-8 text-[#FFD166]" />
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Accepted</p>
                <p className="text-2xl font-bold text-white">
                  {filteredInvitations.filter(i => i.status === 'accepted').length}
                </p>
              </div>
              <Check className="w-8 h-8 text-[#8FAD77]" />
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Expired</p>
                <p className="text-2xl font-bold text-white">
                  {filteredInvitations.filter(i => i.status === 'expired').length}
                </p>
              </div>
              <AlertCircle className="w-8 h-8 text-red-400" />
            </div>
          </div>
        </div>

        {/* Create Invitation Modal */}
        {showInviteModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl p-6 max-w-md mx-4 w-full">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-white">Send Family Invitation</h3>
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="p-1 rounded hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={newInviteEmail}
                    onChange={(e) => setNewInviteEmail(e.target.value)}
                    placeholder="Enter email address"
                    className="w-full px-4 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-[#FFD166] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Role
                  </label>
                  <select
                    value={newInviteRole}
                    onChange={(e) => setNewInviteRole(e.target.value as 'editor' | 'viewer')}
                    className="w-full px-4 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white focus:ring-2 focus:ring-[#FFD166] focus:border-transparent"
                  >
                    <option value="editor">Editor - Can manage finances</option>
                    <option value="viewer">Viewer - Can view only</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="px-4 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white hover:bg-white/20 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateInvitation}
                  disabled={createInvitationMutation.isPending || !newInviteEmail.trim()}
                  className="px-4 py-2 bg-[#FFD166] text-slate-900 font-semibold rounded-lg hover:bg-[#FFD166]/90 transition-colors disabled:opacity-50"
                >
                  {createInvitationMutation.isPending ? 'Sending...' : 'Send Invitation'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Cancel Confirmation Modal */}
        {showCancelConfirm && selectedInvitation && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl p-6 max-w-md mx-4">
              <div className="flex items-center mb-4">
                <AlertCircle className="w-6 h-6 text-red-400 mr-3" />
                <h3 className="text-lg font-bold text-white">Cancel Invitation</h3>
              </div>

              <p className="text-slate-300 mb-6">
                Are you sure you want to cancel the invitation to <strong>{selectedInvitation.email}</strong>?
                This action cannot be undone.
              </p>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowCancelConfirm(false)}
                  className="px-4 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white hover:bg-white/20 transition-colors"
                >
                  Keep Invitation
                </button>
                <button
                  onClick={confirmCancel}
                  disabled={cancelInvitationMutation.isPending}
                  className="px-4 py-2 bg-red-500 text-white font-semibold rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
                >
                  {cancelInvitationMutation.isPending ? 'Cancelling...' : 'Cancel Invitation'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FamilyInvitationsPage;