"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/hooks/use-auth";
import { useRequireAuth } from "@/lib/hooks/use-auth";
import { SystemRole } from "@/types";
import { payrollExecutionApi } from "@/lib/api/payroll-execution/payroll-execution";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/shared/ui/Card";
import { Button } from "@/components/shared/ui/Button";
import { Label } from "@/components/shared/ui/Label";
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  FileText,
  DollarSign,
  Users,
  Calendar,
  Eye,
} from "lucide-react";

interface PayrollRun {
  _id: string;
  runId: string;
  payrollPeriod: string;
  status: string;
  entity: string;
  employees: number;
  totalnetpay: number;
  paymentStatus?: string;
  financeStaffId?: string;
  managerApprovalDate?: string;
  exceptions?: number;
}

function FinanceApprovalPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  useRequireAuth(SystemRole.FINANCE_STAFF);

  // Get view from query params: 'pending' (default) or 'history'
  const view = searchParams.get("view") || "pending";

  const [payrollRuns, setPayrollRuns] = useState<PayrollRun[]>([]);
  const [selectedPayrollRun, setSelectedPayrollRun] = useState<PayrollRun | null>(null);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [decision, setDecision] = useState<"approve" | "reject" | null>(null);
  const [reason, setReason] = useState("");
  const [showDecisionModal, setShowDecisionModal] = useState(false);

  useEffect(() => {
    fetchPayrollRuns();
  }, []);

  const fetchPayrollRuns = async () => {
    setLoading(true);
    setError(null);
    try {
      const runsResponse = await payrollExecutionApi.getAllPayrollRuns({
        limit: 1000,
      });

      let runsData: any[] = [];
      if (Array.isArray(runsResponse)) {
        runsData = runsResponse;
      } else if (Array.isArray((runsResponse as any)?.data)) {
        runsData = (runsResponse as any).data;
      } else if (Array.isArray((runsResponse as any)?.data?.items)) {
        runsData = (runsResponse as any).data.items;
      }

      setPayrollRuns(runsData);
    } catch (err: any) {
      setError(err.message || "Failed to load payroll runs");
    } finally {
      setLoading(false);
    }
  };

  // Use useMemo to filter runs based on view and user, avoiding dependency array issues
  const filteredRuns = useMemo(() => {
    const currentUserId = (user?.userId?.toString() || user?.id?.toString() || "").trim();
    
    if (view === "history") {
      // Show history: approved runs with paid status, locked, unlocked, or rejected by finance
      return payrollRuns.filter((run) => {
        const status = run.status?.toLowerCase()?.trim() || "";
        const paymentStatus = run.paymentStatus?.toLowerCase()?.trim() || "";
        
        // Show runs that have been approved by finance (status = approved, paymentStatus = paid)
        // or other final statuses (locked, unlocked, rejected)
        return (
          (status === "approved" && paymentStatus === "paid") ||
          status === "locked" ||
          status === "unlocked" ||
          (status === "rejected" && run.financeStaffId) // Rejected by finance (has financeStaffId)
        );
      });
    } else {
      // Default view: Show only payroll runs pending finance approval that are assigned to current user
      return payrollRuns.filter((run) => {
        const status = run.status?.toLowerCase()?.trim() || "";
        const statusMatch =
          status === "pending finance approval" ||
          status === "pending_finance_approval";
        
        if (!statusMatch) {
          return false;
        }
        
        // If financeStaffId is set, check if it matches current user
        if (run.financeStaffId) {
          // Try multiple user ID fields and normalize for comparison
          let financeIdToCompare = "";
          if (typeof run.financeStaffId === 'object' && run.financeStaffId !== null) {
            // Handle ObjectId or populated object
            financeIdToCompare = (run.financeStaffId as any)?._id?.toString()?.trim() || 
                                 (run.financeStaffId as any)?.id?.toString()?.trim() || 
                                 String(run.financeStaffId).trim();
          } else {
            // Handle string case
            financeIdToCompare = String(run.financeStaffId).trim();
          }
          
          return financeIdToCompare === currentUserId;
        }
        
        // If no financeStaffId is set, show all pending finance approval runs
        // (any finance staff can approve)
        return true;
      });
    }
  }, [payrollRuns, view, user?.userId, user?.id]);

  const handleDecision = (run: PayrollRun, decisionType: "approve" | "reject") => {
    setSelectedPayrollRun(run);
    setDecision(decisionType);
    setReason("");
    setShowDecisionModal(true);
  };

  const handleSubmitDecision = async () => {
    if (!selectedPayrollRun || !decision) {
      setError("Please select a decision");
      return;
    }

    if (decision === "reject" && !reason.trim()) {
      setError("Please provide a reason for rejection");
      return;
    }

    setProcessing(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await payrollExecutionApi.financeApproval({
        payrollRunId: selectedPayrollRun._id,
        decision,
        reason: decision === "reject" ? reason : undefined,
        financeStaffId: user?.userId,
      });

      if (decision === "approve") {
        setSuccess(
          `Payroll run ${(response as any)?.runId || selectedPayrollRun.runId} has been approved successfully! Payment status is now "Paid".`
        );
      } else {
        setSuccess(
          `Payroll run ${(response as any)?.runId || selectedPayrollRun.runId} has been rejected successfully!`
        );
      }

      setShowDecisionModal(false);
      setSelectedPayrollRun(null);
      setDecision(null);
      setReason("");

      // Refresh the list
      setTimeout(() => {
        fetchPayrollRuns();
        setSuccess(null);
      }, 2000);
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        `Failed to ${decision === "approve" ? "approve" : "reject"} payroll run`;
      setError(errorMessage);
      console.error("Error processing decision:", err);
    } finally {
      setProcessing(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount || 0);
  };

  const getStatusBadge = (status: string, paymentStatus?: string) => {
    const statusLower = status.toLowerCase();
    const paymentStatusLower = paymentStatus?.toLowerCase() || "";
    
    if (statusLower === "pending finance approval" || statusLower === "pending_finance_approval") {
      return (
        <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-semibold">
          Pending Finance Approval
        </span>
      );
    } else if (statusLower === "approved" && paymentStatusLower === "paid") {
      return (
        <div className="flex flex-col gap-1">
          <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-semibold">
            Approved
          </span>
          <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">
            Payment Status: Paid
          </span>
        </div>
      );
    } else if (statusLower === "approved") {
      return (
        <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-semibold">
          Approved
        </span>
      );
    } else if (statusLower === "rejected") {
      return (
        <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-semibold">
          Rejected
        </span>
      );
    } else if (statusLower === "locked") {
      return (
        <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-semibold">
          Locked
        </span>
      );
    } else if (statusLower === "unlocked") {
      return (
        <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm font-semibold">
          Unlocked
        </span>
      );
    }
    return (
      <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm">
        {status}
      </span>
    );
  };

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          {view === "history" ? "Payroll Approval History" : "Approve Payroll Disbursements"}
        </h1>
        <p className="text-gray-600 mt-1">
          {view === "history"
            ? "View previously approved or rejected payroll runs and their payment status."
            : "As Finance Staff, approve payroll disbursements before execution so that no incorrect payments are made. Upon approval, payment status will be set to 'Paid'."}
        </p>
        {/* View Toggle */}
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => router.push("/dashboard/payroll-execution/finance-approval?view=pending")}
            className={`px-4 py-2 rounded-md font-medium transition ${
              view === "pending"
                ? "bg-indigo-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            Pending Approvals
          </button>
          <button
            onClick={() => router.push("/dashboard/payroll-execution/finance-approval?view=history")}
            className={`px-4 py-2 rounded-md font-medium transition ${
              view === "history"
                ? "bg-indigo-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            Approval History
          </button>
        </div>
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

      {loading ? (
        <Card>
          <CardContent className="py-12 text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">Loading payroll runs...</p>
          </CardContent>
        </Card>
      ) : filteredRuns.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 text-lg mb-2">
              {view === "history"
                ? "No payroll approval history found"
                : "No payroll runs pending finance approval"}
            </p>
            <p className="text-gray-500 text-sm">
              {view === "history"
                ? "Approved, paid, locked, or rejected payroll runs will appear here."
                : "Payroll runs will appear here after they have been approved by the Payroll Manager. Once you approve a payroll run, its payment status will be set to 'Paid' and payments will be authorized."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {filteredRuns.map((run) => (
            <Card key={run._id} className="border-2 border-blue-200">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-blue-600" />
                      {run.runId}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      Payroll Period: {formatDate(run.payrollPeriod)}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(run.status, run.paymentStatus)}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2 text-gray-600 mb-1">
                      <Calendar className="h-4 w-4" />
                      <span className="text-sm">Period</span>
                    </div>
                    <p className="font-semibold text-gray-900">
                      {formatDate(run.payrollPeriod)}
                    </p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2 text-gray-600 mb-1">
                      <Users className="h-4 w-4" />
                      <span className="text-sm">Employees</span>
                    </div>
                    <p className="font-semibold text-gray-900">{run.employees}</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2 text-gray-600 mb-1">
                      <DollarSign className="h-4 w-4" />
                      <span className="text-sm">Total Net Pay</span>
                    </div>
                    <p className="font-semibold text-gray-900">
                      {formatCurrency(run.totalnetpay)}
                    </p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2 text-gray-600 mb-1">
                      <AlertCircle className="h-4 w-4" />
                      <span className="text-sm">Exceptions</span>
                    </div>
                    <p className="font-semibold text-gray-900">
                      {run.exceptions || 0}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 pt-4 border-t">
                  <Button
                    onClick={() => router.push(`/dashboard/payroll-execution/preview?payrollRunId=${run._id}`)}
                    variant="outline"
                    className="flex-1"
                  >
                    <Eye className="h-5 w-5 mr-2" />
                    {view === "history" ? "View Details" : "View Details"}
                  </Button>
                  {view === "pending" && (
                    <>
                      <Button
                        onClick={() => handleDecision(run, "approve")}
                        className="bg-green-600 hover:bg-green-700 text-white flex-1"
                        disabled={processing}
                      >
                        <CheckCircle className="h-5 w-5 mr-2" />
                        Approve Disbursement
                      </Button>
                      <Button
                        onClick={() => handleDecision(run, "reject")}
                        variant="danger"
                        className="flex-1"
                        disabled={processing}
                      >
                        <XCircle className="h-5 w-5 mr-2" />
                        Reject
                      </Button>
                    </>
                  )}
                  {view === "history" && run.paymentStatus?.toLowerCase() === "paid" && (
                    <div className="flex-1 px-4 py-2 bg-green-50 border border-green-200 rounded-md">
                      <p className="text-sm font-semibold text-green-800">
                        ✓ Payment Status: Paid
                      </p>
                      <p className="text-xs text-green-700 mt-1">
                        This payroll run has been approved and payments are authorized.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Decision Modal */}
      {showDecisionModal && selectedPayrollRun && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>
                {decision === "approve"
                  ? "Approve Payroll Disbursement"
                  : "Reject Payroll Disbursement"}
              </CardTitle>
              <CardDescription>
                {decision === "approve"
                  ? "Confirm approval of this payroll run. Upon approval, payment status will be set to 'Paid' and payments will be authorized. Please ensure all amounts and employee details are correct before proceeding."
                  : "Provide a reason for rejecting this payroll run."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-sm text-gray-600 mb-1">Payroll Run:</p>
                <p className="font-semibold text-gray-900">{selectedPayrollRun.runId}</p>
                <p className="text-sm text-gray-600 mt-2">
                  Period: {formatDate(selectedPayrollRun.payrollPeriod)}
                </p>
                <p className="text-sm text-gray-600">
                  Total Net Pay: {formatCurrency(selectedPayrollRun.totalnetpay)}
                </p>
              </div>

              {decision === "reject" && (
                <div className="mb-4">
                  <Label htmlFor="reason">Rejection Reason *</Label>
                  <textarea
                    id="reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    rows={4}
                    placeholder="Please provide a reason for rejecting this payroll run..."
                    required
                  />
                </div>
              )}

              {decision === "approve" && (
                <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                  <p className="text-sm text-yellow-800">
                    <strong>Important:</strong> Approving this payroll run will:
                  </p>
                  <ul className="text-sm text-yellow-800 mt-2 list-disc list-inside space-y-1">
                    <li>Set payment status to <strong>"Paid"</strong></li>
                    <li>Authorize payments for all employees in this payroll run</li>
                    <li>Change payroll run status to "Approved"</li>
                  </ul>
                  <p className="text-sm text-yellow-800 mt-2">
                    Please ensure all amounts and employee details are correct before proceeding.
                  </p>
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  onClick={() => {
                    setShowDecisionModal(false);
                    setSelectedPayrollRun(null);
                    setDecision(null);
                    setReason("");
                  }}
                  variant="outline"
                  className="flex-1"
                  disabled={processing}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmitDecision}
                  className={`flex-1 ${
                    decision === "approve"
                      ? "bg-green-600 hover:bg-green-700"
                      : "bg-red-600 hover:bg-red-700"
                  } text-white`}
                  disabled={processing || (decision === "reject" && !reason.trim())}
                >
                  {processing ? (
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
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="mt-8">
        <Button
          onClick={() => router.push("/dashboard/finance")}
          variant="outline"
        >
          ← Back to Finance Dashboard
        </Button>
      </div>
    </div>
  );
}

export default function FinanceApprovalPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      </div>
    }>
      <FinanceApprovalPageContent />
    </Suspense>
  );
}

