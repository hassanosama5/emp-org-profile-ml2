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
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading statistics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                </svg>
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  Configuration Statistics
                </h1>
                <p className="text-gray-600 mt-1 text-sm">
                  Overview of all payroll configuration statuses
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={loadStats}
            className="px-4 py-2 border-2 border-indigo-200 rounded-lg text-sm font-semibold text-indigo-700 hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200 flex items-center hover:border-indigo-300"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border-2 border-red-300 bg-red-50 p-4 shadow-lg">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <p className="text-red-800 font-semibold">{error}</p>
          </div>
        </div>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <div className="bg-white p-6 rounded-2xl shadow-lg border border-indigo-100 hover:shadow-xl transition-shadow duration-200 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-100 rounded-full -mr-16 -mt-16 opacity-50"></div>
          <div className="relative">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-500">Total</p>
            </div>
            <p className="text-4xl font-bold text-gray-900">{stats?.total || 0}</p>
            <p className="text-xs text-gray-500 mt-1">All configurations</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-lg border border-amber-100 hover:shadow-xl transition-shadow duration-200 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-100 rounded-full -mr-16 -mt-16 opacity-50"></div>
          <div className="relative">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-500">Pending</p>
            </div>
            <p className="text-4xl font-bold text-gray-900">{stats?.pending || 0}</p>
            <p className="text-xs text-gray-500 mt-1">Awaiting review</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-lg border border-green-100 hover:shadow-xl transition-shadow duration-200 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-green-100 rounded-full -mr-16 -mt-16 opacity-50"></div>
          <div className="relative">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-500">Approved</p>
            </div>
            <p className="text-4xl font-bold text-gray-900">{stats?.approved || 0}</p>
            <p className="text-xs text-gray-500 mt-1">Active configurations</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-lg border border-red-100 hover:shadow-xl transition-shadow duration-200 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-100 rounded-full -mr-16 -mt-16 opacity-50"></div>
          <div className="relative">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-500">Rejected</p>
            </div>
            <p className="text-4xl font-bold text-gray-900">{stats?.rejected || 0}</p>
            <p className="text-xs text-gray-500 mt-1">Rejected configurations</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      {stats && stats.pending > 0 && (
        <div className="mb-8 bg-gradient-to-r from-amber-500 to-orange-600 rounded-2xl shadow-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold mb-1">Quick Actions</h3>
              <p className="text-amber-100 text-sm">
                {stats.pending} configuration(s) pending approval
              </p>
            </div>
            <Link href="/dashboard/payroll-configuration/approvals">
              <button className="px-6 py-3 bg-white text-amber-600 font-semibold rounded-xl hover:bg-amber-50 transition-all duration-200 transform hover:scale-105 shadow-lg flex items-center">
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
        <h2 className="mb-6 text-2xl font-bold text-gray-900 flex items-center gap-2">
          <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
          </svg>
          Statistics by Configuration Type
        </h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {stats?.payGrades && (
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-blue-100 p-6 hover:shadow-xl transition-shadow duration-200">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <div className="p-1.5 bg-blue-100 rounded-lg">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                  </svg>
                </div>
                Pay Grades
              </h3>
              <div className="grid grid-cols-4 gap-3">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{stats.payGrades.total ?? 0}</div>
                  <div className="text-xs text-gray-500">Total</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-amber-600">{stats.payGrades.pending ?? 0}</div>
                  <div className="text-xs text-gray-500">Pending</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{stats.payGrades.approved ?? 0}</div>
                  <div className="text-xs text-gray-500">Approved</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{stats.payGrades.rejected ?? 0}</div>
                  <div className="text-xs text-gray-500">Rejected</div>
                </div>
              </div>
            </div>
          )}
          {stats?.allowances && (
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-emerald-100 p-6 hover:shadow-xl transition-shadow duration-200">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <div className="p-1.5 bg-emerald-100 rounded-lg">
                  <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </div>
                Allowances
              </h3>
              <div className="grid grid-cols-4 gap-3">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{stats.allowances.total ?? 0}</div>
                  <div className="text-xs text-gray-500">Total</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-amber-600">{stats.allowances.pending ?? 0}</div>
                  <div className="text-xs text-gray-500">Pending</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{stats.allowances.approved ?? 0}</div>
                  <div className="text-xs text-gray-500">Approved</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{stats.allowances.rejected ?? 0}</div>
                  <div className="text-xs text-gray-500">Rejected</div>
                </div>
              </div>
            </div>
          )}
          {stats?.payTypes && (
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-purple-100 p-6 hover:shadow-xl transition-shadow duration-200">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <div className="p-1.5 bg-purple-100 rounded-lg">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </div>
                Pay Types
              </h3>
              <div className="grid grid-cols-4 gap-3">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{stats.payTypes.total ?? 0}</div>
                  <div className="text-xs text-gray-500">Total</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-amber-600">{stats.payTypes.pending ?? 0}</div>
                  <div className="text-xs text-gray-500">Pending</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{stats.payTypes.approved ?? 0}</div>
                  <div className="text-xs text-gray-500">Approved</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{stats.payTypes.rejected ?? 0}</div>
                  <div className="text-xs text-gray-500">Rejected</div>
                </div>
              </div>
            </div>
          )}
          {stats?.taxRules && (
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-100 p-6 hover:shadow-xl transition-shadow duration-200">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <div className="p-1.5 bg-slate-100 rounded-lg">
                  <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
                  </svg>
                </div>
                Tax Rules
              </h3>
              <div className="grid grid-cols-4 gap-3">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{stats.taxRules.total ?? 0}</div>
                  <div className="text-xs text-gray-500">Total</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-amber-600">{stats.taxRules.pending ?? 0}</div>
                  <div className="text-xs text-gray-500">Pending</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{stats.taxRules.approved ?? 0}</div>
                  <div className="text-xs text-gray-500">Approved</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{stats.taxRules.rejected ?? 0}</div>
                  <div className="text-xs text-gray-500">Rejected</div>
                </div>
              </div>
            </div>
          )}
          {stats?.insuranceBrackets && (
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-cyan-100 p-6 hover:shadow-xl transition-shadow duration-200">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <div className="p-1.5 bg-cyan-100 rounded-lg">
                  <svg className="w-5 h-5 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                  </svg>
                </div>
                Insurance Brackets
              </h3>
              <div className="grid grid-cols-4 gap-3">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{stats.insuranceBrackets.total ?? 0}</div>
                  <div className="text-xs text-gray-500">Total</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-amber-600">{stats.insuranceBrackets.pending ?? 0}</div>
                  <div className="text-xs text-gray-500">Pending</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{stats.insuranceBrackets.approved ?? 0}</div>
                  <div className="text-xs text-gray-500">Approved</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{stats.insuranceBrackets.rejected ?? 0}</div>
                  <div className="text-xs text-gray-500">Rejected</div>
                </div>
              </div>
            </div>
          )}
          {stats?.signingBonuses && (
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-yellow-100 p-6 hover:shadow-xl transition-shadow duration-200">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <div className="p-1.5 bg-yellow-100 rounded-lg">
                  <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </div>
                Signing Bonuses
              </h3>
              <div className="grid grid-cols-4 gap-3">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{stats.signingBonuses.total ?? 0}</div>
                  <div className="text-xs text-gray-500">Total</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-amber-600">{stats.signingBonuses.pending ?? 0}</div>
                  <div className="text-xs text-gray-500">Pending</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{stats.signingBonuses.approved ?? 0}</div>
                  <div className="text-xs text-gray-500">Approved</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{stats.signingBonuses.rejected ?? 0}</div>
                  <div className="text-xs text-gray-500">Rejected</div>
                </div>
              </div>
            </div>
          )}
          {stats?.terminationBenefits && (
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-rose-100 p-6 hover:shadow-xl transition-shadow duration-200">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <div className="p-1.5 bg-rose-100 rounded-lg">
                  <svg className="w-5 h-5 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                  </svg>
                </div>
                Termination Benefits
              </h3>
              <div className="grid grid-cols-4 gap-3">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{stats.terminationBenefits.total ?? 0}</div>
                  <div className="text-xs text-gray-500">Total</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-amber-600">{stats.terminationBenefits.pending ?? 0}</div>
                  <div className="text-xs text-gray-500">Pending</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{stats.terminationBenefits.approved ?? 0}</div>
                  <div className="text-xs text-gray-500">Approved</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{stats.terminationBenefits.rejected ?? 0}</div>
                  <div className="text-xs text-gray-500">Rejected</div>
                </div>
              </div>
            </div>
          )}
          {stats?.payrollPolicies && (
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-violet-100 p-6 hover:shadow-xl transition-shadow duration-200">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <div className="p-1.5 bg-violet-100 rounded-lg">
                  <svg className="w-5 h-5 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                  </svg>
                </div>
                Payroll Policies
              </h3>
              <div className="grid grid-cols-4 gap-3">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{stats.payrollPolicies.total ?? 0}</div>
                  <div className="text-xs text-gray-500">Total</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-amber-600">{stats.payrollPolicies.pending ?? 0}</div>
                  <div className="text-xs text-gray-500">Pending</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{stats.payrollPolicies.approved ?? 0}</div>
                  <div className="text-xs text-gray-500">Approved</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{stats.payrollPolicies.rejected ?? 0}</div>
                  <div className="text-xs text-gray-500">Rejected</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Empty State */}
      {stats && stats.total === 0 && (
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200 p-12 text-center">
          <div className="p-4 bg-gray-100 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
            <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
            </svg>
          </div>
          <p className="text-gray-600 font-medium text-lg mb-2">
            No configuration data available yet.
          </p>
          <p className="text-sm text-gray-400">
            Statistics will appear here once configurations are created.
          </p>
        </div>
      )}
    </div>
  );
}

