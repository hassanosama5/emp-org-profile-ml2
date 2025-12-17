'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import StatusBadge from '@/components/payroll-configuration/StatusBadge';
import { terminationBenefitsApi } from '@/lib/api/payroll-configuration/termination-benefits';
import { TerminationBenefit } from '@/lib/api/payroll-configuration/types';

export default function TerminationBenefitDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const terminationBenefitId = params.id as string;
  const [terminationBenefit, setTerminationBenefit] = useState<TerminationBenefit | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTerminationBenefit();
  }, [terminationBenefitId]);

  const loadTerminationBenefit = async () => {
    try {
      setIsLoading(true);
      const data = await terminationBenefitsApi.getById(terminationBenefitId);
      setTerminationBenefit(data);
    } catch (err) {
      console.error('Error loading termination benefit:', err);
      setError(err instanceof Error ? err.message : 'Failed to load termination benefit');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = () => {
    if (terminationBenefit && terminationBenefit.status === 'draft') {
      router.push(`/dashboard/payroll-configuration/termination-benefits/${terminationBenefitId}/edit`);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-orange-50 to-amber-50 flex items-center justify-center">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-rose-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading termination benefit...</p>
        </div>
      </div>
    );
  }

  if (error || !terminationBenefit) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-orange-50 to-amber-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border-2 border-red-200 rounded-xl shadow-lg p-6 flex items-center gap-3">
            <svg className="w-6 h-6 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <p className="text-red-800 font-semibold">{error || 'Termination benefit not found'}</p>
          </div>
        </div>
      </div>
    );
  }

  const getCreatedByName = () => {
    if (!terminationBenefit.createdBy) return 'N/A';
    if (typeof terminationBenefit.createdBy === 'string') return terminationBenefit.createdBy;
    const createdBy = terminationBenefit.createdBy as any;
    if (createdBy && typeof createdBy === 'object') {
      if (createdBy.firstName && createdBy.lastName) {
        return `${createdBy.firstName} ${createdBy.lastName}`;
      }
      return createdBy.email || createdBy.fullName || 'N/A';
    }
    return 'N/A';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-orange-50 to-amber-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/dashboard/payroll-configuration/termination-benefits')}
            className="mb-6 group flex items-center gap-2 text-gray-600 hover:text-rose-600 transition-colors duration-200"
          >
            <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
            </svg>
            <span className="font-medium">Back to Termination Benefits</span>
          </button>
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-gradient-to-br from-rose-500 to-orange-600 rounded-2xl shadow-xl">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
                </svg>
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-rose-600 to-orange-600 bg-clip-text text-transparent">
                  {terminationBenefit.name}
                </h1>
                <div className="flex items-center gap-3 mt-2">
                  <StatusBadge status={terminationBenefit.status} />
                  <span className="text-sm text-gray-500 font-mono">ID: {terminationBenefit._id}</span>
                </div>
              </div>
            </div>
            
            {terminationBenefit.status === 'draft' && (
              <button
                onClick={handleEdit}
                className="group px-6 py-3 bg-gradient-to-r from-rose-600 to-orange-600 text-white rounded-xl text-sm font-semibold shadow-lg hover:shadow-xl hover:from-rose-700 hover:to-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-500 transition-all duration-200 transform hover:scale-105 flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                </svg>
                Edit Termination Benefit
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Details Card */}
          <div className="lg:col-span-2 bg-white/80 backdrop-blur-sm shadow-2xl rounded-2xl border border-white/20 overflow-hidden">
            <div className="p-8">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200">
                <div className="p-2 bg-rose-100 rounded-lg">
                  <svg className="w-5 h-5 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Termination Benefit Details</h2>
              </div>
              
              <div className="space-y-6">
                {terminationBenefit.description && (
                  <div className="p-4 bg-rose-50 rounded-xl border border-rose-200">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">Description</label>
                    <p className="text-gray-800 leading-relaxed">{terminationBenefit.description}</p>
                  </div>
                )}
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {terminationBenefit.amount && (
                    <div className="p-6 bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl border-2 border-orange-200">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">Amount</label>
                      <p className="text-2xl font-bold text-orange-700">
                        {new Intl.NumberFormat('en-US', {
                          style: 'currency',
                          currency: 'EGP'
                        }).format(terminationBenefit.amount)}
                      </p>
                    </div>
                  )}
                  {(terminationBenefit as any).terms && (
                    <div className="p-6 bg-gradient-to-br from-rose-50 to-pink-50 rounded-xl border-2 border-rose-200">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">Terms</label>
                      <p className="text-sm font-medium text-rose-700">{(terminationBenefit as any).terms}</p>
                    </div>
                  )}
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
                    {new Date(terminationBenefit.createdAt).toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </p>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">Last Updated</label>
                  <p className="text-sm font-medium text-gray-900">
                    {new Date(terminationBenefit.updatedAt).toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
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

