"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/hooks/use-auth";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { timeManagementApi } from "@/lib/api/time-management/time-management.api";
import { SystemRole } from "@/types";
import { Button } from "@/components/shared/ui/Button";
import { Toast, useToast } from "@/components/leaves/Toast";

interface LeaveAttendanceRecord {
  date: string;
  leaveType: string;
  exceptionId: string;
  attendanceRecordId: string;
  status: string;
}

interface UpcomingLeave {
  leaveRequestId: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  durationDays: number;
  status: string;
}

interface EmployeeLeaveStatus {
  employeeId: string;
  period: { startDate: string; endDate: string };
  leaveAttendanceRecords: LeaveAttendanceRecord[];
  totalLeaveDaysRecorded: number;
  upcomingLeaves: UpcomingLeave[];
  summary: {
    totalRecordedLeaveDays: number;
    upcomingLeaveDays: number;
  };
}

interface DepartmentSummary {
  departmentId: string;
  period: {
    month: number;
    year: number;
    startDate: string;
    endDate: string;
  };
  summary: {
    totalEmployees: number;
    totalLeaveDaysInMonth: number;
    averageLeaveDaysPerEmployee: number;
  };
  employees: Array<{
    employeeId: string;
    employeeName: string;
    leaveDaysInMonth: number;
    leaveDates: string[];
  }>;
}

export default function LeaveAttendanceIntegrationPage() {
  const { user } = useAuth();
  const { toast, showToast, hideToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [employeeStatus, setEmployeeStatus] = useState<EmployeeLeaveStatus | null>(null);
  const [departmentSummary, setDepartmentSummary] = useState<DepartmentSummary | null>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  const isHRRole = user?.roles?.some(
    (role) =>
      (role as SystemRole) === SystemRole.HR_ADMIN ||
      (role as SystemRole) === SystemRole.HR_MANAGER ||
      (role as SystemRole) === SystemRole.SYSTEM_ADMIN
  );

  const loadEmployeeStatus = useCallback(async (employeeId: string) => {
    if (!employeeId) return;
    try {
      setLoading(true);
      const result = await timeManagementApi.getEmployeeLeaveAttendanceStatus(employeeId);
      setEmployeeStatus(result);
    } catch (error: any) {
      showToast(error.message || "Failed to load employee leave-attendance status", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const loadDepartmentSummary = useCallback(async (departmentId: string) => {
    if (!departmentId) return;
    try {
      setLoading(true);
      const result = await timeManagementApi.getDepartmentVacationSummary(
        departmentId,
        selectedMonth,
        selectedYear
      );
      setDepartmentSummary(result);
    } catch (error: any) {
      showToast(error.message || "Failed to load department summary", "error");
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedYear, showToast]);

  // Load current user's status by default
  useEffect(() => {
    // Use userId or id as the employee identifier
    const employeeId = user?.userId || user?.id;
    if (employeeId && !isHRRole) {
      setSelectedEmployeeId(employeeId);
      loadEmployeeStatus(employeeId);
    }
  }, [user?.userId, user?.id, isHRRole, loadEmployeeStatus]);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status?.toUpperCase()) {
      case "APPROVED":
        return "bg-green-100 text-green-800";
      case "PENDING":
        return "bg-yellow-100 text-yellow-800";
      case "REJECTED":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <ProtectedRoute
      allowedRoles={[
        SystemRole.HR_ADMIN,
        SystemRole.HR_MANAGER,
        SystemRole.SYSTEM_ADMIN,
        SystemRole.DEPARTMENT_HEAD,
        SystemRole.DEPARTMENT_EMPLOYEE,
      ]}
    >
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Leave-Attendance Integration
          </h1>
          <p className="text-gray-600 mt-1">
            View how approved leave requests are reflected in attendance records
          </p>
        </div>

        {/* Employee Search Section (HR Only) */}
        {isHRRole && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Search Employee</h2>
            <div className="flex gap-4">
              <input
                type="text"
                placeholder="Enter Employee ID"
                value={selectedEmployeeId}
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <Button
                onClick={() => loadEmployeeStatus(selectedEmployeeId)}
                disabled={loading || !selectedEmployeeId}
              >
                {loading ? "Loading..." : "View Status"}
              </Button>
            </div>
          </div>
        )}

        {/* Employee Leave-Attendance Status */}
        {employeeStatus && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">
              Leave-Attendance Status
            </h2>
            
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-blue-50 rounded-lg p-4">
                <p className="text-sm text-blue-600 font-medium">Recorded Leave Days</p>
                <p className="text-2xl font-bold text-blue-900">
                  {employeeStatus.summary.totalRecordedLeaveDays}
                </p>
                <p className="text-xs text-blue-500">In attendance records</p>
              </div>
              <div className="bg-purple-50 rounded-lg p-4">
                <p className="text-sm text-purple-600 font-medium">Upcoming Leave Days</p>
                <p className="text-2xl font-bold text-purple-900">
                  {employeeStatus.summary.upcomingLeaveDays}
                </p>
                <p className="text-xs text-purple-500">Approved & pending</p>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <p className="text-sm text-green-600 font-medium">Total Days</p>
                <p className="text-2xl font-bold text-green-900">
                  {employeeStatus.summary.totalRecordedLeaveDays + employeeStatus.summary.upcomingLeaveDays}
                </p>
                <p className="text-xs text-green-500">Recorded + Upcoming</p>
              </div>
            </div>

            {/* Upcoming Leaves */}
            {employeeStatus.upcomingLeaves.length > 0 && (
              <div className="mb-6">
                <h3 className="font-medium text-gray-700 mb-3">Upcoming Approved Leaves</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Leave Type
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Start Date
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          End Date
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Duration
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {employeeStatus.upcomingLeaves.map((leave, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                            {leave.leaveType}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(leave.startDate)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(leave.endDate)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                            {leave.durationDays} days
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeClass(leave.status)}`}>
                              {leave.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Recorded Leave Attendance */}
            <div>
              <h3 className="font-medium text-gray-700 mb-3">Leave Days in Attendance Records</h3>
              {employeeStatus.leaveAttendanceRecords.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Date
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Leave Type
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {employeeStatus.leaveAttendanceRecords.map((record, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                            {record.date}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                            {record.leaveType}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeClass(record.status)}`}>
                              {record.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500 text-sm">No leave days recorded in attendance yet.</p>
              )}
            </div>
          </div>
        )}

        {/* Department Summary Section (HR Only) */}
        {isHRRole && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Department Vacation Summary</h2>
            
            <div className="flex gap-4 mb-6">
              <input
                type="text"
                placeholder="Enter Department ID"
                value={selectedDepartmentId}
                onChange={(e) => setSelectedDepartmentId(e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="px-4 py-2 border border-gray-300 rounded-lg"
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {new Date(2000, i).toLocaleString("default", { month: "long" })}
                  </option>
                ))}
              </select>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="px-4 py-2 border border-gray-300 rounded-lg"
              >
                {[2024, 2025, 2026].map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
              <Button
                onClick={() => loadDepartmentSummary(selectedDepartmentId)}
                disabled={loading || !selectedDepartmentId}
              >
                {loading ? "Loading..." : "View Summary"}
              </Button>
            </div>

            {departmentSummary && (
              <>
                {/* Department Summary Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-indigo-50 rounded-lg p-4">
                    <p className="text-sm text-indigo-600 font-medium">Total Employees</p>
                    <p className="text-2xl font-bold text-indigo-900">
                      {departmentSummary.summary.totalEmployees}
                    </p>
                  </div>
                  <div className="bg-amber-50 rounded-lg p-4">
                    <p className="text-sm text-amber-600 font-medium">Total Leave Days</p>
                    <p className="text-2xl font-bold text-amber-900">
                      {departmentSummary.summary.totalLeaveDaysInMonth}
                    </p>
                    <p className="text-xs text-amber-500">
                      {new Date(2000, departmentSummary.period.month - 1).toLocaleString("default", { month: "long" })} {departmentSummary.period.year}
                    </p>
                  </div>
                  <div className="bg-teal-50 rounded-lg p-4">
                    <p className="text-sm text-teal-600 font-medium">Average per Employee</p>
                    <p className="text-2xl font-bold text-teal-900">
                      {departmentSummary.summary.averageLeaveDaysPerEmployee}
                    </p>
                    <p className="text-xs text-teal-500">days/employee</p>
                  </div>
                </div>

                {/* Employee Leave Details */}
                <h3 className="font-medium text-gray-700 mb-3">Employee Leave Details</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Employee
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Leave Days
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Leave Dates
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {departmentSummary.employees.map((emp, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                            {emp.employeeName || emp.employeeId}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-sm font-semibold rounded-full ${
                              emp.leaveDaysInMonth > 5 
                                ? "bg-red-100 text-red-800" 
                                : emp.leaveDaysInMonth > 2 
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-green-100 text-green-800"
                            }`}>
                              {emp.leaveDaysInMonth} days
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {emp.leaveDates.length > 0 
                              ? emp.leaveDates.slice(0, 3).join(", ") + (emp.leaveDates.length > 3 ? ` +${emp.leaveDates.length - 3} more` : "")
                              : "—"
                            }
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}

        {/* Info Box */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-blue-800 mb-2">
            ℹ️ How Leave-Attendance Integration Works
          </h3>
          <ul className="text-sm text-blue-700 list-disc list-inside space-y-1">
            <li>When a leave request is finalized by HR, attendance records are automatically created for each working day</li>
            <li>Leave days are marked with an "APPROVED_LEAVE" exception in the attendance system</li>
            <li>Rest days and holidays are automatically excluded from leave attendance records</li>
            <li>Shift assignments are validated against approved leaves to prevent conflicts</li>
            <li>All leave attendance records are synced with payroll for accurate calculations</li>
          </ul>
        </div>

        {/* Toast Component */}
        <Toast
          message={toast.message}
          type={toast.type}
          isVisible={toast.isVisible}
          onClose={hideToast}
        />
      </div>
    </ProtectedRoute>
  );
}

