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
  dateOfHire?: string;
}

interface ProratedSalaryResult {
  proratedSalary: number;
  baseSalary: number;
  daysInMonth: number;
  daysWorked: number;
  calculation: string;
  startDate: string;
  endDate: string;
  payrollPeriodEnd: string;
}

export default function ProratedSalaryPage() {
  const router = useRouter();
  const { user } = useAuth();
  useRequireAuth(SystemRole.PAYROLL_SPECIALIST);

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [baseSalary, setBaseSalary] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [payrollPeriodEnd, setPayrollPeriodEnd] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [result, setResult] = useState<ProratedSalaryResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        // Fetch all employees (not just ACTIVE) to include terminated/resigned employees
        // who may need prorated salary calculations
        const employeesResponse = await employeeProfileApi.getAllEmployees({
          limit: 1000,
          // Don't filter by status - we need all employees for prorated calculations
        });
        setEmployees(employeesResponse?.data || []);
      } catch (err: any) {
        // Handle 403 Forbidden errors gracefully
        if (err.response?.status === 403 || err.response?.status === 401) {
          setEmployees([]);
        } else {
          setError(err.message || "Failed to load employees");
        }
      } finally {
        setLoadingEmployees(false);
      }
    };

    fetchEmployees();
  }, []);

  // Auto-fill dates when employee is selected
  useEffect(() => {
    if (selectedEmployeeId) {
      const employee = employees.find((e) => e._id === selectedEmployeeId);
      if (employee?.dateOfHire) {
        // Set start date to hire date if not already set
        if (!startDate) {
          const hireDate = new Date(employee.dateOfHire);
          setStartDate(hireDate.toISOString().split("T")[0]);
        }
      }
    }
  }, [selectedEmployeeId, employees, startDate]);

  const handleCalculate = async () => {
    // Validation
    if (!selectedEmployeeId) {
      setError("Please select an employee");
      return;
    }
    if (!baseSalary || parseFloat(baseSalary) <= 0) {
      setError("Please enter a valid base salary");
      return;
    }
    if (!startDate) {
      setError("Please enter a start date");
      return;
    }
    if (!endDate) {
      setError("Please enter an end date");
      return;
    }
    if (!payrollPeriodEnd) {
      setError("Please enter a payroll period end date");
      return;
    }

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    const periodEnd = new Date(payrollPeriodEnd);

    if (start > end) {
      setError("Start date cannot be after end date");
      return;
    }

    if (end > periodEnd) {
      setError("End date cannot be after payroll period end date");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Convert dates to ISO 8601 format
      const startDateISO = new Date(startDate).toISOString();
      const endDateISO = new Date(endDate).toISOString();
      const payrollPeriodEndISO = new Date(payrollPeriodEnd).toISOString();

      const proratedSalary = await payrollExecutionApi.calculateProratedSalary({
        employeeId: selectedEmployeeId,
        baseSalary: parseFloat(baseSalary),
        startDate: startDateISO,
        endDate: endDateISO,
        payrollPeriodEnd: payrollPeriodEndISO,
      });

      // Calculate breakdown for display
      const daysInMonth = new Date(
        periodEnd.getFullYear(),
        periodEnd.getMonth() + 1,
        0,
      ).getDate();

      const timeDiff = end.getTime() - start.getTime();
      const daysWorked = Math.ceil(timeDiff / (1000 * 60 * 60 * 24)) + 1;
      const actualDaysWorked = Math.min(daysWorked, daysInMonth);

      const calculation = `(${formatCurrency(parseFloat(baseSalary))} / ${daysInMonth} days) × ${actualDaysWorked} days worked`;

      setResult({
        proratedSalary,
        baseSalary: parseFloat(baseSalary),
        daysInMonth,
        daysWorked: actualDaysWorked,
        calculation,
        startDate: startDateISO,
        endDate: endDateISO,
        payrollPeriodEnd: payrollPeriodEndISO,
      });
    } catch (err: any) {
      setError(err.message || "Failed to calculate prorated salary");
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

  const selectedEmployee = employees.find((e) => e._id === selectedEmployeeId);

  // Set default payroll period end to end of current month if not set
  useEffect(() => {
    if (!payrollPeriodEnd) {
      const now = new Date();
      const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      setPayrollPeriodEnd(lastDayOfMonth.toISOString().split("T")[0]);
    }
  }, [payrollPeriodEnd]);

  return (
    <div className="container mx-auto px-6 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Calculate Prorated Salary</h1>
        <p className="text-gray-600 mt-1">
          As a Payroll Specialist, calculate prorated salaries for mid-month hires, terminations, and resignations. The system automatically checks HR events (new hire, termination, resigned) during payroll processing to ensure payments are accurate for partial periods.
        </p>
      </div>

      {/* Input Form */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Prorated Salary Calculation</CardTitle>
          <CardDescription>
            Enter employee details and work period to calculate the prorated salary amount. The system automatically checks HR events (new hire, termination, resigned) during payroll processing and calculates prorated salaries for mid-month hires and terminations to ensure accurate payments for partial periods.
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
                    {employee.dateOfHire ? ` - Hired: ${formatDate(employee.dateOfHire)}` : ""}
                  </option>
                ))}
              </select>
            )}
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
              Enter the full monthly base salary amount
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
                Start Date <span className="text-red-500">*</span>
              </label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">
                First day of work period (hire date or contract start)
              </p>
            </div>

            <div>
              <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">
                End Date <span className="text-red-500">*</span>
              </label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">
                Last day of work period (termination date or contract end)
              </p>
            </div>
          </div>

          <div>
            <label htmlFor="payrollPeriodEnd" className="block text-sm font-medium text-gray-700 mb-1">
              Payroll Period End Date <span className="text-red-500">*</span>
            </label>
            <Input
              id="payrollPeriodEnd"
              type="date"
              value={payrollPeriodEnd}
              onChange={(e) => setPayrollPeriodEnd(e.target.value)}
              className="mt-1"
            />
            <p className="text-xs text-gray-500 mt-1">
              Last day of the payroll period month (used to calculate days in month)
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>ℹ️ Automatic HR Event Checking:</strong> During payroll draft generation, the system automatically checks HR events (new hire, termination, resigned) for each employee and calculates prorated salaries when needed. This manual calculation tool is for verification or special cases.
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <Button
            onClick={handleCalculate}
            disabled={!selectedEmployeeId || !baseSalary || !startDate || !endDate || !payrollPeriodEnd || loading}
            className="w-full"
          >
            {loading ? "Calculating..." : "Calculate Prorated Salary"}
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <div className="space-y-6">
          {/* Result Card */}
          <Card className="border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="text-green-900">Calculation Complete</CardTitle>
              <CardDescription className="text-green-700">
                Prorated salary calculated successfully
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-4">
                <p className="text-sm text-gray-600 mb-2">Prorated Salary</p>
                <p className="text-4xl font-bold text-green-700">
                  {formatCurrency(result.proratedSalary)}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Calculation Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Calculation Breakdown</CardTitle>
              <CardDescription>
                Detailed breakdown of the prorated salary calculation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                  <span className="text-gray-700">Base Salary (Monthly)</span>
                  <span className="font-medium text-gray-900">{formatCurrency(result.baseSalary)}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Days in Payroll Period Month</span>
                  <span className="font-medium text-gray-900">{result.daysInMonth} days</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Days Worked (Inclusive)</span>
                  <span className="font-medium text-gray-900">{result.daysWorked} days</span>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                  <p className="text-sm font-semibold text-blue-900 mb-2">Calculation Formula</p>
                  <p className="text-sm text-blue-800 font-mono">
                    Prorated Salary = (Base Salary ÷ Days in Month) × Days Worked
                  </p>
                  <p className="text-sm text-blue-700 mt-2 font-mono">
                    = {result.calculation}
                  </p>
                </div>

                <div className="flex justify-between items-center pt-3 border-t-2 border-gray-300">
                  <span className="font-bold text-lg text-gray-900">Prorated Salary</span>
                  <span className="font-bold text-lg text-green-600">
                    {formatCurrency(result.proratedSalary)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Period Information */}
          <Card>
            <CardHeader>
              <CardTitle>Period Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Start Date</p>
                  <p className="text-gray-900">{formatDate(result.startDate)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">End Date</p>
                  <p className="text-gray-900">{formatDate(result.endDate)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Payroll Period End</p>
                  <p className="text-gray-900">{formatDate(result.payrollPeriodEnd)}</p>
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
                  <p className="font-semibold text-blue-900 mb-1">Prorated Salary Calculation</p>
                  <p className="text-sm text-blue-800 mb-2">
                    The system automatically checks HR events and calculates prorated salaries for employees who work partial periods:
                  </p>
                  <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                    <li><strong>New Hires:</strong> System checks hire date and calculates prorated salary for mid-month hires</li>
                    <li><strong>Terminations:</strong> System checks termination date and calculates prorated salary for mid-month terminations</li>
                    <li><strong>Resignations:</strong> System checks resignation date and calculates prorated salary for mid-month resignations</li>
                    <li><strong>Partial contracts:</strong> Employees with contracts that don't cover the full period</li>
                  </ul>
                  <p className="text-sm text-blue-800 mt-3">
                    <strong>Automatic Processing:</strong> During payroll draft generation, the system automatically:
                  </p>
                  <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside mt-1">
                    <li>Checks HR events (new hire, termination, resigned) for each employee</li>
                    <li>Determines if proration is needed based on hire/termination/resignation dates</li>
                    <li>Calculates prorated salary: (Base Salary ÷ Days in Month) × Days Worked</li>
                    <li>Ensures payments are accurate for partial periods</li>
                  </ul>
                  <p className="text-sm text-blue-800 mt-3">
                    <strong>Formula:</strong> Prorated Salary = (Base Salary ÷ Days in Month) × Days Worked (inclusive of both start and end dates)
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

