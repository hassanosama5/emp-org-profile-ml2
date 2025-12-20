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
  Offer,
  Application,
  CreateOfferDto,
  FinalizeOfferDto,
  OfferFinalStatus,
  OfferResponseStatus,
  CreateEmployeeFromContractDto,
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
// Handles all possible nested structures from the backend
const getJobDetails = (application: Application | null) => {
  if (!application) {
    return { title: "Unknown Position", department: "Unknown Department", location: "Unknown Location" };
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
  
  return { title, department, location };
};

export default function HROffersPage() {
  const { user } = useAuth();
  const { toast, showToast, hideToast } = useToast();
  const [applications, setApplications] = useState<Application[]>([]);
  const [applicationsForOffer, setApplicationsForOffer] = useState<Application[]>([]);
  const [applicationsWithOffers, setApplicationsWithOffers] = useState<Application[]>([]);
  const [applicationsCompleted, setApplicationsCompleted] = useState<Application[]>([]); // Applications where employee already exists
  const [offerMap, setOfferMap] = useState<Record<string, Offer>>({}); // Map applicationId -> offer
  const [employeeExistsMap, setEmployeeExistsMap] = useState<Record<string, {
    employeeExists: boolean;
    employee: any | null;
    message: string;
  }>>({}); // Map applicationId -> employee existence status
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"create" | "manage" | "completed">("manage");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isFinalizeModalOpen, setIsFinalizeModalOpen] = useState(false);
  const [isCreateEmployeeModalOpen, setIsCreateEmployeeModalOpen] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  // CHANGED - Added state for candidate assessments
  const [candidateAssessments, setCandidateAssessments] = useState<{
    interviewScores: Record<string, number>; // interviewId -> average score
    interviewFeedback: Record<string, any[]>; // interviewId -> feedback array
    rankedData?: any; // Ranked application data if available
  }>({
    interviewScores: {},
    interviewFeedback: {},
  });
  const [loadingAssessments, setLoadingAssessments] = useState(false);
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
  const [creatingEmployee, setCreatingEmployee] = useState(false);
  
  // CHANGED - State for organization structure data (departments & positions)
  const [departments, setDepartments] = useState<DepartmentResponseDto[]>([]);
  const [positions, setPositions] = useState<PositionResponseDto[]>([]);
  const [loadingOrgData, setLoadingOrgData] = useState(false);
  const [contractStatusMap, setContractStatusMap] = useState<Record<string, {
    hasContract: boolean;
    hasSignedDocument: boolean;
    contract: any | null;
    message: string;
  }>>({});
  const [loadingContractStatus, setLoadingContractStatus] = useState<Record<string, boolean>>({});
  const [viewingContract, setViewingContract] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState<CreateOfferDto>({
    applicationId: "",
    candidateId: "",
    grossSalary: 0,
    signingBonus: 0,
    benefits: [],
    deadline: "",
    role: "",
    content: "",
  });
  const [benefitInput, setBenefitInput] = useState("");
  const [finalizeForm, setFinalizeForm] = useState<FinalizeOfferDto>({
    finalStatus: OfferFinalStatus.PENDING,
  });
  const [creating, setCreating] = useState(false);
  const [finalizing, setFinalizing] = useState(false);

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

  const loadData = async () => {
    try {
      setLoading(true);
      const apps = await recruitmentApi.getApplications();
      setApplications(apps);
      
      // Separate applications ready for offers vs those with offers
      const forOffer = apps.filter(
        (app) => app.status === "in_process" || app.status === "offer"
      );
      // Include "offer" and "hired" status - we need to see hired applications to create employee
      const withOffers = apps.filter(
        (app) => app.status === "offer" || app.status === "hired"
      );
      
      setApplicationsForOffer(forOffer);
      
      // Check employee existence for each application with offers
      // This determines if "Create Employee" button should be shown
      const employeeExistsData: Record<string, {
        employeeExists: boolean;
        employee: any | null;
        message: string;
      }> = {};
      const activeApplications: Application[] = [];
      const completedApplications: Application[] = [];
      
      for (const app of withOffers) {
        try {
          const employeeStatus = await recruitmentApi.checkEmployeeExistsForApplication(app._id);
          employeeExistsData[app._id] = employeeStatus;
          
          if (employeeStatus.employeeExists) {
            // Employee already created - move to completed section
            completedApplications.push(app);
          } else {
            // Employee not created yet - show in active section
            activeApplications.push(app);
          }
        } catch (error: any) {
          // If check fails, assume employee doesn't exist (show in active section)
          console.warn(`Failed to check employee existence for application ${app._id}:`, error);
          employeeExistsData[app._id] = {
            employeeExists: false,
            employee: null,
            message: 'Unable to verify employee status',
          };
          activeApplications.push(app);
        }
      }
      
      setEmployeeExistsMap(employeeExistsData);
      setApplicationsWithOffers(activeApplications);
      setApplicationsCompleted(completedApplications);
      
      // Load actual offers for both active and completed applications
      // Note: Some applications may have status "offer" but no offer created yet (valid state)
      const offerMapData: Record<string, Offer> = {};
      const allApplicationsWithOffers = [...activeApplications, ...completedApplications];
      for (const app of allApplicationsWithOffers) {
        try {
          const offer = await recruitmentApi.getOfferByApplicationId(app._id);
          if (offer && offer._id) {
            offerMapData[app._id] = offer;
          }
        } catch (error: any) {
          // If offer doesn't exist yet (404), that's expected and okay - it will be created
          // Only log unexpected errors (500, network errors, etc.)
          const statusCode = error?.response?.status;
          if (statusCode === 404) {
            // 404 is expected - application has "offer" status but offer not created yet
            // Silently skip this - it's a valid state
            continue;
          } else if (statusCode && statusCode >= 500) {
            // Server errors - log but don't block
            console.warn(`Server error loading offer for application ${app._id}:`, error?.response?.data || error?.message);
          } else if (!statusCode) {
            // Network errors - log but don't block
            console.warn(`Network error loading offer for application ${app._id}:`, error?.message || 'Network error');
          }
          // For other errors (403, etc.), silently skip - offer might not be accessible
        }
      }
      setOfferMap(offerMapData);
    } catch (error: any) {
      showToast(error.message || "Failed to load data", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = (application: Application) => {
    const candidate = application.candidate || (typeof application.candidateId === 'object' ? application.candidateId : null);
    setSelectedApplication(application);
    setCreateForm({
      applicationId: application._id,
      candidateId: typeof application.candidateId === 'string' ? application.candidateId : application.candidateId?._id || "",
      grossSalary: 0,
      signingBonus: 0,
      benefits: [],
      deadline: "",
      role: getJobDetails(application).title !== "Unknown Position" ? getJobDetails(application).title : "",
      content: "",
    });
    setBenefitInput("");
    setIsCreateModalOpen(true);
  };

  const handleAddBenefit = () => {
    if (benefitInput.trim()) {
      setCreateForm({
        ...createForm,
        benefits: [...(createForm.benefits || []), benefitInput.trim()],
      });
      setBenefitInput("");
    }
  };

  const handleRemoveBenefit = (index: number) => {
    const newBenefits = createForm.benefits?.filter((_, i) => i !== index) || [];
    setCreateForm({ ...createForm, benefits: newBenefits });
  };

  const handleCreateOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApplication) return;

    try {
      setCreating(true);
      const createdOffer = await recruitmentApi.createOffer(createForm);
      // Store the offer in our map using applicationId as key
      if (createdOffer && selectedApplication._id) {
        setOfferMap(prev => ({
          ...prev,
          [selectedApplication._id]: createdOffer
        }));
      }
      showToast("Offer created successfully", "success");
      setIsCreateModalOpen(false);
      setSelectedApplication(null);
      
      // Reload data and ensure offers are properly loaded
      await loadData();
      
      // Double-check: Try to fetch the offer again to ensure it's in the map
      if (createdOffer?._id) {
        try {
          const refreshedOffer = await recruitmentApi.getOfferByApplicationId(selectedApplication._id);
          if (refreshedOffer) {
            setOfferMap(prev => ({
              ...prev,
              [selectedApplication._id]: refreshedOffer
            }));
          }
        } catch (err) {
          // Offer might not be immediately available, that's okay
          console.log("Offer refresh skipped:", err);
        }
      }
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || 
                          error?.response?.data?.error || 
                          error?.message || 
                          "Failed to create offer";
      showToast(errorMessage, "error");
    } finally {
      setCreating(false);
    }
  };

  const handleOpenViewOffer = async (application: Application) => {
    setSelectedApplication(application);
    
    // Check if we have the offer in our map
    let offer = offerMap[application._id];
    
    // If we don't have the offer, try to fetch it from backend
    if (!offer) {
      try {
        offer = await recruitmentApi.getOfferByApplicationId(application._id);
        // Store it in our map for future use
        if (offer) {
          setOfferMap(prev => ({
            ...prev,
            [application._id]: offer
          }));
        }
      } catch (error: any) {
        // If offer not found, that's okay - we'll show a message
        console.log("Offer not found for application:", application._id);
      }
    }
    
    setSelectedOffer(offer || null);
    
    // CHANGED - Load candidate assessments and results
    await loadCandidateAssessments(application);
    
    setIsViewModalOpen(true);
  };

  // CHANGED - Load candidate assessments, interview scores, and feedback
  const loadCandidateAssessments = async (application: Application) => {
    try {
      setLoadingAssessments(true);
      
      // Get ranked applications for this requisition to see ranking and scores
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
      
      // Load interview scores and feedback
      for (const interview of interviews) {
        const interviewId = interview._id;
        try {
          // Get average score
          const avgScore = await recruitmentApi.getInterviewAverageScore(interviewId);
          scores[interviewId] = avgScore;
          
          // Get feedback
          const interviewFeedback = await recruitmentApi.getInterviewFeedback(interviewId);
          feedback[interviewId] = Array.isArray(interviewFeedback) ? interviewFeedback : [];
        } catch (error) {
          console.log(`Could not load data for interview ${interviewId}:`, error);
        }
      }
      
      setCandidateAssessments({
        interviewScores: scores,
        interviewFeedback: feedback,
        rankedData: rankedData,
      });
    } catch (error: any) {
      console.error("Error loading candidate assessments:", error);
    } finally {
      setLoadingAssessments(false);
    }
  };

  const handleOpenFinalize = async (application: Application) => {
    setSelectedApplication(application);
    
    // Check if we have the offer in our map
    let offer = offerMap[application._id];
    
    // If we don't have the offer in our map, try to fetch it from backend
    if (!offer) {
      try {
        offer = await recruitmentApi.getOfferByApplicationId(application._id);
        // Store it in our map for future use
        if (offer) {
          setOfferMap(prev => ({
            ...prev,
            [application._id]: offer
          }));
        }
      } catch (error: any) {
        console.error('Error fetching offer:', error);
        const statusCode = error?.response?.status;
        const errorMessage = error?.response?.data?.message || 
                            error?.response?.data?.error || 
                            error?.message || 
                            "Could not load offer details";
        
        // Enhanced debugging
        console.error('Offer fetch failed for application:', {
          applicationId: application._id,
          statusCode,
          errorMessage,
          fullError: error
        });
        
        if (statusCode === 404) {
          showToast(
            `No offer found for this application (ID: ${application._id}). ` +
            `The offer may exist in the database but with a different applicationId. ` +
            `Please check the database or create a new offer.`,
            "error"
          );
          return;
        } else {
          // For any other error, show error and don't open modal
          showToast(
            `Could not load offer: ${errorMessage}. Please refresh the page and try again.`,
            "error"
          );
          return;
        }
      }
    }
    
    // If we still don't have the offer after trying to fetch, don't open modal
    if (!offer || !offer._id) {
      showToast(
        "Offer not found. Please refresh the page or create a new offer.",
        "error"
      );
      return;
    }
    
    // If we have offer details, validate before showing modal
    // Check if candidate has responded
    if (offer.applicantResponse === OfferResponseStatus.PENDING) {
      showToast("Cannot finalize offer: Candidate has not responded yet. Please wait for candidate response.", "error");
      return;
    }
    
    // Check if already finalized
    if (offer.finalStatus && offer.finalStatus !== OfferFinalStatus.PENDING) {
      showToast(`Offer has already been finalized with status: ${offer.finalStatus}`, "info");
      return;
    }
    
    setSelectedOffer(offer);
    
    // CHANGED - Load candidate assessments for decision making
    await loadCandidateAssessments(application);
    setFinalizeForm({ finalStatus: offer.finalStatus || OfferFinalStatus.APPROVED });
    setIsFinalizeModalOpen(true);
  };

  const handleFinalizeOffer = async () => {
    if (!selectedApplication) {
      showToast("Application not selected. Please try again.", "error");
      return;
    }
    
    // Try to get offer from map first
    let offer = selectedOffer || offerMap[selectedApplication._id];
    
    // If we don't have the offer, try to fetch it one more time
    if (!offer || !offer._id) {
      try {
        offer = await recruitmentApi.getOfferByApplicationId(selectedApplication._id);
        if (offer && offer._id) {
          setOfferMap(prev => ({
            ...prev,
            [selectedApplication._id]: offer
          }));
          setSelectedOffer(offer);
        } else {
          throw new Error("Offer data incomplete");
        }
      } catch (error: any) {
        const statusCode = error?.response?.status;
        if (statusCode === 404) {
          showToast(
            "No offer found for this application. The offer may not have been created properly. " +
            "Please refresh the page and check if the offer exists, or create a new offer.",
            "error"
          );
        } else {
          showToast(
            `Could not find offer: ${error?.response?.data?.message || error?.message || "Unknown error"}. ` +
            "Please refresh the page and try again.",
            "error"
          );
        }
        setIsFinalizeModalOpen(false);
        return;
      }
    }
    
    // Final check - if we still don't have the offer ID, we can't proceed
    if (!offer || !offer._id) {
      showToast(
        "Offer ID not found. Please refresh the page. If the problem persists, the offer may need to be recreated.",
        "error"
      );
      setIsFinalizeModalOpen(false);
      return;
    }
    
    // Validate candidate has responded
    if (offer.applicantResponse === OfferResponseStatus.PENDING) {
      showToast("Cannot finalize offer: Candidate has not responded yet.", "error");
      return;
    }
    
    try {
      setFinalizing(true);
      const updatedOffer = await recruitmentApi.finalizeOffer(offer._id, finalizeForm);
      // Update offer in map
      if (updatedOffer) {
        setOfferMap(prev => ({
          ...prev,
          [selectedApplication._id]: updatedOffer
        }));
      }
      
      const statusMessage = finalizeForm.finalStatus === OfferFinalStatus.APPROVED 
        ? "Offer approved successfully" 
        : finalizeForm.finalStatus === OfferFinalStatus.REJECTED
        ? "Offer rejected"
        : "Offer status updated";
      
      showToast(statusMessage, "success");
      setIsFinalizeModalOpen(false);
      setSelectedApplication(null);
      setSelectedOffer(null);
      await loadData();
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || 
                          error?.response?.data?.error || 
                          error?.message || 
                          "Failed to finalize offer";
      showToast(errorMessage, "error");
    } finally {
      setFinalizing(false);
    }
  };


  // ONB-002: Load contract status for an offer
  const loadContractStatus = async (offerId: string) => {
    if (!offerId || loadingContractStatus[offerId]) return;
    
    try {
      setLoadingContractStatus(prev => ({ ...prev, [offerId]: true }));
      const status = await recruitmentApi.getContractStatus(offerId);
      setContractStatusMap(prev => ({ ...prev, [offerId]: status }));
    } catch (error: any) {
      console.error("Failed to load contract status:", error);
      showToast("Failed to load contract status", "error");
    } finally {
      setLoadingContractStatus(prev => ({ ...prev, [offerId]: false }));
    }
  };

  // ONB-002: View/Download signed contract document
  const handleViewContract = async (offerId: string) => {
    try {
      setViewingContract(offerId);
      
      // First, get contract status to get documentId
      const status = contractStatusMap[offerId] || await recruitmentApi.getContractStatus(offerId);
      
      if (!status.hasSignedDocument || !status.contract?.documentId) {
        showToast("No signed contract document available", "error");
        return;
      }
      
      const documentId = status.contract.documentId;
      const blob = await recruitmentApi.downloadDocument(documentId);
      
      // Create object URL and open in new tab
      const url = window.URL.createObjectURL(blob);
      const newWindow = window.open(url, '_blank');
      
      if (!newWindow) {
        window.URL.revokeObjectURL(url);
        showToast("Popup blocked. Please allow popups to view the contract.", "error");
        return;
      }
      
      // Clean up object URL after a delay
      setTimeout(() => window.URL.revokeObjectURL(url), 1000);
      showToast("Opening contract document...", "success");
    } catch (error: any) {
      console.error("Failed to view contract:", error);
      showToast(error.message || "Failed to view contract document", "error");
    } finally {
      setViewingContract(null);
    }
  };

  const handleOpenCreateEmployee = async (application: Application, offer: Offer) => {
    setSelectedApplication(application);
    setSelectedOffer(offer);
    
    // ONB-002: Load contract status when opening create employee modal
    if (offer._id) {
      await loadContractStatus(offer._id);
    }
    
    // Set default start date to 2 weeks from now
    const defaultStartDate = new Date();
    defaultStartDate.setDate(defaultStartDate.getDate() + 14);
    
    setEmployeeForm({
      startDate: defaultStartDate.toISOString().split('T')[0],
      workEmail: "",
      employeeNumber: "",
      // CHANGED - Initialize new fields for employee-profile integration
      contractType: undefined,
      workType: undefined,
      primaryDepartmentId: undefined,
      supervisorPositionId: undefined,
    });
    
    setIsCreateEmployeeModalOpen(true);
  };

  const handleCreateEmployee = async () => {
    if (!selectedOffer || !selectedApplication) return;
    
    if (!employeeForm.startDate) {
      showToast("Start date is required", "error");
      return;
    }

    try {
      setCreatingEmployee(true);
      const result = await recruitmentApi.createEmployeeFromContract(
        selectedOffer._id,
        employeeForm
      );
      
      const employeeId = result?.employee?._id || result?.employee?.id;
      
      showToast(
        `Employee created successfully! Onboarding tasks have been automatically created. ${employeeId ? 'You can view onboarding in HR Onboarding page.' : ''}`,
        "success"
      );
      setIsCreateEmployeeModalOpen(false);
      setSelectedApplication(null);
      setSelectedOffer(null);
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

  const getCandidateName = (application: Application) => {
    const candidate = application.candidate || (typeof application.candidateId === 'object' ? application.candidateId : null);
    return candidate?.fullName || 
           (candidate?.firstName && candidate?.lastName 
             ? `${candidate.firstName} ${candidate.lastName}`.trim()
             : typeof application.candidateId === 'string' 
               ? application.candidateId 
               : 'Unknown Candidate');
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
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Offer Management</h1>
            <p className="text-gray-600 mt-1">Create and manage job offers and approvals</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab("manage")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "manage"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Active Offers ({applicationsWithOffers.length})
            </button>
            <button
              onClick={() => setActiveTab("create")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "create"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Create New Offer ({applicationsForOffer.length})
            </button>
            <button
              onClick={() => setActiveTab("completed")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "completed"
                  ? "border-green-500 text-green-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Completed Hires ({applicationsCompleted.length})
            </button>
          </nav>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading offers...</p>
          </div>
        ) : (
          <>
            {/* Active Offers Tab */}
            {activeTab === "manage" && (
              <div className="space-y-4">
                {applicationsWithOffers.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <p className="text-gray-500">No active offers found.</p>
                    </CardContent>
                  </Card>
                ) : (
                  applicationsWithOffers.map((application) => (
                    <Card key={application._id} className="hover:shadow-md transition-shadow">
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                              <h3 className="text-lg font-semibold text-gray-900">
                                {getJobDetails(application).title}
                              </h3>
                              <StatusBadge status={application.status} type="application" />
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                              <div>
                                <p className="text-xs font-medium text-gray-500 uppercase mb-1">Candidate</p>
                                <p className="text-sm text-gray-900 font-medium">{getCandidateName(application)}</p>
                                <p className="text-xs text-gray-600">
                                  {getJobDetails(application).department}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs font-medium text-gray-500 uppercase mb-1">Application Details</p>
                                <p className="text-xs text-gray-600">
                                  Applied: {application.createdAt 
                                    ? new Date(application.createdAt).toLocaleDateString()
                                    : "N/A"}
                                </p>
                                <p className="text-xs text-gray-600">
                                  Status: {application.status.replace("_", " ").toUpperCase()}
                                </p>
                              </div>
                            </div>
                            
                            {/* Offer Status Display */}
                            {(() => {
                              const offer = offerMap[application._id];
                              if (offer) {
                                return (
                                  <div className="mt-3 pt-3 border-t">
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                      <div>
                                        <p className="text-xs text-gray-500 mb-1">Candidate Response</p>
                                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                                          offer.applicantResponse === 'accepted' 
                                            ? 'bg-green-100 text-green-800'
                                            : offer.applicantResponse === 'rejected'
                                            ? 'bg-red-100 text-red-800'
                                            : 'bg-yellow-100 text-yellow-800'
                                        }`}>
                                          {offer.applicantResponse?.toUpperCase() || "PENDING"}
                                        </span>
                                      </div>
                                      <div>
                                        <p className="text-xs text-gray-500 mb-1">Final Status</p>
                                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                                          offer.finalStatus === 'approved' 
                                            ? 'bg-green-100 text-green-800'
                                            : offer.finalStatus === 'rejected'
                                            ? 'bg-red-100 text-red-800'
                                            : 'bg-gray-100 text-gray-800'
                                        }`}>
                                          {offer.finalStatus?.toUpperCase() || "PENDING"}
                                        </span>
                                      </div>
                                    </div>
                                    {offer.applicantResponse === OfferResponseStatus.PENDING && (
                                      <p className="text-xs text-yellow-600 mt-2">
                                        ⏳ Waiting for candidate response
                                      </p>
                                    )}
                                  </div>
                                );
                              }
                              return null;
                            })()}
                          </div>
                          <div className="flex gap-2 ml-4">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenViewOffer(application)}
                            >
                              View Details
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenFinalize(application)}
                            >
                              {(() => {
                                const offer = offerMap[application._id];
                                if (offer?.finalStatus === OfferFinalStatus.APPROVED) {
                                  return "Approved";
                                }
                                if (offer?.finalStatus === OfferFinalStatus.REJECTED) {
                                  return "Rejected";
                                }
                                return "Approve/Reject";
                              })()}
                            </Button>
                            {(() => {
                              const offer = offerMap[application._id];
                              // REC-029: Show "Trigger Pre-boarding" button if offer is ACCEPTED (before employee creation)
                              if (
                                offer?.applicantResponse === OfferResponseStatus.ACCEPTED &&
                                offer?.finalStatus !== OfferFinalStatus.APPROVED
                              ) {
                                return (
                                  <Link href={`/dashboard/recruitment/preboarding?applicationId=${application._id}`}>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="border-blue-500 text-blue-600 hover:bg-blue-50"
                                    >
                                      Trigger Pre-boarding (REC-029)
                                    </Button>
                                  </Link>
                                );
                              }
                              // Show "Create Employee" button if offer is ACCEPTED + APPROVED AND employee doesn't exist
                              const employeeStatus = employeeExistsMap[application._id];
                              if (
                                offer?.applicantResponse === OfferResponseStatus.ACCEPTED &&
                                offer?.finalStatus === OfferFinalStatus.APPROVED &&
                                !employeeStatus?.employeeExists
                              ) {
                                return (
                                  <div className="flex gap-2">
                                    {/* ONB-002: View Contract button */}
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={async () => {
                                        if (offer._id) {
                                          // Load contract status if not already loaded
                                          if (!contractStatusMap[offer._id]) {
                                            await loadContractStatus(offer._id);
                                          }
                                          await handleViewContract(offer._id);
                                        }
                                      }}
                                      disabled={viewingContract === offer._id || loadingContractStatus[offer._id || ""]}
                                      className="border-blue-500 text-blue-600 hover:bg-blue-50"
                                    >
                                      {viewingContract === offer._id 
                                        ? "Opening..." 
                                        : loadingContractStatus[offer._id || ""]
                                        ? "Loading..."
                                        : "📄 View Contract"}
                                    </Button>
                                    <Button
                                      size="sm"
                                      onClick={() => handleOpenCreateEmployee(application, offer)}
                                      className="bg-green-600 hover:bg-green-700"
                                    >
                                      Create Employee
                                    </Button>
                                  </div>
                                );
                              }
                              // If employee exists, show badge instead
                              if (employeeStatus?.employeeExists && employeeStatus.employee) {
                                return (
                                  <div className="flex items-center gap-2">
                                    <span className="px-3 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                                      ✅ Employee Created
                                    </span>
                                    <span className="text-xs text-gray-600">
                                      {employeeStatus.employee.employeeNumber}
                                    </span>
                                  </div>
                                );
                              }
                              return null;
                            })()}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            )}

            {/* Completed Hires Tab */}
            {activeTab === "completed" && (
              <div className="space-y-4">
                {applicationsCompleted.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <p className="text-gray-500">No completed hires found.</p>
                    </CardContent>
                  </Card>
                ) : (
                  applicationsCompleted.map((application) => {
                    const offer = offerMap[application._id];
                    const employeeStatus = employeeExistsMap[application._id];
                    return (
                      <Card key={application._id} className="hover:shadow-md transition-shadow border-green-200 bg-green-50/30">
                        <CardContent className="pt-6">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-3">
                                <h3 className="text-lg font-semibold text-gray-900">
                                  {getJobDetails(application).title}
                                </h3>
                                <StatusBadge status={application.status} type="application" />
                                <span className="px-3 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                                  ✅ Employee Created
                                </span>
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <div>
                                  <p className="text-xs font-medium text-gray-500 uppercase mb-1">Candidate</p>
                                  <p className="text-sm text-gray-900 font-medium">{getCandidateName(application)}</p>
                                  <p className="text-xs text-gray-600">
                                    {getJobDetails(application).department}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs font-medium text-gray-500 uppercase mb-1">Employee Details</p>
                                  {employeeStatus?.employee ? (
                                    <>
                                      <p className="text-sm text-gray-900 font-medium">
                                        {employeeStatus.employee.fullName}
                                      </p>
                                      <p className="text-xs text-gray-600">
                                        Employee #: {employeeStatus.employee.employeeNumber}
                                      </p>
                                      <p className="text-xs text-gray-600">
                                        Status: {employeeStatus.employee.status}
                                      </p>
                                    </>
                                  ) : (
                                    <p className="text-xs text-gray-500">Employee information not available</p>
                                  )}
                                </div>
                              </div>
                              
                              {offer && (
                                <div className="mt-3 pt-3 border-t">
                                  <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                      <p className="text-xs text-gray-500 mb-1">Candidate Response</p>
                                      <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                                        {offer.applicantResponse?.toUpperCase() || "ACCEPTED"}
                                      </span>
                                    </div>
                                    <div>
                                      <p className="text-xs text-gray-500 mb-1">Final Status</p>
                                      <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                                        {offer.finalStatus?.toUpperCase() || "APPROVED"}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                            <div className="flex gap-2 ml-4">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenViewOffer(application)}
                              >
                                View Details
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            )}

            {/* Create New Offer Tab */}
            {activeTab === "create" && (
              <div className="space-y-4">
                {applicationsForOffer.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <p className="text-gray-500">No applications ready for offers.</p>
                    </CardContent>
                  </Card>
                ) : (
                  applicationsForOffer.map((application) => (
                    <Card key={application._id} className="hover:shadow-md transition-shadow">
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                              <h3 className="text-lg font-semibold text-gray-900">
                                {getJobDetails(application).title}
                              </h3>
                              <StatusBadge status={application.status} type="application" />
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                              <div>
                                <p className="text-xs font-medium text-gray-500 uppercase mb-1">Candidate</p>
                                <p className="text-sm text-gray-900 font-medium">{getCandidateName(application)}</p>
                                <p className="text-xs text-gray-600">
                                  {getJobDetails(application).department}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs font-medium text-gray-500 uppercase mb-1">Application Details</p>
                                <p className="text-xs text-gray-600">
                                  Applied: {application.createdAt 
                                    ? new Date(application.createdAt).toLocaleDateString()
                                    : "N/A"}
                                </p>
                                <p className="text-xs text-gray-600">
                                  Location: {getJobDetails(application).location}
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2 ml-4">
                            <Button
                              size="sm"
                              onClick={() => handleOpenCreate(application)}
                            >
                              Create Offer
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            )}
          </>
        )}

        {/* Create Offer Modal */}
        <Modal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          title="Create Job Offer"
        >
          {selectedApplication && (
            <form onSubmit={handleCreateOffer}>
              <div className="space-y-4">
                <div className="p-3 bg-gray-50 rounded-md mb-4">
                  <p className="text-xs text-gray-500 mb-1">Candidate</p>
                  <p className="text-sm font-medium">{getCandidateName(selectedApplication)}</p>
                  <p className="text-xs text-gray-600">
                    {getJobDetails(selectedApplication).title}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role/Position *
                  </label>
                  <Input
                    value={createForm.role || ""}
                    onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
                    placeholder="e.g., Software Engineer"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Gross Salary * ($)
                  </label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={createForm.grossSalary || ""}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, grossSalary: parseFloat(e.target.value) || 0 })
                    }
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Signing Bonus ($)
                  </label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={createForm.signingBonus || 0}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, signingBonus: parseFloat(e.target.value) || 0 })
                    }
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Benefits
                  </label>
                  <div className="flex gap-2 mb-2">
                    <Input
                      value={benefitInput}
                      onChange={(e) => setBenefitInput(e.target.value)}
                      placeholder="e.g., Health Insurance"
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddBenefit();
                        }
                      }}
                    />
                    <Button type="button" onClick={handleAddBenefit} variant="outline">
                      Add
                    </Button>
                  </div>
                  {createForm.benefits && createForm.benefits.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {createForm.benefits.map((benefit, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs"
                        >
                          {benefit}
                          <button
                            type="button"
                            onClick={() => handleRemoveBenefit(index)}
                            className="hover:text-blue-600"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Offer Content/Description
                  </label>
                  <Textarea
                    value={createForm.content || ""}
                    onChange={(e) => setCreateForm({ ...createForm, content: e.target.value })}
                    placeholder="Additional offer details, conditions, etc."
                    rows={4}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Response Deadline * 
                  </label>
                  <Input
                    type="datetime-local"
                    value={createForm.deadline ? new Date(createForm.deadline).toISOString().slice(0, 16) : ""}
                    onChange={(e) => {
                      const localDate = e.target.value;
                      if (localDate) {
                        const date = new Date(localDate);
                        setCreateForm({ ...createForm, deadline: date.toISOString() });
                      } else {
                        setCreateForm({ ...createForm, deadline: "" });
                      }
                    }}
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateModalOpen(false)}
                  disabled={creating}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={creating}>
                  {creating ? "Creating..." : "Create Offer"}
                </Button>
              </div>
            </form>
          )}
        </Modal>

        {/* View Offer Details Modal */}
        <Modal
          isOpen={isViewModalOpen}
          onClose={() => {
            setIsViewModalOpen(false);
            setCandidateAssessments({ interviewScores: {}, interviewFeedback: {} });
          }}
          title="Offer Details & Candidate Assessment"
          size="xl"
        >
          {selectedApplication && (
            <div className="space-y-4">
              <div className="p-3 bg-gray-50 rounded-md">
                <p className="text-xs text-gray-500 mb-1">Candidate</p>
                <p className="text-sm font-medium">{getCandidateName(selectedApplication)}</p>
                <p className="text-xs text-gray-600">
                  {getJobDetails(selectedApplication).title}
                </p>
              </div>

              {/* CHANGED - Candidate Assessment Section */}
              {loadingAssessments ? (
                <div className="text-center py-4">
                  <p className="text-sm text-gray-500">Loading candidate assessments...</p>
                </div>
              ) : (
                <div className="space-y-4 border-t pt-4">
                  <h3 className="text-lg font-semibold text-gray-900">Candidate Assessment & Results</h3>
                  
                  {/* Ranking Information */}
                  {candidateAssessments.rankedData && (
                    <div className="p-3 bg-blue-50 rounded-md border border-blue-200">
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500 mb-1">Average Interview Score</p>
                          <p className="font-semibold text-lg text-blue-700">
                            {candidateAssessments.rankedData.averageScore?.toFixed(1) || "N/A"}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500 mb-1">Ranking Score</p>
                          <p className="font-semibold text-lg text-blue-700">
                            {candidateAssessments.rankedData.rankingScore?.toFixed(1) || "N/A"}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500 mb-1">Referral Status</p>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            candidateAssessments.rankedData.isReferral
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {candidateAssessments.rankedData.isReferral ? "✓ Referred" : "Not Referred"}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Interview Scores and Feedback */}
                  {selectedApplication && (selectedApplication as any).interviews && (selectedApplication as any).interviews.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-md font-semibold text-gray-800">Interview Results</h4>
                      {(selectedApplication as any).interviews.map((interview: any) => {
                        const interviewId = interview._id;
                        const avgScore = candidateAssessments.interviewScores[interviewId];
                        const feedbacks = candidateAssessments.interviewFeedback[interviewId] || [];
                        
                        return (
                          <div key={interviewId} className="p-3 bg-gray-50 rounded-md border">
                            <div className="flex items-center justify-between mb-2">
                              <div>
                                <p className="text-sm font-medium text-gray-900">
                                  {interview.stage === 'screening' ? 'Screening Interview' :
                                   interview.stage === 'department_interview' ? 'Department Interview' :
                                   interview.stage === 'hr_interview' ? 'HR Interview' :
                                   interview.stage || 'Interview'}
                                </p>
                                {interview.scheduledDate && (
                                  <p className="text-xs text-gray-500">
                                    {new Date(interview.scheduledDate).toLocaleDateString()}
                                  </p>
                                )}
                              </div>
                              {avgScore !== undefined && (
                                <div className="text-right">
                                  <p className="text-xs text-gray-500">Average Score</p>
                                  <p className="text-lg font-bold text-blue-600">{avgScore.toFixed(1)}</p>
                                </div>
                              )}
                            </div>
                            
                            {/* Interview Feedback */}
                            {feedbacks.length > 0 && (
                              <div className="mt-2 space-y-2">
                                <p className="text-xs font-semibold text-gray-600">Interview Feedback:</p>
                                {feedbacks.map((fb: any, idx: number) => (
                                  <div key={idx} className="p-2 bg-white rounded border-l-2 border-blue-300">
                                    <div className="flex items-center justify-between mb-1">
                                      <p className="text-xs font-medium text-gray-700">
                                        {fb.interviewerId?.fullName || fb.interviewerId || 'Interviewer'}
                                      </p>
                                      <span className="text-xs font-semibold text-blue-600">
                                        Score: {fb.score || 'N/A'}
                                      </span>
                                    </div>
                                    {fb.comments && (
                                      <p className="text-xs text-gray-600 mt-1">{fb.comments}</p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                            
                            {feedbacks.length === 0 && avgScore === undefined && (
                              <p className="text-xs text-gray-500 italic">No feedback available yet</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {(!selectedApplication || !(selectedApplication as any).interviews || (selectedApplication as any).interviews.length === 0) && (
                    <div className="p-3 bg-yellow-50 rounded-md border border-yellow-200">
                      <p className="text-sm text-yellow-800">
                        No interview data available for this candidate.
                      </p>
                    </div>
                  )}
                </div>
              )}
              
              {/* Offer Details Section */}
              <div className="border-t pt-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Offer Details</h3>
                {selectedOffer ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500 mb-1">Gross Salary</p>
                        <p className="font-medium">${selectedOffer.grossSalary?.toLocaleString() || "N/A"}</p>
                      </div>
                      {selectedOffer.signingBonus && (
                        <div>
                          <p className="text-gray-500 mb-1">Signing Bonus</p>
                          <p className="font-medium">${selectedOffer.signingBonus.toLocaleString()}</p>
                        </div>
                      )}
                    </div>
                    
                    {selectedOffer.role && (
                      <div>
                        <p className="text-gray-500 mb-1 text-sm">Role</p>
                        <p className="font-medium">{selectedOffer.role}</p>
                      </div>
                    )}
                    
                    {selectedOffer.benefits && selectedOffer.benefits.length > 0 && (
                      <div>
                        <p className="text-gray-500 mb-1 text-sm">Benefits</p>
                        <div className="flex flex-wrap gap-2">
                          {selectedOffer.benefits.map((benefit, index) => (
                            <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                              {benefit}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {selectedOffer.deadline && (
                      <div>
                        <p className="text-gray-500 mb-1 text-sm">Response Deadline</p>
                        <p className="font-medium">
                          {new Date(selectedOffer.deadline).toLocaleString()}
                        </p>
                      </div>
                    )}
                    
                    <div className="grid grid-cols-2 gap-4 text-sm pt-3 border-t">
                      <div>
                        <p className="text-gray-500 mb-1">Candidate Response</p>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          selectedOffer.applicantResponse === 'accepted' 
                            ? 'bg-green-100 text-green-800'
                            : selectedOffer.applicantResponse === 'rejected'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {selectedOffer.applicantResponse?.toUpperCase() || "PENDING"}
                        </span>
                      </div>
                      <div>
                        <p className="text-gray-500 mb-1">Final Status</p>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          selectedOffer.finalStatus === 'approved' 
                            ? 'bg-green-100 text-green-800'
                            : selectedOffer.finalStatus === 'rejected'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {selectedOffer.finalStatus?.toUpperCase() || "PENDING"}
                        </span>
                      </div>
                    </div>

                    {/* CHANGED - Signature Status */}
                    {(selectedOffer.candidateSignedAt || selectedOffer.hrSignedAt || selectedOffer.managerSignedAt) && (
                      <div className="pt-3 border-t">
                        <p className="text-xs font-semibold text-gray-500 mb-2">Electronic Signature Status:</p>
                        <div className="flex flex-wrap gap-2">
                          {selectedOffer.candidateSignedAt && (
                            <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                              ✓ Candidate Signed: {new Date(selectedOffer.candidateSignedAt).toLocaleDateString()}
                            </span>
                          )}
                          {selectedOffer.hrSignedAt && (
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                              ✓ HR Signed: {new Date(selectedOffer.hrSignedAt).toLocaleDateString()}
                            </span>
                          )}
                          {selectedOffer.managerSignedAt && (
                            <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs">
                              ✓ Manager Signed: {new Date(selectedOffer.managerSignedAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {selectedOffer.content && (
                      <div>
                        <p className="text-gray-500 mb-1 text-sm">Offer Details</p>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedOffer.content}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-600">
                    Offer details not available. The offer may not have been created yet.
                  </p>
                )}
              </div>
            </div>
          )}
        </Modal>

        {/* Finalize/Approve Offer Modal */}
        <Modal
          isOpen={isFinalizeModalOpen}
          onClose={() => {
            setIsFinalizeModalOpen(false);
            setSelectedOffer(null);
            setCandidateAssessments({ interviewScores: {}, interviewFeedback: {} });
          }}
          title="Approve/Reject Offer"
          size="xl"
        >
          {selectedApplication && (
            <div className="space-y-4">
              <div className="p-3 bg-gray-50 rounded-md mb-4">
                <p className="text-xs text-gray-500 mb-1">Candidate</p>
                <p className="text-sm font-medium">{getCandidateName(selectedApplication)}</p>
                <p className="text-xs text-gray-600">
                  {getJobDetails(selectedApplication).title}
                </p>
              </div>

              {/* CHANGED - Candidate Assessment Section for Decision Making */}
              {loadingAssessments ? (
                <div className="text-center py-4">
                  <p className="text-sm text-gray-500">Loading candidate assessments...</p>
                </div>
              ) : (
                <div className="space-y-3 border-b pb-4 mb-4">
                  <h3 className="text-md font-semibold text-gray-900">Candidate Assessment Summary</h3>
                  
                  {/* Ranking Information */}
                  {candidateAssessments.rankedData && (
                    <div className="p-3 bg-blue-50 rounded-md border border-blue-200">
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500 mb-1">Average Interview Score</p>
                          <p className="font-semibold text-lg text-blue-700">
                            {candidateAssessments.rankedData.averageScore?.toFixed(1) || "N/A"}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500 mb-1">Ranking Score</p>
                          <p className="font-semibold text-lg text-blue-700">
                            {candidateAssessments.rankedData.rankingScore?.toFixed(1) || "N/A"}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500 mb-1">Referral Status</p>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            candidateAssessments.rankedData.isReferral
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {candidateAssessments.rankedData.isReferral ? "✓ Referred" : "Not Referred"}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Quick Interview Scores Summary */}
                  {selectedApplication && (selectedApplication as any).interviews && (selectedApplication as any).interviews.length > 0 && (
                    <div className="p-3 bg-gray-50 rounded-md">
                      <p className="text-xs font-semibold text-gray-600 mb-2">Interview Scores:</p>
                      <div className="flex flex-wrap gap-2">
                        {(selectedApplication as any).interviews.map((interview: any) => {
                          const interviewId = interview._id;
                          const avgScore = candidateAssessments.interviewScores[interviewId];
                          return (
                            <div key={interviewId} className="px-2 py-1 bg-white rounded border text-xs">
                              <span className="font-medium">
                                {interview.stage === 'screening' ? 'Screening' :
                                 interview.stage === 'department_interview' ? 'Dept' :
                                 interview.stage === 'hr_interview' ? 'HR' :
                                 'Interview'}: 
                              </span>
                              <span className="ml-1 font-semibold text-blue-600">
                                {avgScore !== undefined ? avgScore.toFixed(1) : 'N/A'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {/* Show Offer Details */}
              {selectedOffer ? (
                <div className="p-3 bg-blue-50 rounded-md mb-4">
                  <p className="text-xs font-medium text-gray-700 mb-2">Offer Details</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-600">Gross Salary:</span>
                      <span className="ml-2 font-medium">${selectedOffer.grossSalary?.toLocaleString() || "N/A"}</span>
                    </div>
                    {selectedOffer.signingBonus && (
                      <div>
                        <span className="text-gray-600">Signing Bonus:</span>
                        <span className="ml-2 font-medium">${selectedOffer.signingBonus.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                  <div className="mt-2">
                    <span className="text-gray-600 text-sm">Candidate Response: </span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      selectedOffer.applicantResponse === 'accepted' 
                        ? 'bg-green-100 text-green-800'
                        : selectedOffer.applicantResponse === 'rejected'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {selectedOffer.applicantResponse?.toUpperCase() || "PENDING"}
                    </span>
                  </div>
                  {selectedOffer.applicantResponse === OfferResponseStatus.PENDING && (
                    <p className="text-xs text-yellow-600 mt-2">
                      ⚠️ Cannot finalize until candidate responds
                    </p>
                  )}
                </div>
              ) : (
                <div className="p-3 bg-yellow-50 rounded-md mb-4">
                  <p className="text-xs text-yellow-800">
                    ⚠️ Offer details not loaded. If this offer was created in a previous session, 
                    you may need to refresh the page or the offer ID may not be available.
                  </p>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Final Decision *
                </label>
                <Select
                  value={finalizeForm.finalStatus}
                  onChange={(e) =>
                    setFinalizeForm({ ...finalizeForm, finalStatus: e.target.value as OfferFinalStatus })
                  }
                  options={[
                    { value: OfferFinalStatus.APPROVED, label: "✓ Approve Offer" },
                    { value: OfferFinalStatus.REJECTED, label: "✗ Reject Offer" },
                  ]}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {selectedOffer && finalizeForm.finalStatus === OfferFinalStatus.APPROVED && selectedOffer.applicantResponse === OfferResponseStatus.ACCEPTED
                    ? "Approving this offer will mark the candidate as HIRED and ready for onboarding."
                    : finalizeForm.finalStatus === OfferFinalStatus.APPROVED
                    ? "Approving this offer will finalize the offer status."
                    : "Rejecting this offer will close the offer."}
                </p>
              </div>
              
              <div className="flex justify-end gap-2 mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsFinalizeModalOpen(false);
                    setSelectedOffer(null);
                  }}
                  disabled={finalizing}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleFinalizeOffer} 
                  disabled={finalizing || !selectedOffer}
                  className={finalizeForm.finalStatus === OfferFinalStatus.APPROVED ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}
                >
                  {finalizing 
                    ? "Processing..." 
                    : !selectedOffer
                    ? "Offer Not Found"
                    : finalizeForm.finalStatus === OfferFinalStatus.APPROVED
                    ? "Approve Offer"
                    : "Reject Offer"}
                </Button>
              </div>
            </div>
          )}
        </Modal>

        {/* Create Employee from Contract Modal */}
        <Modal
          isOpen={isCreateEmployeeModalOpen}
          onClose={() => {
            setIsCreateEmployeeModalOpen(false);
            setSelectedOffer(null);
            setSelectedApplication(null);
          }}
          title="Create Employee from Contract"
          size="lg"
        >
          {selectedOffer && selectedApplication && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <h3 className="font-semibold text-blue-900 mb-2">📋 Offer Details</h3>
                <div className="text-sm text-blue-800 space-y-1">
                  <p><strong>Candidate:</strong> {getCandidateName(selectedApplication)}</p>
                  <p><strong>Position:</strong> {getJobDetails(selectedApplication).title}</p>
                  <p><strong>Department:</strong> {getJobDetails(selectedApplication).department}</p>
                  <p><strong>Salary:</strong> ${selectedOffer.grossSalary?.toLocaleString() || "N/A"}</p>
                </div>
                
                {/* ONB-002: Contract Status Display */}
                {selectedOffer._id && (() => {
                  const contractStatus = contractStatusMap[selectedOffer._id];
                  const isLoading = loadingContractStatus[selectedOffer._id];
                  
                  if (isLoading) {
                    return (
                      <div className="mt-3 pt-3 border-t border-blue-300">
                        <p className="text-xs text-blue-600">Loading contract status...</p>
                      </div>
                    );
                  }
                  
                  if (contractStatus) {
                    if (contractStatus.hasSignedDocument) {
                      return (
                        <div className="mt-3 pt-3 border-t border-blue-300">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-xs font-semibold text-green-700 mb-1">✅ Signed Contract Available</p>
                              <p className="text-xs text-blue-600">{contractStatus.message}</p>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleViewContract(selectedOffer._id)}
                              disabled={viewingContract === selectedOffer._id}
                              className="border-green-500 text-green-600 hover:bg-green-50 text-xs"
                            >
                              {viewingContract === selectedOffer._id ? "Opening..." : "📄 View Contract"}
                            </Button>
                          </div>
                        </div>
                      );
                    } else {
                      return (
                        <div className="mt-3 pt-3 border-t border-blue-300">
                          <p className="text-xs font-semibold text-yellow-700 mb-1">⚠️ Contract Status</p>
                          <p className="text-xs text-blue-600">{contractStatus.message}</p>
                        </div>
                      );
                    }
                  }
                  
                  return (
                    <div className="mt-3 pt-3 border-t border-blue-300">
                      <p className="text-xs text-blue-600">
                        ⚠️ Make sure the candidate has uploaded a signed contract before creating the employee profile.
                      </p>
                    </div>
                  );
                })()}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date * (ONB-018: Payroll initiation date)
                </label>
                <Input
                  type="date"
                  value={employeeForm.startDate}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, startDate: e.target.value })}
                  min={new Date().toISOString().split('T')[0]}
                />
                <p className="text-xs text-gray-500 mt-1">
                  This date will be used for payroll initiation and access provisioning scheduling.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Work Email (Optional)
                </label>
                <Input
                  type="email"
                  value={employeeForm.workEmail || ""}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, workEmail: e.target.value })}
                  placeholder="firstname.lastname@company.com"
                />
                <p className="text-xs text-gray-500 mt-1">
                  If not provided, email will be auto-generated from candidate name.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Employee Number (Optional)
                </label>
                <Input
                  value={employeeForm.employeeNumber || ""}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, employeeNumber: e.target.value })}
                  placeholder="EMP-001"
                />
                <p className="text-xs text-gray-500 mt-1">
                  If not provided, employee number will be auto-generated.
                </p>
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

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
                <h4 className="font-semibold text-yellow-900 mb-2">✨ What happens next?</h4>
                <ul className="text-sm text-yellow-800 space-y-1 list-disc list-inside">
                  <li>Employee profile will be created from candidate data</li>
                  <li>Onboarding checklist will be automatically created (ONB-001)</li>
                  <li>Payroll initiation will be triggered (ONB-018)</li>
                  <li>Signing bonus will be processed (ONB-019)</li>
                  <li>Access provisioning will be scheduled (ONB-013)</li>
                </ul>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsCreateEmployeeModalOpen(false);
                    setSelectedOffer(null);
                    setSelectedApplication(null);
                  }}
                  disabled={creatingEmployee}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateEmployee}
                  disabled={
                    creatingEmployee || 
                    !employeeForm.startDate ||
                    !employeeForm.contractType ||
                    !employeeForm.workType ||
                    !employeeForm.primaryDepartmentId
                  }
                  className="bg-green-600 hover:bg-green-700"
                >
                  {creatingEmployee ? "Creating Employee..." : "Create Employee"}
                </Button>
              </div>
            </div>
          )}
        </Modal>

      </div>
    </ProtectedRoute>
  );
}
