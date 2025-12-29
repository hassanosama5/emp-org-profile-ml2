'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useRequireAuth } from '@/lib/hooks/use-auth';
import { SystemRole } from '@/types';
import { policiesApi } from '@/lib/api/payroll-configuration/policies';

export default function NewPolicyPage() {
  // Only Payroll Specialist can create new policies
  useRequireAuth(SystemRole.PAYROLL_SPECIALIST, '/dashboard');
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
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
      
      await policiesApi.create(policyData);
      
      // Redirect to policies list
      router.push('/dashboard/payroll-configuration/policies');
    } catch (err) {
      console.error('Error creating policy:', err);
      setError(err instanceof Error ? err.message : 'Failed to create policy');
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated Gradient Background */}
      <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900"></div>
      
      {/* Animated Mesh Gradient Overlay */}
      <div className="fixed inset-0 bg-gradient-to-tr from-blue-900/20 via-purple-900/20 to-pink-900/20 animate-pulse"></div>
      
      {/* Animated Grid Pattern */}
      <div 
        className="fixed inset-0 opacity-10"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
        }}
      ></div>
      
      {/* Floating Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-40 right-20 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute bottom-20 left-1/4 w-80 h-80 bg-pink-500/20 rounded-full blur-3xl animate-pulse delay-2000"></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16">
        {/* Header */}
        <div className="max-w-4xl mx-auto mb-8">
          <button
            onClick={() => router.push('/dashboard/payroll-configuration/policies')}
            className="mb-6 group flex items-center gap-2 text-white/80 hover:text-white transition-colors duration-200"
          >
            <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
            </svg>
            <span className="font-medium">Back to Policies</span>
          </button>
          
          <div className="flex items-center gap-4 mb-2">
            <div className="p-4 bg-gradient-to-br from-violet-500 via-indigo-600 to-purple-600 rounded-2xl shadow-2xl transform hover:scale-105 transition-transform duration-300">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path>
              </svg>
            </div>
            <div>
              <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-2 drop-shadow-lg">
                Create New Policy
              </h1>
              <p className="text-white/80 text-lg">Define a new payroll policy for your organization</p>
            </div>
          </div>
        </div>

        {/* Form Card */}
        <div className="max-w-4xl mx-auto">
          {error && (
            <div className="mb-6 p-4 bg-red-500/20 backdrop-blur-md border-2 border-red-500/50 rounded-xl shadow-lg flex items-center gap-3">
              <svg className="w-5 h-5 text-red-300 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <p className="text-red-200 font-semibold">{error}</p>
            </div>
          )}

          <div className="relative rounded-3xl shadow-2xl border border-white/20 overflow-hidden backdrop-blur-xl bg-white/10">
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-white/10"></div>
            <form onSubmit={handleSubmit} className="relative p-8 space-y-8">
              {/* Basic Information */}
              <div className="space-y-6">
                <div className="flex items-center gap-3 pb-4 border-b border-white/20">
                  <div className="p-2 bg-white/20 backdrop-blur-md rounded-lg border border-white/30">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                  </div>
                  <h2 className="text-xl font-bold text-white">Basic Information</h2>
                </div>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-semibold text-white">
                      <svg className="w-4 h-4 text-violet-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                      className="w-full px-4 py-3 border-2 border-white/30 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all duration-200 bg-white hover:border-white/50"
                      placeholder="e.g., Overtime Policy"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-semibold text-white">
                      <svg className="w-4 h-4 text-indigo-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"></path>
                      </svg>
                      Policy Type *
                    </label>
                    <select
                      name="policyType"
                      value={formData.policyType}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border-2 border-white/30 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 bg-white hover:border-white/50 appearance-none cursor-pointer"
                    >
                      <option value="attendance">📋 Attendance Policy</option>
                      <option value="overtime">⏰ Overtime Policy</option>
                      <option value="bonus">🎁 Bonus Policy</option>
                      <option value="deduction">💰 Deduction Policy</option>
                      <option value="other">📄 Other Policy</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2 space-y-2">
                    <label className="flex items-center gap-2 text-sm font-semibold text-white">
                      <svg className="w-4 h-4 text-violet-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                      </svg>
                      Description *
                    </label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      required
                      rows={4}
                      className="w-full px-4 py-3 border-2 border-white/30 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all duration-200 bg-white hover:border-white/50 resize-none"
                      placeholder="Describe this policy..."
                    />
                    <p className="text-xs text-white/70 flex items-center gap-1">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      Description is required
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-semibold text-white">
                      <svg className="w-4 h-4 text-violet-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                      className="w-full px-4 py-3 border-2 border-white/30 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all duration-200 bg-white hover:border-white/50"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-semibold text-white">
                      <svg className="w-4 h-4 text-indigo-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
                      </svg>
                      Applicability *
                    </label>
                    <select
                      name="applicability"
                      value={formData.applicability}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 border-2 border-white/30 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 bg-white hover:border-white/50 appearance-none cursor-pointer"
                    >
                      <option value="All Employees">👥 All Employees</option>
                      <option value="Full Time Employees">💼 Full Time Employees</option>
                      <option value="Part Time Employees">⏱️ Part Time Employees</option>
                      <option value="Contractors">📝 Contractors</option>
                    </select>
                  </div>
                </div>
            </div>

                {/* Policy Rules - Only show overtime rules for overtime policy type */}
                {formData.policyType === 'overtime' && (
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 pb-4 border-b border-white/20">
                      <div className="p-2 bg-white/20 backdrop-blur-md rounded-lg border border-white/30">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                      </div>
                      <h2 className="text-xl font-bold text-white">Overtime Rules</h2>
                    </div>

                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 text-sm font-semibold text-white">
                          <svg className="w-4 h-4 text-orange-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
                          </svg>
                          Overtime Rate *
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            name="rules_overtimeRate"
                            value={formData.rules_overtimeRate}
                            onChange={handleChange}
                            step="0.1"
                            min="1"
                            className="w-full px-4 py-3 pr-12 border-2 border-white/30 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 bg-white hover:border-white/50"
                          />
                          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">x</div>
                        </div>
                        <p className="text-xs text-white/70 flex items-center gap-1">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                          </svg>
                          Multiplier for overtime hours (e.g., 1.5 for time and a half)
                        </p>
                      </div>

                      <div className="space-y-2">
                        <label className="flex items-center gap-2 text-sm font-semibold text-white">
                          <svg className="w-4 h-4 text-orange-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                          </svg>
                          Max Overtime Hours *
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            name="rules_maxOvertimeHours"
                            value={formData.rules_maxOvertimeHours}
                            onChange={handleChange}
                            min="0"
                            className="w-full px-4 py-3 pr-12 border-2 border-white/30 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 bg-white hover:border-white/50"
                          />
                          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">hrs</div>
                        </div>
                        <p className="text-xs text-white/70 flex items-center gap-1">
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
                <div className="flex justify-end gap-4 pt-6 border-t border-white/20">
                  <button
                    type="button"
                    onClick={() => router.push('/dashboard/payroll-configuration/policies')}
                    className="px-6 py-3 border-2 border-white/30 rounded-xl text-sm font-semibold text-white hover:bg-white/20 hover:border-white/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white/50 transition-all duration-200 backdrop-blur-md bg-white/10"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="group relative px-8 py-3 bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 text-white rounded-xl text-sm font-bold shadow-2xl hover:shadow-violet-500/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 disabled:transform-none flex items-center gap-2 overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-violet-700 via-indigo-700 to-purple-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    {isLoading ? (
                      <>
                        <svg className="animate-spin h-5 w-5 relative z-10" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span className="relative z-10">Creating...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                        </svg>
                        <span className="relative z-10">Create Policy</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
  );
}
