"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/hooks/use-auth';
import { useRequireAuth } from '@/lib/hooks/use-auth';
import { SystemRole } from '@/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/shared/ui/Card';
import { Button } from '@/components/shared/ui/Button';
import { ConfigurationTable, ConfigurationItem } from '@/components/payroll-configuration/ConfigurationTable';
import { ApprovalModal } from '@/components/payroll-configuration/ApprovalModal';
import { RejectionModal } from '@/components/payroll-configuration/RejectionModal';
import { ViewDetailsModal } from '@/components/payroll-configuration/ViewDetailsModal';
import { approvalsApi, configDetailsApi, PendingApproval } from '@/lib/api/payroll-configuration';

export default function ApprovalsPage() {
  const { user } = useAuth();
  useRequireAuth(SystemRole.PAYROLL_MANAGER);

  const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('all');

  // Modal states
  const [approvalModal, setApprovalModal] = useState<{
    isOpen: boolean;
    item: PendingApproval | null;
  }>({ isOpen: false, item: null });
  const [rejectionModal, setRejectionModal] = useState<{
    isOpen: boolean;
    item: PendingApproval | null;
  }>({ isOpen: false, item: null });
  const [viewModal, setViewModal] = useState<{
    isOpen: boolean;
    item: PendingApproval | null;
    details: any;
  }>({ isOpen: false, item: null, details: null });
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  useEffect(() => {
    loadPendingApprovals();
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

  const loadPendingApprovals = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await approvalsApi.getPendingApprovals();
      // Ensure data is always an array
      if (Array.isArray(data)) {
        setPendingApprovals(data);
      } else if (data && typeof data === 'object') {
        // Handle case where API returns { data: [...] } or { pendingApprovals: [...] }
        const arrayData = (data as any).data || (data as any).pendingApprovals || [];
        setPendingApprovals(Array.isArray(arrayData) ? arrayData : []);
      } else {
        setPendingApprovals([]);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load pending approvals');
      // Use empty array for UI structure when backend is not ready
      setPendingApprovals([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (comment?: string) => {
    if (!approvalModal.item) return;

    try {
      setIsProcessing(true);
      setError(null);
      await approvalsApi.approve(
        approvalModal.item.type,
        approvalModal.item._id,
        comment ? { comment } : undefined
      );
      setSuccess('Configuration approved successfully');
      setApprovalModal({ isOpen: false, item: null });
      await loadPendingApprovals();
    } catch (err: any) {
      setError(err.message || 'Failed to approve configuration');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async (reason: string) => {
    if (!rejectionModal.item) return;

    try {
      setIsProcessing(true);
      setError(null);
      await approvalsApi.reject(
        rejectionModal.item.type,
        rejectionModal.item._id,
        { comment: reason }
      );
      setSuccess('Configuration rejected successfully');
      setRejectionModal({ isOpen: false, item: null });
      await loadPendingApprovals();
    } catch (err: any) {
      setError(err.message || 'Failed to reject configuration');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async (item: PendingApproval) => {
    if (!confirm('Are you sure you want to delete this configuration?')) {
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);
      await approvalsApi.delete(item.type, item._id);
      setSuccess('Configuration deleted successfully');
      await loadPendingApprovals();
    } catch (err: any) {
      setError(err.message || 'Failed to delete configuration');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleView = async (item: PendingApproval) => {
    try {
      setIsLoadingDetails(true);
      const details = await configDetailsApi.getById(item.type, item._id);
      setViewModal({
        isOpen: true,
        item,
        details,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to load configuration details');
      // Fallback: show data from the item itself
      setViewModal({
        isOpen: true,
        item,
        details: item.data || item,
      });
    } finally {
      setIsLoadingDetails(false);
    }
  };

  // Filter approvals by type
  const filteredApprovals = Array.isArray(pendingApprovals)
    ? (filterType === 'all'
        ? pendingApprovals
        : pendingApprovals.filter((item) => item.type === filterType))
    : [];

  // Get unique types for filter
  const types = Array.isArray(pendingApprovals)
    ? Array.from(new Set(pendingApprovals.map((item) => item.type)))
    : [];

  // Transform pending approvals to table format
  const tableData: ConfigurationItem[] = filteredApprovals.map((item) => ({
    _id: item._id,
    status: item.status,
    type: item.type,
    data: item.data,
    ...item.data, // Spread the actual data for display
  }));

  // Define columns based on common fields
  const columns = [
    {
      key: 'type',
      label: 'Type',
      render: (item: ConfigurationItem) => (
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-gradient-to-br from-amber-100 to-orange-100 rounded-lg">
            <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
            </svg>
          </div>
          <span className="font-semibold text-gray-900 capitalize">
            {item.type?.replace(/-/g, ' ') || 'Unknown'}
          </span>
        </div>
      ),
    },
    {
      key: 'name',
      label: 'Name/Title',
      render: (item: ConfigurationItem) => {
        // Try to find a name/title field in the data based on type
        let nameField = 'N/A';
        if (item.grade) nameField = item.grade;
        else if (item.name) nameField = item.name;
        else if (item.policyName) nameField = item.policyName;
        else if (item.type) nameField = item.type;
        return (
          <div>
            <span className="font-semibold text-gray-900">{nameField}</span>
          </div>
        );
      },
    },
    {
      key: 'details',
      label: 'Details',
      render: (item: ConfigurationItem) => {
        // Show relevant details based on type
        const details: string[] = [];
        if (item.baseSalary) details.push(`Base: ${item.baseSalary.toLocaleString()} EGP`);
        if (item.grossSalary) details.push(`Gross: ${item.grossSalary.toLocaleString()} EGP`);
        if (item.amount && !item.baseSalary) details.push(`${item.amount.toLocaleString()} EGP`);
        if (item.policyType) details.push(`Type: ${item.policyType}`);
        if (item.minSalary && item.maxSalary) {
          details.push(`${item.minSalary.toLocaleString()}-${item.maxSalary.toLocaleString()} EGP`);
        }
        return (
          <div className="flex flex-wrap gap-1">
            {details.map((detail, idx) => (
              <span key={idx} className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-amber-100 text-amber-800">
                {detail}
              </span>
            ))}
            {details.length === 0 && <span className="text-sm text-gray-400">—</span>}
          </div>
        );
      },
    },
    {
      key: 'createdBy',
      label: 'Created By',
      render: (item: ConfigurationItem) => {
        const createdBy = item.createdBy || item.data?.createdBy;
        if (!createdBy) return <span className="text-gray-400">N/A</span>;
        let displayName = '';
        if (typeof createdBy === 'object') {
          const name = `${createdBy.firstName || ''} ${createdBy.lastName || ''}`.trim();
          displayName = name || createdBy.email || 'Unknown';
        } else {
          displayName = createdBy;
        }
        return (
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center text-white text-xs font-semibold">
              {displayName ? displayName.charAt(0).toUpperCase() : '?'}
            </div>
            <span className="text-sm font-medium text-gray-700">{displayName}</span>
          </div>
        );
      },
    },
    {
      key: 'createdAt',
      label: 'Created',
      render: (item: ConfigurationItem) => {
        const date = item.createdAt || item.data?.createdAt;
        return date ? (
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
            </svg>
            <span className="text-sm font-medium text-gray-700">{new Date(date).toLocaleDateString()}</span>
          </div>
        ) : (
          <span className="text-sm text-gray-400">N/A</span>
        );
      },
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl shadow-lg">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">Approval Dashboard</h1>
            <p className="text-gray-600 mt-1 text-sm">
              Review and approve pending payroll configurations (Payroll Manager only)
            </p>
          </div>
        </div>

        {/* Stats Banner */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-600 rounded-2xl shadow-xl p-6 mb-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-amber-100 text-sm font-medium mb-1">Pending Approvals</p>
              <p className="text-4xl font-bold">{Array.isArray(pendingApprovals) ? pendingApprovals.length : 0}</p>
              <p className="text-amber-100 text-xs mt-1">Configuration(s) awaiting your review</p>
            </div>
            <div className="p-4 bg-white/20 rounded-xl backdrop-blur-sm">
              <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
              </svg>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border-2 border-red-300 bg-red-50 p-4 shadow-lg">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <p className="text-red-800 font-semibold">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="mb-6 rounded-xl border-2 border-green-300 bg-green-50 p-4 shadow-lg">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <p className="text-green-800 font-semibold">{success}</p>
          </div>
        </div>
      )}

      <div className="bg-white/80 backdrop-blur-sm shadow-2xl rounded-2xl border border-white/20 overflow-hidden">
        <div className="px-6 py-6 sm:px-8 sm:py-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">Pending Approvals</h2>
              <p className="text-sm text-gray-600">
                {Array.isArray(pendingApprovals) ? pendingApprovals.length : 0} configuration(s) awaiting approval
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"></path>
                </svg>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="px-4 py-2 text-sm font-medium border-2 border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white text-gray-700 transition-all duration-200 hover:border-amber-300"
                >
                  <option value="all">All Types</option>
                  {types.map((type) => (
                    <option key={type} value={type}>
                      {type.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={loadPendingApprovals}
                disabled={isLoading}
                className="px-4 py-2 border-2 border-amber-200 rounded-lg text-sm font-semibold text-amber-700 hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 transition-all duration-200 flex items-center hover:border-amber-300 disabled:opacity-50"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                </svg>
                Refresh
              </button>
            </div>
          </div>

          <ConfigurationTable
            data={tableData}
            columns={columns}
            isLoading={isLoading}
            onView={(item) => {
              const found = Array.isArray(pendingApprovals) ? pendingApprovals.find((p) => p._id === item._id) : null;
              if (found) handleView(found);
            }}
            onApprove={(item) =>
              setApprovalModal({
                isOpen: true,
                item: (Array.isArray(pendingApprovals) ? pendingApprovals.find((p) => p._id === item._id) : null) || null,
              })
            }
            onReject={(item) =>
              setRejectionModal({
                isOpen: true,
                item: (Array.isArray(pendingApprovals) ? pendingApprovals.find((p) => p._id === item._id) : null) || null,
              })
            }
            onDelete={(item) => {
              const found = Array.isArray(pendingApprovals) ? pendingApprovals.find((p) => p._id === item._id) : null;
              if (found) handleDelete(found);
            }}
            canApprove={() => true}
            canReject={() => true}
            canDelete={(item) => item.status === 'draft'}
          />
        </div>
      </div>

      <ApprovalModal
        isOpen={approvalModal.isOpen}
        onClose={() => setApprovalModal({ isOpen: false, item: null })}
        onApprove={handleApprove}
        title={`Approve ${approvalModal.item?.type?.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()) || 'Configuration'}`}
        isLoading={isProcessing}
      />

      <RejectionModal
        isOpen={rejectionModal.isOpen}
        onClose={() => setRejectionModal({ isOpen: false, item: null })}
        onReject={handleReject}
        title={`Reject ${rejectionModal.item?.type?.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()) || 'Configuration'}`}
        isLoading={isProcessing}
      />

      <ViewDetailsModal
        isOpen={viewModal.isOpen}
        onClose={() => setViewModal({ isOpen: false, item: null, details: null })}
        title={`${viewModal.item?.type?.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()) || 'Configuration'} Details`}
        data={viewModal.details}
        type={viewModal.item?.type || ''}
      />
    </div>
  );
}

