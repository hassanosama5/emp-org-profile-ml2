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
      <div className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Company Settings</h1>
        <p className="text-gray-600 mt-1">
          Configure company-wide payroll settings (System Admin only)
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-300 bg-red-50 p-4 text-red-800">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 rounded-lg border border-green-300 bg-green-50 p-4 text-green-800">
          {success}
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Company-Wide Payroll Settings</CardTitle>
              <CardDescription>
                Configure pay dates, timezone, and currency for the entire company
              </CardDescription>
            </div>
            {!isEditing && (
              <Button variant="primary" onClick={() => setIsEditing(true)}>
                {settings ? 'Edit Settings' : 'Create Settings'}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Input
                  label="Pay Date"
                  type="date"
                  value={formData.payDate}
                  onChange={(e) =>
                    setFormData({ ...formData, payDate: e.target.value })
                  }
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Time Zone
                </label>
                <select
                  value={formData.timeZone}
                  onChange={(e) =>
                    setFormData({ ...formData, timeZone: e.target.value })
                  }
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  required
                >
                  <option value="Africa/Cairo">Africa/Cairo (GMT+2)</option>
                  <option value="UTC">UTC</option>
                </select>
              </div>

              <div>
                <Input
                  label="Currency"
                  type="text"
                  value={formData.currency}
                  onChange={(e) =>
                    setFormData({ ...formData, currency: e.target.value.toUpperCase() })
                  }
                  disabled
                  className="bg-gray-100"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Currency is fixed to EGP
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={isSaving}
                >
                  {settings ? 'Update Settings' : 'Create Settings'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              {settings ? (
                <>
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Pay Date
                    </label>
                    <p className="mt-1 text-sm text-gray-900">
                      {settings.payDate
                        ? new Date(settings.payDate).toLocaleDateString()
                        : 'Not set'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Time Zone
                    </label>
                    <p className="mt-1 text-sm text-gray-900">
                      {settings.timeZone || 'Not set'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Currency
                    </label>
                    <p className="mt-1 text-sm text-gray-900">
                      {settings.currency || 'Not set'}
                    </p>
                  </div>
                </>
              ) : (
                <p className="text-gray-500">
                  No company settings configured. Click "Create Settings" to get started.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

