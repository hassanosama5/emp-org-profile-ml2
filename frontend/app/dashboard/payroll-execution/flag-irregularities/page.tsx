"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
import { Input } from "@/components/shared/ui/Input";
import { Label } from "@/components/shared/ui/Label";
import { Textarea } from "@/components/shared/ui/Textarea";
import {
  AlertCircle,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Search,
  RefreshCw,
  Flag,
  TrendingUp,
} from "lucide-react";

interface PayrollRun {
  _id: string;
  runId: string;
  payrollPeriod: string;
  status: string;
  entity: string;
}

interface Employee {
  _id: string;
  firstName: string;
  lastName: string;
  employeeNumber?: string;
}

interface Irregularity {
  employeeId?: string;
  exceptionCode: string;
  message: string;
  flaggedAt?: string;
  resolved?: boolean;
  resolution?: string;
}

export default function FlagIrregularitiesPage() {
  const router = useRouter();
  const { user } = useAuth();
  useRequireAuth(SystemRole.PAYROLL_SPECIALIST);

  const [payrollRuns, setPayrollRuns] = useState<PayrollRun[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedPayrollRunId, setSelectedPayrollRunId] = useState<string>("");
  const [irregularities, setIrregularities] = useState<Irregularity[]>([]);
  const [loading, setLoading] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Manual flagging form state
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualFormData, setManualFormData] = useState({
    employeeId: "",
    code: "",
    message: "",
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch payroll runs
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

        // Fetch employees
        const employeesResponse = await employeeProfileApi.getAllEmployees({
          limit: 1000,
          status: "ACTIVE",
        });
        setEmployees(employeesResponse?.data || []);
      } catch (err: any) {
        setError(err.message || "Failed to load data");
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    if (selectedPayrollRunId) {
      fetchIrregularities();
    } else {
      setIrregularities([]);
    }
  }, [selectedPayrollRunId]);

  const fetchIrregularities = async () => {
    if (!selectedPayrollRunId) return;

    setLoading(true);
    setError(null);
    try {
      const response = await payrollExecutionApi.getAllPayrollExceptions(
        selectedPayrollRunId
      );
      
      // Handle different response formats
      let exceptions = [];
      if (response) {
        if (Array.isArray(response)) {
          exceptions = response;
        } else if (response.data && Array.isArray(response.data)) {
          exceptions = response.data;
        } else if (response.exceptions && Array.isArray(response.exceptions)) {
          exceptions = response.exceptions;
        }
      }
      setIrregularities(exceptions);
    } catch (err: any) {
      console.error("Error fetching irregularities:", err);
      setIrregularities([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAutoDetect = async () => {
    if (!selectedPayrollRunId) {
      setError("Please select a payroll run first");
      return;
    }

    setDetecting(true);
    setError(null);
    setSuccess(null);

    try {
      const detected = await payrollExecutionApi.detectIrregularities(
        selectedPayrollRunId
      );
      
      setSuccess(
        `Detected ${Array.isArray(detected) ? detected.length : 0} irregularities`
      );
      
      // Refresh the irregularities list
      await fetchIrregularities();
    } catch (err: any) {
      setError(err.message || "Failed to detect irregularities");
    } finally {
      setDetecting(false);
    }
  };

  const handleManualFlag = async () => {
    if (!selectedPayrollRunId) {
      setError("Please select a payroll run first");
      return;
    }

    if (!manualFormData.code || !manualFormData.message) {
      setError("Please fill in all required fields");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await payrollExecutionApi.flagPayrollException({
        payrollRunId: selectedPayrollRunId,
        employeeId: manualFormData.employeeId || undefined,
        code: manualFormData.code,
        message: manualFormData.message,
      });

      setSuccess("Irregularity flagged successfully");
      setShowManualForm(false);
      setManualFormData({ employeeId: "", code: "", message: "" });
      
      // Refresh the irregularities list
      await fetchIrregularities();
    } catch (err: any) {
      setError(err.message || "Failed to flag irregularity");
    } finally {
      setLoading(false);
    }
  };

  const getIrregularityIcon = (code: string) => {
    switch (code.toUpperCase()) {
      case "NEGATIVE_NET_PAY":
        return <XCircle className="h-5 w-5 text-red-500" />;
      case "MISSING_BANK_ACCOUNT":
        return <AlertCircle className="h-5 w-5 text-orange-500" />;
      case "SALARY_SPIKE":
        return <TrendingUp className="h-5 w-5 text-yellow-500" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getIrregularityLabel = (code: string) => {
    switch (code.toUpperCase()) {
      case "NEGATIVE_NET_PAY":
        return "Negative Net Pay";
      case "MISSING_BANK_ACCOUNT":
        return "Missing Bank Account";
      case "SALARY_SPIKE":
        return "Salary Spike";
      default:
        return code;
    }
  };

  const selectedPayrollRun = payrollRuns.find(
    (run) => run._id === selectedPayrollRunId
  );

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Flag Irregularities</h1>
        <p className="text-gray-600 mt-1">
          As a Payroll Specialist, the system automatically flags irregularities (e.g., sudden salary spikes, missing bank accounts, negative net pay) so you can take required action. Review and manage flagged irregularities here.
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

      {/* Payroll Run Selection */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Select Payroll Run</CardTitle>
          <CardDescription>
            Choose a payroll run to review and flag irregularities. The system automatically flags irregularities (salary spikes, missing bank accounts, negative net pay) during draft generation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="payrollRun">Payroll Run *</Label>
              <select
                id="payrollRun"
                value={selectedPayrollRunId}
                onChange={(e) => setSelectedPayrollRunId(e.target.value)}
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a payroll run</option>
                {payrollRuns.map((run) => (
                  <option key={run._id} value={run._id}>
                    {run.runId} - {new Date(run.payrollPeriod).toLocaleDateString()} - {run.status}
                  </option>
                ))}
              </select>
            </div>

            {selectedPayrollRun && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-sm text-gray-600">
                  <strong>Run ID:</strong> {selectedPayrollRun.runId}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Period:</strong>{" "}
                  {new Date(selectedPayrollRun.payrollPeriod).toLocaleDateString()}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Status:</strong> {selectedPayrollRun.status}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      {selectedPayrollRunId && (
        <>
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-blue-800">
              <strong>ℹ️ Automatic Detection:</strong> The system automatically flags irregularities (salary spikes, missing bank accounts, negative net pay) during draft generation. Use "Auto-Detect" to scan for any missed irregularities or manually flag specific issues.
            </p>
          </div>
          <div className="mb-6 flex gap-4">
            <Button
              onClick={handleAutoDetect}
              disabled={detecting}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {detecting ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Detecting...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Auto-Detect Irregularities
                </>
              )}
            </Button>

            <Button
              onClick={() => setShowManualForm(!showManualForm)}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              <Flag className="h-4 w-4 mr-2" />
              {showManualForm ? "Cancel Manual Flag" : "Manually Flag Irregularity"}
            </Button>

            <Button
              onClick={fetchIrregularities}
              disabled={loading}
              className="bg-gray-600 hover:bg-gray-700 text-white"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh List
            </Button>
          </div>
        </>
      )}

      {/* Manual Flagging Form */}
      {showManualForm && selectedPayrollRunId && (
        <Card className="mb-6 border-2 border-orange-200">
          <CardHeader>
            <CardTitle>Manually Flag Irregularity</CardTitle>
            <CardDescription>
              Flag a specific irregularity that was not auto-detected
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="employee">Employee (Optional)</Label>
                <select
                  id="employee"
                  value={manualFormData.employeeId}
                  onChange={(e) =>
                    setManualFormData({ ...manualFormData, employeeId: e.target.value })
                  }
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All employees (general irregularity)</option>
                  {employees.map((emp) => (
                    <option key={emp._id} value={emp._id}>
                      {emp.firstName} {emp.lastName}
                      {emp.employeeNumber ? ` (${emp.employeeNumber})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="code">Irregularity Code *</Label>
                <select
                  id="code"
                  value={manualFormData.code}
                  onChange={(e) =>
                    setManualFormData({ ...manualFormData, code: e.target.value })
                  }
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select irregularity type</option>
                  <option value="NEGATIVE_NET_PAY">Negative Net Pay</option>
                  <option value="MISSING_BANK_ACCOUNT">Missing Bank Account</option>
                  <option value="SALARY_SPIKE">Salary Spike</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <Label htmlFor="message">Message *</Label>
                <Textarea
                  id="message"
                  value={manualFormData.message}
                  onChange={(e) =>
                    setManualFormData({ ...manualFormData, message: e.target.value })
                  }
                  placeholder="Describe the irregularity in detail..."
                  rows={4}
                  className="mt-1"
                  required
                />
              </div>

              <Button
                onClick={handleManualFlag}
                disabled={loading}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white"
              >
                {loading ? "Flagging..." : "Flag Irregularity"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Irregularities List */}
      {selectedPayrollRunId && (
        <Card>
          <CardHeader>
            <CardTitle>Detected Irregularities</CardTitle>
            <CardDescription>
              {irregularities.length === 0
                ? "No irregularities detected yet. The system automatically flags irregularities during draft generation. Use auto-detect to scan for any missed issues or manually flag specific problems."
                : `${irregularities.length} irregularit${irregularities.length === 1 ? "y" : "ies"} found. Review each irregularity and take required action.`}
            </CardDescription>
            <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-800 font-semibold mb-2">
                Types of irregularities automatically detected:
              </p>
              <ul className="text-sm text-yellow-800 space-y-1 list-disc list-inside">
                <li><strong>Salary Spikes:</strong> Sudden increases in salary compared to previous payroll runs</li>
                <li><strong>Missing Bank Accounts:</strong> Employees without valid bank account information</li>
                <li><strong>Negative Net Pay:</strong> Employees with net pay less than zero</li>
              </ul>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto text-gray-400" />
                <p className="text-gray-500 mt-2">Loading irregularities...</p>
              </div>
            ) : irregularities.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <AlertCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No irregularities found for this payroll run.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {irregularities.map((irregularity, index) => {
                  const employee = irregularity.employeeId
                    ? employees.find((e) => e._id === irregularity.employeeId)
                    : null;

                  return (
                    <div
                      key={index}
                      className="p-4 border border-gray-200 rounded-md hover:bg-gray-50"
                    >
                      <div className="flex items-start gap-3">
                        {getIrregularityIcon(irregularity.exceptionCode)}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-gray-900">
                              {getIrregularityLabel(irregularity.exceptionCode)}
                            </h3>
                            {irregularity.resolved && (
                              <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
                                Resolved
                              </span>
                            )}
                          </div>
                          {employee && (
                            <p className="text-sm text-gray-600 mb-1">
                              <strong>Employee:</strong> {employee.firstName}{" "}
                              {employee.lastName}
                              {employee.employeeNumber
                                ? ` (${employee.employeeNumber})`
                                : ""}
                            </p>
                          )}
                          <p className="text-gray-700">{irregularity.message}</p>
                          {irregularity.flaggedAt && (
                            <p className="text-xs text-gray-500 mt-2">
                              Flagged:{" "}
                              {new Date(irregularity.flaggedAt).toLocaleString()}
                            </p>
                          )}
                          {irregularity.resolution && (
                            <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded">
                              <p className="text-sm text-green-700">
                                <strong>Resolution:</strong> {irregularity.resolution}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
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

