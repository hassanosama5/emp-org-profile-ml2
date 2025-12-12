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
  useRequireAuth(SystemRole.HR_ADMIN);

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">HR Admin Dashboard</h1>
        <p className="text-gray-600 mt-1">
          Welcome, {user?.fullName || "Admin"}. Manage HR operations and system
          configuration.
        </p>
      </div>

      {/* HR Operations Section */}
      <div className="mb-10">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">
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

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle>My Profile</CardTitle>
              <CardDescription>
                View and manage your personal information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                href="/dashboard/employee-profile/my-profile"
                className="block w-full text-center bg-gray-600 text-white py-3 px-4 rounded-md hover:bg-gray-700 transition font-medium"
              >
                My Profile
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* System Administration Section */}
      <div className="mb-10">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">
          System Administration
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle>Organization Structure</CardTitle>
              <CardDescription>
                Manage departments, positions, and organizational hierarchy
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                href="/dashboard/organization-structure"
                className="block w-full text-center bg-gray-600 text-white py-3 px-4 rounded-md hover:bg-gray-700 transition font-medium"
              >
                Manage Structure →
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle>Time Management</CardTitle>
              <CardDescription>
                Manage attendance, schedules, and time tracking
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                href="/dashboard/time-management"
                className="block w-full text-center bg-gray-600 text-white py-3 px-4 rounded-md hover:bg-gray-700 transition font-medium"
              >
                Manage Time →
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

