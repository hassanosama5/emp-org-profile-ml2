"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/hooks/use-auth";
import { SystemRole } from "@/types";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { recruitmentApi } from "@/lib/api/recruitment/recruitment";
import { JobRequisition } from "@/types/recruitment";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/shared/ui/Card";
import { Toast, useToast } from "@/components/leaves/Toast";
import { StatusBadge } from "@/components/recruitment/StatusBadge";

export default function RecruitmentProgressPage() {
  const { user } = useAuth();
  const { toast, showToast, hideToast } = useToast();
  const [jobRequisitions, setJobRequisitions] = useState<JobRequisition[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const jobs = await recruitmentApi.getJobRequisitions();
      // Filter to only show published positions
      const publishedJobs = jobs.filter((job) => job.publishStatus === 'published');
      setJobRequisitions(publishedJobs);
    } catch (error: any) {
      showToast(error.message || "Failed to load recruitment progress", "error");
    } finally {
      setLoading(false);
    }
  };

  // Calculate overall statistics
  const overallStats = {
    totalPositions: jobRequisitions.length,
    totalOpenings: jobRequisitions.reduce((sum, job) => sum + (job.openings || 0), 0),
    totalApplications: jobRequisitions.reduce((sum, job) => sum + (job.statistics?.totalApplications || 0), 0),
    totalHired: jobRequisitions.reduce((sum, job) => sum + (job.statistics?.hired || 0), 0),
    totalInProcess: jobRequisitions.reduce((sum, job) => sum + (job.statistics?.inProcess || 0), 0),
    totalOffers: jobRequisitions.reduce((sum, job) => sum + (job.statistics?.offer || 0), 0),
    totalFilledPositions: jobRequisitions.reduce((sum, job) => sum + (job.statistics?.filledPositions || 0), 0),
    totalAvailablePositions: jobRequisitions.reduce((sum, job) => sum + (job.statistics?.availablePositions || 0), 0),
  };

  const overallProgress = overallStats.totalOpenings > 0
    ? Math.round((overallStats.totalFilledPositions / overallStats.totalOpenings) * 100)
    : 0;

  return (
    <ProtectedRoute allowedRoles={[SystemRole.HR_MANAGER, SystemRole.SYSTEM_ADMIN]}>
      <div className="container mx-auto px-6 py-8">
        <Toast
          message={toast.message}
          type={toast.type}
          isVisible={toast.isVisible}
          onClose={hideToast}
        />

        <div className="mb-8">
          <Link href="/dashboard/recruitment" className="text-blue-600 hover:underline mb-4 inline-block">
            ← Back to Recruitment
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Recruitment Progress</h1>
            <p className="text-gray-600 mt-1">Monitor progress across all open positions</p>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading recruitment progress...</p>
          </div>
        ) : (
          <>
            {/* Overall Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Total Positions</CardTitle>
                  <CardDescription>Open job positions</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-blue-600">{overallStats.totalPositions}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Total Openings</CardTitle>
                  <CardDescription>Number of positions to fill</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-gray-900">{overallStats.totalOpenings}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Total Applications</CardTitle>
                  <CardDescription>All candidate applications</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-purple-600">{overallStats.totalApplications}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Filled Positions</CardTitle>
                  <CardDescription>Successfully hired</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-green-600">{overallStats.totalFilledPositions}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    {overallStats.totalAvailablePositions} remaining
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Overall Progress Bar */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Overall Recruitment Progress</CardTitle>
                <CardDescription>
                  {overallStats.totalFilledPositions} of {overallStats.totalOpenings} positions filled
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="w-full bg-gray-200 rounded-full h-4 mb-2">
                  <div
                    className="bg-green-600 h-4 rounded-full transition-all"
                    style={{ width: `${overallProgress}%` }}
                  />
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>{overallProgress}% Complete</span>
                  <span>{overallStats.totalAvailablePositions} positions available</span>
                </div>
              </CardContent>
            </Card>

            {/* Application Status Breakdown */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Application Status Breakdown</CardTitle>
                <CardDescription>Current status of all applications</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <span className="text-sm font-medium text-blue-900">In Process</span>
                    <span className="text-lg font-bold text-blue-600">{overallStats.totalInProcess}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                    <span className="text-sm font-medium text-yellow-900">Offers</span>
                    <span className="text-lg font-bold text-yellow-600">{overallStats.totalOffers}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <span className="text-sm font-medium text-green-900">Hired</span>
                    <span className="text-lg font-bold text-green-600">{overallStats.totalHired}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Individual Position Progress */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Position Details</h2>
              {jobRequisitions.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <p className="text-gray-500">No open positions available.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {jobRequisitions.map((job) => {
                    const stats = job.statistics || {
                      totalApplications: 0,
                      hired: 0,
                      inProcess: 0,
                      offer: 0,
                      filledPositions: 0,
                      availablePositions: job.openings || 0,
                      progress: 0,
                      isFilled: false,
                    };
                    const positionProgress = job.openings > 0
                      ? Math.round((stats.filledPositions / job.openings) * 100)
                      : 0;

                    return (
                      <Card key={job._id} className="hover:shadow-md transition-shadow">
                        <CardContent className="pt-6">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h3 className="text-lg font-semibold text-gray-900">
                                  {job.template?.title || "Job Opening"}
                                </h3>
                                <StatusBadge status={job.publishStatus === 'published' ? 'in_process' : 'submitted'} type="application" />
                                {stats.isFilled && (
                                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                                    Filled
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-gray-600 mb-1">
                                {job.template?.department || "Department"} • {job.location || "Location TBD"}
                              </p>
                              <p className="text-xs text-gray-500">
                                {job.openings} {job.openings === 1 ? "opening" : "openings"}
                              </p>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Applications</p>
                              <p className="text-lg font-semibold text-gray-900">{stats.totalApplications}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 mb-1">In Process</p>
                              <p className="text-lg font-semibold text-blue-600">{stats.inProcess}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Offers</p>
                              <p className="text-lg font-semibold text-yellow-600">{stats.offer}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Hired</p>
                              <p className="text-lg font-semibold text-green-600">{stats.hired}</p>
                            </div>
                          </div>

                          <div className="mt-4">
                            <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                              <span className="font-medium">Position Progress</span>
                              <span className="font-semibold">{positionProgress}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2.5">
                              <div
                                className={`h-2.5 rounded-full transition-all ${
                                  stats.isFilled ? 'bg-green-500' : 'bg-blue-600'
                                }`}
                                style={{ width: `${positionProgress}%` }}
                              />
                            </div>
                            <div className="flex justify-between text-xs text-gray-600 mt-1">
                              <span>{stats.filledPositions} of {job.openings} filled</span>
                              <span>{stats.availablePositions} available</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </ProtectedRoute>
  );
}

