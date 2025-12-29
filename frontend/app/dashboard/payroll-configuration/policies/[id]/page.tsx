'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import StatusBadge from '@/components/payroll-configuration/StatusBadge';
import { policiesApi } from '@/lib/api/payroll-configuration/policies';
import { PayrollPolicy } from '@/lib/api/payroll-configuration/types';

export default function PolicyDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const policyId = params.id as string;
  const [policy, setPolicy] = useState<PayrollPolicy | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPolicy();
  }, [policyId]);

  const loadPolicy = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await policiesApi.getById(policyId);
      setPolicy(data);
    } catch (err) {
      console.error('Error loading policy:', err);
      setError(err instanceof Error ? err.message : 'Failed to load policy');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = () => {
    if (policy && policy.status?.toLowerCase() === 'draft') {
      router.push(`/dashboard/payroll-configuration/policies/${policyId}/edit`);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-violet-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading policy...</p>
        </div>
      </div>
    );
  }

  if (error || !policy) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50 via-indigo-50 to-purple-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border-2 border-red-200 rounded-xl shadow-lg p-6">
            <h2 className="text-lg font-semibold text-red-800 mb-2">Error Loading Policy</h2>
            <p className="text-red-700 mb-4">{error || 'Policy not found'}</p>
            <button
              onClick={() => router.push('/dashboard/payroll-configuration/policies')}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Back to Policies
            </button>
          </div>
        </div>
      </div>
    );
  }

  const getCreatedByName = () => {
    if (!policy.createdBy) return 'N/A';
    if (typeof policy.createdBy === 'string') return policy.createdBy;
    const createdBy = policy.createdBy as any;
    if (createdBy && typeof createdBy === 'object') {
      if (createdBy.firstName && createdBy.lastName) {
        return `${createdBy.firstName} ${createdBy.lastName}`;
      }
      return createdBy.email || createdBy.fullName || 'N/A';
    }
    return 'N/A';
  };

  const getApprovedByName = () => {
    if (!policy.approvedBy) return null;
    if (typeof policy.approvedBy === 'string') return policy.approvedBy;
    const approvedBy = policy.approvedBy as any;
    if (approvedBy && typeof approvedBy === 'object') {
      if (approvedBy.firstName && approvedBy.lastName) {
        return `${approvedBy.firstName} ${approvedBy.lastName}`;
      }
      return approvedBy.email || approvedBy.fullName || 'Unknown';
    }
    return 'Unknown';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-indigo-50 to-purple-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/dashboard/payroll-configuration/policies')}
            className="mb-6 group flex items-center gap-2 text-gray-600 hover:text-violet-600 transition-colors duration-200"
          >
            <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
            </svg>
            <span className="font-medium">Back to Policies</span>
          </button>
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-2xl shadow-xl">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
                  {policy.name}
                </h1>
                <div className="flex items-center gap-3 mt-2">
                  <StatusBadge status={policy.status} />
                  <span className="text-sm text-gray-500 font-mono">ID: {policy.id}</span>
                  {policy.version && (
                    <span className="text-sm text-gray-500">• Version: {policy.version}</span>
                  )}
                </div>
              </div>
            </div>
            
            {policy.status?.toLowerCase() === 'draft' && (
              <button
                onClick={handleEdit}
                className="group px-6 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl text-sm font-semibold shadow-lg hover:shadow-xl hover:from-violet-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500 transition-all duration-200 transform hover:scale-105 flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                </svg>
                Edit Policy
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Details Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description Card */}
            <div className="bg-white/80 backdrop-blur-sm shadow-2xl rounded-2xl border border-white/20 overflow-hidden">
              <div className="p-8">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200">
                  <div className="p-2 bg-violet-100 rounded-lg">
                    <svg className="w-5 h-5 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">Policy Description</h2>
                </div>
                <p className="text-gray-800 leading-relaxed whitespace-pre-line">{policy.description || 'No description provided'}</p>
              </div>
            </div>

            {/* Rules Card - Only show for overtime policies and filter out internal fields */}
            {policy.policyType === 'overtime' && policy.rules && Object.keys(policy.rules).length > 0 && (() => {
              // Filter out internal backend fields that shouldn't be displayed
              const fieldsToHide = ['_id', 'createdAt', 'updatedAt', 'percentage', 'fixedAmount', 'thresholdAmount'];
              const displayableRules = Object.entries(policy.rules).filter(([key]) => !fieldsToHide.includes(key));
              
              // For overtime policies, show overtimeRate and maxOvertimeHours if they exist
              // Otherwise, convert from backend format if needed
              const overtimeRate = policy.rules.overtimeRate || (policy.rules.percentage !== undefined ? (policy.rules.percentage / 100 + 1) : null);
              const maxOvertimeHours = policy.rules.maxOvertimeHours || policy.rules.thresholdAmount;
              
              if (!overtimeRate && !maxOvertimeHours && displayableRules.length === 0) {
                return null;
              }
              
              return (
                <div className="bg-white/80 backdrop-blur-sm shadow-2xl rounded-2xl border border-white/20 overflow-hidden">
                  <div className="p-8">
                    <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                      </div>
                      <h2 className="text-2xl font-bold text-gray-900">Overtime Rules</h2>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      {overtimeRate !== null && overtimeRate !== undefined && (
                        <div className="p-6 bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl border-2 border-orange-200">
                          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">Overtime Rate</label>
                          <p className="text-3xl font-bold text-orange-700">{overtimeRate}x</p>
                          <p className="text-xs text-gray-500 mt-1">Multiplier for overtime hours</p>
                        </div>
                      )}
                      {maxOvertimeHours !== null && maxOvertimeHours !== undefined && (
                        <div className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border-2 border-green-200">
                          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">Max Overtime Hours</label>
                          <p className="text-3xl font-bold text-green-700">{maxOvertimeHours} hrs</p>
                          <p className="text-xs text-gray-500 mt-1">Maximum per month</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Sidebar Column */}
          <div className="space-y-6">
            {/* Details Card */}
            <div className="bg-white/80 backdrop-blur-sm shadow-2xl rounded-2xl border border-white/20 overflow-hidden">
              <div className="p-8">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200">
                  <div className="p-2 bg-indigo-100 rounded-lg">
                    <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">Policy Details</h2>
                </div>
                <div className="space-y-4">
                  <div className="p-4 bg-indigo-50 rounded-xl">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">Policy Type</label>
                    <p className="text-sm font-medium text-indigo-700 capitalize">{policy.policyType || 'N/A'}</p>
                  </div>
                  <div className="p-4 bg-violet-50 rounded-xl">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">Effective Date</label>
                    <p className="text-sm font-medium text-violet-700">
                      {policy.effectiveDate ? new Date(policy.effectiveDate).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      }) : 'N/A'}
                    </p>
                  </div>
                  {(policy as any).applicability && (
                    <div className="p-4 bg-purple-50 rounded-xl">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">Applicability</label>
                      <p className="text-sm font-medium text-purple-700">{(policy as any).applicability}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Metadata Card */}
            <div className="bg-white/80 backdrop-blur-sm shadow-2xl rounded-2xl border border-white/20 overflow-hidden">
              <div className="p-8">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">Audit Information</h2>
                </div>
                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">Created By</label>
                    <p className="text-sm font-medium text-gray-900">{getCreatedByName()}</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">Created At</label>
                    <p className="text-sm font-medium text-gray-900">
                      {policy.createdAt ? new Date(policy.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      }) : 'N/A'}
                    </p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">Last Updated</label>
                    <p className="text-sm font-medium text-gray-900">
                      {policy.updatedAt ? new Date(policy.updatedAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      }) : 'N/A'}
                    </p>
                  </div>
                  {getApprovedByName() && (
                    <div className="p-4 bg-green-50 rounded-xl">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">Approved By</label>
                      <p className="text-sm font-medium text-green-700">{getApprovedByName()}</p>
                    </div>
                  )}
                  {policy.approvedAt && (
                    <div className="p-4 bg-green-50 rounded-xl">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">Approved At</label>
                      <p className="text-sm font-medium text-green-700">
                        {new Date(policy.approvedAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Comments Card */}
            {policy.comments && (
              <div className="bg-yellow-50/80 backdrop-blur-sm border-2 border-yellow-200 rounded-2xl shadow-xl overflow-hidden">
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-yellow-100 rounded-lg">
                      <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"></path>
                      </svg>
                    </div>
                    <h2 className="text-lg font-bold text-yellow-800">Comments</h2>
                  </div>
                  <p className="text-sm text-yellow-900 leading-relaxed">{policy.comments}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

