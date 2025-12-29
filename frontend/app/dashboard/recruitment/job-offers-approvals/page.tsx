"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/hooks/use-auth";
import { SystemRole } from "@/types";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { recruitmentApi } from "@/lib/api/recruitment/recruitment";
import { departmentsApi } from "@/lib/api/organization-structure/departments.api";
import { positionsApi } from "@/lib/api/organization-structure/positions.api";
import { DepartmentResponseDto, PositionResponseDto } from "@/types/organization-structure";
import {
  Application,
  ApplicationStatus,
  UpdateApplicationStatusDto,
  Offer,
  OfferFinalStatus,
  OfferResponseStatus,
  FinalizeOfferDto,
  CreateOfferDto,
  CreateEmployeeFromContractDto,
} from "@/types/recruitment";
import { Textarea } from "@/components/leaves/Textarea";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/shared/ui/Card";
import { Button } from "@/components/shared/ui/Button";
import { Input } from "@/components/shared/ui/Input";
import { Select } from "@/components/leaves/Select";
import { Modal } from "@/components/leaves/Modal";
import { Toast, useToast } from "@/components/leaves/Toast";
import { StatusBadge } from "@/components/recruitment/StatusBadge";

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

export default function JobOffersApprovalsPage() {
  const { user } = useAuth();
  const { toast, showToast, hideToast } = useToast();
  const [applications, setApplications] = useState<Application[]>([]);
  const [offers, setOffers] = useState<Record<string, Offer>>({});
  const [loading, setLoading] = useState(true);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [candidateAssessments, setCandidateAssessments] = useState<{
    interviewScores: Record<string, number>;
    interviewFeedback: Record<string, any[]>;
    rankedData?: any;
  }>({
    interviewScores: {},
    interviewFeedback: {},
  });
  const [loadingAssessments, setLoadingAssessments] = useState(false);
  const [isAcceptModalOpen, setIsAcceptModalOpen] = useState(false);
  const [isRejectApplicationModalOpen, setIsRejectApplicationModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [creatingOffer, setCreatingOffer] = useState(false);
  
  // Create Employee state
  const [isCreateEmployeeModalOpen, setIsCreateEmployeeModalOpen] = useState(false);
  const [creatingEmployee, setCreatingEmployee] = useState(false);
  const [employeeForm, setEmployeeForm] = useState<CreateEmployeeFromContractDto>({
    startDate: "",
    workEmail: "",
    employeeNumber: "",
    // CHANGED - Added fields to integrate with employee-profile subsystem
    contractType: undefined,
    workType: undefined,
    primaryDepartmentId: undefined,
    supervisorPositionId: undefined,
  });
  
  // CHANGED - State for organization structure data (departments & positions)
  const [departments, setDepartments] = useState<DepartmentResponseDto[]>([]);
  const [positions, setPositions] = useState<PositionResponseDto[]>([]);
  const [loadingOrgData, setLoadingOrgData] = useState(false);
  
  // CHANGED - State for CV viewing
  const [viewingResume, setViewingResume] = useState<string | null>(null);
  
  // ONB-002: Contract status tracking - HR needs to see if candidate uploaded contract
  const [contractStatuses, setContractStatuses] = useState<Record<string, {
    hasContract: boolean;
    hasSignedDocument: boolean;
    message: string;
  }>>({});
  
  // CHANGED - Track which applications already have employees created (prevent duplicates)
  const [employeeExistsMap, setEmployeeExistsMap] = useState<Record<string, boolean>>({});

  // =============================================================
  // SORTING AND FILTERING STATE
  // =============================================================
  // HR Manager can sort/filter applications by:
  // - Score (interview feedback score - higher first)
  // - Referral status (referrals get priority - appear first)
  // - Job/Position (filter by specific job requisition)
  // =============================================================
  const [sortBy, setSortBy] = useState<"score" | "referral" | "date">("referral");
  const [filterByJob, setFilterByJob] = useState<string>("all");
  const [availableJobs, setAvailableJobs] = useState<{ id: string; title: string }[]>([]);
  const [applicationScores, setApplicationScores] = useState<Record<string, number>>({});
  const [applicationReferrals, setApplicationReferrals] = useState<Record<string, boolean>>({});

  // =============================================================
  // OFFER CREATION FORM STATE
  // =============================================================
  // When HR Manager approves an application, they must fill in offer details.
  // This form collects all the data needed for the Offer schema.
  // =============================================================
  const [offerForm, setOfferForm] = useState({
    grossSalary: "",
    signingBonus: "",
    benefits: "",  // Comma-separated string, will be converted to array
    conditions: "",
    insurances: "",
    content: "",
    role: "",
    deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days from now
  });

  const resetOfferForm = () => {
    setOfferForm({
      grossSalary: "",
      signingBonus: "",
      benefits: "",
      conditions: "",
      insurances: "",
      content: "",
      role: "",
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    });
  };

  useEffect(() => {
    loadData();
  }, []);

  // CHANGED - Load organization structure data (departments & positions)
  useEffect(() => {
    const loadOrgData = async () => {
      try {
        setLoadingOrgData(true);
        const [depts, pos] = await Promise.all([
          departmentsApi.getAllDepartments(),
          positionsApi.getAllPositions(),
        ]);
        setDepartments(depts);
        setPositions(pos);
      } catch (error) {
        console.error("Failed to load organization data:", error);
      } finally {
        setLoadingOrgData(false);
      }
    };
    loadOrgData();
  }, []);

  // =============================================================
  // CHECK IF APPLICATION HAS COMPLETED INTERVIEW
  // =============================================================
  // An application is ready for HR Manager review when:
  // - At least one interview has status 'completed'
  // - Interview becomes 'completed' when ALL panel members submit feedback
  // =============================================================
  const hasInterviewFeedback = (application: Application): boolean => {
    const interviews = (application as any).interviews || [];
    // Check if at least one interview is completed (all panel members submitted feedback)
    return interviews.some((int: any) => {
      return int.status === 'completed';
    });
  };

  const loadData = async () => {
    try {
      setLoading(true);
      // Get all applications
      const allApps = await recruitmentApi.getApplications();
      
      // =============================================================
      // FILTER APPLICATIONS FOR HR MANAGER REVIEW
      // =============================================================
      // Show applications that need HR Manager action:
      // 1. Status "offer" - already have offers, need approval/finalization
      // 2. Status "in_process" with completed interviews - need offer creation
      // 3. Status "hired" - need to create employee profile
      //
      // Interview becomes 'completed' when ALL panel members submit feedback
      // =============================================================
      const offerApps = allApps.filter((app) => {
        // Applications with offers need approval
        if (app.status === "offer") return true;
        
        // Applications in process with completed interviews need offer creation
        if (app.status === ApplicationStatus.IN_PROCESS && hasInterviewFeedback(app)) return true;
        
        // Hired applications need employee creation
        if (app.status === "hired") return true;
        
        return false;
      });

      // =============================================================
      // EXTRACT JOB TITLES FOR FILTERING
      // =============================================================
      const jobsMap = new Map<string, string>();
      offerApps.forEach((app) => {
        const appAny = app as any;
        const reqId = appAny.requisitionId?._id || app.requisitionId || (app.requisition as any)?._id;
        const jobTitle = getJobDetails(app).title;
        if (reqId) {
          jobsMap.set(reqId, jobTitle);
        }
      });
      setAvailableJobs(Array.from(jobsMap.entries()).map(([id, title]) => ({ id, title })));

      // =============================================================
      // LOAD SCORES AND REFERRAL STATUS FOR SORTING
      // =============================================================
      const scores: Record<string, number> = {};
      const referrals: Record<string, boolean> = {};
      
      for (const app of offerApps) {
        // Check if candidate is a referral
        const candidateId = typeof app.candidateId === 'object' 
          ? (app.candidateId as any)?._id 
          : app.candidateId;
        referrals[app._id] = (app as any).isReferral || 
                            (app.candidate as any)?.isReferral || 
                            false;
        
        // Calculate average interview score
        const interviews = (app as any).interviews || [];
        let totalScore = 0;
        let scoreCount = 0;
        
        for (const interview of interviews) {
          if (interview.status === 'completed' && interview._id) {
            try {
              const avgScore = await recruitmentApi.getInterviewAverageScore(interview._id);
              if (avgScore > 0) {
                totalScore += avgScore;
                scoreCount++;
              }
            } catch (e) {
              // Skip if can't get score
            }
          }
        }
        
        scores[app._id] = scoreCount > 0 ? totalScore / scoreCount : 0;
      }
      
      setApplicationScores(scores);
      setApplicationReferrals(referrals);
      setApplications(offerApps);

      // Load offers for these applications
      const offerMap: Record<string, Offer> = {};
      const contractStatusMap: Record<string, { hasContract: boolean; hasSignedDocument: boolean; message: string }> = {};
      
      for (const app of offerApps) {
        // Only try to load offer if application has status "offer" or "hired"
        // Applications in "in_process" won't have offers yet
        if (app.status === "offer" || app.status === "hired") {
          try {
            const offer = await recruitmentApi.getOfferByApplicationId(app._id);
            if (offer && offer._id) {
              offerMap[app._id] = offer;
              
              // ONB-002: Load contract status for accepted offers
              // HR Manager needs to see if candidate has uploaded signed contract
              if (offer.applicantResponse === OfferResponseStatus.ACCEPTED) {
                try {
                  const contractStatus = await recruitmentApi.getContractStatus(offer._id);
                  contractStatusMap[offer._id] = {
                    hasContract: contractStatus.hasContract,
                    hasSignedDocument: contractStatus.hasSignedDocument,
                    message: contractStatus.message,
                  };
                } catch (e) {
                  // If contract status fails, assume no contract
                  contractStatusMap[offer._id] = {
                    hasContract: false,
                    hasSignedDocument: false,
                    message: 'Unable to check contract status',
                  };
                }
              }
            }
          } catch (error: any) {
            // 404 "Offer not found" is expected if offer doesn't exist yet - silently skip
            // This can happen for applications with status "offer" that haven't had offers created yet
            const status = error?.response?.status;
            const errorMessage = error?.message || '';
            if (status !== 404 && !errorMessage.toLowerCase().includes('not found')) {
              console.error(`Error loading offer for application ${app._id}:`, error);
            }
          }
        }
      }
      setOffers(offerMap);
      setContractStatuses(contractStatusMap);
      
      // CHANGED - Check which applications already have employees created
      const employeeStatusMap: Record<string, boolean> = {};
      for (const app of offerApps) {
        if (app.status === "hired" || offers[app._id]) {
          try {
            const employeeStatus = await recruitmentApi.checkEmployeeExistsForApplication(app._id);
            employeeStatusMap[app._id] = employeeStatus.employeeExists;
          } catch (e) {
            // If check fails, assume no employee exists yet
            employeeStatusMap[app._id] = false;
          }
        }
      }
      setEmployeeExistsMap(employeeStatusMap);
    } catch (error: any) {
      showToast(error.message || "Failed to load data", "error");
    } finally {
      setLoading(false);
    }
  };

  // =============================================================
  // GET SORTED AND FILTERED APPLICATIONS
  // =============================================================
  // Sorting priority:
  // 1. Referrals first (when sortBy = "referral")
  // 2. Higher scores first (when sortBy = "score")
  // 3. Most recent first (when sortBy = "date")
  // 
  // Tie-breaking: Referrals always get preference when scores are equal
  // =============================================================
  const getSortedFilteredApplications = () => {
    let filtered = [...applications];
    
    // Filter by job if selected
    if (filterByJob !== "all") {
      filtered = filtered.filter((app) => {
        const reqId = app.requisitionId || (app.requisition as any)?._id;
        return reqId === filterByJob;
      });
    }
    
    // Sort applications
    filtered.sort((a, b) => {
      const aScore = applicationScores[a._id] || 0;
      const bScore = applicationScores[b._id] || 0;
      const aIsReferral = applicationReferrals[a._id] || false;
      const bIsReferral = applicationReferrals[b._id] || false;
      
      if (sortBy === "referral") {
        // Referrals first, then by score
        if (aIsReferral && !bIsReferral) return -1;
        if (!aIsReferral && bIsReferral) return 1;
        // If both are referrals or both are not, sort by score
        return bScore - aScore;
      } else if (sortBy === "score") {
        // Higher scores first
        // Tie-breaker: referrals get preference
        if (bScore !== aScore) return bScore - aScore;
        if (aIsReferral && !bIsReferral) return -1;
        if (!aIsReferral && bIsReferral) return 1;
        return 0;
      } else {
        // Sort by date (most recent first)
        const aDate = new Date((a as any).createdAt || 0).getTime();
        const bDate = new Date((b as any).createdAt || 0).getTime();
        return bDate - aDate;
      }
    });
    
    return filtered;
  };

  const loadCandidateAssessments = async (application: Application) => {
    try {
      setLoadingAssessments(true);
      
      // Get ranked applications for this requisition
      let rankedData = null;
      if (application.requisitionId) {
        try {
          const ranked = await recruitmentApi.getRankedApplications(application.requisitionId);
          rankedData = ranked.find((app: any) => app._id === application._id);
        } catch (error) {
          console.log("Could not load ranked applications:", error);
        }
      }
      
      // Get interviews for this application
      const interviews = (application as any).interviews || [];
      const scores: Record<string, number> = {};
      const feedback: Record<string, any[]> = {};
      
      for (const interview of interviews) {
        const interviewId = interview._id;
        try {
          const avgScore = await recruitmentApi.getInterviewAverageScore(interviewId);
          scores[interviewId] = avgScore;
          
          const interviewFeedback = await recruitmentApi.getInterviewFeedback(interviewId);
          feedback[interviewId] = Array.isArray(interviewFeedback) ? interviewFeedback : [];
        } catch (error) {
          console.log(`Could not load data for interview ${interviewId}:`, error);
        }
      }
      
      setCandidateAssessments({
        interviewScores: scores,
        interviewFeedback: feedback,
        rankedData,
      });
    } catch (error) {
      console.error("Error loading candidate assessments:", error);
    } finally {
      setLoadingAssessments(false);
    }
  };

  const handleViewOffer = async (application: Application) => {
    setSelectedApplication(application);
    const offer = offers[application._id];
    setSelectedOffer(offer || null);
    await loadCandidateAssessments(application);
    setIsViewModalOpen(true);
  };

  const handleApprove = (application: Application) => {
    const offer = offers[application._id];
    if (!offer) {
      showToast("Offer not found for this application", "error");
      return;
    }
    
    // Check if candidate has responded
    if (offer.applicantResponse === OfferResponseStatus.PENDING) {
      showToast("Cannot approve: Candidate has not responded to the offer yet", "error");
      return;
    }
    
    setSelectedApplication(application);
    setSelectedOffer(offer);
    setIsApproveModalOpen(true);
  };

  const handleReject = (application: Application) => {
    const offer = offers[application._id];
    if (offer) {
      // Reject existing offer
      setSelectedApplication(application);
      setSelectedOffer(offer);
      setIsRejectModalOpen(true);
    } else {
      // Reject application directly (before offer creation)
      setSelectedApplication(application);
      setRejectionReason("");
      setIsRejectApplicationModalOpen(true);
    }
  };

  const handleAcceptApplication = (application: Application) => {
    setSelectedApplication(application);
    // Pre-fill the role with the job title
    const jobTitle = getJobTitle(application);
    setOfferForm(prev => ({
      ...prev,
      role: jobTitle !== "Unknown Position" ? jobTitle : "",
    }));
    setIsAcceptModalOpen(true);
  };

  // =============================================================
  // CONFIRM ACCEPT APPLICATION - CREATE OFFER
  // =============================================================
  // This function creates an offer using the form data filled by HR Manager.
  // The offer will appear in the candidate's "Offers" page where they can
  // accept or reject it.
  //
  // FLOW:
  // 1. HR Manager fills offer form (salary, benefits, deadline, etc.)
  // 2. confirmAcceptApplication() creates the offer in database
  // 3. Application status → "offer"
  // 4. Candidate sees offer in their Offers page
  // 5. Candidate accepts or rejects
  // 6. HR Manager finalizes (if candidate accepted)
  // =============================================================
  const confirmAcceptApplication = async () => {
    if (!selectedApplication) return;

    // Validate required fields
    if (!offerForm.grossSalary || parseFloat(offerForm.grossSalary) <= 0) {
      showToast("Please enter a valid gross salary", "error");
      return;
    }

    if (!offerForm.deadline) {
      showToast("Please set a deadline for the offer", "error");
      return;
    }

    try {
      setCreatingOffer(true);
      
      const candidateId = typeof selectedApplication.candidateId === 'object' 
        ? selectedApplication.candidateId?._id 
        : selectedApplication.candidateId;

      if (!candidateId) {
        showToast("Candidate ID not found", "error");
        return;
      }

      // Convert benefits from comma-separated string to array
      const benefitsArray = offerForm.benefits
        ? offerForm.benefits.split(',').map(b => b.trim()).filter(b => b.length > 0)
        : undefined;

      // Build offer data from form
      const offerData: CreateOfferDto = {
        applicationId: selectedApplication._id,
        candidateId: candidateId as string,
        grossSalary: parseFloat(offerForm.grossSalary),
        signingBonus: offerForm.signingBonus ? parseFloat(offerForm.signingBonus) : undefined,
        benefits: benefitsArray,
        conditions: offerForm.conditions || undefined,
        insurances: offerForm.insurances || undefined,
        content: offerForm.content || undefined,
        role: offerForm.role || undefined,
        deadline: new Date(offerForm.deadline).toISOString(),
      };

      // Create the offer in the database
      await recruitmentApi.createOffer(offerData);

      // Update application status to "offer" so it's tracked correctly
      await recruitmentApi.updateApplicationStatus(selectedApplication._id, {
        status: ApplicationStatus.OFFER,
      });

      showToast("Offer created successfully! The candidate will see this offer and can accept or reject it.", "success");
      setIsAcceptModalOpen(false);
      setSelectedApplication(null);
      resetOfferForm();
      await loadData();
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || 
                          error?.response?.data?.error || 
                          error?.message || 
                          "Failed to create offer";
      showToast(errorMessage, "error");
    } finally {
      setCreatingOffer(false);
    }
  };

  const confirmRejectApplication = async () => {
    if (!selectedApplication) return;

    if (!rejectionReason.trim()) {
      showToast("Please provide a rejection reason", "error");
      return;
    }

    try {
      setProcessing(true);
      
      await recruitmentApi.updateApplicationStatus(selectedApplication._id, {
        status: ApplicationStatus.REJECTED,
        rejectionReason: rejectionReason.trim(),
      });

      showToast("Application rejected successfully", "success");
      setIsRejectApplicationModalOpen(false);
      setSelectedApplication(null);
      setRejectionReason("");
      await loadData();
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || 
                          error?.response?.data?.error || 
                          error?.message || 
                          "Failed to reject application";
      showToast(errorMessage, "error");
    } finally {
      setProcessing(false);
    }
  };

  const confirmApprove = async () => {
    if (!selectedOffer) return;

    try {
      setProcessing(true);
      const finalizeData: FinalizeOfferDto = {
        finalStatus: OfferFinalStatus.APPROVED,
      };
      
      await recruitmentApi.finalizeOffer(selectedOffer._id, finalizeData);
      showToast("Offer approved successfully", "success");
      setIsApproveModalOpen(false);
      setSelectedApplication(null);
      setSelectedOffer(null);
      await loadData();
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || 
                          error?.response?.data?.error || 
                          error?.message || 
                          "Failed to approve offer";
      showToast(errorMessage, "error");
    } finally {
      setProcessing(false);
    }
  };

  const confirmReject = async () => {
    if (!selectedOffer) return;

    try {
      setProcessing(true);
      const finalizeData: FinalizeOfferDto = {
        finalStatus: OfferFinalStatus.REJECTED,
      };
      
      await recruitmentApi.finalizeOffer(selectedOffer._id, finalizeData);
      showToast("Offer rejected successfully", "success");
      setIsRejectModalOpen(false);
      setSelectedApplication(null);
      setSelectedOffer(null);
      await loadData();
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || 
                          error?.response?.data?.error || 
                          error?.message || 
                          "Failed to reject offer";
      showToast(errorMessage, "error");
    } finally {
      setProcessing(false);
    }
  };

  const getCandidateName = (application: Application): string => {
    const candidate = application.candidate || 
                     (typeof application.candidateId === 'object' ? application.candidateId : null);
    if (candidate) {
      return candidate.firstName && candidate.lastName
        ? `${candidate.firstName} ${candidate.lastName}`
        : candidate.fullName || candidate.name || "Unknown Candidate";
    }
    return "Unknown Candidate";
  };

  const getJobTitle = (application: Application): string => {
    return getJobDetails(application).title;
  };

  // CHANGED - Get candidate's resume URL from application
  const getCandidateResumeUrl = (application: Application): string | null => {
    const candidate = application.candidate || 
                     (typeof application.candidateId === 'object' ? application.candidateId : null);
    return candidate?.resumeUrl || null;
  };

  // CHANGED - Handle viewing candidate's CV/Resume
  const handleViewResume = async (application: Application) => {
    const resumeUrl = getCandidateResumeUrl(application);
    
    if (!resumeUrl) {
      showToast("No CV/Resume available for this candidate", "error");
      return;
    }

    try {
      setViewingResume(application._id);
      const trimmedUrl = resumeUrl.trim();
      
      // Case 1: Full URL (http:// or https://) - open directly in new tab
      if (trimmedUrl.startsWith("http://") || trimmedUrl.startsWith("https://")) {
        const newWindow = window.open(trimmedUrl, '_blank');
        if (!newWindow) {
          showToast("Popup blocked. Please allow popups to view the CV.", "error");
          setViewingResume(null);
          return;
        }
        showToast("Opening CV in new tab...", "success");
        setViewingResume(null);
        return;
      }
      
      // Case 2: File path (starts with / or contains uploads) - fetch with auth and open
      if (trimmedUrl.startsWith("/") || trimmedUrl.includes("uploads")) {
        const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1";
        const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') || '' : '';
        
        const baseUrl = API_BASE_URL.replace('/api/v1', '');
        const fullUrl = `${baseUrl}${trimmedUrl.startsWith('/') ? trimmedUrl : '/' + trimmedUrl}`;
        
        const response = await fetch(fullUrl, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch CV: ${response.statusText}`);
        }
        
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        
        const newWindow = window.open(blobUrl, '_blank');
        if (!newWindow) {
          window.URL.revokeObjectURL(blobUrl);
          showToast("Popup blocked. Please allow popups to view the CV.", "error");
          setViewingResume(null);
          return;
        }
        
        setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000);
        showToast("Opening CV in new tab...", "success");
        setViewingResume(null);
        return;
      }
      
      // Case 3: Document ID (MongoDB ObjectId format) - use document API
      if (/^[0-9a-fA-F]{24}$/.test(trimmedUrl)) {
        try {
          const blob = await recruitmentApi.downloadDocument(trimmedUrl);
          const blobUrl = window.URL.createObjectURL(blob);
          
          const newWindow = window.open(blobUrl, '_blank');
          if (!newWindow) {
            window.URL.revokeObjectURL(blobUrl);
            showToast("Popup blocked. Please allow popups to view the CV.", "error");
            setViewingResume(null);
            return;
          }
          
          setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000);
          showToast("Opening CV in new tab...", "success");
          setViewingResume(null);
          return;
        } catch (docError: any) {
          console.error("Error fetching document:", docError);
          throw new Error("Failed to retrieve CV. It may have been deleted or is inaccessible.");
        }
      }
      
      throw new Error("Unrecognized CV URL format. Please contact support.");
      
    } catch (error: any) {
      console.error("Error viewing CV:", error);
      showToast(error.message || "Failed to view CV", "error");
      setViewingResume(null);
    }
  };

  // =============================================================
  // CREATE EMPLOYEE HANDLERS
  // =============================================================
  const handleOpenCreateEmployee = (application: Application, offer: Offer) => {
    setSelectedApplication(application);
    setSelectedOffer(offer);
    const candidateName = getCandidateName(application);
    // Generate a suggested employee number
    const suggestedEmployeeNumber = `EMP-${Date.now().toString().slice(-6)}`;
    setEmployeeForm({
      startDate: new Date().toISOString().split('T')[0],
      workEmail: `${candidateName.toLowerCase().replace(/\s+/g, '.')}@company.com`,
      employeeNumber: suggestedEmployeeNumber,
      // CHANGED - Initialize new fields for employee-profile integration
      contractType: undefined,
      workType: undefined,
      primaryDepartmentId: undefined,
      supervisorPositionId: undefined,
    });
    setIsCreateEmployeeModalOpen(true);
  };

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOffer?._id) {
      showToast("No offer selected", "error");
      return;
    }

    try {
      setCreatingEmployee(true);
      await recruitmentApi.createEmployeeFromContract(selectedOffer._id, employeeForm);
      showToast("Employee created successfully! Onboarding has been initiated.", "success");
      setIsCreateEmployeeModalOpen(false);
      setSelectedOffer(null);
      setSelectedApplication(null);
      await loadData();
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || 
                          error?.response?.data?.error || 
                          error?.message || 
                          "Failed to create employee";
      showToast(errorMessage, "error");
    } finally {
      setCreatingEmployee(false);
    }
  };

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
          <h1 className="text-3xl font-bold text-gray-900">Job Offers and Approvals</h1>
          <p className="text-gray-600 mt-1">
            Review interview feedback and approve/reject applications. Create offers for approved candidates.
          </p>
        </div>

        {/* =============================================================
            SORT AND FILTER CONTROLS
            =============================================================
            - Sort by: Referral Priority, Score, Date
            - Filter by: Job Position
            - Referrals get higher priority (internal candidate preference)
            ============================================================= */}
        {!loading && applications.length > 0 && (
          <div className="mb-6 bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-4">
              {/* Sort By */}
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Sort by:</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as "score" | "referral" | "date")}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="referral">⭐ Referral Priority</option>
                  <option value="score">📊 Interview Score</option>
                  <option value="date">📅 Application Date</option>
                </select>
              </div>

              {/* Filter By Job */}
              {availableJobs.length > 1 && (
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700">Filter by Job:</label>
                  <select
                    value={filterByJob}
                    onChange={(e) => setFilterByJob(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="all">All Positions</option>
                    {availableJobs.map((job) => (
                      <option key={job.id} value={job.id}>
                        {job.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Info Badge */}
              <div className="ml-auto flex items-center gap-2">
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                  {getSortedFilteredApplications().length} application(s)
                </span>
                {sortBy === "referral" && (
                  <span className="text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded border border-amber-200">
                    ⭐ Referrals shown first
                  </span>
                )}
              </div>
            </div>

            {/* Legend */}
            <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-amber-400 rounded-full"></span>
                Referral (Higher Priority)
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                High Score (≥70)
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                Has Interview Feedback
              </span>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading offers...</p>
          </div>
        ) : applications.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-500 mb-4">No applications pending review.</p>
              <p className="text-sm text-gray-400">
                Applications with interview feedback or status "offer" will appear here for your review.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {getSortedFilteredApplications().map((application) => {
              const offer = offers[application._id];
              const candidateName = getCandidateName(application);
              const jobTitle = getJobTitle(application);
              const needsReview = hasInterviewFeedback(application) && application.status === ApplicationStatus.IN_PROCESS;
              const isReferral = applicationReferrals[application._id] || false;
              const score = applicationScores[application._id] || 0;
              
              return (
                <Card 
                  key={application._id} 
                  className={`hover:shadow-lg transition-shadow ${
                    isReferral ? 'ring-2 ring-amber-300 bg-amber-50/30' : ''
                  }`}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-lg">{candidateName}</CardTitle>
                          {/* Referral Badge */}
                          {isReferral && (
                            <span className="px-2 py-0.5 text-xs font-semibold text-amber-700 bg-amber-100 rounded-full border border-amber-300">
                              ⭐ Referral
                            </span>
                          )}
                        </div>
                        <CardDescription className="mt-1">{jobTitle}</CardDescription>
                        
                        {/* Score and Status Badges */}
                        <div className="flex flex-wrap gap-2 mt-2">
                          {needsReview && (
                            <span className="inline-block px-2 py-1 text-xs font-semibold text-green-700 bg-green-100 rounded-full">
                              Interview Feedback Available
                            </span>
                          )}
                          {score > 0 && (
                            <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${
                              score >= 70 
                                ? 'text-green-700 bg-green-100' 
                                : score >= 50 
                                  ? 'text-yellow-700 bg-yellow-100'
                                  : 'text-gray-700 bg-gray-100'
                            }`}>
                              📊 Score: {score.toFixed(0)}%
                            </span>
                          )}
                        </div>
                      </div>
                      <StatusBadge status={application.status} />
                    </div>
                  </CardHeader>
                  <CardContent>
                    {offer ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500">Offer Status:</span>
                          <span className={`font-medium ${
                            offer.finalStatus === OfferFinalStatus.APPROVED ? "text-green-600" :
                            offer.finalStatus === OfferFinalStatus.REJECTED ? "text-red-600" :
                            "text-yellow-600"
                          }`}>
                            {offer.finalStatus === OfferFinalStatus.APPROVED ? "Approved" :
                             offer.finalStatus === OfferFinalStatus.REJECTED ? "Rejected" :
                             "Pending Approval"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500">Candidate Response:</span>
                          <span className={`font-medium ${
                            offer.applicantResponse === OfferResponseStatus.ACCEPTED ? "text-green-600" :
                            offer.applicantResponse === OfferResponseStatus.REJECTED ? "text-red-600" :
                            "text-yellow-600"
                          }`}>
                            {offer.applicantResponse === OfferResponseStatus.ACCEPTED ? "Accepted" :
                             offer.applicantResponse === OfferResponseStatus.REJECTED ? "Rejected" :
                             "Pending"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500">Salary:</span>
                          <span className="font-medium">${offer.grossSalary?.toLocaleString() || "N/A"}</span>
                        </div>
                        {offer.signingBonus && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-500">Signing Bonus:</span>
                            <span className="font-medium">${offer.signingBonus.toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                    ) : needsReview ? (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <p className="text-sm text-green-800 font-medium">
                          Ready for Review - Interview feedback has been submitted
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">Offer details not available</p>
                    )}
                    
                    <div className="flex gap-2 mt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewOffer(application)}
                        className="flex-1"
                      >
                        View Details
                      </Button>
                      {/* CHANGED - Added View CV button in card */}
                      {getCandidateResumeUrl(application) && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewResume(application)}
                          disabled={viewingResume === application._id}
                          className="text-blue-600 hover:text-blue-700"
                          title="View Candidate CV"
                        >
                          {viewingResume === application._id ? "..." : "📄"}
                        </Button>
                      )}
                      {needsReview && !offer && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAcceptApplication(application)}
                            className="flex-1 text-green-600 hover:text-green-700"
                            disabled={creatingOffer}
                          >
                            {creatingOffer ? "Creating..." : "Approve & Create Offer"}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleReject(application)}
                            className="flex-1 text-red-600 hover:text-red-700"
                            disabled={processing}
                          >
                            Reject
                          </Button>
                        </>
                      )}
                      {offer && offer.finalStatus === OfferFinalStatus.PENDING && (
                        <>
                          {offer.applicantResponse !== OfferResponseStatus.PENDING && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleApprove(application)}
                                className="flex-1 text-green-600 hover:text-green-700"
                                disabled={processing}
                              >
                                Approve
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleReject(application)}
                                className="flex-1 text-red-600 hover:text-red-700"
                                disabled={processing}
                              >
                                Reject
                              </Button>
                            </>
                          )}
                        </>
                      )}
                      {/* ONB-002: Create Employee button - shows when offer is ACCEPTED + APPROVED */}
                      {/* Contract must be uploaded by candidate before HR can create employee */}
                      {/* CHANGED - Hide button if employee already exists to prevent duplicates */}
                      {offer && 
                        offer.applicantResponse === OfferResponseStatus.ACCEPTED && 
                        offer.finalStatus === OfferFinalStatus.APPROVED && 
                        !employeeExistsMap[application._id] && (
                        (() => {
                          const contractStatus = contractStatuses[offer._id];
                          const hasContract = contractStatus?.hasSignedDocument;
                          return (
                            <div className="flex flex-col gap-2">
                              {/* Contract Status Indicator */}
                              {!hasContract ? (
                                <div className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                                  ⏳ Waiting for candidate to upload signed contract
                                </div>
                              ) : (
                                <div className="text-xs text-green-600 bg-green-50 border border-green-200 rounded px-2 py-1">
                                  ✓ Signed contract uploaded
                                </div>
                              )}
                              <Button
                                size="sm"
                                onClick={() => handleOpenCreateEmployee(application, offer)}
                                className={`flex-1 ${hasContract ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-400 cursor-not-allowed'} text-white`}
                                disabled={creatingEmployee || !hasContract}
                                title={!hasContract ? 'Candidate must upload signed contract first (ONB-002)' : 'Create employee profile'}
                              >
                                {creatingEmployee ? "Creating..." : "Create Employee"}
                              </Button>
                            </div>
                          );
                        })()
                      )}
                      {/* CHANGED - Show "Employee Created" indicator when employee already exists */}
                      {offer && 
                        offer.applicantResponse === OfferResponseStatus.ACCEPTED && 
                        offer.finalStatus === OfferFinalStatus.APPROVED && 
                        employeeExistsMap[application._id] && (
                        <div className="text-xs text-blue-600 bg-blue-50 border border-blue-200 rounded px-2 py-1">
                          ✓ Employee profile already created
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* View Offer Modal */}
        <Modal
          isOpen={isViewModalOpen}
          onClose={() => {
            setIsViewModalOpen(false);
            setSelectedApplication(null);
            setSelectedOffer(null);
          }}
          title={selectedOffer ? "Offer Details" : "Application Details"}
          size="lg"
        >
          {selectedApplication && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Candidate</label>
                  <p className="text-gray-900">{getCandidateName(selectedApplication)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Position</label>
                  <p className="text-gray-900">{getJobTitle(selectedApplication)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Application Status</label>
                  <StatusBadge status={selectedApplication.status} />
                </div>
                {/* CHANGED - Added View CV button */}
                <div>
                  <label className="text-sm font-medium text-gray-700">CV/Resume</label>
                  {getCandidateResumeUrl(selectedApplication) ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewResume(selectedApplication)}
                      disabled={viewingResume === selectedApplication._id}
                      className="mt-1 text-blue-600 hover:text-blue-700"
                    >
                      {viewingResume === selectedApplication._id ? "Opening..." : "📄 View CV"}
                    </Button>
                  ) : (
                    <p className="text-gray-500 text-sm">No CV uploaded</p>
                  )}
                </div>
              </div>

              {selectedOffer && (
                <>
                  <div className="border-t pt-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Offer Information</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-700">Gross Salary</label>
                        <p className="text-gray-900">${selectedOffer.grossSalary?.toLocaleString() || "N/A"}</p>
                      </div>
                      {selectedOffer.signingBonus && (
                        <div>
                          <label className="text-sm font-medium text-gray-700">Signing Bonus</label>
                          <p className="text-gray-900">${selectedOffer.signingBonus.toLocaleString()}</p>
                        </div>
                      )}
                      <div>
                        <label className="text-sm font-medium text-gray-700">Candidate Response</label>
                        <p className={`font-medium ${
                          selectedOffer.applicantResponse === OfferResponseStatus.ACCEPTED ? "text-green-600" :
                          selectedOffer.applicantResponse === OfferResponseStatus.REJECTED ? "text-red-600" :
                          "text-yellow-600"
                        }`}>
                          {selectedOffer.applicantResponse === OfferResponseStatus.ACCEPTED ? "Accepted" :
                           selectedOffer.applicantResponse === OfferResponseStatus.REJECTED ? "Rejected" :
                           "Pending"}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Final Status</label>
                        <p className={`font-medium ${
                          selectedOffer.finalStatus === OfferFinalStatus.APPROVED ? "text-green-600" :
                          selectedOffer.finalStatus === OfferFinalStatus.REJECTED ? "text-red-600" :
                          "text-yellow-600"
                        }`}>
                          {selectedOffer.finalStatus === OfferFinalStatus.APPROVED ? "Approved" :
                           selectedOffer.finalStatus === OfferFinalStatus.REJECTED ? "Rejected" :
                           "Pending"}
                        </p>
                      </div>
                    </div>

                    {selectedOffer.benefits && selectedOffer.benefits.length > 0 && (
                      <div className="mt-4">
                        <label className="text-sm font-medium text-gray-700">Benefits</label>
                        <ul className="list-disc list-inside text-gray-900">
                          {selectedOffer.benefits.map((benefit, idx) => (
                            <li key={idx}>{benefit}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {selectedOffer.content && (
                      <div className="mt-4">
                        <label className="text-sm font-medium text-gray-700">Offer Content</label>
                        <p className="text-gray-900 whitespace-pre-wrap">{selectedOffer.content}</p>
                      </div>
                    )}
                  </div>
                </>
              )}

              {loadingAssessments ? (
                <div className="text-center py-4">
                  <p className="text-gray-500">Loading candidate assessments...</p>
                </div>
              ) : (
                <div className="border-t pt-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Interview Feedback</h3>
                  {candidateAssessments.rankedData && (
                    <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600">
                        Ranking Score: <span className="font-medium">{candidateAssessments.rankedData.rankingScore || "N/A"}</span>
                      </p>
                    </div>
                  )}
                  {Object.keys(candidateAssessments.interviewScores).length > 0 ? (
                    <div className="space-y-4">
                      {Object.entries(candidateAssessments.interviewScores).map(([interviewId, score]) => {
                        const feedbackList = candidateAssessments.interviewFeedback[interviewId] || [];
                        const interview = selectedApplication && (selectedApplication as any).interviews?.find((int: any) => int._id === interviewId);
                        
                        return (
                          <div key={interviewId} className="border border-gray-200 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="font-semibold text-gray-900">
                                {interview?.stage?.replace("_", " ").toUpperCase() || "Interview"}
                              </h4>
                              <div className="bg-blue-50 px-3 py-1 rounded-lg">
                                <span className="text-sm font-bold text-blue-600">
                                  Average Score: {score.toFixed(1)}/100
                                </span>
                              </div>
                            </div>
                            {feedbackList.length > 0 ? (
                              <div className="space-y-3 mt-3">
                                <p className="text-sm font-medium text-gray-700">Panel Feedback:</p>
                                {feedbackList.map((fb: any, idx: number) => {
                                  // =============================================================
                                  // PARSE STRUCTURED ASSESSMENT FROM COMMENTS
                                  // =============================================================
                                  // Comments field may contain JSON with detailed skill scores
                                  // Format: { skillScores: {...}, generalComments: "...", assessmentCriteria: [...] }
                                  // =============================================================
                                  let parsedAssessment: any = null;
                                  try {
                                    if (fb.comments && fb.comments.startsWith('{')) {
                                      parsedAssessment = JSON.parse(fb.comments);
                                    }
                                  } catch (e) {
                                    // Not JSON, will display as plain text
                                  }

                                  return (
                                    <div key={idx} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                      <div className="flex items-center justify-between mb-3">
                                        <span className="text-sm font-semibold text-gray-900">
                                          Interviewer {idx + 1}
                                        </span>
                                        <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                                          (fb.score || 0) >= 70 ? 'bg-green-100 text-green-700' :
                                          (fb.score || 0) >= 50 ? 'bg-yellow-100 text-yellow-700' :
                                          'bg-red-100 text-red-700'
                                        }`}>
                                          Overall: {fb.score || 0}/100
                                        </span>
                                      </div>
                                      
                                      {/* Display structured skill scores if available */}
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
                                      
                                      {/* Fallback: Display plain text comments if not structured */}
                                      {!parsedAssessment && fb.comments && (
                                        <div className="bg-white p-3 rounded border border-gray-100">
                                          <p className="text-xs font-medium text-gray-600 mb-1">Comments:</p>
                                          <p className="text-sm text-gray-700">{fb.comments}</p>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <p className="text-sm text-gray-500 mt-2">No detailed feedback available</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <p className="text-sm text-yellow-800">No interview scores available</p>
                    </div>
                  )}
                </div>
              )}
              
              {/* Action buttons for applications without offers */}
              {!selectedOffer && hasInterviewFeedback(selectedApplication) && (
                <div className="border-t pt-4 flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsViewModalOpen(false);
                      handleAcceptApplication(selectedApplication);
                    }}
                    disabled={creatingOffer}
                    className="text-green-600 hover:text-green-700"
                  >
                    {creatingOffer ? "Creating..." : "Approve & Create Offer"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsViewModalOpen(false);
                      handleReject(selectedApplication);
                    }}
                    disabled={processing}
                    className="text-red-600 hover:text-red-700"
                  >
                    Reject Application
                  </Button>
                </div>
              )}
            </div>
          )}
        </Modal>

        {/* Approve Confirmation Modal */}
        <Modal
          isOpen={isApproveModalOpen}
          onClose={() => {
            setIsApproveModalOpen(false);
            setSelectedApplication(null);
            setSelectedOffer(null);
          }}
          title="Approve Offer"
        >
          {selectedOffer && (
            <div className="space-y-4">
              <p className="text-gray-700">
                Are you sure you want to approve this offer? This will finalize the offer and 
                the candidate will be marked as hired if they have accepted the offer.
              </p>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsApproveModalOpen(false);
                    setSelectedApplication(null);
                    setSelectedOffer(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={confirmApprove}
                  disabled={processing}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {processing ? "Approving..." : "Approve Offer"}
                </Button>
              </div>
            </div>
          )}
        </Modal>

        {/* =============================================================
           CREATE OFFER FORM MODAL
           =============================================================
           This modal allows HR Manager to fill in all offer details
           before sending the offer to the candidate.
           
           Fields from Offer Schema:
           - grossSalary (required)
           - signingBonus (optional)
           - benefits (optional - comma-separated)
           - conditions (optional)
           - insurances (optional)
           - content (optional - offer letter text)
           - role (optional - pre-filled from job title)
           - deadline (required)
           ============================================================= */}
        <Modal
          isOpen={isAcceptModalOpen}
          onClose={() => {
            setIsAcceptModalOpen(false);
            setSelectedApplication(null);
            resetOfferForm();
          }}
          title="Create Job Offer"
          size="lg"
        >
          {selectedApplication && (
            <div className="space-y-5">
              {/* Candidate Info Header */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900">Creating offer for:</h3>
                <p className="text-blue-800">{getCandidateName(selectedApplication)}</p>
                <p className="text-sm text-blue-700">{getJobTitle(selectedApplication)}</p>
              </div>

              {/* Compensation Section */}
              <div className="border-b pb-4">
                <h4 className="font-medium text-gray-900 mb-3">💰 Compensation</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Gross Salary (Annual) <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="number"
                      placeholder="e.g., 75000"
                      value={offerForm.grossSalary}
                      onChange={(e) => setOfferForm(prev => ({ ...prev, grossSalary: e.target.value }))}
                      min="0"
                      step="1000"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Signing Bonus (Optional)
                    </label>
                    <Input
                      type="number"
                      placeholder="e.g., 5000"
                      value={offerForm.signingBonus}
                      onChange={(e) => setOfferForm(prev => ({ ...prev, signingBonus: e.target.value }))}
                      min="0"
                    />
                  </div>
                </div>
              </div>

              {/* Benefits & Insurance Section */}
              <div className="border-b pb-4">
                <h4 className="font-medium text-gray-900 mb-3">🏥 Benefits & Insurance</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Benefits (comma-separated)
                    </label>
                    <Input
                      placeholder="e.g., Health Insurance, 401k Match, PTO"
                      value={offerForm.benefits}
                      onChange={(e) => setOfferForm(prev => ({ ...prev, benefits: e.target.value }))}
                    />
                    <p className="text-xs text-gray-500 mt-1">Separate benefits with commas</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Insurances
                    </label>
                    <Input
                      placeholder="e.g., Medical, Dental, Vision, Life"
                      value={offerForm.insurances}
                      onChange={(e) => setOfferForm(prev => ({ ...prev, insurances: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              {/* Role & Conditions Section */}
              <div className="border-b pb-4">
                <h4 className="font-medium text-gray-900 mb-3">📋 Role & Conditions</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Role/Position Title
                    </label>
                    <Input
                      placeholder="e.g., Software Engineer"
                      value={offerForm.role}
                      onChange={(e) => setOfferForm(prev => ({ ...prev, role: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Conditions (if any)
                    </label>
                    <Textarea
                      placeholder="e.g., Subject to background check, 90-day probation period"
                      value={offerForm.conditions}
                      onChange={(e) => setOfferForm(prev => ({ ...prev, conditions: e.target.value }))}
                      rows={2}
                    />
                  </div>
                </div>
              </div>

              {/* Offer Letter Content */}
              <div className="border-b pb-4">
                <h4 className="font-medium text-gray-900 mb-3">📝 Offer Letter Content</h4>
                <Textarea
                  placeholder="Enter the offer letter content... (This will be shown to the candidate)"
                  value={offerForm.content}
                  onChange={(e) => setOfferForm(prev => ({ ...prev, content: e.target.value }))}
                  rows={4}
                />
              </div>

              {/* Deadline Section */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">📅 Response Deadline</h4>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Deadline <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="date"
                    value={offerForm.deadline}
                    onChange={(e) => setOfferForm(prev => ({ ...prev, deadline: e.target.value }))}
                    min={new Date().toISOString().split('T')[0]}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Candidate must respond by this date
                  </p>
                </div>
              </div>

              {/* Info Box */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-sm text-green-800">
                  <strong>What happens next:</strong> Once you create this offer, it will appear in the candidate's 
                  "Job Offers" page. They can review the details and choose to accept or reject. After they respond, 
                  you can finalize the hiring decision.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsAcceptModalOpen(false);
                    setSelectedApplication(null);
                    resetOfferForm();
                  }}
                  disabled={creatingOffer}
                >
                  Cancel
                </Button>
                <Button
                  onClick={confirmAcceptApplication}
                  disabled={creatingOffer || !offerForm.grossSalary}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {creatingOffer ? "Creating Offer..." : "Create & Send Offer"}
                </Button>
              </div>
            </div>
          )}
        </Modal>

        {/* Reject Offer Modal */}
        <Modal
          isOpen={isRejectModalOpen}
          onClose={() => {
            setIsRejectModalOpen(false);
            setSelectedApplication(null);
            setSelectedOffer(null);
          }}
          title="Reject Offer"
        >
          {selectedOffer && (
            <div className="space-y-4">
              <p className="text-gray-700">
                Are you sure you want to reject this offer? The application status will be updated 
                and the candidate will be notified. This action cannot be undone.
              </p>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsRejectModalOpen(false);
                    setSelectedApplication(null);
                    setSelectedOffer(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={confirmReject}
                  disabled={processing}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {processing ? "Rejecting..." : "Reject Offer"}
                </Button>
              </div>
            </div>
          )}
        </Modal>

        {/* Reject Application Modal */}
        <Modal
          isOpen={isRejectApplicationModalOpen}
          onClose={() => {
            setIsRejectApplicationModalOpen(false);
            setSelectedApplication(null);
            setRejectionReason("");
          }}
          title="Reject Application"
        >
          {selectedApplication && (
            <div className="space-y-4">
              <p className="text-gray-700">
                Are you sure you want to reject this application? The candidate will be notified 
                with the reason you provide below. This action cannot be undone.
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rejection Reason * (will be sent to candidate)
                </label>
                <Textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Please provide a respectful reason for rejection. This will be included in the notification email sent to the candidate."
                  rows={4}
                  className="w-full"
                />
                <p className="text-xs text-gray-500 mt-2">
                  This message will be included in the automated rejection email to the candidate.
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsRejectApplicationModalOpen(false);
                    setSelectedApplication(null);
                    setRejectionReason("");
                  }}
                  disabled={processing}
                >
                  Cancel
                </Button>
                <Button
                  onClick={confirmRejectApplication}
                  disabled={processing || !rejectionReason.trim()}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {processing ? "Rejecting..." : "Reject Application"}
                </Button>
              </div>
            </div>
          )}
        </Modal>

        {/* Create Employee Modal */}
        <Modal
          isOpen={isCreateEmployeeModalOpen}
          onClose={() => {
            setIsCreateEmployeeModalOpen(false);
            setSelectedApplication(null);
            setSelectedOffer(null);
          }}
          title="Create Employee Profile"
        >
          {selectedApplication && selectedOffer && (
            <form onSubmit={handleCreateEmployee} className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                <p className="text-green-800 font-medium">
                  ✓ Offer Accepted by: {getCandidateName(selectedApplication)}
                </p>
                <p className="text-green-700 text-sm mt-1">
                  Position: {getJobTitle(selectedApplication)}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Employee Number *
                </label>
                <Input
                  type="text"
                  value={employeeForm.employeeNumber}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, employeeNumber: e.target.value })}
                  required
                  placeholder="e.g., EMP-001234"
                />
                <p className="text-xs text-gray-500 mt-1">
                  This will be the employee's login username.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Work Email *
                </label>
                <Input
                  type="email"
                  value={employeeForm.workEmail}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, workEmail: e.target.value })}
                  required
                  placeholder="john.doe@company.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date *
                </label>
                <Input
                  type="date"
                  value={employeeForm.startDate}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, startDate: e.target.value })}
                  required
                />
              </div>

              {/* CHANGED - Added Contract Type and Work Type fields */}
              <div className="border-t pt-4 mt-4">
                <h4 className="font-medium text-gray-900 mb-3">📋 Employment Details</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Contract Type *
                    </label>
                    <Select
                      value={employeeForm.contractType || ""}
                      onChange={(e) => setEmployeeForm({ 
                        ...employeeForm, 
                        contractType: e.target.value as 'FULL_TIME_CONTRACT' | 'PART_TIME_CONTRACT' || undefined 
                      })}
                      options={[
                        { value: "", label: "Select contract type" },
                        { value: "FULL_TIME_CONTRACT", label: "Full-Time Contract" },
                        { value: "PART_TIME_CONTRACT", label: "Part-Time Contract" },
                      ]}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Work Type *
                    </label>
                    <Select
                      value={employeeForm.workType || ""}
                      onChange={(e) => setEmployeeForm({ 
                        ...employeeForm, 
                        workType: e.target.value as 'FULL_TIME' | 'PART_TIME' || undefined 
                      })}
                      options={[
                        { value: "", label: "Select work type" },
                        { value: "FULL_TIME", label: "Full-Time" },
                        { value: "PART_TIME", label: "Part-Time" },
                      ]}
                    />
                  </div>
                </div>
              </div>

              {/* CHANGED - Added Department and Supervisor fields */}
              <div className="border-t pt-4 mt-4">
                <h4 className="font-medium text-gray-900 mb-3">🏢 Organization Assignment</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Department *
                    </label>
                    <Select
                      value={employeeForm.primaryDepartmentId || ""}
                      onChange={(e) => setEmployeeForm({ ...employeeForm, primaryDepartmentId: e.target.value || undefined })}
                      disabled={loadingOrgData}
                      options={[
                        { value: "", label: loadingOrgData ? "Loading departments..." : "Select department" },
                        ...departments.map((dept) => ({
                          value: dept._id,
                          label: dept.name,
                        })),
                      ]}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Supervisor Position
                    </label>
                    <Select
                      value={employeeForm.supervisorPositionId || ""}
                      onChange={(e) => setEmployeeForm({ ...employeeForm, supervisorPositionId: e.target.value || undefined })}
                      disabled={loadingOrgData}
                      options={[
                        { value: "", label: loadingOrgData ? "Loading positions..." : "Select supervisor (optional)" },
                        ...positions.map((pos) => ({
                          value: pos._id,
                          label: pos.title,
                        })),
                      ]}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Who this employee will report to
                    </p>
                  </div>
                </div>
              </div>

              {/* CHANGED - Added System Role selection for new employees */}
              <div className="border-t pt-4 mt-4">
                <h4 className="font-medium text-gray-900 mb-3">🔐 System Access & Role</h4>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    System Role *
                  </label>
                  <Select
                    value={employeeForm.systemRole || ""}
                    onChange={(e) => setEmployeeForm({ 
                      ...employeeForm, 
                      systemRole: e.target.value as any || undefined 
                    })}
                    options={[
                      { value: "", label: "Auto-detect from job title (recommended)" },
                      { value: "department employee", label: "Department Employee (Default)" },
                      { value: "department head", label: "Department Head" },
                      { value: "HR Manager", label: "HR Manager" },
                      { value: "HR Employee", label: "HR Employee" },
                      { value: "HR Admin", label: "HR Admin" },
                      { value: "Payroll Manager", label: "Payroll Manager" },
                      { value: "Payroll Specialist", label: "Payroll Specialist" },
                      { value: "System Admin", label: "System Admin" },
                      { value: "Legal & Policy Admin", label: "Legal & Policy Admin" },
                      { value: "Recruiter", label: "Recruiter" },
                      { value: "Finance Staff", label: "Finance Staff" },
                    ]}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Determines what dashboards and features this employee can access. 
                    Leave as "Auto-detect" to let the system determine based on job title.
                  </p>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  ℹ️ The new employee will be able to log in using the Employee Number above with the same password they used during the application process.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsCreateEmployeeModalOpen(false);
                    setSelectedApplication(null);
                    setSelectedOffer(null);
                  }}
                  disabled={creatingEmployee}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={
                    creatingEmployee || 
                    !employeeForm.employeeNumber || 
                    !employeeForm.workEmail || 
                    !employeeForm.startDate ||
                    !employeeForm.contractType ||
                    !employeeForm.workType ||
                    !employeeForm.primaryDepartmentId
                  }
                  className="bg-green-600 hover:bg-green-700"
                >
                  {creatingEmployee ? "Creating Employee..." : "Create Employee & Start Onboarding"}
                </Button>
              </div>
            </form>
          )}
        </Modal>
      </div>
    </ProtectedRoute>
  );
}

