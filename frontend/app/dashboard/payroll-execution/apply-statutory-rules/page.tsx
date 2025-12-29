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

interface StatutoryRulesResult {
  total: number;
  taxes: number;
  insurance: number;
  baseSalary: number;
}

export default function ApplyStatutoryRulesPage() {
  const router = useRouter();
  const { user } = useAuth();
  useRequireAuth(SystemRole.PAYROLL_SPECIALIST);

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [baseSalary, setBaseSalary] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [result, setResult] = useState<StatutoryRulesResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const employeesResponse = await employeeProfileApi.getAllEmployees({
          limit: 1000,
          status: "ACTIVE",
        });
        setEmployees(employeesResponse?.data || []);
      } catch (err: any) {
        setError(err.message || "Failed to load employees");
      } finally {
        setLoadingEmployees(false);
      }
    };

    fetchEmployees();
  }, []);

  const handleApply = async () => {
    // Validation
    if (!selectedEmployeeId) {
      setError("Please select an employee");
      return;
    }
    if (!baseSalary || parseFloat(baseSalary) <= 0) {
      setError("Please enter a valid base salary");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await payrollExecutionApi.applyStatutoryRules({
        employeeId: selectedEmployeeId,
        baseSalary: parseFloat(baseSalary),
      });

      setResult({
        ...response,
        baseSalary: parseFloat(baseSalary),
      });
    } catch (err: any) {
      setError(err.message || "Failed to apply statutory rules");
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

  const formatPercentage = (amount: number, base: number) => {
    if (base === 0) return "0%";
    return `${((amount / base) * 100).toFixed(2)}%`;
  };

  const selectedEmployee = employees.find((e) => e._id === selectedEmployeeId);

  return (
    <div className="container mx-auto px-6 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Apply Statutory Rules</h1>
        <p className="text-gray-600 mt-1">
          As a Payroll Specialist, auto-apply statutory rules (income tax, pension, insurance, labor law deductions) so that compliance is ensured without manual intervention. Deductions: Taxes = % of Base Salary, Insurance. Net Salary = Base Salary - Deductions.
        </p>
      </div>

      {/* Input Form */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Statutory Rules Application</CardTitle>
          <CardDescription>
            Select an employee and enter base salary. The system will automatically apply statutory rules (income tax, pension, insurance, labor law deductions) to ensure compliance without manual intervention.
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
            )}
            <p className="text-xs text-gray-500 mt-1">
              Employee selection is used to fetch employee-specific tax and insurance rules
            </p>
          </div>

          <div>
            <label htmlFor="baseSalary" className="block text-sm font-medium text-gray-700 mb-1">
              Base Salary <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
              <Input
                id="baseSalary"
                type="number"
                step="0.01"
                min="0"
                value={baseSalary}
                onChange={(e) => setBaseSalary(e.target.value)}
                placeholder="Enter monthly base salary"
                className="pl-7"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Base salary is used to calculate deductions: <strong>Taxes = % of Base Salary</strong>, Insurance based on salary brackets. Net Salary = Base Salary - Deductions (Taxes + Insurance).
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <Button
            onClick={handleApply}
            disabled={!selectedEmployeeId || !baseSalary || loading}
            className="w-full"
          >
            {loading ? "Applying Statutory Rules..." : "Apply Statutory Rules"}
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <div className="space-y-6">
          {/* Summary Card */}
          <Card className="border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="text-green-900">Statutory Rules Applied</CardTitle>
              <CardDescription className="text-green-700">
                Deductions calculated successfully for {selectedEmployee?.firstName} {selectedEmployee?.lastName}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-4">
                <p className="text-sm text-gray-600 mb-2">Total Statutory Deductions</p>
                <p className="text-4xl font-bold text-green-700">
                  {formatCurrency(result.total)}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Detailed Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Deductions Breakdown</CardTitle>
              <CardDescription>
                Detailed breakdown of all statutory deductions applied
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Base Salary */}
              <div className="border-b border-gray-200 pb-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 font-medium">Base Salary</span>
                  <span className="font-bold text-gray-900">{formatCurrency(result.baseSalary)}</span>
                </div>
              </div>

              {/* Taxes Section */}
              <div className="border-b border-gray-200 pb-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Taxes</h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">Income Tax</span>
                    <div className="text-right">
                      <span className="font-medium text-red-600">{formatCurrency(result.taxes)}</span>
                      <span className="text-xs text-gray-500 ml-2">
                        ({formatPercentage(result.taxes, result.baseSalary)})
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    <strong>Tax = % of Base Salary</strong> - Calculated as percentage of base salary from approved tax rules (BR 35)
                  </p>
                </div>
              </div>

              {/* Insurance Section */}
              <div className="border-b border-gray-200 pb-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Insurance & Pension</h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">Social/Health Insurance</span>
                    <div className="text-right">
                      <span className="font-medium text-red-600">{formatCurrency(result.insurance)}</span>
                      <span className="text-xs text-gray-500 ml-2">
                        ({formatPercentage(result.insurance, result.baseSalary)})
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Calculated from approved insurance brackets based on base salary range (BR 35)
                  </p>
                </div>
              </div>

              {/* Total Deductions */}
              <div className="pt-4 border-t-2 border-gray-300">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-lg text-gray-900">Total Statutory Deductions</span>
                  <span className="font-bold text-lg text-red-600">{formatCurrency(result.total)}</span>
                </div>
                <div className="mt-2 text-right">
                  <span className="text-xs text-gray-500">
                    {formatPercentage(result.total, result.baseSalary)} of base salary
                  </span>
                </div>
              </div>

              {/* Net Salary Calculation */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-blue-900">Net Salary Calculation</span>
                </div>
                <div className="space-y-1 text-sm text-blue-800">
                  <div className="flex justify-between">
                    <span>Base Salary:</span>
                    <span className="font-medium">{formatCurrency(result.baseSalary)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Less: Statutory Deductions:</span>
                    <span className="font-medium text-red-600">-{formatCurrency(result.total)}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-blue-200 font-bold">
                    <span>Net Salary:</span>
                    <span className="text-blue-900">
                      {formatCurrency(result.baseSalary - result.total)}
                    </span>
                  </div>
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
                  <p className="font-semibold text-blue-900 mb-1">Automatic Statutory Rules Application</p>
                  <p className="text-sm text-blue-800 mb-2">
                    The system automatically applies statutory rules to ensure compliance without manual intervention:
                  </p>
                  <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                    <li><strong>Income Tax:</strong> Tax = % of Base Salary - Calculated as percentage of base salary from approved tax rules</li>
                    <li><strong>Pension:</strong> Automatically calculated based on approved pension rules and regulations</li>
                    <li><strong>Social/Health Insurance:</strong> Calculated from approved insurance brackets based on base salary range</li>
                    <li><strong>Labor Law Deductions:</strong> Automatically applied according to labor law requirements</li>
                    <li><strong>Compliance:</strong> Only approved tax, insurance, pension, and labor law rules are applied</li>
                    <li><strong>Automatic:</strong> No manual intervention required - all calculations follow configured rules</li>
                  </ul>
                  <p className="text-sm text-blue-800 mt-3">
                    <strong>Deductions Calculation:</strong> Taxes (Tax = % of Base Salary) + Insurance = Total Deductions
                  </p>
                  <p className="text-sm text-blue-800 mt-2">
                    <strong>Net Salary Formula:</strong> Net Salary = Base Salary - Deductions (Taxes + Insurance)
                  </p>
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

