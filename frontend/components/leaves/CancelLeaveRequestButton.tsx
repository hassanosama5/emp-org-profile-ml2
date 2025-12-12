"use client";
import React, { useState } from "react";
import { Button } from "../shared/ui/Button";
import { leavesApi } from "../../lib/api/leaves/leaves";
interface CancelLeaveRequestButtonProps {
  leaveRequestId: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
  variant?: "primary" | "outline" | "danger";
  size?: "sm" | "md" | "lg";
}
export const CancelLeaveRequestButton: React.FC<CancelLeaveRequestButtonProps> = ({
  leaveRequestId,
  onSuccess,
  onError,
  variant = "danger",
  size = "md",
}) => {
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const handleCancel = async () => {
    if (!showConfirm) {
      setShowConfirm(true);
      return;
    }
    setLoading(true);
    try {
      await leavesApi.cancelLeaveRequest(leaveRequestId);
      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      const errorMessage = error.message || "Failed to cancel leave request";
      if (onError) {
        onError(errorMessage);
      }
    } finally {
      setLoading(false);
      setShowConfirm(false);
    }
  };
  if (showConfirm) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-700">Are you sure?</span>
        <Button
          type="button"
          variant="outline"
          size={size}
          onClick={() => setShowConfirm(false)}
          disabled={loading}
        >
          No
        </Button>
        <Button
          type="button"
          variant="danger"
          size={size}
          onClick={handleCancel}
          isLoading={loading}
          disabled={loading}
        >
          Yes, Cancel Request
        </Button>
      </div>
    );
  }
  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={handleCancel}
      disabled={loading}
    >
      Cancel Request
    </Button>
  );
};