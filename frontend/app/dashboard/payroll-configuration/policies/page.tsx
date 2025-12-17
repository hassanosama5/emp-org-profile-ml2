'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useRequireAuth } from '@/lib/hooks/use-auth';
import { SystemRole } from '@/types';
import ConfigurationTable from '@/components/payroll-configuration/ConfigurationTable';
import { policiesApi } from '@/lib/api/payroll-configuration/policies';
import { PayrollPolicy } from '@/lib/api/payroll-configuration/types';
import StatusBadge from '@/components/payroll-configuration/StatusBadge';

export default function PoliciesPage() {
  // Only Payroll Specialist can create/edit policies
  useRequireAuth(SystemRole.PAYROLL_SPECIALIST, '/dashboard');
  const router = useRouter();
  const [allPolicies, setAllPolicies] = useState<PayrollPolicy[]>([]); // Store all policies for stats
  const [policies, setPolicies] = useState<PayrollPolicy[]>([]); // Filtered policies for display
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    loadPolicies();
  }, [statusFilter]);

  const loadPolicies = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Always fetch all policies for accurate stats
      const allData = await policiesApi.getAll();
      setAllPolicies(allData);
      
      // Apply filter for display
      const filter = statusFilter === 'all' ? undefined : statusFilter as 'draft' | 'approved' | 'rejected';
      if (filter) {
        const filtered = allData.filter(p => p.status.toLowerCase() === filter.toLowerCase());
        setPolicies(filtered);
      } else {
        setPolicies(allData);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load policies');
      console.error('Error loading policies:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const columns = [
    { 
      key: 'name', 
      label: 'Policy Name',
      render: (item: PayrollPolicy) => (
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-violet-100 to-indigo-100 rounded-lg">
            <svg className="w-5 h-5 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
            </svg>
          </div>
          <div>
            <div className="font-semibold text-gray-900">{item.name}</div>
            {item.description && (
              <div className="text-xs text-gray-500 mt-0.5 max-w-xs truncate">{item.description}</div>
            )}
          </div>
        </div>
      )
    },
    { 
      key: 'policyType', 
      label: 'Type',
      render: (item: PayrollPolicy) => (
        <span className="inline-flex items-center px-3 py-1 rounded-xl text-xs font-semibold bg-gradient-to-r from-violet-100 to-indigo-100 text-violet-700 shadow-sm">
          {item.policyType}
        </span>
      )
    },
    { 
      key: 'effectiveDate', 
      label: 'Effective Date',
      render: (item: PayrollPolicy) => (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
            </svg>
            <span className="text-sm font-medium text-gray-900">
              {new Date(item.effectiveDate).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              })}
            </span>
          </div>
        </div>
      )
    },
    { 
      key: 'createdBy', 
      label: 'Created By',
      render: (item: PayrollPolicy) => {
        // Safety check: handle if createdBy is still an object
        let createdByDisplay: string = typeof item.createdBy === 'string' ? item.createdBy : '';
        if (item.createdBy && typeof item.createdBy === 'object') {
          const createdByObj = item.createdBy as any;
          if (createdByObj.firstName && createdByObj.lastName) {
            createdByDisplay = `${createdByObj.firstName} ${createdByObj.lastName}`;
          } else if (createdByObj.fullName) {
            createdByDisplay = createdByObj.fullName;
          } else if (createdByObj.email) {
            createdByDisplay = createdByObj.email;
          } else {
            createdByDisplay = 'Unknown';
          }
        }
        return (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-violet-400 to-indigo-500 rounded-full flex items-center justify-center text-white text-xs font-semibold">
              {createdByDisplay ? createdByDisplay.charAt(0).toUpperCase() : '?'}
            </div>
            <span className="text-sm font-medium text-gray-700">{createdByDisplay || 'N/A'}</span>
          </div>
        );
      }
    },
  ];

  const handleCreateNew = () => {
    router.push('/dashboard/payroll-configuration/policies/new');
  };

  const handleView = (policy: PayrollPolicy) => {
    router.push(`/dashboard/payroll-configuration/policies/${policy.id}`);
  };

  const handleEdit = (policy: PayrollPolicy) => {
    if (policy.status?.toLowerCase() === 'draft') {
      router.push(`/dashboard/payroll-configuration/policies/${policy.id}/edit`);
    } else {
      alert('Only draft policies can be edited.');
    }
  };

  const handleDelete = async (policy: PayrollPolicy) => {
    if (policy.status?.toLowerCase() !== 'draft') {
      alert('Only draft policies can be deleted.');
      return;
    }

    if (!confirm(`Are you sure you want to delete "${policy.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await policiesApi.delete(policy.id);
      // Refresh the list
      loadPolicies();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete policy');
    }
  };

  const getStatusCount = (status: 'draft' | 'approved' | 'rejected') => {
    // Use allPolicies for accurate counts, not filtered policies
    return allPolicies.filter(p => p.status?.toLowerCase() === status.toLowerCase()).length;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-indigo-50 to-purple-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-xl shadow-lg">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">Payroll Policies</h1>
                <p className="text-gray-600 mt-1 text-sm">Manage and configure payroll policies for your organization</p>
              </div>
            </div>
          </div>
          <button
            onClick={handleCreateNew}
            className="group relative px-6 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-semibold rounded-xl shadow-lg hover:shadow-xl hover:from-violet-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500 transition-all duration-200 flex items-center transform hover:scale-105"
          >
            <svg className="w-5 h-5 mr-2 group-hover:rotate-90 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path>
            </svg>
            Create New Policy
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          {(['draft', 'approved', 'rejected'] as const).map((status) => {
            const statusConfig = {
              draft: { border: 'border-amber-100', bg: 'bg-amber-100', icon: 'text-amber-600', bgIcon: 'bg-amber-100' },
              approved: { border: 'border-green-100', bg: 'bg-green-100', icon: 'text-green-600', bgIcon: 'bg-green-100' },
              rejected: { border: 'border-red-100', bg: 'bg-red-100', icon: 'text-red-600', bgIcon: 'bg-red-100' }
            };
            const config = statusConfig[status];
            return (
              <div key={status} className={`bg-white p-6 rounded-2xl shadow-lg border ${config.border} hover:shadow-xl transition-shadow duration-200 relative overflow-hidden`}>
                <div className={`absolute top-0 right-0 w-32 h-32 ${config.bg} rounded-full -mr-16 -mt-16 opacity-50`}></div>
                <div className="relative flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 ${config.bgIcon} rounded-xl`}>
                      {status === 'draft' && (
                        <svg className={`w-6 h-6 ${config.icon}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                        </svg>
                      )}
                      {status === 'approved' && (
                        <svg className={`w-6 h-6 ${config.icon}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                      )}
                      {status === 'rejected' && (
                        <svg className={`w-6 h-6 ${config.icon}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-1">{status.charAt(0).toUpperCase() + status.slice(1)}</p>
                      <p className="text-3xl font-bold text-gray-900">{getStatusCount(status)}</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filter and Table Section */}
      <div className="bg-white/80 backdrop-blur-sm shadow-2xl rounded-2xl border border-white/20 overflow-hidden">
        <div className="px-6 py-6 sm:px-8 sm:py-8">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <div className="flex items-center space-x-3">
              <svg className="w-5 h-5 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"></path>
              </svg>
              <label className="text-sm font-semibold text-gray-700">Filter by status:</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 text-sm font-medium border-2 border-violet-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 bg-white text-gray-700 transition-all duration-200 hover:border-violet-300"
              >
                <option value="all">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            
            <button
              onClick={loadPolicies}
              className="px-4 py-2 border-2 border-violet-200 rounded-lg text-sm font-semibold text-violet-700 hover:bg-violet-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500 transition-all duration-200 flex items-center hover:border-violet-300"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
              </svg>
              Refresh
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border-2 border-red-200 rounded-xl">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <p className="text-red-700 font-semibold">Error: {error}</p>
              </div>
            </div>
          )}

          {/* Table */}
          <ConfigurationTable
            data={policies}
            columns={columns}
            onView={handleView}
            onEdit={handleEdit}
            onDelete={undefined}
            canDelete={() => false}
            isLoading={isLoading}
            emptyMessage={statusFilter !== 'all' ? `No ${statusFilter} policies found.` : 'No policies created yet. Start by creating your first policy.'}
          />

          {/* Table Info */}
          <div className="mt-6 p-4 bg-violet-50 border border-violet-200 rounded-xl">
            <div className="flex items-start gap-2 text-sm text-violet-700">
              <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <div>
                <p className="font-semibold mb-1">Policy Management Rules:</p>
                <p>• Only policies with <StatusBadge status="draft" size="sm" /> status can be edited or deleted.</p>
                <p>• Policies with <StatusBadge status="approved" size="sm" /> or <StatusBadge status="rejected" size="sm" /> status are read-only.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}