"use client";

import { useEffect, useState, Suspense } from "react";
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
  Users,
  DollarSign,
  Calendar,
  Eye,
  Search,
} from "lucide-react";

interface PayrollRun {
  _id: string;
  runId: string;
  payrollPeriod: string;
  status: string;
  entity: string;
  employees: number;
  totalnetpay: number;
  exceptions?: number;
  payrollManagerId?: string;
  financeStaffId?: string;
  createdAt?: string;
}

function ManagerApprovalPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  useRequireAuth(SystemRole.PAYROLL_MANAGER);

  // Get view from query params: 'pending' (default) or 'history'
  const view = searchParams.get("view") || "pending";

  const [payrollRuns, setPayrollRuns] = useState<PayrollRun[]>([]);
  const [filteredRuns, setFilteredRuns] = useState<PayrollRun[]>([]);
  const [selectedPayrollRun, setSelectedPayrollRun] = useState<PayrollRun | null>(null);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [decision, setDecision] = useState<"approve" | "reject" | null>(null);
  const [comments, setComments] = useState("");
  const [showDecisionModal, setShowDecisionModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchPayrollRuns();
  }, []);

  useEffect(() => {
    filterRuns();
  }, [payrollRuns, searchTerm, user, view]);

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

      // Debug logging to understand what we're getting
      if (process.env.NODE_ENV === 'development') {
        console.log('Manager Approval - All Payroll Runs:', {
          total: runsData.length,
          runs: runsData.map(r => ({
            runId: r.runId,
            status: r.status,
            payrollManagerId: r.payrollManagerId,
            currentUserId: user?.userId || user?.id,
          })),
        });
      }

      setPayrollRuns(runsData);
    } catch (err: any) {
      setError(err.message || "Failed to load payroll runs");
      console.error("Error fetching payroll runs:", err);
    } finally {
      setLoading(false);
    }
  };

  const filterRuns = () => {
    let filtered: PayrollRun[] = [];

    if (view === "history") {
      // Show history: approved, rejected, locked, unlocked, pending finance approval
      // These are runs that have already been processed by the manager
      filtered = payrollRuns.filter((run) => {
        const status = run.status?.toLowerCase()?.trim() || "";
        return (
          status === "approved" ||
          status === "rejected" ||
          status === "locked" ||
          status === "unlocked" ||
          status === "pending finance approval" ||
          status === "pending_finance_approval"
        );
      });
    } else {
      // Default view: Show payroll runs that need manager approval (pending)
      // Accept multiple status variations that indicate pending manager approval
      filtered = payrollRuns.filter((run) => {
        const status = run.status?.toLowerCase()?.trim() || "";
        
        // Check for various status formats that indicate pending manager approval
        const statusMatch =
          status === "under review" ||
          status === "under_review" ||
          status === "pending approval" ||
          status === "pending_approval" ||
          status === "pending manager approval" ||
          status === "pending_manager_approval" ||
          status === "awaiting manager approval" ||
          status === "awaiting_manager_approval";
        
        if (!statusMatch) {
          return false;
        }
        
        // If payrollManagerId is set, check if it matches current user
        if (run.payrollManagerId) {
          // Try multiple user ID fields and normalize for comparison
          let managerIdToCompare = "";
          if (typeof run.payrollManagerId === 'object' && run.payrollManagerId !== null) {
            // Handle ObjectId or populated object
            managerIdToCompare = (run.payrollManagerId as any)?._id?.toString()?.trim() || 
                                 (run.payrollManagerId as any)?.id?.toString()?.trim() || 
                                 String(run.payrollManagerId).trim();
          } else {
            managerIdToCompare = String(run.payrollManagerId).trim();
          }
          
          const currentUserId = (user?.userId?.toString() || user?.id?.toString() || "").trim();
          
          const matches = managerIdToCompare === currentUserId;
          
          // Debug logging for ID matching
          if (process.env.NODE_ENV === 'development') {
            console.log('ID Matching Debug:', {
              runId: run.runId,
              status: run.status,
              statusMatch,
              managerIdRaw: run.payrollManagerId,
              managerIdType: typeof run.payrollManagerId,
              managerIdToCompare,
              currentUserId,
              matches,
              willShow: matches,
            });
          }
          
          return matches;
        }
        
        // If no manager assigned, show all runs needing approval (any manager can approve)
        if (process.env.NODE_ENV === 'development') {
          console.log('Run with no manager assigned:', {
            runId: run.runId,
            status: run.status,
            statusMatch,
            willShow: true,
          });
        }
        return true;
      });
    }

    // Filter by search term
    let finalFiltered = filtered;
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      finalFiltered = filtered.filter(
        (run) =>
          run.runId?.toLowerCase().includes(searchLower) ||
          run.entity?.toLowerCase().includes(searchLower) ||
          formatDate(run.payrollPeriod).toLowerCase().includes(searchLower)
      );
    }

    setFilteredRuns(finalFiltered);
    
    // Debug logging (remove in production)
    if (process.env.NODE_ENV === 'development') {
      console.log('Manager Approval Filter Debug:', {
        view,
        totalRuns: payrollRuns.length,
        filtered: filtered.length,
        finalFiltered: finalFiltered.length,
        currentUserId: user?.userId || user?.id,
        runStatuses: payrollRuns.map(r => ({ runId: r.runId, status: r.status, managerId: r.payrollManagerId })),
      });
    }
  };

  const handleDecision = (run: PayrollRun, decisionType: "approve" | "reject") => {
    setSelectedPayrollRun(run);
    setDecision(decisionType);
    setComments("");
    setShowDecisionModal(true);
  };

  const handleSubmitDecision = async () => {
    if (!selectedPayrollRun || !decision) {
      setError("Please select a decision");
      return;
    }

    if (decision === "reject" && !comments.trim()) {
      setError("Please provide comments when rejecting a payroll run");
      return;
    }

    setProcessing(true);
    setError(null);
    setSuccess(null);

    try {
      await payrollExecutionApi.managerApproval({
        payrollRunId: selectedPayrollRun._id,
        status: selectedPayrollRun.status,
        managerDecision: decision === "approve" ? "approved" : "rejected",
        managerComments: decision === "reject" ? comments : comments || undefined,
        payrollManagerId: user?.userId,
      });

      setSuccess(
        `Payroll run ${selectedPayrollRun.runId} has been ${
          decision === "approve" ? "approved" : "rejected"
        } successfully!`
      );

      setShowDecisionModal(false);
      setSelectedPayrollRun(null);
      setDecision(null);
      setComments("");

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

  const getStatusBadge = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower === "under review" || statusLower === "under_review") {
      return (
        <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-semibold">
          Under Review
        </span>
      );
    } else if (statusLower === "pending finance approval" || statusLower === "pending_finance_approval") {
      return (
        <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">
          Pending Finance Approval
        </span>
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
          {view === "history" ? "Payroll Approval History" : "Payroll Manager Approval"}
        </h1>
        <p className="text-gray-600 mt-1">
          {view === "history" 
            ? "View previously approved or rejected payroll runs and their approval history."
            : "As a Payroll Manager, approve payroll runs so that validation is ensured at the managerial level prior to distribution."}
        </p>
        {/* View Toggle */}
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => router.push("/dashboard/payroll-execution/manager-approval?view=pending")}
            className={`px-4 py-2 rounded-md font-medium transition ${
              view === "pending"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            Pending Approvals
          </button>
          <button
            onClick={() => router.push("/dashboard/payroll-execution/manager-approval?view=history")}
            className={`px-4 py-2 rounded-md font-medium transition ${
              view === "history"
                ? "bg-blue-600 text-white"
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

      {/* Search */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by run ID, entity, or period..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </CardContent>
      </Card>

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
                : "No payroll runs pending approval"}
            </p>
            <p className="text-gray-500 text-sm mb-4">
              {view === "history"
                ? "Approved, rejected, locked, or pending finance approval payroll runs will appear here."
                : "Payroll runs will appear here after they have been sent for approval by Payroll Specialists. Manager approval is required before these payroll runs can proceed to distribution."}
            </p>
            {process.env.NODE_ENV === 'development' && payrollRuns.length > 0 && (
              <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md text-left max-w-2xl mx-auto">
                <p className="text-sm font-semibold text-yellow-800 mb-2">Debug Information:</p>
                <p className="text-xs text-yellow-700 mb-1">
                  Total payroll runs loaded: <strong>{payrollRuns.length}</strong>
                </p>
                <p className="text-xs text-yellow-700 mb-1">
                  Current user ID: <strong>{user?.userId || user?.id || "Not found"}</strong>
                </p>
                <p className="text-xs text-yellow-700 mb-2">Statuses found in payroll runs:</p>
                <ul className="text-xs text-yellow-700 list-disc list-inside space-y-1 mb-2">
                  {Array.from(new Set(payrollRuns.map(r => r.status || "(empty)"))).map(status => (
                    <li key={status}>{status}</li>
                  ))}
                </ul>
                <p className="text-xs text-yellow-700">
                  <strong>Note:</strong> Payroll runs need status "under review", "under_review", "pending approval", or similar to appear here.
                  The 33 pending items shown in the dashboard are likely payroll configuration approvals (tax rules, signing bonuses, etc.), not payroll run approvals.
                  To see payroll runs here, they must be sent for approval by Payroll Specialists first.
                </p>
              </div>
            )}
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md text-left max-w-2xl mx-auto">
              <p className="text-sm font-semibold text-blue-800 mb-2">ℹ️ Understanding Pending Approvals:</p>
              <p className="text-xs text-blue-700 mb-2">
                The "33 pending approvals" shown in your dashboard refers to <strong>payroll configuration approvals</strong> (tax rules, signing bonuses, termination benefits, etc.), 
                not payroll run approvals.
              </p>
              <p className="text-xs text-blue-700 mb-2">
                <strong>Payroll Run Approvals</strong> appear here only after a Payroll Specialist sends a draft payroll run for approval. 
                The payroll run must have status "under review" or "under_review" to appear in this list.
              </p>
              <p className="text-xs text-blue-700">
                To review configuration approvals, go to <strong>Payroll Configuration → Approvals</strong>.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {filteredRuns.map((run) => (
            <Card key={run._id} className="border-2 border-yellow-200">
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
                    {getStatusBadge(run.status)}
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
                    {view === "history" ? "View Details" : "Review Draft Details"}
                  </Button>
                  {view === "pending" && run.exceptions && run.exceptions > 0 && (
                    <Button
                      onClick={() => router.push(`/dashboard/payroll-execution/resolve-irregularities?payrollRunId=${run._id}`)}
                      variant="outline"
                      className="flex-1 border-red-500 text-red-700 hover:bg-red-50"
                    >
                      <AlertCircle className="h-5 w-5 mr-2" />
                      Resolve Irregularities ({run.exceptions})
                    </Button>
                  )}
                  {view === "pending" && (
                    <>
                      <Button
                        onClick={() => handleDecision(run, "approve")}
                        className="bg-green-600 hover:bg-green-700 text-white flex-1"
                        disabled={processing}
                      >
                        <CheckCircle className="h-5 w-5 mr-2" />
                        Approve
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
                  ? "Approve Payroll Run"
                  : "Reject Payroll Run"}
              </CardTitle>
              <CardDescription>
                {decision === "approve"
                  ? "Confirm approval of this payroll run. Manager approval is required before distribution. After your approval, it will be sent to Finance Staff for final approval."
                  : "Provide a reason for rejecting this payroll run. The payroll run will be marked as rejected and cannot proceed to distribution."}
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
                <p className="text-sm text-gray-600">
                  Employees: {selectedPayrollRun.employees}
                </p>
                {selectedPayrollRun.exceptions && selectedPayrollRun.exceptions > 0 && (
                  <p className="text-sm text-yellow-700 mt-2">
                    ⚠️ This payroll run has {selectedPayrollRun.exceptions} exception{selectedPayrollRun.exceptions !== 1 ? "s" : ""}
                  </p>
                )}
              </div>

              <div className="mb-4">
                <Label htmlFor="comments">
                  {decision === "approve" ? "Comments (Optional)" : "Rejection Reason *"}
                </Label>
                <textarea
                  id="comments"
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={4}
                  placeholder={
                    decision === "approve"
                      ? "Add any comments or notes about this approval..."
                      : "Please provide a detailed reason for rejecting this payroll run..."
                  }
                  required={decision === "reject"}
                />
              </div>

              {decision === "approve" && (
                <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                  <p className="text-sm text-yellow-800">
                    <strong>⚠️ Important:</strong> Manager approval is required before distribution. 
                    Approving this payroll run will send it to Finance Staff for final approval. 
                    Please ensure all amounts and employee details are correct before proceeding. 
                    This validation step ensures accuracy at the managerial level prior to distribution.
                  </p>
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  onClick={() => {
                    setShowDecisionModal(false);
                    setSelectedPayrollRun(null);
                    setDecision(null);
                    setComments("");
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
                  disabled={processing || (decision === "reject" && !comments.trim())}
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
          onClick={() => router.push("/dashboard/payroll-manager")}
          variant="outline"
        >
          ← Back to Payroll Manager Dashboard
        </Button>
      </div>
    </div>
  );
}

export default function ManagerApprovalPage() {
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
      <ManagerApprovalPageContent />
    </Suspense>
  );
}

