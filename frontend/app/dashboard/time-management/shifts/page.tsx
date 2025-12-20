"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/hooks/use-auth";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/shared/ui/Card";
import { SystemRole } from "@/types";
import { shiftScheduleApi } from "@/lib/api/time-management/shift-schedule.api";
import { ShiftAssignment, ShiftAssignmentStatus } from "@/types/time-management";
import { Toast, useToast } from "@/components/leaves/Toast";

export default function ShiftsPage() {
  const { user } = useAuth();
  const { toast, showToast, hideToast } = useToast();
  const isAdmin = user?.roles?.includes(SystemRole.HR_ADMIN) || 
                  user?.roles?.includes(SystemRole.SYSTEM_ADMIN) || 
                  user?.roles?.includes(SystemRole.HR_MANAGER);
  const isDepartmentHead = user?.roles?.includes(SystemRole.DEPARTMENT_HEAD);
  
  // Employee shift assignments state
  const [myAssignments, setMyAssignments] = useState<ShiftAssignment[]>([]);
  const [loading, setLoading] = useState(true);

  // Load employee's shift assignments - allow department heads to see their own shifts
  useEffect(() => {
    if ((!isAdmin || isDepartmentHead) && user?.id) {
      loadMyAssignments();
    }
  }, [user?.id, isAdmin, isDepartmentHead]);

  const loadMyAssignments = async () => {
    try {
      setLoading(true);
      const assignments = await shiftScheduleApi.getEmployeeShiftAssignments(user!.id);
      setMyAssignments(assignments || []);
    } catch (error: any) {
      console.error("Failed to load my shift assignments:", error);
      showToast(error.message || "Failed to load shift assignments", "error");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date | string | undefined) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString();
  };

  const getStatusColor = (status: ShiftAssignmentStatus) => {
    switch (status) {
      case ShiftAssignmentStatus.APPROVED:
        return "text-green-600 bg-green-50";
      case ShiftAssignmentStatus.ENTERED:
        return "text-gray-600 bg-gray-100";
      case ShiftAssignmentStatus.SUBMITTED:
        return "text-blue-600 bg-blue-50";
      case ShiftAssignmentStatus.REJECTED:
        return "text-red-600 bg-red-50";
      case ShiftAssignmentStatus.CANCELLED:
        return "text-orange-600 bg-orange-50";
      case ShiftAssignmentStatus.POSTPONED:
        return "text-yellow-600 bg-yellow-50";
      case ShiftAssignmentStatus.EXPIRED:
        return "text-purple-600 bg-purple-50";
      default:
        return "text-gray-600 bg-gray-50";
    }
  };

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Shift Management</h1>
        <p className="text-gray-600 mt-1">
          {isAdmin ? "Configure shift types, create shifts, and manage assignments" : "View your shift assignments"}
        </p>
      </div>

      {/* Admin Section */}
      {isAdmin && (
        <>
          {/* Configuration Cards */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Configuration (BR-TM-01, BR-TM-02)</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card className="border-l-4 border-l-blue-500">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                    </svg>
                    Shift Types
                  </CardTitle>
                  <CardDescription>
                    Create and manage shift type categories (Normal, Split, Overnight, Rotational)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Link
                    href="/dashboard/time-management/shifts/types"
                    className="inline-flex items-center gap-1 text-blue-600 hover:underline font-medium"
                  >
                    Manage Shift Types
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-green-500">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Shifts
                  </CardTitle>
                  <CardDescription>
                    Create shifts with specific start/end times, grace periods, and policies
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Link
                    href="/dashboard/time-management/shifts/schedules"
                    className="inline-flex items-center gap-1 text-blue-600 hover:underline font-medium"
                  >
                    Manage Shifts
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-purple-500">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    Shift Assignments
                  </CardTitle>
                  <CardDescription>
                    Assign shifts to employees, departments, or positions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Link
                    href="/dashboard/time-management/shifts/assignments"
                    className="inline-flex items-center gap-1 text-blue-600 hover:underline font-medium"
                  >
                    Manage Assignments
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Scheduling Rules */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Scheduling Rules (BR-TM-03)</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="border-l-4 border-l-indigo-500">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    Scheduling Patterns
                  </CardTitle>
                  <CardDescription>
                    Define custom patterns like 5-ON/2-OFF, 4-ON/3-OFF, or flexible schedules
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Link
                    href="/dashboard/time-management/shifts/rules"
                    className="inline-flex items-center gap-1 text-blue-600 hover:underline font-medium"
                  >
                    Manage Scheduling Rules
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-pink-500">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-pink-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Rest Days & Holidays
                  </CardTitle>
                  <CardDescription>
                    Set up weekly rest days and rotational patterns
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Link
                    href="/dashboard/time-management/policies/holidays"
                    className="inline-flex items-center gap-1 text-blue-600 hover:underline font-medium"
                  >
                    Manage Rest Days & Holidays
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}

      {/* Employee Section */}
      {!isAdmin && (
        <>
          <Toast
            message={toast.message}
            type={toast.type}
            isVisible={toast.isVisible}
            onClose={hideToast}
          />
          
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>My Shift Assignments</CardTitle>
              <CardDescription>View your assigned shifts and schedule</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">Loading your shift assignments...</p>
                </div>
              ) : myAssignments.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-2">No shift assignments found.</p>
                  <p className="text-gray-400 text-sm">
                    Contact your manager to get assigned to a shift.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Shift Name</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Start Date</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">End Date</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {myAssignments.map((assignment) => {
                        const shiftName = typeof assignment.shiftId === 'object' && assignment.shiftId !== null
                          ? (assignment.shiftId as any).name || 'N/A'
                          : assignment.shiftId || 'N/A';
                        
                        return (
                          <tr key={assignment._id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-3 px-4 text-gray-900">{shiftName}</td>
                            <td className="py-3 px-4 text-gray-900">{formatDate(assignment.startDate)}</td>
                            <td className="py-3 px-4 text-gray-900">{formatDate(assignment.endDate)}</td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(assignment.status)}`}>
                                {assignment.status}
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

          <Card>
            <CardHeader>
              <CardTitle>Request Shift Change</CardTitle>
              <CardDescription>Submit a request to change your shift</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 text-sm">
                Contact your HR manager or use the time exception form to request shift modifications.
              </p>
            </CardContent>
          </Card>
        </>
      )}

      {/* Navigation */}
      <div className="mt-8 pt-6 border-t">
        <Link
          href="/dashboard/time-management"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Time Management
        </Link>
      </div>
    </div>
  );
}
