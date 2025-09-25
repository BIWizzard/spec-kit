'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Settings,
  Users,
  Activity,
  Mail,
  Shield,
  Globe,
  Calendar,
  DollarSign,
  Save,
  AlertCircle
} from 'lucide-react';
import Link from 'next/link';

interface FamilySettings {
  id: string;
  name: string;
  settings: {
    timezone: string;
    currency: string;
    fiscalYearStart: number;
  };
  subscriptionStatus: 'trial' | 'active' | 'suspended' | 'cancelled';
  dataRetentionConsent: boolean;
  createdAt: string;
  updatedAt: string;
}

interface FamilyStats {
  totalMembers: number;
  pendingInvitations: number;
  connectedAccounts: number;
  recentActivityCount: number;
}

const FamilySettingsPage = () => {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [editedSettings, setEditedSettings] = useState<Partial<FamilySettings>>({});

  const { data: familyData, isLoading } = useQuery<FamilySettings>({
    queryKey: ['family', 'settings'],
    queryFn: async () => {
      const response = await fetch('/api/families');
      if (!response.ok) throw new Error('Failed to fetch family settings');
      return response.json();
    },
  });

  const { data: familyStats } = useQuery<FamilyStats>({
    queryKey: ['family', 'stats'],
    queryFn: async () => {
      const response = await fetch('/api/families/stats');
      if (!response.ok) throw new Error('Failed to fetch family stats');
      return response.json();
    },
  });

  const updateFamilyMutation = useMutation({
    mutationFn: async (updates: Partial<FamilySettings>) => {
      const response = await fetch('/api/families', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!response.ok) throw new Error('Failed to update family settings');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['family'] });
      setIsEditing(false);
      setEditedSettings({});
    },
  });

  const handleEdit = () => {
    setIsEditing(true);
    setEditedSettings(familyData || {});
  };

  const handleSave = () => {
    if (editedSettings) {
      updateFamilyMutation.mutate(editedSettings);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedSettings({});
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getSubscriptionStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-[#8FAD77]';
      case 'trial': return 'text-[#FFD166]';
      case 'suspended': return 'text-yellow-500';
      case 'cancelled': return 'text-red-500';
      default: return 'text-slate-400';
    }
  };

  const getSubscriptionStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'Active';
      case 'trial': return 'Trial';
      case 'suspended': return 'Suspended';
      case 'cancelled': return 'Cancelled';
      default: return 'Unknown';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-slate-700 rounded w-64"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-slate-700 rounded-xl"></div>
              ))}
            </div>
            <div className="h-96 bg-slate-700 rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!familyData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Family Not Found</h2>
            <p className="text-slate-400 mb-6">
              Unable to load family settings. Please try again.
            </p>
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
            <h1 className="text-3xl font-bold text-white mb-2">Family Settings</h1>
            <p className="text-slate-400">
              Manage your family account settings and preferences
            </p>
          </div>

          <div className="flex items-center gap-4 mt-4 sm:mt-0">
            {isEditing ? (
              <>
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white hover:bg-white/20 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={updateFamilyMutation.isPending}
                  className="inline-flex items-center px-4 py-2 bg-[#FFD166] text-slate-900 font-semibold rounded-lg hover:bg-[#FFD166]/90 transition-colors disabled:opacity-50"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {updateFamilyMutation.isPending ? 'Saving...' : 'Save Changes'}
                </button>
              </>
            ) : (
              <button
                onClick={handleEdit}
                className="inline-flex items-center px-4 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white hover:bg-white/20 transition-colors"
              >
                <Settings className="w-4 h-4 mr-2" />
                Edit Settings
              </button>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Link
            href="/family/members"
            className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6 hover:bg-white/20 transition-colors group"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Family Members</p>
                <p className="text-2xl font-bold text-white">
                  {familyStats?.totalMembers || 0}
                </p>
              </div>
              <Users className="w-8 h-8 text-[#8FAD77] group-hover:scale-110 transition-transform" />
            </div>
          </Link>

          <Link
            href="/family/invitations"
            className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6 hover:bg-white/20 transition-colors group"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Pending Invites</p>
                <p className="text-2xl font-bold text-white">
                  {familyStats?.pendingInvitations || 0}
                </p>
              </div>
              <Mail className="w-8 h-8 text-[#FFD166] group-hover:scale-110 transition-transform" />
            </div>
          </Link>

          <Link
            href="/bank-accounts"
            className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6 hover:bg-white/20 transition-colors group"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Bank Accounts</p>
                <p className="text-2xl font-bold text-white">
                  {familyStats?.connectedAccounts || 0}
                </p>
              </div>
              <Shield className="w-8 h-8 text-[#5E7F9B] group-hover:scale-110 transition-transform" />
            </div>
          </Link>

          <Link
            href="/family/activity"
            className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6 hover:bg-white/20 transition-colors group"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Recent Activity</p>
                <p className="text-2xl font-bold text-white">
                  {familyStats?.recentActivityCount || 0}
                </p>
              </div>
              <Activity className="w-8 h-8 text-slate-400 group-hover:scale-110 transition-transform" />
            </div>
          </Link>
        </div>

        {/* Main Settings Panel */}
        <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6 mb-8">
          <h2 className="text-xl font-bold text-white mb-6">Family Information</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Family Name */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Family Name
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={editedSettings.name || ''}
                  onChange={(e) => setEditedSettings(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-[#FFD166] focus:border-transparent"
                  placeholder="Enter family name"
                />
              ) : (
                <p className="text-white text-lg">{familyData.name}</p>
              )}
            </div>

            {/* Subscription Status */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Subscription Status
              </label>
              <div className="flex items-center">
                <div className={`text-lg font-semibold ${getSubscriptionStatusColor(familyData.subscriptionStatus)}`}>
                  {getSubscriptionStatusLabel(familyData.subscriptionStatus)}
                </div>
              </div>
            </div>

            {/* Timezone */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                <Globe className="w-4 h-4 inline mr-2" />
                Timezone
              </label>
              {isEditing ? (
                <select
                  value={editedSettings.settings?.timezone || ''}
                  onChange={(e) => setEditedSettings(prev => ({
                    ...prev,
                    settings: { ...prev.settings, timezone: e.target.value }
                  }))}
                  className="w-full px-4 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white focus:ring-2 focus:ring-[#FFD166] focus:border-transparent"
                >
                  <option value="UTC">UTC</option>
                  <option value="America/New_York">Eastern Time</option>
                  <option value="America/Chicago">Central Time</option>
                  <option value="America/Denver">Mountain Time</option>
                  <option value="America/Los_Angeles">Pacific Time</option>
                </select>
              ) : (
                <p className="text-white">{familyData.settings.timezone}</p>
              )}
            </div>

            {/* Currency */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                <DollarSign className="w-4 h-4 inline mr-2" />
                Currency
              </label>
              {isEditing ? (
                <select
                  value={editedSettings.settings?.currency || ''}
                  onChange={(e) => setEditedSettings(prev => ({
                    ...prev,
                    settings: { ...prev.settings, currency: e.target.value }
                  }))}
                  className="w-full px-4 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white focus:ring-2 focus:ring-[#FFD166] focus:border-transparent"
                >
                  <option value="USD">US Dollar (USD)</option>
                  <option value="CAD">Canadian Dollar (CAD)</option>
                  <option value="EUR">Euro (EUR)</option>
                  <option value="GBP">British Pound (GBP)</option>
                </select>
              ) : (
                <p className="text-white">{familyData.settings.currency}</p>
              )}
            </div>

            {/* Fiscal Year Start */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                <Calendar className="w-4 h-4 inline mr-2" />
                Fiscal Year Starts
              </label>
              {isEditing ? (
                <select
                  value={editedSettings.settings?.fiscalYearStart || ''}
                  onChange={(e) => setEditedSettings(prev => ({
                    ...prev,
                    settings: { ...prev.settings, fiscalYearStart: parseInt(e.target.value) }
                  }))}
                  className="w-full px-4 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white focus:ring-2 focus:ring-[#FFD166] focus:border-transparent"
                >
                  {Array.from({ length: 12 }, (_, i) => {
                    const month = i + 1;
                    const monthName = new Date(0, i).toLocaleString('en-US', { month: 'long' });
                    return (
                      <option key={month} value={month}>
                        {monthName}
                      </option>
                    );
                  })}
                </select>
              ) : (
                <p className="text-white">
                  {new Date(0, familyData.settings.fiscalYearStart - 1).toLocaleString('en-US', { month: 'long' })}
                </p>
              )}
            </div>

            {/* Data Retention Consent */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Data Retention Consent
              </label>
              {isEditing ? (
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={editedSettings.dataRetentionConsent || false}
                    onChange={(e) => setEditedSettings(prev => ({
                      ...prev,
                      dataRetentionConsent: e.target.checked
                    }))}
                    className="mr-2 w-4 h-4 text-[#FFD166] bg-white/10 border-white/20 rounded focus:ring-[#FFD166]"
                  />
                  <span className="text-white">Allow data retention for analytics</span>
                </label>
              ) : (
                <p className="text-white">
                  {familyData.dataRetentionConsent ? 'Enabled' : 'Disabled'}
                </p>
              )}
            </div>
          </div>

          {/* Account Information */}
          <div className="mt-8 pt-6 border-t border-white/20">
            <h3 className="text-lg font-semibold text-white mb-4">Account Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Created
                </label>
                <p className="text-white">{formatDate(familyData.createdAt)}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Last Updated
                </label>
                <p className="text-white">{formatDate(familyData.updatedAt)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link
            href="/family/members"
            className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6 hover:bg-white/20 transition-colors"
          >
            <Users className="w-8 h-8 text-[#8FAD77] mb-4" />
            <h3 className="font-semibold text-white mb-2">Manage Members</h3>
            <p className="text-slate-400 text-sm">
              Add, remove, and manage family member permissions
            </p>
          </Link>

          <Link
            href="/family/invitations"
            className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6 hover:bg-white/20 transition-colors"
          >
            <Mail className="w-8 h-8 text-[#FFD166] mb-4" />
            <h3 className="font-semibold text-white mb-2">Invitations</h3>
            <p className="text-slate-400 text-sm">
              View and manage pending family invitations
            </p>
          </Link>

          <Link
            href="/family/activity"
            className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6 hover:bg-white/20 transition-colors"
          >
            <Activity className="w-8 h-8 text-[#5E7F9B] mb-4" />
            <h3 className="font-semibold text-white mb-2">Activity Log</h3>
            <p className="text-slate-400 text-sm">
              Review recent family account activity
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default FamilySettingsPage;