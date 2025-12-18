'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import StatusBadge from '@/components/payroll-configuration/StatusBadge';
import { insuranceBracketsApi } from '@/lib/api/payroll-configuration/insurance-brackets';
import { InsuranceBracket } from '@/lib/api/payroll-configuration/types';

export default function InsuranceBracketDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const insuranceBracketId = params.id as string;
  const [insuranceBracket, setInsuranceBracket] = useState<InsuranceBracket | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadInsuranceBracket();
  }, [insuranceBracketId]);

  const loadInsuranceBracket = async () => {
    try {
      setIsLoading(true);
      const data = await insuranceBracketsApi.getById(insuranceBracketId);
      setInsuranceBracket(data);
    } catch (err) {
      console.error('Error loading insurance bracket:', err);
      setError(err instanceof Error ? err.message : 'Failed to load insurance bracket');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = () => {
    if (insuranceBracket && insuranceBracket.status === 'draft') {
      router.push(`/dashboard/payroll-configuration/insurance-brackets/${insuranceBracketId}/edit`);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-cyan-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading insurance bracket...</p>
        </div>
      </div>
    );
  }

  if (error || !insuranceBracket) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-blue-50 to-indigo-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border-2 border-red-200 rounded-xl shadow-lg p-6 flex items-center gap-3">
            <svg className="w-6 h-6 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <p className="text-red-800 font-semibold">{error || 'Insurance bracket not found'}</p>
          </div>
        </div>
      </div>
    );
  }

  const getCreatedByName = () => {
    if (!insuranceBracket.createdBy) return 'N/A';
    if (typeof insuranceBracket.createdBy === 'string') return insuranceBracket.createdBy;
    const createdBy = insuranceBracket.createdBy as any;
    if (createdBy && typeof createdBy === 'object') {
      if (createdBy.firstName && createdBy.lastName) {
        return `${createdBy.firstName} ${createdBy.lastName}`;
      }
      return createdBy.email || createdBy.fullName || 'N/A';
    }
    return 'N/A';
  };

  const getApprovedByName = () => {
    if (!insuranceBracket.approvedBy) return null;
    if (typeof insuranceBracket.approvedBy === 'string') return insuranceBracket.approvedBy;
    const approvedBy = insuranceBracket.approvedBy as any;
    if (approvedBy && typeof approvedBy === 'object') {
      if (approvedBy.firstName && approvedBy.lastName) {
        return `${approvedBy.firstName} ${approvedBy.lastName}`;
      }
      return approvedBy.email || approvedBy.fullName || 'Unknown';
    }
    return 'Unknown';
  };

  const name = (insuranceBracket as any).name || 'Insurance Bracket';
  const employeeRate = (insuranceBracket as any).employeeRate || insuranceBracket.employeeContribution;
  const employerRate = (insuranceBracket as any).employerRate || insuranceBracket.employerContribution;

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-blue-50 to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/dashboard/payroll-configuration/insurance-brackets')}
            className="mb-6 group flex items-center gap-2 text-gray-600 hover:text-cyan-600 transition-colors duration-200"
          >
            <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
            </svg>
            <span className="font-medium">Back to Insurance Brackets</span>
          </button>
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl shadow-xl">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
                </svg>
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">
                  {name}
                </h1>
                <div className="flex items-center gap-3 mt-2">
                  <StatusBadge status={insuranceBracket.status} />
                  <span className="text-sm text-gray-500 font-mono">ID: {insuranceBracket._id}</span>
                </div>
              </div>
            </div>
            
            {insuranceBracket.status === 'draft' && (
              <button
                onClick={handleEdit}
                className="group px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-xl text-sm font-semibold shadow-lg hover:shadow-xl hover:from-cyan-700 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 transition-all duration-200 transform hover:scale-105 flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                </svg>
                Edit Insurance Bracket
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Details Card */}
          <div className="lg:col-span-2 bg-white/80 backdrop-blur-sm shadow-2xl rounded-2xl border border-white/20 overflow-hidden">
            <div className="p-8">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200">
                <div className="p-2 bg-cyan-100 rounded-lg">
                  <svg className="w-5 h-5 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Insurance Bracket Details</h2>
              </div>
              
              <div className="space-y-6">
                <div className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border-2 border-green-200">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 block">Salary Range</label>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Minimum</p>
                      <p className="text-xl font-bold text-green-700">
                        {new Intl.NumberFormat('en-US', {
                          style: 'currency',
                          currency: 'EGP'
                        }).format(insuranceBracket.minSalary)}
                      </p>
                    </div>
                    <div className="text-gray-400 mx-4 text-2xl">→</div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Maximum</p>
                      <p className="text-xl font-bold text-green-700">
                        {new Intl.NumberFormat('en-US', {
                          style: 'currency',
                          currency: 'EGP'
                        }).format(insuranceBracket.maxSalary)}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <div className="p-6 bg-gradient-to-br from-cyan-50 to-blue-50 rounded-xl border-2 border-cyan-200">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">Employee Rate</label>
                    <p className="text-3xl font-bold text-cyan-700">{employeeRate}%</p>
                  </div>
                  <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-200">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">Employer Rate</label>
                    <p className="text-3xl font-bold text-blue-700">{employerRate}%</p>
                  </div>
                  <div className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border-2 border-purple-200">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">Total Contribution</label>
                    <p className="text-3xl font-bold text-purple-700">
                      {employeeRate + employerRate}%
                    </p>
                  </div>
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
                {getApprovedByName() && (
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">Approved By</label>
                    <p className="text-sm font-medium text-gray-900">{getApprovedByName()}</p>
                  </div>
                )}
                {insuranceBracket.approvedAt && (
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">Approved At</label>
                    <p className="text-sm font-medium text-gray-900">
                      {new Date(insuranceBracket.approvedAt).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </p>
                  </div>
                )}
                <div className="p-4 bg-gray-50 rounded-xl">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">Created At</label>
                  <p className="text-sm font-medium text-gray-900">
                    {insuranceBracket.createdAt ? new Date(insuranceBracket.createdAt).toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    }) : 'N/A'}
                  </p>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">Last Updated</label>
                  <p className="text-sm font-medium text-gray-900">
                    {insuranceBracket.updatedAt ? new Date(insuranceBracket.updatedAt).toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    }) : 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

