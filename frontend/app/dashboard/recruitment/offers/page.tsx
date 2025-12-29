"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { useAuth } from "@/lib/hooks/use-auth";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/shared/ui/Card";
import { Button } from "@/components/shared/ui/Button";
import { Input } from "@/components/shared/ui/Input";
import { recruitmentApi } from "@/lib/api/recruitment/recruitment";
import { Offer, OfferResponseStatus, DocumentType } from "@/types/recruitment";
import { StatusBadge } from "@/components/recruitment/StatusBadge";
import { Modal } from "@/components/leaves/Modal";
import { Toast, useToast } from "@/components/leaves/Toast";

export default function OffersPage() {
  const { user } = useAuth();
  const { toast, showToast, hideToast } = useToast();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [isResponseModalOpen, setIsResponseModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadType, setUploadType] = useState<"contract" | "form">("contract");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadOffers();
  }, []);

  const loadOffers = async () => {
    try {
      setLoading(true);
      const candidateId = user?.id || user?.userId;
      
      if (!candidateId) {
        showToast("Could not identify your candidate ID", "error");
        console.error("Candidate ID not found in user object:", user);
        return;
      }

      // Debug logging
      console.log("=== OFFER LOADING DEBUG ===");
      console.log("Loading offers for candidate ID:", candidateId);
      console.log("Full user object:", user);
      console.log("User ID fields:", { 
        id: user?.id, 
        userId: user?.userId, 
        candidateNumber: user?.candidateNumber,
        fullName: user?.fullName
      });

      // Use the candidate-specific endpoint to fetch offers
      try {
        console.log("Calling API: getOffersByCandidateId with ID:", candidateId);
        const fetchedOffers = await recruitmentApi.getOffersByCandidateId(candidateId);
        console.log("API Response - Fetched offers:", fetchedOffers);
        console.log("Number of offers:", fetchedOffers?.length || 0);
        
        if (fetchedOffers && fetchedOffers.length > 0) {
          console.log("Offer details:", fetchedOffers.map(o => ({
            _id: o._id,
            candidateId: o.candidateId,
            applicationId: o.applicationId,
            role: o.role,
            grossSalary: o.grossSalary
          })));
        }
        
        setOffers(fetchedOffers || []);
        
        if (!fetchedOffers || fetchedOffers.length === 0) {
          console.warn("⚠️ No offers found for candidate ID:", candidateId);
          console.warn("This might mean:");
          console.warn("1. The candidateId in offers doesn't match the user's ID");
          console.warn("2. The offer's candidateId is from the application, not the candidate document");
          console.warn("3. Check the database - offer.candidateId should match candidate._id");
        }
      } catch (error: any) {
        console.error("Error fetching offers:", error);
        const errorMsg = error.message?.toLowerCase() || "";
        const isNotFound = errorMsg.includes("404") || errorMsg.includes("not found") || error.response?.status === 404;
        
        if (isNotFound) {
          // No offers found, which is a valid state
          console.log("No offers found (404) - this is a valid state");
          setOffers([]);
        } else {
          console.error("Failed to load offers:", error);
          showToast(error.message || "Failed to load offers", "error");
          setOffers([]);
        }
      }
    } catch (error: any) {
      console.error("Unexpected error in loadOffers:", error);
      showToast(error.message || "Failed to load offers", "error");
      setOffers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRespondToOffer = async (offer: Offer, response: OfferResponseStatus) => {
    // Check if we have a valid offer ID (not a temporary one)
    if (!offer._id || offer._id.startsWith('offer-')) {
      showToast("Offer details not fully loaded. Please refresh the page or contact HR.", "error");
      return;
    }

    try {
      await recruitmentApi.respondToOffer(offer._id, {
        applicantResponse: response,
      });
      const message = response === OfferResponseStatus.ACCEPTED
        ? "Offer accepted successfully! Please upload your signed contract and required forms. Once HR creates your employee profile, onboarding tasks will begin automatically."
        : "Offer declined";
      showToast(message, "success");
      setIsResponseModalOpen(false);
      await loadOffers();
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || 
                          error?.response?.data?.error || 
                          error?.message || 
                          "Failed to respond to offer";
      showToast(errorMessage, "error");
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedOffer || !selectedFile) {
      showToast("Please select a file", "error");
      return;
    }

    try {
      setUploading(true);
      if (uploadType === "contract") {
        await recruitmentApi.uploadContractDocument(
          selectedOffer._id,
          selectedFile,
          DocumentType.CONTRACT
        );
        showToast("Contract uploaded successfully", "success");
      } else {
        await recruitmentApi.uploadCandidateForm(
          selectedOffer._id,
          selectedFile,
          DocumentType.ID
        );
        showToast("Form uploaded successfully", "success");
      }
      setIsUploadModalOpen(false);
      setSelectedFile(null);
      loadOffers();
    } catch (error: any) {
      showToast(error.message || "Failed to upload document", "error");
    } finally {
      setUploading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <ProtectedRoute requiredUserType="candidate">
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
          <h1 className="text-3xl font-bold text-gray-900">Job Offers</h1>
          <p className="text-gray-600 mt-1">Review and respond to job offers</p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading offers...</p>
          </div>
        ) : offers.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-500 mb-4">No job offers at this time.</p>
              <Link href="/dashboard/recruitment">
                <button className="text-blue-600 hover:underline">View your applications</button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {offers.map((offer) => (
              <Card key={offer._id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-xl">
                        {offer.application?.requisition?.template?.title || "Job Offer"}
                      </CardTitle>
                      <p className="text-sm text-gray-600 mt-1">
                        {offer.application?.requisition?.template?.department || "Department"}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <StatusBadge
                        status={offer.applicantResponse || "pending"}
                        type="application"
                      />
                      {offer.deadline && (
                        <span className="text-xs text-gray-500">
                          Deadline: {formatDate(offer.deadline)}
                        </span>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {offer.grossSalary > 0 && (
                      <div>
                        <span className="text-sm text-gray-500">Gross Salary:</span>
                        <span className="ml-2 text-lg font-semibold text-gray-900">
                          ${offer.grossSalary.toLocaleString()}
                        </span>
                      </div>
                    )}

                    {offer.benefits && offer.benefits.length > 0 && (
                      <div>
                        <span className="text-sm text-gray-500">Benefits:</span>
                        <ul className="mt-1 list-disc list-inside text-sm text-gray-700">
                          {offer.benefits.map((benefit, idx) => (
                            <li key={idx}>{benefit}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {offer.content && (
                      <div className="pt-2 border-t">
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{offer.content}</p>
                      </div>
                    )}

                    {/* CHANGED - Enhanced signature status display */}
                    {(offer.candidateSignedAt || offer.hrSignedAt || offer.managerSignedAt) && (
                      <div className="pt-2 border-t">
                        <p className="text-xs font-semibold text-gray-500 mb-2">Signature Status:</p>
                        <div className="flex flex-wrap gap-2">
                          {offer.candidateSignedAt && (
                            <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                              ✓ Candidate Signed: {new Date(offer.candidateSignedAt).toLocaleDateString()}
                            </span>
                          )}
                          {offer.hrSignedAt && (
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                              ✓ HR Signed: {new Date(offer.hrSignedAt).toLocaleDateString()}
                            </span>
                          )}
                          {offer.managerSignedAt && (
                            <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs">
                              ✓ Manager Signed: {new Date(offer.managerSignedAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="pt-4 border-t flex gap-3 flex-wrap">
                      {offer.applicantResponse === OfferResponseStatus.PENDING && (
                        <>
                          {offer._id && !offer._id.startsWith('offer-') ? (
                            <>
                              <Button
                                onClick={() => {
                                  setSelectedOffer(offer);
                                  setIsResponseModalOpen(true);
                                }}
                              >
                                Respond to Offer
                              </Button>
                              <div className="w-full mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                <p className="text-sm text-blue-800">
                                  📋 <strong>Review this offer carefully.</strong> Once you accept, you'll be able to upload your signed contract and required forms.
                                </p>
                              </div>
                            </>
                          ) : (
                            <div className="w-full p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                              <p className="text-sm text-yellow-800">
                                ⚠️ Offer details are still being prepared. Please check back soon or contact HR if you have questions.
                              </p>
                            </div>
                          )}
                        </>
                      )}
                      {offer.applicantResponse === OfferResponseStatus.ACCEPTED && (
                        <>
                          <div className="flex gap-3 flex-wrap">
                            <Button
                              variant="outline"
                              onClick={() => {
                                setSelectedOffer(offer);
                                setUploadType("contract");
                                setIsUploadModalOpen(true);
                              }}
                            >
                              {offer.candidateSignedAt ? "Re-upload Contract" : "Upload Signed Contract"}
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => {
                                setSelectedOffer(offer);
                                setUploadType("form");
                                setIsUploadModalOpen(true);
                              }}
                            >
                              Upload Forms
                            </Button>
                          </div>
                          <div className="w-full mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                            <p className="text-sm text-green-800 mb-2">
                              ✅ <strong>Offer Accepted!</strong> {offer.candidateSignedAt 
                                ? "Your signed contract has been received." 
                                : "Please upload your electronically signed contract and required forms."}
                            </p>
                            <p className="text-xs text-green-700">
                              📋 <strong>Next Steps:</strong> {offer.candidateSignedAt 
                                ? "HR is reviewing your signed contract. Once approved, your employee profile will be created and onboarding tasks will begin automatically."
                                : "After you upload the signed contract, HR will review and create your employee profile. Once your employee profile is created, onboarding tasks will automatically begin and you'll be able to track your progress."}
                            </p>
                          </div>
                        </>
                      )}
                      {offer.applicantResponse === OfferResponseStatus.REJECTED && (
                        <div className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg">
                          <p className="text-sm text-gray-600">
                            This offer has been declined.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Response Modal */}
        <Modal
          isOpen={isResponseModalOpen}
          onClose={() => setIsResponseModalOpen(false)}
          title="Respond to Offer"
          size="md"
          footer={
            <>
              <Button variant="outline" onClick={() => setIsResponseModalOpen(false)}>
                Cancel
              </Button>
              {selectedOffer && (
                <>
                  <Button
                    onClick={() =>
                      handleRespondToOffer(selectedOffer, OfferResponseStatus.ACCEPTED)
                    }
                  >
                    Accept Offer
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() =>
                      handleRespondToOffer(selectedOffer, OfferResponseStatus.REJECTED)
                    }
                  >
                    Decline Offer
                  </Button>
                </>
              )}
            </>
          }
        >
          <div className="space-y-4">
            <p className="text-gray-700">
              Are you sure you want to{" "}
              {selectedOffer?.applicantResponse === OfferResponseStatus.ACCEPTED
                ? "accept"
                : "respond to"}{" "}
              this offer?
            </p>
            {selectedOffer && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800 font-semibold mb-1">
                  📝 Electronic Signature Required
                </p>
                <p className="text-xs text-blue-700">
                  By accepting this offer, you agree to the terms and conditions. You will be required to upload an electronically signed contract document after acceptance.
                </p>
              </div>
            )}
          </div>
        </Modal>

        {/* Upload Modal */}
        <Modal
          isOpen={isUploadModalOpen}
          onClose={() => {
            setIsUploadModalOpen(false);
            setSelectedFile(null);
          }}
          title={uploadType === "contract" ? "Upload Contract" : "Upload Candidate Form"}
          size="md"
          footer={
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setIsUploadModalOpen(false);
                  setSelectedFile(null);
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleUpload} disabled={!selectedFile || uploading}>
                {uploading ? "Uploading..." : "Upload"}
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <Input
              label="Select File"
              type="file"
              onChange={handleFileSelect}
              accept=".pdf,.doc,.docx"
            />
            {selectedFile && (
              <p className="text-sm text-gray-600">Selected: {selectedFile.name}</p>
            )}
          </div>
        </Modal>
      </div>
    </ProtectedRoute>
  );
}

