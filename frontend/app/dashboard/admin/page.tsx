"use client";

import Link from "next/link";
import { useAuth } from "@/lib/hooks/use-auth";
import { useRequireAuth } from "@/lib/hooks/use-auth";
import { SystemRole } from "@/types";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/shared/ui/Card";

export default function AdminDashboardPage() {
  const { user } = useAuth();
  useRequireAuth([SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN]);

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white-900">
          HR Admin Dashboard
        </h1>
        <p className="text-white-600 mt-1">
          Welcome, {user?.fullName || "Admin"}. Manage HR operations and system
          configuration.
        </p>
      </div>

      {/* HR Operations Section */}
      <div className="mb-10">
        <h2 className="text-2xl font-semibold text-white-900 mb-4">
          HR Operations
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="hover:shadow-lg transition-shadow border-2 border-blue-200">
            <CardHeader>
              <CardTitle>Employees</CardTitle>
              <CardDescription>
                Search and manage employee profiles
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                href="/dashboard/employee-profile/admin/search"
                className="block w-full text-center bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 transition font-medium"
              >
                Manage Employees
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow border-2 border-blue-200">
            <CardHeader>
              <CardTitle>Approvals</CardTitle>
              <CardDescription>
                Review and approve employee requests
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                href="/dashboard/employee-profile/admin/approvals"
                className="block w-full text-center bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 transition font-medium"
              >
                View Approvals
              </Link>
            </CardContent>
          </Card>

          {/* ADDED: Organization Structure Card in HR Operations section */}
          <Card className="hover:shadow-lg transition-shadow border-2 border-green-200">
            <CardHeader>
              <CardTitle>Structure</CardTitle>
              <CardDescription>
                Manage departments and positions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                href="/dashboard/organization-structure"
                className="block w-full text-center bg-green-600 text-white py-3 px-4 rounded-md hover:bg-green-700 transition font-medium"
              >
                Organization Structure
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle>Team</CardTitle>
              <CardDescription>
                View team members and organization structure
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                href="/dashboard/employee-profile/team"
                className="block w-full text-center bg-gray-600 text-white py-3 px-4 rounded-md hover:bg-gray-700 transition font-medium"
              >
                View Team
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* System Administration Section */}
      <div className="mb-10">
        <h2 className="text-2xl font-semibold text-white-900 mb-4">
          System Administration
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* PROMOTED: Organization Structure in System Admin section with more prominent styling */}
          <Card className="hover:shadow-lg transition-shadow border-2 border-green-200">
            <CardHeader>
              <CardTitle className="text-lg">Organization Structure</CardTitle>
              <CardDescription>
                Define departments, positions, and manage hierarchy
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link
                href="/dashboard/organization-structure"
                className="block w-full text-center bg-green-600 text-white py-3 px-4 rounded-md hover:bg-green-700 transition font-medium"
              >
                Manage Structure
              </Link>
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/dashboard/organization-structure/departments"
                  className="text-center border border-green-600 text-green-600 py-2 px-3 rounded-md hover:bg-green-50 transition text-sm"
                >
                  Departments
                </Link>
                <Link
                  href="/dashboard/organization-structure/positions"
                  className="text-center border border-green-600 text-green-600 py-2 px-3 rounded-md hover:bg-green-50 transition text-sm"
                >
                  Positions
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle>Leaves Configuration</CardTitle>
              <CardDescription>
                Configure leave policies, types, entitlements, and calendars
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                href="/dashboard/leaves"
                className="block w-full text-center bg-gray-600 text-white py-3 px-4 rounded-md hover:bg-gray-700 transition font-medium"
              >
                Manage Leaves →
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle>Payroll Configuration</CardTitle>
              <CardDescription>
                Manage payroll configuration and execution
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                href="/dashboard/payroll"
                className="block w-full text-center bg-gray-600 text-white py-3 px-4 rounded-md hover:bg-gray-700 transition font-medium"
              >
                Manage Payroll →
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle>Recruitment Tools</CardTitle>
              <CardDescription>
                Manage job postings, candidates, and recruitment processes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                href="/dashboard/recruitment"
                className="block w-full text-center bg-gray-600 text-white py-3 px-4 rounded-md hover:bg-gray-700 transition font-medium"
              >
                Manage Recruitment →
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle>Performance System</CardTitle>
              <CardDescription>
                Manage performance reviews and evaluations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                href="/dashboard/performance"
                className="block w-full text-center bg-gray-600 text-white py-3 px-4 rounded-md hover:bg-gray-700 transition font-medium"
              >
                Manage Performance →
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow border-2 border-blue-200">
            <CardHeader>
              <CardTitle>Time Management</CardTitle>
              <CardDescription>
                Manage attendance, schedules, shifts, and time tracking
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                href="/dashboard/time-management"
                className="block w-full text-center bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 transition font-medium mb-2"
              >
                Manage Time →
              </Link>
              <Link
                href="/dashboard/time-management/approvals"
                className="block w-full text-center bg-gray-600 text-white py-3 px-4 rounded-md hover:bg-gray-700 transition font-medium"
              >
                Approvals & Reports →
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
