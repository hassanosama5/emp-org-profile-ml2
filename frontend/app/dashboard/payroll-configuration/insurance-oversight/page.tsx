"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/use-auth';
import { useRequireAuth } from '@/lib/hooks/use-auth';
import { SystemRole } from '@/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/shared/ui/Card';
import { Button } from '@/components/shared/ui/Button';
import { ConfigurationTable, ConfigurationItem } from '@/components/payroll-configuration/ConfigurationTable';
import { ApprovalModal } from '@/components/payroll-configuration/ApprovalModal';
import { RejectionModal } from '@/components/payroll-configuration/RejectionModal';
import { ViewDetailsModal } from '@/components/payroll-configuration/ViewDetailsModal';
import { insuranceBracketsApi, configDetailsApi, InsuranceBracket, ConfigStatus } from '@/lib/api/payroll-configuration';

export default function InsuranceOversightPage() {
  const { user } = useAuth();
  const router = useRouter();
  useRequireAuth(SystemRole.HR_MANAGER);

  const [insuranceBrackets, setInsuranceBrackets] = useState<InsuranceBracket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<ConfigStatus | 'all'>('all');

  // Modal states
  const [approvalModal, setApprovalModal] = useState<{
    isOpen: boolean;
    item: InsuranceBracket | null;
  }>({ isOpen: false, item: null });
  const [rejectionModal, setRejectionModal] = useState<{
    isOpen: boolean;
    item: InsuranceBracket | null;
  }>({ isOpen: false, item: null });
  const [viewModal, setViewModal] = useState<{
    isOpen: boolean;
    item: InsuranceBracket | null;
    details: any;
  }>({ isOpen: false, item: null, details: null });
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  useEffect(() => {
    loadInsuranceBrackets();
  }, [statusFilter]);

  // Auto-dismiss success message after 5 seconds
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        setSuccess(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const loadInsuranceBrackets = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const filters = statusFilter !== 'all' ? { status: statusFilter } : undefined;
      const data = await insuranceBracketsApi.getAll(filters);
      // Ensure data is always an array
      if (Array.isArray(data)) {
        setInsuranceBrackets(data);
      } else if (data && typeof data === 'object') {
        // Handle case where API returns { data: [...] } or { insuranceBrackets: [...] }
        const arrayData = (data as any).data || (data as any).insuranceBrackets || [];
        setInsuranceBrackets(Array.isArray(arrayData) ? arrayData : []);
      } else {
        setInsuranceBrackets([]);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load insurance brackets');
      // Use empty array for UI structure when backend is not ready
      setInsuranceBrackets([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (comment?: string) => {
    if (!approvalModal.item) return;

    try {
      setIsProcessing(true);
      setError(null);
      await insuranceBracketsApi.approve(
        approvalModal.item._id,
        comment ? { comment } : undefined
      );
      setSuccess('Insurance bracket approved successfully');
      setApprovalModal({ isOpen: false, item: null });
      await loadInsuranceBrackets();
    } catch (err: any) {
      setError(err.message || 'Failed to approve insurance bracket');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async (reason: string) => {
    if (!rejectionModal.item) return;

    try {
      setIsProcessing(true);
      setError(null);
      await insuranceBracketsApi.reject(rejectionModal.item._id, { comment: reason });
      setSuccess('Insurance bracket rejected successfully');
      setRejectionModal({ isOpen: false, item: null });
      await loadInsuranceBrackets();
    } catch (err: any) {
      setError(err.message || 'Failed to reject insurance bracket');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async (item: InsuranceBracket) => {
    if (!confirm('Are you sure you want to delete this insurance bracket?')) {
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);
      await insuranceBracketsApi.delete(item._id);
      setSuccess('Insurance bracket deleted successfully');
      await loadInsuranceBrackets();
    } catch (err: any) {
      setError(err.message || 'Failed to delete insurance bracket');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleView = async (item: InsuranceBracket) => {
    try {
      setIsLoadingDetails(true);
      const details = await insuranceBracketsApi.getById(item._id);
      setViewModal({
        isOpen: true,
        item,
        details,
      });
    } catch (err: any) {
      // Fallback: use the item data itself
      setViewModal({
        isOpen: true,
        item,
        details: item,
      });
    } finally {
      setIsLoadingDetails(false);
    }
  };


  // Filter brackets by status
  const filteredBrackets = Array.isArray(insuranceBrackets)
    ? (statusFilter === 'all'
        ? insuranceBrackets
        : insuranceBrackets.filter((item) => item.status === statusFilter))
    : [];

  // Transform to table format
  const tableData: ConfigurationItem[] = filteredBrackets.map((item) => ({
    ...item,
  }));

  const columns = [
    {
      key: 'minSalary',
      label: 'Salary Range',
      render: (item: ConfigurationItem) => (
        <span className="font-semibold text-gray-900">
          {item.minSalary?.toLocaleString()} - {item.maxSalary?.toLocaleString()} EGP
        </span>
      ),
    },
    {
      key: 'employeeContribution',
      label: 'Employee Contribution',
      render: (item: ConfigurationItem) => {
        const employeeRate = (item as any).employeeRate || item.employeeContribution;
        const value = employeeRate !== undefined && employeeRate !== null ? employeeRate : 'N/A';
        return (
          <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg font-semibold">
            {value}%
          </span>
        );
      },
    },
    {
      key: 'employerContribution',
      label: 'Employer Contribution',
      render: (item: ConfigurationItem) => {
        const employerRate = (item as any).employerRate || item.employerContribution;
        const value = employerRate !== undefined && employerRate !== null ? employerRate : 'N/A';
        return (
          <span className="px-3 py-1 bg-green-100 text-green-700 rounded-lg font-semibold">
            {value}%
          </span>
        );
      },
    },
    {
      key: 'createdAt',
      label: 'Created',
      render: (item: ConfigurationItem) => {
        const date = item.createdAt;
        return date ? new Date(date).toLocaleDateString() : 'N/A';
      },
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-blue-50 to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-2">
            <div className="p-3 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl shadow-lg">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
              </svg>
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">
                Insurance Oversight
              </h1>
              <p className="text-gray-600 mt-1 text-sm">
                Review and approve insurance bracket configurations (HR Manager only)
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-xl shadow-lg flex items-center gap-3">
            <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <p className="text-red-800 font-semibold">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-50 border-2 border-green-200 rounded-xl shadow-lg flex items-center gap-3">
            <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <p className="text-green-800 font-semibold">{success}</p>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          {(['draft', 'approved', 'rejected'] as const).map((status) => {
            const statusConfig = {
              draft: { border: 'border-amber-200', bg: 'bg-amber-100', icon: 'text-amber-600', bgIcon: 'bg-amber-100', gradient: 'from-amber-50 to-yellow-50', label: 'Draft' },
              approved: { border: 'border-green-200', bg: 'bg-green-100', icon: 'text-green-600', bgIcon: 'bg-green-100', gradient: 'from-green-50 to-emerald-50', label: 'Approved' },
              rejected: { border: 'border-red-200', bg: 'bg-red-100', icon: 'text-red-600', bgIcon: 'bg-red-100', gradient: 'from-red-50 to-rose-50', label: 'Rejected' }
            };
            const config = statusConfig[status];
            const count = Array.isArray(insuranceBrackets) 
              ? insuranceBrackets.filter(b => String(b.status || '').toLowerCase() === status).length 
              : 0;
            return (
              <div key={status} className={`p-6 bg-gradient-to-br ${config.gradient} rounded-2xl border-2 ${config.border} shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2">{config.label}</p>
                    <p className="text-3xl font-bold text-gray-900">{count}</p>
                  </div>
                  <div className={`p-3 ${config.bgIcon} rounded-xl`}>
                    <svg className={`w-6 h-6 ${config.icon}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {status === 'draft' && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>}
                      {status === 'approved' && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>}
                      {status === 'rejected' && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path>}
                    </svg>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="bg-white/80 backdrop-blur-sm shadow-2xl rounded-2xl border border-white/20 overflow-hidden">
          <div className="p-8">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-cyan-100 rounded-lg">
                  <svg className="w-6 h-6 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                  </svg>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Insurance Brackets</h2>
                  <p className="text-gray-600 mt-1 text-sm">
                    {Array.isArray(insuranceBrackets) ? insuranceBrackets.length : 0} insurance bracket(s) configured
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as ConfigStatus | 'all')}
                  className="px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-medium text-gray-700 bg-white hover:border-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all duration-200"
                >
                  <option value="all">All Statuses</option>
                  <option value="draft">Draft</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
                <button
                  onClick={loadInsuranceBrackets}
                  disabled={isLoading}
                  className="px-4 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-xl text-sm font-semibold shadow-lg hover:shadow-xl hover:from-cyan-700 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 disabled:transform-none flex items-center gap-2"
                >
                  <svg className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                  </svg>
                  Refresh
                </button>
              </div>
            </div>
            <div>
          <ConfigurationTable
            data={tableData}
            columns={columns}
            isLoading={isLoading}
            onView={(item) => {
              const found = Array.isArray(insuranceBrackets) ? insuranceBrackets.find((b) => b._id === item._id) : null;
              if (found) handleView(found);
            }}
            onApprove={(item) =>
              setApprovalModal({
                isOpen: true,
                item: (Array.isArray(insuranceBrackets) ? insuranceBrackets.find((b) => b._id === item._id) : null) || null,
              })
            }
            onReject={(item) =>
              setRejectionModal({
                isOpen: true,
                item: (Array.isArray(insuranceBrackets) ? insuranceBrackets.find((b) => b._id === item._id) : null) || null,
              })
            }
            onDelete={(item) => {
              const found = Array.isArray(insuranceBrackets) ? insuranceBrackets.find((b) => b._id === item._id) : null;
              if (found) handleDelete(found);
            }}
            canApprove={(item) => item.status === 'draft'}
            canReject={(item) => item.status === 'draft'}
            canDelete={(item) => item.status === 'draft'}
          />
            </div>
          </div>
        </div>
      </div>

      <ApprovalModal
        isOpen={approvalModal.isOpen}
        onClose={() => setApprovalModal({ isOpen: false, item: null })}
        onApprove={handleApprove}
        title="Approve Insurance Bracket"
        isLoading={isProcessing}
      />

      <RejectionModal
        isOpen={rejectionModal.isOpen}
        onClose={() => setRejectionModal({ isOpen: false, item: null })}
        onReject={handleReject}
        title="Reject Insurance Bracket"
        isLoading={isProcessing}
      />

      <ViewDetailsModal
        isOpen={viewModal.isOpen}
        onClose={() => setViewModal({ isOpen: false, item: null, details: null })}
        title="Insurance Bracket Details"
        data={viewModal.details}
        type="insurance-brackets"
      />
    </div>
  );
}

