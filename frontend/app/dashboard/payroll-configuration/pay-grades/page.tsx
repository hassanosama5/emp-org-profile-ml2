'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useRequireAuth, useAuth } from '@/lib/hooks/use-auth';
import { SystemRole } from '@/types';
import ConfigurationTable from '@/components/payroll-configuration/ConfigurationTable';
import StatusBadge from '@/components/payroll-configuration/StatusBadge';
import { payGradesApi } from '@/lib/api/payroll-configuration/payGrades';

export default function PayGradesPage() {
  // All roles can view, but only Payroll Specialist can create/edit
  const { user } = useAuth();
  const canCreateEdit = user?.roles?.includes(SystemRole.PAYROLL_SPECIALIST);
  
  // Allow all authenticated users to view
  useRequireAuth(undefined, '/dashboard');
  
  const router = useRouter();
  const [payGrades, setPayGrades] = useState<any[]>([]);
  const [allPayGrades, setAllPayGrades] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    loadPayGrades();
  }, [statusFilter]);

  const loadPayGrades = async () => {
    setIsLoading(true);
    try {
      const status = statusFilter !== 'all' ? statusFilter as 'draft' | 'approved' | 'rejected' : undefined;
      const data = await payGradesApi.getAll(status);
      setAllPayGrades(data);
      setPayGrades(data);
    } catch (error) {
      console.error('Error loading pay grades:', error);
      setPayGrades([]);
      setAllPayGrades([]);
    } finally {
      setIsLoading(false);
    }
  };

  const columns = [
    { 
      key: 'name', 
      label: 'Pay Grade Name',
      render: (item: any) => (
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 rounded-xl shadow-lg shadow-blue-500/30 transform group-hover:scale-110 transition-transform duration-200">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
            </svg>
          </div>
          <div>
            <div className="font-bold text-white group-hover:text-blue-200 transition-colors duration-200">{item.name}</div>
            <div className="text-xs text-white/70 mt-0.5 font-medium">Grade Level</div>
          </div>
        </div>
      )
    },
    { 
      key: 'salary', 
      label: 'Salary Range',
      render: (item: any) => (
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-green-500/20 rounded-lg border border-green-400/30">
              <svg className="w-4 h-4 text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
            <span className="font-semibold text-white text-base">
              {new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'EGP',
                minimumFractionDigits: 0
              }).format(item.minSalary || 0)} - {new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'EGP',
                minimumFractionDigits: 0
              }).format(item.maxSalary || 0)}
            </span>
          </div>
          <div className="text-xs text-white/70 font-medium ml-8">Annual compensation range</div>
        </div>
      )
    },
    { 
      key: 'createdBy', 
      label: 'Created By',
      render: (item: any) => {
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
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg shadow-blue-500/30 border-2 border-white/20">
              {createdByDisplay ? createdByDisplay.charAt(0).toUpperCase() : '?'}
            </div>
            <span className="text-sm font-semibold text-white">{createdByDisplay || 'N/A'}</span>
          </div>
        );
      }
    },
  ];

  const handleCreateNew = () => {
    router.push('/dashboard/payroll-configuration/pay-grades/new');
  };

  const handleView = (item: any) => {
    router.push(`/dashboard/payroll-configuration/pay-grades/${item.id}`);
  };

  const handleEdit = (item: any) => {
    if (item.status === 'draft') {
      router.push(`/dashboard/payroll-configuration/pay-grades/${item.id}/edit`);
    } else {
      alert('Only draft pay grades can be edited.');
    }
  };

  const getStatusCount = (status: 'draft' | 'approved' | 'rejected') => {
    return allPayGrades.filter(g => {
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
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-8">
            <div className="space-y-3">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-600 rounded-2xl shadow-2xl transform hover:scale-105 transition-transform duration-300">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                  </svg>
                </div>
                <div>
                  <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-2 drop-shadow-lg">
                    Pay Grades
                  </h1>
                  <p className="text-white/80 text-lg">Define salary ranges and compensation levels for different job grades</p>
                </div>
              </div>
            </div>
            {canCreateEdit && (
              <button
                onClick={handleCreateNew}
                className="group relative px-6 py-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white text-sm font-bold rounded-xl shadow-2xl hover:shadow-blue-500/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-300 flex items-center transform hover:scale-105 overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <svg className="w-5 h-5 mr-2 relative z-10 group-hover:rotate-90 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path>
                </svg>
                <span className="relative z-10">Create New Pay Grade</span>
              </button>
            )}
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
            {(['draft', 'approved', 'rejected'] as const).map((status) => {
              const statusConfig = {
                draft: { 
                  gradient: 'from-amber-500 via-yellow-500 to-orange-500',
                  iconBg: 'bg-amber-500/20',
                  iconColor: 'text-amber-300',
                  glow: 'shadow-amber-500/50'
                },
                approved: { 
                  gradient: 'from-emerald-500 via-green-500 to-teal-500',
                  iconBg: 'bg-emerald-500/20',
                  iconColor: 'text-emerald-300',
                  glow: 'shadow-emerald-500/50'
                },
                rejected: { 
                  gradient: 'from-rose-500 via-red-500 to-pink-500',
                  iconBg: 'bg-rose-500/20',
                  iconColor: 'text-rose-300',
                  glow: 'shadow-rose-500/50'
                }
              };
              const config = statusConfig[status];
              return (
                <div key={status} className="group relative">
                  <div className={`absolute -inset-0.5 bg-gradient-to-r ${config.gradient} rounded-2xl opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-500 ${config.glow}`}></div>
                  
                  <div className="relative rounded-2xl shadow-2xl border border-white/20 overflow-hidden transform transition-all duration-500 group-hover:-translate-y-1 group-hover:scale-[1.02]">
                    <div className={`absolute inset-0 bg-gradient-to-br ${config.gradient} opacity-90`}></div>
                    <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
                    <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${config.gradient}`}></div>
                    
                    <div className="relative p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`p-4 ${config.iconBg} backdrop-blur-md rounded-xl border border-white/20 shadow-lg`}>
                            {status === 'draft' && (
                              <svg className={`w-7 h-7 ${config.iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                              </svg>
                            )}
                            {status === 'approved' && (
                              <svg className={`w-7 h-7 ${config.iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                              </svg>
                            )}
                            {status === 'rejected' && (
                              <svg className={`w-7 h-7 ${config.iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                              </svg>
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-white/80 mb-1 uppercase tracking-wide">{status}</p>
                            <p className="text-4xl font-extrabold text-white drop-shadow-lg">{getStatusCount(status)}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Filter and Table Section */}
        <div className="relative rounded-3xl shadow-2xl border border-white/20 overflow-hidden backdrop-blur-xl bg-white/10">
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-white/10"></div>
          
          <div className="relative px-6 py-6 sm:px-8 sm:py-8">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-white/20 backdrop-blur-md rounded-lg border border-white/30">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"></path>
                  </svg>
                </div>
                <label className="text-sm font-semibold text-white">Filter by status:</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2 text-sm font-medium border-2 border-white/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/10 backdrop-blur-md text-white transition-all duration-200 hover:border-white/50"
                  style={{ colorScheme: 'dark' }}
                >
                  <option value="all" className="bg-slate-900 text-white">All Statuses</option>
                  <option value="draft" className="bg-slate-900 text-white">Draft</option>
                  <option value="approved" className="bg-slate-900 text-white">Approved</option>
                  <option value="rejected" className="bg-slate-900 text-white">Rejected</option>
                </select>
              </div>
            </div>

            {/* Table */}
            <ConfigurationTable
              data={payGrades}
              columns={columns}
              onView={handleView}
              onEdit={canCreateEdit ? handleEdit : undefined}
              canEdit={canCreateEdit ? (item) => item.status?.toLowerCase() === 'draft' : () => false}
              onDelete={undefined}
              canDelete={() => false}
              isLoading={isLoading}
              emptyMessage="No pay grades found. Create your first pay grade to get started."
            />
          </div>
        </div>
      </div>
    </div>
  );
}
