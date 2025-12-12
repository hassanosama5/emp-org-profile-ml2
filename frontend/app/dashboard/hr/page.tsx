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
        <h1 className="text-3xl font-bold text-gray-900">HR Manager Dashboard</h1>
        <p className="text-gray-600 mt-1">
          Welcome, {user?.fullName || "Manager"}. Manage HR operations and
          employee workflows.
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

      {/* Leave Management Section */}
      <div className="mb-10">
        <Card className="border-2 border-blue-300 bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardHeader>
            <CardTitle className="text-xl">Leave Management</CardTitle>
            <CardDescription>
              Manage leave requests: finalize approved requests, override decisions, process in bulk, and verify medical documents
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => router.push("/dashboard/leaves/hr-manager")}
              variant="primary"
              className="w-full text-lg py-3"
            >
              Manage Leave Requests
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}