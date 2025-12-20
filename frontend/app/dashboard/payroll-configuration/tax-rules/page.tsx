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
  // All roles can view, but only Legal Admin can create/edit
  const { user } = useAuth();
  const isLegalAdmin = user?.roles?.some(role => 
    String(role).toLowerCase() === String(SystemRole.LEGAL_POLICY_ADMIN).toLowerCase()
  );
  
  // Allow all authenticated users to view
  useRequireAuth(undefined, '/dashboard');
  
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
          <div className="p-2 bg-gradient-to-br from-slate-500/30 to-gray-500/30 rounded-lg border border-white/20">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
            </svg>
          </div>
          <div>
            <div className="font-semibold text-white">{item.name}</div>
            {item.description && (
              <div className="text-xs text-white/70 mt-0.5 max-w-xs truncate">{item.description}</div>
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
            <span className="text-2xl font-bold text-white">{item.rate}%</span>
          </div>
          <div className="text-xs text-white/70">Tax rate</div>
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
            <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full flex items-center justify-center text-white text-xs font-semibold">
              {createdByDisplay ? createdByDisplay.charAt(0).toUpperCase() : '?'}
            </div>
            <span className="text-sm font-medium text-white">{createdByDisplay || 'N/A'}</span>
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
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div className="space-y-2">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-gradient-to-br from-slate-600 via-gray-700 to-zinc-800 rounded-2xl shadow-2xl transform hover:scale-105 transition-transform duration-300">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
                  </svg>
                </div>
                <div>
                  <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-2 drop-shadow-lg">Tax Rules</h1>
                  <p className="text-white/80 text-lg">
                    {isLegalAdmin ? 'Manage tax rules and rates' : 'View tax rules and rates (Read-only)'}
                  </p>
                </div>
              </div>
            </div>
            {isLegalAdmin && (
              <button
                onClick={handleCreateNew}
                className="group relative px-6 py-3 bg-gradient-to-r from-slate-600 via-gray-700 to-zinc-800 text-white text-sm font-bold rounded-xl shadow-2xl hover:shadow-slate-500/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 transition-all duration-300 flex items-center transform hover:scale-105 overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-slate-700 via-gray-800 to-zinc-900 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <svg className="w-5 h-5 mr-2 relative z-10 group-hover:rotate-90 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path>
                </svg>
                <span className="relative z-10">Create New Tax Rule</span>
              </button>
            )}
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
            {(['draft', 'approved', 'rejected'] as const).map((status) => {
              const statusConfig = {
                draft: { gradient: 'from-amber-500 to-orange-600', icon: 'text-amber-300', border: 'border-amber-500/30' },
                approved: { gradient: 'from-green-500 to-emerald-600', icon: 'text-green-300', border: 'border-green-500/30' },
                rejected: { gradient: 'from-red-500 to-rose-600', icon: 'text-red-300', border: 'border-red-500/30' }
              };
              const config = statusConfig[status];
              return (
                <div key={status} className={`relative rounded-2xl shadow-2xl border ${config.border} overflow-hidden backdrop-blur-xl bg-white/10 hover:bg-white/15 transition-all duration-300 hover:scale-105`}>
                  <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${config.gradient}`}></div>
                  <div className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`p-3 bg-gradient-to-br ${config.gradient} rounded-xl shadow-lg`}>
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
                          <p className="text-sm font-medium text-white/70 mb-1">{status.charAt(0).toUpperCase() + status.slice(1)}</p>
                          <p className="text-3xl font-bold text-white">{getStatusCount(status)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Table Container */}
        <div className="relative rounded-3xl shadow-2xl border border-white/20 overflow-hidden backdrop-blur-xl bg-white/10">
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-white/10"></div>
          <div className="relative px-6 py-6 sm:px-8 sm:py-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
              <div className="flex items-center space-x-3">
                <svg className="w-5 h-5 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"></path>
                </svg>
                <label className="text-sm font-semibold text-white">Filter by status:</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2 text-sm font-medium border-2 border-white/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500 bg-white/10 backdrop-blur-md text-white transition-all duration-200 hover:border-white/50"
                  style={{ colorScheme: 'dark' }}
                >
                  <option value="all" className="bg-slate-900 text-white">All Statuses</option>
                  <option value="draft" className="bg-slate-900 text-white">Draft</option>
                  <option value="approved" className="bg-slate-900 text-white">Approved</option>
                  <option value="rejected" className="bg-slate-900 text-white">Rejected</option>
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

