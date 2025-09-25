'use client';

import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  User,
  Mail,
  Crown,
  Shield,
  Eye,
  Edit2,
  Save,
  X,
  Calendar,
  Clock,
  MapPin,
  Smartphone,
  CheckCircle,
  AlertCircle,
  Settings
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
  updatedAt: string;
  lastLoginAt: string | null;
}

interface MemberProfileProps {
  member: FamilyMember;
  isEditable?: boolean;
  onClose?: () => void;
  onSave?: (member: FamilyMember) => void;
  showActions?: boolean;
}

export const MemberProfile: React.FC<MemberProfileProps> = ({
  member,
  isEditable = false,
  onClose,
  onSave,
  showActions = true,
}) => {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [editedMember, setEditedMember] = useState<Partial<FamilyMember>>(member);

  const updateMemberMutation = useMutation({
    mutationFn: async (updates: Partial<FamilyMember>) => {
      const response = await fetch(`/api/families/members/${member.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!response.ok) throw new Error('Failed to update member');
      return response.json();
    },
    onSuccess: (updatedMember) => {
      queryClient.invalidateQueries({ queryKey: ['family', 'members'] });
      setIsEditing(false);
      onSave?.(updatedMember);
    },
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const formatLastLogin = (dateString: string | null) => {
    if (!dateString) return 'Never logged in';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffHours < 1) return 'Active now';
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays < 7) return `${diffDays} days ago`;
    return formatDate(dateString);
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <Crown className="w-5 h-5 text-[#FFD166]" />;
      case 'editor': return <Edit2 className="w-5 h-5 text-[#8FAD77]" />;
      case 'viewer': return <Eye className="w-5 h-5 text-[#5E7F9B]" />;
      default: return <User className="w-5 h-5 text-slate-400" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'text-[#FFD166] bg-[#FFD166]/10 border-[#FFD166]/20';
      case 'editor': return 'text-[#8FAD77] bg-[#8FAD77]/10 border-[#8FAD77]/20';
      case 'viewer': return 'text-[#5E7F9B] bg-[#5E7F9B]/10 border-[#5E7F9B]/20';
      default: return 'text-slate-400 bg-slate-400/10 border-slate-400/20';
    }
  };

  const handleSave = () => {
    updateMemberMutation.mutate(editedMember);
  };

  const handleCancel = () => {
    setEditedMember(member);
    setIsEditing(false);
  };

  return (
    <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center space-x-4">
          {/* Avatar */}
          <div className="w-16 h-16 rounded-full bg-gradient-to-r from-[#FFD166] to-[#8FAD77] flex items-center justify-center text-slate-900 font-bold text-xl">
            {member.firstName.charAt(0)}{member.lastName.charAt(0)}
          </div>

          <div>
            <div className="flex items-center space-x-3 mb-1">
              {isEditing ? (
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={editedMember.firstName || ''}
                    onChange={(e) => setEditedMember(prev => ({ ...prev, firstName: e.target.value }))}
                    className="px-3 py-1 bg-white/10 border border-white/20 rounded text-white text-lg font-semibold focus:ring-2 focus:ring-[#FFD166] focus:border-transparent"
                    placeholder="First name"
                  />
                  <input
                    type="text"
                    value={editedMember.lastName || ''}
                    onChange={(e) => setEditedMember(prev => ({ ...prev, lastName: e.target.value }))}
                    className="px-3 py-1 bg-white/10 border border-white/20 rounded text-white text-lg font-semibold focus:ring-2 focus:ring-[#FFD166] focus:border-transparent"
                    placeholder="Last name"
                  />
                </div>
              ) : (
                <h2 className="text-xl font-bold text-white">
                  {member.firstName} {member.lastName}
                </h2>
              )}
              {getRoleIcon(member.role)}
            </div>

            <div className="flex items-center space-x-2">
              <Mail className="w-4 h-4 text-slate-400" />
              {isEditing ? (
                <input
                  type="email"
                  value={editedMember.email || ''}
                  onChange={(e) => setEditedMember(prev => ({ ...prev, email: e.target.value }))}
                  className="px-3 py-1 bg-white/10 border border-white/20 rounded text-slate-400 focus:ring-2 focus:ring-[#FFD166] focus:border-transparent"
                  placeholder="Email address"
                />
              ) : (
                <span className="text-slate-400">{member.email}</span>
              )}
              {member.emailVerified && (
                <CheckCircle className="w-4 h-4 text-[#8FAD77]" title="Email Verified" />
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        {showActions && (
          <div className="flex items-center space-x-2">
            {isEditing ? (
              <>
                <button
                  onClick={handleCancel}
                  className="p-2 bg-white/10 border border-white/20 rounded-lg text-slate-400 hover:bg-white/20 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
                <button
                  onClick={handleSave}
                  disabled={updateMemberMutation.isPending}
                  className="p-2 bg-[#FFD166] text-slate-900 rounded-lg hover:bg-[#FFD166]/90 transition-colors disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                </button>
              </>
            ) : (
              <>
                {isEditable && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="p-2 bg-white/10 border border-white/20 rounded-lg text-white hover:bg-white/20 transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                )}
                {onClose && (
                  <button
                    onClick={onClose}
                    className="p-2 bg-white/10 border border-white/20 rounded-lg text-slate-400 hover:bg-white/20 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Role and Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Role</label>
          {isEditing ? (
            <select
              value={editedMember.role || ''}
              onChange={(e) => setEditedMember(prev => ({ ...prev, role: e.target.value as any }))}
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:ring-2 focus:ring-[#FFD166] focus:border-transparent"
            >
              <option value="admin">Admin</option>
              <option value="editor">Editor</option>
              <option value="viewer">Viewer</option>
            </select>
          ) : (
            <div className={`inline-flex items-center px-3 py-2 rounded-lg border ${getRoleColor(member.role)}`}>
              {getRoleIcon(member.role)}
              <span className="ml-2 font-medium capitalize">{member.role}</span>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Security Status</label>
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              {member.mfaEnabled ? (
                <>
                  <Shield className="w-4 h-4 text-[#8FAD77] mr-1" />
                  <span className="text-[#8FAD77] text-sm">MFA Enabled</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4 text-[#FFD166] mr-1" />
                  <span className="text-[#FFD166] text-sm">MFA Disabled</span>
                </>
              )}
            </div>
            <div className="flex items-center">
              {member.emailVerified ? (
                <>
                  <CheckCircle className="w-4 h-4 text-[#8FAD77] mr-1" />
                  <span className="text-[#8FAD77] text-sm">Verified</span>
                </>
              ) : (
                <>
                  <Clock className="w-4 h-4 text-[#FFD166] mr-1" />
                  <span className="text-[#FFD166] text-sm">Pending</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Permissions */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-slate-300 mb-3">Permissions</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Object.entries(member.permissions).map(([key, value]) => {
            const permissionName = key
              .replace(/([A-Z])/g, ' $1')
              .replace(/^./, str => str.toUpperCase())
              .replace('can ', 'Can ');

            return (
              <div key={key} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <span className="text-sm text-slate-300">{permissionName}</span>
                {isEditing ? (
                  <input
                    type="checkbox"
                    checked={editedMember.permissions?.[key as keyof typeof member.permissions] || false}
                    onChange={(e) => setEditedMember(prev => ({
                      ...prev,
                      permissions: {
                        ...prev.permissions,
                        [key]: e.target.checked
                      }
                    }))}
                    className="w-4 h-4 text-[#FFD166] bg-white/10 border-white/20 rounded focus:ring-[#FFD166]"
                  />
                ) : (
                  <div className={`w-2 h-2 rounded-full ${value ? 'bg-[#8FAD77]' : 'bg-slate-500'}`}></div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Account Information */}
      <div className="border-t border-white/20 pt-6">
        <h3 className="text-lg font-semibold text-white mb-4">Account Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="flex items-center">
            <Calendar className="w-4 h-4 text-slate-400 mr-3" />
            <div>
              <p className="text-slate-400">Joined</p>
              <p className="text-white">{formatDate(member.createdAt)}</p>
            </div>
          </div>

          <div className="flex items-center">
            <Clock className="w-4 h-4 text-slate-400 mr-3" />
            <div>
              <p className="text-slate-400">Last Login</p>
              <p className="text-white">{formatLastLogin(member.lastLoginAt)}</p>
            </div>
          </div>

          <div className="flex items-center">
            <Settings className="w-4 h-4 text-slate-400 mr-3" />
            <div>
              <p className="text-slate-400">Last Updated</p>
              <p className="text-white">{formatDate(member.updatedAt)}</p>
            </div>
          </div>

          <div className="flex items-center">
            <User className="w-4 h-4 text-slate-400 mr-3" />
            <div>
              <p className="text-slate-400">Member ID</p>
              <p className="text-white font-mono">{member.id.slice(0, 8)}...</p>
            </div>
          </div>
        </div>
      </div>

      {/* Update Status */}
      {updateMemberMutation.isPending && (
        <div className="mt-4 p-3 bg-[#FFD166]/10 border border-[#FFD166]/20 rounded-lg">
          <div className="flex items-center">
            <div className="animate-spin w-4 h-4 border-2 border-[#FFD166] border-t-transparent rounded-full mr-3"></div>
            <span className="text-[#FFD166]">Updating member profile...</span>
          </div>
        </div>
      )}

      {updateMemberMutation.error && (
        <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
          <div className="flex items-center">
            <AlertCircle className="w-4 h-4 text-red-400 mr-3" />
            <span className="text-red-400">Failed to update member profile</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default MemberProfile;