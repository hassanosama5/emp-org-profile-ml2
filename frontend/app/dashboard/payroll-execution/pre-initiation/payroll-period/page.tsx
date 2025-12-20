"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useRequireAuth, useAuth } from "@/lib/hooks/use-auth";
import { SystemRole } from "@/types";
import { Button } from "../../../../../components/shared/ui/Button";
import { Label } from "../../../../../components/shared/ui/Label";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "../../../../../components/shared/ui/Card";
import {
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Calendar,
  Edit,
  XCircle,
} from "lucide-react";

// Local storage key for approved payroll period
const APPROVED_PERIOD_KEY = "approved_payroll_period";

interface ApprovedPeriod {
  period: string; // ISO date string
  approvedAt: string; // ISO date string
  approvedBy: string; // user ID
}

export default function PayrollPeriodPage() {
  useRequireAuth(SystemRole.PAYROLL_SPECIALIST);
  const { user } = useAuth();
  const router = useRouter();
  const [payrollPeriod, setPayrollPeriod] = useState("");
  const [approvedPeriod, setApprovedPeriod] = useState<ApprovedPeriod | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [decision, setDecision] = useState<"approve" | "reject" | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  useEffect(() => {
    // Load approved period from localStorage
    const stored = localStorage.getItem(APPROVED_PERIOD_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setApprovedPeriod(parsed);
        setPayrollPeriod(parsed.period);
      } catch (e) {
        console.error("Error parsing stored period:", e);
      }
    } else {
      // Set default to first day of current month
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      setPayrollPeriod(firstDayOfMonth.toISOString().split("T")[0]);
    }
  }, []);

  const handleApprovePeriod = () => {
    if (!payrollPeriod) {
      setError("Please select a payroll period");
      return;
    }

    setDecision("approve");
    setError(null);
    setRejectionReason("");
  };

  const handleRejectPeriod = () => {
    if (!payrollPeriod) {
      setError("Please select a payroll period");
      return;
    }

    setDecision("reject");
    setError(null);
  };

  const handleSubmitDecision = async () => {
    if (!payrollPeriod) {
      setError("Please select a payroll period");
      return;
    }

    if (decision === "reject" && !rejectionReason.trim()) {
      setError("Please provide a reason for rejection");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      if (decision === "approve") {
        // Store approved period in localStorage (frontend state only as per user story)
        const userId = user?.id || user?.userId || "unknown";
        const approved: ApprovedPeriod = {
          period: payrollPeriod,
          approvedAt: new Date().toISOString(),
          approvedBy: userId,
        };
        localStorage.setItem(APPROVED_PERIOD_KEY, JSON.stringify(approved));
        setApprovedPeriod(approved);
        setSuccess("Payroll period approved successfully! You can now create a payroll run.");
        setDecision(null);
      } else if (decision === "reject") {
        // Clear any previously approved period
        localStorage.removeItem(APPROVED_PERIOD_KEY);
        setApprovedPeriod(null);
        setSuccess("Payroll period rejected. Please edit the period and review again.");
        setDecision(null);
        setRejectionReason("");
      }
    } catch (err: any) {
      setError(err.message || "Failed to process decision");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditPeriod = () => {
    // Clear approval and allow editing
    localStorage.removeItem(APPROVED_PERIOD_KEY);
    setApprovedPeriod(null);
    setDecision(null);
    setRejectionReason("");
    setSuccess(null);
    setError(null);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="mb-8">
        <Link href="/dashboard/payroll-execution/pre-initiation">
          <Button variant="outline" className="mb-4">
            ← Back to Pre-Initiation
          </Button>
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Review Payroll Period</h1>
        <p className="text-gray-600 mt-1">
          Select and approve the payroll period before creating a payroll run
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-red-500" />
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-500" />
          <p className="text-green-700">{success}</p>
        </div>
      )}

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-6 w-6 text-blue-600" />
            Payroll Period Selection
          </CardTitle>
          <CardDescription>
            Select the payroll period. You must approve it before creating a payroll run.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current Status */}
          {approvedPeriod && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-md">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-800">Period Approved</p>
                  <p className="text-sm text-green-700">
                    {formatDate(approvedPeriod.period)} - Approved on{" "}
                    {formatDate(approvedPeriod.approvedAt)}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleEditPeriod}
                  className="text-green-700 border-green-300 hover:bg-green-100"
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </Button>
              </div>
            </div>
          )}

          {/* Period Selection */}
          <div>
            <Label htmlFor="payrollPeriod">
              Payroll Period <span className="text-red-500">*</span>
            </Label>
            <div className="mt-1 relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                id="payrollPeriod"
                type="date"
                value={payrollPeriod}
                onChange={(e) => setPayrollPeriod(e.target.value)}
                className="w-full pl-10 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={!!approvedPeriod && !decision}
                required
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Select the first day of the payroll period (month)
            </p>
          </div>

          {/* Decision Modal */}
          {decision && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-md space-y-4">
              <div className="flex items-center gap-2">
                {decision === "approve" ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600" />
                )}
                <p className="font-medium text-gray-900">
                  {decision === "approve"
                    ? "Approve Payroll Period"
                    : "Reject Payroll Period"}
                </p>
              </div>

              {decision === "reject" && (
                <div>
                  <Label htmlFor="rejectionReason">
                    Rejection Reason <span className="text-red-500">*</span>
                  </Label>
                  <textarea
                    id="rejectionReason"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="Please provide a reason for rejecting this period..."
                    required
                  />
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  onClick={handleSubmitDecision}
                  disabled={isSubmitting || (decision === "reject" && !rejectionReason.trim())}
                  className={
                    decision === "approve"
                      ? "bg-green-600 hover:bg-green-700"
                      : "bg-red-600 hover:bg-red-700"
                  }
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : decision === "approve" ? (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Confirm Approval
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4 mr-2" />
                      Confirm Rejection
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setDecision(null);
                    setRejectionReason("");
                  }}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          {!decision && !approvedPeriod && (
            <div className="flex gap-3">
              <Button
                onClick={handleApprovePeriod}
                disabled={!payrollPeriod}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve Period
              </Button>
              <Button
                onClick={handleRejectPeriod}
                disabled={!payrollPeriod}
                variant="outline"
                className="flex-1 border-red-300 text-red-700 hover:bg-red-50"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Reject Period
              </Button>
            </div>
          )}

          {/* Info Box */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> Once the payroll period is approved, the "Create Payroll Run"
              button will be enabled. The approved period will be used when creating the payroll run.
              If you reject the period, you can edit it and review again.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
