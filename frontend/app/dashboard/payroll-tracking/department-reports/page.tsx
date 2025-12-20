"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/use-auth";
import { useRequireAuth } from "@/lib/hooks/use-auth";
import { SystemRole } from "@/types";
import { payslipsApi } from "@/lib/api/payroll-tracking/payroll-tracking";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/shared/ui/Card";
import { Button } from "@/components/shared/ui/Button";
import { Input } from "@/components/shared/ui/Input";

interface Department {
  id: string;
  name: string;
  code?: string;
  description?: string;
  activeEmployeeCount?: number;
}

interface PayrollReport {
  department: {
    id: string;
    name: string;
    code?: string;
    description?: string;
  };
  payrollRun?: {
    runId: string;
    payrollPeriod: string;
    status: string;
  };
  summary: {
    totalEmployees: number;
    totalGrossSalary: number;
    totalDeductions: number;
    totalNetPay: number;
    averageSalary: number;
  };
  employees?: Array<{
    employeeId: string;
    employeeNumber: string;
    firstName: string;
    lastName: string;
    position?: string;
    grossSalary: number;
    deductions: number;
    netPay: number;
  }>;
}

export default function DepartmentReportsPage() {
  useRequireAuth(SystemRole.PAYROLL_SPECIALIST);
  const { user } = useAuth();
  const router = useRouter();
  
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>("");
  const [payrollRunId, setPayrollRunId] = useState<string>("");
  const [report, setReport] = useState<PayrollReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingDepartments, setLoadingDepartments] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const data = await payslipsApi.getActiveDepartments();
        setDepartments(data?.departments || []);
      } catch (err: any) {
        setError(err.message || "Failed to load departments");
      } finally {
        setLoadingDepartments(false);
      }
    };

    fetchDepartments();
  }, []);

  const handleGenerateReport = async () => {
    if (!selectedDepartmentId) {
      setError("Please select a department");
      return;
    }

    setLoading(true);
    setError(null);
    setReport(null);

    try {
      const data = await payslipsApi.getPayrollReportByDepartment(
        selectedDepartmentId,
        payrollRunId || undefined
      );
      // Ensure employees array exists, default to empty array if missing
      const reportData = {
        ...data,
        employees: data?.employees || [],
      };
      setReport(reportData);
    } catch (err: any) {
      setError(err.message || "Failed to generate report");
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

  const selectedDepartment = departments.find((d) => d.id === selectedDepartmentId);

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Department Payroll Reports</h1>
          <p className="text-gray-600 mt-1">
            As a Payroll Specialist, generate payroll reports by department, so that you can analyze salary distribution and ensure budget alignment.
          </p>
        </div>
        <Button variant="outline" onClick={() => router.push("/dashboard/payroll-specialist")}>
          Back to Dashboard
        </Button>
      </div>

      {/* Report Generation Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Generate Report</CardTitle>
          <CardDescription>Select a department and optional payroll run to generate a report</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label htmlFor="department" className="block text-sm font-medium text-gray-700 mb-1">
              Department <span className="text-red-500">*</span>
            </label>
            {loadingDepartments ? (
              <div className="text-sm text-gray-500">Loading departments...</div>
            ) : (
              <select
                id="department"
                value={selectedDepartmentId}
                onChange={(e) => setSelectedDepartmentId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a department</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name} {dept.code ? `(${dept.code})` : ""}
                    {dept.activeEmployeeCount !== undefined
                      ? ` - ${dept.activeEmployeeCount} employees`
                      : ""}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label htmlFor="payrollRunId" className="block text-sm font-medium text-gray-700 mb-1">
              Payroll Run ID (Optional)
            </label>
            <Input
              id="payrollRunId"
              type="text"
              value={payrollRunId}
              onChange={(e) => setPayrollRunId(e.target.value)}
              placeholder="e.g., PR-2025-01"
              className="w-full"
            />
            <p className="text-xs text-gray-500 mt-1">
              Leave empty to generate a report for the latest payroll run
            </p>
          </div>

          <Button
            onClick={handleGenerateReport}
            disabled={!selectedDepartmentId || loading}
            className="w-full"
          >
            {loading ? "Generating Report..." : "Generate Report"}
          </Button>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Report Results */}
      {report && (
        <div className="space-y-6">
          {/* Summary Card */}
          <Card>
            <CardHeader>
              <CardTitle>Report Summary</CardTitle>
              <CardDescription>
                {report.department.name} - {report.payrollRun?.payrollPeriod || "Latest Payroll Run"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Total Employees</p>
                  <p className="text-2xl font-bold text-blue-900">{report.summary.totalEmployees}</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Total Gross Salary</p>
                  <p className="text-2xl font-bold text-green-900">
                    {formatCurrency(report.summary.totalGrossSalary)}
                  </p>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Total Deductions</p>
                  <p className="text-2xl font-bold text-orange-900">
                    {formatCurrency(report.summary.totalDeductions)}
                  </p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Total Net Pay</p>
                  <p className="text-2xl font-bold text-purple-900">
                    {formatCurrency(report.summary.totalNetPay)}
                  </p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-600">
                  Average Salary: <span className="font-semibold text-gray-900">
                    {formatCurrency(report.summary.averageSalary)}
                  </span>
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Employee Details Table */}
          <Card>
            <CardHeader>
              <CardTitle>Employee Details</CardTitle>
              <CardDescription>Individual payroll breakdown for each employee</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border border-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-4 py-3 border-b border-gray-200 font-semibold text-gray-900">
                        Employee
                      </th>
                      <th className="text-left px-4 py-3 border-b border-gray-200 font-semibold text-gray-900">
                        Position
                      </th>
                      <th className="text-right px-4 py-3 border-b border-gray-200 font-semibold text-gray-900">
                        Gross Salary
                      </th>
                      <th className="text-right px-4 py-3 border-b border-gray-200 font-semibold text-gray-900">
                        Deductions
                      </th>
                      <th className="text-right px-4 py-3 border-b border-gray-200 font-semibold text-gray-900">
                        Net Pay
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.employees && report.employees.length > 0 ? (
                      report.employees.map((employee, index) => (
                        <tr key={employee.employeeId} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                          <td className="px-4 py-3 border-b border-gray-100">
                            <div>
                              <p className="font-medium text-gray-900">
                                {employee.firstName} {employee.lastName}
                              </p>
                              <p className="text-xs text-gray-500">{employee.employeeNumber}</p>
                            </div>
                          </td>
                          <td className="px-4 py-3 border-b border-gray-100 text-gray-700">
                            {employee.position || "N/A"}
                          </td>
                          <td className="px-4 py-3 border-b border-gray-100 text-right font-medium text-gray-900">
                            {formatCurrency(employee.grossSalary)}
                          </td>
                          <td className="px-4 py-3 border-b border-gray-100 text-right text-orange-700">
                            {formatCurrency(employee.deductions)}
                          </td>
                          <td className="px-4 py-3 border-b border-gray-100 text-right font-semibold text-green-700">
                            {formatCurrency(employee.netPay)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                          No employees found in this department for the selected payroll run
                        </td>
                      </tr>
                    )}
                  </tbody>
                  {report.employees && report.employees.length > 0 && (
                    <tfoot className="bg-gray-100">
                      <tr>
                        <td colSpan={2} className="px-4 py-3 border-t-2 border-gray-300 font-semibold text-gray-900">
                          Totals
                        </td>
                        <td className="px-4 py-3 border-t-2 border-gray-300 text-right font-bold text-gray-900">
                          {formatCurrency(report.summary.totalGrossSalary)}
                        </td>
                        <td className="px-4 py-3 border-t-2 border-gray-300 text-right font-bold text-orange-900">
                          {formatCurrency(report.summary.totalDeductions)}
                        </td>
                        <td className="px-4 py-3 border-t-2 border-gray-300 text-right font-bold text-green-900">
                          {formatCurrency(report.summary.totalNetPay)}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Budget Analysis Card */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <span className="text-xl">📊</span>
                <div>
                  <p className="font-semibold text-blue-900 mb-1">Salary Distribution & Budget Analysis</p>
                  <p className="text-sm text-blue-800 mb-2">
                    Use this report to analyze salary distribution across the department and ensure budget alignment. 
                    The report shows:
                  </p>
                  <ul className="text-sm text-blue-800 list-disc list-inside space-y-1 mb-2">
                    <li><strong>Salary Distribution:</strong> See how salaries are distributed across positions and employees in the department</li>
                    <li><strong>Budget Alignment:</strong> Compare total gross salary, deductions, and net pay against department budget allocations</li>
                    <li><strong>Average Salary:</strong> Understand the average compensation per employee in the department</li>
                    <li><strong>Financial Breakdown:</strong> Review taxes and insurance contributions by type</li>
                  </ul>
                  <p className="text-sm text-blue-800">
                    Compare total net pay against department budget allocations to ensure spending stays within approved limits.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
                    <div className="bg-white p-3 rounded border border-blue-200">
                      <p className="text-xs text-blue-700 mb-1">Gross Payroll</p>
                      <p className="text-lg font-bold text-blue-900">
                        {formatCurrency(report.summary.totalGrossSalary)}
                      </p>
                    </div>
                    <div className="bg-white p-3 rounded border border-blue-200">
                      <p className="text-xs text-blue-700 mb-1">After Deductions</p>
                      <p className="text-lg font-bold text-blue-900">
                        {formatCurrency(report.summary.totalNetPay)}
                      </p>
                    </div>
                    <div className="bg-white p-3 rounded border border-blue-200">
                      <p className="text-xs text-blue-700 mb-1">Per Employee Avg</p>
                      <p className="text-lg font-bold text-blue-900">
                        {formatCurrency(report.summary.averageSalary)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {!report && !loading && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <div className="text-4xl mb-3">📊</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Report Generated</h3>
              <p className="text-sm text-gray-600 mb-4">
                Select a department and click "Generate Report" to view payroll analysis.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

