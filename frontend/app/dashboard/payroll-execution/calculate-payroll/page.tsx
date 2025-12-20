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

interface Employee {
  _id: string;
  firstName: string;
  lastName: string;
  employeeNumber: string;
  email?: string;
}

interface PayrollRun {
  _id: string;
  runId: string;
  payrollPeriod: string;
  status: string;
  entity?: string;
  currency?: string;
}

interface PayrollCalculationResult {
  _id: string;
  employeeId: {
    _id: string;
    firstName: string;
    lastName: string;
    employeeNumber: string;
  };
  payrollRunId: {
    _id: string;
    runId: string;
    payrollPeriod: string;
  };
  baseSalary: number;
  allowances: number;
  deductions: number;
  netSalary: number;
  netPay: number;
  bankStatus: string;
  bonus?: number;
  benefit?: number;
  exceptions?: string;
}

export default function CalculatePayrollPage() {
  const router = useRouter();
  const { user } = useAuth();
  useRequireAuth(SystemRole.PAYROLL_SPECIALIST);

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [payrollRuns, setPayrollRuns] = useState<PayrollRun[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [selectedPayrollRunId, setSelectedPayrollRunId] = useState<string>("");
  const [baseSalaryOverride, setBaseSalaryOverride] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [loadingPayrollRuns, setLoadingPayrollRuns] = useState(true);
  const [result, setResult] = useState<PayrollCalculationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [breakdown, setBreakdown] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch employees
        try {
          const employeesResponse = await employeeProfileApi.getAllEmployees({
            limit: 1000,
            status: "ACTIVE",
          });
          setEmployees(employeesResponse?.data || []);
        } catch (empErr: any) {
          // Handle 403 Forbidden errors gracefully - user may not have permission to view all employees
          if (empErr.response?.status === 403 || empErr.response?.status === 401) {
            // Silently fail - user doesn't have permission
            // Don't log these errors as they're expected for users without full permissions
            setEmployees([]);
          } else {
            // Only log non-permission errors
            console.error("Error fetching employees:", empErr);
            setEmployees([]);
          }
        }

        // Fetch payroll runs
        try {
          const runsResponse = await payrollExecutionApi.getAllPayrollRuns({
            limit: 1000,
          });
          // Handle different response formats
          let runsData = [];
          if (runsResponse) {
            if (Array.isArray(runsResponse)) {
              runsData = runsResponse;
            } else if (runsResponse.data && Array.isArray(runsResponse.data)) {
              runsData = runsResponse.data;
            } else if (runsResponse.data && !Array.isArray(runsResponse.data)) {
              // If data is a single object, wrap it in an array
              runsData = [runsResponse.data];
            }
          }
          setPayrollRuns(runsData);
        } catch (runsErr: any) {
          // Handle 403 Forbidden errors gracefully - user may not have permission to view payroll runs
          if (runsErr.response?.status === 403 || runsErr.response?.status === 401) {
            // Silently fail - user doesn't have permission
            // Don't log these errors as they're expected for users without full permissions
            setPayrollRuns([]);
          } else {
            // Only log non-permission errors
            console.error("Error fetching payroll runs:", runsErr);
            setPayrollRuns([]);
          }
        }
      } catch (err: any) {
        // Only set error for unexpected errors, not permission errors
        if (err.response?.status !== 403 && err.response?.status !== 401) {
          setError(err.message || "Failed to load data");
        }
      } finally {
        setLoadingEmployees(false);
        setLoadingPayrollRuns(false);
      }
    };

    fetchData();
  }, []);

  const handleCalculate = async () => {
    if (!selectedEmployeeId || !selectedPayrollRunId) {
      setError("Please select both an employee and a payroll run");
      return;
    }

    // Validate that selections are valid IDs
    if (!selectedEmployeeId.trim() || !selectedPayrollRunId.trim()) {
      setError("Please select valid employee and payroll run");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setBreakdown(null);

    try {
      const calculationData: any = {
        employeeId: selectedEmployeeId.trim(),
        payrollRunId: selectedPayrollRunId.trim(),
      };

      // Add base salary override if provided
      if (baseSalaryOverride && baseSalaryOverride.trim() !== "") {
        const salary = parseFloat(baseSalaryOverride);
        if (isNaN(salary) || salary < 0) {
          setError("Base salary must be a valid positive number");
          setLoading(false);
          return;
        }
        calculationData.baseSalary = salary;
      }

      // Log the request data for debugging (in development)
      if (process.env.NODE_ENV === 'development') {
        console.log("Calculating payroll with data:", calculationData);
      }

      const response = await payrollExecutionApi.calculatePayroll(calculationData);
      
      // Populate employee and payroll run details if not already populated
      const populatedResult = {
        ...response,
        employeeId: response.employeeId?._id 
          ? response.employeeId 
          : employees.find(e => e._id === response.employeeId) || { _id: response.employeeId, firstName: "", lastName: "", employeeNumber: "" },
        payrollRunId: response.payrollRunId?._id
          ? response.payrollRunId
          : payrollRuns.find(r => r._id === response.payrollRunId) || { _id: response.payrollRunId, runId: "", payrollPeriod: "" },
      };

      setResult(populatedResult);

      // Parse breakdown from exceptions field if available
      if (response.exceptions) {
        try {
          const parsed = JSON.parse(response.exceptions);
          if (parsed.deductionsBreakdown) {
            setBreakdown(parsed.deductionsBreakdown);
          }
        } catch (e) {
          // If parsing fails, breakdown will remain null
        }
      }
    } catch (err: any) {
      // Extract detailed error message from response
      let errorMessage = "Failed to calculate payroll";
      
      // Log full error for debugging
      console.error("Full error object:", err);
      console.error("Error response:", err.response);
      console.error("Error response data:", err.response?.data);
      
      // Try multiple ways to extract error message
      if (err.response?.data) {
        const errorData = err.response.data;
        
        // Check for nested error structures
        if (errorData.message) {
          errorMessage = errorData.message;
        } else if (errorData.error) {
          errorMessage = typeof errorData.error === 'string' 
            ? errorData.error 
            : errorData.error?.message || JSON.stringify(errorData.error);
        } else if (errorData.errors && Array.isArray(errorData.errors)) {
          // Handle validation errors array
          errorMessage = errorData.errors.map((e: any) => e.message || e).join(', ');
        } else if (errorData.details) {
          errorMessage = typeof errorData.details === 'string' 
            ? errorData.details 
            : errorData.details?.message || JSON.stringify(errorData.details);
        } else if (typeof errorData === 'string') {
          errorMessage = errorData;
        } else if (errorData.stack) {
          // If it's an error object, try to get message
          errorMessage = errorData.message || errorData.toString();
        } else {
          // Try to stringify the whole object to see what's in it
          try {
            const errorStr = JSON.stringify(errorData);
            if (errorStr !== '{}') {
              errorMessage = `Server error: ${errorStr}`;
            }
          } catch (e) {
            // If stringify fails, use the error message from axios
          }
        }
      } else if (err.message) {
        errorMessage = err.message;
      }

      // Provide more helpful error messages for common issues
      if (err.response?.status === 500) {
        // Only append guidance if we don't already have a detailed message
        if (errorMessage === "Failed to calculate payroll" || errorMessage === "Internal server error") {
          errorMessage = `Internal server error. Please check that:
          - The employee has a valid PayGrade configuration
          - Required payroll configurations (tax rules, insurance brackets) are approved
          - The payroll run is in a valid status
          - All required employee data is complete (contract, bank account, etc.)`;
        } else {
          // We have a detailed message, just add context
          errorMessage = `Internal server error: ${errorMessage}`;
        }
      } else if (err.response?.status === 404) {
        errorMessage = "Employee or payroll run not found. Please verify the selections.";
      } else if (err.response?.status === 400) {
        errorMessage = `Invalid request: ${errorMessage}`;
      }

      setError(errorMessage);
      
      // Enhanced logging for debugging
      console.error("Error calculating payroll - Summary:", {
        status: err.response?.status,
        statusText: err.response?.statusText,
        extractedMessage: errorMessage,
        responseData: err.response?.data,
        requestData: {
          employeeId: selectedEmployeeId,
          payrollRunId: selectedPayrollRunId,
          baseSalary: baseSalaryOverride || 'not provided'
        },
        fullError: err
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const selectedEmployee = employees.find((e) => e._id === selectedEmployeeId);
  const selectedPayrollRun = payrollRuns.find((r) => r._id === selectedPayrollRunId);

  return (
    <div className="container mx-auto px-6 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Calculate Payroll</h1>
        <p className="text-gray-600 mt-1">
          Automatically calculate salaries, allowances, deductions, and contributions based on configured rules
        </p>
      </div>

      {/* Input Form */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Payroll Calculation</CardTitle>
          <CardDescription>
            Select an employee and payroll run to automatically calculate their payroll based on configured rules
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label htmlFor="employee" className="block text-sm font-medium text-gray-700 mb-1">
              Employee <span className="text-red-500">*</span>
            </label>
            {loadingEmployees ? (
              <div className="text-sm text-gray-500 mt-1">Loading employees...</div>
            ) : (
              <>
                <select
                  id="employee"
                  value={selectedEmployeeId}
                  onChange={(e) => setSelectedEmployeeId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mt-1"
                >
                  <option value="">Select an employee</option>
                  {employees.map((employee) => (
                    <option key={employee._id} value={employee._id}>
                      {employee.firstName} {employee.lastName} ({employee.employeeNumber})
                    </option>
                  ))}
                </select>
                {employees.length === 0 && !loadingEmployees && (
                  <p className="text-xs text-gray-500 mt-1">
                    No employees available. You may not have permission to view employees, or no employees are currently active.
                  </p>
                )}
              </>
            )}
          </div>

          <div>
            <label htmlFor="payrollRun" className="block text-sm font-medium text-gray-700 mb-1">
              Payroll Run <span className="text-red-500">*</span>
            </label>
            {loadingPayrollRuns ? (
              <div className="text-sm text-gray-500 mt-1">Loading payroll runs...</div>
            ) : (
              <>
                <select
                  id="payrollRun"
                  value={selectedPayrollRunId}
                  onChange={(e) => setSelectedPayrollRunId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mt-1"
                >
                  <option value="">Select a payroll run</option>
                  {payrollRuns.map((run) => (
                    <option key={run._id} value={run._id}>
                      {run.runId} - {new Date(run.payrollPeriod).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                      })}
                    </option>
                  ))}
                </select>
                {payrollRuns.length === 0 && !loadingPayrollRuns && (
                  <p className="text-xs text-gray-500 mt-1">
                    No payroll runs available. You may not have permission to view payroll runs, or no payroll runs have been created yet.
                  </p>
                )}
              </>
            )}
          </div>

          <div>
            <label htmlFor="baseSalary" className="block text-sm font-medium text-gray-700 mb-1">
              Base Salary Override (Optional)
            </label>
            <Input
              id="baseSalary"
              type="number"
              step="0.01"
              min="0"
              value={baseSalaryOverride}
              onChange={(e) => setBaseSalaryOverride(e.target.value)}
              placeholder="Leave empty to use PayGrade base salary"
              className="mt-1"
            />
            <p className="text-xs text-gray-500 mt-1">
              If not provided, base salary will be automatically fetched from the employee's PayGrade configuration
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <span className="text-red-500 font-bold">⚠️</span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-red-900 mb-1">Error Calculating Payroll</p>
                  <p className="text-sm text-red-800 whitespace-pre-wrap">{error}</p>
                </div>
              </div>
            </div>
          )}

          <Button
            onClick={handleCalculate}
            disabled={!selectedEmployeeId || !selectedPayrollRunId || loading}
            className="w-full"
          >
            {loading ? "Calculating..." : "Calculate Payroll"}
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <div className="space-y-6">
          {/* Summary Card */}
          <Card className="border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="text-green-900">Calculation Complete</CardTitle>
              <CardDescription className="text-green-700">
                Payroll calculated successfully for {result.employeeId?.firstName} {result.employeeId?.lastName}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-lg border border-green-200">
                  <p className="text-sm text-gray-600 mb-1">Base Salary</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(result.baseSalary)}
                  </p>
                </div>
                <div className="bg-white p-4 rounded-lg border border-green-200">
                  <p className="text-sm text-gray-600 mb-1">Allowances</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(result.allowances)}
                  </p>
                </div>
                <div className="bg-white p-4 rounded-lg border border-green-200">
                  <p className="text-sm text-gray-600 mb-1">Deductions</p>
                  <p className="text-2xl font-bold text-red-600">
                    {formatCurrency(result.deductions)}
                  </p>
                </div>
                <div className="bg-white p-4 rounded-lg border border-green-200">
                  <p className="text-sm text-gray-600 mb-1">Net Pay</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {formatCurrency(result.netPay)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Detailed Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Detailed Breakdown</CardTitle>
              <CardDescription>
                Complete calculation breakdown showing all components
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Earnings Section */}
              <div className="border-b border-gray-200 pb-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Earnings</h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">Base Salary</span>
                    <span className="font-medium text-gray-900">{formatCurrency(result.baseSalary)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">Allowances</span>
                    <span className="font-medium text-green-600">{formatCurrency(result.allowances)}</span>
                  </div>
                  {result.bonus && result.bonus > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700">Bonus</span>
                      <span className="font-medium text-green-600">{formatCurrency(result.bonus)}</span>
                    </div>
                  )}
                  {result.benefit && result.benefit > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700">Benefit</span>
                      <span className="font-medium text-green-600">{formatCurrency(result.benefit)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                    <span className="font-semibold text-gray-900">Gross Salary</span>
                    <span className="font-bold text-gray-900">
                      {formatCurrency(result.baseSalary + result.allowances + (result.bonus || 0) + (result.benefit || 0))}
                    </span>
                  </div>
                </div>
              </div>

              {/* Deductions Section */}
              <div className="border-b border-gray-200 pb-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Deductions</h3>
                {breakdown ? (
                  <div className="space-y-2">
                    {breakdown.taxes && breakdown.taxes > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-700">Taxes</span>
                        <span className="font-medium text-red-600">{formatCurrency(breakdown.taxes)}</span>
                      </div>
                    )}
                    {breakdown.insurance && breakdown.insurance > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-700">Insurance</span>
                        <span className="font-medium text-red-600">{formatCurrency(breakdown.insurance)}</span>
                      </div>
                    )}
                    {breakdown.timeManagementPenalties && breakdown.timeManagementPenalties > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-700">Time Management Penalties</span>
                        <span className="font-medium text-red-600">
                          {formatCurrency(breakdown.timeManagementPenalties)}
                        </span>
                      </div>
                    )}
                    {breakdown.unpaidLeavePenalties && breakdown.unpaidLeavePenalties > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-700">Unpaid Leave Penalties</span>
                        <span className="font-medium text-red-600">
                          {formatCurrency(breakdown.unpaidLeavePenalties)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                      <span className="font-semibold text-gray-900">Total Deductions</span>
                      <span className="font-bold text-red-600">{formatCurrency(result.deductions)}</span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700">Total Deductions</span>
                      <span className="font-medium text-red-600">{formatCurrency(result.deductions)}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Detailed breakdown not available. Deductions include taxes, insurance, and penalties.
                    </p>
                  </div>
                )}
              </div>

              {/* Net Calculations */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Net Calculations</h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">Gross Salary</span>
                    <span className="font-medium text-gray-900">
                      {formatCurrency(result.baseSalary + result.allowances + (result.bonus || 0) + (result.benefit || 0))}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">Less: Deductions</span>
                    <span className="font-medium text-red-600">-{formatCurrency(result.deductions)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t-2 border-gray-300">
                    <span className="font-bold text-lg text-gray-900">Net Salary</span>
                    <span className="font-bold text-lg text-blue-600">{formatCurrency(result.netSalary)}</span>
                  </div>
                  
                  {/* Net Pay Calculation with Penalties and Refunds */}
                  <div className="pt-2 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700">Net Salary</span>
                      <span className="font-medium text-gray-900">{formatCurrency(result.netSalary)}</span>
                    </div>
                    {breakdown ? (
                      <>
                        {(breakdown.timeManagementPenalties > 0 || breakdown.unpaidLeavePenalties > 0) && (
                          <div className="flex justify-between items-center">
                            <span className="text-gray-700">
                              Less: Penalties (missing working hours/days)
                            </span>
                            <span className="font-medium text-red-600">
                              -{formatCurrency((breakdown.timeManagementPenalties || 0) + (breakdown.unpaidLeavePenalties || 0))}
                            </span>
                          </div>
                        )}
                        {breakdown.refunds && breakdown.refunds > 0 && (
                          <div className="flex justify-between items-center">
                            <span className="text-gray-700">Add: Refunds (if available)</span>
                            <span className="font-medium text-green-600">
                              +{formatCurrency(breakdown.refunds)}
                            </span>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-xs text-gray-500 italic">
                        Penalties and refunds are included in the net pay calculation but detailed breakdown is not available.
                      </div>
                    )}
                    <div className="flex justify-between items-center pt-2 border-t-2 border-blue-300">
                      <span className="font-bold text-xl text-gray-900">Net Pay</span>
                      <span className="font-bold text-xl text-blue-700">{formatCurrency(result.netPay)}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      <strong>Formula:</strong> Net Pay = Net Salary - Penalties (missing working hours/days) + Refunds (if available)
                    </p>
                  </div>
                </div>
              </div>

              {/* Bank Status */}
              <div className="pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">Bank Account Status</span>
                  <span className={`px-3 py-1 rounded text-sm font-medium ${
                    result.bankStatus === "valid"
                      ? "bg-green-100 text-green-800 border border-green-300"
                      : "bg-red-100 text-red-800 border border-red-300"
                  }`}>
                    {result.bankStatus === "valid" ? "Valid" : "Missing"}
                  </span>
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
                  <p className="font-semibold text-blue-900 mb-1">Automatic Calculation</p>
                  <p className="text-sm text-blue-800 mb-2">
                    This calculation was performed automatically based on configured rules:
                  </p>
                  <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                    <li>Base salary fetched from PayGrade configuration (unless overridden)</li>
                    <li>Allowances calculated from approved allowance configurations</li>
                    <li>Taxes and insurance calculated as percentages of base salary</li>
                    <li>Penalties calculated from missing working hours/days (time management and unpaid leave records)</li>
                    <li>Refunds included from approved claims and disputes (if available)</li>
                    <li><strong>Net Pay Formula:</strong> Net Pay = Net Salary - Penalties (missing working hours/days) + Refunds (if available)</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Back Button */}
      <div className="mt-6">
        <Button variant="outline" onClick={() => router.push("/dashboard/payroll-execution")}>
          Back to Payroll Execution
        </Button>
      </div>
    </div>
  );
}

