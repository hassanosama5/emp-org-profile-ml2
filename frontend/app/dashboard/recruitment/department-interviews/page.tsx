"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/hooks/use-auth";
import { useRequireAuth } from "@/lib/hooks/use-auth";
import { SystemRole } from "@/types";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/shared/ui/Card";
import { recruitmentApi } from "@/lib/api/recruitment/recruitment";
import { Application } from "@/types/recruitment";
import { StatusBadge } from "@/components/recruitment/StatusBadge";
import { Toast, useToast } from "@/components/leaves/Toast";

export default function DepartmentInterviewsPage() {
  const { user } = useAuth();
  useRequireAuth(SystemRole.DEPARTMENT_HEAD);
  const { toast, showToast, hideToast } = useToast();
  const [interviews, setInterviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInterviews();
  }, []);

  const loadInterviews = async () => {
    try {
      setLoading(true);
      // Get all applications
      const applications = await recruitmentApi.getApplications();
      
      // Filter applications that are in interview stages for this department
      // In a real implementation, you'd filter by department
      const interviewApplications = applications.filter(
        (app) =>
          app.stage?.includes("interview") &&
          (app.stage === "department_interview" || app.status === "in_process")
      );

      // For each application, try to get interview feedback
      const interviewData = [];
      for (const app of interviewApplications) {
        try {
          // In a real implementation, you'd fetch actual interview records
          // For now, we'll show applications in interview stages
          interviewData.push({
            application: app,
            interviewId: `interview-${app._id}`,
          });
        } catch (error) {
          // Skip if no interview found
        }
      }

      setInterviews(interviewData);
    } catch (error: any) {
      showToast(error.message || "Failed to load interviews", "error");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
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
        <h1 className="text-3xl font-bold text-gray-900">Department Interviews</h1>
        <p className="text-gray-600 mt-1">View and manage interviews for your department</p>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Loading interviews...</p>
        </div>
      ) : interviews.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500 mb-4">No interviews scheduled for your department.</p>
            <p className="text-sm text-gray-400">
              Note: Interview feedback submission requires HR_EMPLOYEE, HR_MANAGER, or RECRUITER role in the backend.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {interviews.map((item, index) => (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-xl">
                      {item.application.requisition?.template?.title || "Interview"}
                    </CardTitle>
                    <p className="text-sm text-gray-600 mt-1">
                      Candidate: {item.application.candidate?.fullName || "N/A"}
                    </p>
                  </div>
                  <StatusBadge
                    status={item.application.stage || "scheduled"}
                    type="interview"
                  />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Position:</span>
                      <span className="ml-2 text-gray-900">
                        {item.application.requisition?.template?.title || "N/A"}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Stage:</span>
                      <span className="ml-2 text-gray-900 capitalize">
                        {item.application.stage?.replace("_", " ") || "N/A"}
                      </span>
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <p className="text-sm text-gray-600 mb-2">
                      Interview details and feedback submission will be available once the interview is scheduled.
                    </p>
                    <p className="text-xs text-gray-400">
                      Note: To submit interview feedback, the backend needs to support DEPARTMENT_HEAD role for the feedback endpoint.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

