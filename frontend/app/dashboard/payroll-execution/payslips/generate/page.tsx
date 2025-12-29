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
  FileText,
  Mail,
  Globe,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Download,
  Send,
  Eye,
} from "lucide-react";

interface PayrollRun {
  _id: string;
  runId: string;
  payrollPeriod: string;
  status: string;
  entity: string;
  employees: number;
  paymentStatus?: string;
}

interface GenerationResult {
  message: string;
  payslips: any[];
  distributionMethod: string;
  totalEmployees: number;
  successful: number;
  failed: number;
  actualDatabaseCount?: number;
  warnings?: string[];
  verifiedPayslips?: any[];
}

export default function GeneratePayslipsPage() {
  const router = useRouter();
  const { user } = useAuth();
  useRequireAuth(SystemRole.PAYROLL_SPECIALIST);

  const [payrollRuns, setPayrollRuns] = useState<PayrollRun[]>([]);
  const [selectedPayrollRunId, setSelectedPayrollRunId] = useState<string>("");
  const [distributionMethod, setDistributionMethod] = useState<
    "PDF" | "EMAIL" | "PORTAL"
  >("PORTAL");
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [result, setResult] = useState<GenerationResult | null>(null);

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
        // Filter to only show locked payroll runs with PAID payment status (ready for payslip generation)
        // Backend requires: status = LOCKED AND paymentStatus = PAID
        const readyRuns = (runsData as PayrollRun[]).filter(
          (run: PayrollRun) =>
            run.status.toLowerCase() === "locked" &&
            (run.paymentStatus?.toLowerCase() === "paid" || run.paymentStatus === "PAID")
        );
        setPayrollRuns(readyRuns);
      } catch (err: any) {
        setError(err.message || "Failed to load payroll runs");
      }
    };

    fetchPayrollRuns();
  }, []);

  const handleGenerate = async () => {
    if (!selectedPayrollRunId) {
      setError("Please select a payroll run");
      return;
    }

    setGenerating(true);
    setError(null);
    setSuccess(null);
    setResult(null);

    try {
      const response = await payrollExecutionApi.generateAndDistributePayslips({
        payrollRunId: selectedPayrollRunId,
        distributionMethod,
      });

      console.log('[Generate Payslips] Full response:', response);
      console.log('[Generate Payslips] Response details:', {
        successful: response.successful,
        failed: response.failed,
        verifiedPayslips: response.verifiedPayslips,
        actualDatabaseCount: response.actualDatabaseCount,
        totalEmployees: response.totalEmployees,
        warnings: response.warnings,
        payslipsCount: response.payslips?.length || 0,
      });
      
      setResult(response);
      setSuccess(
        `Successfully generated ${response.successful || 0} payslip${response.successful !== 1 ? "s" : ""} via ${distributionMethod}. ${response.actualDatabaseCount || 0} payslip${(response.actualDatabaseCount || 0) !== 1 ? "s" : ""} verified in database.`
      );
      
      if (response.warnings && response.warnings.length > 0) {
        console.warn('[Generate Payslips] Warnings:', response.warnings);
      }
      
      if (response.failed > 0) {
        setError(
          `Warning: ${response.failed} payslip${response.failed !== 1 ? "s" : ""} failed to generate. Check the logs for details.`
        );
      }
      
      // If actualDatabaseCount is 0 but successful > 0, there's a problem
      if (response.successful > 0 && (response.actualDatabaseCount === 0 || !response.actualDatabaseCount)) {
        console.error('[Generate Payslips] CRITICAL: Payslips were generated but not found in database!');
        console.error('[Generate Payslips] This suggests a database save or query issue.');
        setError(
          `Warning: Payslips were generated but may not be saved to database. Database count: ${response.actualDatabaseCount || 0}. Please check backend logs and try refreshing the payslips page.`
        );
      }
    } catch (err: any) {
      // Extract error message from response if available
      const errorMessage =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        "Failed to generate payslips";
      setError(errorMessage);
      console.error("Error generating payslips:", err);
    } finally {
      setGenerating(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const selectedPayrollRun = payrollRuns.find(
    (run) => run._id === selectedPayrollRunId
  );

  const getDistributionMethodIcon = (method: string) => {
    switch (method) {
      case "PDF":
        return <FileText className="h-5 w-5" />;
      case "EMAIL":
        return <Mail className="h-5 w-5" />;
      case "PORTAL":
        return <Globe className="h-5 w-5" />;
      default:
        return <FileText className="h-5 w-5" />;
    }
  };

  const getDistributionMethodDescription = (method: string) => {
    switch (method) {
      case "PDF":
        return "Generate PDF files for each payslip (downloadable)";
      case "EMAIL":
        return "Send payslips via email to each employee";
      case "PORTAL":
        return "Make payslips available in the employee portal";
      default:
        return "";
    }
  };

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Generate & Distribute Payslips
        </h1>
        <p className="text-gray-600 mt-1">
          The system automatically generates and distributes payslips after Finance approval (REQ-PY-15) and Payroll Manager lock (REQ-PY-7). You can also manually generate payslips here for locked payroll runs with "Paid" payment status. Payment status is set to "Paid" since we don't handle bank system integration.
        </p>
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-sm text-blue-800">
            <strong>ℹ️ Automatic Generation:</strong> Payslips are automatically generated and distributed (via Portal) when:
          </p>
          <ul className="text-sm text-blue-800 mt-2 list-disc list-inside space-y-1">
            <li>Finance Staff approves the payroll run (sets payment status to "Paid") AND the payroll is already locked, OR</li>
            <li>Payroll Manager locks the payroll run AND payment status is already "Paid"</li>
          </ul>
          <p className="text-sm text-blue-800 mt-2">
            Use this page to manually generate payslips if needed, or to regenerate payslips with a different distribution method (PDF, Email, or Portal).
          </p>
        </div>
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

      {/* Generation Form */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Select Payroll Run & Distribution Method</CardTitle>
          <CardDescription>
            Choose a locked payroll run with payment status = PAID and select how to distribute
            payslips
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Payroll Run Selection */}
            <div>
              <Label htmlFor="payrollRun">Payroll Run *</Label>
              <select
                id="payrollRun"
                value={selectedPayrollRunId}
                onChange={(e) => setSelectedPayrollRunId(e.target.value)}
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={generating}
              >
                <option value="">Select a payroll run</option>
                {payrollRuns.map((run) => (
                  <option key={run._id} value={run._id}>
                    {run.runId} - {formatDate(run.payrollPeriod)} - {run.status} - {run.paymentStatus || "PENDING"} ({run.employees} employees)
                  </option>
                ))}
              </select>
              {payrollRuns.length === 0 && (
                <p className="text-sm text-gray-500 mt-2">
                  No payroll runs available for payslip generation. Payroll runs must
                  be <strong>locked</strong> and have <strong>payment status = PAID</strong> before generating payslips.
                </p>
              )}
            </div>

            {selectedPayrollRun && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-sm text-gray-600">
                  <strong>Run ID:</strong> {selectedPayrollRun.runId}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Period:</strong>{" "}
                  {formatDate(selectedPayrollRun.payrollPeriod)}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Status:</strong> {selectedPayrollRun.status}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Payment Status:</strong> {selectedPayrollRun.paymentStatus || "PENDING"}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Employees:</strong> {selectedPayrollRun.employees}
                </p>
              </div>
            )}

            {/* Distribution Method Selection */}
            <div>
              <Label htmlFor="distributionMethod">
                Distribution Method *
              </Label>
              <div className="mt-2 space-y-3">
                <label className="flex items-start p-4 border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50 transition">
                  <input
                    type="radio"
                    name="distributionMethod"
                    value="PORTAL"
                    checked={distributionMethod === "PORTAL"}
                    onChange={(e) =>
                      setDistributionMethod(
                        e.target.value as "PDF" | "EMAIL" | "PORTAL"
                      )
                    }
                    className="mt-1 mr-3"
                    disabled={generating}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Globe className="h-5 w-5 text-blue-600" />
                      <span className="font-semibold text-gray-900">Portal</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      Make payslips available in the employee portal (default)
                    </p>
                  </div>
                </label>

                <label className="flex items-start p-4 border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50 transition">
                  <input
                    type="radio"
                    name="distributionMethod"
                    value="PDF"
                    checked={distributionMethod === "PDF"}
                    onChange={(e) =>
                      setDistributionMethod(
                        e.target.value as "PDF" | "EMAIL" | "PORTAL"
                      )
                    }
                    className="mt-1 mr-3"
                    disabled={generating}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-green-600" />
                      <span className="font-semibold text-gray-900">PDF</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      Generate PDF files for each payslip (downloadable)
                    </p>
                  </div>
                </label>

                <label className="flex items-start p-4 border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50 transition">
                  <input
                    type="radio"
                    name="distributionMethod"
                    value="EMAIL"
                    checked={distributionMethod === "EMAIL"}
                    onChange={(e) =>
                      setDistributionMethod(
                        e.target.value as "PDF" | "EMAIL" | "PORTAL"
                      )
                    }
                    className="mt-1 mr-3"
                    disabled={generating}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Mail className="h-5 w-5 text-purple-600" />
                      <span className="font-semibold text-gray-900">Email</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      Send payslips via email to each employee
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* Generate Button */}
            <Button
              onClick={handleGenerate}
              disabled={!selectedPayrollRunId || generating}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3"
            >
              {generating ? (
                <>
                  <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                  Generating Payslips...
                </>
              ) : (
                <>
                  <Send className="h-5 w-5 mr-2" />
                  Generate & Distribute Payslips
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Generation Results */}
      {result && (
        <Card>
          <CardHeader>
            <CardTitle>Generation Results</CardTitle>
            <CardDescription>
              Summary of payslip generation and distribution
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="font-semibold text-gray-900">
                      Successful
                    </span>
                  </div>
                  <p className="text-3xl font-bold text-green-700">
                    {result.successful || 0}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">payslips generated</p>
                </div>

                <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="h-5 w-5 text-red-600" />
                    <span className="font-semibold text-gray-900">Failed</span>
                  </div>
                  <p className="text-3xl font-bold text-red-700">
                    {result.failed || 0}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">payslips failed</p>
                </div>

                <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
                  <div className="flex items-center gap-2 mb-2">
                    {getDistributionMethodIcon(result.distributionMethod)}
                    <span className="font-semibold text-gray-900">Method</span>
                  </div>
                  <p className="text-xl font-bold text-blue-700">
                    {result.distributionMethod}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    {getDistributionMethodDescription(result.distributionMethod)}
                  </p>
                </div>
              </div>

              <div className="p-4 bg-gray-50 border border-gray-200 rounded-md">
                <p className="text-sm text-gray-700">
                  <strong>Total Employees:</strong> {result.totalEmployees || 0}
                </p>
                <p className="text-sm text-gray-700 mt-1">
                  <strong>Message:</strong> {result.message}
                </p>
                {result.actualDatabaseCount !== undefined && (
                  <p className="text-sm text-gray-700 mt-1">
                    <strong>Verified in Database:</strong> {result.actualDatabaseCount} payslip{result.actualDatabaseCount !== 1 ? "s" : ""}
                  </p>
                )}
                {result.warnings && result.warnings.length > 0 && (
                  <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                    <p className="text-sm font-semibold text-yellow-800">Warnings:</p>
                    <ul className="text-sm text-yellow-700 list-disc list-inside mt-1">
                      {result.warnings.map((warning: string, idx: number) => (
                        <li key={idx}>{warning}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              
              {result.successful > 0 && (
                <div className="flex gap-2 mt-4">
                  <Button
                    onClick={() => router.push("/dashboard/payroll-execution/payslips")}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View All Payslips
                  </Button>
                  {selectedPayrollRunId && (
                    <Button
                      onClick={() => router.push(`/dashboard/payroll-execution/payslips?payrollRunId=${selectedPayrollRunId}`)}
                      variant="outline"
                    >
                      View Payslips for This Run
                    </Button>
                  )}
                </div>
              )}

              {result.payslips && result.payslips.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">
                    Generated Payslips ({result.payslips.length})
                  </h3>
                  <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-md">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left">Employee ID</th>
                          <th className="px-4 py-2 text-left">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.payslips.slice(0, 10).map((payslip: any, index: number) => (
                          <tr key={index} className="border-t border-gray-200">
                            <td className="px-4 py-2">
                              {payslip.employeeId?.toString() || "N/A"}
                            </td>
                            <td className="px-4 py-2">
                              <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
                                Generated
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {result.payslips.length > 10 && (
                      <p className="p-2 text-sm text-gray-500 text-center">
                        ... and {result.payslips.length - 10} more
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Information Card */}
      <Card className="mt-6 border-2 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-blue-600" />
            Important Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-gray-700">
            <li>
              • Payslips can only be generated for <strong>locked</strong> payroll runs with <strong>payment status = PAID</strong>
            </li>
            <li>
              • <strong>Portal:</strong> Payslips are automatically available
              in the employee portal
            </li>
            <li>
              • <strong>PDF:</strong> PDF files are generated and can be
              downloaded by employees
            </li>
            <li>
              • <strong>Email:</strong> Payslips are sent directly to each
              employee's registered email address
            </li>
            <li>
              • The system will generate payslips for all employees in the
              selected payroll run
            </li>
            <li>
              • Any failures will be logged and can be reviewed in the payroll
              exceptions
            </li>
          </ul>
        </CardContent>
      </Card>

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

