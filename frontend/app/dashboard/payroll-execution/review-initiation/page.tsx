"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
  Calendar,
  Building2,
  Users,
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
  createdAt?: string;
  rejectionReason?: string;
}

export default function ReviewInitiationPage() {
  const router = useRouter();
  const { user } = useAuth();
  useRequireAuth(SystemRole.PAYROLL_SPECIALIST);

  const [payrollRuns, setPayrollRuns] = useState<PayrollRun[]>([]);
  const [filteredRuns, setFilteredRuns] = useState<PayrollRun[]>([]);
  const [selectedPayrollRun, setSelectedPayrollRun] = useState<PayrollRun | null>(null);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [decision, setDecision] = useState<"approve" | "reject" | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showDecisionModal, setShowDecisionModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchPayrollRuns();
  }, []);

  useEffect(() => {
    filterRuns();
  }, [payrollRuns, searchTerm]);

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

  const filterRuns = () => {
    // Show DRAFT status payroll runs (pending review) and REJECTED runs (can be edited)
    const reviewableRuns = payrollRuns.filter(
      (run) => {
        const status = run.status?.toLowerCase();
        return status === "draft" || status === "rejected";
      }
    );

    // Filter by search term
    let filtered = reviewableRuns;
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = reviewableRuns.filter(
        (run) =>
          run.runId.toLowerCase().includes(searchLower) ||
          run.entity.toLowerCase().includes(searchLower) ||
          formatDate(run.payrollPeriod).toLowerCase().includes(searchLower)
      );
    }

    setFilteredRuns(filtered);
  };

  const handleDecision = (run: PayrollRun, decisionType: "approve" | "reject") => {
    setSelectedPayrollRun(run);
    setDecision(decisionType);
    setRejectionReason("");
    setShowDecisionModal(true);
  };

  const handleSubmitDecision = async () => {
    if (!selectedPayrollRun || !decision) {
      setError("Please select a decision");
      return;
    }

    if (decision === "reject" && !rejectionReason.trim()) {
      setError("Please provide a reason when rejecting a payroll initiation");
      return;
    }

    // Get user ID - check both id and userId fields
    const userId = user?.id || user?.userId;
    
    if (!userId) {
      setError("User information not available. Please refresh the page or log in again.");
      return;
    }

    setProcessing(true);
    setError(null);
    setSuccess(null);

    try {
      await payrollExecutionApi.reviewPayrollInitiation({
        runId: selectedPayrollRun.runId,
        approved: decision === "approve",
        reviewerId: userId,
        rejectionReason: decision === "reject" ? rejectionReason.trim() : undefined,
      });

      setSuccess(
        `Payroll initiation ${selectedPayrollRun.runId} has been ${
          decision === "approve" ? "approved" : "rejected"
        } successfully! ${
          decision === "approve"
            ? "Draft generation will start automatically."
            : ""
        }`
      );

      setShowDecisionModal(false);
      setSelectedPayrollRun(null);
      setDecision(null);
      setRejectionReason("");

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
        `Failed to ${decision === "approve" ? "approve" : "reject"} payroll initiation`;
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

  const getStatusBadge = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower === "draft") {
      return (
        <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-semibold">
          Draft - Pending Review
        </span>
      );
    } else if (statusLower === "rejected") {
      return (
        <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-semibold">
          Rejected
        </span>
      );
    } else if (statusLower === "under review" || statusLower === "under_review") {
      return (
        <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">
          Under Review
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
          Review Payroll Initiation
        </h1>
        <p className="text-gray-600 mt-1">
          As a Payroll Specialist, review and approve processed payroll initiations. Approving will automatically start draft generation.
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
              No payroll initiations pending review or available for editing
            </p>
            <p className="text-gray-500 text-sm">
              Process a new payroll initiation to see it here for review, or check if there are rejected runs that need editing.
            </p>
            <Button
              onClick={() => router.push("/dashboard/payroll-execution/process-initiation")}
              className="mt-4 bg-blue-600 hover:bg-blue-700 text-white"
            >
              Process New Initiation
            </Button>
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
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
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
                      <Building2 className="h-4 w-4" />
                      <span className="text-sm">Entity</span>
                    </div>
                    <p className="font-semibold text-gray-900">{run.entity}</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2 text-gray-600 mb-1">
                      <Users className="h-4 w-4" />
                      <span className="text-sm">Employees</span>
                    </div>
                    <p className="font-semibold text-gray-900">{run.employees}</p>
                  </div>
                </div>

                {run.rejectionReason && (
                  <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm font-semibold text-red-800 mb-1">
                      Previous Rejection Reason:
                    </p>
                    <p className="text-sm text-red-700">{run.rejectionReason}</p>
                  </div>
                )}

                <div className="flex items-center gap-4 pt-4 border-t">
                  <Button
                    onClick={() => router.push(`/dashboard/payroll-execution/preview?payrollRunId=${run._id}`)}
                    variant="outline"
                    className="flex-1"
                  >
                    <Eye className="h-5 w-5 mr-2" />
                    View Details
                  </Button>
                  {(run.status?.toLowerCase() === "draft" || run.status?.toLowerCase() === "rejected") && (
                    <Button
                      onClick={() => router.push(`/dashboard/payroll-execution/edit-initiation?runId=${run.runId}`)}
                      variant="outline"
                      className="flex-1 border-yellow-500 text-yellow-700 hover:bg-yellow-50"
                    >
                      <RefreshCw className="h-5 w-5 mr-2" />
                      Edit
                    </Button>
                  )}
                  {run.status?.toLowerCase() === "draft" && (
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
                  ? "Approve Payroll Initiation"
                  : "Reject Payroll Initiation"}
              </CardTitle>
              <CardDescription>
                {decision === "approve"
                  ? "Confirm approval of this payroll initiation. Draft generation will start automatically after approval."
                  : "Provide a reason for rejecting this payroll initiation. The payroll run will be marked as rejected and can be edited."}
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
                  Entity: {selectedPayrollRun.entity}
                </p>
                <p className="text-sm text-gray-600">
                  Employees: {selectedPayrollRun.employees}
                </p>
              </div>

              {decision === "reject" && (
                <div className="mb-4">
                  <Label htmlFor="rejectionReason">
                    Rejection Reason <span className="text-red-500">*</span>
                  </Label>
                  <textarea
                    id="rejectionReason"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    rows={4}
                    placeholder="Please provide a detailed reason for rejecting this payroll initiation..."
                    required
                  />
                </div>
              )}

              {decision === "approve" && (
                <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                  <p className="text-sm text-yellow-800">
                    <strong>⚠️ Important:</strong> Approving this payroll initiation will automatically start draft generation. 
                    This process will calculate salaries, allowances, deductions, and contributions for all active employees.
                  </p>
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  onClick={() => {
                    setShowDecisionModal(false);
                    setSelectedPayrollRun(null);
                    setDecision(null);
                    setRejectionReason("");
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
                  disabled={processing || (decision === "reject" && !rejectionReason.trim())}
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
          onClick={() => router.push("/dashboard/payroll-execution")}
          variant="outline"
        >
          ← Back to Payroll Execution Dashboard
        </Button>
      </div>
    </div>
  );
}

