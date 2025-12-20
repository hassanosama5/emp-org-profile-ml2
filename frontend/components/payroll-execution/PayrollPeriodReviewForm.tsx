"use client";

import { useState } from "react";
import { Button } from "../shared/ui/Button";
import { Input } from "../shared/ui/Input";
import { Card } from "../shared/ui/Card";
import {
  ReviewPayrollPeriodDto,
  EditPayrollPeriodDto,
  PayrollStatus,
  PayrollRun,
} from "../../types/payroll-execution";
import { payrollExecutionApi } from "../../lib/api/payroll-execution/payroll-execution";

interface PayrollPeriodReviewFormProps {
  payrollRun: PayrollRun;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function PayrollPeriodReviewForm({
  payrollRun,
  onSuccess,
  onCancel,
}: PayrollPeriodReviewFormProps) {
  const [status, setStatus] = useState<PayrollStatus>(
    payrollRun.status || PayrollStatus.DRAFT
  );
  const [rejectionReason, setRejectionReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedPeriod, setEditedPeriod] = useState(
    payrollRun.payrollPeriod || ""
  );

  const handleReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const reviewDto: ReviewPayrollPeriodDto = {
        payrollRunId: payrollRun._id,
        status,
        ...(status === PayrollStatus.REJECTED && { rejectionReason }),
      };

      await payrollExecutionApi.reviewPayrollPeriod(reviewDto);
      onSuccess();
    } catch (err: any) {
      setError(err.message || "Failed to review payroll period");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const editDto: EditPayrollPeriodDto = {
        payrollRunId: payrollRun._id,
        payrollPeriod: editedPeriod,
      };

      await payrollExecutionApi.editPayrollPeriod(editDto);
      setIsEditing(false);
      onSuccess();
    } catch (err: any) {
      setError(err.message || "Failed to edit payroll period");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="p-6">
      <h2 className="text-2xl font-bold mb-4">Review Payroll Period</h2>

      <div className="mb-6">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-1">Run ID</label>
            <p className="text-gray-700">{payrollRun.runId}</p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Entity</label>
            <p className="text-gray-700">{payrollRun.entity}</p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Payroll Period
            </label>
            {isEditing ? (
              <Input
                type="date"
                value={editedPeriod}
                onChange={(e) => setEditedPeriod(e.target.value)}
                className="mt-1"
              />
            ) : (
              <p className="text-gray-700">{payrollRun.payrollPeriod}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Status</label>
            <p className="text-gray-700">{payrollRun.status}</p>
          </div>
        </div>
      </div>

      {isEditing ? (
        <form onSubmit={handleEdit} className="space-y-4">
          <div className="flex gap-4">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
            <Button
              type="button"
              onClick={() => {
                setIsEditing(false);
                setEditedPeriod(payrollRun.payrollPeriod || "");
              }}
              disabled={isSubmitting}
              className="bg-gray-500 hover:bg-gray-600"
            >
              Cancel Edit
            </Button>
          </div>
        </form>
      ) : (
        <form onSubmit={handleReview} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Review Decision *
            </label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="status"
                  value={PayrollStatus.APPROVED}
                  checked={status === PayrollStatus.APPROVED}
                  onChange={(e) => setStatus(e.target.value as PayrollStatus)}
                  className="mr-2"
                />
                Approve
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="status"
                  value={PayrollStatus.REJECTED}
                  checked={status === PayrollStatus.REJECTED}
                  onChange={(e) => setStatus(e.target.value as PayrollStatus)}
                  className="mr-2"
                />
                Reject
              </label>
            </div>
          </div>

          {status === PayrollStatus.REJECTED && (
            <div>
              <label className="block text-sm font-medium mb-2">
                Rejection Reason *
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Please provide a reason for rejection"
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
            {status === PayrollStatus.REJECTED && (
              <Button
                type="button"
                onClick={() => setIsEditing(true)}
                disabled={isSubmitting}
                className="bg-yellow-600 hover:bg-yellow-700"
              >
                Edit Period
              </Button>
            )}
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
      )}
    </Card>
  );
}

