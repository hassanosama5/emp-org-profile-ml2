"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/hooks/use-auth";
import { useRequireAuth } from "@/lib/hooks/use-auth";
import { SystemRole } from "@/types";
import { payrollExecutionApi } from "@/lib/api/payroll-execution/payroll-execution";
import { employeeProfileApi } from "@/lib/api/employee-profile/employee-profile";
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
  User,
  AlertTriangle,
  Search,
  Filter,
  Eye,
} from "lucide-react";

interface PayrollRun {
  _id: string;
  runId: string;
  payrollPeriod: string;
  status: string;
  entity: string;
  exceptions?: number;
}

interface Exception {
  code: string;
  message: string;
  status: string;
  timestamp?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  resolution?: string;
}

interface EmployeeException {
  employeeId: string;
  activeExceptions: Exception[];
  resolvedExceptions: Exception[];
  employee?: {
    firstName: string;
    lastName: string;
    employeeId?: string;
    email?: string;
  };
}

interface ExceptionsData {
  totalExceptions: number;
  activeExceptions: number;
  resolvedExceptions: number;
  employeeExceptions: EmployeeException[];
}

function ResolveIrregularitiesPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  useRequireAuth(SystemRole.PAYROLL_MANAGER);

  const [payrollRuns, setPayrollRuns] = useState<PayrollRun[]>([]);
  const [selectedPayrollRunId, setSelectedPayrollRunId] = useState<string>("");
  const [exceptionsData, setExceptionsData] = useState<ExceptionsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [resolving, setResolving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedException, setSelectedException] = useState<{
    employeeId: string;
    exception: Exception;
    employeeName: string;
  } | null>(null);
  const [resolution, setResolution] = useState("");
  const [showResolutionModal, setShowResolutionModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "resolved">("all");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchPayrollRuns();
    
    // Check for payrollRunId in query params
    const payrollRunIdFromQuery = searchParams.get("payrollRunId");
    if (payrollRunIdFromQuery) {
      setSelectedPayrollRunId(payrollRunIdFromQuery);
    }
  }, [searchParams]);

  useEffect(() => {
    if (selectedPayrollRunId) {
      fetchExceptions();
    } else {
      setExceptionsData(null);
    }
  }, [selectedPayrollRunId]);

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

      // Filter to show runs with exceptions or in review status
      const runsWithExceptions = runsData.filter(
        (run: any) =>
          (run.exceptions && run.exceptions > 0) ||
          run.status?.toLowerCase() === "under review" ||
          run.status?.toLowerCase() === "under_review"
      );

      setPayrollRuns(runsWithExceptions);
    } catch (err: any) {
      setError(err.message || "Failed to load payroll runs");
    } finally {
      setLoading(false);
    }
  };

  const fetchExceptions = async () => {
    if (!selectedPayrollRunId) return;

    setLoading(true);
    setError(null);
    try {
      const response = await payrollExecutionApi.getAllPayrollExceptions(
        selectedPayrollRunId
      );

      let data: ExceptionsData;
      if (response && typeof response === "object" && "employeeExceptions" in response) {
        data = response as ExceptionsData;
      } else {
        data = {
          totalExceptions: 0,
          activeExceptions: 0,
          resolvedExceptions: 0,
          employeeExceptions: [],
        };
      }

      // Fetch employee details for each exception
      const employeeIds = data.employeeExceptions.map((ee) => ee.employeeId);
      if (employeeIds.length > 0) {
        try {
          const employeesResponse = await employeeProfileApi.getAllEmployees({
            limit: 1000,
          });
          const employees = Array.isArray(employeesResponse)
            ? employeesResponse
            : (employeesResponse as any)?.data || [];

          data.employeeExceptions = data.employeeExceptions.map((ee) => {
            const employee = employees.find(
              (emp: any) => emp._id === ee.employeeId
            );
            return {
              ...ee,
              employee: employee
                ? {
                    firstName: employee.firstName || "",
                    lastName: employee.lastName || "",
                    employeeId: employee.employeeId || employee.employeeNumber,
                    email: employee.workEmail || employee.email,
                  }
                : undefined,
            };
          });
        } catch (err) {
          console.warn("Failed to fetch employee details:", err);
        }
      }

      setExceptionsData(data);
    } catch (err: any) {
      setError(err.message || "Failed to load exceptions");
      setExceptionsData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = (
    employeeId: string,
    exception: Exception,
    employeeName: string
  ) => {
    setSelectedException({ employeeId, exception, employeeName });
    setResolution("");
    setShowResolutionModal(true);
  };

  const handleSubmitResolution = async () => {
    if (!selectedException || !resolution.trim()) {
      setError("Please provide a resolution description");
      return;
    }

    setResolving(selectedException.exception.code);
    setError(null);
    setSuccess(null);

    try {
      await payrollExecutionApi.resolveIrregularity({
        payrollRunId: selectedPayrollRunId,
        employeeId: selectedException.employeeId,
        exceptionCode: selectedException.exception.code,
        resolution: resolution.trim(),
        managerId: user?.userId || "",
      });

      setSuccess(
        `Irregularity "${selectedException.exception.code}" has been resolved successfully!`
      );

      setShowResolutionModal(false);
      setSelectedException(null);
      setResolution("");

      // Refresh exceptions list
      setTimeout(() => {
        fetchExceptions();
        setSuccess(null);
      }, 2000);
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        "Failed to resolve irregularity";
      setError(errorMessage);
      console.error("Error resolving irregularity:", err);
    } finally {
      setResolving(null);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getExceptionBadge = (status: string) => {
    if (status === "active") {
      return (
        <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded font-semibold">
          Active
        </span>
      );
    } else if (status === "resolved") {
      return (
        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded font-semibold">
          Resolved
        </span>
      );
    }
    return (
      <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
        {status}
      </span>
    );
  };

  const getExceptionCodeBadge = (code: string) => {
    const codeColors: Record<string, string> = {
      MISSING_BANK: "bg-orange-100 text-orange-700",
      NEGATIVE_NET_PAY: "bg-red-100 text-red-700",
      SALARY_SPIKE: "bg-yellow-100 text-yellow-700",
      INVALID_EMPLOYEE_ID: "bg-purple-100 text-purple-700",
      PAYSLIP_GENERATION_ERROR: "bg-blue-100 text-blue-700",
    };

    const colorClass = codeColors[code] || "bg-gray-100 text-gray-700";

    return (
      <span className={`px-2 py-1 ${colorClass} text-xs rounded font-medium`}>
        {code}
      </span>
    );
  };

  const filteredEmployeeExceptions = exceptionsData?.employeeExceptions.filter(
    (ee) => {
      // Filter by status
      if (filterStatus === "active") {
        if (ee.activeExceptions.length === 0) return false;
      } else if (filterStatus === "resolved") {
        if (ee.resolvedExceptions.length === 0) return false;
      }

      // Filter by search term
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const employeeName = ee.employee
          ? `${ee.employee.firstName} ${ee.employee.lastName}`.toLowerCase()
          : "";
        const employeeId = ee.employee?.employeeId?.toLowerCase() || "";
        const hasMatchingException = [
          ...ee.activeExceptions,
          ...ee.resolvedExceptions,
        ].some(
          (ex) =>
            ex.code.toLowerCase().includes(searchLower) ||
            ex.message.toLowerCase().includes(searchLower)
        );

        return (
          employeeName.includes(searchLower) ||
          employeeId.includes(searchLower) ||
          hasMatchingException
        );
      }

      return true;
    }
  ) || [];

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Resolve Payroll Irregularities
        </h1>
        <p className="text-gray-600 mt-1">
          As a Payroll Manager, resolve escalated irregularities reported by Payroll Specialists so that payroll exceptions are addressed at a higher decision level.
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

      {/* Payroll Run Selection */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Select Payroll Run</CardTitle>
          <CardDescription>
            Choose a payroll run to view and resolve escalated irregularities. Irregularities flagged by Payroll Specialists are escalated to you for resolution at a higher decision level.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="payrollRun">Payroll Run</Label>
              <select
                id="payrollRun"
                value={selectedPayrollRunId}
                onChange={(e) => setSelectedPayrollRunId(e.target.value)}
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              >
                <option value="">Select a payroll run</option>
                {payrollRuns.map((run) => (
                  <option key={run._id} value={run._id}>
                    {run.runId} - {formatDate(run.payrollPeriod)} -{" "}
                    {run.exceptions || 0} exception{run.exceptions !== 1 ? "s" : ""}
                  </option>
                ))}
              </select>
            </div>
            {selectedPayrollRunId && (
              <div className="flex gap-2">
                <Button
                  onClick={() => router.push(`/dashboard/payroll-execution/preview?payrollRunId=${selectedPayrollRunId}`)}
                  variant="outline"
                  className="flex-1"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View Payroll Draft
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Exceptions List */}
      {selectedPayrollRunId && exceptionsData && (
        <>
          {/* Summary Card */}
          <Card className="mb-6 border-2 border-blue-200">
            <CardHeader>
              <CardTitle>Escalated Irregularities Summary</CardTitle>
              <CardDescription>
                These irregularities were flagged by Payroll Specialists and escalated to you for resolution at a higher decision level.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-red-50 rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">Active</div>
                  <div className="text-2xl font-bold text-red-700">
                    {exceptionsData.activeExceptions}
                  </div>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">Resolved</div>
                  <div className="text-2xl font-bold text-green-700">
                    {exceptionsData.resolvedExceptions}
                  </div>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">Total</div>
                  <div className="text-2xl font-bold text-gray-700">
                    {exceptionsData.totalExceptions}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Filters */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by employee name, ID, or exception code..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="h-5 w-5 text-gray-400" />
                  <select
                    value={filterStatus}
                    onChange={(e) =>
                      setFilterStatus(
                        e.target.value as "all" | "active" | "resolved"
                      )
                    }
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Statuses</option>
                    <option value="active">Active Only</option>
                    <option value="resolved">Resolved Only</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Employee Exceptions */}
          {loading ? (
            <Card>
              <CardContent className="py-12 text-center">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600">Loading exceptions...</p>
              </CardContent>
            </Card>
          ) : filteredEmployeeExceptions.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <CheckCircle className="h-12 w-12 mx-auto text-green-400 mb-4" />
                <p className="text-gray-600 text-lg mb-2">
                  No exceptions found
                </p>
                <p className="text-gray-500 text-sm">
                  {filterStatus !== "all"
                    ? `No ${filterStatus} exceptions match your search criteria.`
                    : "All exceptions have been resolved or no exceptions exist for this payroll run."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredEmployeeExceptions.map((ee) => (
                <Card
                  key={ee.employeeId}
                  className={
                    ee.activeExceptions.length > 0
                      ? "border-2 border-red-200"
                      : "border border-gray-200"
                  }
                >
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <User className="h-5 w-5 text-gray-400" />
                        <div>
                          <CardTitle>
                            {ee.employee
                              ? `${ee.employee.firstName} ${ee.employee.lastName}`
                              : "Unknown Employee"}
                          </CardTitle>
                          <CardDescription>
                            {ee.employee?.employeeId && (
                              <>Employee ID: {ee.employee.employeeId}</>
                            )}
                            {ee.employee?.email && (
                              <> • {ee.employee.email}</>
                            )}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {ee.activeExceptions.length > 0 && (
                          <span className="px-3 py-1 bg-red-100 text-red-700 text-sm rounded font-semibold">
                            {ee.activeExceptions.length} Active
                          </span>
                        )}
                        {ee.resolvedExceptions.length > 0 && (
                          <span className="px-3 py-1 bg-green-100 text-green-700 text-sm rounded font-semibold">
                            {ee.resolvedExceptions.length} Resolved
                          </span>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {/* Active Exceptions */}
                    {ee.activeExceptions.length > 0 && (
                      <div className="mb-4">
                        <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                          Active Irregularities
                        </h4>
                        <div className="space-y-3">
                          {ee.activeExceptions.map((exception, idx) => (
                            <div
                              key={idx}
                              className="p-4 bg-red-50 border border-red-200 rounded-md"
                            >
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  {getExceptionCodeBadge(exception.code)}
                                  {getExceptionBadge(exception.status)}
                                </div>
                                <Button
                                  onClick={() =>
                                    handleResolve(
                                      ee.employeeId,
                                      exception,
                                      ee.employee
                                        ? `${ee.employee.firstName} ${ee.employee.lastName}`
                                        : "Unknown Employee"
                                    )
                                  }
                                  className="bg-green-600 hover:bg-green-700 text-white text-sm"
                                  disabled={resolving !== null}
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Resolve
                                </Button>
                              </div>
                              <p className="text-sm text-gray-700 mt-2">
                                {exception.message}
                              </p>
                              {exception.timestamp && (
                                <p className="text-xs text-gray-500 mt-2">
                                  Flagged: {formatDate(exception.timestamp)}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Resolved Exceptions */}
                    {ee.resolvedExceptions.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          Resolved Irregularities
                        </h4>
                        <div className="space-y-3">
                          {ee.resolvedExceptions.map((exception, idx) => (
                            <div
                              key={idx}
                              className="p-4 bg-green-50 border border-green-200 rounded-md"
                            >
                              <div className="flex items-center gap-2 mb-2">
                                {getExceptionCodeBadge(exception.code)}
                                {getExceptionBadge(exception.status)}
                              </div>
                              <p className="text-sm text-gray-700 mt-2">
                                {exception.message}
                              </p>
                              {exception.resolution && (
                                <div className="mt-3 p-2 bg-white rounded border border-green-300">
                                  <p className="text-xs font-semibold text-gray-600 mb-1">
                                    Resolution:
                                  </p>
                                  <p className="text-sm text-gray-800">
                                    {exception.resolution}
                                  </p>
                                </div>
                              )}
                              {exception.resolvedAt && (
                                <p className="text-xs text-gray-500 mt-2">
                                  Resolved: {formatDate(exception.resolvedAt)}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* Resolution Modal */}
      {showResolutionModal && selectedException && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Resolve Irregularity
              </CardTitle>
              <CardDescription>
                Provide a resolution for this irregularity. This will mark it as resolved and update the payroll run.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="text-sm text-gray-600 mb-1">Employee:</p>
                  <p className="font-semibold text-gray-900">
                    {selectedException.employeeName}
                  </p>
                  <p className="text-sm text-gray-600 mt-2 mb-1">
                    Exception Code:
                  </p>
                  <p className="font-medium text-gray-900">
                    {selectedException.exception.code}
                  </p>
                  <p className="text-sm text-gray-600 mt-2 mb-1">Message:</p>
                  <p className="text-sm text-gray-700">
                    {selectedException.exception.message}
                  </p>
                </div>

                <div>
                  <Label htmlFor="resolution">Resolution *</Label>
                  <textarea
                    id="resolution"
                    value={resolution}
                    onChange={(e) => setResolution(e.target.value)}
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    rows={5}
                    placeholder="Describe how this irregularity was resolved, what actions were taken, or any notes for future reference..."
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    This resolution will be permanently recorded and visible to all authorized users.
                  </p>
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={() => {
                      setShowResolutionModal(false);
                      setSelectedException(null);
                      setResolution("");
                    }}
                    variant="outline"
                    className="flex-1"
                    disabled={resolving !== null}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSubmitResolution}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                    disabled={!resolution.trim() || resolving !== null}
                  >
                    {resolving ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Resolving...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Confirm Resolution
                      </>
                    )}
                  </Button>
                </div>
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

export default function ResolveIrregularitiesPage() {
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
      <ResolveIrregularitiesPageContent />
    </Suspense>
  );
}

