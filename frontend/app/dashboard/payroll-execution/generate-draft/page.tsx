"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/use-auth";
import { useRequireAuth } from "@/lib/hooks/use-auth";
import { SystemRole } from "@/types";
import { payrollExecutionApi } from "@/lib/api/payroll-execution/payroll-execution";
import { employeeProfileApi } from "@/lib/api/employee-profile/employee-profile";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/shared/ui/Card";
import { Button } from "@/components/shared/ui/Button";
import { Input } from "@/components/shared/ui/Input";

interface PayrollManager {
  _id: string;
  firstName: string;
  lastName: string;
  email?: string;
}

interface PayrollRun {
  _id: string;
  runId: string;
  payrollPeriod: string;
  entity: string;
  status: string;
  employees?: number;
  exceptions?: number;
  totalnetpay?: number;
  createdAt?: string;
}

export default function GenerateDraftPage() {
  const router = useRouter();
  const { user } = useAuth();
  useRequireAuth(SystemRole.PAYROLL_SPECIALIST);

  const [payrollManagers, setPayrollManagers] = useState<PayrollManager[]>([]);
  const [payrollPeriod, setPayrollPeriod] = useState<string>("");
  const [entity, setEntity] = useState<string>("");
  const [currency, setCurrency] = useState<string>("USD");
  const [selectedPayrollManagerId, setSelectedPayrollManagerId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [loadingManagers, setLoadingManagers] = useState(true);
  const [result, setResult] = useState<PayrollRun | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string>("");

  useEffect(() => {
    const fetchPayrollManagers = async () => {
      try {
        // Fetch all employees and filter for payroll managers
        const employeesResponse = await employeeProfileApi.getAllEmployees({
          limit: 1000,
        });
        const allEmployees = employeesResponse?.data || [];
        
        // Filter for payroll managers (assuming they have the PAYROLL_MANAGER role)
        // Note: This is a simplified approach - in a real system, you'd filter by role
        const managers = allEmployees.filter((emp: any) => 
          emp.roles?.includes(SystemRole.PAYROLL_MANAGER) || 
          emp.systemRoles?.some((r: any) => r.role === SystemRole.PAYROLL_MANAGER)
        );
        
        setPayrollManagers(managers);
      } catch (err: any) {
        console.error("Error fetching payroll managers:", err);
        // Don't set error here - payroll manager is optional
      } finally {
        setLoadingManagers(false);
      }
    };

    fetchPayrollManagers();

    // Set default payroll period to end of current month
    const now = new Date();
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    setPayrollPeriod(lastDayOfMonth.toISOString().split("T")[0]);
  }, []);

  const handleGenerate = async () => {
    // Validation
    if (!payrollPeriod) {
      setError("Please select a payroll period");
      return;
    }
    if (!entity || entity.trim() === "") {
      setError("Please enter an entity name");
      return;
    }
    // Get user ID - check both id and userId fields   
    const userId = user?.id || user?.userId;
    
    if (!userId) {
      setError("User information not available. Please refresh the page or log in again.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setProgress("");

    try {
      // Convert payroll period to ISO 8601 format (end of selected month)
      const periodDate = new Date(payrollPeriod);
      const lastDayOfMonth = new Date(
        periodDate.getFullYear(),
        periodDate.getMonth() + 1,
        0
      );
      const payrollPeriodISO = lastDayOfMonth.toISOString();

      setProgress("Validating payroll period and checking for existing runs...");

      const payrollSpecialistId = userId;

      setProgress("Processing signing bonuses and termination benefits...");

      const response = await payrollExecutionApi.generateDraftPayrollRun({
        payrollPeriod: payrollPeriodISO,
        entity: entity.trim(),
        payrollSpecialistId: payrollSpecialistId!,
        currency: currency || undefined,
        payrollManagerId: selectedPayrollManagerId || undefined,
      });

      setProgress("Draft payroll run generated successfully!");
      setResult(response);
    } catch (err: any) {
      setError(err.message || "Failed to generate draft payroll run");
      setProgress("");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "";
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

  const selectedManager = payrollManagers.find((m) => m._id === selectedPayrollManagerId);

  return (
    <div className="container mx-auto px-6 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Generate Draft Payroll Run</h1>
        <p className="text-gray-600 mt-1">
          As a Payroll Specialist, the system automatically generates draft payroll runs at the end of each cycle. You only need to review the generated drafts. The system handles all calculations automatically - no manual calculations needed.
        </p>
      </div>

      {/* Input Form */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Draft Payroll Generation</CardTitle>
          <CardDescription>
            The system automatically generates draft payroll runs at the end of each cycle. Configure the payroll period and entity to manually trigger generation, or let the system generate automatically. All calculations are performed automatically - you only need to review.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label htmlFor="payrollPeriod" className="block text-sm font-medium text-gray-700 mb-1">
              Payroll Period <span className="text-red-500">*</span>
            </label>
            <Input
              id="payrollPeriod"
              type="date"
              value={payrollPeriod}
              onChange={(e) => setPayrollPeriod(e.target.value)}
              className="mt-1"
            />
            <p className="text-xs text-gray-500 mt-1">
              Select any date in the payroll period month. The system will use the last day of that month.
            </p>
          </div>

          <div>
            <label htmlFor="entity" className="block text-sm font-medium text-gray-700 mb-1">
              Entity Name <span className="text-red-500">*</span>
            </label>
            <Input
              id="entity"
              type="text"
              value={entity}
              onChange={(e) => setEntity(e.target.value)}
              placeholder="e.g., Company Name"
              className="mt-1"
            />
            <p className="text-xs text-gray-500 mt-1">
              The entity name for this payroll run
            </p>
          </div>

          <div>
            <label htmlFor="currency" className="block text-sm font-medium text-gray-700 mb-1">
              Currency
            </label>
            <select
              id="currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mt-1"
            >
              <option value="USD">USD - US Dollar</option>
              <option value="EUR">EUR - Euro</option>
              <option value="GBP">GBP - British Pound</option>
              <option value="JPY">JPY - Japanese Yen</option>
              <option value="CAD">CAD - Canadian Dollar</option>
              <option value="AUD">AUD - Australian Dollar</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Currency for this payroll run (optional, defaults to USD)
            </p>
          </div>

          <div>
            <label htmlFor="payrollManager" className="block text-sm font-medium text-gray-700 mb-1">
              Payroll Manager (Optional)
            </label>
            {loadingManagers ? (
              <div className="text-sm text-gray-500 mt-1">Loading payroll managers...</div>
            ) : (
              <select
                id="payrollManager"
                value={selectedPayrollManagerId}
                onChange={(e) => setSelectedPayrollManagerId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mt-1"
              >
                <option value="">System will find default payroll manager</option>
                {payrollManagers.map((manager) => (
                  <option key={manager._id} value={manager._id}>
                    {manager.firstName} {manager.lastName}
                    {manager.email ? ` (${manager.email})` : ""}
                  </option>
                ))}
              </select>
            )}
            <p className="text-xs text-gray-500 mt-1">
              If not selected, the system will automatically find a default payroll manager
            </p>
          </div>

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-blue-800">
              <strong>ℹ️ Automatic Generation:</strong> The system automatically generates draft payroll runs at the end of each cycle. This manual generation option is available for on-demand generation or to regenerate drafts. After generation, you only need to review the draft.
            </p>
          </div>

          {progress && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">{progress}</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <Button
            onClick={handleGenerate}
            disabled={!payrollPeriod || !entity || loading}
            className="w-full"
          >
            {loading ? "Generating Draft..." : "Generate Draft Payroll Run"}
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <div className="space-y-6">
          {/* Success Card */}
          <Card className="border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="text-green-900">Draft Payroll Run Generated</CardTitle>
              <CardDescription className="text-green-700">
                The draft payroll run has been successfully generated with all employee calculations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 font-medium">Payroll Run ID</span>
                  <span className="font-bold text-gray-900">{result.runId}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 font-medium">Status</span>
                  <span className="px-3 py-1 rounded text-sm font-medium bg-blue-100 text-blue-800 border border-blue-300">
                    {result.status || "DRAFT"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 font-medium">Payroll Period</span>
                  <span className="font-medium text-gray-900">{formatDate(result.payrollPeriod)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 font-medium">Entity</span>
                  <span className="font-medium text-gray-900">{result.entity}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Summary Card */}
          <Card>
            <CardHeader>
              <CardTitle>Payroll Summary</CardTitle>
              <CardDescription>
                Summary of the generated draft payroll run
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <p className="text-sm text-gray-600 mb-1">Employees</p>
                  <p className="text-2xl font-bold text-blue-900">{result.employees || 0}</p>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                  <p className="text-sm text-gray-600 mb-1">Exceptions</p>
                  <p className="text-2xl font-bold text-orange-900">{result.exceptions || 0}</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <p className="text-sm text-gray-600 mb-1">Total Net Pay</p>
                  <p className="text-2xl font-bold text-green-900">
                    {result.totalnetpay ? formatCurrency(result.totalnetpay) : formatCurrency(0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Information Card */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <span className="text-xl">ℹ️</span>
                <div>
                  <p className="font-semibold text-blue-900 mb-1">Automatic Draft Generation</p>
                  <p className="text-sm text-blue-800 mb-2">
                    The system automatically generates draft payroll runs at the end of each cycle. All payroll components are calculated automatically based on configured rules - you only need to review. No manual calculations were needed:
                  </p>
                  <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                    <li><strong>Salaries:</strong> Calculated base salaries for all active employees</li>
                    <li><strong>Allowances:</strong> Applied configured allowances automatically</li>
                    <li><strong>Deductions:</strong> Calculated deductions based on configured rules</li>
                    <li><strong>Contributions:</strong> Applied tax, insurance, and other contributions automatically</li>
                    <li><strong>Signing Bonuses:</strong> Automatically processed signing bonuses for new hires</li>
                    <li><strong>Termination/Resignation Benefits:</strong> Automatically processed benefits upon resignation and termination according to business rules and signed contracts</li>
                    <li>Applied prorated salaries for mid-month hires/terminations</li>
                    <li><strong>Statutory Rules:</strong> Automatically applied income tax (Tax = % of Base Salary), pension, insurance, and labor law deductions to ensure compliance without manual intervention</li>
                    <li><strong>Net Pay:</strong> Calculated as Net Salary - Penalties (missing working hours/days) + Refunds (if available)</li>
                    <li>Flagged any exceptions or irregularities</li>
                  </ul>
                  <p className="text-sm text-blue-800 mt-3">
                    <strong>Automatic Generation:</strong> The system automatically generates draft payroll runs at the end of each cycle. As a Payroll Specialist, you only need to review the generated drafts.
                  </p>
                  <p className="text-sm text-blue-800 mt-2">
                    <strong>Next Steps:</strong> Review the draft payroll run, check for exceptions, and send for approval when ready.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <Button
              onClick={() => router.push(`/dashboard/payroll-execution/initiation`)}
              className="flex-1"
            >
              View All Payroll Runs
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setResult(null);
                setError(null);
                setProgress("");
              }}
              className="flex-1"
            >
              Generate Another Draft
            </Button>
          </div>
        </div>
      )}

      {/* Back Button */}
      {!result && (
        <div className="mt-6">
          <Button variant="outline" onClick={() => router.push("/dashboard/payroll-execution")}>
            Back to Payroll Execution
          </Button>
        </div>
      )}
    </div>
  );
}

