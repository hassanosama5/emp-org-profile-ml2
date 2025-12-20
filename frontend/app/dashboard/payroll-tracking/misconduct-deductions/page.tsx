"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/hooks/use-auth";
import { useRequireAuth } from "@/lib/hooks/use-auth";
import { SystemRole } from "@/types";
import { payslipsApi } from "@/lib/api/payroll-tracking/payroll-tracking";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/shared/ui/Card";
import { Button } from "@/components/shared/ui/Button";
import { useRouter } from "next/navigation";

interface TimeException {
  id: string;
  type: string;
  status: string;
  reason?: string;
  attendanceRecordId?: string;
  date?: string;
}

interface MisconductDeductionsData {
  employeeId: string;
  employeeNumber: string;
  payslipId: string;
  payrollPeriod?: {
    payrollRunId: string;
    runId: string;
    period: string;
    startDate?: string;
    endDate?: string;
  };
  baseSalary: number;
  dailySalary: number;
  hourlySalary: number;
  penalties?: {
    missingHoursDeduction?: number;
    missingDaysDeduction?: number;
    unpaidLeaveDeduction?: number;
    totalPenalties?: number;
  };
  misconductSummary: {
    lateCount: number;
    earlyLeaveCount: number;
    shortTimeCount: number;
    missedPunchCount: number;
    totalExceptions: number;
  };
  timeExceptions: {
    all: TimeException[];
    late: TimeException[];
    earlyLeave: TimeException[];
    shortTime: TimeException[];
    missedPunch: TimeException[];
  };
  attendanceRecords: number;
  note?: string;
}

export default function MisconductDeductionsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [misconductData, setMisconductData] = useState<MisconductDeductionsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // All authenticated users can view their own misconduct deductions (all roles are employees)
  // No need for restrictive useRequireAuth

  useEffect(() => {
    const fetchMisconductDeductions = async () => {
      if (!user?.id && !user?.userId) {
        setError("User ID not found");
        setLoading(false);
        return;
      }

      try {
        const employeeId = user.id || user.userId;
        const data = await payslipsApi.getMisconductDeductions(employeeId!);
        setMisconductData(data);
      } catch (err: any) {
        setError(err.message || "Failed to load misconduct deductions information");
      } finally {
        setLoading(false);
      }
    };

    fetchMisconductDeductions();
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

  const getExceptionTypeLabel = (type: string): string => {
    const typeMap: Record<string, string> = {
      LATE: "Late Arrival",
      EARLY_LEAVE: "Early Leave",
      SHORT_TIME: "Short Time",
      MISSED_PUNCH: "Missed Punch",
    };
    return typeMap[type] || type;
  };

  const getExceptionTypeIcon = (type: string): string => {
    const iconMap: Record<string, string> = {
      LATE: "⏰",
      EARLY_LEAVE: "🚪",
      SHORT_TIME: "⏱️",
      MISSED_PUNCH: "📝",
    };
    return iconMap[type] || "⚠️";
  };

  const getExceptionTypeColor = (type: string): string => {
    const colorMap: Record<string, string> = {
      LATE: "bg-orange-100 text-orange-800 border-orange-300",
      EARLY_LEAVE: "bg-yellow-100 text-yellow-800 border-yellow-300",
      SHORT_TIME: "bg-red-100 text-red-800 border-red-300",
      MISSED_PUNCH: "bg-purple-100 text-purple-800 border-purple-300",
    };
    return colorMap[type] || "bg-gray-100 text-gray-800 border-gray-300";
  };

  if (loading) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading misconduct deductions information...</p>
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

  if (!misconductData) {
    return (
      <div className="container mx-auto px-6 py-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-gray-500 mb-4">No misconduct deductions information available</p>
              <Button onClick={() => router.push("/dashboard/payroll-tracking")}>
                Back to Payroll
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const hasPenalties = misconductData.penalties && (
    misconductData.penalties.missingHoursDeduction ||
    misconductData.penalties.missingDaysDeduction ||
    misconductData.penalties.unpaidLeaveDeduction ||
    misconductData.penalties.totalPenalties
  );

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Misconduct & Absenteeism Deductions</h1>
          <p className="text-gray-600 mt-1">
            As an Employee, view any salary deductions due to misconduct or unapproved absenteeism (missing days), so you know why part of your salary was reduced.
          </p>
        </div>
        <Button variant="outline" onClick={() => router.push("/dashboard/payroll-tracking")}>
          Back to Payroll
        </Button>
      </div>

      {/* Payroll Period Info */}
      {misconductData.payrollPeriod && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Payroll Period</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {misconductData.payrollPeriod.runId && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Payroll Run ID</p>
                  <p className="font-semibold text-gray-900">
                    {misconductData.payrollPeriod.runId}
                  </p>
                </div>
              )}
              {misconductData.payrollPeriod.period && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Period</p>
                  <p className="font-semibold text-gray-900">
                    {formatDate(misconductData.payrollPeriod.period)}
                  </p>
                </div>
              )}
              {misconductData.payrollPeriod.startDate && misconductData.payrollPeriod.endDate && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Date Range</p>
                  <p className="font-semibold text-gray-900 text-sm">
                    {formatDate(misconductData.payrollPeriod.startDate)} - {formatDate(misconductData.payrollPeriod.endDate)}
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
                {formatCurrency(misconductData.baseSalary)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Daily Salary</p>
              <p className="text-xl font-bold text-blue-600">
                {formatCurrency(misconductData.dailySalary)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Hourly Salary</p>
              <p className="text-xl font-bold text-blue-600">
                {formatCurrency(misconductData.hourlySalary)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Penalties Summary */}
      {hasPenalties && (
        <Card className="mb-6 border-red-300">
          <CardHeader>
            <CardTitle className="text-red-900">Salary Deductions Applied</CardTitle>
            <CardDescription>
              Actual deductions from your salary due to misconduct or absenteeism
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {misconductData.penalties?.missingHoursDeduction && (
                <div className="flex justify-between items-center p-3 bg-red-50 border border-red-200 rounded">
                  <div>
                    <p className="font-semibold text-gray-900">Missing Hours Deduction</p>
                    <p className="text-sm text-gray-600">Deduction for hours not worked</p>
                  </div>
                  <p className="text-xl font-bold text-red-600">
                    -{formatCurrency(misconductData.penalties.missingHoursDeduction)}
                  </p>
                </div>
              )}
              {misconductData.penalties?.missingDaysDeduction && (
                <div className="flex justify-between items-center p-3 bg-red-50 border border-red-200 rounded">
                  <div>
                    <p className="font-semibold text-gray-900">Missing Days Deduction</p>
                    <p className="text-sm text-gray-600">Deduction for days not worked</p>
                  </div>
                  <p className="text-xl font-bold text-red-600">
                    -{formatCurrency(misconductData.penalties.missingDaysDeduction)}
                  </p>
                </div>
              )}
              {misconductData.penalties?.unpaidLeaveDeduction && (
                <div className="flex justify-between items-center p-3 bg-red-50 border border-red-200 rounded">
                  <div>
                    <p className="font-semibold text-gray-900">Unpaid Leave Deduction</p>
                    <p className="text-sm text-gray-600">Deduction for unapproved leave days</p>
                  </div>
                  <p className="text-xl font-bold text-red-600">
                    -{formatCurrency(misconductData.penalties.unpaidLeaveDeduction)}
                  </p>
                </div>
              )}
              <div className="pt-3 mt-3 border-t-2 border-red-300">
                <div className="flex justify-between items-center p-4 bg-red-100 rounded-lg">
                  <p className="text-lg font-semibold text-gray-900">Total Penalties</p>
                  <p className="text-2xl font-bold text-red-700">
                    -{formatCurrency(misconductData.penalties?.totalPenalties || 0)}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Misconduct Summary */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Time Exceptions Summary</CardTitle>
          <CardDescription>
            Overview of time exceptions that may have resulted in deductions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <p className="text-sm text-gray-500 mb-1">Late Arrivals</p>
              <p className="text-2xl font-bold text-orange-600">
                {misconductData.misconductSummary.lateCount}
              </p>
            </div>
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-gray-500 mb-1">Early Leaves</p>
              <p className="text-2xl font-bold text-yellow-600">
                {misconductData.misconductSummary.earlyLeaveCount}
              </p>
            </div>
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-gray-500 mb-1">Short Time</p>
              <p className="text-2xl font-bold text-red-600">
                {misconductData.misconductSummary.shortTimeCount}
              </p>
            </div>
            <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <p className="text-sm text-gray-500 mb-1">Missed Punches</p>
              <p className="text-2xl font-bold text-purple-600">
                {misconductData.misconductSummary.missedPunchCount}
              </p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex justify-between items-center">
              <p className="text-sm font-medium text-gray-700">Total Time Exceptions</p>
              <p className="text-lg font-bold text-gray-900">
                {misconductData.misconductSummary.totalExceptions}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Time Exceptions Details */}
      {misconductData.timeExceptions.all.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Time Exceptions Details</CardTitle>
            <CardDescription>
              Detailed breakdown of time exceptions that may have resulted in deductions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {misconductData.timeExceptions.all.map((exception, idx) => (
                <div
                  key={idx}
                  className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <span className="text-2xl">{getExceptionTypeIcon(exception.type)}</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-gray-900">
                            {getExceptionTypeLabel(exception.type)}
                          </h4>
                          <span className={`px-2 py-1 rounded text-xs font-medium border ${getExceptionTypeColor(exception.type)}`}>
                            {exception.type}
                          </span>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            exception.status === "RESOLVED" || exception.status === "APPROVED"
                              ? "bg-green-100 text-green-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}>
                            {exception.status}
                          </span>
                        </div>
                        {exception.reason && (
                          <p className="text-sm text-gray-600 mt-1">
                            <span className="font-medium">Reason:</span> {exception.reason}
                          </p>
                        )}
                        {exception.date && (
                          <p className="text-xs text-gray-500 mt-1">
                            Date: {formatDate(exception.date)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Information Note */}
      {misconductData.note && (
        <Card className="mb-6 bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <span className="text-xl">ℹ️</span>
              <div>
                <p className="font-semibold text-blue-900 mb-1">Important Note</p>
                <p className="text-sm text-blue-800">{misconductData.note}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Information Card */}
      <Card className="bg-yellow-50 border-yellow-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <span className="text-xl">⚠️</span>
            <div>
              <p className="font-semibold text-yellow-900 mb-1">Why Your Salary Was Reduced</p>
              <p className="text-sm text-yellow-800 mb-3">
                Salary deductions are applied for misconduct or unapproved absenteeism. Here's why part of your salary may have been reduced:
              </p>
              <ul className="text-sm text-yellow-800 list-disc list-inside space-y-1 mb-3">
                <li>
                  <strong>Missing Days (Unapproved Absenteeism):</strong> Deduction for full days not worked without approved leave. This is the most common reason for salary reduction due to absenteeism.
                </li>
                <li>
                  <strong>Missing Hours:</strong> Deduction for hours not worked due to late arrivals,
                  early leaves, or short time. These time exceptions result in reduced pay for hours not worked.
                </li>
                <li>
                  <strong>Unpaid Leave:</strong> Deduction for leave days taken without approval or
                  exceeding available leave balance. Unapproved leave results in salary reduction.
                </li>
                <li>
                  <strong>Time Exceptions (Misconduct):</strong> Late arrivals, early leaves, short time, and missed
                  punches may result in deductions based on company policies. Repeated time exceptions are considered misconduct.
                </li>
              </ul>
              <p className="text-sm text-yellow-800">
                <strong>Understanding Your Deductions:</strong> Each deduction shows the specific reason (missing days, missing hours, etc.) and the amount deducted. 
                The time exceptions section shows all instances that contributed to these deductions. If you believe a deduction is incorrect, 
                please contact HR or your supervisor to discuss the matter. Time exceptions and unapproved absences are tracked and may impact
                your salary if they result in misconduct or unapproved absenteeism.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

