"use client";

import Link from "next/link";
import { useAuth } from "@/lib/hooks/use-auth";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/shared/ui/Card";
import { useRequireAuth } from "@/lib/hooks/use-auth";
import { SystemRole } from "@/types";

export default function TimeManagementPage() {
  const { user } = useAuth();
  useRequireAuth(SystemRole.HR_ADMIN);

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Time Management</h1>
        <p className="text-gray-600 mt-1">Manage attendance, schedules, shifts, and time tracking</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Shift Assignments</CardTitle>
            <CardDescription>Assign and manage shifts for employees, departments, and positions</CardDescription>
          </CardHeader>
          <CardContent>
            <Link 
              href="/dashboard/time-management/shifts/assignments" 
              className="text-blue-600 hover:underline font-medium"
            >
              Manage Shift Assignments →
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Attendance Corrections</CardTitle>
            <CardDescription>Review and approve attendance correction requests</CardDescription>
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

        <Card>
          <CardHeader>
            <CardTitle>Holidays & Rest Days</CardTitle>
            <CardDescription>Configure national holidays, organizational holidays, and weekly rest days</CardDescription>
          </CardHeader>
          <CardContent>
            <Link 
              href="/dashboard/time-management/policies/holidays" 
              className="text-blue-600 hover:underline font-medium"
            >
              Manage Holidays →
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Reports</CardTitle>
            <CardDescription>View and export overtime and exception attendance reports</CardDescription>
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
            <CardTitle>Permission Validation Rules</CardTitle>
            <CardDescription>Define limits for permission durations and ensure only approved permissions affect payroll</CardDescription>
          </CardHeader>
          <CardContent>
            <Link 
              href="/dashboard/time-management/policies/overtime" 
              className="text-blue-600 hover:underline font-medium"
            >
              Manage Overtime Limits →
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Overtime & Exception Reports</CardTitle>
            <CardDescription>View overtime reports, exception attendance reports, and export in Excel, CSV, or Text formats</CardDescription>
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
      </div>
    </div>
  );
}

