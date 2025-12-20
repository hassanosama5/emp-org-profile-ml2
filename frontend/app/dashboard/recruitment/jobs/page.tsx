"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/hooks/use-auth";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/shared/ui/Card";
import { Button } from "@/components/shared/ui/Button";
import { recruitmentApi } from "@/lib/api/recruitment/recruitment";
import { JobRequisition } from "@/types/recruitment";
import { Toast, useToast } from "@/components/leaves/Toast";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { SystemRole } from "@/types";

export default function AllJobsPage() {
  const { user } = useAuth();
  const { toast, showToast, hideToast } = useToast();
  const [jobRequisitions, setJobRequisitions] = useState<JobRequisition[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "published" | "closed">("published");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    loadJobRequisitions();
  }, []);

  const loadJobRequisitions = async () => {
    try {
      setLoading(true);
      const jobs = await recruitmentApi.getJobRequisitions();
      // Filter published jobs for candidates
      const isCandidate = user?.userType === "candidate" || user?.roles?.includes(SystemRole.JOB_CANDIDATE);
      if (isCandidate) {
        const publishedJobs = jobs.filter((job) => job.publishStatus === 'published');
        setJobRequisitions(publishedJobs);
      } else {
        setJobRequisitions(jobs);
      }
    } catch (error: any) {
      showToast(error.message || "Failed to load job openings", "error");
    } finally {
      setLoading(false);
    }
  };

  const filteredJobs = jobRequisitions.filter((job) => {
    // Filter by status
    if (filter === "published" && job.publishStatus !== "published") return false;
    if (filter === "closed" && job.publishStatus !== "closed") return false;
    
    // Filter by search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const title = job.template?.title?.toLowerCase() || "";
      const department = job.template?.department?.toLowerCase() || "";
      const description = job.template?.description?.toLowerCase() || "";
      const location = job.location?.toLowerCase() || "";
      
      if (!title.includes(searchLower) && 
          !department.includes(searchLower) && 
          !description.includes(searchLower) &&
          !location.includes(searchLower)) {
        return false;
      }
    }
    
    return true;
  });

  const isCandidate = user?.userType === "candidate" || user?.roles?.includes(SystemRole.JOB_CANDIDATE);

  return (
    <ProtectedRoute>
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
          <h1 className="text-3xl font-bold text-gray-900">All Job Openings</h1>
          <p className="text-gray-600 mt-1">
            {isCandidate 
              ? "Browse all available job openings and apply to positions that match your skills"
              : "View all job requisitions and their details"}
          </p>
        </div>

        {/* Search and Filter */}
        <div className="mb-6 flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search by title, department, location, or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          {!isCandidate && (
            <div className="flex gap-2">
              <Button
                variant={filter === "all" ? "primary" : "outline"}
                onClick={() => setFilter("all")}
                size="sm"
              >
                All
              </Button>
              <Button
                variant={filter === "published" ? "primary" : "outline"}
                onClick={() => setFilter("published")}
                size="sm"
              >
                Published
              </Button>
              <Button
                variant={filter === "closed" ? "primary" : "outline"}
                onClick={() => setFilter("closed")}
                size="sm"
              >
                Closed
              </Button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading job openings...</p>
          </div>
        ) : filteredJobs.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-500 mb-4">
                {searchTerm 
                  ? `No jobs found matching "${searchTerm}"`
                  : "No job openings available at this time."}
              </p>
              {searchTerm && (
                <Button variant="outline" onClick={() => setSearchTerm("")}>
                  Clear Search
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="mb-4 text-sm text-gray-600">
              Showing {filteredJobs.length} of {jobRequisitions.length} job{jobRequisitions.length !== 1 ? 's' : ''}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredJobs.map((job) => (
                <Card key={job._id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-xl">
                          {job.template?.title || "Job Opening"}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          {job.template?.department || "Department"} • {job.location || "Location TBD"}
                        </CardDescription>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        job.publishStatus === 'published' 
                          ? 'bg-green-100 text-green-800' 
                          : job.publishStatus === 'closed'
                          ? 'bg-gray-100 text-gray-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {job.publishStatus ? job.publishStatus.charAt(0).toUpperCase() + job.publishStatus.slice(1) : 'Draft'}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                      {job.template?.description || "No description available"}
                    </p>
                    
                    {/* Job Details */}
                    <div className="space-y-2 mb-4 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500">Openings:</span>
                        <span className="font-medium text-gray-900">
                          {job.openings} {job.openings === 1 ? "position" : "positions"}
                        </span>
                      </div>
                      {job.postingDate && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500">Posted:</span>
                          <span className="text-gray-700">
                            {new Date(job.postingDate).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </span>
                        </div>
                      )}
                      {job.expiryDate && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500">Expires:</span>
                          <span className="text-gray-700">
                            {new Date(job.expiryDate).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </span>
                        </div>
                      )}
                      {job.statistics && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500">Available:</span>
                          <span className={`font-medium ${job.statistics.availablePositions === 0 ? 'text-red-600' : 'text-blue-600'}`}>
                            {/* FIXED: Use nullish coalescing (??) instead of || to handle 0 correctly */}
                            {job.statistics.availablePositions ?? job.openings} position{(job.statistics.availablePositions ?? job.openings) !== 1 ? 's' : ''}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Requirements Preview */}
                    {job.template?.requirements && job.template.requirements.length > 0 && (
                      <div className="mb-4">
                        <p className="text-xs font-medium text-gray-500 mb-1">Key Requirements:</p>
                        <ul className="text-xs text-gray-600 space-y-1">
                          {job.template.requirements.slice(0, 3).map((req, idx) => (
                            <li key={idx} className="flex items-start">
                              <span className="mr-2">•</span>
                              <span>{req}</span>
                            </li>
                          ))}
                          {job.template.requirements.length > 3 && (
                            <li className="text-gray-400 italic">
                              +{job.template.requirements.length - 3} more requirements
                            </li>
                          )}
                        </ul>
                      </div>
                    )}

                    <div className="flex gap-2 pt-4 border-t">
                      {/* CHANGED: Show different button when no positions available */}
                      {isCandidate && job.statistics?.availablePositions === 0 ? (
                        <Button className="w-full bg-gray-400 cursor-not-allowed" size="sm" disabled>
                          No Positions Available
                        </Button>
                      ) : (
                        <Link href={`/dashboard/recruitment/jobs/${job._id}`} className="flex-1">
                          <Button className="w-full" size="sm">
                            {isCandidate ? "View & Apply" : "View Details"}
                          </Button>
                        </Link>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </ProtectedRoute>
  );
}

