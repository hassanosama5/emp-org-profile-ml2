"use client";

// NEW CODE: BulkProcessDialog component for HR Managers
// This component allows HR managers to process multiple leave requests at once
// for efficiency when handling large volumes of requests

import { useState } from "react";
import { Button } from "@/components/shared/ui/Button";
import { leavesApi } from "@/lib/api/leaves/leaves";
import { useAuthStore } from "@/lib/stores/auth.store";
import { LeaveRequest } from "@/types/leaves";

interface BulkProcessDialogProps {
  leaveRequests: LeaveRequest[];
  onSuccess?: () => void;
  onError?: (error: string) => void;
  onClose: () => void;
}

export default function BulkProcessDialog({
  leaveRequests,
  onSuccess,
  onError,
  onClose,
}: BulkProcessDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRequestIds, setSelectedRequestIds] = useState<Set<string>>(new Set());
  const [action, setAction] = useState<"finalize" | "approve" | "reject">("finalize");
  const [processingResults, setProcessingResults] = useState<{
    success: number;
    failed: number;
    errors: string[];
  } | null>(null);
  const { user } = useAuthStore();

  const toggleSelection = (requestId: string) => {
    const newSelection = new Set(selectedRequestIds);
    if (newSelection.has(requestId)) {
      newSelection.delete(requestId);
    } else {
      newSelection.add(requestId);
    }
    setSelectedRequestIds(newSelection);
  };

  const handleBulkProcess = async () => {
    if (selectedRequestIds.size === 0) {
      if (onError) {
        onError("Please select at least one leave request");
      }
      return;
    }

    // ENHANCED: Get HR user ID from auth store
    const hrUserId = user?.id || user?.userId || "";
    if (!hrUserId) {
      const errorMsg = "User ID not found. Please log in again.";
      if (onError) {
        onError(errorMsg);
      }
      return;
    }

    setIsLoading(true);
    setProcessingResults(null);
    
    try {
      const requestIdsArray = Array.from(selectedRequestIds);
      const results = { success: 0, failed: 0, errors: [] as string[] };

      // ENHANCED: Handle different bulk actions with proper error handling
      if (action === "finalize") {
        // Finalize each approved request individually with error handling
        // Note: Backend doesn't have bulk finalize endpoint, so we process sequentially
        // ENHANCED: Process finalize sequentially with individual error handling
        for (const requestId of requestIdsArray) {
          try {
            // Backend gets hrUserId from authenticated user, so we only pass requestId
            await leavesApi.finalizeLeaveRequest(requestId);
            results.success++;
          } catch (error: any) {
            results.failed++;
            const errorMsg = error?.response?.data?.message || error?.message || "Failed to finalize";
            results.errors.push(`Request ${requestId.slice(-8)}: ${errorMsg}`);
          }
        }
      } else if (action === "approve") {
        // ENHANCED: Backend now properly handles approve - approves pending requests, finalizes approved ones
        try {
          const processed = await leavesApi.processMultipleRequests(requestIdsArray, hrUserId, true);
          results.success = processed.length;
          // Backend now throws error if all fail, but allows partial success
          if (processed.length < requestIdsArray.length) {
            results.failed = requestIdsArray.length - processed.length;
            // Extract error details from response if available
            const errorMsg = "Some requests failed to process. Check individual errors below.";
            results.errors.push(errorMsg);
          }
        } catch (error: any) {
          // Backend throws error if all failed, but may have partial success
          const errorMsg = error?.response?.data?.message || error?.message || "Failed to process requests";
          // Try to extract partial success count from error message
          const match = errorMsg.match(/(\d+) succeeded/);
          if (match) {
            results.success = parseInt(match[1]);
            results.failed = requestIdsArray.length - results.success;
          } else {
            results.failed = requestIdsArray.length;
          }
          results.errors.push(errorMsg);
        }
      } else {
        // ENHANCED: Backend now uses normal rejection (not override) for bulk reject
        try {
          const processed = await leavesApi.processMultipleRequests(requestIdsArray, hrUserId, false);
          results.success = processed.length;
          if (processed.length < requestIdsArray.length) {
            results.failed = requestIdsArray.length - processed.length;
            const errorMsg = "Some requests failed to process. Check individual errors below.";
            results.errors.push(errorMsg);
          }
        } catch (error: any) {
          const errorMsg = error?.response?.data?.message || error?.message || "Failed to process requests";
          const match = errorMsg.match(/(\d+) succeeded/);
          if (match) {
            results.success = parseInt(match[1]);
            results.failed = requestIdsArray.length - results.success;
          } else {
            results.failed = requestIdsArray.length;
          }
          results.errors.push(errorMsg);
        }
      }

      setProcessingResults(results);

      // ENHANCED: Show results and only close if all succeeded
      if (results.failed === 0) {
        if (onSuccess) {
          onSuccess();
        }
        // Auto-close after showing success message
        setTimeout(() => {
          onClose();
        }, 2000);
      } else if (results.success > 0) {
        // Partial success - show results but don't auto-close
        if (onSuccess) {
          onSuccess();
        }
      } else {
        // All failed
        if (onError) {
          onError(`All ${results.failed} request(s) failed to process. Check errors below.`);
        }
      }
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to process leave requests";
      if (onError) {
        onError(errorMessage);
      } else {
        console.error("Error processing leave requests:", error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to check if a request is finalized
  const isFinalized = (request: LeaveRequest): boolean => {
    if (!request.approvalFlow || request.approvalFlow.length === 0) {
      return false;
    }
    // Check if approvalFlow contains an HR Manager approval (finalization)
    return request.approvalFlow.some(
      (approval) =>
        approval.role === "HR Manager" && approval.status?.toLowerCase() === "approved"
    );
  };

  // ENHANCED: Filter requests based on action type
  const getFilteredRequests = () => {
    if (action === "finalize") {
      // Only show approved requests that are NOT finalized yet
      return leaveRequests.filter(
        (req) => req.status?.toLowerCase() === "approved" && !isFinalized(req)
      );
    } else if (action === "approve") {
      // Only show pending requests for approval (not approved requests)
      return leaveRequests.filter((req) => req.status?.toLowerCase() === "pending");
    } else {
      // For reject, show pending requests only
      return leaveRequests.filter((req) => req.status?.toLowerCase() === "pending");
    }
  };

  const filteredRequests = getFilteredRequests();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-semibold mb-4">Bulk Process Leave Requests</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Action <span className="text-red-500">*</span>
            </label>
            <select
              value={action}
              onChange={(e) => {
                setAction(e.target.value as "finalize" | "approve" | "reject");
                // Reset selection when action changes
                setSelectedRequestIds(new Set());
              }}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              disabled={isLoading}
            >
              <option value="finalize">Finalize Approved Requests</option>
              <option value="approve">Approve Pending Requests</option>
              <option value="reject">Reject Pending Requests</option>
            </select>
            <p className="mt-1 text-xs text-gray-500">
              {action === "finalize"
                ? "Select approved leave requests to finalize (updates records and payroll)"
                : action === "approve"
                ? "Select pending requests to approve in bulk"
                : "Select pending leave requests to reject in bulk"}
            </p>
          </div>

          <div className="border rounded-lg p-4 max-h-96 overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-700">
                Select Requests ({selectedRequestIds.size} selected)
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const allIds = new Set(filteredRequests.map((req) => req._id));
                    setSelectedRequestIds(allIds);
                  }}
                  className="text-xs text-blue-600 hover:text-blue-800"
                  disabled={isLoading}
                >
                  Select All
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedRequestIds(new Set())}
                  className="text-xs text-blue-600 hover:text-blue-800"
                  disabled={isLoading}
                >
                  Clear All
                </button>
              </div>
            </div>

            {filteredRequests.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">
                No {action === "finalize" 
                  ? "approved" 
                  : "pending"} requests available for this action.
              </p>
            ) : (
              <div className="space-y-2">
                {filteredRequests.map((request) => (
                  <label
                    key={request._id}
                    className="flex items-start gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedRequestIds.has(request._id)}
                      onChange={() => toggleSelection(request._id)}
                      disabled={isLoading}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium">
                        Employee: {request.employeeId}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(request.dates.from).toLocaleDateString()} -{" "}
                        {new Date(request.dates.to).toLocaleDateString()} (
                        {request.durationDays} days)
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-xs text-gray-500">
                          Status: <span className="font-medium">{request.status}</span>
                        </div>
                        {/* ENHANCED: Show what action will be taken */}
                        {action === "approve" && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">
                            → Will Approve
                          </span>
                        )}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* ENHANCED: Show processing results */}
          {processingResults && (
            <div className={`p-4 rounded-lg border ${
              processingResults.failed === 0
                ? "bg-green-50 border-green-200"
                : processingResults.success > 0
                ? "bg-yellow-50 border-yellow-200"
                : "bg-red-50 border-red-200"
            }`}>
              <div className="text-sm font-medium mb-2">
                {processingResults.failed === 0
                  ? `✓ Successfully processed ${processingResults.success} request(s)`
                  : processingResults.success > 0
                  ? `⚠ Partially completed: ${processingResults.success} succeeded, ${processingResults.failed} failed`
                  : `✗ Failed to process ${processingResults.failed} request(s)`}
              </div>
              {processingResults.errors.length > 0 && (
                <div className="mt-2 space-y-1">
                  <p className="text-xs font-medium">Errors:</p>
                  {processingResults.errors.map((error, idx) => (
                    <p key={idx} className="text-xs text-red-700">{error}</p>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-2 pt-2">
            <Button
              variant="primary"
              onClick={handleBulkProcess}
              disabled={isLoading || selectedRequestIds.size === 0}
            >
              {isLoading
                ? "Processing..."
                : `Process ${selectedRequestIds.size} Request${selectedRequestIds.size !== 1 ? "s" : ""}`}
            </Button>
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              {processingResults ? "Close" : "Cancel"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

