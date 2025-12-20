"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/hooks/use-auth";
import { SystemRole } from "@/types";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { recruitmentApi } from "@/lib/api/recruitment/recruitment";
import { Application, ApplicationStatus, UpdateApplicationStatusDto } from "@/types/recruitment";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/shared/ui/Card";
import { Button } from "@/components/shared/ui/Button";
import { Input } from "@/components/shared/ui/Input";
import { Select } from "@/components/leaves/Select";
// CHANGED - Added Textarea for rejection reason
import { Textarea } from "@/components/leaves/Textarea";
import { Modal } from "@/components/leaves/Modal";
import { Toast, useToast } from "@/components/leaves/Toast";
import { StatusBadge } from "@/components/recruitment/StatusBadge";

// Helper function to extract job details from application
// Handles all possible nested structures from the backend
const getJobDetails = (application: Application | null) => {
  if (!application) {
    return { title: "Unknown Position", department: "Unknown Department", location: "Unknown Location", openings: 0 };
  }
  
  const app = application as any;
  
  // Try all possible paths for the job title
  const title = 
    app.requisitionId?.templateId?.title ||
    app.requisitionId?.template?.title ||
    app.requisition?.templateId?.title ||
    app.requisition?.template?.title ||
    app.jobRequisition?.templateId?.title ||
    app.jobRequisition?.template?.title ||
    "Unknown Position";
  
  // Try all possible paths for department
  const department = 
    app.requisitionId?.templateId?.department ||
    app.requisitionId?.template?.department ||
    app.requisition?.templateId?.department ||
    app.requisition?.template?.department ||
    app.jobRequisition?.templateId?.department ||
    app.jobRequisition?.template?.department ||
    "Unknown Department";
  
  // Try all possible paths for location
  const location = 
    app.requisitionId?.location ||
    app.requisition?.location ||
    app.jobRequisition?.location ||
    "Unknown Location";
  
  // Try all possible paths for openings
  const openings = 
    app.requisitionId?.openings ||
    app.requisition?.openings ||
    app.jobRequisition?.openings ||
    0;
  
  return { title, department, location, openings };
};

export default function ApplicationsPage() {
  const { user } = useAuth();
  const { toast, showToast, hideToast } = useToast();
  const [applications, setApplications] = useState<Application[]>([]);
  const [filteredApplications, setFilteredApplications] = useState<Application[]>([]);
  const [jobRequisitions, setJobRequisitions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequisitionId, setSelectedRequisitionId] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [statusUpdate, setStatusUpdate] = useState<ApplicationStatus>(ApplicationStatus.SUBMITTED);
  // CHANGED - Added rejection reason state for REC-022
  const [rejectionReason, setRejectionReason] = useState<string>("");
  const [updating, setUpdating] = useState(false);
  const [isReferralModalOpen, setIsReferralModalOpen] = useState(false);
  const [selectedCandidateForReferral, setSelectedCandidateForReferral] = useState<any>(null);
  const [referralRole, setReferralRole] = useState("");
  const [referralLevel, setReferralLevel] = useState("");
  const [taggingReferral, setTaggingReferral] = useState(false);
  const [candidateReferrals, setCandidateReferrals] = useState<Record<string, any[]>>({});
  const [isInterviewFeedbackModalOpen, setIsInterviewFeedbackModalOpen] = useState(false);
  const [interviewFeedbackData, setInterviewFeedbackData] = useState<{
    interviews: any[];
    scores: Record<string, number>;
    feedback: Record<string, any[]>;
  } | null>(null);
  const [loadingInterviewFeedback, setLoadingInterviewFeedback] = useState(false);

  // CHANGED - Only HR Manager can update status, HR Employee can only track/view
  const canUpdateStatus = user?.roles?.some(
    (role) => String(role).toLowerCase() === "hr manager" || String(role).toLowerCase() === "system admin"
  );

  // CHANGED - HR Employee can tag referrals
  const canTagReferrals = user?.roles?.some(
    (role) => ["hr employee", "hr manager", "system admin"].includes(String(role).toLowerCase())
  );

  // CHANGED - HR Manager can view interview feedback
  const canViewInterviewFeedback = user?.roles?.some(
    (role) => String(role).toLowerCase() === "hr manager" || String(role).toLowerCase() === "system admin"
  );

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterApplications();
  }, [selectedRequisitionId, selectedStatus, applications]);

  // Load referrals for all candidates
  useEffect(() => {
    if (applications.length > 0 && canTagReferrals) {
      loadReferrals();
    }
  }, [applications, canTagReferrals]);

  const loadReferrals = async () => {
    const referralsMap: Record<string, any[]> = {};
    for (const app of applications) {
      const candidateId = typeof app.candidateId === 'object' ? app.candidateId?._id : app.candidateId;
      if (candidateId) {
        try {
          const referrals = await recruitmentApi.getCandidateReferrals(candidateId);
          referralsMap[candidateId] = referrals || [];
        } catch (error) {
          console.error(`Error loading referrals for candidate ${candidateId}:`, error);
          referralsMap[candidateId] = [];
        }
      }
    }
    setCandidateReferrals(referralsMap);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [apps, jobs] = await Promise.all([
        recruitmentApi.getApplications(),
        recruitmentApi.getJobRequisitions(),
      ]);
      setApplications(apps);
      setFilteredApplications(apps);
      setJobRequisitions(jobs);
    } catch (error: any) {
      showToast(error.message || "Failed to load applications", "error");
    } finally {
      setLoading(false);
    }
  };

  const filterApplications = () => {
    let filtered = [...applications];

    // Filter by requisition
    if (selectedRequisitionId) {
      filtered = filtered.filter((app) => app.requisitionId === selectedRequisitionId);
    }

    // Filter by status
    if (selectedStatus) {
      filtered = filtered.filter((app) => app.status === selectedStatus);
    }

    setFilteredApplications(filtered);
  };

  const handleOpenStatusUpdate = (application: Application) => {
    setSelectedApplication(application);
    setStatusUpdate(application.status);
    // CHANGED - Reset rejection reason when opening modal
    setRejectionReason("");
    setIsStatusModalOpen(true);
  };

  // CHANGED - Updated to include rejection reason for REC-022
  const handleUpdateStatus = async () => {
    if (!selectedApplication) return;

    // CHANGED - Validate rejection reason is provided when rejecting
    if (statusUpdate === ApplicationStatus.REJECTED && !rejectionReason.trim()) {
      showToast("Please provide a rejection reason", "error");
      return;
    }

    try {
      setUpdating(true);
      // CHANGED - Include rejection reason in the update
      const updateData: UpdateApplicationStatusDto = {
        status: statusUpdate,
      };
      
      // CHANGED - REC-022: Add rejection reason if rejecting
      if (statusUpdate === ApplicationStatus.REJECTED && rejectionReason.trim()) {
        updateData.rejectionReason = rejectionReason.trim();
      }

      await recruitmentApi.updateApplicationStatus(selectedApplication._id, updateData);
      
      // CHANGED - Show appropriate message based on status
      if (statusUpdate === ApplicationStatus.REJECTED) {
        showToast("Application rejected. Candidate will be notified automatically.", "success");
      } else {
        showToast("Application status updated successfully", "success");
      }
      
      setIsStatusModalOpen(false);
      setSelectedApplication(null);
      setRejectionReason("");
      await loadData();
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || 
                          error?.response?.data?.error || 
                          error?.message || 
                          "Failed to update status";
      showToast(errorMessage, "error");
    } finally {
      setUpdating(false);
    }
  };

  const handleOpenReferralTag = (application: Application) => {
    const candidate = application.candidate || (typeof application.candidateId === 'object' ? application.candidateId : null);
    const candidateId = typeof application.candidateId === 'object' ? application.candidateId?._id : application.candidateId;
    setSelectedCandidateForReferral({ candidate, candidateId, application });
    setReferralRole("");
    setReferralLevel("");
    setIsReferralModalOpen(true);
  };

  const handleTagReferral = async () => {
    if (!selectedCandidateForReferral?.candidateId) return;

    try {
      setTaggingReferral(true);
      const currentUserId = user?.id || user?.userId || (user as any)?._id;
      await recruitmentApi.tagCandidateAsReferral(
        selectedCandidateForReferral.candidateId,
        currentUserId,
        referralRole || undefined,
        referralLevel || undefined
      );
      showToast("Candidate tagged as referral successfully", "success");
      setIsReferralModalOpen(false);
      setSelectedCandidateForReferral(null);
      setReferralRole("");
      setReferralLevel("");
      await loadReferrals();
      await loadData();
    } catch (error: any) {
      showToast(error.message || "Failed to tag candidate as referral", "error");
    } finally {
      setTaggingReferral(false);
    }
  };

  const getProgressPercentage = (status: ApplicationStatus): number => {
    switch (status) {
      case ApplicationStatus.SUBMITTED:
        return 20;
      case ApplicationStatus.IN_PROCESS:
        return 40;
      case ApplicationStatus.OFFER:
        return 80;
      case ApplicationStatus.HIRED:
        return 100;
      case ApplicationStatus.REJECTED:
        return 0;
      default:
        return 0;
    }
  };

  const isReferral = (application: Application): boolean => {
    const candidateId = typeof application.candidateId === 'object' ? application.candidateId?._id : application.candidateId;
    if (!candidateId) return false;
    const referrals = candidateReferrals[candidateId] || [];
    return referrals.length > 0;
  };

  const hasInterviewFeedback = (application: Application): boolean => {
    const interviews = (application as any).interviews || [];
    return interviews.some((int: any) => int.status === 'scheduled' || int.status === 'completed');
  };

  const handleViewInterviewFeedback = async (application: Application) => {
    try {
      setLoadingInterviewFeedback(true);
      setSelectedApplication(application);
      
      const interviews = (application as any).interviews || [];
      const scores: Record<string, number> = {};
      const feedback: Record<string, any[]> = {};
      
      for (const interview of interviews) {
        const interviewId = interview._id;
        if (interviewId) {
          try {
            const avgScore = await recruitmentApi.getInterviewAverageScore(interviewId);
            scores[interviewId] = avgScore;
            
            const interviewFeedback = await recruitmentApi.getInterviewFeedback(interviewId);
            feedback[interviewId] = Array.isArray(interviewFeedback) ? interviewFeedback : [];
          } catch (error) {
            console.log(`Could not load data for interview ${interviewId}:`, error);
          }
        }
      }
      
      setInterviewFeedbackData({
        interviews,
        scores,
        feedback,
      });
      setIsInterviewFeedbackModalOpen(true);
    } catch (error: any) {
      showToast(error.message || "Failed to load interview feedback", "error");
    } finally {
      setLoadingInterviewFeedback(false);
    }
  };

  return (
    <ProtectedRoute
      allowedRoles={[SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.SYSTEM_ADMIN]}
    >
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
              <h1 className="text-3xl font-bold text-gray-900">Applications</h1>
              <p className="text-gray-600 mt-1">Review and manage candidate applications</p>
            </div>
            <div className="flex gap-2">
              <Select
                value={selectedRequisitionId}
                onChange={(e) => setSelectedRequisitionId(e.target.value)}
                className="w-64"
                options={[
                  { value: "", label: "All Job Requisitions" },
                  ...jobRequisitions.map((job) => ({
                    value: job._id,
                    label: job.template?.title || "Job Opening",
                  })),
                ]}
              />
              <Select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-48"
                options={[
                  { value: "", label: "All Statuses" },
                  { value: ApplicationStatus.SUBMITTED, label: "Submitted" },
                  { value: ApplicationStatus.IN_PROCESS, label: "In Process" },
                  { value: ApplicationStatus.OFFER, label: "Offer" },
                  { value: ApplicationStatus.HIRED, label: "Hired" },
                  { value: ApplicationStatus.REJECTED, label: "Rejected" },
                ]}
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading applications...</p>
          </div>
        ) : filteredApplications.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-500">No applications found.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredApplications.map((application) => {
              const candidate = application.candidate || (typeof application.candidateId === 'object' ? application.candidateId : null);
              const candidateName = candidate?.fullName || candidate?.firstName || candidate?.lastName 
                ? `${candidate?.firstName || ''} ${candidate?.lastName || ''}`.trim() || candidate?.fullName
                : typeof application.candidateId === 'string' ? application.candidateId : 'Unknown Candidate';
              const candidateEmail = candidate?.personalEmail || candidate?.email || 'N/A';
              const candidatePhone = candidate?.phoneNumber || candidate?.phone || 'N/A';
              
              return (
                <Card key={application._id} className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {getJobDetails(application).title}
                          </h3>
                          <StatusBadge status={application.status} type="application" />
                          {isReferral(application) && (
                            <span className="px-2 py-1 text-xs font-semibold text-purple-700 bg-purple-100 rounded-full">
                              Referral
                            </span>
                          )}
                          {canViewInterviewFeedback && hasInterviewFeedback(application) && (
                            <span className="px-2 py-1 text-xs font-semibold text-green-700 bg-green-100 rounded-full">
                              Interview Feedback Available
                            </span>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                          <div>
                            <p className="text-xs font-medium text-gray-500 uppercase mb-1">Candidate Information</p>
                            <p className="text-sm text-gray-900 font-medium">{candidateName}</p>
                            <p className="text-xs text-gray-600">{candidateEmail}</p>
                            <p className="text-xs text-gray-600">{candidatePhone}</p>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-gray-500 uppercase mb-1">Job Details</p>
                            <p className="text-sm text-gray-900">
                              {getJobDetails(application).department}
                            </p>
                            <p className="text-xs text-gray-600">
                              Location: {getJobDetails(application).location}
                            </p>
                            {getJobDetails(application).openings > 0 && (
                              <p className="text-xs text-gray-600">
                                Openings: {getJobDetails(application).openings}
                              </p>
                            )}
                          </div>
                        </div>

                        {(application.stage || application.currentStage) && (
                          <div className="mb-3">
                            <p className="text-xs font-medium text-gray-500 uppercase mb-1">Current Stage</p>
                            <p className="text-sm text-gray-700">
                              {(application.stage || application.currentStage || '').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </p>
                          </div>
                        )}

                        <div className="mt-3 mb-3">
                          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                            <span className="font-medium">Application Progress</span>
                            <span className="font-semibold">{getProgressPercentage(application.status)}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2.5">
                            <div
                              className={`h-2.5 rounded-full transition-all ${
                                application.status === ApplicationStatus.REJECTED
                                  ? 'bg-red-500'
                                  : application.status === ApplicationStatus.HIRED
                                  ? 'bg-green-500'
                                  : 'bg-blue-600'
                              }`}
                              style={{ width: `${getProgressPercentage(application.status)}%` }}
                            />
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-xs text-gray-500 mt-3 pt-3 border-t">
                          {application.createdAt && (
                            <span>
                              Applied: {new Date(application.createdAt).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              })}
                            </span>
                          )}
                          {application.updatedAt && (
                            <span>
                              Last Updated: {new Date(application.updatedAt).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              })}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4">
                        {canViewInterviewFeedback && hasInterviewFeedback(application) && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewInterviewFeedback(application)}
                            disabled={loadingInterviewFeedback}
                          >
                            {loadingInterviewFeedback ? "Loading..." : "View Interview Feedback"}
                          </Button>
                        )}
                        {canUpdateStatus && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenStatusUpdate(application)}
                            disabled={application.status === ApplicationStatus.HIRED || application.status === ApplicationStatus.REJECTED}
                          >
                            Update Status
                          </Button>
                        )}
                        {canTagReferrals && !isReferral(application) && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenReferralTag(application)}
                          >
                            Tag as Referral
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Referral Tag Modal */}
        <Modal
          isOpen={isReferralModalOpen}
          onClose={() => {
            setIsReferralModalOpen(false);
            setSelectedCandidateForReferral(null);
            setReferralRole("");
            setReferralLevel("");
          }}
          title="Tag Candidate as Referral"
        >
          {selectedCandidateForReferral && (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-2">
                  Candidate: <span className="font-semibold">
                    {selectedCandidateForReferral.candidate?.fullName || 
                     selectedCandidateForReferral.candidate?.firstName || 
                     "Unknown Candidate"}
                  </span>
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role (Optional)
                </label>
                <Input
                  value={referralRole}
                  onChange={(e) => setReferralRole(e.target.value)}
                  placeholder="e.g., Software Engineer"
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Level (Optional)
                </label>
                <Input
                  value={referralLevel}
                  onChange={(e) => setReferralLevel(e.target.value)}
                  placeholder="e.g., Senior, Mid-level"
                  className="w-full"
                />
              </div>
              <div className="flex gap-2 pt-4">
                <Button
                  onClick={handleTagReferral}
                  disabled={taggingReferral}
                  className="flex-1"
                >
                  {taggingReferral ? "Tagging..." : "Tag as Referral"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsReferralModalOpen(false);
                    setSelectedCandidateForReferral(null);
                    setReferralRole("");
                    setReferralLevel("");
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </Modal>

        {/* Status Update Modal */}
        <Modal
          isOpen={isStatusModalOpen}
          onClose={() => {
            setIsStatusModalOpen(false);
            setRejectionReason("");
          }}
          title="Update Application Status"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status *
              </label>
              <Select
                value={statusUpdate}
                onChange={(e) => setStatusUpdate(e.target.value as ApplicationStatus)}
                options={[
                  { value: ApplicationStatus.SUBMITTED, label: "Submitted" },
                  { value: ApplicationStatus.IN_PROCESS, label: "In Process" },
                  { value: ApplicationStatus.OFFER, label: "Offer" },
                  { value: ApplicationStatus.HIRED, label: "Hired" },
                  { value: ApplicationStatus.REJECTED, label: "Rejected" },
                ]}
              />
            </div>

            {/* CHANGED - REC-022: Show rejection reason field when rejecting */}
            {statusUpdate === ApplicationStatus.REJECTED && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <label className="block text-sm font-medium text-red-800 mb-2">
                  Rejection Reason * (will be sent to candidate)
                </label>
                <Textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Please provide a respectful reason for rejection. This will be included in the notification email sent to the candidate."
                  rows={4}
                  className="w-full"
                />
                <p className="text-xs text-red-600 mt-2">
                  ⚠️ This message will be included in the automated rejection email to the candidate.
                </p>
              </div>
            )}

            {selectedApplication && (
              <div className="mt-4 p-3 bg-gray-50 rounded-md">
                <p className="text-xs text-gray-500 mb-1">Current Status</p>
                <StatusBadge status={selectedApplication.status} type="application" />
                <p className="text-xs text-gray-600 mt-2">
                  Candidate: {selectedApplication.candidate?.fullName || 
                    (typeof selectedApplication.candidateId === 'object' 
                      ? selectedApplication.candidateId?.fullName 
                      : selectedApplication.candidateId) || 
                    'Unknown'}
                </p>
                <p className="text-xs text-gray-600">
                  Position: {getJobDetails(selectedApplication).title}
                </p>
              </div>
            )}

            <div className="flex justify-end gap-2 mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsStatusModalOpen(false);
                  setRejectionReason("");
                }}
                disabled={updating}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleUpdateStatus}
                variant={statusUpdate === ApplicationStatus.REJECTED ? "danger" : "primary"}
                disabled={updating || !selectedApplication}
              >
                {updating 
                  ? "Updating..." 
                  : statusUpdate === ApplicationStatus.REJECTED 
                    ? "Reject Application" 
                    : "Update Status"}
              </Button>
            </div>
          </div>
        </Modal>

        {/* Interview Feedback Modal */}
        <Modal
          isOpen={isInterviewFeedbackModalOpen}
          onClose={() => {
            setIsInterviewFeedbackModalOpen(false);
            setInterviewFeedbackData(null);
            setSelectedApplication(null);
          }}
          title="Interview Feedback Review"
        >
          {selectedApplication && interviewFeedbackData && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2">Candidate Information</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-600">Candidate:</span>
                    <span className="ml-2 font-medium">
                      {selectedApplication.candidate?.fullName || 
                        (typeof selectedApplication.candidateId === 'object' 
                          ? selectedApplication.candidateId?.fullName 
                          : selectedApplication.candidateId) || 
                        'Unknown'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Position:</span>
                    <span className="ml-2 font-medium">
                      {getJobDetails(selectedApplication).title}
                    </span>
                  </div>
                </div>
              </div>

              {interviewFeedbackData.interviews.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No interviews found for this application.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {interviewFeedbackData.interviews.map((interview: any) => {
                    const interviewId = interview._id;
                    const avgScore = interviewFeedbackData.scores[interviewId];
                    const feedbackList = interviewFeedbackData.feedback[interviewId] || [];
                    
                    return (
                      <div key={interviewId} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="font-semibold text-gray-900">
                              {interview.stage?.replace("_", " ").toUpperCase()} Interview
                            </h4>
                            <p className="text-xs text-gray-500 mt-1">
                              {interview.scheduledDate 
                                ? new Date(interview.scheduledDate).toLocaleString()
                                : 'Date not set'}
                            </p>
                          </div>
                          <StatusBadge status={interview.status} type="interview" />
                        </div>

                        {avgScore !== undefined && (
                          <div className="bg-blue-50 p-3 rounded-lg mb-3">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-gray-700">Average Score:</span>
                              <span className="text-xl font-bold text-blue-600">
                                {avgScore.toFixed(1)}/100
                              </span>
                            </div>
                          </div>
                        )}

                        {feedbackList.length > 0 ? (
                          <div className="space-y-3">
                            <h5 className="text-sm font-medium text-gray-700">Panel Feedback:</h5>
                            {feedbackList.map((fb: any, index: number) => {
                              // =============================================================
                              // PARSE STRUCTURED ASSESSMENT FROM COMMENTS
                              // =============================================================
                              // Comments may contain JSON with detailed skill scores
                              // Format: { skillScores: {...}, generalComments: "..." }
                              // =============================================================
                              let parsedAssessment: any = null;
                              try {
                                if (fb.comments && fb.comments.startsWith('{')) {
                                  parsedAssessment = JSON.parse(fb.comments);
                                }
                              } catch (e) {
                                // Not JSON, display as plain text
                              }

                              return (
                                <div key={index} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                  <div className="flex items-center justify-between mb-3">
                                    <span className="text-sm font-semibold text-gray-900">
                                      Interviewer {index + 1}
                                    </span>
                                    <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                                      (fb.score || 0) >= 70 ? 'bg-green-100 text-green-700' :
                                      (fb.score || 0) >= 50 ? 'bg-yellow-100 text-yellow-700' :
                                      'bg-red-100 text-red-700'
                                    }`}>
                                      Overall: {fb.score || 0}/100
                                    </span>
                                  </div>
                                  
                                  {/* Display structured skill breakdown if available */}
                                  {parsedAssessment?.skillScores && (
                                    <div className="mb-3">
                                      <p className="text-xs font-medium text-gray-600 mb-2">Skill Breakdown:</p>
                                      <div className="grid grid-cols-2 gap-2">
                                        {Object.entries(parsedAssessment.skillScores).map(([skill, skillScore]: [string, any]) => (
                                          <div key={skill} className="flex items-center justify-between bg-white p-2 rounded border">
                                            <span className="text-xs text-gray-700 truncate">{skill}</span>
                                            <span className={`text-xs font-bold ${
                                              skillScore >= 70 ? 'text-green-600' :
                                              skillScore >= 50 ? 'text-yellow-600' :
                                              'text-red-600'
                                            }`}>
                                              {skillScore}
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  
                                  {/* Display general comments */}
                                  {parsedAssessment?.generalComments && (
                                    <div className="bg-white p-3 rounded border border-gray-100">
                                      <p className="text-xs font-medium text-gray-600 mb-1">Comments:</p>
                                      <p className="text-sm text-gray-700">{parsedAssessment.generalComments}</p>
                                    </div>
                                  )}
                                  
                                  {/* Fallback: display plain text comments if not structured */}
                                  {!parsedAssessment && fb.comments && (
                                    <div className="bg-white p-3 rounded border border-gray-100">
                                      <p className="text-xs font-medium text-gray-600 mb-1">Comments:</p>
                                      <p className="text-sm text-gray-700">{fb.comments}</p>
                                    </div>
                                  )}
                                  
                                  {fb.createdAt && (
                                    <p className="text-xs text-gray-500 mt-3">
                                      Submitted: {new Date(fb.createdAt).toLocaleString()}
                                    </p>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                            <p className="text-sm text-yellow-800">
                              No feedback submitted yet for this interview.
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsInterviewFeedbackModalOpen(false);
                    setInterviewFeedbackData(null);
                    setSelectedApplication(null);
                  }}
                >
                  Close
                </Button>
                {canUpdateStatus && selectedApplication && 
                 selectedApplication.status !== ApplicationStatus.HIRED && 
                 selectedApplication.status !== ApplicationStatus.REJECTED && (
                  <Button
                    onClick={() => {
                      setIsInterviewFeedbackModalOpen(false);
                      handleOpenStatusUpdate(selectedApplication);
                    }}
                  >
                    Update Application Status
                  </Button>
                )}
              </div>
            </div>
          )}
        </Modal>
      </div>
    </ProtectedRoute>
  );
}

