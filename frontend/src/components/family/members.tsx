'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users,
  Plus,
  Search,
  Crown,
  Shield,
  Eye,
  Edit,
  Trash2,
  UserCheck,
  MoreVertical,
  Mail,
  Clock
} from 'lucide-react';

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
  lastLoginAt: string | null;
  deletedAt: string | null;
}

interface FamilyMembersProps {
  onInviteMember?: () => void;
  onEditMember?: (member: FamilyMember) => void;
  limit?: number;
  showActions?: boolean;
  showSearch?: boolean;
}

export const FamilyMembers: React.FC<FamilyMembersProps> = ({
  onInviteMember,
  onEditMember,
  limit,
  showActions = true,
  showSearch = true,
}) => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');

  const { data: members, isLoading } = useQuery<FamilyMember[]>({
    queryKey: ['family', 'members'],
    queryFn: async () => {
      const response = await fetch('/api/families/members');
      if (!response.ok) throw new Error('Failed to fetch family members');
      return response.json();
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
    },
  });

  const filteredMembers = React.useMemo(() => {
    let filtered = members?.filter(member => {
      const matchesSearch =
        member.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.email.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesSearch && !member.deletedAt;
    }) || [];

    if (limit) {
      filtered = filtered.slice(0, limit);
    }

    return filtered;
  }, [members, searchQuery, limit]);

  const formatLastLogin = (dateString: string | null) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-slate-700 rounded-full"></div>
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
      {/* Search Bar */}
      {showSearch && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search members..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-[#FFD166] focus:border-transparent"
          />
        </div>
      )}

      {/* Members List */}
      <div className="space-y-3">
        {filteredMembers.map((member) => (
          <div
            key={member.id}
            className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4 hover:bg-white/20 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-[#FFD166] to-[#8FAD77] flex items-center justify-center text-slate-900 font-bold text-sm">
                  {member.firstName.charAt(0)}{member.lastName.charAt(0)}
                </div>

                {/* Member Info */}
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="font-medium text-white text-sm">
                      {member.firstName} {member.lastName}
                    </h3>
                    {getRoleIcon(member.role)}
                  </div>
                  <div className="flex items-center space-x-4 text-xs text-slate-400">
                    <span>{member.email}</span>
                    <span className="flex items-center">
                      <Clock className="w-3 h-3 mr-1" />
                      {formatLastLogin(member.lastLoginAt)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Role and Actions */}
              <div className="flex items-center space-x-2">
                {/* Role Badge */}
                <div className={`px-2 py-1 rounded text-xs font-medium ${getRoleColor(member.role)}`}>
                  {member.role}
                </div>

                {/* Status Indicators */}
                <div className="flex items-center space-x-1">
                  {member.mfaEnabled && (
                    <Shield className="w-3 h-3 text-[#8FAD77]" title="MFA Enabled" />
                  )}
                  {member.emailVerified && (
                    <UserCheck className="w-3 h-3 text-[#5E7F9B]" title="Email Verified" />
                  )}
                </div>

                {/* Actions */}
                {showActions && (
                  <div className="relative group">
                    <button className="p-1 rounded hover:bg-white/10 transition-colors">
                      <MoreVertical className="w-4 h-4 text-slate-400" />
                    </button>

                    <div className="absolute right-0 top-8 bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                      <div className="py-2 min-w-[140px]">
                        <button
                          onClick={() => onEditMember?.(member)}
                          className="flex items-center w-full px-3 py-2 text-white hover:bg-white/10 transition-colors text-sm"
                        >
                          <Edit className="w-3 h-3 mr-2" />
                          Edit Profile
                        </button>
                        {member.role !== 'admin' && (
                          <button
                            onClick={() => deleteMemberMutation.mutate(member.id)}
                            className="flex items-center w-full px-3 py-2 text-red-400 hover:bg-red-500/10 transition-colors text-sm"
                          >
                            <Trash2 className="w-3 h-3 mr-2" />
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Member Button */}
      {showActions && onInviteMember && (
        <button
          onClick={onInviteMember}
          className="w-full flex items-center justify-center px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white hover:bg-white/20 transition-colors group"
        >
          <Plus className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
          Invite Family Member
        </button>
      )}

      {/* Empty State */}
      {filteredMembers.length === 0 && !isLoading && (
        <div className="text-center py-8">
          <Users className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-white mb-2">No Members Found</h3>
          <p className="text-slate-400 text-sm">
            {searchQuery
              ? 'Try adjusting your search criteria'
              : 'Start by inviting family members'}
          </p>
        </div>
      )}
    </div>
  );
};

export default FamilyMembers;