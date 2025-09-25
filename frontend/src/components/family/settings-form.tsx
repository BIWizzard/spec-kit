'use client';

import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Settings,
  Save,
  X,
  Globe,
  DollarSign,
  Calendar,
  Shield,
  AlertCircle,
  CheckCircle,
  RefreshCw
} from 'lucide-react';

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

interface SettingsFormProps {
  initialSettings?: FamilySettings;
  onSave?: (settings: FamilySettings) => void;
  onCancel?: () => void;
  isEditing?: boolean;
  showActions?: boolean;
}

export const SettingsForm: React.FC<SettingsFormProps> = ({
  initialSettings,
  onSave,
  onCancel,
  isEditing = false,
  showActions = true,
}) => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<Partial<FamilySettings>>({
    name: '',
    settings: {
      timezone: 'UTC',
      currency: 'USD',
      fiscalYearStart: 1,
    },
    dataRetentionConsent: false,
  });
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize form data
  useEffect(() => {
    if (initialSettings) {
      setFormData(initialSettings);
      setHasChanges(false);
    }
  }, [initialSettings]);

  const updateFamilyMutation = useMutation({
    mutationFn: async (updates: Partial<FamilySettings>) => {
      const response = await fetch('/api/families', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update family settings');
      }
      return response.json();
    },
    onSuccess: (updatedSettings) => {
      queryClient.invalidateQueries({ queryKey: ['family'] });
      setHasChanges(false);
      onSave?.(updatedSettings);
    },
  });

  const handleInputChange = (field: string, value: any, nested?: string) => {
    setFormData(prev => {
      let newData;
      if (nested) {
        newData = {
          ...prev,
          [nested]: {
            ...prev[nested as keyof typeof prev] as any,
            [field]: value,
          },
        };
      } else {
        newData = {
          ...prev,
          [field]: value,
        };
      }

      // Check if there are changes
      if (initialSettings) {
        const hasChangesNow = JSON.stringify(newData) !== JSON.stringify(initialSettings);
        setHasChanges(hasChangesNow);
      }

      return newData;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateFamilyMutation.mutate(formData);
  };

  const handleReset = () => {
    if (initialSettings) {
      setFormData(initialSettings);
      setHasChanges(false);
    }
  };

  const timezones = [
    { value: 'UTC', label: 'UTC' },
    { value: 'America/New_York', label: 'Eastern Time (ET)' },
    { value: 'America/Chicago', label: 'Central Time (CT)' },
    { value: 'America/Denver', label: 'Mountain Time (MT)' },
    { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
    { value: 'America/Phoenix', label: 'Arizona Time (MST)' },
    { value: 'America/Anchorage', label: 'Alaska Time (AKST)' },
    { value: 'Pacific/Honolulu', label: 'Hawaii Time (HST)' },
  ];

  const currencies = [
    { value: 'USD', label: 'US Dollar (USD)', symbol: '$' },
    { value: 'CAD', label: 'Canadian Dollar (CAD)', symbol: 'C$' },
    { value: 'EUR', label: 'Euro (EUR)', symbol: '€' },
    { value: 'GBP', label: 'British Pound (GBP)', symbol: '£' },
    { value: 'JPY', label: 'Japanese Yen (JPY)', symbol: '¥' },
    { value: 'AUD', label: 'Australian Dollar (AUD)', symbol: 'A$' },
  ];

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Family Name */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Family Name
        </label>
        <input
          type="text"
          value={formData.name || ''}
          onChange={(e) => handleInputChange('name', e.target.value)}
          disabled={!isEditing}
          className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-[#FFD166] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
          placeholder="Enter your family name"
        />
      </div>

      {/* Regional Settings */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white flex items-center">
          <Globe className="w-5 h-5 mr-2 text-[#5E7F9B]" />
          Regional Settings
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Timezone */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Timezone
            </label>
            <select
              value={formData.settings?.timezone || ''}
              onChange={(e) => handleInputChange('timezone', e.target.value, 'settings')}
              disabled={!isEditing}
              className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white focus:ring-2 focus:ring-[#FFD166] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {timezones.map(tz => (
                <option key={tz.value} value={tz.value}>
                  {tz.label}
                </option>
              ))}
            </select>
          </div>

          {/* Currency */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              <DollarSign className="w-4 h-4 inline mr-1" />
              Currency
            </label>
            <select
              value={formData.settings?.currency || ''}
              onChange={(e) => handleInputChange('currency', e.target.value, 'settings')}
              disabled={!isEditing}
              className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white focus:ring-2 focus:ring-[#FFD166] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {currencies.map(curr => (
                <option key={curr.value} value={curr.value}>
                  {curr.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Fiscal Year */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            <Calendar className="w-4 h-4 inline mr-1" />
            Fiscal Year Start
          </label>
          <select
            value={formData.settings?.fiscalYearStart || 1}
            onChange={(e) => handleInputChange('fiscalYearStart', parseInt(e.target.value), 'settings')}
            disabled={!isEditing}
            className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white focus:ring-2 focus:ring-[#FFD166] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {months.map((month, index) => (
              <option key={index + 1} value={index + 1}>
                {month}
              </option>
            ))}
          </select>
          <p className="text-xs text-slate-400 mt-1">
            Choose when your fiscal year begins for budgeting and reporting
          </p>
        </div>
      </div>

      {/* Privacy Settings */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white flex items-center">
          <Shield className="w-5 h-5 mr-2 text-[#8FAD77]" />
          Privacy & Data
        </h3>

        <div className="p-4 bg-white/5 rounded-lg">
          <label className="flex items-start">
            <input
              type="checkbox"
              checked={formData.dataRetentionConsent || false}
              onChange={(e) => handleInputChange('dataRetentionConsent', e.target.checked)}
              disabled={!isEditing}
              className="w-4 h-4 text-[#FFD166] bg-white/10 border-white/20 rounded focus:ring-[#FFD166] mt-1 mr-3 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <div>
              <span className="text-white font-medium">Data Retention Consent</span>
              <p className="text-sm text-slate-400 mt-1">
                Allow us to retain your financial data for analytics and insights.
                You can revoke this consent at any time. Data is encrypted and never shared with third parties.
              </p>
            </div>
          </label>
        </div>
      </div>

      {/* Subscription Status */}
      {initialSettings?.subscriptionStatus && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Account Status</h3>
          <div className="p-4 bg-white/5 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-slate-300">Subscription Status</span>
                <div className={`inline-block ml-3 px-3 py-1 rounded-full text-sm font-medium ${
                  initialSettings.subscriptionStatus === 'active' ? 'text-[#8FAD77] bg-[#8FAD77]/10' :
                  initialSettings.subscriptionStatus === 'trial' ? 'text-[#FFD166] bg-[#FFD166]/10' :
                  'text-red-400 bg-red-400/10'
                }`}>
                  {initialSettings.subscriptionStatus.toUpperCase()}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {updateFamilyMutation.error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
          <div className="flex items-center">
            <AlertCircle className="w-4 h-4 text-red-400 mr-3" />
            <span className="text-red-400 text-sm">
              {updateFamilyMutation.error.message}
            </span>
          </div>
        </div>
      )}

      {/* Success Message */}
      {updateFamilyMutation.isSuccess && !hasChanges && (
        <div className="p-3 bg-[#8FAD77]/10 border border-[#8FAD77]/20 rounded-lg">
          <div className="flex items-center">
            <CheckCircle className="w-4 h-4 text-[#8FAD77] mr-3" />
            <span className="text-[#8FAD77] text-sm">
              Settings updated successfully!
            </span>
          </div>
        </div>
      )}

      {/* Form Actions */}
      {showActions && isEditing && (
        <div className="flex justify-end gap-3 pt-4 border-t border-white/20">
          <button
            type="button"
            onClick={handleReset}
            disabled={!hasChanges}
            className="inline-flex items-center px-4 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white hover:bg-white/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Reset
          </button>

          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white hover:bg-white/20 transition-colors"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={updateFamilyMutation.isPending || !hasChanges}
            className="inline-flex items-center px-4 py-2 bg-[#FFD166] text-slate-900 font-semibold rounded-lg hover:bg-[#FFD166]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {updateFamilyMutation.isPending ? (
              <>
                <div className="animate-spin w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </>
            )}
          </button>
        </div>
      )}

      {/* Change Indicator */}
      {hasChanges && (
        <div className="text-center">
          <span className="text-[#FFD166] text-sm font-medium">
            You have unsaved changes
          </span>
        </div>
      )}
    </form>
  );
};

export default SettingsForm;