"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { Button } from "@/components/shared/ui/Button";

export default function HRManagerDashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  useRequireAuth(SystemRole.HR_MANAGER);

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white-900">
          HR Manager Dashboard
        </h1>
        <p className="text-gray-600 mt-1">
          Welcome, {user?.fullName || "Manager"}. Manage HR operations and
          employee workflows.
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

          {/* ADDED: Organization Structure Card */}
          <Card className="hover:shadow-lg transition-shadow border-2 border-green-200">
            <CardHeader>
              <CardTitle>Structure</CardTitle>
              <CardDescription>
                Submit requests for organizational changes
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

      {/* Performance Management Section – Appraisal Templates */}
      <div className="mb-10">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">
          Performance Management
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="hover:shadow-lg transition-shadow border-2 border-indigo-200 bg-gradient-to-r from-indigo-50 to-blue-50">
            <CardHeader>
              <CardTitle>Appraisal Templates</CardTitle>
              <CardDescription>
                Configure standardized appraisal templates and rating scales
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                href="/dashboard/performance/templates"
                className="block w-full text-center bg-indigo-600 text-white py-3 px-4 rounded-md hover:bg-indigo-700 transition font-medium"
              >
                Manage Appraisal Templates
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Leave Management Section */}
      <div className="mb-10">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">
          Leave Management
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="hover:shadow-lg transition-shadow border-2 border-orange-200">
            <CardHeader>
              <CardTitle>View & Create Leave Requests</CardTitle>
              <CardDescription>
                View your leave balance, filter your requests, and create new leave requests
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                href="/dashboard/leaves/requests"
                className="block w-full text-center bg-orange-600 text-white py-3 px-4 rounded-md hover:bg-orange-700 transition font-medium"
              >
                My Leave Requests
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow border-2 border-blue-200">
            <CardHeader>
              <CardTitle>Manage Leave Requests</CardTitle>
              <CardDescription>
                Finalize approved requests, override decisions, process in bulk, and verify medical documents
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                href="/dashboard/leaves/hr-manager"
                className="block w-full text-center bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 transition font-medium"
              >
                Manage Leave Requests
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow border-2 border-teal-200">
            <CardHeader>
              <CardTitle>View Team Leave Balances</CardTitle>
              <CardDescription>
                View leave balances and upcoming leaves for your team members (HR employees)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                href="/dashboard/leaves/team-balances"
                className="block w-full text-center bg-teal-600 text-white py-3 px-4 rounded-md hover:bg-teal-700 transition font-medium"
              >
                View Team Balances
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow border-2 border-cyan-200">
            <CardHeader>
              <CardTitle>Manage Team Leave Data</CardTitle>
              <CardDescription>
                Filter and manage leave data for your team members with advanced filtering options
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                href="/dashboard/leaves/team-management"
                className="block w-full text-center bg-cyan-600 text-white py-3 px-4 rounded-md hover:bg-cyan-700 transition font-medium"
              >
                Manage Team Data
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow border-2 border-green-200">
            <CardHeader>
              <CardTitle>Manual Accrual</CardTitle>
              <CardDescription>
                Manually add leave days to employee balances for single or multiple employees
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                href="/dashboard/leaves/accrual"
                className="block w-full text-center bg-green-600 text-white py-3 px-4 rounded-md hover:bg-green-700 transition font-medium"
              >
                Manual Accrual Management
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow border-2 border-purple-200">
            <CardHeader>
              <CardTitle>Manual Carry-Forward</CardTitle>
              <CardDescription>
                Run year-end/period carry-forward to move unused leave days to the next period
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                href="/dashboard/leaves/carry-forward"
                className="block w-full text-center bg-purple-600 text-white py-3 px-4 rounded-md hover:bg-purple-700 transition font-medium"
              >
                Manual Carry-Forward Management
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Time Management Section */}
      <div className="mb-10">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">
          Time Management
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="hover:shadow-lg transition-shadow border-2 border-blue-200">
            <CardHeader>
              <CardTitle>Approvals & Reporting</CardTitle>
              <CardDescription>
                Review and approve time exceptions, view lateness reports, overtime reports, and manage notifications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                href="/dashboard/time-management/approvals"
                className="block w-full text-center bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 transition font-medium"
              >
                Manage Approvals →
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle>Time Management</CardTitle>
              <CardDescription>
                Manage attendance, schedules, shifts, and time tracking
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                href="/dashboard/time-management"
                className="block w-full text-center bg-gray-600 text-white py-3 px-4 rounded-md hover:bg-gray-700 transition font-medium"
              >
                Time Management →
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recruitment Management Section */}
      <div className="mb-10">
        <Card className="border-2 border-blue-300 bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardHeader>
            <CardTitle className="text-xl">Recruitment Management</CardTitle>
            <CardDescription>
              Manage the complete recruitment lifecycle: job templates, hiring processes, candidate tracking, interviews, offers, onboarding, and offboarding
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => router.push("/dashboard/recruitment")}
              variant="primary"
              className="w-full text-lg py-3"
            >
              Open Recruitment Portal
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
