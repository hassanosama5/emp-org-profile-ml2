"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/hooks/use-auth";
import { SystemRole } from "@/types";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { recruitmentApi } from "@/lib/api/recruitment/recruitment";
import { employeeProfileApi } from "@/lib/api/employee-profile/profile";
import {
  Interview,
  ScheduleInterviewDto,
  UpdateInterviewStatusDto,
  SubmitInterviewFeedbackDto,
  ApplicationStage,
  InterviewMethod,
  InterviewStatus,
} from "@/types/recruitment";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/shared/ui/Card";
import { Button } from "@/components/shared/ui/Button";
import { Input } from "@/components/shared/ui/Input";
import { Select } from "@/components/leaves/Select";
import { Textarea } from "@/components/leaves/Textarea";
import { Modal } from "@/components/leaves/Modal";
import { Toast, useToast } from "@/components/leaves/Toast";
import { StatusBadge } from "@/components/recruitment/StatusBadge";

// Helper function to extract job details from application
const getJobDetails = (application: any) => {
  if (!application) {
    return { title: "Unknown Position", department: "Unknown Department", location: "Unknown Location" };
  }
  const app = application as any;
  const title = 
    app.requisitionId?.templateId?.title ||
    app.requisitionId?.template?.title ||
    app.requisition?.templateId?.title ||
    app.requisition?.template?.title ||
    app.requisition?.title ||
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

export default function HRInterviewsPage() {
  const { user } = useAuth();
  const { toast, showToast, hideToast } = useToast();
  const [applications, setApplications] = useState<any[]>([]);
  const [interviews, setInterviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [isPanelViewModalOpen, setIsPanelViewModalOpen] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<any>(null);
  const [selectedInterview, setSelectedInterview] = useState<Interview | null>(null);
  const [selectedInterviewForPanel, setSelectedInterviewForPanel] = useState<any>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [panelFeedback, setPanelFeedback] = useState<any[]>([]);

  // Helper function to check if current user is in the interview panel
  // Users can only submit feedback if they are actually part of the interview panel
  const isUserInPanel = (interview: any): boolean => {
    if (!interview?.panel || !Array.isArray(interview.panel)) {
      return false;
    }
    
    const currentUserId = user?.id || user?.userId || (user as any)?._id;
    if (!currentUserId) {
      return false;
    }
    
    // Check if current user ID matches any panel member ID
    return interview.panel.some((panelId: any) => {
      const panelIdStr = typeof panelId === 'object' ? panelId?.toString() : String(panelId);
      const userIdStr = String(currentUserId);
      return panelIdStr === userIdStr;
    });
  };
  
  // CHANGED: ANY user who is in the panel can submit feedback - no role restriction
  // If you're a panel member, you can submit feedback regardless of your role
  const canUserSubmitFeedback = (interview: any): boolean => {
    // Only check if user is in the panel - no role restriction
    return isUserInPanel(interview);
  };
  const [scheduleForm, setScheduleForm] = useState<ScheduleInterviewDto>({
    applicationId: "",
    stage: ApplicationStage.SCREENING,
    scheduledDate: "",
    method: InterviewMethod.VIDEO,
    panel: [],
    videoLink: "",
  });
  // CHANGED - Separate date and time state for better UX
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [feedbackForm, setFeedbackForm] = useState<SubmitInterviewFeedbackDto>({
    score: 0,
    comments: "",
  });

  // =============================================================
  // STRUCTURED ASSESSMENT STATE
  // =============================================================
  // Assessment criteria are based on JobTemplate.skills for the position
  // Each skill gets scored 0-100, overall score is the average
  // Detailed scores stored as JSON in comments field
  // =============================================================
  const [assessmentCriteria, setAssessmentCriteria] = useState<string[]>([]);
  const [skillScores, setSkillScores] = useState<Record<string, number>>({});
  const [generalComments, setGeneralComments] = useState("");
  const [loadingCriteria, setLoadingCriteria] = useState(false);

  useEffect(() => {
    loadData();
    loadEmployees();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const apps = await recruitmentApi.getApplications();
      const filteredApps = apps.filter((app) => app.status === "in_process" || app.status === "submitted");
      
      // Map applications to have consistent 'requisition' property
      // Backend returns populated 'requisitionId' with 'templateId' inside
      const mappedApps = filteredApps.map((app: any) => ({
        ...app,
        // Create 'requisition' alias from populated 'requisitionId' for easier access
        requisition: typeof app.requisitionId === 'object' && app.requisitionId ? {
          ...app.requisitionId,
          // Map 'templateId' to 'template' for cleaner access
          template: app.requisitionId.templateId || app.requisitionId.template
        } : app.requisition,
        // Also map candidate from candidateId if populated
        candidate: typeof app.candidateId === 'object' && app.candidateId ? app.candidateId : app.candidate,
      }));
      
      // Sort applications: Referrals first, then others (for priority interview scheduling)
      const sortedApps = [...mappedApps].sort((a: any, b: any) => {
        // Referrals should come first (isReferral = true sorts before false)
        if (a.isReferral && !b.isReferral) return -1;
        if (!a.isReferral && b.isReferral) return 1;
        // If both are referrals or both are not, maintain original order
        return 0;
      });
      
      setApplications(sortedApps);
      
      // Extract interviews from applications if they exist
      // Backend now returns interviews attached to applications
      const allInterviews: any[] = [];
      mappedApps.forEach((app: any) => {
        // Handle both array and undefined/null cases
        if (app.interviews && Array.isArray(app.interviews)) {
          app.interviews.forEach((int: any) => {
            // Ensure applicationId is set correctly
            const interviewWithAppId = { 
              ...int, 
              applicationId: app._id || int.applicationId 
            };
            allInterviews.push(interviewWithAppId);
          });
        }
      });
      
      // Always set interviews array (even if empty) to ensure state is updated
      setInterviews(allInterviews);
      
      // Debug log to verify interviews are being loaded
      if (allInterviews.length > 0) {
        console.log('Loaded interviews:', allInterviews.length, allInterviews);
      }
    } catch (error: any) {
      showToast(error.message || "Failed to load applications", "error");
    } finally {
      setLoading(false);
    }
  };

  // =============================================================
  // LOAD HR EMPLOYEES FOR PANEL SELECTION
  // =============================================================
  // Only HR Employees and HR Managers can be assigned as panel members
  // for conducting interviews. This ensures only qualified HR staff
  // participate in the interview process.
  // =============================================================
  const loadEmployees = async () => {
    try {
      setLoadingEmployees(true);
      // Use the HR-specific endpoint that returns only HR Employees/Managers
      const hrEmployees = await recruitmentApi.getHREmployeesForPanel();
      setEmployees(Array.isArray(hrEmployees) ? hrEmployees : []);
    } catch (error: any) {
      console.error("Failed to load HR employees:", error);
      showToast("Failed to load HR employees for panel selection", "error");
    } finally {
      setLoadingEmployees(false);
    }
  };

  // CHANGED - Load eligible panel members based on application and interview stage
  const loadEligiblePanelMembers = async (applicationId: string, stage: string) => {
    try {
      setLoadingEmployees(true);
      const eligibleMembers = await recruitmentApi.getEligiblePanelMembers(applicationId, stage);
      setEmployees(Array.isArray(eligibleMembers) ? eligibleMembers : []);
    } catch (error: any) {
      console.error("Failed to load eligible panel members:", error);
      showToast("Failed to load eligible panel members", "error");
      // Fallback to HR employees only
      await loadEmployees();
    } finally {
      setLoadingEmployees(false);
    }
  };

  const loadPanelFeedback = async (interviewId: string) => {
    try {
      const feedback = await recruitmentApi.getInterviewFeedback(interviewId);
      setPanelFeedback(Array.isArray(feedback) ? feedback : []);
    } catch (error: any) {
      console.error("Failed to load panel feedback:", error);
      setPanelFeedback([]);
    }
  };

  const handleOpenSchedule = async (application: any) => {
    setSelectedApplication(application);
    const defaultStage = ApplicationStage.SCREENING;
    // Don't pre-add current user to panel - they will be added automatically when scheduling
    setScheduleForm({
      applicationId: application._id,
      stage: defaultStage,
      scheduledDate: "",
      method: InterviewMethod.VIDEO,
      panel: [], // Empty - current user added automatically in handleScheduleInterview
      videoLink: "",
    });
    // CHANGED - Reset date and time fields
    setScheduleDate("");
    setScheduleTime("");
    setIsScheduleModalOpen(true);
    // CHANGED - Load eligible panel members based on application and default stage
    await loadEligiblePanelMembers(application._id, defaultStage);
  };

  const handleOpenPanelView = async (application: any, interview: any) => {
    setSelectedApplication(application);
    setSelectedInterviewForPanel(interview);
    if (interview?._id) {
      await loadPanelFeedback(interview._id);
    }
    setIsPanelViewModalOpen(true);
  };

  const handleScheduleInterview = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // CHANGED - Combine date and time into ISO format
      if (!scheduleDate || !scheduleTime) {
        showToast("Please select both date and time", "error");
        return;
      }
      
      // CHANGED - Add seconds to time for proper ISO format
      const timeWithSeconds = scheduleTime.includes(':') && scheduleTime.split(':').length === 2 
        ? `${scheduleTime}:00` 
        : scheduleTime;
      const combinedDateTime = new Date(`${scheduleDate}T${timeWithSeconds}`);
      
      // CHANGED - Validate date is valid
      if (isNaN(combinedDateTime.getTime())) {
        showToast("Invalid date or time format", "error");
        return;
      }
      
      // CHANGED - Validate date is in the future
      if (combinedDateTime <= new Date()) {
        showToast("Interview date and time must be in the future", "error");
        return;
      }
      
      const scheduledDate = combinedDateTime.toISOString();
      
      // CHANGED - Build clean data object
      const interviewData: any = {
        applicationId: scheduleForm.applicationId,
        stage: scheduleForm.stage,
        scheduledDate: scheduledDate,
        method: scheduleForm.method,
      };
      
      // Add current user to panel so they can submit feedback
      // Then add any other selected panel members (avoiding duplicates)
      const currentUserId = user?.id || user?.userId || (user as any)?._id;
      const panelMembers: string[] = [];
      
      // Always add current user first
      if (currentUserId) {
        panelMembers.push(currentUserId);
      }
      
      // Add any additional panel members (excluding current user to avoid duplicates)
      if (scheduleForm.panel && scheduleForm.panel.length > 0) {
        for (const memberId of scheduleForm.panel) {
          if (memberId !== currentUserId && !panelMembers.includes(memberId)) {
            panelMembers.push(memberId);
          }
        }
      }
      
      interviewData.panel = panelMembers;
      if (scheduleForm.videoLink) {
        interviewData.videoLink = scheduleForm.videoLink;
      }
      
      // CHANGED - Log data for debugging
      console.log("Scheduling interview with data:", JSON.stringify(interviewData, null, 2));
      
      const interview = await recruitmentApi.scheduleInterview(interviewData);
      showToast("Interview scheduled successfully", "success");
      setIsScheduleModalOpen(false);
      
      // Ensure the interview has applicationId before adding to state
      if (interview && interview._id) {
        // Ensure applicationId is set correctly (handle both ObjectId and string formats)
        const interviewWithAppId = {
          ...interview,
          applicationId: interview.applicationId || scheduleForm.applicationId,
        };
        setSelectedInterview(interviewWithAppId);
        
        // Add to interviews list optimistically
        setInterviews((prevInterviews) => {
          // Check if interview already exists to avoid duplicates
          const exists = prevInterviews.some((int: any) => 
            int._id === interviewWithAppId._id || 
            (int._id?.toString() === interviewWithAppId._id?.toString())
          );
          if (exists) {
            return prevInterviews;
          }
          return [...prevInterviews, interviewWithAppId];
        });
      }
      
      // Reload data to ensure we have the latest from the backend
      // Use a small delay to ensure database commit is complete
      setTimeout(() => {
        loadData();
      }, 100);
    } catch (error: any) {
      // CHANGED - Better error handling
      const errorMessage = error.response?.data?.message || error.message || "Failed to schedule interview. Check console for details.";
      console.error("Interview scheduling error:", error);
      console.error("Error response:", error.response);
      showToast(errorMessage, "error");
    }
  };

  // =============================================================
  // STRUCTURED ASSESSMENT: Load Criteria from Job Template
  // =============================================================
  // Fetches the skills from the job template associated with the application
  // These skills become the assessment criteria for structured feedback
  // =============================================================
  const loadAssessmentCriteria = async (application: any) => {
    setLoadingCriteria(true);
    try {
      // First try to use already populated requisition data
      const template = application.requisition?.template;
      if (template?.skills && template.skills.length > 0) {
        setAssessmentCriteria(template.skills);
        setLoadingCriteria(false);
        return;
      }
      if (template?.qualifications && template.qualifications.length > 0) {
        setAssessmentCriteria(template.qualifications.slice(0, 5));
        setLoadingCriteria(false);
        return;
      }

      // Fallback: Get job requisition ID from application and fetch
      const requisitionId = typeof application.requisitionId === 'object' 
        ? application.requisitionId?._id 
        : application.requisitionId || application.requisition?._id;
      
      if (!requisitionId) {
        // No requisition, use default criteria
        setAssessmentCriteria(["Technical Skills", "Communication", "Problem Solving", "Cultural Fit"]);
        return;
      }

      // Fetch job requisition to get template
      const jobRequisitions = await recruitmentApi.getJobRequisitions();
      const job = jobRequisitions.find((j: any) => 
        j._id === requisitionId || j._id === String(requisitionId)
      );
      
      if (job?.template?.skills && job.template.skills.length > 0) {
        // Use skills from job template as assessment criteria
        setAssessmentCriteria(job.template.skills);
      } else if (typeof job?.templateId === 'object' && job.templateId?.skills && (job.templateId as any).skills.length > 0) {
        // Backend might return templateId as populated object instead of template
        setAssessmentCriteria((job.templateId as any).skills);
      } else if (job?.template?.qualifications && job.template.qualifications.length > 0) {
        // Fallback to qualifications if no skills defined
        setAssessmentCriteria(job.template.qualifications.slice(0, 5));
      } else {
        // Default criteria if no template skills
        setAssessmentCriteria(["Technical Skills", "Communication", "Problem Solving", "Cultural Fit"]);
      }
    } catch (error) {
      console.error("Failed to load assessment criteria:", error);
      // Use default criteria on error
      setAssessmentCriteria(["Technical Skills", "Communication", "Problem Solving", "Cultural Fit"]);
    } finally {
      setLoadingCriteria(false);
    }
  };

  // State to track if user has existing feedback
  const [existingFeedbackLoaded, setExistingFeedbackLoaded] = useState(false);
  const [isUpdatingFeedback, setIsUpdatingFeedback] = useState(false);

  const handleOpenFeedback = async (application: any, interview?: any) => {
    setSelectedApplication(application);
    setExistingFeedbackLoaded(false);
    setIsUpdatingFeedback(false);
    
    let selectedInt = interview;
    
    // If interview is provided, use it; otherwise try to find an interview for this application
    if (!interview) {
      // Find any interview for this application (scheduled or completed - user may want to add more feedback)
      // Use string comparison to handle ObjectId comparison issues
      const applicationIdStr = String(application._id);
      const appInterviews = interviews.filter((int: any) => {
        const intAppId = typeof int.applicationId === 'object' 
          ? int.applicationId?.toString() 
          : String(int.applicationId);
        // Accept scheduled, completed, or in_progress interviews
        return intAppId === applicationIdStr && 
               ['scheduled', 'completed', 'in_progress'].includes(int.status);
      });
      
      if (appInterviews.length > 0) {
        // Prefer scheduled interviews, then completed
        const scheduledInterview = appInterviews.find((int: any) => int.status === 'scheduled');
        selectedInt = scheduledInterview || appInterviews[0];
      } else {
        selectedInt = null;
      }
    }
    
    setSelectedInterview(selectedInt);
    
    // Reset form state first
    setFeedbackForm({ score: 0, comments: "" });
    setSkillScores({});
    setGeneralComments("");
    
    // Load assessment criteria from job template
    await loadAssessmentCriteria(application);
    
    // Check if user already submitted feedback and pre-fill the form
    if (selectedInt?._id) {
      try {
        const feedback = await recruitmentApi.getInterviewFeedback(selectedInt._id);
        const currentUserId = user?.id || user?.userId || (user as any)?._id;
        
        // Find current user's feedback
        const myFeedback = Array.isArray(feedback) 
          ? feedback.find((fb: any) => {
              const fbInterviewerId = typeof fb.interviewerId === 'object' 
                ? fb.interviewerId?.toString() || fb.interviewerId?._id?.toString()
                : String(fb.interviewerId);
              return fbInterviewerId === String(currentUserId);
            })
          : null;
        
        if (myFeedback) {
          setIsUpdatingFeedback(true);
          
          // Try to parse structured comments
          try {
            if (myFeedback.comments && myFeedback.comments.startsWith('{')) {
              const parsed = JSON.parse(myFeedback.comments);
              if (parsed.skillScores) {
                setSkillScores(parsed.skillScores);
              }
              if (parsed.generalComments) {
                setGeneralComments(parsed.generalComments);
              }
            } else if (myFeedback.comments) {
              setGeneralComments(myFeedback.comments);
            }
          } catch (e) {
            // Not JSON, use as plain comments
            if (myFeedback.comments) {
              setGeneralComments(myFeedback.comments);
            }
          }
          
          setFeedbackForm({ score: myFeedback.score || 0, comments: myFeedback.comments || "" });
        }
        
        setExistingFeedbackLoaded(true);
      } catch (error) {
        console.error("Failed to load existing feedback:", error);
        setExistingFeedbackLoaded(true);
      }
    }
    
    setIsFeedbackModalOpen(true);
  };

  // =============================================================
  // STRUCTURED ASSESSMENT: Calculate & Submit Feedback
  // =============================================================
  // Overall score = average of all skill scores
  // Comments field stores JSON with detailed skill breakdown
  // =============================================================
  const handleSubmitFeedback = async () => {
    if (!selectedApplication || !selectedInterview?._id) {
      showToast("Please schedule an interview first to submit feedback", "error");
      return;
    }
    
    // Validate that all criteria have been scored
    const scoredCriteria = Object.keys(skillScores);
    if (scoredCriteria.length < assessmentCriteria.length) {
      showToast("Please score all assessment criteria", "error");
      return;
    }

    // Validate all scores are between 0-100
    for (const [skill, score] of Object.entries(skillScores)) {
      if (score < 0 || score > 100) {
        showToast(`Score for "${skill}" must be between 0 and 100`, "error");
        return;
      }
    }

    // Calculate overall score as average of all skill scores
    const scores = Object.values(skillScores);
    const overallScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);

    // Format comments as JSON with detailed skill breakdown
    const structuredComments = JSON.stringify({
      skillScores: skillScores,
      generalComments: generalComments,
      assessmentCriteria: assessmentCriteria,
      assessmentDate: new Date().toISOString(),
    });

    try {
      await recruitmentApi.submitInterviewFeedback(selectedInterview._id, {
        score: overallScore,
        comments: structuredComments,
      });
      showToast("Feedback submitted successfully", "success");
      setIsFeedbackModalOpen(false);
      setSelectedInterview(null);
      setSkillScores({});
      setGeneralComments("");
      loadData();
    } catch (error: any) {
      showToast(error.message || "Failed to submit feedback", "error");
    }
  };

  // Helper to update a single skill score
  const updateSkillScore = (skill: string, score: number) => {
    setSkillScores(prev => ({
      ...prev,
      [skill]: Math.min(100, Math.max(0, score))
    }));
  };

  // Calculate current overall score preview
  const calculatePreviewScore = (): number => {
    const scores = Object.values(skillScores);
    if (scores.length === 0) return 0;
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  };

  return (
    <ProtectedRoute
      allowedRoles={[
        SystemRole.HR_EMPLOYEE,
        SystemRole.HR_MANAGER,
        SystemRole.RECRUITER,
        SystemRole.SYSTEM_ADMIN,
      ]}
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
          <h1 className="text-3xl font-bold text-gray-900">Interview Management</h1>
          <p className="text-gray-600 mt-1">Schedule and manage candidate interviews</p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading applications...</p>
          </div>
        ) : applications.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-500">No applications available for interviews.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {applications.map((application) => (
              <Card key={application._id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {/* CHANGED - Added text-gray-900 for visibility */}
                      <h3 className="text-lg font-semibold mb-2 text-gray-900">
                        {getJobDetails(application).title}
                      </h3>
                      {/* CHANGED - Handle candidateId as populated object or string */}
                      <p className="text-sm text-gray-600 mb-2">
                        Candidate: {
                          application.candidate?.fullName || 
                          (typeof application.candidateId === 'object' 
                            ? (application.candidateId as any)?.fullName || (application.candidateId as any)?.firstName || 'Unknown'
                            : application.candidateId || 'Unknown')
                        }
                        {/* Show star indicator for referred candidates - priority for earlier interview */}
                        {application.isReferral && (
                          <span 
                            className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800" 
                            title="Referred Candidate - Priority for Earlier Interview"
                          >
                            ⭐ Referral
                          </span>
                        )}
                      </p>
                      <p className="text-sm text-gray-600 mb-2">
                        Status: <StatusBadge status={application.status} type="application" />
                      </p>
                      {application.stage && (
                        <p className="text-sm text-gray-600">
                          Current Stage: {application.stage.replace("_", " ").toUpperCase()}
                        </p>
                      )}
                      {/* Show scheduled interviews if any */}
                      {(interviews.filter((int) => int.applicationId === application._id).length > 0) && (
                        <div className="mt-3 space-y-2">
                          {interviews
                            .filter((int) => int.applicationId === application._id)
                            .map((interview) => (
                          <div key={interview._id} className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900">
                                  {interview.stage?.replace("_", " ").toUpperCase()} Interview
                                </p>
                                <p className="text-xs text-gray-600 mt-1">
                                  Scheduled: {new Date(interview.scheduledDate).toLocaleString()}
                                </p>
                                <p className="text-xs text-gray-600">
                                  Method: {interview.method?.toUpperCase() || "N/A"}
                                </p>
                                {interview.panel && interview.panel.length > 0 && (
                                  <div className="mt-2">
                                    <p className="text-xs font-medium text-gray-700">
                                      Panel Members ({interview.panel.length}):
                                    </p>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {interview.panel.slice(0, 3).map((panelId: string, idx: number) => {
                                        const panelMember = employees.find(
                                          (emp) => (emp._id || emp.id || emp.userId) === panelId
                                        );
                                        const name = panelMember
                                          ? panelMember.fullName || 
                                            `${panelMember.firstName || ''} ${panelMember.lastName || ''}`.trim() || 
                                            panelMember.email || 
                                            'Unknown'
                                          : 'Loading...';
                                        return (
                                          <span 
                                            key={idx}
                                            className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                                          >
                                            {name}
                                          </span>
                                        );
                                      })}
                                      {interview.panel.length > 3 && (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                          +{interview.panel.length - 3} more
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                              <div className="flex gap-2 ml-4">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleOpenPanelView(application, interview)}
                                >
                                  View Panel
                                </Button>
                                {canUserSubmitFeedback(interview) && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedInterview(interview);
                                      handleOpenFeedback(application);
                                    }}
                                  >
                                    Submit Feedback
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                            ))}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 ml-4">
                      {/* Only show Schedule Interview button if no active interview exists for this application */}
                      {interviews.filter((int: any) => 
                        int.applicationId === application._id && 
                        int.status !== 'cancelled'
                      ).length === 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenSchedule(application)}
                        >
                          Schedule Interview
                        </Button>
                      )}
                      {/* CHANGED - Users can only submit feedback if they are in the interview panel */}
                      {/* When a recruiter schedules an interview, they are automatically added to the panel */}
                      {/* Other users (HR employees, recruiters, etc.) can only submit if they were selected as panel members */}
                      {(() => {
                        const appInterviews = interviews.filter(
                          (int: any) => int.applicationId === application._id && int.status === 'scheduled'
                        );
                        const interviewInPanel = appInterviews.find((int: any) => canUserSubmitFeedback(int));
                        return interviewInPanel ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              handleOpenFeedback(application, interviewInPanel);
                            }}
                          >
                            Submit Feedback
                          </Button>
                        ) : null;
                      })()}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Schedule Interview Modal */}
        <Modal
          isOpen={isScheduleModalOpen}
          onClose={() => setIsScheduleModalOpen(false)}
          title="Schedule Interview"
        >
          <form onSubmit={handleScheduleInterview}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Interview Stage *
                </label>
                <Select
                  value={scheduleForm.stage}
                  onChange={(e) => {
                    const newStage = e.target.value as ApplicationStage;
                    setScheduleForm({ ...scheduleForm, stage: newStage, panel: [] }); // Reset panel when stage changes
                    // CHANGED - Reload eligible panel members when stage changes
                    if (selectedApplication?._id) {
                      loadEligiblePanelMembers(selectedApplication._id, newStage);
                    }
                  }}
                  options={[
                    { value: ApplicationStage.SCREENING, label: "Screening" },
                    { value: ApplicationStage.DEPARTMENT_INTERVIEW, label: "Department Interview" },
                    { value: ApplicationStage.HR_INTERVIEW, label: "HR Interview" },
                  ]}
                />
              </div>

              {/* CHANGED - Separate date and time inputs for better UX */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Interview Date *
                </label>
                <Input
                  type="date"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Interview Time *
                </label>
                <Input
                  type="time"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Interview Method *
                </label>
                <Select
                  value={scheduleForm.method}
                  onChange={(e) =>
                    setScheduleForm({ ...scheduleForm, method: e.target.value as InterviewMethod })
                  }
                  options={[
                    { value: InterviewMethod.ONSITE, label: "Onsite" },
                    { value: InterviewMethod.VIDEO, label: "Video" },
                    { value: InterviewMethod.PHONE, label: "Phone" },
                  ]}
                />
              </div>

              {scheduleForm.method === InterviewMethod.VIDEO && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Video Link
                  </label>
                  <Input
                    value={scheduleForm.videoLink || ""}
                    onChange={(e) =>
                      setScheduleForm({ ...scheduleForm, videoLink: e.target.value })
                    }
                    placeholder="https://meet.google.com/..."
                  />
                </div>
              )}

              {/* CHANGED - Panel Members Selection - Based on Interview Stage */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Panel Members *
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  {scheduleForm.stage === ApplicationStage.DEPARTMENT_INTERVIEW
                    ? "Select from HR Employees and employees from the job's department. You are automatically included."
                    : "Select HR Employees to conduct the interview. You are automatically included."}
                </p>
                {scheduleForm.stage === ApplicationStage.DEPARTMENT_INTERVIEW && (
                  <p className="text-xs text-blue-600 mb-2">
                    💡 Department Interview: Showing HR employees + department employees
                  </p>
                )}
                {loadingEmployees ? (
                  <p className="text-sm text-gray-500">Loading employees...</p>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto border border-gray-200 rounded-lg p-3">
                    {/* Show current user as already selected (not clickable) */}
                    <div className="flex items-center space-x-2 p-2 bg-blue-50 rounded border border-blue-200">
                      <input
                        type="checkbox"
                        checked={true}
                        disabled={true}
                        className="rounded border-gray-300 text-blue-600"
                      />
                      <span className="text-sm text-blue-700 flex-1 font-medium">
                        {user?.fullName || 'You'} 
                        <span className="ml-2 text-xs text-blue-600">(You - Auto-included)</span>
                      </span>
                    </div>
                    
                    {/* Filter out current user from the selectable list */}
                    {employees
                      .filter((employee) => {
                        const employeeId = employee._id || employee.id || employee.userId;
                        const currentUserId = user?.id || user?.userId || (user as any)?._id;
                        return employeeId !== currentUserId; // Exclude current user
                      })
                      .length === 0 ? (
                      <p className="text-sm text-gray-500 mt-2">No other HR employees available</p>
                    ) : (
                      employees
                        .filter((employee) => {
                          const employeeId = employee._id || employee.id || employee.userId;
                          const currentUserId = user?.id || user?.userId || (user as any)?._id;
                          return employeeId !== currentUserId; // Exclude current user
                        })
                        .map((employee) => {
                          const employeeId = employee._id || employee.id || employee.userId;
                          const employeeName = employee.fullName || 
                            `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || 
                            employee.email || 
                            'Unknown';
                          const isSelected = scheduleForm.panel?.includes(employeeId);
                          
                          return (
                            <label
                              key={employeeId}
                              className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  const currentPanel = scheduleForm.panel || [];
                                  if (e.target.checked) {
                                    if (!currentPanel.includes(employeeId)) {
                                      setScheduleForm({
                                        ...scheduleForm,
                                        panel: [...currentPanel, employeeId],
                                      });
                                    }
                                  } else {
                                    setScheduleForm({
                                      ...scheduleForm,
                                      panel: currentPanel.filter((id) => id !== employeeId),
                                    });
                                  }
                                }}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              <span className="text-sm text-gray-700 flex-1">
                                {employeeName}
                              </span>
                              {/* CHANGED - Show badge for HR vs Department employee */}
                              {employee.isHR ? (
                                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                                  HR
                                </span>
                              ) : employee.department && (
                                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                                  {typeof employee.department === 'object' 
                                    ? employee.department.name 
                                    : employee.department}
                                </span>
                              )}
                            </label>
                          );
                        })
                    )}
                  </div>
                )}
                {/* Show total panel count: current user (1) + selected others */}
                <p className="text-xs text-gray-500 mt-2">
                  {1 + (scheduleForm.panel?.length || 0)} panel member(s) total (including you)
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsScheduleModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Schedule</Button>
            </div>
          </form>
        </Modal>

        {/* =============================================================
           STRUCTURED ASSESSMENT FEEDBACK MODAL
           =============================================================
           Assessment criteria are loaded from JobTemplate.skills
           Each skill is scored 0-100, overall score is the average
           ============================================================= */}
        <Modal
          isOpen={isFeedbackModalOpen}
          onClose={() => setIsFeedbackModalOpen(false)}
          title="Submit Interview Feedback"
          size="lg"
        >
          <div className="space-y-5">
            {/* Interview Info Header */}
            {selectedApplication && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  <strong>Candidate:</strong>{" "}
                  {selectedApplication.candidate?.fullName || 
                   selectedApplication.candidateId?.fullName ||
                   `${selectedApplication.candidateId?.firstName || ''} ${selectedApplication.candidateId?.lastName || ''}`.trim() ||
                   "Unknown"}
                </p>
                <p className="text-sm text-blue-700">
                  <strong>Position:</strong>{" "}
                  {getJobDetails(selectedApplication).title}
                </p>
                {/* Show interview stage if available */}
                {selectedInterview?.stage && (
                  <p className="text-sm text-blue-600 mt-1">
                    <strong>Interview Stage:</strong>{" "}
                    {selectedInterview.stage.replace("_", " ").toUpperCase()}
                  </p>
                )}
              </div>
            )}

            {!selectedInterview && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm text-yellow-800">
                  <strong>Note:</strong> You need to schedule an interview first before submitting feedback. 
                  The interview ID is required to submit feedback.
                </p>
              </div>
            )}

            {/* Show notice if updating existing feedback */}
            {selectedInterview && isUpdatingFeedback && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  <strong>📝 Updating Previous Feedback:</strong> You have already submitted feedback for this interview. 
                  Your previous scores are pre-filled below. Any changes will update your existing feedback.
                </p>
              </div>
            )}

            {/* Structured Assessment Criteria */}
            {selectedInterview && (
              <>
                <div className="border-b pb-4">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    📊 Assessment Criteria
                    <span className="text-xs font-normal text-gray-500">
                      (Score each criterion 0-100)
                    </span>
                  </h3>
                  
                  {loadingCriteria ? (
                    <p className="text-sm text-gray-500">Loading assessment criteria...</p>
                  ) : (
                    <div className="space-y-4">
                      {assessmentCriteria.map((criterion, index) => (
                        <div key={index} className="bg-gray-50 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <label className="text-sm font-medium text-gray-700">
                              {criterion}
                            </label>
                            <span className={`text-sm font-bold ${
                              (skillScores[criterion] || 0) >= 70 ? 'text-green-600' :
                              (skillScores[criterion] || 0) >= 50 ? 'text-yellow-600' :
                              (skillScores[criterion] || 0) > 0 ? 'text-red-600' :
                              'text-gray-400'
                            }`}>
                              {skillScores[criterion] || 0}/100
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={skillScores[criterion] || 0}
                              onChange={(e) => updateSkillScore(criterion, parseInt(e.target.value))}
                              className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                            />
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              value={skillScores[criterion] || 0}
                              onChange={(e) => updateSkillScore(criterion, parseInt(e.target.value) || 0)}
                              className="w-20 text-center"
                            />
                          </div>
                          {/* Score indicator bar */}
                          <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all duration-300 ${
                                (skillScores[criterion] || 0) >= 70 ? 'bg-green-500' :
                                (skillScores[criterion] || 0) >= 50 ? 'bg-yellow-500' :
                                'bg-red-500'
                              }`}
                              style={{ width: `${skillScores[criterion] || 0}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Overall Score Preview */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-gray-900">Overall Score</h4>
                      <p className="text-xs text-gray-500">Average of all criteria scores</p>
                    </div>
                    <div className="text-right">
                      <span className={`text-3xl font-bold ${
                        calculatePreviewScore() >= 70 ? 'text-green-600' :
                        calculatePreviewScore() >= 50 ? 'text-yellow-600' :
                        calculatePreviewScore() > 0 ? 'text-red-600' :
                        'text-gray-400'
                      }`}>
                        {calculatePreviewScore()}
                      </span>
                      <span className="text-lg text-gray-500">/100</span>
                    </div>
                  </div>
                  <div className="mt-2 h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        calculatePreviewScore() >= 70 ? 'bg-green-500' :
                        calculatePreviewScore() >= 50 ? 'bg-yellow-500' :
                        'bg-red-500'
                      }`}
                      style={{ width: `${calculatePreviewScore()}%` }}
                    />
                  </div>
                </div>

                {/* General Comments */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    💬 General Comments & Observations
                  </label>
                  <Textarea
                    value={generalComments}
                    onChange={(e) => setGeneralComments(e.target.value)}
                    rows={4}
                    placeholder="Enter overall observations, strengths, areas for improvement, hiring recommendation..."
                  />
                </div>

                {/* Scoring Guide */}
                <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600">
                  <p className="font-semibold mb-1">Scoring Guide:</p>
                  <div className="flex flex-wrap gap-4">
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                      70-100: Excellent
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-3 bg-yellow-500 rounded-full"></span>
                      50-69: Satisfactory
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-3 bg-red-500 rounded-full"></span>
                      0-49: Needs Improvement
                    </span>
                  </div>
                </div>
              </>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsFeedbackModalOpen(false);
                  setSkillScores({});
                  setGeneralComments("");
                }}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSubmitFeedback}
                disabled={!selectedInterview || Object.keys(skillScores).length < assessmentCriteria.length}
              >
                {isUpdatingFeedback ? "Update Assessment" : "Submit Assessment"}
              </Button>
            </div>
          </div>
        </Modal>

        {/* Panel Coordination View Modal */}
        <Modal
          isOpen={isPanelViewModalOpen}
          onClose={() => setIsPanelViewModalOpen(false)}
          title="Interview Panel Coordination"
        >
          <div className="space-y-4">
            {selectedInterviewForPanel && (
              <>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-2">Interview Details</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-600">Stage:</span>
                      <span className="ml-2 font-medium">
                        {selectedInterviewForPanel.stage?.replace("_", " ").toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Status:</span>
                      <span className="ml-2">
                        <StatusBadge 
                          status={selectedInterviewForPanel.status} 
                          type="interview"
                        />
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Date:</span>
                      <span className="ml-2 font-medium">
                        {new Date(selectedInterviewForPanel.scheduledDate).toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Method:</span>
                      <span className="ml-2 font-medium">
                        {selectedInterviewForPanel.method?.toUpperCase() || "N/A"}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Panel Members</h3>
                  {selectedInterviewForPanel.panel && selectedInterviewForPanel.panel.length > 0 ? (
                    <div className="space-y-3">
                      {selectedInterviewForPanel.panel
                        .filter((panelId: string, index: number, self: string[]) => 
                          // Remove duplicates by keeping only first occurrence
                          self.indexOf(panelId) === index
                        )
                        .map((panelId: string, index: number) => {
                        const panelMember = employees.find(
                          (emp) => (emp._id || emp.id || emp.userId) === panelId
                        );
                        const memberFeedback = panelFeedback.find(
                          (fb) => fb.interviewerId === panelId || 
                                  (fb.interviewerId && typeof fb.interviewerId === 'object' && fb.interviewerId.toString() === panelId)
                        );
                        const memberName = panelMember
                          ? panelMember.fullName || 
                            `${panelMember.firstName || ''} ${panelMember.lastName || ''}`.trim() || 
                            panelMember.email || 
                            'Unknown'
                          : 'Loading...';
                        const isCurrentUser = panelId === (user?.id || user?.userId || (user as any)?._id);

                        return (
                          <div
                            key={`${panelId}-${index}`}
                            className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-medium text-gray-900">{memberName}</h4>
                                  {isCurrentUser && (
                                    <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-800 rounded">
                                      You
                                    </span>
                                  )}
                                  {memberFeedback ? (
                                    <span className="text-xs px-2 py-0.5 bg-green-100 text-green-800 rounded">
                                      Feedback Submitted
                                    </span>
                                  ) : (
                                    <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded">
                                      Pending
                                    </span>
                                  )}
                                </div>
                                {panelMember?.department && (
                                  <p className="text-xs text-gray-500 mt-1">
                                    {typeof panelMember.department === 'object' 
                                      ? panelMember.department.name 
                                      : panelMember.department}
                                  </p>
                                )}
                                {memberFeedback && (() => {
                                  // =============================================================
                                  // PARSE STRUCTURED ASSESSMENT FROM COMMENTS
                                  // =============================================================
                                  // Comments may contain JSON with detailed skill scores
                                  // =============================================================
                                  let parsedAssessment: any = null;
                                  try {
                                    if (memberFeedback.comments && memberFeedback.comments.startsWith('{')) {
                                      parsedAssessment = JSON.parse(memberFeedback.comments);
                                    }
                                  } catch (e) {
                                    // Not JSON, display as plain text
                                  }

                                  return (
                                    <div className="mt-2 pt-2 border-t border-gray-200">
                                      <div className="flex items-center gap-4 text-sm mb-2">
                                        <div>
                                          <span className="text-gray-600">Overall Score:</span>
                                          <span className={`ml-2 font-bold ${
                                            memberFeedback.score >= 70 ? 'text-green-600' :
                                            memberFeedback.score >= 50 ? 'text-yellow-600' :
                                            'text-red-600'
                                          }`}>
                                            {memberFeedback.score}/100
                                          </span>
                                        </div>
                                        <div>
                                          <span className="text-gray-600">Submitted:</span>
                                          <span className="ml-2 text-gray-700">
                                            {new Date(memberFeedback.createdAt || memberFeedback.submittedAt).toLocaleDateString()}
                                          </span>
                                        </div>
                                      </div>
                                      
                                      {/* Display structured skill breakdown if available */}
                                      {parsedAssessment?.skillScores && (
                                        <div className="bg-gray-50 rounded p-2 mb-2">
                                          <p className="text-xs font-medium text-gray-600 mb-1">Skill Breakdown:</p>
                                          <div className="flex flex-wrap gap-2">
                                            {Object.entries(parsedAssessment.skillScores).map(([skill, score]: [string, any]) => (
                                              <span 
                                                key={skill}
                                                className={`text-xs px-2 py-1 rounded-full ${
                                                  score >= 70 ? 'bg-green-100 text-green-700' :
                                                  score >= 50 ? 'bg-yellow-100 text-yellow-700' :
                                                  'bg-red-100 text-red-700'
                                                }`}
                                              >
                                                {skill}: {score}
                                              </span>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                      
                                      {/* Display general comments */}
                                      {parsedAssessment?.generalComments && (
                                        <p className="text-sm text-gray-700">
                                          <span className="font-medium">Comments:</span> {parsedAssessment.generalComments}
                                        </p>
                                      )}
                                      
                                      {/* Fallback: display plain text comments */}
                                      {!parsedAssessment && memberFeedback.comments && (
                                        <p className="text-sm text-gray-700">
                                          <span className="font-medium">Comments:</span> {memberFeedback.comments}
                                        </p>
                                      )}
                                    </div>
                                  );
                                })()}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No panel members assigned</p>
                  )}
                </div>

                {/* Average Score */}
                {panelFeedback.length > 0 && (
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-900">Average Score:</span>
                      <span className="text-2xl font-bold text-blue-600">
                        {(
                          panelFeedback.reduce((sum, fb) => sum + (fb.score || 0), 0) /
                          panelFeedback.length
                        ).toFixed(1)}
                        /100
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">
                      Based on {panelFeedback.length} of {selectedInterviewForPanel.panel?.length || 0} panel members
                    </p>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsPanelViewModalOpen(false)}
            >
              Close
            </Button>
          </div>
        </Modal>
      </div>
    </ProtectedRoute>
  );
}

