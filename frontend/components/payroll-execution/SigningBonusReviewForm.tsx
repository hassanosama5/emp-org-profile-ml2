"use client";

import { useState } from "react";
import { Button } from "../shared/ui/Button";
import { Input } from "../shared/ui/Input";
import { Card } from "../shared/ui/Card";
import {
  SigningBonusReviewDto,
  BonusStatus,
  EmployeeSigningBonus,
} from "../../types/payroll-execution";
import { payrollExecutionApi } from "../../lib/api/payroll-execution/payroll-execution";

interface SigningBonusReviewFormProps {
  signingBonus: EmployeeSigningBonus;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function SigningBonusReviewForm({
  signingBonus,
  onSuccess,
  onCancel,
}: SigningBonusReviewFormProps) {
  const [status, setStatus] = useState<BonusStatus>(
    signingBonus.status || BonusStatus.PENDING
  );
  const [paymentDate, setPaymentDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Only allow reviewing pending signing bonuses
  const canReview = signingBonus.status === BonusStatus.PENDING;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // Validate that the signing bonus is still pending
    if (signingBonus.status !== BonusStatus.PENDING) {
      setError(`This signing bonus cannot be reviewed. Current status: ${signingBonus.status}. Only pending signing bonuses can be reviewed.`);
      return;
    }

    setIsSubmitting(true);

    try {
      const reviewDto: SigningBonusReviewDto = {
        employeeSigningBonusId: signingBonus._id,
        status,
        ...(status === BonusStatus.APPROVED && paymentDate && { paymentDate }),
      };

      await payrollExecutionApi.reviewSigningBonus(reviewDto);
      onSuccess();
    } catch (err: any) {
      setError(err.message || "Failed to review signing bonus");
    } finally {
      setIsSubmitting(false);
    }
  };

  // If signing bonus is not pending, show message
  if (!canReview) {
    return (
      <Card className="p-6">
        <h2 className="text-2xl font-bold mb-4">Review Signing Bonus</h2>
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded mb-4">
          <p className="font-medium">This signing bonus cannot be reviewed.</p>
          <p className="text-sm mt-1">
            Only pending signing bonuses can be reviewed and approved/rejected. 
            Current status: <strong>{signingBonus.status}</strong>
          </p>
        </div>
        <Button
          type="button"
          onClick={onCancel}
          className="bg-gray-500 hover:bg-gray-600"
        >
          Back to List
        </Button>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h2 className="text-2xl font-bold mb-4">Review Signing Bonus</h2>
      <p className="text-gray-600 mb-4">
        Review and approve or reject this processed signing bonus. Only pending signing bonuses can be reviewed.
      </p>

      <div className="mb-6">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Employee Name
            </label>
            <p className="text-gray-700">
              {signingBonus.employeeId && typeof signingBonus.employeeId === "object" && signingBonus.employeeId !== null
                ? `${signingBonus.employeeId.firstName || ""} ${signingBonus.employeeId.lastName || ""}`.trim() || "N/A"
                : typeof signingBonus.employeeId === "string"
                ? `Employee ID: ${signingBonus.employeeId}`
                : "N/A"}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Employee ID
            </label>
            <p className="text-gray-700">
              {signingBonus.employeeId && typeof signingBonus.employeeId === "object" && signingBonus.employeeId !== null
                ? signingBonus.employeeId.employeeNumber || (signingBonus.employeeId._id ? String(signingBonus.employeeId._id) : "N/A")
                : typeof signingBonus.employeeId === "string"
                ? signingBonus.employeeId
                : "N/A"}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Given Amount
            </label>
            <p className="text-gray-700">${signingBonus.givenAmount.toFixed(2)}</p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Current Status
            </label>
            <p className="text-gray-700">{signingBonus.status}</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            Review Decision *
          </label>
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="radio"
                name="status"
                value={BonusStatus.APPROVED}
                checked={status === BonusStatus.APPROVED}
                onChange={(e) => setStatus(e.target.value as BonusStatus)}
                className="mr-2"
              />
              Approve
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="status"
                value={BonusStatus.REJECTED}
                checked={status === BonusStatus.REJECTED}
                onChange={(e) => setStatus(e.target.value as BonusStatus)}
                className="mr-2"
              />
              Reject
            </label>
          </div>
        </div>

        {status === BonusStatus.APPROVED && (
          <div>
            <label className="block text-sm font-medium mb-2">
              Payment Date (Optional)
            </label>
            <Input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
            />
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <div className="flex gap-4">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isSubmitting ? "Submitting..." : "Submit Review"}
          </Button>
          <Button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="bg-gray-500 hover:bg-gray-600"
          >
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
}

