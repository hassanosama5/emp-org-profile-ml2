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
import {
  Eye,
  Search,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Users,
  AlertCircle,
  CheckCircle,
  TrendingUp,
  FileText,
  Send,
} from "lucide-react";

interface PayrollRun {
  _id: string;
  runId: string;
  payrollPeriod: string;
  status: string;
  entity: string;
}

interface EmployeeDetail {
  employeeId: any;
  baseSalary: number;
  allowances: number;
  deductions: number;
  deductionsBreakdown?: {
    taxes: number;
    insurance: number;
    timeManagementPenalties: number;
    unpaidLeavePenalties: number;
    total: number;
  };
  netSalary: number;
  netPay: number;
  bankStatus: string;
  exceptions?: string;
  currency: string;
}

interface PayrollPreview {
  payrollRun: {
    runId: string;
    payrollPeriod: string;
    status: string;
    employees: number;
    exceptions: number;
    totalnetpay: number;
    entity: string;
    currency: string;
    sourceCurrency: string;
    converted: boolean;
  };
  employeeDetails: EmployeeDetail[];
}

export default function PayrollPreviewPage() {
  const router = useRouter();
  const { user } = useAuth();
  useRequireAuth(SystemRole.PAYROLL_SPECIALIST);

  const [payrollRuns, setPayrollRuns] = useState<PayrollRun[]>([]);
  const [selectedPayrollRunId, setSelectedPayrollRunId] = useState<string>("");
  const [preview, setPreview] = useState<PayrollPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedEmployees, setExpandedEmployees] = useState<Set<string>>(
    new Set()
  );
  const [selectedCurrency, setSelectedCurrency] = useState<string>("");

  useEffect(() => {
    const fetchPayrollRuns = async () => {
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
      }
    };

    fetchPayrollRuns();
  }, []);

  useEffect(() => {
    if (selectedPayrollRunId) {
      fetchPreview();
    } else {
      setPreview(null);
    }
  }, [selectedPayrollRunId, selectedCurrency]);

  const fetchPreview = async () => {
    if (!selectedPayrollRunId) return;

    setLoading(true);
    setError(null);

    try {
      const previewData = await payrollExecutionApi.getPayrollPreview(
        selectedPayrollRunId,
        selectedCurrency || undefined
      );
      setPreview(previewData);
    } catch (err: any) {
      setError(err.message || "Failed to load payroll preview");
      setPreview(null);
    } finally {
      setLoading(false);
    }
  };

  const toggleEmployeeExpansion = (employeeId: string) => {
    const newExpanded = new Set(expandedEmployees);
    if (newExpanded.has(employeeId)) {
      newExpanded.delete(employeeId);
    } else {
      newExpanded.add(employeeId);
    }
    setExpandedEmployees(newExpanded);
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
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

  const filteredEmployees = preview?.employeeDetails.filter((detail) => {
    if (!searchTerm) return true;
    const employee = detail.employeeId;
    if (!employee) return false;
    const searchLower = searchTerm.toLowerCase();
    const firstName = (employee.firstName || "").toLowerCase();
    const lastName = (employee.lastName || "").toLowerCase();
    const employeeNumber = (employee.employeeNumber || "").toLowerCase();
    return (
      firstName.includes(searchLower) ||
      lastName.includes(searchLower) ||
      employeeNumber.includes(searchLower)
    );
  }) || [];

  const selectedPayrollRun = payrollRuns.find(
    (run) => run._id === selectedPayrollRunId
  );

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Payroll Preview Dashboard
        </h1>
        <p className="text-gray-600 mt-1">
          As a Payroll Specialist, review system-generated payroll results in this preview dashboard so you can confirm accuracy before finalization.
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-red-500" />
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Payroll Run Selection */}
      <Card className="mb-6">
          <CardHeader>
            <CardTitle>Select Payroll Run</CardTitle>
            <CardDescription>
              Choose a payroll run to preview its system-generated results. Review all calculations, deductions, and employee details to confirm accuracy before finalization.
            </CardDescription>
          </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payroll Run *
              </label>
              <select
                value={selectedPayrollRunId}
                onChange={(e) => setSelectedPayrollRunId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a payroll run</option>
                {payrollRuns.map((run) => (
                  <option key={run._id} value={run._id}>
                    {run.runId} - {formatDate(run.payrollPeriod)} - {run.status}
                  </option>
                ))}
              </select>
            </div>

            {preview && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Currency (Optional)
                </label>
                <select
                  value={selectedCurrency}
                  onChange={(e) => setSelectedCurrency(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Use original currency ({preview.payrollRun.sourceCurrency})</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                  <option value="EGP">EGP</option>
                </select>
              </div>
            )}
          </div>

          {selectedPayrollRun && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm text-gray-600">
                <strong>Run ID:</strong> {selectedPayrollRun.runId}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Period:</strong> {formatDate(selectedPayrollRun.payrollPeriod)}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Status:</strong> {selectedPayrollRun.status}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto text-gray-400" />
          <p className="text-gray-500 mt-2">Loading payroll preview...</p>
        </div>
      )}

      {/* Information Card */}
      {preview && !loading && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-sm text-blue-800">
            <strong>ℹ️ Review Instructions:</strong> Review all payroll calculations, employee details, deductions, and exceptions below. 
            Once you've confirmed accuracy, you can send this payroll run for approval. Check for any irregularities before finalization.
          </p>
        </div>
      )}

      {/* Payroll Summary */}
      {preview && !loading && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <Card className="border-2 border-blue-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Total Net Pay
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-blue-600" />
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(
                      preview.payrollRun.totalnetpay,
                      preview.payrollRun.currency
                    )}
                  </p>
                </div>
                {preview.payrollRun.converted && (
                  <p className="text-xs text-gray-500 mt-1">
                    Converted from {preview.payrollRun.sourceCurrency}
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="border-2 border-green-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Employees
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-green-600" />
                  <p className="text-2xl font-bold text-gray-900">
                    {preview.payrollRun.employees}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-orange-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Exceptions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-orange-600" />
                  <p className="text-2xl font-bold text-gray-900">
                    {preview.payrollRun.exceptions || 0}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-purple-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-purple-600" />
                  <p className="text-lg font-semibold text-gray-900">
                    {preview.payrollRun.status}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search and Filter */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Search employees by name or employee number..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button
                  onClick={fetchPreview}
                  disabled={loading}
                  className="bg-gray-600 hover:bg-gray-700 text-white"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Employee Details */}
          <Card>
            <CardHeader>
              <CardTitle>Employee Payroll Details</CardTitle>
              <CardDescription>
                {filteredEmployees.length} employee
                {filteredEmployees.length !== 1 ? "s" : ""} found
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredEmployees.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No employees found matching your search.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredEmployees.map((detail, index) => {
                    const employee = detail.employeeId;
                    const employeeId = employee?._id || employee?.toString() || `emp-${index}`;
                    const isExpanded = expandedEmployees.has(employeeId);
                    const hasExceptions = detail.exceptions;

                    return (
                      <div
                        key={employeeId}
                        className="border border-gray-200 rounded-lg overflow-hidden"
                      >
                        <div
                          className="p-4 bg-gray-50 hover:bg-gray-100 cursor-pointer transition"
                          onClick={() => toggleEmployeeExpansion(employeeId)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3">
                                <h3 className="font-semibold text-gray-900">
                                  {employee?.firstName || "Unknown"}{" "}
                                  {employee?.lastName || ""}
                                </h3>
                                {employee?.employeeNumber && (
                                  <span className="text-sm text-gray-500">
                                    ({employee.employeeNumber})
                                  </span>
                                )}
                                {hasExceptions && (
                                  <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded">
                                    Has Exceptions
                                  </span>
                                )}
                                {detail.bankStatus === "missing" && (
                                  <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded">
                                    Missing Bank Account
                                  </span>
                                )}
                              </div>
                              <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div>
                                  <span className="text-gray-500">Net Pay:</span>{" "}
                                  <span className="font-semibold text-gray-900">
                                    {formatCurrency(
                                      detail.netPay,
                                      detail.currency
                                    )}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-500">Base Salary:</span>{" "}
                                  <span className="font-semibold text-gray-900">
                                    {formatCurrency(
                                      detail.baseSalary,
                                      detail.currency
                                    )}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-500">Allowances:</span>{" "}
                                  <span className="font-semibold text-gray-900">
                                    {formatCurrency(
                                      detail.allowances,
                                      detail.currency
                                    )}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-500">Deductions:</span>{" "}
                                  <span className="font-semibold text-red-600">
                                    -{formatCurrency(
                                      detail.deductions,
                                      detail.currency
                                    )}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="ml-4">
                              {isExpanded ? (
                                <ChevronUp className="h-5 w-5 text-gray-400" />
                              ) : (
                                <ChevronDown className="h-5 w-5 text-gray-400" />
                              )}
                            </div>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="p-4 bg-white border-t border-gray-200">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              {/* Earnings */}
                              <div>
                                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                  <TrendingUp className="h-4 w-4 text-green-600" />
                                  Earnings
                                </h4>
                                <div className="space-y-2 text-sm">
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Base Salary:</span>
                                    <span className="font-medium">
                                      {formatCurrency(
                                        detail.baseSalary,
                                        detail.currency
                                      )}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Allowances:</span>
                                    <span className="font-medium">
                                      {formatCurrency(
                                        detail.allowances,
                                        detail.currency
                                      )}
                                    </span>
                                  </div>
                                  <div className="flex justify-between pt-2 border-t border-gray-200">
                                    <span className="font-semibold text-gray-900">
                                      Gross Salary:
                                    </span>
                                    <span className="font-bold text-gray-900">
                                      {formatCurrency(
                                        detail.baseSalary + detail.allowances,
                                        detail.currency
                                      )}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Deductions */}
                              <div>
                                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                  <DollarSign className="h-4 w-4 text-red-600" />
                                  Deductions Breakdown
                                </h4>
                                <div className="space-y-2 text-sm">
                                  {detail.deductionsBreakdown ? (
                                    <>
                                      <div className="flex justify-between">
                                        <span className="text-gray-600">Taxes:</span>
                                        <span className="font-medium text-red-600">
                                          -{formatCurrency(
                                            detail.deductionsBreakdown.taxes,
                                            detail.currency
                                          )}
                                        </span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-gray-600">Insurance:</span>
                                        <span className="font-medium text-red-600">
                                          -{formatCurrency(
                                            detail.deductionsBreakdown.insurance,
                                            detail.currency
                                          )}
                                        </span>
                                      </div>
                                      {detail.deductionsBreakdown
                                        .timeManagementPenalties > 0 && (
                                        <div className="flex justify-between">
                                          <span className="text-gray-600">
                                            Time Penalties:
                                          </span>
                                          <span className="font-medium text-red-600">
                                            -
                                            {formatCurrency(
                                              detail.deductionsBreakdown
                                                .timeManagementPenalties,
                                              detail.currency
                                            )}
                                          </span>
                                        </div>
                                      )}
                                      {detail.deductionsBreakdown
                                        .unpaidLeavePenalties > 0 && (
                                        <div className="flex justify-between">
                                          <span className="text-gray-600">
                                            Unpaid Leave:
                                          </span>
                                          <span className="font-medium text-red-600">
                                            -
                                            {formatCurrency(
                                              detail.deductionsBreakdown
                                                .unpaidLeavePenalties,
                                              detail.currency
                                            )}
                                          </span>
                                        </div>
                                      )}
                                    </>
                                  ) : (
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">Total:</span>
                                      <span className="font-medium text-red-600">
                                        -{formatCurrency(
                                          detail.deductions,
                                          detail.currency
                                        )}
                                      </span>
                                    </div>
                                  )}
                                  <div className="flex justify-between pt-2 border-t border-gray-200">
                                    <span className="font-semibold text-gray-900">
                                      Total Deductions:
                                    </span>
                                    <span className="font-bold text-red-600">
                                      -{formatCurrency(
                                        detail.deductions,
                                        detail.currency
                                      )}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Net Calculations */}
                            <div className="mt-6 pt-6 border-t border-gray-200">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded-md">
                                    <span className="font-semibold text-gray-700">
                                      Net Salary:
                                    </span>
                                    <span className="font-bold text-blue-900">
                                      {formatCurrency(
                                        detail.netSalary,
                                        detail.currency
                                      )}
                                    </span>
                                  </div>
                                  <p className="text-xs text-gray-500 mt-1">
                                    Gross Salary - Deductions
                                  </p>
                                </div>
                                <div>
                                  <div className="flex justify-between items-center p-3 bg-green-50 rounded-md">
                                    <span className="font-semibold text-gray-700">
                                      Net Pay:
                                    </span>
                                    <span className="font-bold text-green-900">
                                      {formatCurrency(
                                        detail.netPay,
                                        detail.currency
                                      )}
                                    </span>
                                  </div>
                                  <p className="text-xs text-gray-500 mt-1">
                                    Net Pay = Net Salary - Penalties (missing working hours/days) + Refunds (if available)
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Additional Info */}
                            <div className="mt-4 pt-4 border-t border-gray-200">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                <div>
                                  <span className="text-gray-600">Bank Status:</span>{" "}
                                  <span
                                    className={`font-medium ${
                                      detail.bankStatus === "missing"
                                        ? "text-red-600"
                                        : "text-green-600"
                                    }`}
                                  >
                                    {detail.bankStatus === "missing"
                                      ? "Missing"
                                      : "Available"}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-600">Currency:</span>{" "}
                                  <span className="font-medium">
                                    {detail.currency}
                                  </span>
                                </div>
                              </div>
                              {hasExceptions && (
                                <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-md">
                                  <p className="text-sm text-orange-700">
                                    <strong>Exceptions:</strong> {detail.exceptions}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Action Buttons */}
      <div className="mt-8 flex gap-4">
        <Button
          onClick={() => router.push("/dashboard/payroll-execution")}
          variant="outline"
          className="flex-1"
        >
          ← Back to Payroll Execution
        </Button>
        {preview && preview.payrollRun.status?.toLowerCase() === "draft" && (
          <Button
            onClick={() => router.push(`/dashboard/payroll-execution/send-for-approval?payrollRunId=${selectedPayrollRunId}`)}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Send for Approval (After Review)
          </Button>
        )}
        {preview && (
          <Button
            onClick={() => router.push(`/dashboard/payroll-execution/flag-irregularities?payrollRunId=${selectedPayrollRunId}`)}
            variant="outline"
            className="flex-1 border-red-500 text-red-700 hover:bg-red-50"
          >
            <AlertCircle className="h-4 w-4 mr-2" />
            Flag Irregularities
          </Button>
        )}
      </div>
    </div>
  );
}

