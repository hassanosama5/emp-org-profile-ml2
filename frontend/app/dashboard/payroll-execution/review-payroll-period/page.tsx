"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useRequireAuth } from "@/lib/hooks/use-auth";
import { SystemRole } from "@/types";
import { payrollExecutionApi } from "@/lib/api/payroll-execution/payroll-execution";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/shared/ui/Card";
import { Button } from "@/components/shared/ui/Button";
import { Input } from "@/components/shared/ui/Input";
import { Toast, useToast } from "@/components/leaves/Toast";
import { CheckCircle, XCircle, AlertCircle, Calendar, Building2, Users, DollarSign } from "lucide-react";
import { PayrollRun, PayrollStatus, ReviewPayrollPeriodDto } from "@/types/payroll-execution";

export default function ReviewPayrollPeriodPage() {
  const router = useRouter();
  useRequireAuth(SystemRole.PAYROLL_SPECIALIST);

  const [payrollRuns, setPayrollRuns] = useState<PayrollRun[]>([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedRun, setSelectedRun] = useState<PayrollRun | null>(null);
  const [decision, setDecision] = useState<"approve" | "reject" | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  
  // Toast notification
  const { toast, showToast, hideToast } = useToast();

  useEffect(() => {
    fetchPayrollRuns();
  }, []);

  const fetchPayrollRuns = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await payrollExecutionApi.getAllPayrollRuns({
        status: PayrollStatus.DRAFT,
        limit: 100,
      });
      // Handle both paginated response and direct array
      const runs = response.data || response || [];
      setPayrollRuns(Array.isArray(runs) ? runs : []);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || "Failed to load payroll runs";
      setError(errorMessage);
      showToast(errorMessage, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectRun = (run: PayrollRun) => {
    setSelectedRun(run);
    setDecision(null);
    setRejectionReason("");
    setError(null);
    setSuccess(null);
  };

  const handleReview = async () => {
    if (!selectedRun || !decision) {
      const errorMsg = "Please select a payroll run and decision";
      setError(errorMsg);
      showToast(errorMsg, "warning");
      return;
    }

    if (decision === "reject" && !rejectionReason.trim()) {
      const errorMsg = "Please provide a rejection reason";
      setError(errorMsg);
      showToast(errorMsg, "warning");
      return;
    }

    setProcessing(true);
    setError(null);
    setSuccess(null);

    try {
      // Frontend-only workflow: Update status in frontend state
      // Then call backend to update the actual status
      const status = decision === "approve" ? PayrollStatus.APPROVED : PayrollStatus.REJECTED;
      
      const reviewDto: ReviewPayrollPeriodDto = {
        payrollRunId: selectedRun._id,
        status: status,
        rejectionReason: decision === "reject" ? rejectionReason : undefined,
      };

      await payrollExecutionApi.reviewPayrollPeriod(reviewDto);

      const successMessage = `Payroll period ${selectedRun.runId} has been ${decision === "approve" ? "approved" : "rejected"} successfully!`;
      setSuccess(successMessage);
      showToast(successMessage, "success");
      
      // Clear selection
      setSelectedRun(null);
      setDecision(null);
      setRejectionReason("");
      
      // Refresh list after a short delay
      setTimeout(() => {
        fetchPayrollRuns();
        setSuccess(null);
      }, 2000);
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        `Failed to ${decision === "approve" ? "approve" : "reject"} payroll period`;
      setError(errorMessage);
      showToast(errorMessage, "error");
    } finally {
      setProcessing(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount || 0);
  };

  return (
    <div className="container mx-auto px-6 py-8">
      {/* Toast Notification */}
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
      />

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Review Payroll Period
        </h1>
        <p className="text-gray-600 mt-1">
          Review and approve or reject payroll periods. This workflow is handled entirely on the frontend.
        </p>
      </div>

      {/* Error/Success Messages */}
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payroll Runs List */}
        <Card>
          <CardHeader>
            <CardTitle>Payroll Runs Pending Review</CardTitle>
            <CardDescription>
              Select a payroll run to review and approve or reject its period
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-gray-500">Loading payroll runs...</div>
            ) : payrollRuns.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No payroll runs in DRAFT status found.</p>
                <p className="text-sm mt-2">All payroll runs have been reviewed or are in a different status.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {payrollRuns.map((run) => (
                  <div
                    key={run._id}
                    onClick={() => handleSelectRun(run)}
                    className={`p-4 border rounded-lg cursor-pointer transition-all ${
                      selectedRun?._id === run._id
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-semibold text-gray-900">{run.runId}</span>
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            run.status === PayrollStatus.DRAFT
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-gray-100 text-gray-800"
                          }`}>
                            {run.status}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            <span>{formatDate(run.payrollPeriod)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Building2 className="h-4 w-4" />
                            <span>{run.entity}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            <span>{run.employees || 0} employees</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-4 w-4" />
                            <span>{formatCurrency(run.totalnetpay || 0)}</span>
                          </div>
                        </div>
                      </div>
                      {selectedRun?._id === run._id && (
                        <CheckCircle className="h-5 w-5 text-blue-500" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Review Form */}
        <Card>
          <CardHeader>
            <CardTitle>Review Decision</CardTitle>
            <CardDescription>
              {selectedRun
                ? `Review payroll period for ${selectedRun.runId}`
                : "Select a payroll run to review"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!selectedRun ? (
              <div className="text-center py-8 text-gray-500">
                <AlertCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>Please select a payroll run from the list to review.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Selected Run Details */}
                <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Run ID:</span>
                    <span className="font-semibold text-gray-900">{selectedRun.runId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Period:</span>
                    <span className="font-semibold text-gray-900">{formatDate(selectedRun.payrollPeriod)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Entity:</span>
                    <span className="font-semibold text-gray-900">{selectedRun.entity}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Employees:</span>
                    <span className="font-semibold text-gray-900">{selectedRun.employees || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Total Net Pay:</span>
                    <span className="font-semibold text-gray-900">{formatCurrency(selectedRun.totalnetpay || 0)}</span>
                  </div>
                </div>

                {/* Review Decision */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Review Decision <span className="text-red-500">*</span>
                  </label>
                  <div className="space-y-2">
                    <label
                      className={`flex items-center p-3 border rounded-md cursor-pointer transition-all ${
                        decision === "approve"
                          ? "border-green-500 bg-green-50"
                          : "border-gray-300 hover:border-gray-400"
                      }`}
                    >
                      <input
                        type="radio"
                        name="decision"
                        value="approve"
                        checked={decision === "approve"}
                        onChange={(e) => setDecision(e.target.value as "approve")}
                        className="mr-3"
                      />
                      <CheckCircle className="h-5 w-5 mr-2 text-green-600" />
                      <span className="font-medium text-green-700">Approve</span>
                    </label>
                    <label
                      className={`flex items-center p-3 border rounded-md cursor-pointer transition-all ${
                        decision === "reject"
                          ? "border-red-500 bg-red-50"
                          : "border-gray-300 hover:border-gray-400"
                      }`}
                    >
                      <input
                        type="radio"
                        name="decision"
                        value="reject"
                        checked={decision === "reject"}
                        onChange={(e) => setDecision(e.target.value as "reject")}
                        className="mr-3"
                      />
                      <XCircle className="h-5 w-5 mr-2 text-red-600" />
                      <span className="font-medium text-red-700">Reject</span>
                    </label>
                  </div>
                </div>

                {/* Rejection Reason */}
                {decision === "reject" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Rejection Reason <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="Please provide a reason for rejecting this payroll period..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      rows={4}
                      required
                    />
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={handleReview}
                    disabled={processing || !decision || (decision === "reject" && !rejectionReason.trim())}
                    className={`flex-1 ${
                      decision === "approve"
                        ? "bg-green-600 hover:bg-green-700"
                        : decision === "reject"
                        ? "bg-red-600 hover:bg-red-700"
                        : "bg-gray-400"
                    }`}
                  >
                    {processing
                      ? "Processing..."
                      : decision === "approve"
                      ? "Confirm Approval"
                      : decision === "reject"
                      ? "Confirm Rejection"
                      : "Submit Review"}
                  </Button>
                  <Button
                    onClick={() => {
                      setSelectedRun(null);
                      setDecision(null);
                      setRejectionReason("");
                      setError(null);
                      setSuccess(null);
                    }}
                    disabled={processing}
                    variant="outline"
                  >
                    Clear Selection
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

