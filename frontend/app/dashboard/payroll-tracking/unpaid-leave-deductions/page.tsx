"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/hooks/use-auth";
import { useRequireAuth } from "@/lib/hooks/use-auth";
import { SystemRole } from "@/types";
import { payslipsApi } from "@/lib/api/payroll-tracking/payroll-tracking";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/shared/ui/Card";
import { Button } from "@/components/shared/ui/Button";
import { useRouter } from "next/navigation";

interface UnpaidLeaveRequest {
  leaveRequestId: string;
  leaveType: {
    id: string;
    name: string;
    code: string;
    paid: boolean;
    deductible: boolean;
  };
  dates: {
    from: string;
    to: string;
  };
  durationDays: number;
  daysInPayrollPeriod: number;
  dailySalary: number;
  deductionAmount: number;
  justification?: string;
  status: string;
}

interface UnpaidLeaveDeductionsData {
  employeeId: string;
  employeeNumber: string;
  baseSalary: number;
  dailySalary: number;
  hourlySalary: number;
  unpaidLeaveRequests: UnpaidLeaveRequest[];
  totalUnpaidLeaveDays: number;
  totalDeductionAmount: number;
  payslipDeduction?: number;
  payslipId?: string;
  payrollPeriod?: {
    payrollRunId: string;
    runId: string;
    period: string;
    startDate?: string;
    endDate?: string;
  };
}

export default function UnpaidLeaveDeductionsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [deductionsData, setDeductionsData] = useState<UnpaidLeaveDeductionsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // All authenticated users can view their own unpaid leave deductions (all roles are employees)
  // No need for restrictive useRequireAuth

  useEffect(() => {
    const fetchUnpaidLeaveDeductions = async () => {
      if (!user?.id && !user?.userId) {
        setError("User ID not found");
        setLoading(false);
        return;
      }

      try {
        const employeeId = user.id || user.userId;
        const data = await payslipsApi.getUnpaidLeaveDeductions(employeeId!);
        setDeductionsData(data);
      } catch (err: any) {
        setError(err.message || "Failed to load unpaid leave deductions information");
      } finally {
        setLoading(false);
      }
    };

    fetchUnpaidLeaveDeductions();
  }, [user]);

  const formatCurrency = (amount?: number) => {
    if (amount === null || amount === undefined) return "N/A";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
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

  const formatDateRange = (from: string, to: string) => {
    try {
      const fromDate = new Date(from);
      const toDate = new Date(to);
      const fromFormatted = fromDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      const toFormatted = toDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
      return `${fromFormatted} - ${toFormatted}`;
    } catch {
      return `${from} - ${to}`;
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading unpaid leave deductions information...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-6 py-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-red-600 mb-4">{error}</p>
              <div className="flex gap-2 justify-center">
                <Button onClick={() => window.location.reload()}>Retry</Button>
                <Button variant="outline" onClick={() => router.push("/dashboard/payroll-tracking")}>
                  Back to Payroll
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!deductionsData) {
    return (
      <div className="container mx-auto px-6 py-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-gray-500 mb-4">No unpaid leave deductions information available</p>
              <Button onClick={() => router.push("/dashboard/payroll-tracking")}>
                Back to Payroll
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const hasUnpaidLeaves = deductionsData.unpaidLeaveRequests.length > 0;
  const hasDeductions = deductionsData.totalDeductionAmount > 0 || deductionsData.payslipDeduction;

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Unpaid Leave Deductions</h1>
          <p className="text-gray-600 mt-1">
            As an Employee, view deductions for unpaid leave days, so you understand how your time off affects your salary.
          </p>
        </div>
        <Button variant="outline" onClick={() => router.push("/dashboard/payroll-tracking")}>
          Back to Payroll
        </Button>
      </div>

      {/* Payroll Period Info */}
      {deductionsData.payrollPeriod && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Payroll Period</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {deductionsData.payrollPeriod.runId && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Payroll Run ID</p>
                  <p className="font-semibold text-gray-900">
                    {deductionsData.payrollPeriod.runId}
                  </p>
                </div>
              )}
              {deductionsData.payrollPeriod.period && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Period</p>
                  <p className="font-semibold text-gray-900">
                    {formatDate(deductionsData.payrollPeriod.period)}
                  </p>
                </div>
              )}
              {deductionsData.payrollPeriod.startDate && deductionsData.payrollPeriod.endDate && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Date Range</p>
                  <p className="font-semibold text-gray-900 text-sm">
                    {formatDate(deductionsData.payrollPeriod.startDate)} - {formatDate(deductionsData.payrollPeriod.endDate)}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Salary Information */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Salary Information</CardTitle>
          <CardDescription>Base salary used for deduction calculations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-500 mb-1">Monthly Base Salary</p>
              <p className="text-xl font-bold text-gray-900">
                {formatCurrency(deductionsData.baseSalary)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Daily Salary</p>
              <p className="text-xl font-bold text-blue-600">
                {formatCurrency(deductionsData.dailySalary)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Hourly Salary</p>
              <p className="text-xl font-bold text-blue-600">
                {formatCurrency(deductionsData.hourlySalary)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Card */}
      <Card className={`mb-6 ${hasDeductions ? 'border-red-300' : 'border-green-300'}`}>
        <CardHeader>
          <CardTitle className={hasDeductions ? 'text-red-900' : 'text-green-900'}>
            Deduction Summary
          </CardTitle>
          <CardDescription>
            {hasDeductions
              ? "Total deductions for unpaid leave days"
              : "No unpaid leave deductions for this period"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <p className="text-sm text-gray-500 mb-1">Total Unpaid Leave Days</p>
              <p className="text-2xl font-bold text-gray-900">
                {deductionsData.totalUnpaidLeaveDays}
              </p>
            </div>
            <div className={`p-4 border rounded-lg ${
              deductionsData.totalDeductionAmount > 0
                ? 'bg-red-50 border-red-200'
                : 'bg-gray-50 border-gray-200'
            }`}>
              <p className="text-sm text-gray-500 mb-1">Calculated Deduction</p>
              <p className={`text-2xl font-bold ${
                deductionsData.totalDeductionAmount > 0 ? 'text-red-600' : 'text-gray-900'
              }`}>
                {formatCurrency(deductionsData.totalDeductionAmount)}
              </p>
            </div>
            {deductionsData.payslipDeduction !== null && deductionsData.payslipDeduction !== undefined && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Actual Deduction (from Payslip)</p>
                <p className="text-2xl font-bold text-red-600">
                  -{formatCurrency(deductionsData.payslipDeduction)}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Unpaid Leave Requests Details */}
      {hasUnpaidLeaves ? (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Unpaid Leave Requests</CardTitle>
            <CardDescription>
              Detailed breakdown of unpaid leave days and their impact on your salary
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {deductionsData.unpaidLeaveRequests.map((leave, idx) => (
                <div
                  key={idx}
                  className="p-5 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors bg-white"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="text-lg font-semibold text-gray-900">
                          {leave.leaveType.name}
                        </h4>
                        <span className="px-2 py-1 rounded text-xs font-medium bg-orange-100 text-orange-800 border border-orange-300">
                          {leave.leaveType.code}
                        </span>
                        {!leave.leaveType.paid && (
                          <span className="px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800 border border-red-300">
                            Unpaid
                          </span>
                        )}
                        {leave.leaveType.deductible && (
                          <span className="px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-300">
                            Deductible
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-600">
                        <div>
                          <span className="font-medium">Date Range:</span>{" "}
                          {formatDateRange(leave.dates.from, leave.dates.to)}
                        </div>
                        <div>
                          <span className="font-medium">Status:</span>{" "}
                          <span className="capitalize">{leave.status.toLowerCase()}</span>
                        </div>
                      </div>
                      {leave.justification && (
                        <p className="text-sm text-gray-600 mt-2">
                          <span className="font-medium">Justification:</span> {leave.justification}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="pt-3 mt-3 border-t border-gray-200">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Total Days</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {leave.durationDays} {leave.durationDays === 1 ? "day" : "days"}
                        </p>
                      </div>
                      {deductionsData.payrollPeriod && (
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Days in Period</p>
                          <p className="text-sm font-semibold text-gray-900">
                            {leave.daysInPayrollPeriod} {leave.daysInPayrollPeriod === 1 ? "day" : "days"}
                          </p>
                        </div>
                      )}
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Daily Salary</p>
                        <p className="text-sm font-semibold text-blue-600">
                          {formatCurrency(leave.dailySalary)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Deduction Amount</p>
                        <p className="text-sm font-semibold text-red-600">
                          -{formatCurrency(leave.deductionAmount)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="mb-6 bg-green-50 border-green-200">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-4xl mb-3">✅</div>
              <h3 className="text-lg font-semibold text-green-900 mb-2">
                No Unpaid Leave Deductions
              </h3>
              <p className="text-sm text-green-800">
                You have no unpaid leave days that result in salary deductions for this period.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Information Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <span className="text-xl">ℹ️</span>
            <div>
              <p className="font-semibold text-blue-900 mb-1">How Your Time Off Affects Your Salary</p>
              <p className="text-sm text-blue-800 mb-3">
                Understanding how unpaid leave days result in salary deductions helps you plan your time off. Here's how it works:
              </p>
              <ul className="text-sm text-blue-800 list-disc list-inside space-y-1 mb-3">
                <li>
                  <strong>Unpaid Leave Days:</strong> When you take leave that is marked as "unpaid", each day you're absent results in a salary deduction. This is why part of your salary may be reduced.
                </li>
                <li>
                  <strong>Calculation Formula:</strong> Deduction Amount = Number of unpaid leave days × Daily salary. The more unpaid leave days you take, the greater the deduction.
                </li>
                <li>
                  <strong>Daily Salary Calculation:</strong> Your daily salary is calculated as your monthly base salary ÷ 30 days. This daily rate is used to determine how much is deducted per unpaid leave day.
                </li>
                <li>
                  <strong>Payroll Period Impact:</strong> Only unpaid leave days that fall within the current payroll period are included in the deduction calculation. Leave days outside the period won't affect this period's salary.
                </li>
                <li>
                  <strong>Leave Type Matters:</strong> Leave types marked as "unpaid" or "deductible" will result in salary deductions. Paid leave types (like vacation or sick leave) do not result in deductions.
                </li>
                <li>
                  <strong>Time Off Planning:</strong> Understanding these deductions helps you plan your time off. If you need to take unpaid leave, you'll know exactly how it will affect your salary.
                </li>
              </ul>
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> Each unpaid leave request shows the specific deduction amount calculated for that leave period. 
                The total deduction is the sum of all unpaid leave days within the payroll period. If you have questions about unpaid leave deductions 
                or believe there is an error, please contact HR or your supervisor for clarification.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

