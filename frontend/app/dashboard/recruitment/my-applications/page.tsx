"use client";

// CHANGED - Enhanced My Applications page with more distinctive information

import { useState, useEffect } from "react";
import Link from "next/link";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { useAuth } from "@/lib/hooks/use-auth";
import { SystemRole } from "@/types";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/shared/ui/Card";
import { Button } from "@/components/shared/ui/Button";
import { recruitmentApi } from "@/lib/api/recruitment/recruitment";
import { Application } from "@/types/recruitment";
import { StatusBadge } from "@/components/recruitment/StatusBadge";
import { Toast, useToast } from "@/components/leaves/Toast";

// Helper function to extract job details from application
const getJobDetails = (application: Application | null) => {
  if (!application) {
    return { 
      title: "Unknown Position", 
      department: "Unknown Department", 
      location: "Unknown Location",
      openings: 0,
      publishStatus: "Unknown",
      description: "",
      skills: [] as string[],
    };
  }
  const app = application as any;
  const template = app.requisitionId?.templateId || app.requisitionId?.template || 
                   app.requisition?.templateId || app.requisition?.template;
  
  const title = template?.title || "Unknown Position";
  const department = template?.department || "Unknown Department";
  const location = app.requisitionId?.location || app.requisition?.location || "Unknown Location";
  const openings = app.requisitionId?.openings || app.requisition?.openings || 0;
  const publishStatus = app.requisitionId?.publishStatus || app.requisition?.publishStatus || "Active";
  const description = template?.description || "";
  const skills = template?.skills || [];
  
  return { title, department, location, openings, publishStatus, description, skills };
};

export default function MyApplicationsPage() {
  const { user } = useAuth();
  const { toast, showToast, hideToast } = useToast();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadApplications();
  }, []);

  const loadApplications = async () => {
    try {
      setLoading(true);
      const allApplications = await recruitmentApi.getApplications();
      // CHANGED - Handle candidateId being either a string or populated object
      const candidateApplications = allApplications.filter((app) => {
        const appCandidateId = typeof app.candidateId === 'object' 
          ? (app.candidateId as any)?._id?.toString() 
          : app.candidateId;
        return appCandidateId === user?.id || appCandidateId === user?.userId;
      });
      setApplications(candidateApplications);
    } catch (error: any) {
      showToast(error.message || "Failed to load applications", "error");
    } finally {
      setLoading(false);
    }
  };

  // CHANGED - Calculate days since applied
  const getDaysSinceApplied = (createdAt?: string): string => {
    if (!createdAt) return "N/A";
    const appliedDate = new Date(createdAt);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - appliedDate.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} week(s) ago`;
    return `${Math.floor(diffDays / 30)} month(s) ago`;
  };

  // CHANGED - Get status emoji
  const getStatusEmoji = (status: string): string => {
    const emojiMap: Record<string, string> = {
      submitted: "📝",
      in_process: "⏳",
      offer: "🎉",
      hired: "✅",
      rejected: "❌",
    };
    return emojiMap[status.toLowerCase()] || "📋";
  };

  // CHANGED - Get status message
  const getStatusMessage = (status: string, stage?: string): string => {
    const messages: Record<string, string> = {
      submitted: "Your application has been received and is under initial review.",
      in_process: stage === "department_interview" 
        ? "You've been shortlisted! Interview stage in progress." 
        : "Your application is being reviewed by the hiring team.",
      offer: "Congratulations! You've received a job offer.",
      hired: "Welcome aboard! You've been hired.",
      rejected: "Unfortunately, your application was not selected this time.",
    };
    return messages[status.toLowerCase()] || "Application status pending.";
  };

  // CHANGED - Get current stage display based on status and stage
  const getCurrentStageDisplay = (application: Application): string => {
    const status = application.status?.toLowerCase();
    const stage = application.currentStage || application.stage;
    
    // Map status to meaningful stage display
    if (status === 'hired') return 'Hired';
    if (status === 'rejected') return 'Rejected';
    if (status === 'offer') return 'Offer Stage';
    
    // For in_process, show the actual interview stage
    if (status === 'in_process') {
      if (stage) {
        const stageDisplay = stage.toString().replace(/_/g, ' ');
        // Capitalize each word
        return stageDisplay.split(' ').map(word => 
          word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        ).join(' ');
      }
      return 'Under Review';
    }
    
    // For submitted
    if (status === 'submitted') return 'Screening';
    
    return 'Pending';
  };

  // CHANGED - Get progress percentage
  const getProgressPercentage = (status: string, stage?: string): number => {
    const statusMap: Record<string, number> = {
      submitted: 20,
      in_process: 50,
      offer: 80,
      hired: 100,
      rejected: 0,
    };
    return statusMap[status.toLowerCase()] || 0;
  };

  // CHANGED - Get progress bar color based on status
  const getProgressColor = (status: string): string => {
    const colorMap: Record<string, string> = {
      submitted: "bg-blue-500",
      in_process: "bg-yellow-500",
      offer: "bg-green-500",
      hired: "bg-green-600",
      rejected: "bg-red-500",
    };
    return colorMap[status.toLowerCase()] || "bg-gray-500";
  };

  // CHANGED - Get card border color based on status
  const getCardBorderColor = (status: string): string => {
    const colorMap: Record<string, string> = {
      submitted: "border-l-4 border-l-blue-500",
      in_process: "border-l-4 border-l-yellow-500",
      offer: "border-l-4 border-l-green-500",
      hired: "border-l-4 border-l-green-600",
      rejected: "border-l-4 border-l-red-500",
    };
    return colorMap[status.toLowerCase()] || "";
  };

  // CHANGED - Shorten application ID
  const getShortId = (id: string): string => {
    return id.slice(-6).toUpperCase();
  };

  return (
    <ProtectedRoute requiredUserType="candidate">
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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">My Applications</h1>
              <p className="text-gray-600 mt-1">Track the status of your job applications</p>
            </div>
            {/* CHANGED - Show application count */}
            {applications.length > 0 && (
              <div className="bg-blue-100 text-blue-800 px-4 py-2 rounded-full">
                <span className="font-semibold">{applications.length}</span> Application{applications.length !== 1 ? 's' : ''}
              </div>
            )}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-500">Loading your applications...</p>
          </div>
        ) : applications.length === 0 ? (
          <Card className="bg-gray-50">
            <CardContent className="py-12 text-center">
              <div className="text-6xl mb-4">📭</div>
              <p className="text-gray-600 text-lg mb-2">No applications yet</p>
              <p className="text-gray-500 mb-6">Start your career journey by applying to open positions!</p>
              <Link href="/dashboard/recruitment">
                <Button>Browse Available Jobs</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {applications.map((application, index) => (
              <Card 
                key={application._id} 
                className={`hover:shadow-lg transition-shadow ${getCardBorderColor(application.status)}`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {/* CHANGED - Added emoji and better title styling */}
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">{getStatusEmoji(application.status)}</span>
                        <div>
                          <CardTitle className="text-xl text-gray-900">
                            {getJobDetails(application).title}
                          </CardTitle>
                          <p className="text-sm text-gray-600 mt-1">
                            <span className="font-medium">{getJobDetails(application).department}</span>
                            {getJobDetails(application).location !== "Unknown Location" && (
                              <span> • 📍 {getJobDetails(application).location}</span>
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <StatusBadge status={application.status} type="application" />
                      {/* CHANGED - Show application reference number */}
                      <span className="text-xs text-gray-400 font-mono">
                        Ref: #{getShortId(application._id)}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* CHANGED - Status message */}
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-sm text-gray-700">
                        {getStatusMessage(application.status, application.stage)}
                      </p>
                    </div>

                    {/* CHANGED - Progress bar with color */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">Application Progress</span>
                        <span className="text-sm font-bold text-gray-700">
                          {getProgressPercentage(application.status, application.stage)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className={`${getProgressColor(application.status)} h-3 rounded-full transition-all duration-500`}
                          style={{ width: `${getProgressPercentage(application.status, application.stage)}%` }}
                        />
                      </div>
                      {/* CHANGED - Progress steps */}
                      <div className="flex justify-between mt-1 text-xs text-gray-400">
                        <span>Submitted</span>
                        <span>Review</span>
                        <span>Interview</span>
                        <span>Offer</span>
                        <span>Hired</span>
                      </div>
                    </div>

                    {/* CHANGED - Enhanced info grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs text-gray-500 uppercase tracking-wide">Applied</p>
                        <p className="text-sm font-semibold text-gray-900 mt-1">
                          {getDaysSinceApplied(application.createdAt)}
                        </p>
                        <p className="text-xs text-gray-400">
                          {application.createdAt
                            ? new Date(application.createdAt).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })
                            : "N/A"}
                        </p>
                      </div>

                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs text-gray-500 uppercase tracking-wide">Current Stage</p>
                        <p className="text-sm font-semibold text-gray-900 mt-1">
                          {getCurrentStageDisplay(application)}
                        </p>
                      </div>

                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs text-gray-500 uppercase tracking-wide">Position Openings</p>
                        <p className="text-sm font-semibold text-gray-900 mt-1">
                          {getJobDetails(application).openings || "N/A"} position{(getJobDetails(application).openings || 0) !== 1 ? 's' : ''}
                        </p>
                      </div>

                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs text-gray-500 uppercase tracking-wide">Job Status</p>
                        <p className="text-sm font-semibold text-gray-900 mt-1 capitalize">
                          {getJobDetails(application).publishStatus}
                        </p>
                      </div>
                    </div>

                    {/* CHANGED - Job description preview */}
                    {getJobDetails(application).description && (
                      <div className="border-t pt-4">
                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Job Description</p>
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {getJobDetails(application).description}
                        </p>
                      </div>
                    )}

                    {/* CHANGED - Skills if available */}
                    {getJobDetails(application).skills.length > 0 && (
                      <div className="border-t pt-4">
                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Required Skills</p>
                        <div className="flex flex-wrap gap-2">
                          {getJobDetails(application).skills.slice(0, 5).map((skill: string, idx: number) => (
                            <span 
                              key={idx} 
                              className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full"
                            >
                              {skill}
                            </span>
                          ))}
                          {getJobDetails(application).skills.length > 5 && (
                            <span className="text-xs text-gray-400">
                              +{getJobDetails(application).skills.length - 5} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* CHANGED - Action buttons */}
                    <div className="flex gap-3 pt-2 border-t">
                      <Link 
                        href={`/dashboard/recruitment/jobs/${
                          typeof application.requisitionId === 'object' 
                            ? (application.requisitionId as any)?._id || (application.requisitionId as any)?.id
                            : application.requisitionId
                        }`} 
                        className="flex-1"
                      >
                        <Button variant="outline" className="w-full">
                          View Job Details
                        </Button>
                      </Link>
                      {application.status === "offer" && (
                        <Link href="/dashboard/recruitment/offers" className="flex-1">
                          <Button className="w-full bg-green-600 hover:bg-green-700">
                            View Offer
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* CHANGED - Legend for status colors */}
        {applications.length > 0 && (
          <div className="mt-8 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm font-semibold text-gray-700 mb-3">Status Legend:</p>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span className="text-sm text-gray-600">Submitted</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <span className="text-sm text-gray-600">In Process</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-sm text-gray-600">Offer</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-600"></div>
                <span className="text-sm text-gray-600">Hired</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span className="text-sm text-gray-600">Rejected</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
