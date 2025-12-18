"use client";

// NEW CODE: OverrideDecisionDialog component for HR Managers
// This component allows HR managers to override a manager's decision
// in special circumstances, handling policy exceptions

import { useState, useEffect } from "react";
import { Button } from "@/components/shared/ui/Button";
import { leavesApi } from "@/lib/api/leaves/leaves";
import { useAuthStore } from "@/lib/stores/auth.store";
import { LeaveRequest } from "@/types/leaves";

interface OverrideDecisionDialogProps {
  leaveRequestId: string;
  currentStatus: string;
  leaveRequest?: LeaveRequest; // ENHANCED: Optional full leave request object for displaying details
  onSuccess?: () => void;
  onError?: (error: string) => void;
  onClose: () => void;
}

export default function OverrideDecisionDialog({
  leaveRequestId,
  currentStatus,
  leaveRequest,
  onSuccess,
  onError,
  onClose,
}: OverrideDecisionDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [overrideToApproved, setOverrideToApproved] = useState(true);
  const [overrideReason, setOverrideReason] = useState("");
  const [requestDetails, setRequestDetails] = useState<LeaveRequest | null>(leaveRequest || null);
  const [loadingDetails, setLoadingDetails] = useState(!leaveRequest);
  const { user } = useAuthStore();

  // ENHANCED: Always fetch full leave request details to ensure populated leaveTypeId
  useEffect(() => {
    if (leaveRequestId) {
      const fetchDetails = async () => {
        try {
          setLoadingDetails(true);
          const details = await leavesApi.getLeaveRequestById(leaveRequestId);
          setRequestDetails(details);
        } catch (error: any) {
          console.error("Error fetching leave request details:", error);
          // Fallback to provided leaveRequest if fetch fails
          if (leaveRequest) {
            setRequestDetails(leaveRequest);
          }
        } finally {
          setLoadingDetails(false);
        }
      };
      fetchDetails();
    } else if (leaveRequest) {
      // If no leaveRequestId but leaveRequest is provided, use it
      setRequestDetails(leaveRequest);
      setLoadingDetails(false);
    }
  }, [leaveRequestId, leaveRequest]);

  const handleOverride = async () => {
    // Validate override reason is provided (required but no character limit)
    if (!overrideReason || !overrideReason.trim()) {
      if (onError) {
        onError("Please provide a justification for overriding the decision");
      }
      return;
    }

    // NEW CODE: Get HR user ID from auth store
    const hrUserId = user?.id || user?.userId || "";
    if (!hrUserId) {
      const errorMsg = "User ID not found. Please log in again.";
      if (onError) {
        onError(errorMsg);
      }
      return;
    }

    setIsLoading(true);
    try {
      // NEW CODE: Call override API endpoint (overrideReason is required)
      await leavesApi.overrideDecision(
        leaveRequestId,
        hrUserId,
        overrideToApproved,
        overrideReason.trim()
      );
      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to override leave decision";
      if (onError) {
        onError(errorMessage);
      } else {
        console.error("Error overriding leave decision:", error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Override Manager Decision</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={isLoading}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="space-y-4">
          {/* ENHANCED: Policy Exception Warning */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-yellow-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div>
                <h3 className="text-sm font-semibold text-yellow-800 mb-1">Policy Exception Override</h3>
                <p className="text-sm text-yellow-700">
                  This override should only be used for <strong>special circumstances</strong> that require exceptions to standard leave policies. 
                  Examples include: medical emergencies, legal requirements, or documented policy conflicts. 
                  All overrides are recorded for audit purposes.
                </p>
              </div>
            </div>
          </div>

          {/* ENHANCED: Display detailed leave request information */}
          {loadingDetails ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-sm text-gray-500">Loading request details...</p>
            </div>
          ) : requestDetails ? (
            <div className="bg-gray-50 rounded-lg p-4 space-y-3 border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-3">Leave Request Details</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase">Employee ID</label>
                  <p className="mt-1 text-sm text-gray-900 font-medium">{requestDetails.employeeId}</p>
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase">Current Status</label>
                  <p className="mt-1 text-sm text-gray-900">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      currentStatus?.toLowerCase() === "approved" 
                        ? "bg-green-100 text-green-800"
                        : currentStatus?.toLowerCase() === "rejected"
                        ? "bg-red-100 text-red-800"
                        : "bg-yellow-100 text-yellow-800"
                    }`}>
                      {currentStatus}
                    </span>
                  </p>
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase">Leave Dates</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {new Date(requestDetails.dates.from).toLocaleDateString()} - {" "}
                    {new Date(requestDetails.dates.to).toLocaleDateString()}
                  </p>
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase">Duration</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {requestDetails.durationDays} day{requestDetails.durationDays !== 1 ? "s" : ""}
                  </p>
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase">Leave Type</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {(() => {
                      // First check if leaveTypeName is directly provided (from backend mapping)
                      if (requestDetails.leaveTypeName) {
                        return requestDetails.leaveTypeName;
                      }
                      
                      const leaveTypeId = requestDetails.leaveTypeId;
                      if (!leaveTypeId) {
                        return "N/A";
                      }
                      // If populated object with name
                      if (typeof leaveTypeId === "object" && leaveTypeId !== null) {
                        return (leaveTypeId as any).name || "Unknown Leave Type";
                      }
                      // If string ID (shouldn't happen after backend fix, but handle gracefully)
                      if (typeof leaveTypeId === "string") {
                        return "Unknown Leave Type";
                      }
                      return "N/A";
                    })()}
                  </p>
                </div>
                
                {requestDetails.attachmentId && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase">Attachment</label>
                    <p className="mt-1 text-sm text-blue-600">Document attached</p>
                  </div>
                )}
              </div>
              
              {requestDetails.justification && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Justification</label>
                  <p className="text-sm text-gray-700 bg-white p-2 rounded border border-gray-200">
                    {requestDetails.justification}
                  </p>
                </div>
              )}
              
              {requestDetails.approvalFlow && requestDetails.approvalFlow.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase mb-2">Approval History</label>
                  <div className="space-y-1">
                    {requestDetails.approvalFlow.map((approval, index) => (
                      <div key={index} className={`text-xs bg-white p-2 rounded border ${
                        approval.role === "HR Manager" 
                          ? "border-orange-200 bg-orange-50" 
                          : "border-gray-200"
                      }`}>
                        <div className="flex items-center justify-between">
                          <span>
                            <span className="font-medium">{approval.role}:</span> {approval.status}
                            {approval.role === "HR Manager" && (
                              <span className="ml-2 text-orange-600 font-semibold">(Override)</span>
                            )}
                          </span>
                          {approval.decidedAt && (
                            <span className="text-gray-400">
                              {new Date(approval.decidedAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Current Status: <span className="font-normal text-gray-600">{currentStatus}</span>
                </label>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Override To <span className="text-red-500">*</span>
            </label>
            <select
              value={overrideToApproved ? "approved" : "rejected"}
              onChange={(e) => setOverrideToApproved(e.target.value === "approved")}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              disabled={isLoading}
            >
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reason for Override (Policy Exception Justification) <span className="text-red-500">*</span>
            </label>
            <textarea
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              placeholder="Provide a justification explaining why this override is necessary due to policy exceptions or special circumstances..."
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              rows={5}
              disabled={isLoading}
            />
            <div className="mt-2">
              <p className="text-xs text-gray-500">
                This reason will be recorded for audit purposes.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <Button
              variant="primary"
              onClick={handleOverride}
              disabled={isLoading || !overrideReason.trim()}
            >
              {isLoading ? "Processing..." : "Confirm Policy Exception Override"}
            </Button>
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

