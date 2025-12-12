"use client";

import { useState } from "react";
import { Button } from "@/components/shared/ui/Button";
import { leavesApi } from "@/lib/api/leaves/leaves";

interface RejectLeaveRequestButtonProps {
  leaveRequestId: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
  variant?: "primary" | "outline" | "danger";
  size?: "sm" | "md" | "lg";
}

export default function RejectLeaveRequestButton({
  leaveRequestId,
  onSuccess,
  onError,
  variant = "danger",
  size = "md",
}: RejectLeaveRequestButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      if (onError) {
        onError("Please provide a reason for rejection");
      }
      return;
    }

    setIsLoading(true);
    try {
      await leavesApi.rejectLeaveRequest(leaveRequestId);
      setShowRejectForm(false);
      setRejectionReason("");
      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to reject leave request";
      if (onError) {
        onError(errorMessage);
      } else {
        console.error("Error rejecting leave request:", error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (showRejectForm) {
    return (
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Reason for Rejection <span className="text-red-500">*</span>
          </label>
          <textarea
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="Please provide a reason for rejecting this leave request..."
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20"
            rows={3}
            disabled={isLoading}
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="danger"
            size={size}
            onClick={handleReject}
            disabled={isLoading || !rejectionReason.trim()}
          >
            {isLoading ? "Rejecting..." : "Confirm Rejection"}
          </Button>
          <Button
            variant="outline"
            size={size}
            onClick={() => {
              setShowRejectForm(false);
              setRejectionReason("");
            }}
            disabled={isLoading}
          >
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={() => setShowRejectForm(true)}
      disabled={isLoading}
    >
      Reject
    </Button>
  );
}

