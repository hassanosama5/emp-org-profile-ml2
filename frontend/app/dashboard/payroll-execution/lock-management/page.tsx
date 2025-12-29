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
import { Input } from "@/components/shared/ui/Input";
import { Textarea } from "@/components/shared/ui/Textarea";
import {
  Lock,
  Unlock,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Search,
  Filter,
  Shield,
  AlertTriangle,
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
  unlockReason?: string;
}

export default function LockManagementPage() {
  const router = useRouter();
  const { user } = useAuth();
  useRequireAuth(SystemRole.PAYROLL_MANAGER);

  const [payrollRuns, setPayrollRuns] = useState<PayrollRun[]>([]);
  const [filteredRuns, setFilteredRuns] = useState<PayrollRun[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedRun, setSelectedRun] = useState<PayrollRun | null>(null);
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [unlockReason, setUnlockReason] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchPayrollRuns();
  }, []);

  useEffect(() => {
    filterRuns();
  }, [payrollRuns, searchTerm, statusFilter]);

  const fetchPayrollRuns = async () => {
    setLoading(true);
    setError(null);
    try {
      const runsResponse = await payrollExecutionApi.getAllPayrollRuns({
        limit: 1000,
      });
      let runsData = [];
      if (runsResponse) {
        if (Array.isArray(runsResponse)) {
          runsData = runsResponse;
        } else if (runsResponse.data && Array.isArray(runsResponse.data)) {
          runsData = runsResponse.data;
        }
      }
      setPayrollRuns(runsData);
    } catch (err: any) {
      setError(err.message || "Failed to load payroll runs");
    } finally {
      setLoading(false);
    }
  };

  const filterRuns = () => {
    let filtered = [...payrollRuns];

    // Filter by status
    if (statusFilter !== "all") {
      if (statusFilter === "locked") {
        filtered = filtered.filter((run) => run.status === "locked");
      } else if (statusFilter === "unlocked") {
        filtered = filtered.filter((run) => run.status === "unlocked");
      } else if (statusFilter === "approved") {
        filtered = filtered.filter((run) => run.status === "approved");
      }
    }

    // Filter by search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (run) =>
          run.runId.toLowerCase().includes(searchLower) ||
          run.entity.toLowerCase().includes(searchLower) ||
          new Date(run.payrollPeriod)
            .toLocaleDateString()
            .toLowerCase()
            .includes(searchLower)
      );
    }

    setFilteredRuns(filtered);
  };

  const handleLock = async (run: PayrollRun) => {
    if (
      !confirm(
        `Are you sure you want to lock payroll run ${run.runId}? This will prevent any unauthorized retroactive changes.`
      )
    ) {
      return;
    }

    setActionLoading(run._id);
    setError(null);
    setSuccess(null);

    try {
      await payrollExecutionApi.lockPayroll(run._id);
      setSuccess(`Payroll run ${run.runId} has been locked successfully.`);
      await fetchPayrollRuns();
    } catch (err: any) {
      setError(err.message || "Failed to lock payroll run");
    } finally {
      setActionLoading(null);
    }
  };

  const handleFreeze = async (run: PayrollRun) => {
    if (
      !confirm(
        `Are you sure you want to freeze payroll run ${run.runId}? This will prevent any unauthorized retroactive changes.`
      )
    ) {
      return;
    }

    setActionLoading(run._id);
    setError(null);
    setSuccess(null);

    try {
      await payrollExecutionApi.freezePayroll(run._id);
      setSuccess(`Payroll run ${run.runId} has been frozen successfully.`);
      await fetchPayrollRuns();
    } catch (err: any) {
      setError(err.message || "Failed to freeze payroll run");
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnlock = async () => {
    if (!selectedRun) return;

    if (!unlockReason || unlockReason.trim().length === 0) {
      setError("Please provide a reason for unlocking the payroll run. This is required to document exceptional circumstances.");
      return;
    }

    if (unlockReason.trim().length < 10) {
      setError("Reason must be at least 10 characters long. Please provide a detailed explanation of the exceptional circumstances.");
      return;
    }

    setActionLoading(selectedRun._id);
    setError(null);
    setSuccess(null);

    try {
      await payrollExecutionApi.unlockPayroll(selectedRun._id, unlockReason);
      setSuccess(
        `Payroll run ${selectedRun.runId} has been unlocked successfully.`
      );
      setShowUnlockModal(false);
      setUnlockReason("");
      setSelectedRun(null);
      await fetchPayrollRuns();
    } catch (err: any) {
      setError(err.message || "Failed to unlock payroll run");
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnfreeze = async () => {
    if (!selectedRun) return;

    if (!unlockReason || unlockReason.trim().length === 0) {
      setError("Please provide a reason for unfreezing the payroll run. This is required to document exceptional circumstances.");
      return;
    }

    if (unlockReason.trim().length < 10) {
      setError("Reason must be at least 10 characters long. Please provide a detailed explanation of the exceptional circumstances.");
      return;
    }

    setActionLoading(selectedRun._id);
    setError(null);
    setSuccess(null);

    try {
      await payrollExecutionApi.unfreezePayroll(selectedRun._id, unlockReason);
      setSuccess(
        `Payroll run ${selectedRun.runId} has been unfrozen successfully.`
      );
      setShowUnlockModal(false);
      setUnlockReason("");
      setSelectedRun(null);
      await fetchPayrollRuns();
    } catch (err: any) {
      setError(err.message || "Failed to unfreeze payroll run");
    } finally {
      setActionLoading(null);
    }
  };

  const openUnlockModal = (run: PayrollRun, action: "unlock" | "unfreeze") => {
    setSelectedRun(run);
    setUnlockReason("");
    setShowUnlockModal(true);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getStatusBadge = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower === "locked") {
      return (
        <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded font-semibold flex items-center gap-1">
          <Lock className="h-3 w-3" />
          Locked
        </span>
      );
    } else if (statusLower === "unlocked") {
      return (
        <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded font-semibold flex items-center gap-1">
          <Unlock className="h-3 w-3" />
          Unlocked
        </span>
      );
    } else if (statusLower === "approved") {
      return (
        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded font-semibold">
          Approved
        </span>
      );
    } else {
      return (
        <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
          {status}
        </span>
      );
    }
  };

  const canLock = (run: PayrollRun) => {
    const status = run.status.toLowerCase();
    return status === "approved" || status === "unlocked";
  };

  const canUnlock = (run: PayrollRun) => {
    return run.status.toLowerCase() === "locked";
  };

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Payroll Lock Management
        </h1>
        <p className="text-gray-600 mt-1">
          Lock or freeze finalized payroll runs to prevent unauthorized retroactive changes. 
          Unfreeze/unlock under exceptional circumstances to allow legitimate corrections.
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

      {/* Information Card */}
      <Card className="mb-6 border-2 border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-blue-900 mb-1">Exceptional Circumstances Only</h3>
              <p className="text-sm text-blue-800">
                Unfreezing/unlocking payroll runs should only be done under <strong>exceptional circumstances</strong> when <strong>legitimate corrections</strong> are required. 
                All unfreeze/unlock actions require a detailed reason and are permanently logged for audit purposes. 
                This authority is granted to Payroll Managers to ensure critical errors can be corrected even after a payroll has been locked.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search and Filter */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                type="text"
                placeholder="Search by run ID, entity, or period..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Statuses</option>
                <option value="locked">Locked</option>
                <option value="unlocked">Unlocked</option>
                <option value="approved">Approved</option>
              </select>
            </div>

            <Button
              onClick={fetchPayrollRuns}
              disabled={loading}
              className="bg-gray-600 hover:bg-gray-700 text-white"
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Payroll Runs List */}
      <Card>
        <CardHeader>
          <CardTitle>Payroll Runs</CardTitle>
          <CardDescription>
            {filteredRuns.length} payroll run{filteredRuns.length !== 1 ? "s" : ""} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto text-gray-400" />
              <p className="text-gray-500 mt-2">Loading payroll runs...</p>
            </div>
          ) : filteredRuns.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Shield className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No payroll runs found matching your criteria.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRuns.map((run) => (
                <div
                  key={run._id}
                  className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-gray-900">
                          {run.runId}
                        </h3>
                        {getStatusBadge(run.status)}
                        {run.paymentStatus && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                            {run.paymentStatus}
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                        <div>
                          <span className="font-medium">Period:</span>{" "}
                          {formatDate(run.payrollPeriod)}
                        </div>
                        <div>
                          <span className="font-medium">Entity:</span> {run.entity}
                        </div>
                        <div>
                          <span className="font-medium">Employees:</span>{" "}
                          {run.employees}
                        </div>
                        <div>
                          <span className="font-medium">Total Net Pay:</span>{" "}
                          {formatCurrency(run.totalnetpay)}
                        </div>
                      </div>
                      {run.unlockReason && (
                        <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
                          <strong>Unlock Reason:</strong> {run.unlockReason}
                        </div>
                      )}
                    </div>

                    <div className="ml-4 flex gap-2">
                      {canLock(run) && (
                        <>
                          <Button
                            onClick={() => handleLock(run)}
                            disabled={actionLoading === run._id}
                            className="bg-red-600 hover:bg-red-700 text-white text-sm"
                            title="Lock payroll run to prevent changes"
                          >
                            {actionLoading === run._id ? (
                              <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <Lock className="h-4 w-4 mr-1" />
                                Lock
                              </>
                            )}
                          </Button>
                          <Button
                            onClick={() => handleFreeze(run)}
                            disabled={actionLoading === run._id}
                            className="bg-orange-600 hover:bg-orange-700 text-white text-sm"
                            title="Freeze payroll run to prevent changes"
                          >
                            {actionLoading === run._id ? (
                              <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <Shield className="h-4 w-4 mr-1" />
                                Freeze
                              </>
                            )}
                          </Button>
                        </>
                      )}
                      {canUnlock(run) && (
                        <>
                          <Button
                            onClick={() => openUnlockModal(run, "unlock")}
                            disabled={actionLoading === run._id}
                            className="bg-yellow-600 hover:bg-yellow-700 text-white text-sm"
                            title="Unlock payroll run for exceptional circumstances (requires detailed reason)"
                          >
                            <Unlock className="h-4 w-4 mr-1" />
                            Unlock
                          </Button>
                          <Button
                            onClick={() => openUnlockModal(run, "unfreeze")}
                            disabled={actionLoading === run._id}
                            className="bg-blue-600 hover:bg-blue-700 text-white text-sm"
                            title="Unfreeze payroll run for exceptional circumstances to allow legitimate corrections (requires detailed reason)"
                          >
                            <Shield className="h-4 w-4 mr-1" />
                            Unfreeze
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Unlock/Unfreeze Modal */}
      {showUnlockModal && selectedRun && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                {selectedRun.status.toLowerCase() === "locked"
                  ? "Unlock Payroll Run"
                  : "Unfreeze Payroll Run"}
              </CardTitle>
              <CardDescription>
                This action should only be used under <strong>exceptional circumstances</strong> to allow <strong>legitimate corrections</strong> to be made. Please provide a detailed reason explaining why this payroll run needs to be{" "}
                {selectedRun.status.toLowerCase() === "locked"
                  ? "unlocked"
                  : "unfrozen"}.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600 mb-2">
                    <strong>Payroll Run:</strong> {selectedRun.runId}
                  </p>
                  <p className="text-sm text-gray-600">
                    <strong>Period:</strong> {formatDate(selectedRun.payrollPeriod)}
                  </p>
                </div>

                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md mb-4">
                  <p className="text-sm text-yellow-800">
                    <strong>⚠️ Important:</strong> Unfreezing/unlocking a payroll run should only be done under <strong>exceptional circumstances</strong> when legitimate corrections are required. This action will be logged and audited.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reason for Unfreezing/Unlocking * (Required - Minimum 10 characters)
                  </label>
                  <Textarea
                    value={unlockReason}
                    onChange={(e) => setUnlockReason(e.target.value)}
                    placeholder="Please provide a detailed explanation of the exceptional circumstances requiring this action (e.g., critical error discovered, regulatory requirement, etc.)..."
                    rows={5}
                    required
                    minLength={10}
                    className={unlockReason.length > 0 && unlockReason.length < 10 ? "border-red-300" : ""}
                  />
                  {unlockReason.length > 0 && unlockReason.length < 10 && (
                    <p className="text-xs text-red-600 mt-1">
                      Reason must be at least 10 characters long. Please provide more detail about the exceptional circumstances.
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    This reason will be permanently recorded for audit purposes.
                  </p>
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={() => {
                      setShowUnlockModal(false);
                      setUnlockReason("");
                      setSelectedRun(null);
                    }}
                    className="flex-1 bg-gray-600 hover:bg-gray-700 text-white"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={
                      selectedRun.status.toLowerCase() === "locked"
                        ? handleUnlock
                        : handleUnfreeze
                    }
                    disabled={!unlockReason.trim() || unlockReason.trim().length < 10 || actionLoading === selectedRun._id}
                    className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white"
                  >
                    {actionLoading === selectedRun._id ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Unlock className="h-4 w-4 mr-1" />
                        Confirm {selectedRun.status.toLowerCase() === "locked" ? "Unlock" : "Unfreeze"}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Back Button */}
      <div className="mt-8">
        <Button
          onClick={() => router.push("/dashboard/payroll-execution")}
          className="bg-gray-600 hover:bg-gray-700 text-white"
        >
          ← Back to Payroll Execution
        </Button>
      </div>
    </div>
  );
}

