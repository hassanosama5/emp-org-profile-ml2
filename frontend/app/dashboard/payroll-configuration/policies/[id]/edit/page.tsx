'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useRequireAuth } from '@/lib/hooks/use-auth';
import { SystemRole } from '@/types';
import { policiesApi } from '@/lib/api/payroll-configuration/policies';
import { PayrollPolicy } from '@/lib/api/payroll-configuration/types';

export default function EditPolicyPage() {
  // Only Payroll Specialist can edit policies
  useRequireAuth(SystemRole.PAYROLL_SPECIALIST, '/dashboard');
  const params = useParams();
  const router = useRouter();
  const policyId = params.id as string;
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    policyType: 'overtime',
    effectiveDate: '',
    department: '',
    location: '',
    rules_overtimeRate: '1.5',
    rules_maxOvertimeHours: '20',
    applicability: 'All Employees',
  });

  useEffect(() => {
    loadPolicy();
  }, [policyId]);

  const loadPolicy = async () => {
    try {
      setIsLoadingData(true);
      const policy = await policiesApi.getById(policyId);
      
      // Map backend policyType enum to frontend format
      const policyTypeMap: Record<string, string> = {
        'Leave': 'attendance',
        'Allowance': 'overtime',
        'Benefit': 'bonus',
        'Deduction': 'deduction',
        'Misconduct': 'other',
      };
      const frontendPolicyType = policyTypeMap[policy.policyType] || policy.policyType || 'overtime';
      
      // Extract ruleDefinition and convert to frontend format
      // Backend has: { percentage, fixedAmount, thresholdAmount }
      // Frontend expects for overtime: { overtimeRate, maxOvertimeHours }
      let overtimeRate = '1.5';
      let maxOvertimeHours = '20';
      
      if (policy.rules && typeof policy.rules === 'object') {
        // If it's already in frontend format
        if (policy.rules.overtimeRate !== undefined) {
          overtimeRate = String(policy.rules.overtimeRate);
        } else if (policy.rules.percentage !== undefined) {
          // Convert percentage back to overtime rate (percentage = (rate - 1) * 100)
          overtimeRate = String(1 + (policy.rules.percentage / 100));
        }
        
        if (policy.rules.maxOvertimeHours !== undefined) {
          maxOvertimeHours = String(policy.rules.maxOvertimeHours);
        } else if (policy.rules.thresholdAmount !== undefined) {
          maxOvertimeHours = String(policy.rules.thresholdAmount);
        }
      }
      
      // Convert policy data to form format
      setFormData({
        name: policy.name ?? '',
        description: policy.description ?? '',
        policyType: frontendPolicyType,
        effectiveDate: policy.effectiveDate ? new Date(policy.effectiveDate).toISOString().split('T')[0] : '',
        department: policy.department ?? '',
        location: policy.location ?? '',
        rules_overtimeRate: overtimeRate,
        rules_maxOvertimeHours: maxOvertimeHours,
        applicability: (policy as any).applicability || 'All Employees',
      });
    } catch (err) {
      console.error('Error loading policy:', err);
      setError(err instanceof Error ? err.message : 'Failed to load policy');
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    // Client-side validation
    if (!formData.name.trim()) {
      setError('Policy name is required');
      setIsLoading(false);
      return;
    }
    
    if (!formData.description.trim()) {
      setError('Description is required');
      setIsLoading(false);
      return;
    }
    
    if (!formData.effectiveDate) {
      setError('Effective date is required');
      setIsLoading(false);
      return;
    }
    
    try {
      // Convert form data to API format - DTO accepts: policyName, policyType, description, effectiveDate, ruleDefinition, applicability
      const policyData: any = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        policyType: formData.policyType as 'attendance' | 'overtime' | 'bonus' | 'deduction' | 'other',
        effectiveDate: formData.effectiveDate ? new Date(formData.effectiveDate).toISOString() : new Date().toISOString(),
        applicability: formData.applicability,
      };
      
      // Only include overtime rules if policy type is overtime
      // The API mapping function will convert this to ruleDefinition format
      if (formData.policyType === 'overtime') {
        policyData.rules = {
          overtimeRate: parseFloat(formData.rules_overtimeRate) || 1.5,
          maxOvertimeHours: parseInt(formData.rules_maxOvertimeHours) || 20,
        };
      }
      
      await policiesApi.update(policyId, policyData);
      
      // Redirect to policy details
      router.push(`/dashboard/payroll-configuration/policies/${policyId}`);
    } catch (err) {
      console.error('Error updating policy:', err);
      setError(err instanceof Error ? err.message : 'Failed to update policy');
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  if (isLoadingData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-violet-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading policy...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 to-indigo-100 p-6">
      {/* Header */}
      <div className="max-w-4xl mx-auto mb-8">
        <button
          onClick={() => router.push(`/dashboard/payroll-configuration/policies/${policyId}`)}
          className="mb-6 group flex items-center gap-2 text-gray-600 hover:text-violet-600 transition-colors duration-200"
        >
          <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
          </svg>
          <span className="font-medium">Back to Policy Details</span>
        </button>
        
        <div className="flex items-center gap-4 mb-2">
          <div className="p-3 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-xl shadow-lg">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
            </svg>
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
              Edit Policy
            </h1>
            <p className="text-gray-600 mt-1 text-sm">Update the policy information</p>
          </div>
        </div>
      </div>

      {/* Form Card */}
      <div className="max-w-4xl mx-auto">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-xl shadow-lg flex items-center gap-3">
            <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <p className="text-red-800 font-semibold">{error}</p>
          </div>
        )}

        <div className="bg-white/80 backdrop-blur-sm shadow-2xl rounded-2xl border border-white/20 overflow-hidden">
          <form onSubmit={handleSubmit} className="p-8 space-y-8">
            {/* Basic Information */}
            <div className="border-b border-gray-200 pb-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-violet-100 rounded-lg">
                  <svg className="w-5 h-5 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path>
                  </svg>
                </div>
                <h2 className="text-2xl font-semibold text-gray-800">Policy Details</h2>
              </div>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                    <svg className="w-4 h-4 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"></path>
                    </svg>
                    Policy Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all duration-200 bg-white hover:border-violet-300"
                  />
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                    <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"></path>
                    </svg>
                    Policy Type *
                  </label>
                  <select
                    name="policyType"
                    value={formData.policyType}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 bg-white hover:border-indigo-300"
                  >
                    <option value="attendance">Attendance Policy</option>
                    <option value="overtime">Overtime Policy</option>
                    <option value="bonus">Bonus Policy</option>
                    <option value="deduction">Deduction Policy</option>
                    <option value="other">Other Policy</option>
                  </select>
                </div>

                <div className="sm:col-span-2 space-y-2">
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                    <svg className="w-4 h-4 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                    </svg>
                    Description *
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    required
                    rows={3}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all duration-200 bg-white hover:border-violet-300 resize-none"
                    placeholder="Describe this policy..."
                  />
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    A clear description helps in understanding the policy.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                    <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                    </svg>
                    Effective Date *
                  </label>
                  <input
                    type="date"
                    name="effectiveDate"
                    value={formData.effectiveDate}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 bg-white hover:border-indigo-300"
                  />
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                    <svg className="w-4 h-4 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
                    </svg>
                    Applicability *
                  </label>
                  <select
                    name="applicability"
                    value={formData.applicability}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all duration-200 bg-white hover:border-violet-300"
                  >
                    <option value="All Employees">All Employees</option>
                    <option value="Full Time Employees">Full Time Employees</option>
                    <option value="Part Time Employees">Part Time Employees</option>
                    <option value="Contractors">Contractors</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Policy Rules - Only show overtime rules for overtime policy type */}
            {formData.policyType === 'overtime' && (
              <div className="border-b border-gray-200 pb-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                  </div>
                  <h2 className="text-2xl font-semibold text-gray-800">Overtime Rules</h2>
                </div>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                      <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
                      </svg>
                      Overtime Rate
                    </label>
                    <input
                      type="number"
                      name="rules_overtimeRate"
                      value={formData.rules_overtimeRate}
                      onChange={handleChange}
                      step="0.1"
                      min="1"
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 bg-white hover:border-green-300"
                    />
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      Multiplier for overtime hours (e.g., 1.5 for time and a half)
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                      <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                      </svg>
                      Max Overtime Hours
                    </label>
                    <input
                      type="number"
                      name="rules_maxOvertimeHours"
                      value={formData.rules_maxOvertimeHours}
                      onChange={handleChange}
                      min="0"
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 bg-white hover:border-green-300"
                    />
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      Maximum overtime hours allowed per month
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-4 pt-6">
              <button
                type="button"
                onClick={() => router.push(`/dashboard/payroll-configuration/policies/${policyId}`)}
                className="px-6 py-3 border-2 border-gray-300 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all duration-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="group relative px-8 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl text-sm font-semibold shadow-lg hover:shadow-xl hover:from-violet-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 disabled:transform-none flex items-center gap-2"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

