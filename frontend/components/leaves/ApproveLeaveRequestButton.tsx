"use client";
import { useState } from "react";
import { Button } from "../shared/ui/Button";
import { leavesApi } from "@/lib/api/leaves/leaves";
interface ApproveLeaveRequestButtonProps {
  leaveRequestId: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
  variant?: "primary" | "outline" | "danger";
  size?: "sm" | "md" | "lg";
}
export default function ApproveLeaveRequestButton({
  leaveRequestId,
  onSuccess,
  onError,
  variant = "primary",
  size = "md",
}: ApproveLeaveRequestButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const handleApprove = async () => {
    setIsLoading(true);
    try {
      await leavesApi.approveLeaveRequest(leaveRequestId);
      setShowConfirm(false);
      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to approve leave request";
      if (onError) {
        onError(errorMessage);
      } else {
        console.error("Error approving leave request:", error);
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
          onClick={handleApprove}
          disabled={isLoading}
        >
          {isLoading ? "Approving..." : "Confirm Approval"}
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
      Approve
    </Button>
  );
}