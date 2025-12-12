"use client";

// NEW CODE: FinalizeLeaveRequestButton component for HR Managers
// This component allows HR managers to finalize approved leave requests,
// which updates employee records and adjusts payroll automatically

import { useState } from "react";
import { Button } from "@/components/shared/ui/Button";
import { leavesApi } from "@/lib/api/leaves/leaves";

interface FinalizeLeaveRequestButtonProps {
  leaveRequestId: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
  variant?: "primary" | "outline" | "danger";
  size?: "sm" | "md" | "lg";
}

export default function FinalizeLeaveRequestButton({
  leaveRequestId,
  onSuccess,
  onError,
  variant = "primary",
  size = "md",
}: FinalizeLeaveRequestButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleFinalize = async () => {
    setIsLoading(true);
    try {
      // FIXED: Backend gets hrUserId from authenticated user, so we only pass leaveRequestId
      await leavesApi.finalizeLeaveRequest(leaveRequestId);
      setShowConfirm(false);
      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to finalize leave request";
      if (onError) {
        onError(errorMessage);
      } else {
        console.error("Error finalizing leave request:", error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (showConfirm) {
    return (
      <div className="flex items-center gap-2">
        <Button
          variant="primary"
          size={size}
          onClick={handleFinalize}
          disabled={isLoading}
        >
          {isLoading ? "Finalizing..." : "Confirm Finalization"}
        </Button>
        <Button
          variant="outline"
          size={size}
          onClick={() => setShowConfirm(false)}
          disabled={isLoading}
        >
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={() => setShowConfirm(true)}
      disabled={isLoading}
    >
      Finalize
    </Button>
  );
}

