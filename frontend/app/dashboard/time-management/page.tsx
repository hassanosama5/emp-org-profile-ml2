"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/hooks/use-auth";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/shared/ui/Card";
import { ClockInOutButton } from "@/components/time-management/ClockInOutButton";
import { SystemRole } from "@/types";

export default function TimeManagementPage() {
  const { user } = useAuth();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isHRAdmin = user?.roles?.includes(SystemRole.HR_ADMIN);
  const isSystemAdmin = user?.roles?.includes(SystemRole.SYSTEM_ADMIN);
  const isHRManager = user?.roles?.includes(SystemRole.HR_MANAGER);
  const isDepartmentHead = user?.roles?.includes(SystemRole.DEPARTMENT_HEAD);
  
  // HR_ADMIN should NOT configure shifts, only HR_MANAGER and SYSTEM_ADMIN can
  const canConfigureShifts = isHRManager || isSystemAdmin;
  const canViewAdminSection = isHRAdmin || isHRManager || isSystemAdmin; // HR_ADMIN can view but not configure
  const [subtitle, setSubtitle] = useState<string>(
    "Manage attendance, schedules, shifts, and time tracking",
  );

  // Avoid hydration mismatches: compute user/role-based subtitle after mount.
  useEffect(() => {
    setSubtitle(
      canConfigureShifts
        ? "Manage attendance, schedules, shifts, and time tracking"
        : "Track your attendance and manage your time",
    );
  }, [canConfigureShifts]);

  // Prevent hydration mismatch across role-gated dashboard sections
  if (!mounted) return null;

  return (
    <div className="container mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Time Management</h1>
        <p className="text-gray-600 mt-1">{subtitle}</p>
      </div>

      {/* Department Head Section - Team Management */}
      {isDepartmentHead && (
        <>
          {/* Attendance Management Section */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
              Attendance Management
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Manual Attendance</CardTitle>
                  <CardDescription>Record or correct attendance manually for team members</CardDescription>
                </CardHeader>
                <CardContent>
                  <Link 
                    href="/dashboard/time-management/attendance/manual" 
                    className="text-blue-600 hover:underline font-medium"
                  >
                    Record/Correct Attendance →
                  </Link>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Attendance Corrections</CardTitle>
                  <CardDescription>Review and approve attendance correction requests from your team</CardDescription>
                </CardHeader>
                <CardContent>
                  <Link 
                    href="/dashboard/time-management/attendance/corrections" 
                    className="text-blue-600 hover:underline font-medium"
                  >
                    Manage Corrections →
                  </Link>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Time Exceptions</CardTitle>
                  <CardDescription>Review, approve, or reject time-related requests and exceptions for your team</CardDescription>
                </CardHeader>
                <CardContent>
                  <Link 
                    href="/dashboard/time-management/approvals" 
                    className="text-blue-600 hover:underline font-medium"
                  >
                    Manage Exceptions →
                  </Link>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Missed Punch Alerts</CardTitle>
                  <CardDescription>View missed punch alerts for your team members</CardDescription>
                </CardHeader>
                <CardContent>
                  <Link 
                    href="/dashboard/time-management/approvals?tab=missed-punches" 
                    className="text-blue-600 hover:underline font-medium"
                  >
                    View Alerts →
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Reports Section */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <svg className="w-6 h-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Reports & Analytics
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Lateness Reports</CardTitle>
                  <CardDescription>View team attendance summaries and lateness logs</CardDescription>
                </CardHeader>
                <CardContent>
                  <Link 
                    href="/dashboard/time-management/approvals?tab=lateness" 
                    className="text-blue-600 hover:underline font-medium"
                  >
                    View Lateness Report →
                  </Link>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Overtime Reports</CardTitle>
                  <CardDescription>View team overtime reports for payroll processing</CardDescription>
                </CardHeader>
                <CardContent>
                  <Link 
                    href="/dashboard/time-management/approvals?tab=overtime" 
                    className="text-blue-600 hover:underline font-medium"
                  >
                    View Overtime Reports →
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}

      {/* Employee Section - Show for regular employees and department heads */}
      {!canConfigureShifts && (
        <>
          {/* Clock In/Out */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Clock In/Out</CardTitle>
                  <CardDescription>Track your work hours by clocking in and out</CardDescription>
                </CardHeader>
                <CardContent>
                  <ClockInOutButton />
                </CardContent>
              </Card>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Quick Links</CardTitle>
                <CardDescription>Navigate to related pages</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link
                  href="/dashboard/time-management/attendance/records"
                  className="block text-blue-600 hover:underline font-medium"
                >
                  View Detailed Records
                </Link>
                <Link
                  href="/dashboard/employee-profile/time-management"
                  className="block text-blue-600 hover:underline font-medium"
                >
                  Correction Requests
                </Link>
                <Link
                  href="/dashboard/time-management/shifts"
                  className="block text-blue-600 hover:underline font-medium"
                >
                  View My Shifts
                </Link>
                <Link
                  href="/dashboard/time-management/attendance/import"
                  className="block text-blue-600 hover:underline font-medium"
                >
                  Import Attendance CSV
                </Link>
                <Link
                  href="/dashboard/time-management/requests"
                  className="block text-blue-600 hover:underline font-medium"
                >
                  Time Requests (Overtime, Permission, Exceptions)
                </Link>
              </CardContent>
            </Card>
          </div>

          {/* My Attendance Section */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">My Attendance</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Attendance Records</CardTitle>
                  <CardDescription>View your clock in/out records</CardDescription>
                </CardHeader>
                <CardContent>
                  <Link
                    href="/dashboard/time-management/attendance/records"
                    className="text-blue-600 hover:underline font-medium"
                  >
                    View Records
                  </Link>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Correction Requests</CardTitle>
                  <CardDescription>Submit and track corrections</CardDescription>
                </CardHeader>
                <CardContent>
                  <Link
                    href="/dashboard/time-management/attendance/corrections"
                    className="text-blue-600 hover:underline font-medium"
                  >
                    Manage Corrections
                  </Link>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>My Shifts</CardTitle>
                  <CardDescription>View your shift assignments</CardDescription>
                </CardHeader>
                <CardContent>
                  <Link
                    href="/dashboard/time-management/shifts"
                    className="text-blue-600 hover:underline font-medium"
                  >
                    View Shifts
                  </Link>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Import Attendance</CardTitle>
                  <CardDescription>Upload attendance data from CSV file</CardDescription>
                </CardHeader>
                <CardContent>
                  <Link
                    href="/dashboard/time-management/attendance/import"
                    className="text-blue-600 hover:underline font-medium"
                  >
                    Import CSV
                  </Link>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Time Requests</CardTitle>
                  <CardDescription>Submit and track overtime, permission, and time exception requests</CardDescription>
                </CardHeader>
                <CardContent>
                  <Link
                    href="/dashboard/time-management/requests"
                    className="text-blue-600 hover:underline font-medium"
                  >
                    Manage All Requests
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}

      {/* HR Admin Policies Section */}
      {isHRAdmin && (
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            Permission Policies
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="border-l-4 border-l-purple-500">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  Permission Policies
                </CardTitle>
                <CardDescription>Define permission duration limits and types (Early In, Late Out, Out of Hours, Total)</CardDescription>
              </CardHeader>
              <CardContent>
                <Link 
                  href="/dashboard/time-management/policies/permission-policies" 
                  className="inline-flex items-center gap-1 text-blue-600 hover:underline font-medium"
                >
                  Manage Permission Policies →
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Admin Section */}
      {canViewAdminSection && (
        <>
          {/* Shift Configuration Section - HR Manager & System Admin only (BR-TM-01, BR-TM-02) */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Shift Configuration
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Shift Types - HR Manager & System Admin only */}
              {canConfigureShifts && (
                <Card className="border-l-4 border-l-blue-500">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                      </svg>
                      Shift Types
                    </CardTitle>
                    <CardDescription>Configure shift type categories (Normal, Split, Overnight, Rotational)</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Link 
                      href="/dashboard/time-management/shifts/types" 
                      className="inline-flex items-center gap-1 text-blue-600 hover:underline font-medium"
                    >
                      Manage Shift Types →
                    </Link>
                  </CardContent>
                </Card>
              )}

              {/* Shifts - HR Manager & System Admin only */}
              {canConfigureShifts && (
                <Card className="border-l-4 border-l-green-500">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Shifts
                    </CardTitle>
                    <CardDescription>Create shifts with start/end times, grace periods, and punch policies</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Link 
                      href="/dashboard/time-management/shifts/schedules" 
                      className="inline-flex items-center gap-1 text-blue-600 hover:underline font-medium"
                    >
                      Manage Shifts →
                    </Link>
                  </CardContent>
                </Card>
              )}

              {/* Shift Assignments - HR Admin, HR Manager & System Admin */}
              <Card className="border-l-4 border-l-purple-500">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    Shift Assignments
                  </CardTitle>
                  <CardDescription>Assign shifts to employees, departments, or positions</CardDescription>
                </CardHeader>
                <CardContent>
                  <Link 
                    href="/dashboard/time-management/shifts/assignments" 
                    className="inline-flex items-center gap-1 text-blue-600 hover:underline font-medium"
                  >
                    Manage Assignments →
                  </Link>
                </CardContent>
              </Card>

              {/* Scheduling Rules - HR Manager & System Admin only */}
              {canConfigureShifts && (
                <Card className="border-l-4 border-l-indigo-500">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      Scheduling Rules
                    </CardTitle>
                    <CardDescription>Define custom patterns like 5-ON/2-OFF, 4-ON/3-OFF, or flexible schedules</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Link 
                      href="/dashboard/time-management/shifts/rules" 
                      className="inline-flex items-center gap-1 text-blue-600 hover:underline font-medium"
                    >
                      Manage Rules →
                    </Link>
                  </CardContent>
                </Card>
              )}

              {/* Holidays & Rest Days - HR Admin, HR Manager & System Admin */}
              <Card className="border-l-4 border-l-orange-500">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Holidays & Rest Days
                  </CardTitle>
                  <CardDescription>Configure national holidays, organizational holidays, and weekly rest days</CardDescription>
                </CardHeader>
                <CardContent>
                  <Link 
                    href="/dashboard/time-management/policies/holidays" 
                    className="inline-flex items-center gap-1 text-blue-600 hover:underline font-medium"
                  >
                    Manage Holidays →
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Policy Configuration Section - HR Manager & System Admin only (BR-TM-10, BR-TM-11, BR-TM-15) */}
          {canConfigureShifts && (
            <div className="mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                Policy Configuration
              </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
                    <CardTitle>Overtime Policies</CardTitle>
                    <CardDescription>Configure overtime limits, check employee limits, and validate pre-approvals</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Link 
                      href="/dashboard/time-management/policies/overtime" 
                      className="text-blue-600 hover:underline font-medium"
                    >
                      Manage Overtime Policies →
                    </Link>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Overtime Rules</CardTitle>
                    <CardDescription>Create and manage overtime calculation rules for different scenarios</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Link 
                      href="/dashboard/time-management/policies/overtime-rules" 
                      className="text-blue-600 hover:underline font-medium"
                    >
                      Manage Overtime Rules →
                    </Link>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Lateness Rules</CardTitle>
                    <CardDescription>Set grace periods, lateness thresholds, and penalty configurations</CardDescription>
            </CardHeader>
            <CardContent>
              <Link 
                      href="/dashboard/time-management/policies/lateness" 
                className="text-blue-600 hover:underline font-medium"
              >
                      Manage Lateness Rules →
              </Link>
            </CardContent>
          </Card>
              </div>
            </div>
          )}

        {/* Attendance Data Management (CSV Import) - All roles can import */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v16h16M10 8l4 4-4 4" />
            </svg>
            Attendance Data Management
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="border-l-4 border-l-green-500">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Import Attendance (CSV)
                </CardTitle>
                <CardDescription>
                  Import attendance data from biometric devices or external systems
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link
                  href="/dashboard/time-management/attendance/import"
                  className="inline-flex items-center gap-1 text-blue-600 hover:underline font-medium"
                >
                  Import Attendance CSV
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>

          {/* Attendance Management Section - HR Admin / System Admin */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
              Attendance Management
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Attendance Corrections</CardTitle>
                  <CardDescription>Review and approve attendance correction requests from employees</CardDescription>
            </CardHeader>
            <CardContent>
              <Link 
                href="/dashboard/time-management/attendance/corrections" 
                className="text-blue-600 hover:underline font-medium"
              >
                Manage Corrections →
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Time Exceptions</CardTitle>
              <CardDescription>Review, approve, or reject time-related requests and exceptions</CardDescription>
            </CardHeader>
            <CardContent>
              <Link 
                href="/dashboard/time-management/exceptions" 
                className="text-blue-600 hover:underline font-medium"
              >
                Manage Exceptions →
              </Link>
            </CardContent>
          </Card>

          {isHRAdmin && (
            <Card className="border-l-4 border-l-red-500">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Repeated Lateness Tracking
                </CardTitle>
                <CardDescription>Flag and track employees with repeated lateness for disciplinary action</CardDescription>
              </CardHeader>
              <CardContent>
                <Link 
                  href="/dashboard/time-management/repeated-lateness" 
                  className="inline-flex items-center gap-1 text-blue-600 hover:underline font-medium"
                >
                  Manage Lateness Flags →
                </Link>
              </CardContent>
            </Card>
          )}

            {/* Leave-Attendance Integration Card */}
            <Card className="border-l-4 border-l-teal-500">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Leave-Attendance Integration
                </CardTitle>
                <CardDescription>View how approved leaves are automatically reflected in attendance records</CardDescription>
              </CardHeader>
              <CardContent>
                <Link 
                  href="/dashboard/time-management/leave-attendance" 
                  className="inline-flex items-center gap-1 text-blue-600 hover:underline font-medium"
                >
                  View Integration →
                </Link>
              </CardContent>
            </Card>

            {/* Payroll Cut-off Escalation Card */}
            <Card className="border-l-4 border-l-rose-500">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Payroll Cut-off Escalation
                </CardTitle>
                <CardDescription>Monitor and escalate pending time requests before monthly payroll cut-off</CardDescription>
              </CardHeader>
              <CardContent>
                <Link 
                  href="/dashboard/time-management/payroll-escalation" 
                  className="inline-flex items-center gap-1 text-blue-600 hover:underline font-medium"
                >
                  View Status →
                </Link>
              </CardContent>
            </Card>
            </div>
          </div>

          {/* Reports Section */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <svg className="w-6 h-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Reports & Analytics
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
                  <CardTitle>Overtime Reports</CardTitle>
                  <CardDescription>View and export overtime attendance reports for payroll</CardDescription>
            </CardHeader>
            <CardContent>
              <Link 
                href="/dashboard/time-management/reports" 
                className="text-blue-600 hover:underline font-medium"
              >
                View Reports →
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
                  <CardTitle>Exception Reports</CardTitle>
                  <CardDescription>View attendance exception reports for compliance checks</CardDescription>
            </CardHeader>
            <CardContent>
              <Link 
                    href="/dashboard/time-management/reports" 
                className="text-blue-600 hover:underline font-medium"
              >
                    View Exception Reports →
              </Link>
            </CardContent>
          </Card>
        </div>
          </div>
        </>
      )}
    </div>
  );
}

