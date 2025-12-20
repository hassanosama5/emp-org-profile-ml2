"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { useAuth } from "@/lib/hooks/use-auth";
import { SystemRole } from "@/types";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/shared/ui/Card";
import { recruitmentApi } from "@/lib/api/recruitment/recruitment";
import { Application, Interview, InterviewStatus, InterviewMethod } from "@/types/recruitment";
import { StatusBadge } from "@/components/recruitment/StatusBadge";
import { Toast, useToast } from "@/components/leaves/Toast";

// Helper function to extract job details from application
const getJobDetails = (application: Application | null) => {
  if (!application) {
    return { title: "Unknown Position", department: "Unknown Department", location: "Unknown Location" };
  }
  const app = application as any;
  const title = 
    app.requisitionId?.templateId?.title ||
    app.requisitionId?.template?.title ||
    app.requisition?.templateId?.title ||
    app.requisition?.template?.title ||
    "Unknown Position";
  const department = 
    app.requisitionId?.templateId?.department ||
    app.requisitionId?.template?.department ||
    app.requisition?.templateId?.department ||
    app.requisition?.template?.department ||
    "Unknown Department";
  const location = 
    app.requisitionId?.location ||
    app.requisition?.location ||
    "Unknown Location";
  return { title, department, location };
};

export default function InterviewsPage() {
  const { user } = useAuth();
  const { toast, showToast, hideToast } = useToast();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  const isCandidate = user?.userType === "candidate" || user?.roles?.includes(SystemRole.JOB_CANDIDATE);
  const isDepartmentHead = user?.roles?.includes(SystemRole.DEPARTMENT_HEAD);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const allApplications = await recruitmentApi.getApplications();
      
      // Debug: Check if interviews are in the response at all
      const appsWithInterviews = allApplications.filter((app: any) => app.interviews && app.interviews.length > 0);
      console.log('🔍 DEBUG: Checking all applications for interviews');
      console.log('Total applications:', allApplications.length);
      console.log('Apps with interviews:', appsWithInterviews.length);
      console.log('All application IDs:', allApplications.map((app: any) => ({
        id: app._id,
        idString: String(app._id),
        hasInterviews: !!app.interviews,
        interviewsCount: app.interviews?.length || 0,
      })));
      if (allApplications[0]) {
        console.log('Sample application (first one):', JSON.parse(JSON.stringify({
          appId: allApplications[0]._id,
          appIdString: String(allApplications[0]._id),
          hasInterviews: !!allApplications[0].interviews,
          interviewsCount: allApplications[0].interviews?.length || 0,
          interviews: allApplications[0].interviews,
          allKeys: Object.keys(allApplications[0]),
        })));
      }
      
      if (isCandidate) {
        // For candidates: show their applications that have interviews scheduled
        // Use EXACT same candidate ID matching logic as my-applications page
        const candidateId = user?.id || user?.userId;
        
        // First, find all applications for this candidate (same as my-applications)
        const allCandidateApps = allApplications.filter((app) => {
          const appCandidateId = typeof app.candidateId === 'object' 
            ? (app.candidateId as any)?._id?.toString() 
            : app.candidateId;
          return appCandidateId === user?.id || appCandidateId === user?.userId;
        });
        
        // Debug: Log all candidate applications with their interview data
        console.log('🔍 DEBUG: All candidate applications');
        allCandidateApps.forEach((app: any, index: number) => {
          console.log(`Candidate Application ${index + 1}:`, JSON.parse(JSON.stringify({
            appId: app._id,
            appIdString: String(app._id),
            hasInterviews: !!app.interviews,
            interviewsCount: app.interviews?.length || 0,
            interviews: app.interviews,
            interviewsType: typeof app.interviews,
            allKeys: Object.keys(app),
            interviewKeyExists: 'interviews' in app,
            fullApp: app, // Full application object
          })));
        });
        
        // Also check if interviews might be under a different key
        console.log('🔍 DEBUG: Checking for interviews in different formats');
        allCandidateApps.forEach((app: any, index: number) => {
          console.log(`Application ${index + 1} interview variants:`, {
            appId: app._id,
            interviews: app.interviews,
            interview: app.interview,
            interviewList: app.interviewList,
            scheduledInterviews: app.scheduledInterviews,
          });
        });
        
        // Then filter to only those with interviews
        const candidateApplications = allCandidateApps.filter((app) => {
          // Check if application has interviews attached
          const hasInterviews = app.interviews && 
                               Array.isArray(app.interviews) && 
                               app.interviews.length > 0;
          
          // Debug: Log applications with interviews
          if (hasInterviews) {
            console.log('✅ Candidate application with interviews:', {
              appId: app._id,
              position: getJobDetails(app).title,
              interviewsCount: app.interviews?.length || 0,
              interviews: app.interviews,
            });
          }
          
          return hasInterviews;
        });
        
        // Debug: Log summary
        console.log('📊 Interview loading summary:', {
          totalApplications: allApplications.length,
          candidateApplications: allCandidateApps.length,
          applicationsWithInterviews: candidateApplications.length,
          candidateId: candidateId,
          user: { id: user?.id, userId: user?.userId },
        });
        
        setApplications(candidateApplications);
      } else if (isDepartmentHead) {
        // For department heads: show department interviews
        const interviewApplications = allApplications.filter(
          (app) =>
            app.stage?.includes("interview") &&
            (app.stage === "department_interview" || app.status === "in_process")
        );
        
        // Sort applications: Referrals first, then others (for priority interview scheduling)
        const sortedInterviewApps = [...interviewApplications].sort((a: any, b: any) => {
          // Referrals should come first (isReferral = true sorts before false)
          if (a.isReferral && !b.isReferral) return -1;
          if (!a.isReferral && b.isReferral) return 1;
          return 0;
        });
        
        setApplications(sortedInterviewApps);
      }
    } catch (error: any) {
      showToast(error.message || "Failed to load interviews", "error");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  const getInterviewMethodLabel = (method?: InterviewMethod): string => {
    if (!method) return 'TBD';
    return method.charAt(0).toUpperCase() + method.slice(1);
  };

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
          <h1 className="text-3xl font-bold text-gray-900">
            {isCandidate ? "My Interviews" : "Department Interviews"}
          </h1>
          <p className="text-gray-600 mt-1">
            {isCandidate
              ? "View your scheduled interviews and feedback"
              : "View and manage interviews for your department"}
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading interviews...</p>
          </div>
        ) : applications.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-500 mb-4">
                {isCandidate
                  ? "No interviews scheduled at this time."
                  : "No interviews scheduled for your department."}
              </p>
              <Link href="/dashboard/recruitment">
                <button className="text-blue-600 hover:underline">
                  {isCandidate ? "Browse available jobs" : "Back to Recruitment"}
                </button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {applications.map((application) => {
              // Get interviews for this application
              const interviews = application.interviews || [];
              
              // If no interviews at all, skip (shouldn't happen since we filtered)
              if (interviews.length === 0) {
                return null;
              }
              
              // Filter scheduled interviews
              const scheduledInterviews = interviews.filter(
                (int: Interview) => int.status === InterviewStatus.SCHEDULED
              );
              
              // Also show completed/cancelled interviews in history
              const otherInterviews = interviews.filter(
                (int: Interview) => int.status !== InterviewStatus.SCHEDULED
              );

              return (
                <Card key={application._id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-xl">
                          {getJobDetails(application).title}
                        </CardTitle>
                        <p className="text-sm text-gray-600 mt-1">
                          {isCandidate
                            ? application.stage || application.currentStage
                              ? (application.stage || application.currentStage)?.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())
                              : "Interview Stage"
                            : `Candidate: ${application.candidate?.fullName || "N/A"}`}
                          {/* Show star indicator for referred candidates - priority for earlier interview */}
                          {!isCandidate && (application as any).isReferral && (
                            <span 
                              className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800" 
                              title="Referred Candidate - Priority for Earlier Interview"
                            >
                              ⭐ Referral
                            </span>
                          )}
                        </p>
                      </div>
                      <StatusBadge status={application.status} type="application" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Position:</span>
                          <span className="ml-2 text-gray-900">
                            {getJobDetails(application).title}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Department:</span>
                          <span className="ml-2 text-gray-900">
                            {getJobDetails(application).department}
                          </span>
                        </div>
                      </div>

                      {/* Display Scheduled Interviews */}
                      {scheduledInterviews.length > 0 && (
                        <div className="pt-4 border-t">
                          <h4 className="text-sm font-semibold text-gray-900 mb-3">
                            Scheduled Interviews ({scheduledInterviews.length})
                          </h4>
                          <div className="space-y-4">
                            {scheduledInterviews.map((interview: Interview) => (
                              <div
                                key={interview._id}
                                className="bg-blue-50 border border-blue-200 rounded-lg p-4"
                              >
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                  <div>
                                    <span className="text-gray-600 font-medium">Date & Time:</span>
                                    <p className="text-gray-900 font-semibold mt-1">
                                      {formatDate(interview.scheduledDate)}
                                    </p>
                                  </div>
                                  <div>
                                    <span className="text-gray-600 font-medium">Method:</span>
                                    <p className="text-gray-900 font-semibold mt-1">
                                      {getInterviewMethodLabel(interview.method)}
                                    </p>
                                  </div>
                                  <div>
                                    <span className="text-gray-600 font-medium">Stage:</span>
                                    <p className="text-gray-900 font-semibold mt-1">
                                      {interview.stage?.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase()) || "N/A"}
                                    </p>
                                  </div>
                                  <div>
                                    <span className="text-gray-600 font-medium">Status:</span>
                                    <p className="text-gray-900 font-semibold mt-1">
                                      {interview.status?.charAt(0).toUpperCase() + interview.status?.slice(1) || "Scheduled"}
                                    </p>
                                  </div>
                                  {interview.videoLink && (
                                    <div className="md:col-span-2">
                                      <span className="text-gray-600 font-medium">Video Link:</span>
                                      <a
                                        href={interview.videoLink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-600 hover:underline ml-2"
                                      >
                                        {interview.videoLink}
                                      </a>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Show message if no scheduled interviews but has other interviews */}
                      {scheduledInterviews.length === 0 && otherInterviews.length > 0 && (
                        <div className="pt-4 border-t">
                          <p className="text-sm text-gray-600 mb-2">
                            No upcoming interviews scheduled. See interview history below.
                          </p>
                        </div>
                      )}

                      {/* Show completed/cancelled interviews */}
                      {otherInterviews.length > 0 && (
                        <div className="pt-4 border-t">
                          <h4 className="text-sm font-semibold text-gray-700 mb-2">Interview History</h4>
                          <div className="space-y-2">
                            {otherInterviews.map((interview: Interview) => (
                              <div key={interview._id} className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                                <span className="font-medium">
                                  {interview.stage?.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}:
                                </span>{" "}
                                {formatDate(interview.scheduledDate)} -{" "}
                                <span className={interview.status === InterviewStatus.COMPLETED ? "text-green-600" : "text-red-600"}>
                                  {interview.status?.charAt(0).toUpperCase() + interview.status?.slice(1)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Show message if no interviews at all (shouldn't happen) */}
                      {scheduledInterviews.length === 0 && otherInterviews.length === 0 && (
                        <div className="pt-4 border-t">
                          <p className="text-sm text-gray-600 mb-2">
                            Interview details will be shared by the hiring team. Please check your email for
                            interview invitations and updates.
                          </p>
                          <Link href={`/dashboard/recruitment/my-applications`}>
                            <button className="text-blue-600 hover:underline text-sm font-medium">
                              View Application Details →
                            </button>
                          </Link>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}

