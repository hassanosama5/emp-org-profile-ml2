"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { useAuth } from "@/lib/hooks/use-auth";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/shared/ui/Card";
import { Button } from "@/components/shared/ui/Button";
import { recruitmentApi } from "@/lib/api/recruitment/recruitment";
import { JobRequisition, CreateApplicationDto } from "@/types/recruitment";
import { StatusBadge } from "@/components/recruitment/StatusBadge";
import { Modal } from "@/components/leaves/Modal";
import { Toast, useToast } from "@/components/leaves/Toast";
import { SystemRole } from "@/types";

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { toast, showToast, hideToast } = useToast();
  const [job, setJob] = useState<JobRequisition | null>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [consentGiven, setConsentGiven] = useState(false);
  // CHANGED - Track if user has already applied to this job
  const [hasAlreadyApplied, setHasAlreadyApplied] = useState(false);

  // Determine if user is a candidate or HR staff
  const isCandidate = user?.userType === "candidate" || user?.roles?.includes(SystemRole.JOB_CANDIDATE);
  const isHRStaff = user?.roles?.some(role => 
    [SystemRole.HR_MANAGER, SystemRole.HR_EMPLOYEE, SystemRole.RECRUITER, SystemRole.SYSTEM_ADMIN].includes(role as SystemRole)
  );

  // CHANGED - Added state for CV upload (REC-003)
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [cvUploading, setCvUploading] = useState(false);
  const [cvUploaded, setCvUploaded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (params.id) {
      loadJob();
      // CHANGED - Check if user has already applied
      checkIfAlreadyApplied();
    }
  }, [params.id, user]);

  const loadJob = async () => {
    try {
      setLoading(true);
      const jobData = await recruitmentApi.getJobRequisitionById(params.id as string);
      setJob(jobData);
    } catch (error: any) {
      showToast(error.message || "Failed to load job details", "error");
    } finally {
      setLoading(false);
    }
  };

  // CHANGED - Check if user has already applied to this job
  const checkIfAlreadyApplied = async () => {
    try {
      const candidateId = user?.id || user?.userId;
      if (!candidateId || !params.id) return;

      const applications = await recruitmentApi.getApplications();
      const alreadyApplied = applications.some((app: any) => {
        const appCandidateId = typeof app.candidateId === 'object' 
          ? app.candidateId?._id 
          : app.candidateId;
        return appCandidateId === candidateId && app.requisitionId === params.id;
      });
      
      setHasAlreadyApplied(alreadyApplied);
    } catch (error) {
      // If we can't check, allow them to try (backend will validate)
      console.warn("Could not check existing applications:", error);
    }
  };

  // CHANGED - Handle CV file selection (REC-003)
  const handleCvFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    if (!allowedTypes.includes(file.type)) {
      showToast("Invalid file type. Please upload a PDF or DOC/DOCX file.", "error");
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      showToast("File size exceeds 5MB limit.", "error");
      return;
    }

    setCvFile(file);
    setCvUploaded(false);
  };

  // CHANGED - Remove selected CV file
  const handleRemoveCv = () => {
    setCvFile(null);
    setCvUploaded(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleApply = async () => {
    if (!consentGiven) {
      showToast("You must give consent for data processing to apply", "error");
      return;
    }

    if (!user?.id && !user?.userId) {
      showToast("User information not available", "error");
      return;
    }

    const candidateId = user.id || user.userId || "";

    try {
      setApplying(true);

      // CHANGED - Debug: Log the request details
      console.log("🔍 DEBUG - Applying with:", {
        candidateId,
        requisitionId: job!._id,
        userObject: user,
      });

      // CHANGED - Skip CV upload for now to isolate the issue
      // CV upload is temporarily disabled for debugging
      if (cvFile && !cvUploaded) {
        console.log("📄 CV file selected but skipping upload for debug");
        // setCvUploading(true);
        // try {
        //   await recruitmentApi.uploadCandidateCV(candidateId, cvFile);
        //   setCvUploaded(true);
        //   showToast("CV uploaded successfully!", "success");
        // } catch (cvError: any) {
        //   console.warn("CV upload failed:", cvError.message);
        //   showToast("CV upload failed, but continuing with application...", "warning");
        // } finally {
        //   setCvUploading(false);
        // }
      }

      // Backend expects consentGiven in the body along with CreateApplicationDto
      const applicationData: CreateApplicationDto & { consentGiven: boolean } = {
        candidateId,
        requisitionId: job!._id,
        consentGiven: true,
      };

      console.log("📤 Sending application data:", applicationData);
      await recruitmentApi.createApplication(applicationData);
      showToast("Application submitted successfully!", "success");
      setIsApplyModalOpen(false);
      setTimeout(() => {
        router.push("/dashboard/recruitment/my-applications");
      }, 1500);
    } catch (error: any) {
      showToast(error.message || "Failed to submit application", "error");
    } finally {
      setApplying(false);
    }
  };

  // CHANGED - Reset modal state when closing
  const handleCloseModal = () => {
    setIsApplyModalOpen(false);
    setConsentGiven(false);
    setCvFile(null);
    setCvUploaded(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
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

        <div className="mb-6 flex gap-4">
          {/* CHANGED - Context-aware back navigation based on user type */}
          {isCandidate ? (
            <>
              <Link href="/dashboard/recruitment/my-applications" className="text-blue-600 hover:underline inline-block">
                ← Back to My Applications
              </Link>
              <span className="text-gray-300">|</span>
              <Link href="/dashboard/recruitment/jobs" className="text-blue-600 hover:underline inline-block">
                View All Jobs
              </Link>
            </>
          ) : isHRStaff ? (
            <>
              <Link href="/dashboard/recruitment/job-requisitions" className="text-blue-600 hover:underline inline-block">
                ← Back to Job Requisitions
              </Link>
              <span className="text-gray-300">|</span>
              <Link href="/dashboard/recruitment" className="text-blue-600 hover:underline inline-block">
                Back to Recruitment
              </Link>
            </>
          ) : (
            <Link href="/dashboard/recruitment" className="text-blue-600 hover:underline inline-block">
              ← Back to Recruitment
            </Link>
          )}
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading job details...</p>
          </div>
        ) : !job ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-500">Job not found.</p>
              <Link href="/dashboard/recruitment">
                <Button className="mt-4">Back to Recruitment</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-3xl">
                      {job.template?.title || "Job Opening"}
                    </CardTitle>
                    <div className="mt-2 flex items-center gap-4 text-gray-600">
                      <span>{job.template?.department || "Department"}</span>
                      {job.location && <span>• {job.location}</span>}
                      <span>• {job.openings} {job.openings === 1 ? "opening" : "openings"}</span>
                      {/* CHANGED: Show available positions */}
                      {job.statistics && (
                        <span className={job.statistics.availablePositions === 0 ? "text-red-600 font-medium" : "text-green-600 font-medium"}>
                          • {job.statistics.availablePositions ?? job.openings} available
                        </span>
                      )}
                    </div>
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
                <div className="space-y-6">
                  {job.template?.description && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Description</h3>
                      <p className="text-gray-700 whitespace-pre-wrap">{job.template.description}</p>
                    </div>
                  )}

                  {job.template?.qualifications && job.template.qualifications.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Qualifications</h3>
                      <ul className="list-disc list-inside space-y-1 text-gray-700">
                        {job.template.qualifications.map((qual, idx) => (
                          <li key={idx}>{qual}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {job.template?.skills && job.template.skills.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Required Skills</h3>
                      <div className="flex flex-wrap gap-2">
                        {job.template.skills.map((skill, idx) => (
                          <span key={idx} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {job.template?.requirements && job.template.requirements.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Requirements</h3>
                      <ul className="list-disc list-inside space-y-1 text-gray-700">
                        {job.template.requirements.map((req, idx) => (
                          <li key={idx}>{req}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {job.template?.qualifications && job.template.qualifications.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Qualifications</h3>
                      <ul className="list-disc list-inside space-y-1 text-gray-700">
                        {job.template.qualifications.map((qual, idx) => (
                          <li key={idx}>{qual}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {job.template?.experienceLevel && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Experience Level</h3>
                      <p className="text-gray-700">{job.template.experienceLevel}</p>
                    </div>
                  )}

                  {job.template?.employmentType && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Employment Type</h3>
                      <p className="text-gray-700">{job.template.employmentType}</p>
                    </div>
                  )}

                  {/* CHANGED - Using publishStatus instead of published boolean */}
                  <div className="pt-6 border-t">
                    {/* CHANGED - Check publishStatus === 'published' instead of job.published */}
                    {job.publishStatus === 'published' && user?.userType === "candidate" ? (
                      // CHANGED - Check if no positions available
                      job.statistics?.availablePositions === 0 ? (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                          <p className="text-red-800 font-medium">❌ No Positions Available</p>
                          <p className="text-red-600 text-sm mt-1">
                            All positions for this job have been filled. Check back later or explore other opportunities.
                          </p>
                          <Link href="/dashboard/recruitment/jobs">
                            <Button variant="outline" size="sm" className="mt-3">
                              Browse Other Jobs
                            </Button>
                          </Link>
                        </div>
                      ) : hasAlreadyApplied ? (
                        // CHANGED - Disable button if user has already applied
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                          <p className="text-green-800 font-medium">✅ You have already applied for this position</p>
                          <p className="text-green-600 text-sm mt-1">
                            Check your applications page to track your application status.
                          </p>
                          <Link href="/dashboard/recruitment/my-applications">
                            <Button variant="outline" size="sm" className="mt-3">
                              View My Applications
                            </Button>
                          </Link>
                        </div>
                      ) : (
                        <Button onClick={() => setIsApplyModalOpen(true)} size="lg" className="w-full md:w-auto">
                          Apply for this Position
                        </Button>
                      )
                    ) : job.publishStatus !== 'published' ? (
                      <p className="text-gray-500">This job is not currently accepting applications.</p>
                    ) : null}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Apply Modal */}
        <Modal
          isOpen={isApplyModalOpen}
          onClose={handleCloseModal}
          title="Apply for Position"
          size="lg"
          footer={
            <>
              <Button
                variant="outline"
                onClick={handleCloseModal}
              >
                Cancel
              </Button>
              <Button onClick={handleApply} disabled={!consentGiven || applying || cvUploading}>
                {cvUploading ? "Uploading CV..." : applying ? "Submitting..." : "Submit Application"}
              </Button>
            </>
          }
        >
          <div className="space-y-6">
            <p className="text-gray-700">
              You are about to apply for: <strong className="text-gray-900">{job?.template?.title}</strong>
            </p>

            {/* CHANGED - CV Upload Section (REC-003) */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-gray-900 mb-3">
                Upload Your CV/Resume <span className="text-gray-500 font-normal">(Optional)</span>
              </h4>
              
              {!cvFile ? (
                <div className="flex flex-col items-center justify-center">
                  <label
                    className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <svg
                        className="w-8 h-8 mb-3 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                        />
                      </svg>
                      <p className="mb-2 text-sm text-gray-500">
                        <span className="font-semibold">Click to upload</span> or drag and drop
                      </p>
                      <p className="text-xs text-gray-500">PDF, DOC, DOCX (MAX. 5MB)</p>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      onChange={handleCvFileChange}
                    />
                  </label>
                </div>
              ) : (
                <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <svg
                      className="w-8 h-8 text-green-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    <div>
                      <p className="text-sm font-medium text-green-800">{cvFile.name}</p>
                      <p className="text-xs text-green-600">
                        {(cvFile.size / 1024 / 1024).toFixed(2)} MB
                        {cvUploaded && " • Ready to submit"}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveCv}
                    className="text-red-600 hover:text-red-800 text-sm font-medium"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>

            {/* Consent Checkbox */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="consent"
                  checked={consentGiven}
                  onChange={(e) => setConsentGiven(e.target.checked)}
                  className="mt-1 rounded border-gray-300"
                />
                <label htmlFor="consent" className="text-sm text-gray-700">
                  I give my consent for personal data processing and background checks as required
                  for this application. I understand that my data will be processed in accordance
                  with privacy laws and regulations.
                </label>
              </div>
            </div>
            {!consentGiven && (
              <p className="text-sm text-red-600">
                You must give consent to proceed with the application.
              </p>
            )}
          </div>
        </Modal>
      </div>
    </ProtectedRoute>
  );
}
