"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/hooks/use-auth';
import { useRequireAuth } from '@/lib/hooks/use-auth';
import { SystemRole } from '@/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/shared/ui/Card';
import { Button } from '@/components/shared/ui/Button';
import { Input } from '@/components/shared/ui/Input';
import { companySettingsApi } from '@/lib/api/payroll-configuration';
import { CompanySettings } from '@/lib/api/payroll-configuration/types';
import { Settings, Calendar, Globe, DollarSign, Edit2, Check, X, Shield } from 'lucide-react';

export default function CompanySettingsPage() {
  const { user } = useAuth();
  useRequireAuth(SystemRole.SYSTEM_ADMIN);

  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    payDate: '',
    timeZone: 'Africa/Cairo',
    currency: 'EGP',
  });

  useEffect(() => {
    loadSettings();
  }, []);

  // Auto-dismiss success message after 5 seconds
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        setSuccess(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await companySettingsApi.get();
      setSettings(data);
      
      // Format date for input (YYYY-MM-DD)
      const payDate = data.payDate ? new Date(data.payDate).toISOString().split('T')[0] : '';
      setFormData({
        payDate,
        timeZone: data.timeZone || 'Africa/Cairo',
        currency: data.currency || 'EGP',
      });
    } catch (err: any) {
      if (err.message?.includes('404') || err.message?.includes('not found')) {
        // Settings don't exist yet, allow creation
        setSettings(null);
      } else {
        setError(err.message || 'Failed to load company settings');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Validation
    if (!formData.payDate) {
      setError('Pay date is required');
      return;
    }

    if (formData.currency !== 'EGP') {
      setError('Currency must be EGP');
      return;
    }

    try {
      setIsSaving(true);
      
      if (settings) {
        // Update existing
        await companySettingsApi.update(formData);
        setSuccess('Company settings updated successfully');
      } else {
        // Create new
        await companySettingsApi.create(formData);
        setSuccess('Company settings created successfully');
      }

      setIsEditing(false);
      await loadSettings();
    } catch (err: any) {
      setError(err.message || 'Failed to save company settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (settings) {
      const payDate = settings.payDate ? new Date(settings.payDate).toISOString().split('T')[0] : '';
      setFormData({
        payDate,
        timeZone: settings.timeZone || 'Africa/Cairo',
        currency: settings.currency || 'EGP',
      });
    }
    setIsEditing(false);
    setError(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
          <p className="text-indigo-200 text-sm">Loading company settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="relative container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header Section */}
        <div className="mb-10 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 mb-4 bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-600 rounded-2xl shadow-2xl shadow-indigo-500/50">
            <Settings className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold mb-3 bg-gradient-to-r from-indigo-200 via-purple-200 to-pink-200 bg-clip-text text-transparent">
            Company Settings
          </h1>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/20 border border-indigo-400/30 backdrop-blur-sm">
            <Shield className="w-4 h-4 text-indigo-300" />
            <p className="text-sm font-medium text-indigo-200">
              System Admin Only
            </p>
          </div>
          <p className="text-gray-400 mt-4 max-w-2xl mx-auto">
            Configure company-wide payroll settings including pay dates, timezone, and currency
          </p>
        </div>

        {/* Alert Messages */}
        {error && (
          <div className="mb-6 mx-auto max-w-3xl animate-in slide-in-from-top-5 duration-300">
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 backdrop-blur-sm p-4 flex items-center gap-3 shadow-lg shadow-red-500/20">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                <X className="w-5 h-5 text-red-400" />
              </div>
              <p className="text-red-200 font-medium flex-1">{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-6 mx-auto max-w-3xl animate-in slide-in-from-top-5 duration-300">
            <div className="rounded-xl border border-green-500/30 bg-green-500/10 backdrop-blur-sm p-4 flex items-center gap-3 shadow-lg shadow-green-500/20">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                <Check className="w-5 h-5 text-green-400" />
              </div>
              <p className="text-green-200 font-medium flex-1">{success}</p>
            </div>
          </div>
        )}

        {/* Main Card */}
        <div className="max-w-4xl mx-auto">
          <div className="relative group">
            {/* Glow effect */}
            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-3xl blur-xl opacity-30 group-hover:opacity-50 transition duration-500"></div>
            
            <div className="relative bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 overflow-hidden">
              {/* Card Header */}
              <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 px-8 py-6">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-2">
                      Company-Wide Payroll Settings
                    </h2>
                    <p className="text-indigo-100 text-sm">
                      Configure pay dates, timezone, and currency for the entire company
                    </p>
                  </div>
                  {!isEditing && (
                    <Button
                      variant="primary"
                      onClick={() => setIsEditing(true)}
                      className="bg-white/20 hover:bg-white/30 text-white border-white/30 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                    >
                      <Edit2 className="w-4 h-4 mr-2" />
                      {settings ? 'Edit Settings' : 'Create Settings'}
                    </Button>
                  )}
                </div>
              </div>

              {/* Card Content */}
              <div className="p-8">
                {isEditing ? (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Pay Date Field */}
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                        <Calendar className="w-4 h-4 text-indigo-600" />
                        Pay Date
                      </label>
                      <input
                        type="date"
                        value={formData.payDate}
                        onChange={(e) =>
                          setFormData({ ...formData, payDate: e.target.value })
                        }
                        required
                        className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 transition-all duration-200 bg-white shadow-sm hover:shadow-md"
                      />
                    </div>

                    {/* Time Zone Field */}
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                        <Globe className="w-4 h-4 text-indigo-600" />
                        Time Zone
                      </label>
                      <select
                        value={formData.timeZone}
                        onChange={(e) =>
                          setFormData({ ...formData, timeZone: e.target.value })
                        }
                        required
                        className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 transition-all duration-200 bg-white shadow-sm hover:shadow-md cursor-pointer"
                      >
                        <option value="Africa/Cairo">Africa/Cairo (GMT+2)</option>
                        <option value="UTC">UTC</option>
                      </select>
                    </div>

                    {/* Currency Field */}
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                        <DollarSign className="w-4 h-4 text-indigo-600" />
                        Currency
                      </label>
                      <input
                        type="text"
                        value={formData.currency}
                        onChange={(e) =>
                          setFormData({ ...formData, currency: e.target.value.toUpperCase() })
                        }
                        disabled
                        className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-gray-600 bg-gray-50 cursor-not-allowed shadow-sm"
                      />
                      <p className="text-xs text-gray-500 flex items-center gap-1">
                        <Shield className="w-3 h-3" />
                        Currency is fixed to EGP
                      </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-4">
                      <Button
                        type="submit"
                        variant="primary"
                        isLoading={isSaving}
                        className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                      >
                        <Check className="w-4 h-4 mr-2" />
                        {settings ? 'Update Settings' : 'Create Settings'}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleCancel}
                        disabled={isSaving}
                        className="px-6 border-2 border-gray-300 hover:border-gray-400 text-gray-700 hover:bg-gray-50 transition-all duration-200"
                      >
                        <X className="w-4 h-4 mr-2" />
                        Cancel
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-6">
                    {settings ? (
                      <>
                        {/* Pay Date Display */}
                        <div className="p-6 rounded-2xl bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-indigo-100 hover:border-indigo-200 transition-all duration-300 group">
                          <div className="flex items-start gap-4">
                            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                              <Calendar className="w-6 h-6 text-white" />
                            </div>
                            <div className="flex-1">
                              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">
                                Pay Date
                              </label>
                              <p className="text-2xl font-bold text-gray-900">
                                {settings.payDate
                                  ? new Date(settings.payDate).toLocaleDateString('en-US', {
                                      year: 'numeric',
                                      month: 'long',
                                      day: 'numeric'
                                    })
                                  : 'Not set'}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Time Zone Display */}
                        <div className="p-6 rounded-2xl bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-100 hover:border-blue-200 transition-all duration-300 group">
                          <div className="flex items-start gap-4">
                            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                              <Globe className="w-6 h-6 text-white" />
                            </div>
                            <div className="flex-1">
                              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">
                                Time Zone
                              </label>
                              <p className="text-2xl font-bold text-gray-900">
                                {settings.timeZone || 'Not set'}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Currency Display */}
                        <div className="p-6 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-100 hover:border-emerald-200 transition-all duration-300 group">
                          <div className="flex items-start gap-4">
                            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                              <DollarSign className="w-6 h-6 text-white" />
                            </div>
                            <div className="flex-1">
                              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">
                                Currency
                              </label>
                              <p className="text-2xl font-bold text-gray-900">
                                {settings.currency || 'Not set'}
                              </p>
                            </div>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-12">
                        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
                          <Settings className="w-10 h-10 text-indigo-400" />
                        </div>
                        <p className="text-gray-500 text-lg font-medium">
                          No company settings configured
                        </p>
                        <p className="text-gray-400 text-sm mt-2">
                          Click "Create Settings" to get started
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

