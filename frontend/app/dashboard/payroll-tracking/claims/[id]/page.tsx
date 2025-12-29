"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/use-auth";
import { useRequireAuth } from "@/lib/hooks/use-auth";
import { SystemRole } from "@/types";
import { payslipsApi } from "@/lib/api/payroll-tracking/payroll-tracking";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/shared/ui/Card";
import { Button } from "@/components/shared/ui/Button";
import { Modal } from "@/components/leaves/Modal";
import { Textarea } from "@/components/leaves/Textarea";
import { Input } from "@/components/shared/ui/Input";

interface Claim {
  _id: string;
  claimId: string;
  description: string;
  claimType: string;
  employeeId: {
    _id: string;
    firstName: string;
    lastName: string;
    employeeNumber: string;
  };
  amount: number;
  approvedAmount?: number;
  status: "under review" | "pending payroll Manager approval" | "approved" | "rejected";
  rejectionReason?: string;
  resolutionComment?: string;
  payrollSpecialistId?: {
    firstName: string;
    lastName: string;
  };
  payrollManagerId?: {
    firstName: string;
    lastName: string;
  };
  financeStaffId?: {
    firstName: string;
    lastName: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

export default function ClaimDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [claim, setClaim] = useState<Claim | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [approveComment, setApproveComment] = useState("");
  const [confirmComment, setConfirmComment] = useState("");
  const [approvedAmount, setApprovedAmount] = useState<string>("");
  const [rejectReason, setRejectReason] = useState("");
  const [processing, setProcessing] = useState(false);

  // Allow employees, payroll specialists, payroll managers, and finance staff to access
  const isPayrollSpecialist = user?.roles?.includes(SystemRole.PAYROLL_SPECIALIST);
  const isPayrollManager = user?.roles?.includes(SystemRole.PAYROLL_MANAGER);
  const isFinanceStaff = user?.roles?.includes(SystemRole.FINANCE_STAFF);
  const allowedRoles = [
    SystemRole.DEPARTMENT_EMPLOYEE,
    SystemRole.PAYROLL_SPECIALIST,
    SystemRole.PAYROLL_MANAGER,
    SystemRole.FINANCE_STAFF,
    SystemRole.SYSTEM_ADMIN
  ];
  useRequireAuth(allowedRoles);

  // Helper function to extract error message from API response
  const getErrorMessage = (err: any): string => {
    // Try to get the specific backend error message
    if (err.response?.data?.message) {
      return err.response.data.message;
    }
    if (err.message) {
      return err.message;
    }
    return "An error occurred. Please try again.";
  };

  const fetchClaim = async () => {
    try {
      const claimId = params.id as string;
      const data = await payslipsApi.getClaimById(claimId);
      setClaim(data);
      // Set approved amount to claimed amount by default
      if (data && !approvedAmount) {
        setApprovedAmount(data.amount.toString());
      }
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (params.id) {
      fetchClaim();
    }
  }, [params.id]);

  const handleApprove = async () => {
    if (!claim || !user?.id && !user?.userId) {
      setError("User ID not found");
      return;
    }

    const approvedAmountNum = approvedAmount ? parseFloat(approvedAmount) : claim.amount;
    if (isNaN(approvedAmountNum) || approvedAmountNum <= 0) {
      setError("Approved amount must be a valid positive number");
      return;
    }
    if (approvedAmountNum > claim.amount) {
      setError("Approved amount cannot exceed the claimed amount");
      return;
    }

    setProcessing(true);
    try {
      const payrollSpecialistId = user.id || user.userId;
      await payslipsApi.approveClaimBySpecialist(claim.claimId, {
        payrollSpecialistId: payrollSpecialistId!,
        approvedAmount: approvedAmountNum !== claim.amount ? approvedAmountNum : undefined,
        resolutionComment: approveComment || undefined,
      });
      setShowApproveModal(false);
      setApproveComment("");
      setApprovedAmount("");
      await fetchClaim(); // Refresh claim data
      // Redirect to pending claims page after successful approval
      setTimeout(() => {
        if (isPayrollSpecialist) {
          router.push("/dashboard/payroll-tracking/pending-claims");
        }
      }, 1500);
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!claim || !user?.id && !user?.userId) {
      setError("User ID not found");
      return;
    }

    if (!rejectReason.trim()) {
      setError("Rejection reason is required");
      return;
    }

    setProcessing(true);
    try {
      const payrollSpecialistId = user.id || user.userId;
      await payslipsApi.rejectClaimBySpecialist(claim.claimId, {
        payrollSpecialistId: payrollSpecialistId!,
        rejectionReason: rejectReason,
      });
      setShowRejectModal(false);
      setRejectReason("");
      await fetchClaim(); // Refresh claim data
      // Redirect to pending claims page after successful rejection
      setTimeout(() => {
        if (isPayrollSpecialist) {
          router.push("/dashboard/payroll-tracking/pending-claims");
        }
      }, 1500);
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setProcessing(false);
    }
  };

  const handleConfirm = async () => {
    if (!claim || !user?.id && !user?.userId) {
      setError("User ID not found");
      return;
    }

    setProcessing(true);
    setError(null); // Clear any previous errors
    try {
      const payrollManagerId = user.id || user.userId;
      await payslipsApi.confirmClaimApproval(claim.claimId, {
        payrollManagerId: payrollManagerId!,
        resolutionComment: confirmComment || undefined,
      });
      setShowConfirmModal(false);
      setConfirmComment("");
      // Show success message
      alert(`Claim ${claim.claimId} has been confirmed and forwarded to Finance for refund processing. Finance staff have been notified.`);
      await fetchClaim(); // Refresh claim data
      // Optionally redirect to manager claims page after a short delay
      setTimeout(() => {
        if (isPayrollManager) {
          router.push("/dashboard/payroll-tracking/manager-claims");
        }
      }, 2000);
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setProcessing(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateString;
    }
  };

  const getStatusBadge = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower === "approved") {
      return (
        <span className="px-4 py-2 rounded-full text-sm font-bold bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border-2 border-green-300 shadow-sm flex items-center gap-2">
          <span>✓</span>
          <span>Approved</span>
        </span>
      );
    } else if (statusLower === "rejected") {
      return (
        <span className="px-4 py-2 rounded-full text-sm font-bold bg-gradient-to-r from-red-100 to-rose-100 text-red-800 border-2 border-red-300 shadow-sm flex items-center gap-2">
          <span>✗</span>
          <span>Rejected</span>
        </span>
      );
    } else if (statusLower === "pending payroll manager approval" || statusLower.includes("pending")) {
      return (
        <span className="px-4 py-2 rounded-full text-sm font-bold bg-gradient-to-r from-yellow-100 to-amber-100 text-yellow-800 border-2 border-yellow-300 shadow-sm flex items-center gap-2 animate-pulse">
          <span>⏳</span>
          <span>Pending Manager Approval</span>
        </span>
      );
    } else {
      return (
        <span className="px-4 py-2 rounded-full text-sm font-bold bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 border-2 border-blue-300 shadow-sm flex items-center gap-2">
          <span>🔄</span>
          <span>Under Review</span>
        </span>
      );
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading claim details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !claim) {
    return (
      <div className="container mx-auto px-6 py-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-red-600 mb-4">{error || "Claim not found"}</p>
              <div className="flex gap-2 justify-center">
                <Button onClick={() => router.push("/dashboard/payroll-tracking/claims")}>
                  Back to Claims
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8 max-w-5xl">
      {/* Enhanced Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg">
            <span className="text-3xl">💵</span>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Claim Details</h1>
            <p className="text-gray-600 mt-1 flex items-center gap-2">
              <span className="font-mono bg-gray-100 px-2 py-1 rounded">{claim.claimId}</span>
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => router.push("/dashboard/payroll-tracking/claims")}
            className="flex items-center gap-2"
          >
            <span>←</span>
            <span>Back to Claims</span>
          </Button>
        </div>
      </div>

      {/* Enhanced Status Card */}
      <Card className="mb-6 shadow-lg border-2">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xl">📊</span>
              <CardTitle className="text-xl">Status</CardTitle>
            </div>
            <div className="flex items-center gap-3">
              {getStatusBadge(claim.status)}
              {/* Payroll Specialist Actions */}
              {isPayrollSpecialist && claim.status === "under review" && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setApprovedAmount(claim.amount.toString());
                      setShowApproveModal(true);
                    }}
                    className="bg-green-50 text-green-700 border-green-300 hover:bg-green-100 hover:shadow-md transition-all flex items-center gap-2"
                  >
                    <span>✓</span>
                    <span>Approve</span>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowRejectModal(true)}
                    className="bg-red-50 text-red-700 border-red-300 hover:bg-red-100 hover:shadow-md transition-all flex items-center gap-2"
                  >
                    <span>✗</span>
                    <span>Reject</span>
                  </Button>
                </div>
              )}
              {/* Payroll Manager Actions */}
              {isPayrollManager && claim.status === "pending payroll Manager approval" && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowConfirmModal(true)}
                    className="bg-blue-50 text-blue-700 border-blue-300 hover:bg-blue-100 hover:shadow-md transition-all flex items-center gap-2"
                  >
                    <span>✓</span>
                    <span>Confirm Approval</span>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Enhanced Claim Information */}
      <Card className="mb-6 shadow-lg border-2">
        <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b">
          <div className="flex items-center gap-3">
            <span className="text-xl">📋</span>
            <CardTitle className="text-xl">Claim Information</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-6">
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Claim Type</p>
              <p className="text-gray-900 font-bold text-lg">{claim.claimType}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Description</p>
              <p className="text-gray-900 leading-relaxed">{claim.description}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border-2 border-blue-200">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Claimed Amount</p>
                <p className="text-3xl font-bold text-gray-900">
                  {formatCurrency(claim.amount)}
                </p>
              </div>
              {claim.approvedAmount !== undefined && claim.approvedAmount !== null && (
                <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border-2 border-green-200">
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Approved Amount</p>
                  <p className="text-3xl font-bold text-green-700">
                    {formatCurrency(claim.approvedAmount)}
                  </p>
                </div>
              )}
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Created</p>
                <p className="text-gray-900 font-medium">{formatDate(claim.createdAt)}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Last Updated</p>
                <p className="text-gray-900 font-medium">{formatDate(claim.updatedAt)}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reviewers Information */}
      {(claim.payrollSpecialistId || claim.payrollManagerId || claim.financeStaffId) && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Reviewers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {claim.payrollSpecialistId && (
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Payroll Specialist</p>
                  <p className="text-gray-900">
                    {claim.payrollSpecialistId.firstName} {claim.payrollSpecialistId.lastName}
                  </p>
                </div>
              )}
              {claim.payrollManagerId && (
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Payroll Manager</p>
                  <p className="text-gray-900">
                    {claim.payrollManagerId.firstName} {claim.payrollManagerId.lastName}
                  </p>
                </div>
              )}
              {claim.financeStaffId && (
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Finance Staff</p>
                  <p className="text-gray-900">
                    {claim.financeStaffId.firstName} {claim.financeStaffId.lastName}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rejection Reason */}
      {claim.rejectionReason && (
        <Card className="mb-6 border-red-300 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-900">Rejection Reason</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-800">{claim.rejectionReason}</p>
          </CardContent>
        </Card>
      )}

      {/* Resolution Comment */}
      {claim.resolutionComment && (
        <Card className="mb-6 border-green-300 bg-green-50">
          <CardHeader>
            <CardTitle className="text-green-900">Resolution Comment</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-green-800">{claim.resolutionComment}</p>
          </CardContent>
        </Card>
      )}

      {/* Status Timeline */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <span className="text-xl">ℹ️</span>
            <div>
              <p className="font-semibold text-blue-900 mb-1">Multi-Step Approval Workflow</p>
              <p className="text-sm text-blue-800 mb-3">
                {isPayrollManager
                  ? "As a Payroll Manager, you can confirm approval of expense claims, so that finance staff can be notified. (multi-step approval) Only approved claims will reach you for confirmation."
                  : isPayrollSpecialist
                  ? "As a Payroll Specialist, you can approve/reject expense claims, so that they can be escalated to the Payroll Manager in case of approval."
                  : "Your claim goes through the following stages:"}
              </p>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${claim.status === "under review" ? "bg-blue-600" : "bg-green-500"}`}></div>
                  <span className={`text-sm ${claim.status === "under review" ? "font-semibold text-blue-900" : "text-blue-800"}`}>
                    <strong>Step 1 - Under Review:</strong> Payroll specialist reviews the claim
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${claim.status === "pending payroll Manager approval" ? "bg-yellow-500" : claim.status === "approved" || claim.status === "rejected" ? "bg-green-500" : "bg-gray-300"}`}></div>
                  <span className={`text-sm ${claim.status === "pending payroll Manager approval" ? "font-semibold text-yellow-900" : "text-blue-800"}`}>
                    <strong>Step 2 - Pending Manager Approval:</strong> Specialist approved, awaiting manager confirmation
                    {isPayrollManager && claim.status === "pending payroll Manager approval" && (
                      <span className="ml-2 text-yellow-700 font-bold">← You are here</span>
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${claim.status === "approved" ? "bg-green-500" : "bg-gray-300"}`}></div>
                  <span className={`text-sm ${claim.status === "approved" ? "font-semibold text-green-900" : "text-blue-800"}`}>
                    <strong>Step 3 - Approved:</strong> Manager confirmed, Finance notified for refund processing
                  </span>
                </div>
                {claim.status === "rejected" && (
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <span className="text-sm font-semibold text-red-900">
                      <strong>Rejected:</strong> Claim was rejected with a reason provided
                    </span>
                  </div>
                )}
              </div>
              {isPayrollManager && claim.status === "pending payroll Manager approval" && (
                <div className="mt-4 p-3 bg-yellow-100 border border-yellow-300 rounded-lg">
                  <p className="text-sm font-semibold text-yellow-900 mb-1">Your Action Required</p>
                  <p className="text-sm text-yellow-800">
                    This claim has been approved by a Payroll Specialist. Please review and confirm the approval.
                    Once confirmed, Finance Staff will be automatically notified to process the refund.
                  </p>
                </div>
              )}
              {!isPayrollManager && !isPayrollSpecialist && (
                <p className="text-sm text-blue-800 mt-3">
                  <strong>Note:</strong> If your claim is approved, the approved amount may differ from the claimed amount
                  based on company policies and expense limits. The reimbursement will be processed in the next payroll cycle.
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Approve Modal */}
      <Modal
        isOpen={showApproveModal}
        onClose={() => {
          setShowApproveModal(false);
          setApproveComment("");
          setApprovedAmount(claim?.amount.toString() || "");
        }}
        title="Approve Claim"
        size="md"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => {
                setShowApproveModal(false);
                setApproveComment("");
                setApprovedAmount(claim?.amount.toString() || "");
              }}
              disabled={processing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleApprove}
              disabled={processing}
              className="bg-green-600 hover:bg-green-700"
            >
              {processing ? "Approving..." : "Approve Claim"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Approving this claim will escalate it to the Payroll Manager for final confirmation.
            The employee will be notified of the status change.
          </p>
          <div>
            <label htmlFor="approved-amount" className="block text-sm font-medium text-gray-700 mb-1">
              Approved Amount <span className="text-gray-500">(defaults to claimed amount)</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
              <Input
                id="approved-amount"
                type="number"
                step="0.01"
                min="0.01"
                max={claim?.amount}
                value={approvedAmount}
                onChange={(e) => setApprovedAmount(e.target.value)}
                className="pl-7"
                placeholder={claim?.amount.toString()}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Claimed: {formatCurrency(claim?.amount || 0)} | 
              Approved: {approvedAmount ? formatCurrency(parseFloat(approvedAmount) || 0) : formatCurrency(claim?.amount || 0)}
            </p>
            {approvedAmount && parseFloat(approvedAmount) > (claim?.amount || 0) && (
              <p className="text-xs text-red-500 mt-1">
                Approved amount cannot exceed claimed amount
              </p>
            )}
          </div>
          <div>
            <label htmlFor="approve-comment" className="block text-sm font-medium text-gray-700 mb-1">
              Resolution Comment (Optional)
            </label>
            <Textarea
              id="approve-comment"
              value={approveComment}
              onChange={(e) => setApproveComment(e.target.value)}
              placeholder="Add any comments about your approval decision..."
              rows={4}
              className="mt-1"
            />
            <p className="text-xs text-gray-500 mt-1">
              {approveComment.length} characters
            </p>
          </div>
        </div>
      </Modal>

      {/* Reject Modal */}
      <Modal
        isOpen={showRejectModal}
        onClose={() => {
          setShowRejectModal(false);
          setRejectReason("");
        }}
        title="Reject Claim"
        size="md"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => {
                setShowRejectModal(false);
                setRejectReason("");
              }}
              disabled={processing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleReject}
              disabled={processing || !rejectReason.trim()}
              className="bg-red-600 hover:bg-red-700"
            >
              {processing ? "Rejecting..." : "Reject Claim"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Please provide a clear reason for rejecting this claim. The employee will be notified
            with this reason.
          </p>
          <div>
            <label htmlFor="reject-reason" className="block text-sm font-medium text-gray-700 mb-1">
              Rejection Reason <span className="text-red-500">*</span>
            </label>
            <Textarea
              id="reject-reason"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Explain why this claim is being rejected..."
              rows={4}
              className="mt-1"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              {rejectReason.length} characters (minimum 5 required)
            </p>
            {rejectReason.length > 0 && rejectReason.length < 5 && (
              <p className="text-xs text-red-500 mt-1">
                Rejection reason must be at least 5 characters long
              </p>
            )}
          </div>
        </div>
      </Modal>

      {/* Confirm Approval Modal (Payroll Manager) */}
      <Modal
        isOpen={showConfirmModal}
        onClose={() => {
          setShowConfirmModal(false);
          setConfirmComment("");
        }}
        title="Confirm Claim Approval"
        size="md"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => {
                setShowConfirmModal(false);
                setConfirmComment("");
              }}
              disabled={processing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={processing}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {processing ? "Confirming..." : "Confirm Approval"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm font-semibold text-blue-900 mb-2">Multi-Step Approval Process</p>
            <p className="text-sm text-blue-800 mb-2">
              This claim has been reviewed and approved by a Payroll Specialist. As the Payroll Manager,
              your confirmation is the final step before Finance processes the refund.
            </p>
            <div className="mt-2 space-y-1 text-xs text-blue-700">
              <p>✓ Payroll Specialist has approved</p>
              <p>→ <strong>You are confirming</strong> (current step)</p>
              <p>→ Finance will be notified automatically</p>
              <p>→ Refund will be processed in next payroll cycle</p>
            </div>
          </div>
          
          {claim && claim.approvedAmount && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-sm font-medium text-green-900 mb-1">Approved Amount by Specialist:</p>
              <p className="text-lg font-bold text-green-700">
                {formatCurrency(claim.approvedAmount)}
              </p>
              <p className="text-xs text-green-600 mt-1">
                (Original claim: {formatCurrency(claim.amount)})
              </p>
            </div>
          )}
          
          {claim?.payrollSpecialistId && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <p className="text-sm font-medium text-gray-700 mb-1">Reviewed by:</p>
              <p className="text-sm text-gray-900">
                {claim.payrollSpecialistId.firstName} {claim.payrollSpecialistId.lastName}
              </p>
              {claim.resolutionComment && (
                <div className="mt-2 pt-2 border-t border-gray-200">
                  <p className="text-xs font-medium text-gray-600 mb-1">Specialist Comment:</p>
                  <p className="text-xs text-gray-700">{claim.resolutionComment}</p>
                </div>
              )}
            </div>
          )}
          
          <div>
            <label htmlFor="confirm-comment" className="block text-sm font-medium text-gray-700 mb-1">
              Your Confirmation Comment (Optional)
            </label>
            <Textarea
              id="confirm-comment"
              value={confirmComment}
              onChange={(e) => setConfirmComment(e.target.value)}
              placeholder="Add any comments about your confirmation decision..."
              rows={4}
              className="mt-1"
            />
            <p className="text-xs text-gray-500 mt-1">
              {confirmComment.length} characters
            </p>
          </div>
          
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-xs font-semibold text-yellow-900 mb-1">⚠️ What happens next:</p>
            <ul className="text-xs text-yellow-800 space-y-1 list-disc list-inside">
              <li>Finance Staff will be automatically notified</li>
              <li>The employee will receive a confirmation notification</li>
              <li>Refund will be included in the next payroll cycle</li>
            </ul>
          </div>
        </div>
      </Modal>
    </div>
  );
}

