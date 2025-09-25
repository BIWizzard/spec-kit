'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Edit,
  Trash2,
  Crown,
  Shield,
  Eye,
  Mail,
  Calendar,
  AlertCircle,
  UserCheck
} from 'lucide-react';
import Link from 'next/link';

interface FamilyMember {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'editor' | 'viewer';
  permissions: {
    canManageBankAccounts: boolean;
    canEditPayments: boolean;
    canViewReports: boolean;
    canManageFamily: boolean;
  };
  mfaEnabled: boolean;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
  deletedAt: string | null;
}

const FamilyMembersPage = () => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { data: members, isLoading } = useQuery<FamilyMember[]>({
    queryKey: ['family', 'members'],
    queryFn: async () => {
      const response = await fetch('/api/families/members');
      if (!response.ok) throw new Error('Failed to fetch family members');
      return response.json();
    },
  });

  const deleteMemberMutation = useMutation({
    mutationFn: async (memberId: string) => {
      const response = await fetch(`/api/families/members/${memberId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete family member');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['family', 'members'] });
      setShowDeleteConfirm(false);
      setSelectedMember(null);
    },
  });

  const updateMemberRoleMutation = useMutation({
    mutationFn: async ({ memberId, role }: { memberId: string; role: string }) => {
      const response = await fetch(`/api/families/members/${memberId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      if (!response.ok) throw new Error('Failed to update member role');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['family', 'members'] });
    },
  });

  const filteredMembers = members?.filter(member => {
    const matchesSearch =
      member.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole = roleFilter === 'all' || member.role === roleFilter;

    return matchesSearch && matchesRole && !member.deletedAt;
  }) || [];

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatLastLogin = (dateString: string | null) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return formatDate(dateString);
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <Crown className="w-4 h-4 text-[#FFD166]" />;
      case 'editor': return <Edit className="w-4 h-4 text-[#8FAD77]" />;
      case 'viewer': return <Eye className="w-4 h-4 text-[#5E7F9B]" />;
      default: return <Shield className="w-4 h-4 text-slate-400" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'text-[#FFD166] bg-[#FFD166]/10';
      case 'editor': return 'text-[#8FAD77] bg-[#8FAD77]/10';
      case 'viewer': return 'text-[#5E7F9B] bg-[#5E7F9B]/10';
      default: return 'text-slate-400 bg-slate-400/10';
    }
  };

  const handleRoleChange = (memberId: string, newRole: string) => {
    updateMemberRoleMutation.mutate({ memberId, role: newRole });
  };

  const handleDeleteMember = (member: FamilyMember) => {
    setSelectedMember(member);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    if (selectedMember) {
      deleteMemberMutation.mutate(selectedMember.id);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-slate-700 rounded w-64"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
            <h1 className="text-3xl font-bold text-white mb-2">Family Members</h1>
            <p className="text-slate-400">
              Manage your family members and their access permissions
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
              Invite Member
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
                placeholder="Search members by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-[#FFD166] focus:border-transparent"
              />
            </div>

            {/* Role Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-slate-400" />
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-4 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white focus:ring-2 focus:ring-[#FFD166] focus:border-transparent"
              >
                <option value="all">All Roles</option>
                <option value="admin">Admin</option>
                <option value="editor">Editor</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>
          </div>
        </div>

        {/* Members Grid */}
        {filteredMembers.length === 0 ? (
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-12 text-center">
            <Users className="w-16 h-16 text-slate-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No Members Found</h3>
            <p className="text-slate-400 mb-6">
              {searchQuery || roleFilter !== 'all'
                ? 'Try adjusting your search or filter criteria'
                : 'Start by inviting family members to access your account'}
            </p>
            {!searchQuery && roleFilter === 'all' && (
              <button
                onClick={() => setShowInviteModal(true)}
                className="inline-flex items-center px-6 py-3 bg-[#FFD166] text-slate-900 font-semibold rounded-lg hover:bg-[#FFD166]/90 transition-colors"
              >
                <Plus className="w-5 h-5 mr-2" />
                Invite First Member
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {filteredMembers.map((member) => (
              <div
                key={member.id}
                className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6 hover:bg-white/20 transition-colors"
              >
                {/* Member Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-r from-[#FFD166] to-[#8FAD77] flex items-center justify-center text-slate-900 font-bold text-lg">
                      {member.firstName.charAt(0)}{member.lastName.charAt(0)}
                    </div>
                    <div className="ml-3">
                      <h3 className="font-semibold text-white">
                        {member.firstName} {member.lastName}
                      </h3>
                      <p className="text-slate-400 text-sm">{member.email}</p>
                    </div>
                  </div>

                  {/* Actions Menu */}
                  <div className="relative group">
                    <button className="p-1 rounded hover:bg-white/10 transition-colors">
                      <MoreVertical className="w-4 h-4 text-slate-400" />
                    </button>

                    <div className="absolute right-0 top-8 bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                      <div className="py-2 min-w-[160px]">
                        <Link
                          href={`/family/members/${member.id}`}
                          className="flex items-center px-4 py-2 text-white hover:bg-white/10 transition-colors"
                        >
                          <Edit className="w-4 h-4 mr-3" />
                          Edit Profile
                        </Link>
                        {member.role !== 'admin' && (
                          <button
                            onClick={() => handleDeleteMember(member)}
                            className="flex items-center w-full px-4 py-2 text-red-400 hover:bg-red-500/10 transition-colors"
                          >
                            <Trash2 className="w-4 h-4 mr-3" />
                            Remove Member
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Role Badge */}
                <div className="mb-4">
                  <select
                    value={member.role}
                    onChange={(e) => handleRoleChange(member.id, e.target.value)}
                    disabled={member.role === 'admin'}
                    className={`px-3 py-1 rounded-full text-sm font-medium border-0 focus:ring-2 focus:ring-[#FFD166] ${getRoleColor(member.role)} ${
                      member.role === 'admin' ? 'cursor-not-allowed' : 'cursor-pointer'
                    }`}
                  >
                    <option value="admin">Admin</option>
                    <option value="editor">Editor</option>
                    <option value="viewer">Viewer</option>
                  </select>
                </div>

                {/* Status Indicators */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">MFA Status:</span>
                    <div className="flex items-center">
                      <div className={`w-2 h-2 rounded-full mr-2 ${
                        member.mfaEnabled ? 'bg-[#8FAD77]' : 'bg-red-400'
                      }`}></div>
                      <span className="text-white">
                        {member.mfaEnabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">Email:</span>
                    <div className="flex items-center">
                      <div className={`w-2 h-2 rounded-full mr-2 ${
                        member.emailVerified ? 'bg-[#8FAD77]' : 'bg-[#FFD166]'
                      }`}></div>
                      <span className="text-white">
                        {member.emailVerified ? 'Verified' : 'Pending'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Last Login */}
                <div className="border-t border-white/20 pt-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">Last Login:</span>
                    <span className="text-white">{formatLastLogin(member.lastLoginAt)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm mt-1">
                    <span className="text-slate-400">Joined:</span>
                    <span className="text-white">{formatDate(member.createdAt)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Total Members</p>
                <p className="text-2xl font-bold text-white">{filteredMembers.length}</p>
              </div>
              <Users className="w-8 h-8 text-[#8FAD77]" />
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Admins</p>
                <p className="text-2xl font-bold text-white">
                  {filteredMembers.filter(m => m.role === 'admin').length}
                </p>
              </div>
              <Crown className="w-8 h-8 text-[#FFD166]" />
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">MFA Enabled</p>
                <p className="text-2xl font-bold text-white">
                  {filteredMembers.filter(m => m.mfaEnabled).length}
                </p>
              </div>
              <Shield className="w-8 h-8 text-[#8FAD77]" />
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Verified</p>
                <p className="text-2xl font-bold text-white">
                  {filteredMembers.filter(m => m.emailVerified).length}
                </p>
              </div>
              <UserCheck className="w-8 h-8 text-[#5E7F9B]" />
            </div>
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && selectedMember && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl p-6 max-w-md mx-4">
              <div className="flex items-center mb-4">
                <AlertCircle className="w-6 h-6 text-red-400 mr-3" />
                <h3 className="text-lg font-bold text-white">Remove Family Member</h3>
              </div>

              <p className="text-slate-300 mb-6">
                Are you sure you want to remove <strong>{selectedMember.firstName} {selectedMember.lastName}</strong>
                from your family? This action cannot be undone and they will lose access to all family data.
              </p>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white hover:bg-white/20 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={deleteMemberMutation.isPending}
                  className="px-4 py-2 bg-red-500 text-white font-semibold rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
                >
                  {deleteMemberMutation.isPending ? 'Removing...' : 'Remove Member'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FamilyMembersPage;