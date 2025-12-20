"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/hooks/use-auth";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { isHRStaff } from "@/lib/utils/role-utils";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/shared/ui/Card";
import { recruitmentApi } from "@/lib/api/recruitment/recruitment";
import { Application } from "@/types/recruitment";
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

export default function EmployeeReferralsPage() {
  const { user } = useAuth();
  const { toast, showToast, hideToast } = useToast();
  const [referrals, setReferrals] = useState<any[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  
  const isHR = isHRStaff(user);
  const isEmployee = user?.userType === "employee" && !isHR;

  useEffect(() => {
    loadReferrals();
  }, []);

  const loadReferrals = async () => {
    try {
      setLoading(true);
      // Get all applications to find referrals
      const apps = await recruitmentApi.getApplications();
      setApplications(apps);
      
      // For each application, check if it has referrals
      const referralData: any[] = [];
      
      for (const app of apps) {
        try {
          // CHANGED - Handle candidateId as populated object or string
          const candidateId = typeof app.candidateId === 'object' 
            ? (app.candidateId as any)?._id 
            : app.candidateId;
          if (!candidateId) continue;
          
          const candidateReferrals = await recruitmentApi.getCandidateReferrals(candidateId);
          if (candidateReferrals && candidateReferrals.length > 0) {
            // Check if current user is the referring employee (for employees) or show all (for HR)
            const userReferrals = isHR
              ? candidateReferrals
              : candidateReferrals.filter(
                  (ref: any) => ref.referringEmployeeId === user?.id || ref.referringEmployeeId === user?.userId
                );
            if (userReferrals.length > 0) {
              referralData.push({
                application: app,
                referral: userReferrals[0],
              });
            }
          }
        } catch (error) {
          // Skip if no referrals found
        }
      }
      
      setReferrals(referralData);
    } catch (error: any) {
      showToast(error.message || "Failed to load referrals", "error");
    } finally {
      setLoading(false);
    }
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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {isHR ? "Candidate Referrals" : "My Referrals"}
              </h1>
              <p className="text-gray-600 mt-1">
                {isHR ? "View and track candidate referrals" : "Track candidates you've referred"}
              </p>
              {isHR && (
                <p className="text-sm text-blue-600 mt-2">
                  💡 To tag candidates as referrals, go to Candidate Tracking page
                </p>
              )}
            </div>
          </div>
        </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Loading referrals...</p>
        </div>
      ) : referrals.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500 mb-4">You haven't referred any candidates yet.</p>
            <p className="text-sm text-gray-400">
              Note: Referral tagging requires HR_EMPLOYEE or HR_MANAGER role in the backend.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {referrals.map((item, index) => (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-xl">
                      {getJobDetails(item.application).title}
                    </CardTitle>
                    <p className="text-sm text-gray-600 mt-1">
                      Candidate: {item.application.candidate?.fullName || "N/A"}
                    </p>
                  </div>
                  <StatusBadge status={item.application.status} type="application" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Position:</span>
                      <span className="ml-2 text-gray-900">
                        {getJobDetails(item.application).title}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Status:</span>
                      <span className="ml-2 text-gray-900 capitalize">
                        {item.application.status.replace("_", " ")}
                      </span>
                    </div>
                  </div>
                  {/* CHANGED - Added text-gray-900 for visibility */}
                  {item.referral.role && (
                    <div className="text-sm text-gray-900">
                      <span className="text-gray-500">Referred for:</span>
                      <span className="ml-2 text-gray-900">{item.referral.role}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      </div>
    </ProtectedRoute>
  );
}

