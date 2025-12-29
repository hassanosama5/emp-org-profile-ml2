"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/hooks/use-auth';
import { useRequireAuth } from '@/lib/hooks/use-auth';
import { SystemRole } from '@/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/shared/ui/Card';
import { Button } from '@/components/shared/ui/Button';
import { statsApi, ConfigurationStats } from '@/lib/api/payroll-configuration';
import Link from 'next/link';

export default function StatsPage() {
  const { user } = useAuth();
  // SYSTEM_ADMIN should have access to stats (highest admin role)
  // Note: Backend currently only allows PAYROLL_MANAGER - backend needs to be updated to include SYSTEM_ADMIN
  useRequireAuth(
    [
      SystemRole.PAYROLL_MANAGER,
      SystemRole.SYSTEM_ADMIN,
    ],
    '/dashboard'
  );

  const [stats, setStats] = useState<ConfigurationStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await statsApi.getStats();
      setStats(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load statistics');
      // Use empty stats when backend is not ready
      setStats({
        total: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const StatCard = ({
    title,
    value,
    description,
    color = 'blue',
  }: {
    title: string;
    value: number | string;
    description?: string;
    color?: 'blue' | 'green' | 'yellow' | 'red';
  }) => {
    const colorClasses = {
      blue: 'bg-blue-50 border-blue-200 text-blue-900',
      green: 'bg-green-50 border-green-200 text-green-900',
      yellow: 'bg-yellow-50 border-yellow-200 text-yellow-900',
      red: 'bg-red-50 border-red-200 text-red-900',
    };

    return (
      <Card className={colorClasses[color]}>
        <CardContent className="pt-6">
          <div className="text-3xl font-bold">{value}</div>
          <div className="mt-2 text-sm font-medium">{title}</div>
          {description && (
            <div className="mt-1 text-xs opacity-75">{description}</div>
          )}
        </CardContent>
      </Card>
    );
  };

  const TypeStatsCard = ({
    title,
    stats: typeStats,
  }: {
    title: string;
    stats?: {
      total: number;
      pending: number;
      approved: number;
      rejected: number;
    };
  }) => {
    if (!typeStats) return null;

    // Ensure all values are numbers (handle undefined/null)
    const total = typeStats.total ?? 0;
    const pending = typeStats.pending ?? 0;
    const approved = typeStats.approved ?? 0;
    const rejected = typeStats.rejected ?? 0;

    // Calculate pending if it's missing but we have other values
    const calculatedPending = pending === 0 && total > 0 
      ? Math.max(0, total - approved - rejected)
      : pending;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {total}
              </div>
              <div className="text-xs text-gray-500">Total</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-600">
                {calculatedPending}
              </div>
              <div className="text-xs text-gray-500">Pending</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">
                {approved}
              </div>
              <div className="text-xs text-gray-500">Approved</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-600">
                {rejected}
              </div>
              <div className="text-xs text-gray-500">Rejected</div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 flex items-center justify-center">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-orange-400 border-t-transparent mx-auto mb-4"></div>
          <p className="text-white/80 font-medium">Loading statistics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 relative overflow-hidden">
      {/* Animated Background Blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-96 h-96 bg-orange-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-0 left-1/2 w-96 h-96 bg-yellow-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none"></div>

      <div className="relative container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div className="space-y-2">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-gradient-to-br from-orange-500 to-amber-600 rounded-2xl shadow-xl shadow-orange-500/50 transform hover:scale-110 transition-transform duration-300">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                  </svg>
                </div>
                <div>
                  <h1 className="text-4xl md:text-5xl font-bold mb-2">
                    <span className="text-white">Configuration </span>
                    <span className="bg-gradient-to-r from-orange-400 via-amber-400 to-yellow-400 bg-clip-text text-transparent">
                      Statistics
                    </span>
                  </h1>
                  <p className="text-white/80 mt-1 text-base">
                    Overview of all payroll configuration statuses
                  </p>
                </div>
              </div>
            </div>
            <button
              onClick={loadStats}
              className="px-5 py-2.5 border-2 border-orange-400/50 rounded-xl text-sm font-semibold text-white hover:bg-orange-500/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-all duration-200 flex items-center hover:border-orange-400 bg-white/10 backdrop-blur-sm"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
              </svg>
              Refresh
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl border-2 border-red-400/50 bg-gradient-to-br from-red-600/30 to-red-700/30 backdrop-blur-xl p-4 shadow-xl">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-red-300 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <p className="text-red-100 font-semibold">{error}</p>
            </div>
          </div>
        )}

        {/* Overview Cards */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <div className="bg-gradient-to-br from-blue-600/40 via-indigo-600/35 to-purple-600/40 backdrop-blur-2xl border-2 border-blue-400/50 rounded-3xl shadow-2xl hover:shadow-blue-500/60 transition-all duration-300 transform hover:-translate-y-2 p-6 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/30 pointer-events-none"></div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl shadow-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                  </svg>
                </div>
                <p className="text-sm font-semibold text-white/90 uppercase tracking-wide">Total</p>
              </div>
              <p className="text-5xl font-extrabold text-white mb-2 drop-shadow-lg">{stats?.total || 0}</p>
              <p className="text-xs text-white/80">All configurations</p>
            </div>
          </div>
          <div className="bg-gradient-to-br from-amber-600/40 via-orange-600/35 to-yellow-600/40 backdrop-blur-2xl border-2 border-amber-400/50 rounded-3xl shadow-2xl hover:shadow-amber-500/60 transition-all duration-300 transform hover:-translate-y-2 p-6 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/30 pointer-events-none"></div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl shadow-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </div>
                <p className="text-sm font-semibold text-white/90 uppercase tracking-wide">Pending</p>
              </div>
              <p className="text-5xl font-extrabold text-white mb-2 drop-shadow-lg">{stats?.pending || 0}</p>
              <p className="text-xs text-white/80">Awaiting review</p>
            </div>
          </div>
          <div className="bg-gradient-to-br from-emerald-600/40 via-green-600/35 to-teal-600/40 backdrop-blur-2xl border-2 border-emerald-400/50 rounded-3xl shadow-2xl hover:shadow-emerald-500/60 transition-all duration-300 transform hover:-translate-y-2 p-6 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/30 pointer-events-none"></div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-gradient-to-br from-emerald-500 to-green-500 rounded-xl shadow-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </div>
                <p className="text-sm font-semibold text-white/90 uppercase tracking-wide">Approved</p>
              </div>
              <p className="text-5xl font-extrabold text-white mb-2 drop-shadow-lg">{stats?.approved || 0}</p>
              <p className="text-xs text-white/80">Active configurations</p>
            </div>
          </div>
          <div className="bg-gradient-to-br from-red-600/40 via-rose-600/35 to-pink-600/40 backdrop-blur-2xl border-2 border-red-400/50 rounded-3xl shadow-2xl hover:shadow-red-500/60 transition-all duration-300 transform hover:-translate-y-2 p-6 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/30 pointer-events-none"></div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-gradient-to-br from-red-500 to-rose-500 rounded-xl shadow-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </div>
                <p className="text-sm font-semibold text-white/90 uppercase tracking-wide">Rejected</p>
              </div>
              <p className="text-5xl font-extrabold text-white mb-2 drop-shadow-lg">{stats?.rejected || 0}</p>
              <p className="text-xs text-white/80">Rejected configurations</p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        {stats && stats.pending > 0 && (
          <div className="mb-8 bg-gradient-to-br from-orange-600/40 via-amber-600/40 to-yellow-600/40 backdrop-blur-xl border-2 border-orange-400/50 rounded-3xl shadow-2xl p-8 text-white relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/30 pointer-events-none"></div>
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-orange-400/20 to-amber-400/20 rounded-full -mr-32 -mt-32 blur-3xl"></div>
            <div className="flex items-center justify-between relative z-10">
              <div>
                <h3 className="text-2xl font-bold mb-2 drop-shadow-lg">Quick Actions</h3>
                <p className="text-orange-100 text-base">
                  {stats.pending} configuration(s) pending approval
                </p>
              </div>
              <Link href="/dashboard/payroll-configuration/approvals">
                <button className="px-6 py-3.5 bg-white/20 backdrop-blur-sm border-2 border-white/30 text-white font-semibold rounded-xl hover:bg-white/30 transition-all duration-300 transform hover:scale-105 shadow-xl flex items-center">
                  Review Pending Approvals
                  <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                  </svg>
                </button>
              </Link>
            </div>
          </div>
        )}

        {/* Detailed Statistics by Type */}
        <div className="mb-8">
          <h2 className="mb-6 text-3xl font-bold text-white flex items-center gap-3 drop-shadow-lg">
            <svg className="w-7 h-7 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
            </svg>
            Statistics by Configuration Type
          </h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {stats?.payGrades && (
            <div className="bg-gradient-to-br from-blue-600/30 via-indigo-600/25 to-purple-600/30 backdrop-blur-xl border-2 border-blue-400/30 rounded-3xl shadow-2xl p-6 hover:shadow-blue-500/50 transition-all duration-300 transform hover:-translate-y-1 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/20 pointer-events-none"></div>
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2 relative z-10">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg shadow-lg">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                  </svg>
                </div>
                Pay Grades
              </h3>
              <div className="grid grid-cols-4 gap-3 relative z-10">
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">{stats.payGrades.total ?? 0}</div>
                  <div className="text-xs text-white/70">Total</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-amber-300">{stats.payGrades.pending ?? 0}</div>
                  <div className="text-xs text-white/70">Pending</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-emerald-300">{stats.payGrades.approved ?? 0}</div>
                  <div className="text-xs text-white/70">Approved</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-300">{stats.payGrades.rejected ?? 0}</div>
                  <div className="text-xs text-white/70">Rejected</div>
                </div>
              </div>
            </div>
          )}
          {stats?.allowances && (
            <div className="bg-gradient-to-br from-emerald-600/30 via-green-600/25 to-teal-600/30 backdrop-blur-xl border-2 border-emerald-400/30 rounded-3xl shadow-2xl p-6 hover:shadow-emerald-500/50 transition-all duration-300 transform hover:-translate-y-1 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/20 pointer-events-none"></div>
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2 relative z-10">
                <div className="p-2 bg-gradient-to-br from-emerald-500 to-green-500 rounded-lg shadow-lg">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </div>
                Allowances
              </h3>
              <div className="grid grid-cols-4 gap-3 relative z-10">
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">{stats.allowances.total ?? 0}</div>
                  <div className="text-xs text-white/70">Total</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-amber-300">{stats.allowances.pending ?? 0}</div>
                  <div className="text-xs text-white/70">Pending</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-emerald-300">{stats.allowances.approved ?? 0}</div>
                  <div className="text-xs text-white/70">Approved</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-300">{stats.allowances.rejected ?? 0}</div>
                  <div className="text-xs text-white/70">Rejected</div>
                </div>
              </div>
            </div>
          )}
          {stats?.payTypes && (
            <div className="bg-gradient-to-br from-purple-600/30 via-violet-600/25 to-fuchsia-600/30 backdrop-blur-xl border-2 border-purple-400/30 rounded-3xl shadow-2xl p-6 hover:shadow-purple-500/50 transition-all duration-300 transform hover:-translate-y-1 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/20 pointer-events-none"></div>
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2 relative z-10">
                <div className="p-2 bg-gradient-to-br from-purple-500 to-violet-500 rounded-lg shadow-lg">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </div>
                Pay Types
              </h3>
              <div className="grid grid-cols-4 gap-3 relative z-10">
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">{stats.payTypes.total ?? 0}</div>
                  <div className="text-xs text-white/70">Total</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-amber-300">{stats.payTypes.pending ?? 0}</div>
                  <div className="text-xs text-white/70">Pending</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-emerald-300">{stats.payTypes.approved ?? 0}</div>
                  <div className="text-xs text-white/70">Approved</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-300">{stats.payTypes.rejected ?? 0}</div>
                  <div className="text-xs text-white/70">Rejected</div>
                </div>
              </div>
            </div>
          )}
          {stats?.taxRules && (
            <div className="bg-gradient-to-br from-slate-600/30 via-gray-600/25 to-zinc-600/30 backdrop-blur-xl border-2 border-slate-400/30 rounded-3xl shadow-2xl p-6 hover:shadow-slate-500/50 transition-all duration-300 transform hover:-translate-y-1 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/20 pointer-events-none"></div>
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2 relative z-10">
                <div className="p-2 bg-gradient-to-br from-slate-500 to-gray-500 rounded-lg shadow-lg">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
                  </svg>
                </div>
                Tax Rules
              </h3>
              <div className="grid grid-cols-4 gap-3 relative z-10">
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">{stats.taxRules.total ?? 0}</div>
                  <div className="text-xs text-white/70">Total</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-amber-300">{stats.taxRules.pending ?? 0}</div>
                  <div className="text-xs text-white/70">Pending</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-emerald-300">{stats.taxRules.approved ?? 0}</div>
                  <div className="text-xs text-white/70">Approved</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-300">{stats.taxRules.rejected ?? 0}</div>
                  <div className="text-xs text-white/70">Rejected</div>
                </div>
              </div>
            </div>
          )}
          {stats?.insuranceBrackets && (
            <div className="bg-gradient-to-br from-cyan-600/30 via-blue-600/25 to-indigo-600/30 backdrop-blur-xl border-2 border-cyan-400/30 rounded-3xl shadow-2xl p-6 hover:shadow-cyan-500/50 transition-all duration-300 transform hover:-translate-y-1 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/20 pointer-events-none"></div>
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2 relative z-10">
                <div className="p-2 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-lg shadow-lg">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                  </svg>
                </div>
                Insurance Brackets
              </h3>
              <div className="grid grid-cols-4 gap-3 relative z-10">
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">{stats.insuranceBrackets.total ?? 0}</div>
                  <div className="text-xs text-white/70">Total</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-amber-300">{stats.insuranceBrackets.pending ?? 0}</div>
                  <div className="text-xs text-white/70">Pending</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-emerald-300">{stats.insuranceBrackets.approved ?? 0}</div>
                  <div className="text-xs text-white/70">Approved</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-300">{stats.insuranceBrackets.rejected ?? 0}</div>
                  <div className="text-xs text-white/70">Rejected</div>
                </div>
              </div>
            </div>
          )}
          {stats?.signingBonuses && (
            <div className="bg-gradient-to-br from-yellow-600/30 via-amber-600/25 to-orange-600/30 backdrop-blur-xl border-2 border-yellow-400/30 rounded-3xl shadow-2xl p-6 hover:shadow-yellow-500/50 transition-all duration-300 transform hover:-translate-y-1 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/20 pointer-events-none"></div>
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2 relative z-10">
                <div className="p-2 bg-gradient-to-br from-yellow-500 to-amber-500 rounded-lg shadow-lg">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </div>
                Signing Bonuses
              </h3>
              <div className="grid grid-cols-4 gap-3 relative z-10">
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">{stats.signingBonuses.total ?? 0}</div>
                  <div className="text-xs text-white/70">Total</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-amber-300">{stats.signingBonuses.pending ?? 0}</div>
                  <div className="text-xs text-white/70">Pending</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-emerald-300">{stats.signingBonuses.approved ?? 0}</div>
                  <div className="text-xs text-white/70">Approved</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-300">{stats.signingBonuses.rejected ?? 0}</div>
                  <div className="text-xs text-white/70">Rejected</div>
                </div>
              </div>
            </div>
          )}
          {stats?.terminationBenefits && (
            <div className="bg-gradient-to-br from-rose-600/30 via-red-600/25 to-pink-600/30 backdrop-blur-xl border-2 border-rose-400/30 rounded-3xl shadow-2xl p-6 hover:shadow-rose-500/50 transition-all duration-300 transform hover:-translate-y-1 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/20 pointer-events-none"></div>
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2 relative z-10">
                <div className="p-2 bg-gradient-to-br from-rose-500 to-red-500 rounded-lg shadow-lg">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                  </svg>
                </div>
                Termination Benefits
              </h3>
              <div className="grid grid-cols-4 gap-3 relative z-10">
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">{stats.terminationBenefits.total ?? 0}</div>
                  <div className="text-xs text-white/70">Total</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-amber-300">{stats.terminationBenefits.pending ?? 0}</div>
                  <div className="text-xs text-white/70">Pending</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-emerald-300">{stats.terminationBenefits.approved ?? 0}</div>
                  <div className="text-xs text-white/70">Approved</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-300">{stats.terminationBenefits.rejected ?? 0}</div>
                  <div className="text-xs text-white/70">Rejected</div>
                </div>
              </div>
            </div>
          )}
          {stats?.payrollPolicies && (
            <div className="bg-gradient-to-br from-violet-600/30 via-purple-600/25 to-fuchsia-600/30 backdrop-blur-xl border-2 border-violet-400/30 rounded-3xl shadow-2xl p-6 hover:shadow-violet-500/50 transition-all duration-300 transform hover:-translate-y-1 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/20 pointer-events-none"></div>
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2 relative z-10">
                <div className="p-2 bg-gradient-to-br from-violet-500 to-purple-500 rounded-lg shadow-lg">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                  </svg>
                </div>
                Payroll Policies
              </h3>
              <div className="grid grid-cols-4 gap-3 relative z-10">
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">{stats.payrollPolicies.total ?? 0}</div>
                  <div className="text-xs text-white/70">Total</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-amber-300">{stats.payrollPolicies.pending ?? 0}</div>
                  <div className="text-xs text-white/70">Pending</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-emerald-300">{stats.payrollPolicies.approved ?? 0}</div>
                  <div className="text-xs text-white/70">Approved</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-300">{stats.payrollPolicies.rejected ?? 0}</div>
                  <div className="text-xs text-white/70">Rejected</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

        {/* Empty State */}
        {stats && stats.total === 0 && (
          <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-2xl rounded-3xl shadow-2xl border-2 border-white/20 p-12 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/20 pointer-events-none"></div>
            <div className="p-4 bg-white/10 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center relative z-10">
              <svg className="w-10 h-10 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
              </svg>
            </div>
            <p className="text-white font-medium text-lg mb-2 relative z-10">
              No configuration data available yet.
            </p>
            <p className="text-sm text-white/60 relative z-10">
              Statistics will appear here once configurations are created.
            </p>
          </div>
        )}
      </div>

      {/* Add custom animations */}
      <style jsx>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob { animation: blob 7s infinite; }
        .animation-delay-2000 { animation-delay: 2s; }
        .animation-delay-4000 { animation-delay: 4s; }
      `}</style>
    </div>
  );
}

