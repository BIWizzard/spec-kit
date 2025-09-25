'use client';

import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  X,
  Mail,
  Send,
  User,
  Shield,
  Eye,
  Edit2,
  Crown,
  AlertCircle,
  CheckCircle,
  Copy,
  ExternalLink
} from 'lucide-react';

interface InviteMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (invitation: any) => void;
}

interface InviteFormData {
  email: string;
  role: 'editor' | 'viewer' | 'admin';
  message?: string;
}

export const InviteMemberModal: React.FC<InviteMemberModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<InviteFormData>({
    email: '',
    role: 'editor',
    message: '',
  });
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [step, setStep] = useState<'form' | 'success'>('form');

  const createInvitationMutation = useMutation({
    mutationFn: async (data: InviteFormData) => {
      const response = await fetch('/api/families/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create invitation');
      }
      return response.json();
    },
    onSuccess: (invitation) => {
      queryClient.invalidateQueries({ queryKey: ['family', 'invitations'] });
      queryClient.invalidateQueries({ queryKey: ['family', 'members'] });
      setInviteLink(invitation.inviteLink);
      setStep('success');
      onSuccess?.(invitation);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createInvitationMutation.mutate(formData);
  };

  const handleClose = () => {
    setFormData({ email: '', role: 'editor', message: '' });
    setInviteLink(null);
    setStep('form');
    createInvitationMutation.reset();
    onClose();
  };

  const copyInviteLink = async () => {
    if (inviteLink) {
      await navigator.clipboard.writeText(inviteLink);
      // Could add toast notification here
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <Crown className="w-4 h-4 text-[#FFD166]" />;
      case 'editor': return <Edit2 className="w-4 h-4 text-[#8FAD77]" />;
      case 'viewer': return <Eye className="w-4 h-4 text-[#5E7F9B]" />;
      default: return <User className="w-4 h-4 text-slate-400" />;
    }
  };

  const getRoleDescription = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Full access to all family data and settings. Can manage other members.';
      case 'editor':
        return 'Can view and edit financial data, but cannot manage family settings.';
      case 'viewer':
        return 'Read-only access to financial data. Cannot make changes.';
      default:
        return '';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {step === 'form' ? (
          <>
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/20">
              <div className="flex items-center">
                <Mail className="w-5 h-5 text-[#FFD166] mr-3" />
                <h2 className="text-lg font-bold text-white">Invite Family Member</h2>
              </div>
              <button
                onClick={handleClose}
                className="p-1 rounded hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Email Input */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Email Address *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full pl-10 pr-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-[#FFD166] focus:border-transparent"
                    placeholder="Enter email address"
                  />
                </div>
              </div>

              {/* Role Selection */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-3">
                  Role *
                </label>
                <div className="space-y-3">
                  {(['editor', 'viewer', 'admin'] as const).map((role) => (
                    <label
                      key={role}
                      className={`flex items-start p-3 border rounded-lg cursor-pointer transition-colors ${
                        formData.role === role
                          ? 'border-[#FFD166] bg-[#FFD166]/10'
                          : 'border-white/20 hover:border-white/40 hover:bg-white/5'
                      }`}
                    >
                      <input
                        type="radio"
                        name="role"
                        value={role}
                        checked={formData.role === role}
                        onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value as any }))}
                        className="w-4 h-4 text-[#FFD166] bg-white/10 border-white/20 mt-1 mr-3 focus:ring-[#FFD166]"
                      />
                      <div className="flex-1">
                        <div className="flex items-center mb-1">
                          {getRoleIcon(role)}
                          <span className="ml-2 font-medium text-white capitalize">{role}</span>
                        </div>
                        <p className="text-sm text-slate-400">
                          {getRoleDescription(role)}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Optional Message */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Personal Message (Optional)
                </label>
                <textarea
                  value={formData.message}
                  onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                  rows={3}
                  className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-[#FFD166] focus:border-transparent resize-none"
                  placeholder="Add a personal message to the invitation..."
                />
              </div>

              {/* Error Display */}
              {createInvitationMutation.error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <div className="flex items-center">
                    <AlertCircle className="w-4 h-4 text-red-400 mr-3 flex-shrink-0" />
                    <span className="text-red-400 text-sm">
                      {createInvitationMutation.error.message}
                    </span>
                  </div>
                </div>
              )}

              {/* Form Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-white/20">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white hover:bg-white/20 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createInvitationMutation.isPending || !formData.email.trim()}
                  className="inline-flex items-center px-4 py-2 bg-[#FFD166] text-slate-900 font-semibold rounded-lg hover:bg-[#FFD166]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {createInvitationMutation.isPending ? (
                    <>
                      <div className="animate-spin w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full mr-2"></div>
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Send Invitation
                    </>
                  )}
                </button>
              </div>
            </form>
          </>
        ) : (
          <>
            {/* Success Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/20">
              <div className="flex items-center">
                <CheckCircle className="w-5 h-5 text-[#8FAD77] mr-3" />
                <h2 className="text-lg font-bold text-white">Invitation Sent!</h2>
              </div>
              <button
                onClick={handleClose}
                className="p-1 rounded hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {/* Success Content */}
            <div className="p-6 space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-[#8FAD77]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-[#8FAD77]" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  Invitation sent to {formData.email}
                </h3>
                <p className="text-slate-400 text-sm">
                  They'll receive an email with instructions to join your family account.
                </p>
              </div>

              {/* Invitation Details */}
              <div className="bg-white/5 rounded-lg p-4">
                <h4 className="font-medium text-white mb-3">Invitation Details</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Email:</span>
                    <span className="text-white">{formData.email}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Role:</span>
                    <div className="flex items-center">
                      {getRoleIcon(formData.role)}
                      <span className="text-white ml-1 capitalize">{formData.role}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Expires:</span>
                    <span className="text-white">7 days</span>
                  </div>
                </div>
              </div>

              {/* Invite Link */}
              {inviteLink && (
                <div className="bg-white/5 rounded-lg p-4">
                  <h4 className="font-medium text-white mb-3">Direct Invite Link</h4>
                  <p className="text-slate-400 text-sm mb-3">
                    You can also share this direct link with them:
                  </p>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={inviteLink}
                      readOnly
                      className="flex-1 px-3 py-2 bg-white/10 border border-white/20 rounded text-white text-sm font-mono"
                    />
                    <button
                      onClick={copyInviteLink}
                      className="p-2 bg-white/10 border border-white/20 rounded hover:bg-white/20 transition-colors"
                      title="Copy link"
                    >
                      <Copy className="w-4 h-4 text-slate-400" />
                    </button>
                    <a
                      href={inviteLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 bg-white/10 border border-white/20 rounded hover:bg-white/20 transition-colors"
                      title="Open link"
                    >
                      <ExternalLink className="w-4 h-4 text-slate-400" />
                    </a>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-white/20">
                <button
                  onClick={handleClose}
                  className="px-6 py-2 bg-[#FFD166] text-slate-900 font-semibold rounded-lg hover:bg-[#FFD166]/90 transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default InviteMemberModal;