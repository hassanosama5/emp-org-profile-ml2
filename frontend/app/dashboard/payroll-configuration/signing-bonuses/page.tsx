'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useRequireAuth, useAuth } from '@/lib/hooks/use-auth';
import { SystemRole } from '@/types';
import ConfigurationTable from '@/components/payroll-configuration/ConfigurationTable';
import StatusBadge from '@/components/payroll-configuration/StatusBadge';
import { signingBonusesApi } from '@/lib/api/payroll-configuration/signing-bonuses';
import { SigningBonus } from '@/lib/api/payroll-configuration/types';

export default function SigningBonusesPage() {
  // All roles can view, but only Payroll Specialist can create/edit
  const { user } = useAuth();
  const canCreateEdit = user?.roles?.includes(SystemRole.PAYROLL_SPECIALIST);
  
  // Allow all authenticated users to view
  useRequireAuth(undefined, '/dashboard');
  
  const router = useRouter();
  const [signingBonuses, setSigningBonuses] = useState<SigningBonus[]>([]);
  const [allSigningBonuses, setAllSigningBonuses] = useState<SigningBonus[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    loadSigningBonuses();
  }, [statusFilter]);

  const loadSigningBonuses = async () => {
    setIsLoading(true);
    try {
      const status = statusFilter !== 'all' ? statusFilter as 'draft' | 'approved' | 'rejected' : undefined;
      const data = await signingBonusesApi.getAll(status);
      setAllSigningBonuses(data);
      setSigningBonuses(data);
    } catch (error) {
      console.error('Error loading signing bonuses:', error);
      setSigningBonuses([]);
      setAllSigningBonuses([]);
    } finally {
      setIsLoading(false);
    }
  };

  const columns = [
    { 
      key: 'positionName', 
      label: 'Position Name',
      render: (item: SigningBonus) => (
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-yellow-500/20 to-amber-500/20 backdrop-blur-md rounded-lg border border-white/20">
            <svg className="w-5 h-5 text-yellow-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
            </svg>
          </div>
          <div>
            <div className="font-bold text-white">{(item as any).positionName || 'N/A'}</div>
            <div className="text-xs text-white/70 mt-0.5">Eligible position</div>
          </div>
        </div>
      )
    },
    { 
      key: 'amount', 
      label: 'Amount',
      render: (item: SigningBonus) => (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-yellow-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span className="text-lg font-bold text-white">
              {new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'EGP',
                minimumFractionDigits: 0
              }).format(item.amount)}
            </span>
          </div>
          <div className="text-xs text-white/70">One-time bonus</div>
        </div>
      )
    },
    { 
      key: 'status', 
      label: 'Status',
      render: (item: SigningBonus) => <StatusBadge status={item.status} />
    },
  ];

  const handleCreateNew = () => {
    router.push('/dashboard/payroll-configuration/signing-bonuses/new');
  };

  const handleView = (item: SigningBonus) => {
    router.push(`/dashboard/payroll-configuration/signing-bonuses/${item._id}`);
  };

  const handleEdit = (item: SigningBonus) => {
    if (item.status === 'draft') {
      router.push(`/dashboard/payroll-configuration/signing-bonuses/${item._id}/edit`);
    } else {
      alert('Only draft signing bonuses can be edited.');
    }
  };

  const handleDelete = async (item: SigningBonus) => {
    if (item.status !== 'draft') {
      alert('Only draft signing bonuses can be deleted.');
      return;
    }

    const positionName = (item as any).positionName || 'this signing bonus';
    if (!confirm(`Are you sure you want to delete "${positionName}"?`)) {
      return;
    }

    try {
      await signingBonusesApi.delete(item._id);
      loadSigningBonuses(); // Refresh
    } catch (error) {
      console.error('Error deleting signing bonus:', error);
      alert(error instanceof Error ? error.message : 'Failed to delete signing bonus');
    }
  };

  const getStatusCount = (status: 'draft' | 'approved' | 'rejected') => {
    return allSigningBonuses.filter(g => {
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
                <div className="p-4 bg-gradient-to-br from-yellow-500 via-amber-600 to-orange-600 rounded-2xl shadow-2xl transform hover:scale-105 transition-transform duration-300">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </div>
                <div>
                  <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-2 drop-shadow-lg">Signing Bonuses</h1>
                  <p className="text-white/80 text-lg">Manage signing bonus configurations for new employees</p>
                </div>
              </div>
            </div>
            {canCreateEdit && (
              <button
                onClick={handleCreateNew}
                className="group relative px-6 py-3 bg-gradient-to-r from-yellow-600 via-amber-600 to-orange-600 text-white text-sm font-bold rounded-xl shadow-2xl hover:shadow-yellow-500/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 transition-all duration-300 flex items-center transform hover:scale-105 overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-yellow-700 via-amber-700 to-orange-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <svg className="w-5 h-5 mr-2 relative z-10 group-hover:rotate-90 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path>
                </svg>
                <span className="relative z-10">Create New Signing Bonus</span>
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
                  className="px-4 py-2 text-sm font-medium border-2 border-white/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 bg-white/10 backdrop-blur-md text-white transition-all duration-200 hover:border-white/50"
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
              data={signingBonuses}
              columns={columns}
              onView={handleView}
              onEdit={canCreateEdit ? handleEdit : undefined}
              canEdit={canCreateEdit ? (item) => item.status?.toLowerCase() === 'draft' : () => false}
              onDelete={undefined}
              canDelete={() => false}
              isLoading={isLoading}
              emptyMessage="No signing bonuses found. Create your first signing bonus to get started."
            />
          </div>
        </div>
      </div>
    </div>
  );
}

