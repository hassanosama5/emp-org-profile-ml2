"use client";

import Link from "next/link";
import { useAuth } from "@/lib/hooks/use-auth";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/shared/ui/Card";

export default function DashboardPage() {
  const { user } = useAuth();

  const roles = user?.roles ?? [];

  // Match your JWT role strings (using case-insensitive check to be safe)
  const isHREmployee = roles.some(
    (r) => r.toLowerCase() === "hr employee".toLowerCase()
  );
  const isDepartmentHead = roles.some(
    (r) => r.toLowerCase() === "department head".toLowerCase()
  );

  const canSeeAssignments = isHREmployee || isDepartmentHead;

  return (
    <div className="container mx-auto px-6 py-8">
      <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
      <p className="text-gray-600 mt-1">Welcome {user?.fullName}</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Employee Profile</CardTitle>
            <CardDescription>Manage your personal information</CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/dashboard/employee-profile"
              className="text-blue-600 hover:underline"
            >
              Open Employee Profile
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payroll</CardTitle>
            <CardDescription>View payslips and salary</CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/dashboard/payroll"
              className="text-blue-600 hover:underline"
            >
              Open Payroll
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Leaves</CardTitle>
            <CardDescription>Request and track leave</CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/dashboard/leaves"
              className="text-blue-600 hover:underline"
            >
              Open Leaves
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Time Management</CardTitle>
            <CardDescription>Clock in/out, attendance, and shift management</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/time-management" className="text-blue-600 hover:underline">
              Open Time Management
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recruitment</CardTitle>
            <CardDescription>HR recruiting tools</CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/dashboard/recruitment"
              className="text-blue-600 hover:underline"
            >
              Recruitment Portal
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Admin</CardTitle>
            <CardDescription>System administration tools</CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/dashboard/admin"
              className="text-blue-600 hover:underline"
            >
              Admin Console
            </Link>
          </CardContent>
        </Card>

       

        {/* 🔹 Cycles – HR Employee only */}
        {isHREmployee && (
          <Card>
            <CardHeader>
              <CardTitle>Appraisal Cycles</CardTitle>
              <CardDescription>
                Define and schedule appraisal cycles
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                href="/dashboard/performance/cycles"
                className="text-blue-600 hover:underline"
              >
                Manage Cycles
              </Link>
            </CardContent>
          </Card>
        )}

        {/* 🔹 Assignments – HR Employee OR Department Head */}
        {canSeeAssignments && (
          <Card>
            <CardHeader>
              <CardTitle>Assignments</CardTitle>
              <CardDescription>
                View & manage appraisal assignments
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                href="/dashboard/performance/assignments"
                className="text-blue-600 hover:underline"
              >
                Open Assignments
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
