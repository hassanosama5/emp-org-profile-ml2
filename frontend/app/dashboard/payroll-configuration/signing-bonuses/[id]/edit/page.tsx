'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { signingBonusesApi } from '@/lib/api/payroll-configuration/signing-bonuses';
import { SigningBonus } from '@/lib/api/payroll-configuration/types';
import { positionsApi } from '@/lib/api/organization-structure/positions.api';

export default function EditSigningBonusPage() {
  const params = useParams();
  const router = useRouter();
  const signingBonusId = params.id as string;
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isLoadingPositions, setIsLoadingPositions] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [positions, setPositions] = useState<Array<{ _id: string; title: string }>>([]);
  const [formData, setFormData] = useState({
    positionName: '',
    amount: '',
  });

  useEffect(() => {
    loadPositions();
    loadSigningBonus();
  }, [signingBonusId]);

  const loadPositions = async () => {
    try {
      setIsLoadingPositions(true);
      const allPositions = await positionsApi.getAllPositions({ isActive: true });
      setPositions(allPositions.map(p => ({ _id: p._id, title: p.title })));
    } catch (err) {
      console.error('Error loading positions:', err);
      setError('Failed to load positions. Please refresh the page.');
    } finally {
      setIsLoadingPositions(false);
    }
  };

  const loadSigningBonus = async () => {
    setIsLoadingData(true);
    try {
      const signingBonus = await signingBonusesApi.getById(signingBonusId);
      if (signingBonus.status !== 'draft') {
        setError('Only draft signing bonuses can be edited.');
        return;
      }
      setFormData({
        positionName: (signingBonus as any).positionName ?? '',
        amount: signingBonus.amount ? String(signingBonus.amount) : '',
      });
    } catch (err) {
      console.error('Error loading signing bonus:', err);
      setError(err instanceof Error ? err.message : 'Failed to load signing bonus');
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    
    try {
      // Validate form data
      if (!formData.positionName.trim()) {
        throw new Error('Position name is required');
      }
      if (!formData.amount || parseFloat(formData.amount) < 0) {
        throw new Error('Signing bonus amount must be non-negative');
      }
      
      // Prepare data for API - backend only expects positionName and amount
      const signingBonusData = {
        positionName: formData.positionName,
        amount: parseFloat(formData.amount),
      };
      
      await signingBonusesApi.update(signingBonusId, signingBonusData);
      
      // Redirect to signing bonuses list
      router.push('/dashboard/payroll-configuration/signing-bonuses');
    } catch (err) {
      console.error('Error updating signing bonus:', err);
      setError(err instanceof Error ? err.message : 'Failed to update signing bonus');
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  if (isLoadingData) {
    return (
      <div className="min-h-screen relative overflow-hidden">
        <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900"></div>
        <div className="relative z-10 flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-yellow-300 border-t-transparent mx-auto mb-4"></div>
            <p className="text-white font-medium">Loading signing bonus...</p>
          </div>
        </div>
      </div>
    );
  }

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
        <div className="max-w-4xl mx-auto mb-8">
          <button
            onClick={() => router.push('/dashboard/payroll-configuration/signing-bonuses')}
            className="mb-6 group flex items-center gap-2 text-white/80 hover:text-white transition-colors duration-200"
          >
            <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
            </svg>
            <span className="font-medium">Back to Signing Bonuses</span>
          </button>
          
          <div className="flex items-center gap-4 mb-2">
            <div className="p-4 bg-gradient-to-br from-yellow-500 via-amber-600 to-orange-600 rounded-2xl shadow-2xl transform hover:scale-105 transition-transform duration-300">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
              </svg>
            </div>
            <div>
              <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-2 drop-shadow-lg">
                Edit Signing Bonus
              </h1>
              <p className="text-white/80 text-lg">Update the signing bonus information</p>
            </div>
          </div>
        </div>

        {/* Form Card */}
        <div className="max-w-4xl mx-auto">
          {error && (
            <div className="mb-6 p-4 bg-red-500/20 backdrop-blur-md border-2 border-red-500/50 rounded-xl shadow-lg flex items-center gap-3">
              <svg className="w-5 h-5 text-red-300 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <p className="text-red-200 font-semibold">{error}</p>
            </div>
          )}

          <div className="relative rounded-3xl shadow-2xl border border-white/20 overflow-hidden backdrop-blur-xl bg-white/10">
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-white/10"></div>
            
            <form onSubmit={handleSubmit} className="relative p-8 space-y-8">
              {/* Signing Bonus Information */}
              <div className="space-y-6">
                <div className="flex items-center gap-3 pb-4 border-b border-white/20">
                  <div className="p-2 bg-white/20 backdrop-blur-md rounded-lg border border-white/30">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                  </div>
                  <h2 className="text-xl font-bold text-white">Signing Bonus Details</h2>
                </div>

              <div className="grid grid-cols-1 gap-6">
                {/* Position Name */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                    <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                    </svg>
                    Position Name <span className="text-red-500">*</span>
                  </label>
                  {isLoadingPositions ? (
                    <div className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50 flex items-center gap-2">
                      <svg className="animate-spin h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span className="text-gray-500">Loading positions...</span>
                    </div>
                  ) : (
                    <select
                      name="positionName"
                      value={formData.positionName}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-all duration-200 bg-white hover:border-yellow-300"
                    >
                      <option value="">Select a position</option>
                      {positions.map((position) => (
                        <option key={position._id} value={position.title}>
                          {position.title}
                        </option>
                      ))}
                    </select>
                  )}
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    Select the position that is eligible for this signing bonus. Only active positions from the organization structure are shown.
                  </p>
                </div>

                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-semibold text-white">
                      <svg className="w-4 h-4 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                      </svg>
                      Amount (EGP) *
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        name="amount"
                        value={formData.amount}
                        onChange={handleChange}
                        required
                        min="0"
                        step="0.01"
                        className="w-full px-4 py-3 pl-12 border-2 border-white/30 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all duration-200 bg-white hover:border-white/50"
                        placeholder="0.00"
                      />
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">EGP</div>
                    </div>
                    <p className="text-xs text-white/70 flex items-center gap-1">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      One-time bonus amount
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-4 pt-6 border-t border-white/20">
                <button
                  type="button"
                  onClick={() => router.push('/dashboard/payroll-configuration/signing-bonuses')}
                  className="px-6 py-3 border-2 border-white/30 rounded-xl text-sm font-semibold text-white hover:bg-white/20 hover:border-white/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white/50 transition-all duration-200 backdrop-blur-md bg-white/10"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="group relative px-8 py-3 bg-gradient-to-r from-yellow-600 via-amber-600 to-orange-600 text-white rounded-xl text-sm font-bold shadow-2xl hover:shadow-yellow-500/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 disabled:transform-none flex items-center gap-2 overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-yellow-700 via-amber-700 to-orange-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  {isLoading ? (
                    <>
                      <svg className="animate-spin h-5 w-5 relative z-10" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span className="relative z-10">Saving...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                      </svg>
                      <span className="relative z-10">Save Changes</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

