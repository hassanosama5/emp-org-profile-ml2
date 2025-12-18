"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/hooks/use-auth";
import { SystemRole } from "@/types";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { isHRStaff } from "@/lib/utils/role-utils";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/shared/ui/Card";
import { Button } from "@/components/shared/ui/Button";
import { Input } from "@/components/shared/ui/Input";
import { Modal } from "@/components/leaves/Modal";
import { recruitmentApi } from "@/lib/api/recruitment/recruitment";
import { Application } from "@/types/recruitment";
import { StatusBadge } from "@/components/recruitment/StatusBadge";
import { Toast, useToast } from "@/components/leaves/Toast";

export default function EmployeeReferralsPage() {
  const { user } = useAuth();
  const { toast, showToast, hideToast } = useToast();
  const [referrals, setReferrals] = useState<any[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [isTagModalOpen, setIsTagModalOpen] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<string>("");
  const [tagForm, setTagForm] = useState({ role: "", level: "" });
  
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

  const handleOpenTag = (candidateId: string) => {
    setSelectedCandidate(candidateId);
    setTagForm({ role: "", level: "" });
    setIsTagModalOpen(true);
  };

  const handleTagCandidate = async () => {
    try {
      await recruitmentApi.tagCandidateAsReferral(
        selectedCandidate,
        user?.id || user?.userId,
        tagForm.role || undefined,
        tagForm.level || undefined
      );
      showToast("Candidate tagged as referral successfully", "success");
      setIsTagModalOpen(false);
      loadReferrals();
    } catch (error: any) {
      showToast(error.message || "Failed to tag candidate", "error");
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
                {isHR ? "Tag and track candidate referrals" : "Track candidates you've referred"}
              </p>
            </div>
          </div>
        </div>

        {isHR && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Tag Candidates as Referrals</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-gray-500">Loading applications...</p>
              ) : applications.length === 0 ? (
                <p className="text-gray-500">No applications found.</p>
              ) : (
                <div className="space-y-2">
                  {applications.slice(0, 10).map((app) => {
                    // CHANGED - Handle candidateId as populated object or string
                    const candidateId = typeof app.candidateId === 'object' 
                      ? (app.candidateId as any)?._id 
                      : app.candidateId;
                    const candidateName = app.candidate?.fullName || 
                      (typeof app.candidateId === 'object' ? (app.candidateId as any)?.fullName : null) || 
                      'Unknown';
                    
                    return (
                      <div key={app._id} className="flex items-center justify-between p-2 border rounded">
                        <div>
                          {/* CHANGED - Added text-gray-900 for visibility */}
                          <span className="font-medium text-gray-900">{candidateName}</span>
                          <span className="text-sm text-gray-500 ml-2">
                            - {app.requisition?.template?.title || "Application"}
                          </span>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenTag(candidateId)}
                        >
                          Tag as Referral
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}

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
                      {item.application.requisition?.template?.title || "Referred Candidate"}
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
                        {item.application.requisition?.template?.title || "N/A"}
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

        {/* Tag Candidate Modal */}
        <Modal
          isOpen={isTagModalOpen}
          onClose={() => setIsTagModalOpen(false)}
          title="Tag Candidate as Referral"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Role (Optional)
              </label>
              <Input
                value={tagForm.role}
                onChange={(e) => setTagForm({ ...tagForm, role: e.target.value })}
                placeholder="e.g., Software Engineer"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Level (Optional)
              </label>
              <Input
                value={tagForm.level}
                onChange={(e) => setTagForm({ ...tagForm, level: e.target.value })}
                placeholder="e.g., Senior"
              />
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsTagModalOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleTagCandidate}>Tag Candidate</Button>
            </div>
          </div>
        </Modal>
      </div>
    </ProtectedRoute>
  );
}

