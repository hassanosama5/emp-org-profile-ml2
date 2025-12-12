"use client";

// NEW CODE: Document Verification page for HR Managers
// This page allows HR managers to verify medical leave documents
// to ensure only legitimate claims are approved

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/hooks/use-auth";
import { SystemRole } from "@/types";
import { leavesApi } from "@/lib/api/leaves/leaves";
import { LeaveRequest } from "@/types/leaves";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/shared/ui/Card";
import { Button } from "@/components/shared/ui/Button";

export default function DocumentVerificationPage() {
  const router = useRouter();
  const params = useParams();
  const { user, isAuthenticated, loading } = useAuth();
  
  // NEW CODE: State management for document verification
  const [leaveRequest, setLeaveRequest] = useState<LeaveRequest | null>(null);
  const [loadingRequest, setLoadingRequest] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [showVerifyDialog, setShowVerifyDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [verificationNotes, setVerificationNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");

  const leaveRequestId = params?.id as string;

  // NEW CODE: Role-based access control - only HR_MANAGER can access (HR_ADMIN excluded)
  useEffect(() => {
    if (!loading && isAuthenticated && user) {
      const roles = user.roles || [];
      if (!roles.includes(SystemRole.HR_MANAGER)) {
        router.replace("/dashboard");
      }
    }
  }, [loading, isAuthenticated, user, router]);

  // NEW CODE: Fetch leave request details
  useEffect(() => {
    if (leaveRequestId && isAuthenticated) {
      fetchLeaveRequest();
    }
  }, [leaveRequestId, isAuthenticated]);

  const fetchLeaveRequest = async () => {
    if (!leaveRequestId) {
      setError("Leave request ID is required");
      setLoadingRequest(false);
      return;
    }

    setLoadingRequest(true);
    setError(null);

    try {
      // NEW CODE: Fetch leave request by ID using the API endpoint
      const request = await leavesApi.getLeaveRequestById(leaveRequestId);
      setLeaveRequest(request);
    } catch (err: any) {
      console.error("Error fetching leave request:", err);
      const errorMessage =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to fetch leave request";
      setError(errorMessage);
    } finally {
      setLoadingRequest(false);
    }
  };

  // NEW CODE: Handle document download/view
  const handleViewDocument = async () => {
    if (!leaveRequest?.attachmentId) {
      setError("No attachment ID found for this leave request");
      return;
    }

    try {
      // FIXED: Convert attachmentId to string if it's an ObjectId
      const attachmentId = typeof leaveRequest.attachmentId === 'object' 
        ? (leaveRequest.attachmentId as any)._id || (leaveRequest.attachmentId as any).toString()
        : String(leaveRequest.attachmentId);
      
      const blob = await leavesApi.downloadAttachment(attachmentId);
      const url = window.URL.createObjectURL(blob);
      
      // Determine file type from blob
      const fileType = blob.type || 'application/pdf';
      const blobUrl = url;
      
      // Open in new tab
      const newWindow = window.open(blobUrl, '_blank');
      if (!newWindow) {
        // If popup blocked, try downloading instead
        const a = document.createElement('a');
        a.href = blobUrl;
        a.target = '_blank';
        a.click();
      }
      
      // Clean up after a delay
      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000);
    } catch (err: any) {
      console.error("Error viewing document:", err);
      setError(err?.message || "Failed to view document. Please try downloading instead.");
    }
  };

  // NEW CODE: Handle document download
  const handleDownloadDocument = async () => {
    if (!leaveRequest?.attachmentId) {
      setError("No attachment ID found for this leave request");
      return;
    }

    try {
      // FIXED: Convert attachmentId to string if it's an ObjectId
      const attachmentId = typeof leaveRequest.attachmentId === 'object' 
        ? (leaveRequest.attachmentId as any)._id || (leaveRequest.attachmentId as any).toString()
        : String(leaveRequest.attachmentId);
      
      const blob = await leavesApi.downloadAttachment(attachmentId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      // Get filename from blob or use default
      const fileName = `leave-document-${leaveRequestId}-${Date.now()}.pdf`;
      a.download = fileName;
      
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      // Clean up after a delay
      setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    } catch (err: any) {
      console.error("Error downloading document:", err);
      setError(err?.message || "Failed to download document");
    }
  };

  // NEW CODE: Handle document verification
  const handleVerifyDocument = async () => {
    if (!leaveRequest) return;

    setIsVerifying(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await leavesApi.verifyDocument(leaveRequestId, verificationNotes);
      setSuccessMessage("✓ Document verified successfully! The status has been updated.");
      setShowVerifyDialog(false);
      setVerificationNotes("");
      await fetchLeaveRequest(); // Refresh data
      
      // Show success message for 3 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (err: any) {
      console.error("Error verifying document:", err);
      setError(err?.response?.data?.message || err?.message || "Failed to verify document");
    } finally {
      setIsVerifying(false);
    }
  };

  // NEW CODE: Handle document rejection
  const handleRejectDocument = async () => {
    if (!leaveRequest || !rejectionReason.trim()) {
      setError("Please provide a reason for rejection");
      return;
    }

    setIsVerifying(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await leavesApi.rejectDocument(leaveRequestId, rejectionReason);
      setSuccessMessage("✗ Document rejected. The status has been updated.");
      setShowRejectDialog(false);
      setRejectionReason("");
      await fetchLeaveRequest(); // Refresh data
      
      // Show success message for 3 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (err: any) {
      console.error("Error rejecting document:", err);
      setError(err?.response?.data?.message || err?.message || "Failed to reject document");
    } finally {
      setIsVerifying(false);
    }
  };

  // NEW CODE: Get verification status badge (using approvalFlow instead of schema fields)
  const getVerificationStatusBadge = () => {
    // Check approvalFlow for document verification entries
    const verificationEntry = leaveRequest?.approvalFlow?.find(
      (entry) => entry.role === 'HR Manager - Document Verification'
    );
    
    const status = verificationEntry?.status?.toLowerCase() || 'pending';
    switch (status) {
      case 'verified':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 text-sm font-semibold rounded-full bg-green-100 text-green-800">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Verified
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 text-sm font-semibold rounded-full bg-red-100 text-red-800">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 text-sm font-semibold rounded-full bg-yellow-100 text-yellow-800">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
            </svg>
            Pending Verification
          </span>
        );
    }
  };

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  if (loading || loadingRequest) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => router.back()}
          >
            ← Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Document Verification</h1>
            <p className="mt-2 text-gray-600">
              Verify medical leave documents to ensure legitimate claims
            </p>
          </div>
        </div>
      </div>

      {successMessage && (
        <Card className="mb-6 border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <p className="text-green-800 font-medium">{successMessage}</p>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-800">{error}</p>
            <div className="mt-4">
              <Link href="/dashboard/leaves/hr-manager">
                <Button variant="primary">Go to HR Manager Page</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {leaveRequest && (
        <div className="space-y-6">
          {/* NEW CODE: Leave Request Information */}
          <Card>
            <CardHeader>
              <CardTitle>Leave Request Details</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Employee ID</label>
                  <p className="mt-1 text-sm text-gray-900">{leaveRequest.employeeId}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <p className="mt-1 text-sm text-gray-900">{leaveRequest.status}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Leave Dates</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {new Date(leaveRequest.dates.from).toLocaleDateString()} -{" "}
                    {new Date(leaveRequest.dates.to).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Duration</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {leaveRequest.durationDays} day{leaveRequest.durationDays !== 1 ? "s" : ""}
                  </p>
                </div>
                {leaveRequest.justification && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">Justification</label>
                    <p className="mt-1 text-sm text-gray-900">{leaveRequest.justification}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* NEW CODE: Document Information and Verification */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Document Verification</CardTitle>
                {leaveRequest.attachmentId && getVerificationStatusBadge()}
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {leaveRequest.attachmentId ? (
                <div className="space-y-6">
                  {/* Document Info */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Attachment ID
                    </label>
                    <p className="text-sm text-gray-900 font-mono bg-gray-50 p-2 rounded">
                      {leaveRequest.attachmentId}
                    </p>
                  </div>
                  
                  {/* Document Actions */}
                  <div className="flex items-center gap-4">
                    <Button
                      variant="primary"
                      onClick={handleViewDocument}
                      disabled={isVerifying}
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      View Document
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleDownloadDocument}
                      disabled={isVerifying}
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Download Document
                    </Button>
                  </div>

                  {/* Verification Status Details */}
                  {(() => {
                    const verificationEntry = leaveRequest.approvalFlow?.find(
                      (entry) => entry.role === 'HR Manager - Document Verification'
                    );
                    const verificationStatus = verificationEntry?.status?.toLowerCase();
                    
                    if (verificationStatus && verificationStatus !== 'pending') {
                      // Extract verification notes from justification if present
                      const justification = leaveRequest.justification || '';
                      const verifiedMatch = justification.match(/\[Document Verified: ([^\]]+)\]/);
                      const rejectedMatch = justification.match(/\[Document Rejected: ([^\]]+)\]/);
                      const notes = verifiedMatch?.[1] || rejectedMatch?.[1];
                      
                      return (
                        <div className={`p-4 rounded-lg border ${
                          verificationStatus === 'verified' 
                            ? 'bg-green-50 border-green-200' 
                            : 'bg-red-50 border-red-200'
                        }`}>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className={`text-sm font-medium ${
                                verificationStatus === 'verified' 
                                  ? 'text-green-800' 
                                  : 'text-red-800'
                              }`}>
                                {verificationStatus === 'verified' 
                                  ? 'Document Verified' 
                                  : 'Document Rejected'}
                              </p>
                              {notes && (
                                <p className="mt-1 text-sm text-gray-700">
                                  {notes}
                                </p>
                              )}
                              {verificationEntry?.decidedAt && (
                                <p className="mt-1 text-xs text-gray-500">
                                  Verified on: {new Date(verificationEntry.decidedAt).toLocaleString()}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}

                  {/* Verification Guidelines */}
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800 font-medium mb-2">
                      Verification Guidelines:
                    </p>
                    <ul className="text-sm text-blue-800 list-disc list-inside space-y-1">
                      <li>Document is legitimate and not forged</li>
                      <li>Dates match the leave request period</li>
                      <li>Medical certificate is from a valid healthcare provider</li>
                      <li>All required information is present</li>
                    </ul>
                  </div>

                  {/* Verification Actions - Always visible */}
                  <div className="pt-4 border-t border-gray-200">
                    {(() => {
                      const verificationEntry = leaveRequest.approvalFlow?.find(
                        (entry) => entry.role === 'HR Manager - Document Verification'
                      );
                      const isVerified = verificationEntry !== undefined;
                      
                      return (
                        <div className="space-y-3">
                          {isVerified && (
                            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg mb-3">
                              <p className="text-sm text-yellow-800 text-center font-medium">
                                ⚠️ Document already verified. You can verify again to update the status.
                              </p>
                            </div>
                          )}
                          <p className="text-sm font-medium text-gray-700 text-center">
                            {isVerified ? "Update Verification:" : "Verify this document:"}
                          </p>
                          <div className="flex items-center gap-4">
                            <Button
                              variant="primary"
                              onClick={() => setShowVerifyDialog(true)}
                              disabled={isVerifying}
                              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                            >
                              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                              {isVerified ? "Verify Again" : "Verify Document"}
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => setShowRejectDialog(true)}
                              disabled={isVerifying}
                              className="flex-1 border-red-300 text-red-700 hover:bg-red-50"
                            >
                              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                              </svg>
                              {isVerified ? "Reject Document" : "Reject Document"}
                            </Button>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>No attachment found for this leave request.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* NEW CODE: Verify Document Dialog */}
          {showVerifyDialog && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <Card className="w-full max-w-md mx-4">
                <CardHeader>
                  <CardTitle>Verify Document</CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Verification Notes (Optional)
                      </label>
                      <textarea
                        value={verificationNotes}
                        onChange={(e) => setVerificationNotes(e.target.value)}
                        placeholder="Add any notes about the verification..."
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        rows={4}
                      />
                    </div>
                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowVerifyDialog(false);
                          setVerificationNotes("");
                        }}
                        className="flex-1"
                        disabled={isVerifying}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="primary"
                        onClick={handleVerifyDocument}
                        className="flex-1"
                        disabled={isVerifying}
                      >
                        {isVerifying ? "Verifying..." : "Confirm Verification"}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* NEW CODE: Reject Document Dialog */}
          {showRejectDialog && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <Card className="w-full max-w-md mx-4">
                <CardHeader>
                  <CardTitle>Reject Document</CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Rejection Reason <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        placeholder="Please provide a reason for rejecting this document..."
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                        rows={4}
                        required
                      />
                    </div>
                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowRejectDialog(false);
                          setRejectionReason("");
                        }}
                        className="flex-1"
                        disabled={isVerifying}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="outline"
                        onClick={handleRejectDocument}
                        className="flex-1 border-red-300 text-red-700 hover:bg-red-50"
                        disabled={isVerifying || !rejectionReason.trim()}
                      >
                        {isVerifying ? "Rejecting..." : "Confirm Rejection"}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}

      {!leaveRequest && !error && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8 text-gray-500">
              <p>Leave request not found.</p>
              <div className="mt-4">
                <Link href="/dashboard/leaves/hr-manager">
                  <Button variant="primary">Go to HR Manager Page</Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

