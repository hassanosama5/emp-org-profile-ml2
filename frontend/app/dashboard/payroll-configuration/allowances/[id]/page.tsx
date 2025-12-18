'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import StatusBadge from '@/components/payroll-configuration/StatusBadge';
import { allowancesApi } from '@/lib/api/payroll-configuration/allowances';

export default function AllowanceDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const allowanceId = params.id as string;
  const [allowance, setAllowance] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadAllowance();
  }, [allowanceId]);

  const loadAllowance = async () => {
    try {
      const data = await allowancesApi.getById(allowanceId);
      setAllowance(data);
    } catch (error) {
      console.error('Error loading allowance:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = () => {
    if (allowance?.status === 'draft') {
      router.push(`/dashboard/payroll-configuration/allowances/${allowanceId}/edit`);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 flex items-center justify-center">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-green-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading allowance...</p>
        </div>
      </div>
    );
  }

  if (!allowance) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 flex items-center justify-center">
        <div className="bg-white/80 backdrop-blur-sm shadow-2xl rounded-2xl p-8 max-w-md">
          <div className="text-center">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <p className="text-gray-600 font-medium text-lg">Allowance not found</p>
          </div>
        </div>
      </div>
    );
  }

  const getCreatedByName = () => {
    const createdBy = allowance.createdBy;
    if (!createdBy) return 'N/A';
    if (typeof createdBy === 'string') return createdBy;
    if (typeof createdBy === 'object') {
      const obj = createdBy as any;
      if (obj.firstName && obj.lastName) return `${obj.firstName} ${obj.lastName}`;
      if (obj.fullName) return obj.fullName;
      if (obj.email) return obj.email;
      return 'Unknown';
    }
    return 'N/A';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/dashboard/payroll-configuration/allowances')}
            className="mb-6 group flex items-center gap-2 text-gray-600 hover:text-green-600 transition-colors duration-200"
          >
            <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
            </svg>
            <span className="font-medium">Back to Allowances</span>
          </button>
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl shadow-xl">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v13m0-13V6a2 2 0 112 2v7m-6 4h12a2 2 0 002-2v-4a2 2 0 00-2-2H6a2 2 0 00-2 2v4a2 2 0 002 2zm10-10V7a2 2 0 00-2-2H8a2 2 0 00-2 2v3"></path>
                </svg>
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                  {allowance.name || 'Allowance'}
                </h1>
                <div className="flex items-center gap-3 mt-2">
                  <StatusBadge status={allowance.status} />
                  <span className="text-sm text-gray-500 font-mono">ID: {allowance.id}</span>
                </div>
              </div>
            </div>
            
            {allowance.status === 'draft' && (
              <button
                onClick={handleEdit}
                className="group px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl text-sm font-semibold shadow-lg hover:shadow-xl hover:from-green-700 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all duration-200 transform hover:scale-105 flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                </svg>
                Edit Allowance
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Details Card */}
          <div className="lg:col-span-2 bg-white/80 backdrop-blur-sm shadow-2xl rounded-2xl border border-white/20 overflow-hidden">
            <div className="p-8">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200">
                <div className="p-2 bg-green-100 rounded-lg">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Allowance Details</h2>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border-2 border-green-200">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">Allowance Name</label>
                  <p className="text-2xl font-bold text-green-700">{allowance.name || 'N/A'}</p>
                </div>
                <div className="p-6 bg-gradient-to-br from-teal-50 to-cyan-50 rounded-xl border-2 border-teal-200">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">Amount</label>
                  <p className="text-2xl font-bold text-teal-700">
                    {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: 'EGP'
                    }).format(allowance.amount || 0)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Metadata Card */}
          <div className="bg-white/80 backdrop-blur-sm shadow-2xl rounded-2xl border border-white/20 overflow-hidden">
            <div className="p-8">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-gray-900">Metadata</h2>
              </div>
              
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-xl">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">Created By</label>
                  <p className="text-sm font-medium text-gray-900">{getCreatedByName()}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">Created At</label>
                  <p className="text-sm font-medium text-gray-900">
                    {allowance.createdAt ? new Date(allowance.createdAt).toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    }) : 'N/A'}
                  </p>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">Last Updated</label>
                  <p className="text-sm font-medium text-gray-900">
                    {allowance.updatedAt ? new Date(allowance.updatedAt).toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    }) : 'N/A'}
                  </p>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">Version</label>
                  <p className="text-sm font-medium text-gray-900">{allowance.version || 1}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}