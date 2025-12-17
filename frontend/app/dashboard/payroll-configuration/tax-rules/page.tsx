'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useRequireAuth, useAuth } from '@/lib/hooks/use-auth';
import { SystemRole } from '@/types';
import ConfigurationTable from '@/components/payroll-configuration/ConfigurationTable';
import StatusBadge from '@/components/payroll-configuration/StatusBadge';
import { taxRulesApi } from '@/lib/api/payroll-configuration/tax-rules';
import { TaxRule } from '@/lib/api/payroll-configuration/types';

export default function TaxRulesPage() {
  // Allow view access for multiple roles, but only Legal Admin can create/edit
  useRequireAuth(
    [
      SystemRole.LEGAL_POLICY_ADMIN,
      SystemRole.PAYROLL_SPECIALIST,
      SystemRole.PAYROLL_MANAGER,
      SystemRole.SYSTEM_ADMIN,
      SystemRole.HR_MANAGER,
      SystemRole.HR_ADMIN,
      SystemRole.DEPARTMENT_EMPLOYEE,
      SystemRole.DEPARTMENT_HEAD,
    ],
    '/dashboard'
  );
  
  const { user } = useAuth();
  const isLegalAdmin = user?.roles?.some(role => 
    String(role).toLowerCase() === String(SystemRole.LEGAL_POLICY_ADMIN).toLowerCase()
  );
  
  const router = useRouter();
  const [taxRules, setTaxRules] = useState<TaxRule[]>([]);
  const [allTaxRules, setAllTaxRules] = useState<TaxRule[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    loadTaxRules();
  }, [statusFilter]);

  const loadTaxRules = async () => {
    setIsLoading(true);
    try {
      const status = statusFilter !== 'all' ? statusFilter as 'draft' | 'approved' | 'rejected' : undefined;
      const data = await taxRulesApi.getAll(status);
      setAllTaxRules(data);
      setTaxRules(data);
    } catch (error) {
      console.error('Error loading tax rules:', error);
      setTaxRules([]);
      setAllTaxRules([]);
    } finally {
      setIsLoading(false);
    }
  };

  const columns = [
    { 
      key: 'name', 
      label: 'Tax Rule Name',
      render: (item: TaxRule) => (
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-slate-100 to-gray-100 rounded-lg">
            <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
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
      key: 'rate', 
      label: 'Rate',
      render: (item: TaxRule) => (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-slate-700">{item.rate}%</span>
          </div>
          <div className="text-xs text-gray-500">Tax rate</div>
        </div>
      )
    },
    { 
      key: 'createdBy', 
      label: 'Created By',
      render: (item: TaxRule) => {
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
            <div className="w-8 h-8 bg-gradient-to-br from-slate-400 to-gray-500 rounded-full flex items-center justify-center text-white text-xs font-semibold">
              {createdByDisplay ? createdByDisplay.charAt(0).toUpperCase() : '?'}
            </div>
            <span className="text-sm font-medium text-gray-700">{createdByDisplay || 'N/A'}</span>
          </div>
        );
      }
    },
    { 
      key: 'status', 
      label: 'Status',
      render: (item: TaxRule) => <StatusBadge status={item.status} />
    },
  ];

  const handleCreateNew = () => {
    router.push('/dashboard/payroll-configuration/tax-rules/new');
  };

  const handleView = (item: TaxRule) => {
    router.push(`/dashboard/payroll-configuration/tax-rules/${item._id}`);
  };

  const handleEdit = (item: TaxRule) => {
    // Only Legal Admin can edit
    if (!isLegalAdmin) {
      alert('Only Legal Admin can edit tax rules.');
      return;
    }
    // Tax rules can be edited even if approved (they go back to draft)
    router.push(`/dashboard/payroll-configuration/tax-rules/${item._id}/edit`);
  };

  const handleDelete = async (item: TaxRule) => {
    // Only Legal Admin can delete
    if (!isLegalAdmin) {
      alert('Only Legal Admin can delete tax rules.');
      return;
    }
    
    if (item.status !== 'draft') {
      alert('Only draft tax rules can be deleted.');
      return;
    }

    if (!confirm(`Are you sure you want to delete "${item.name}"?`)) {
      return;
    }

    try {
      await taxRulesApi.delete(item._id);
      loadTaxRules(); // Refresh
    } catch (error) {
      console.error('Error deleting tax rule:', error);
      alert(error instanceof Error ? error.message : 'Failed to delete tax rule');
    }
  };

  const getStatusCount = (status: 'draft' | 'approved' | 'rejected') => {
    return allTaxRules.filter(g => {
      const normalizedStatus = String(g.status || '').toLowerCase();
      return normalizedStatus === status;
    }).length;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-zinc-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="p-4 bg-gradient-to-br from-slate-500 to-gray-600 rounded-2xl shadow-xl">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
                  </svg>
                </div>
                <div>
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-600 to-gray-600 bg-clip-text text-transparent">Tax Rules</h1>
                  <p className="text-gray-600 mt-1 text-sm">
                    {isLegalAdmin ? 'Manage tax rules and rates' : 'View tax rules and rates (Read-only)'}
                  </p>
                </div>
              </div>
            </div>
            {isLegalAdmin && (
              <button
                onClick={handleCreateNew}
                className="group relative px-6 py-3 bg-gradient-to-r from-slate-600 to-gray-600 text-white text-sm font-semibold rounded-xl shadow-lg hover:shadow-xl hover:from-slate-700 hover:to-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 transition-all duration-200 flex items-center transform hover:scale-105"
              >
                <svg className="w-5 h-5 mr-2 group-hover:rotate-90 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path>
                </svg>
                Create New Tax Rule
              </button>
            )}
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
            {(['draft', 'approved', 'rejected'] as const).map((status) => {
              const statusConfig = {
                draft: { border: 'border-amber-200', bg: 'bg-amber-100', icon: 'text-amber-600', bgIcon: 'bg-amber-100', gradient: 'from-amber-50 to-yellow-50' },
                approved: { border: 'border-green-200', bg: 'bg-green-100', icon: 'text-green-600', bgIcon: 'bg-green-100', gradient: 'from-green-50 to-emerald-50' },
                rejected: { border: 'border-red-200', bg: 'bg-red-100', icon: 'text-red-600', bgIcon: 'bg-red-100', gradient: 'from-red-50 to-rose-50' }
              };
              const config = statusConfig[status];
              return (
                <div key={status} className={`bg-gradient-to-br ${config.gradient} p-6 rounded-2xl shadow-xl border-2 ${config.border} hover:shadow-2xl transition-all duration-200 relative overflow-hidden transform hover:scale-105`}>
                  <div className={`absolute top-0 right-0 w-32 h-32 ${config.bg} rounded-full -mr-16 -mt-16 opacity-30`}></div>
                  <div className="relative flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 ${config.bgIcon} rounded-xl shadow-md`}>
                        {status === 'draft' && (
                          <svg className={`w-6 h-6 ${config.icon}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
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
                        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">{status}</p>
                        <p className="text-3xl font-bold text-gray-900">{getStatusCount(status)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-sm shadow-2xl rounded-2xl border border-white/20 overflow-hidden">
          <div className="px-6 py-6 sm:px-8 sm:py-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-slate-100 rounded-lg">
                  <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"></path>
                  </svg>
                </div>
                <label className="text-sm font-semibold text-gray-700">Filter by status:</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2 text-sm font-medium border-2 border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500 bg-white text-gray-700 transition-all duration-200 hover:border-slate-300 shadow-sm"
                >
                  <option value="all">All Statuses</option>
                  <option value="draft">Draft</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            </div>

            <ConfigurationTable
              data={taxRules}
              columns={columns}
              onView={handleView}
              onEdit={isLegalAdmin ? handleEdit : undefined}
              onDelete={isLegalAdmin ? handleDelete : undefined}
              canEdit={isLegalAdmin ? () => true : () => false}
              canDelete={isLegalAdmin ? (item) => item.status === 'draft' : () => false}
              isLoading={isLoading}
              emptyMessage="No tax rules found."
            />
          </div>
        </div>
      </div>
    </div>
  );
}

