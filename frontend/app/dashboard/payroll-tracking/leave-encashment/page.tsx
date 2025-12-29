"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/hooks/use-auth";
import { useRequireAuth } from "@/lib/hooks/use-auth";
import { SystemRole } from "@/types";
import { payslipsApi } from "@/lib/api/payroll-tracking/payroll-tracking";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/shared/ui/Card";
import { Button } from "@/components/shared/ui/Button";
import { useRouter } from "next/navigation";

interface LeaveEncashmentData {
  employeeId: string;
  employeeNumber: string;
  baseSalary: number;
  dailySalary: number;
  leaveEntitlements: Array<{
    leaveType: {
      _id?: string;
      name: string;
      code?: string;
    };
    remaining: number;
    accrued: number;
    taken: number;
    yearlyEntitlement: number;
  }>;
  encashableLeaves: Array<{
    leaveType: {
      id: string;
      name: string;
      code?: string;
    };
    remainingDays: number;
    accruedDays: number;
    takenDays: number;
    potentialEncashmentAmount: number;
    isEncashable: boolean;
  }>;
  encashmentInPayslip: Array<{
    type: string;
    name: string;
    amount: number;
    description?: string;
    configurationDetails?: any;
  }>;
  totalEncashmentInPayslip: number;
  payslipId?: string;
  payrollPeriod?: {
    payrollRunId: string;
    runId: string;
    period: string;
    startDate: string;
    endDate: string;
  };
}

export default function LeaveEncashmentPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [leaveEncashmentData, setLeaveEncashmentData] = useState<LeaveEncashmentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // All authenticated users can view their own leave encashment (all roles are employees)
  // No need for restrictive useRequireAuth

  useEffect(() => {
    const fetchLeaveEncashment = async () => {
      if (!user?.id && !user?.userId) {
        setError("User ID not found");
        setLoading(false);
        return;
      }

      try {
        const employeeId = user.id || user.userId;
        const data = await payslipsApi.getLeaveEncashment(employeeId!);
        setLeaveEncashmentData(data);
      } catch (err: any) {
        setError(err.message || "Failed to load leave encashment information");
      } finally {
        setLoading(false);
      }
    };

    fetchLeaveEncashment();
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

  if (loading) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading leave encashment information...</p>
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
              <Button onClick={() => window.location.reload()}>Retry</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!leaveEncashmentData) {
    return (
      <div className="container mx-auto px-6 py-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-gray-500 mb-4">No leave encashment information available</p>
              <Button onClick={() => router.push("/dashboard/payroll-tracking")}>
                Back to Payroll
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Leave Encashment</h1>
          <p className="text-gray-600 mt-1">
            As an Employee, view compensation for unused or encashed leave days so you understand how your remaining leave converts into pay.
          </p>
        </div>
        <Button variant="outline" onClick={() => router.push("/dashboard/payroll-tracking")}>
          Back to Payroll
        </Button>
      </div>

      {/* Summary Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Salary Information</CardTitle>
          <CardDescription>Base salary used for leave encashment calculations - understand how your remaining leave converts into pay</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-500 mb-1">Monthly Base Salary</p>
              <p className="text-xl font-bold text-gray-900">
                {formatCurrency(leaveEncashmentData.baseSalary)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Daily Salary</p>
              <p className="text-xl font-bold text-blue-600">
                {formatCurrency(leaveEncashmentData.dailySalary)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Calculated as monthly salary ÷ 30 days
              </p>
              <p className="text-xs text-blue-600 mt-1 font-medium">
                Used to calculate leave encashment
              </p>
            </div>
            {leaveEncashmentData.payrollPeriod && (
              <div>
                <p className="text-sm text-gray-500 mb-1">Payroll Period</p>
                <p className="text-sm font-semibold text-gray-900">
                  {formatDate(leaveEncashmentData.payrollPeriod.period)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Run ID: {leaveEncashmentData.payrollPeriod.runId}
                </p>
              </div>
            )}
          </div>
          {leaveEncashmentData.encashableLeaves.length > 0 && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm font-semibold text-green-900 mb-1">
                Total Potential Encashment Value
              </p>
              <p className="text-2xl font-bold text-green-700">
                {formatCurrency(
                  leaveEncashmentData.encashableLeaves.reduce(
                    (sum, leave) => sum + leave.potentialEncashmentAmount,
                    0
                  )
                )}
              </p>
              <p className="text-xs text-green-700 mt-1">
                Based on {leaveEncashmentData.encashableLeaves.reduce(
                  (sum, leave) => sum + leave.remainingDays,
                  0
                )} unused leave days × {formatCurrency(leaveEncashmentData.dailySalary)} per day
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Encashable Leaves */}
        <Card>
          <CardHeader>
            <CardTitle>Potential Leave Encashment</CardTitle>
            <CardDescription>
              Unused leave days that can be converted to compensation
            </CardDescription>
          </CardHeader>
          <CardContent>
            {leaveEncashmentData.encashableLeaves.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No encashable leave days available</p>
                <p className="text-sm text-gray-400 mt-2">
                  You don't have any unused leave days that can be encashed at this time.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {leaveEncashmentData.encashableLeaves.map((leave, idx) => (
                  <div
                    key={idx}
                    className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-semibold text-gray-900">
                          {leave.leaveType.name}
                        </h4>
                        {leave.leaveType.code && (
                          <p className="text-xs text-gray-500">{leave.leaveType.code}</p>
                        )}
                      </div>
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">
                        Encashable
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mt-3 text-sm">
                      <div>
                        <p className="text-gray-500">Remaining Days</p>
                        <p className="font-semibold text-gray-900">{leave.remainingDays}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Potential Value</p>
                        <p className="font-semibold text-green-600">
                          {formatCurrency(leave.potentialEncashmentAmount)}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-gray-200 text-xs text-gray-600">
                      <p>
                        <span className="font-medium">Calculation:</span> {leave.remainingDays} days ×{" "}
                        {formatCurrency(leaveEncashmentData.dailySalary)} ={" "}
                        {formatCurrency(leave.potentialEncashmentAmount)}
                      </p>
                    </div>
                  </div>
                ))}
                <div className="pt-4 border-t-2 border-gray-300 mt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold text-gray-900">
                      Total Potential Encashment
                    </span>
                    <span className="text-xl font-bold text-green-600">
                      {formatCurrency(
                        leaveEncashmentData.encashableLeaves.reduce(
                          (sum, leave) => sum + leave.potentialEncashmentAmount,
                          0
                        )
                      )}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actual Encashment in Payslip */}
        <Card>
          <CardHeader>
            <CardTitle>Encashment in Payslip</CardTitle>
            <CardDescription>
              Leave encashment already included in your payslip
            </CardDescription>
          </CardHeader>
          <CardContent>
            {leaveEncashmentData.encashmentInPayslip.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No leave encashment in current payslip</p>
                <p className="text-sm text-gray-400 mt-2">
                  Leave encashment will appear here once it's included in a payslip.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {leaveEncashmentData.encashmentInPayslip.map((encashment, idx) => (
                  <div
                    key={idx}
                    className="p-4 bg-blue-50 border border-blue-200 rounded-lg"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-semibold text-gray-900">{encashment.name}</h4>
                        {encashment.description && (
                          <p className="text-sm text-gray-600 mt-1">{encashment.description}</p>
                        )}
                      </div>
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                        Paid
                      </span>
                    </div>
                    <div className="mt-3">
                      <p className="text-sm text-gray-500">Amount</p>
                      <p className="text-xl font-bold text-blue-600">
                        {formatCurrency(encashment.amount)}
                      </p>
                    </div>
                    {encashment.configurationDetails && (
                      <div className="mt-3 pt-3 border-t border-blue-200 text-xs text-gray-600">
                        <p>
                          <span className="font-medium">Status:</span>{" "}
                          {encashment.configurationDetails.status}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
                <div className="pt-4 border-t-2 border-blue-300 mt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold text-gray-900">
                      Total Encashment in Payslip
                    </span>
                    <span className="text-xl font-bold text-blue-600">
                      {formatCurrency(leaveEncashmentData.totalEncashmentInPayslip)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Leave Entitlements Overview */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Leave Entitlements Overview</CardTitle>
          <CardDescription>Your current leave balance and usage</CardDescription>
        </CardHeader>
        <CardContent>
          {leaveEncashmentData.leaveEntitlements.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No leave entitlements found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                      Leave Type
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">
                      Yearly Entitlement
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">
                      Accrued
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">
                      Taken
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">
                      Remaining
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {leaveEncashmentData.leaveEntitlements.map((entitlement, idx) => {
                    const leaveType = entitlement.leaveType as any;
                    const isEncashable = leaveEncashmentData.encashableLeaves.some(
                      (el) => el.leaveType.id === leaveType?._id?.toString() || el.leaveType.id === leaveType
                    );
                    return (
                      <tr
                        key={idx}
                        className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                      >
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-medium text-gray-900">
                              {leaveType?.name || "Unknown"}
                            </p>
                            {isEncashable && (
                              <span className="text-xs text-green-600 font-medium">
                                Encashable
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="text-right py-3 px-4 text-sm text-gray-700">
                          {entitlement.yearlyEntitlement} days
                        </td>
                        <td className="text-right py-3 px-4 text-sm text-gray-700">
                          {entitlement.accrued} days
                        </td>
                        <td className="text-right py-3 px-4 text-sm text-gray-700">
                          {entitlement.taken} days
                        </td>
                        <td className="text-right py-3 px-4">
                          <span
                            className={`font-semibold ${
                              entitlement.remaining > 0 ? "text-green-600" : "text-gray-600"
                            }`}
                          >
                            {entitlement.remaining} days
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Information Note */}
      <Card className="mt-6 bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <span className="text-xl">ℹ️</span>
            <div>
              <p className="font-semibold text-blue-900 mb-1">How Leave Encashment Works</p>
              <p className="text-sm text-blue-800 mb-2">
                Leave encashment allows you to convert unused leave days into monetary compensation.
                The calculation is based on your daily salary (monthly base salary ÷ 30 days).
              </p>
              <p className="text-sm text-blue-800 mb-2">
                <strong>Calculation Formula:</strong> Remaining Leave Days × Daily Salary = Encashment Amount
              </p>
              <ul className="text-sm text-blue-800 list-disc list-inside space-y-1 mb-2">
                <li>
                  <strong>Potential Encashment:</strong> Shows unused leave days that can be
                  encashed and their estimated value. This helps you understand how your remaining leave converts into pay.
                </li>
                <li>
                  <strong>Encashment in Payslip:</strong> Shows leave encashment amounts that have
                  already been included in your payslip.
                </li>
                <li>
                  <strong>Encashable Leave Types:</strong> Not all leave types are encashable. Only leave types marked as encashable can be
                  converted to compensation. Check the "Encashable" badge to see which leave types qualify.
                </li>
              </ul>
              <p className="text-sm text-blue-800 mt-2">
                <strong>Example:</strong> If you have 5 unused annual leave days and your daily salary is $100, 
                your potential encashment would be 5 × $100 = $500.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

