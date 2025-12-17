'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useRequireAuth } from '@/lib/hooks/use-auth';
import { SystemRole } from '@/types';
import ConfigurationTable from '@/components/payroll-configuration/ConfigurationTable';
import StatusBadge from '@/components/payroll-configuration/StatusBadge';
import { payGradesApi } from '@/lib/api/payroll-configuration/payGrades';

export default function PayGradesPage() {
  // Only Payroll Specialist can create/edit pay grades
  useRequireAuth(SystemRole.PAYROLL_SPECIALIST, '/dashboard');
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
          <div className="p-2 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-lg">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
            </svg>
          </div>
          <div>
            <div className="font-semibold text-gray-900">{item.name}</div>
            <div className="text-xs text-gray-500 mt-0.5">Grade Level</div>
          </div>
        </div>
      )
    },
    { 
      key: 'salary', 
      label: 'Salary Range',
      render: (item: any) => (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span className="font-semibold text-gray-900">
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
          <div className="text-xs text-gray-500">Annual compensation range</div>
        </div>
      )
    },
    { 
      key: 'createdBy', 
      label: 'Created By',
      render: (item: any) => {
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
            <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full flex items-center justify-center text-white text-xs font-semibold">
              {createdByDisplay ? createdByDisplay.charAt(0).toUpperCase() : '?'}
            </div>
            <span className="text-sm font-medium text-gray-700">{createdByDisplay || 'N/A'}</span>
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

  const handleDelete = async (item: any) => {
    if (item.status !== 'draft') {
      alert('Only draft pay grades can be deleted.');
      return;
    }

    if (!confirm(`Are you sure you want to delete "${item.name}"?`)) {
      return;
    }

    try {
      await payGradesApi.delete(item.id);
      loadPayGrades(); // Refresh
    } catch (error) {
      console.error('Error deleting pay grade:', error);
      alert(error instanceof Error ? error.message : 'Failed to delete pay grade');
    }
  };

  const getStatusCount = (status: 'draft' | 'approved' | 'rejected') => {
    return allPayGrades.filter(g => {
      const normalizedStatus = String(g.status || '').toLowerCase();
      return normalizedStatus === status;
    }).length;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Pay Grades</h1>
                <p className="text-gray-600 mt-1 text-sm">Define salary ranges and compensation levels for different job grades</p>
              </div>
            </div>
          </div>
          <button
            onClick={handleCreateNew}
            className="group relative px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-semibold rounded-xl shadow-lg hover:shadow-xl hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 flex items-center transform hover:scale-105"
          >
            <svg className="w-5 h-5 mr-2 group-hover:rotate-90 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path>
            </svg>
            Create New Pay Grade
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-2xl shadow-lg border border-blue-100 hover:shadow-xl transition-shadow duration-200 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-100 rounded-full -mr-16 -mt-16 opacity-50"></div>
            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-amber-100 rounded-xl">
                  <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Draft</p>
                  <p className="text-3xl font-bold text-gray-900">{getStatusCount('draft')}</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-2xl shadow-lg border border-green-100 hover:shadow-xl transition-shadow duration-200 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-green-100 rounded-full -mr-16 -mt-16 opacity-50"></div>
            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 rounded-xl">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Approved</p>
                  <p className="text-3xl font-bold text-gray-900">{getStatusCount('approved')}</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-2xl shadow-lg border border-red-100 hover:shadow-xl transition-shadow duration-200 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-red-100 rounded-full -mr-16 -mt-16 opacity-50"></div>
            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-red-100 rounded-xl">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Rejected</p>
                  <p className="text-3xl font-bold text-gray-900">{getStatusCount('rejected')}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Table Section */}
      <div className="bg-white/80 backdrop-blur-sm shadow-2xl rounded-2xl border border-white/20 overflow-hidden">
        <div className="px-6 py-6 sm:px-8 sm:py-8">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <div className="flex items-center space-x-3">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"></path>
              </svg>
              <label className="text-sm font-semibold text-gray-700">Filter by status:</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 text-sm font-medium border-2 border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-700 transition-all duration-200 hover:border-blue-300"
              >
                <option value="all">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <ConfigurationTable
            data={payGrades}
            columns={columns}
            onView={handleView}
            onEdit={handleEdit}
            onDelete={undefined}
            canDelete={() => false}
            isLoading={isLoading}
            emptyMessage="No pay grades found. Create your first pay grade to get started."
          />
        </div>
      </div>
    </div>
  );
}