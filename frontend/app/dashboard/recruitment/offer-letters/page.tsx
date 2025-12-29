"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/hooks/use-auth";
import { SystemRole } from "@/types";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { recruitmentApi } from "@/lib/api/recruitment/recruitment";
import {
  Application,
  Offer,
  CreateOfferDto,
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

export default function OfferLettersPage() {
  const { user } = useAuth();
  const { toast, showToast, hideToast } = useToast();
  const [applications, setApplications] = useState<Application[]>([]);
  const [offers, setOffers] = useState<Record<string, Offer>>({});
  const [loading, setLoading] = useState(true);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [activeTab, setActiveTab] = useState<"pending" | "sent" | "accepted">("pending");
  
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

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      // Get all applications
      const allApps = await recruitmentApi.getApplications();
      
      // Filter applications that are:
      // 1. Ready for offers (status "in_process") - these can receive offer letters
      // 2. Have offers (status "offer") - these already have offers sent
      const readyForOffers = allApps.filter(
        (app) => app.status === "in_process" || app.status === "offer"
      );
      setApplications(readyForOffers);

      // Load existing offers for ALL applications (including those with status "offer")
      // This ensures we can see offers even if application status changed
      const offerMap: Record<string, Offer> = {};
      
      // First, try to load offers for applications with status "offer"
      const offerApps = allApps.filter(app => app.status === "offer");
      for (const app of offerApps) {
        try {
          const offer = await recruitmentApi.getOfferByApplicationId(app._id);
          if (offer && offer._id) {
            offerMap[app._id] = offer;
          }
        } catch (error: any) {
          if (error?.response?.status !== 404) {
            console.error(`Error loading offer for application ${app._id}:`, error);
          }
        }
      }
      
      // Also check for offers in "in_process" applications (in case offer was created but status not updated)
      const inProcessApps = allApps.filter(app => app.status === "in_process");
      for (const app of inProcessApps) {
        // Only check if we don't already have the offer
        if (!offerMap[app._id]) {
          try {
            const offer = await recruitmentApi.getOfferByApplicationId(app._id);
            if (offer && offer._id) {
              offerMap[app._id] = offer;
            }
          } catch (error: any) {
            // 404 is expected if offer doesn't exist yet - this is fine
            if (error?.response?.status !== 404) {
              console.error(`Error loading offer for application ${app._id}:`, error);
            }
          }
        }
      }
      
      setOffers(offerMap);
    } catch (error: any) {
      showToast(error.message || "Failed to load data", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = (application: Application) => {
    const candidate = application.candidate || 
                     (typeof application.candidateId === 'object' ? application.candidateId : null);
    setSelectedApplication(application);
    setCreateForm({
      applicationId: application._id,
      candidateId: typeof application.candidateId === 'string' 
        ? application.candidateId 
        : application.candidateId?._id || "",
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
      
      // Validate form
      if (!createForm.grossSalary || createForm.grossSalary <= 0) {
        showToast("Gross salary must be greater than 0", "error");
        return;
      }
      
      if (!createForm.deadline) {
        showToast("Deadline is required", "error");
        return;
      }

      const deadlineDate = new Date(createForm.deadline);
      if (isNaN(deadlineDate.getTime()) || deadlineDate <= new Date()) {
        showToast("Deadline must be a valid future date", "error");
        return;
      }

      const createdOffer = await recruitmentApi.createOffer({
        ...createForm,
        deadline: deadlineDate.toISOString(),
      });
      
      console.log('✅ Offer created:', createdOffer);
      
      // Immediately update the offers map with the new offer
      if (createdOffer && selectedApplication._id) {
        setOffers(prev => ({
          ...prev,
          [selectedApplication._id]: createdOffer
        }));
      }
      
      showToast("Offer letter created and sent successfully", "success");
      setIsCreateModalOpen(false);
      setSelectedApplication(null);
      
      // Reload data to ensure everything is in sync
      await loadData();
      
      // Switch to "sent" tab to show the newly sent offer
      setActiveTab("sent");
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

  const handleViewOffer = async (application: Application) => {
    setSelectedApplication(application);
    
    // Always fetch the latest offer data to ensure we have the most up-to-date response status
    let offer = offers[application._id];
    
    // If we have an offer, refresh it to get latest candidate response
    if (offer) {
      try {
        const refreshedOffer = await recruitmentApi.getOfferByApplicationId(application._id);
        if (refreshedOffer) {
          offer = refreshedOffer;
          // Update the offers map with refreshed data
          setOffers(prev => ({
            ...prev,
            [application._id]: refreshedOffer
          }));
        }
      } catch (error) {
        console.error("Error refreshing offer:", error);
        // Use existing offer if refresh fails
      }
    }
    
    setSelectedOffer(offer || null);
    setIsViewModalOpen(true);
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

  // Filter offers based on active tab
  const getFilteredApplications = () => {
    if (activeTab === "pending") {
      // Applications ready for offers but no offer created yet
      // Only show applications with status "in_process" that don't have an offer yet
      return applications.filter(app => {
        // Must be in_process status (ready for offer) and no offer exists
        return app.status === "in_process" && !offers[app._id];
      });
    } else if (activeTab === "sent") {
      // Offers that have been sent (created) but candidate hasn't responded yet
      // This includes offers where applicantResponse is PENDING
      return applications.filter(app => {
        const offer = offers[app._id];
        // Offer exists and candidate hasn't responded (still pending)
        return offer && offer.applicantResponse === OfferResponseStatus.PENDING;
      });
    } else {
      // Offers that candidates have accepted
      return applications.filter(app => {
        const offer = offers[app._id];
        // Offer exists and candidate has accepted
        return offer && offer.applicantResponse === OfferResponseStatus.ACCEPTED;
      });
    }
  };

  const formatDate = (dateString?: string): string => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
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

  return (
    <ProtectedRoute allowedRoles={[SystemRole.HR_MANAGER, SystemRole.HR_EMPLOYEE, SystemRole.SYSTEM_ADMIN]}>
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
          <h1 className="text-3xl font-bold text-gray-900">Offer Letters</h1>
          <p className="text-gray-600 mt-1">
            Generate, send, and collect electronically signed offer letters
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab("pending")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "pending"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Pending ({applications.filter(app => app.status === "in_process" && !offers[app._id]).length})
            </button>
            <button
              onClick={() => setActiveTab("sent")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "sent"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Sent ({applications.filter(app => {
                const offer = offers[app._id];
                return offer && offer.applicantResponse === OfferResponseStatus.PENDING;
              }).length})
            </button>
            <button
              onClick={() => setActiveTab("accepted")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "accepted"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Accepted ({applications.filter(app => {
                const offer = offers[app._id];
                return offer && offer.applicantResponse === OfferResponseStatus.ACCEPTED;
              }).length})
            </button>
          </nav>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading offers...</p>
          </div>
        ) : getFilteredApplications().length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-500 mb-4">
                {activeTab === "pending" && "No applications ready for offer letters."}
                {activeTab === "sent" && "No offer letters sent yet."}
                {activeTab === "accepted" && "No offers have been accepted yet."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {getFilteredApplications().map((application) => {
              const offer = offers[application._id];
              const candidateName = getCandidateName(application);
              const jobTitle = getJobTitle(application);
              
              return (
                <Card key={application._id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{candidateName}</CardTitle>
                        <CardDescription className="mt-1">{jobTitle}</CardDescription>
                      </div>
                      <StatusBadge status={application.status} />
                    </div>
                  </CardHeader>
                  <CardContent>
                    {offer ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500">Response:</span>
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
                        {offer.candidateSignedAt && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-500">Candidate Signed:</span>
                            <span className="font-medium text-green-600">✓ {formatDate(offer.candidateSignedAt)}</span>
                          </div>
                        )}
                        {offer.hrSignedAt && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-500">HR Signed:</span>
                            <span className="font-medium text-green-600">✓ {formatDate(offer.hrSignedAt)}</span>
                          </div>
                        )}
                        {offer.managerSignedAt && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-500">Manager Signed:</span>
                            <span className="font-medium text-green-600">✓ {formatDate(offer.managerSignedAt)}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No offer letter sent yet</p>
                    )}
                    
                    <div className="flex gap-2 mt-4">
                      {!offer ? (
                        <Button
                          size="sm"
                          onClick={() => handleOpenCreate(application)}
                          className="flex-1"
                        >
                          Send Offer Letter
                        </Button>
                      ) : (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewOffer(application)}
                            className="flex-1"
                          >
                            View Offer Letter
                          </Button>
                          {offer.applicantResponse === OfferResponseStatus.ACCEPTED && (
                            <span className="text-xs text-green-600 font-medium flex items-center px-2">
                              ✓ Accepted
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Create Offer Modal */}
        <Modal
          isOpen={isCreateModalOpen}
          onClose={() => {
            setIsCreateModalOpen(false);
            setSelectedApplication(null);
          }}
          title="Send Offer Letter"
          size="lg"
        >
          <form onSubmit={handleCreateOffer}>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Gross Salary *
                  </label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={createForm.grossSalary || ""}
                    onChange={(e) => setCreateForm({ ...createForm, grossSalary: parseFloat(e.target.value) || 0 })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Signing Bonus
                  </label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={createForm.signingBonus || ""}
                    onChange={(e) => setCreateForm({ ...createForm, signingBonus: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role *
                </label>
                <Input
                  value={createForm.role}
                  onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Deadline *
                </label>
                <Input
                  type="datetime-local"
                  value={createForm.deadline}
                  onChange={(e) => setCreateForm({ ...createForm, deadline: e.target.value })}
                  required
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
                    placeholder="Enter a benefit"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddBenefit();
                      }
                    }}
                  />
                  <Button type="button" onClick={handleAddBenefit}>
                    Add
                  </Button>
                </div>
                {createForm.benefits && createForm.benefits.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {createForm.benefits.map((benefit, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                      >
                        {benefit}
                        <button
                          type="button"
                          onClick={() => handleRemoveBenefit(idx)}
                          className="ml-2 text-blue-600 hover:text-blue-800"
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
                  Offer Content
                </label>
                <Textarea
                  value={createForm.content || ""}
                  onChange={(e) => setCreateForm({ ...createForm, content: e.target.value })}
                  rows={6}
                  placeholder="Enter offer letter content..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsCreateModalOpen(false);
                  setSelectedApplication(null);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={creating}>
                {creating ? "Sending..." : "Send Offer Letter"}
              </Button>
            </div>
          </form>
        </Modal>

        {/* View Offer Modal */}
        <Modal
          isOpen={isViewModalOpen}
          onClose={() => {
            setIsViewModalOpen(false);
            setSelectedApplication(null);
            setSelectedOffer(null);
          }}
          title="Offer Letter Details"
          size="lg"
        >
          {selectedApplication && selectedOffer && (
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
                  <label className="text-sm font-medium text-gray-700">Deadline</label>
                  <p className="text-gray-900">{formatDate(selectedOffer.deadline)}</p>
                </div>
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
              </div>

              {selectedOffer.benefits && selectedOffer.benefits.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Benefits</label>
                  <ul className="list-disc list-inside text-gray-900">
                    {selectedOffer.benefits.map((benefit, idx) => (
                      <li key={idx}>{benefit}</li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedOffer.content && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Offer Content</label>
                  <p className="text-gray-900 whitespace-pre-wrap">{selectedOffer.content}</p>
                </div>
              )}

              {/* Electronic Signatures */}
              <div className="border-t pt-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Electronic Signatures</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">Candidate:</span>
                    {selectedOffer.candidateSignedAt ? (
                      <span className="text-sm font-medium text-green-600">
                        ✓ Signed on {formatDate(selectedOffer.candidateSignedAt)}
                      </span>
                    ) : (
                      <span className="text-sm text-gray-500">Not signed yet</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">HR:</span>
                    {selectedOffer.hrSignedAt ? (
                      <span className="text-sm font-medium text-green-600">
                        ✓ Signed on {formatDate(selectedOffer.hrSignedAt)}
                      </span>
                    ) : (
                      <span className="text-sm text-gray-500">Not signed yet</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">Manager:</span>
                    {selectedOffer.managerSignedAt ? (
                      <span className="text-sm font-medium text-green-600">
                        ✓ Signed on {formatDate(selectedOffer.managerSignedAt)}
                      </span>
                    ) : (
                      <span className="text-sm text-gray-500">Not signed yet</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </ProtectedRoute>
  );
}

