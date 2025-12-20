"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/hooks/use-auth";
import { SystemRole } from "@/types";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { recruitmentApi } from "@/lib/api/recruitment/recruitment";
import {
  Offer,
  Application,
  CreateOfferDto,
  OfferFinalStatus,
  OfferResponseStatus,
} from "@/types/recruitment";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/shared/ui/Card";
import { Button } from "@/components/shared/ui/Button";
import { Input } from "@/components/shared/ui/Input";
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

export default function HREmployeeOffersPage() {
  const { user } = useAuth();
  const { toast, showToast, hideToast } = useToast();
  const [applications, setApplications] = useState<Application[]>([]);
  const [applicationsForOffer, setApplicationsForOffer] = useState<Application[]>([]);
  const [applicationsWithOffers, setApplicationsWithOffers] = useState<Application[]>([]);
  const [offerMap, setOfferMap] = useState<Record<string, Offer>>({});
  const [employeeExistsMap, setEmployeeExistsMap] = useState<Record<string, {
    employeeExists: boolean;
    employee: any | null;
    message: string;
  }>>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"create" | "manage">("manage");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejecting, setRejecting] = useState(false);
  
  // Candidate assessments state
  const [candidateAssessments, setCandidateAssessments] = useState<{
    interviewScores: Record<string, number>;
    interviewFeedback: Record<string, any[]>;
    rankedData?: any;
  }>({
    interviewScores: {},
    interviewFeedback: {},
  });
  const [loadingAssessments, setLoadingAssessments] = useState(false);
  
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
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadData();
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
      const withOffers = apps.filter(
        (app) => app.status === "offer" || app.status === "hired"
      );
      
      setApplicationsForOffer(forOffer);
      
      // Check employee existence for each application with offers
      const employeeExistsData: Record<string, {
        employeeExists: boolean;
        employee: any | null;
        message: string;
      }> = {};
      const activeApplications: Application[] = [];
      
      for (const app of withOffers) {
        try {
          const employeeStatus = await recruitmentApi.checkEmployeeExistsForApplication(app._id);
          employeeExistsData[app._id] = employeeStatus;
          
          // Only show active applications (employee not yet created)
          if (!employeeStatus.employeeExists) {
            activeApplications.push(app);
          }
        } catch (error: any) {
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
      
      // Load actual offers for applications
      const offerMapData: Record<string, Offer> = {};
      for (const app of activeApplications) {
        try {
          const offer = await recruitmentApi.getOfferByApplicationId(app._id);
          if (offer && offer._id) {
            offerMapData[app._id] = offer;
          }
        } catch (error: any) {
          const statusCode = error?.response?.status;
          if (statusCode !== 404) {
            console.warn(`Error loading offer for application ${app._id}:`, error?.message);
          }
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
    // Check if an offer already exists for this application
    if (offerMap[application._id]) {
      showToast("An offer already exists for this candidate. You cannot create another offer.", "error");
      return;
    }
    
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
      if (createdOffer && selectedApplication._id) {
        setOfferMap(prev => ({
          ...prev,
          [selectedApplication._id]: createdOffer
        }));
      }
      showToast("Offer created and sent successfully! The candidate will be notified.", "success");
      setIsCreateModalOpen(false);
      setSelectedApplication(null);
      await loadData();
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
    
    let offer = offerMap[application._id];
    
    if (!offer) {
      try {
        offer = await recruitmentApi.getOfferByApplicationId(application._id);
        if (offer) {
          setOfferMap(prev => ({
            ...prev,
            [application._id]: offer
          }));
        }
      } catch (error: any) {
        console.log("Offer not found for application:", application._id);
      }
    }
    
    setSelectedOffer(offer || null);
    await loadCandidateAssessments(application);
    setIsViewModalOpen(true);
  };

  const loadCandidateAssessments = async (application: Application) => {
    try {
      setLoadingAssessments(true);
      
      let rankedData = null;
      if (application.requisitionId) {
        try {
          const ranked = await recruitmentApi.getRankedApplications(application.requisitionId);
          rankedData = ranked.find((app: any) => app._id === application._id);
        } catch (error) {
          console.log("Could not load ranked applications:", error);
        }
      }
      
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
        rankedData: rankedData,
      });
    } catch (error: any) {
      console.error("Error loading candidate assessments:", error);
    } finally {
      setLoadingAssessments(false);
    }
  };

  // Handle opening reject modal
  const handleOpenReject = async (application: Application) => {
    setSelectedApplication(application);
    
    let offer = offerMap[application._id];
    
    if (!offer) {
      try {
        offer = await recruitmentApi.getOfferByApplicationId(application._id);
        if (offer) {
          setOfferMap(prev => ({
            ...prev,
            [application._id]: offer
          }));
        }
      } catch (error: any) {
        showToast("Could not load offer details. Please try again.", "error");
        return;
      }
    }
    
    if (!offer || !offer._id) {
      showToast("Offer not found. Cannot reject candidate without an offer.", "error");
      return;
    }
    
    // Check if already finalized
    if (offer.finalStatus === OfferFinalStatus.APPROVED) {
      showToast("Cannot reject: Offer has already been approved by HR Manager.", "error");
      return;
    }
    
    // Check if employee already exists
    const employeeStatus = employeeExistsMap[application._id];
    if (employeeStatus?.employeeExists) {
      showToast("Cannot reject: Employee profile has already been created.", "error");
      return;
    }
    
    setSelectedOffer(offer);
    setRejectReason("");
    setIsRejectModalOpen(true);
  };

  // Handle reject candidate
  const handleRejectCandidate = async () => {
    if (!selectedOffer || !selectedApplication) return;
    
    if (!rejectReason.trim()) {
      showToast("Please provide a reason for rejection.", "error");
      return;
    }
    
    try {
      setRejecting(true);
      await recruitmentApi.rejectCandidate(selectedOffer._id, rejectReason);
      showToast("Candidate rejected successfully. They have been notified.", "success");
      setIsRejectModalOpen(false);
      setSelectedApplication(null);
      setSelectedOffer(null);
      setRejectReason("");
      await loadData();
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || 
                          error?.response?.data?.error || 
                          error?.message || 
                          "Failed to reject candidate";
      showToast(errorMessage, "error");
    } finally {
      setRejecting(false);
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

  // Check if candidate can be rejected
  const canRejectCandidate = (application: Application): { canReject: boolean; reason?: string } => {
    const offer = offerMap[application._id];
    
    if (!offer) {
      return { canReject: false, reason: "No offer exists for this candidate" };
    }
    
    if (offer.finalStatus === OfferFinalStatus.APPROVED) {
      return { canReject: false, reason: "Offer already approved by HR Manager" };
    }
    
    if (offer.finalStatus === OfferFinalStatus.REJECTED) {
      return { canReject: false, reason: "Candidate already rejected" };
    }
    
    const employeeStatus = employeeExistsMap[application._id];
    if (employeeStatus?.employeeExists) {
      return { canReject: false, reason: "Employee profile already created" };
    }
    
    if (application.status === "hired") {
      return { canReject: false, reason: "Candidate already hired" };
    }
    
    return { canReject: true };
  };

  return (
    <ProtectedRoute allowedRoles={[SystemRole.HR_EMPLOYEE]}>
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
            <h1 className="text-3xl font-bold text-gray-900">Send Offers (HR Employee)</h1>
            <p className="text-gray-600 mt-1">Create and send job offers to candidates. Only HR Manager can approve offers.</p>
          </div>
        </div>

        {/* Info Banner */}
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-3">
            <span className="text-blue-500 text-xl">ℹ️</span>
            <div>
              <h3 className="font-semibold text-blue-900">Your Permissions</h3>
              <ul className="mt-1 text-sm text-blue-800 space-y-1">
                <li>✅ You can <strong>create and send offers</strong> to candidates</li>
                <li>✅ You can <strong>reject candidates</strong> (before they are finalized)</li>
                <li>❌ Only HR Manager can <strong>approve/finalize</strong> offers</li>
              </ul>
            </div>
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
                  applicationsWithOffers.map((application) => {
                    const offer = offerMap[application._id];
                    const rejectability = canRejectCandidate(application);
                    const jobDetails = getJobDetails(application);
                    
                    return (
                      <Card key={application._id} className="hover:shadow-md transition-shadow">
                        <CardContent className="pt-6">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-3">
                                <h3 className="text-lg font-semibold text-gray-900">
                                  {jobDetails.title}
                                </h3>
                                <StatusBadge status={application.status} type="application" />
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <div>
                                  <p className="text-xs font-medium text-gray-500 uppercase mb-1">Candidate</p>
                                  <p className="text-sm text-gray-900 font-medium">{getCandidateName(application)}</p>
                                  <p className="text-xs text-gray-600">
                                    {jobDetails.department}
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
                                    Location: {jobDetails.location}
                                  </p>
                                </div>
                              </div>
                              
                              {/* Offer Status Display */}
                              {offer && (
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
                                  {offer.finalStatus === OfferFinalStatus.PENDING && 
                                   offer.applicantResponse === OfferResponseStatus.ACCEPTED && (
                                    <p className="text-xs text-blue-600 mt-2">
                                      ⏳ Waiting for HR Manager approval
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                            <div className="flex gap-2 ml-4 flex-wrap">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenViewOffer(application)}
                              >
                                View Details
                              </Button>
                              
                              {/* Reject Button - Only for HR Employee */}
                              {rejectability.canReject ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleOpenReject(application)}
                                  className="border-red-500 text-red-600 hover:bg-red-50"
                                >
                                  Reject Candidate
                                </Button>
                              ) : (
                                <div className="flex items-center">
                                  <span className="text-xs text-gray-500 italic" title={rejectability.reason}>
                                    {offer?.finalStatus === OfferFinalStatus.APPROVED && "✅ Approved"}
                                    {offer?.finalStatus === OfferFinalStatus.REJECTED && "❌ Rejected"}
                                  </span>
                                </div>
                              )}
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
                  applicationsForOffer.map((application) => {
                    const hasExistingOffer = !!offerMap[application._id];
                    
                    return (
                      <Card key={application._id} className={`hover:shadow-md transition-shadow ${hasExistingOffer ? 'opacity-60' : ''}`}>
                        <CardContent className="pt-6">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-3">
                                <h3 className="text-lg font-semibold text-gray-900">
                                  {getJobDetails(application).title}
                                </h3>
                                <StatusBadge status={application.status} type="application" />
                                {hasExistingOffer && (
                                  <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs font-medium">
                                    Offer Already Sent
                                  </span>
                                )}
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
                              {hasExistingOffer ? (
                                <span className="text-xs text-gray-500 italic">
                                  Cannot create duplicate offer
                                </span>
                              ) : (
                                <Button
                                  size="sm"
                                  onClick={() => handleOpenCreate(application)}
                                >
                                  Create Offer
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
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
                  {creating ? "Creating..." : "Create & Send Offer"}
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

              {/* Candidate Assessment Section */}
              {loadingAssessments ? (
                <div className="text-center py-4">
                  <p className="text-sm text-gray-500">Loading candidate assessments...</p>
                </div>
              ) : (
                <div className="space-y-4 border-t pt-4">
                  <h3 className="text-lg font-semibold text-gray-900">Candidate Assessment & Results</h3>
                  
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

        {/* Reject Candidate Modal */}
        <Modal
          isOpen={isRejectModalOpen}
          onClose={() => {
            setIsRejectModalOpen(false);
            setRejectReason("");
          }}
          title="Reject Candidate"
          size="md"
        >
          {selectedApplication && selectedOffer && (
            <div className="space-y-4">
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-800">
                  <strong>⚠️ Warning:</strong> This action cannot be undone. The candidate will be notified of the rejection.
                </p>
              </div>
              
              <div className="p-3 bg-gray-50 rounded-md">
                <p className="text-xs text-gray-500 mb-1">Candidate</p>
                <p className="text-sm font-medium">{getCandidateName(selectedApplication)}</p>
                <p className="text-xs text-gray-600">
                  {getJobDetails(selectedApplication).title}
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason for Rejection *
                </label>
                <Textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Please provide a detailed reason for rejecting this candidate..."
                  rows={4}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  This reason will be recorded and may be included in the notification to the candidate.
                </p>
              </div>
              
              <div className="flex justify-end gap-2 mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsRejectModalOpen(false);
                    setRejectReason("");
                  }}
                  disabled={rejecting}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleRejectCandidate}
                  disabled={rejecting || !rejectReason.trim()}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {rejecting ? "Rejecting..." : "Reject Candidate"}
                </Button>
              </div>
            </div>
          )}
        </Modal>

      </div>
    </ProtectedRoute>
  );
}

