// app/dashboard/employee-profile/page.tsx - Unified HR Workspace
"use client";

import Link from "next/link";
import { useAuth } from "@/lib/hooks/use-auth";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { SystemRole } from "@/types";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/shared/ui/Card";

export default function EmployeeProfileDashboardPage() {
  const { user } = useAuth();

  // Helper function to check roles properly
  const hasRole = (role: SystemRole | string): boolean => {
    if (!user?.roles) return false;

    return user.roles.some((userRole) => {
      if (typeof userRole === "string" && typeof role === "string") {
        return userRole.toLowerCase() === role.toLowerCase();
      }
      return userRole === role;
    });
  };

  // Determine access based on roles
  const isEmployee =
    user?.userType === "employee" || hasRole(SystemRole.DEPARTMENT_EMPLOYEE);
  const isHRAdmin = hasRole(SystemRole.HR_ADMIN);
  const isHRManager = hasRole(SystemRole.HR_MANAGER);
  const isDepartmentHead = hasRole(SystemRole.DEPARTMENT_HEAD);

  // HR Admin and HR Manager have same permissions
  const isHR = isHRAdmin || isHRManager;

  // Permission flags
  const canEditOwnProfile = isEmployee;
  const canSubmitChangeRequests = isEmployee;
  const canViewTeam = isDepartmentHead || isHR;
  const canManageAll = isHR;
  const canApprove = isHR;

  // For HR users, this is the unified HR Workspace
  const isHRWorkspace = isHR;

  return (
    <ProtectedRoute
      allowedRoles={[
        SystemRole.DEPARTMENT_EMPLOYEE,
        SystemRole.DEPARTMENT_HEAD,
        SystemRole.HR_MANAGER,
        SystemRole.HR_ADMIN,
        SystemRole.SYSTEM_ADMIN,
      ]}
    >
      <div className="container mx-auto px-6 py-8">
        {/* Top Context Section - Enhanced for HR Workspace */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            {isHRWorkspace ? "HR Workspace" : "Employee Profile Dashboard"}
          </h1>
          <div className="mt-2 flex items-center gap-3">
            <p className="text-gray-600">
              Welcome, {user?.fullName || "User"}
            </p>
            {isHR && (
              <span className="px-3 py-1 text-sm font-medium bg-blue-100 text-blue-800 rounded-full">
                {isHRAdmin ? "HR Admin" : "HR Manager"}
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* PRIMARY WORK AREAS - For HR Users */}
          {isHRWorkspace && (
            <>
              {/* Employees - Primary */}
              <Card className="hover:shadow-lg transition-shadow border-2 border-blue-200">
                <CardHeader>
                  <CardTitle className="text-xl">Employees</CardTitle>
                  <CardDescription>
                    Search and manage employee profiles
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Link
                    href="/dashboard/employee-profile/admin/search"
                    className="block w-full text-center bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 transition font-medium"
                  >
                    Search Employees
                  </Link>
                </CardContent>
              </Card>

              {/* Approvals - Primary */}
              <Card className="hover:shadow-lg transition-shadow border-2 border-blue-200">
                <CardHeader>
                  <CardTitle className="text-xl">Approvals</CardTitle>
                  <CardDescription>
                    Review and approve employee requests
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Link
                    href="/dashboard/employee-profile/admin/approvals"
                    className="block w-full text-center bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 transition font-medium"
                  >
                    View Approvals
                  </Link>
                </CardContent>
              </Card>
            </>
          )}

          {/* SECONDARY WORK AREAS */}
          {/* Team View - Show for managers/HR */}
          {canViewTeam && (
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
          )}

          {/* My Profile - Show for all employees */}
          {isEmployee && (
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle>My Profile</CardTitle>
                <CardDescription>
                  View and manage your personal information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link
                  href="/dashboard/employee-profile/my-profile"
                  className="block w-full text-center bg-gray-600 text-white py-3 px-4 rounded-md hover:bg-gray-700 transition font-medium"
                >
                  View Profile
                </Link>
                {canEditOwnProfile && (
                  <Link
                    href="/dashboard/employee-profile/my-profile/edit"
                    className="block w-full text-center border border-gray-600 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-50 transition"
                  >
                    Edit Profile
                  </Link>
                )}
              </CardContent>
            </Card>
          )}

          {/* Change Requests - Show for department employees (not primary for HR) */}
          {canSubmitChangeRequests && !isHRWorkspace && (
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle>Change Requests</CardTitle>
                <CardDescription>
                  Submit and track profile change requests
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link
                  href="/dashboard/employee-profile/change-requests"
                  className="block w-full text-center bg-amber-600 text-white py-3 px-4 rounded-md hover:bg-amber-700 transition font-medium"
                >
                  My Requests
                </Link>
                <Link
                  href="/dashboard/employee-profile/change-requests/new"
                  className="block w-full text-center border border-amber-600 text-amber-600 py-2 px-4 rounded-md hover:bg-amber-50 transition"
                >
                  New Request
                </Link>
              </CardContent>
            </Card>
          )}

          {/* ADMIN/SYSTEM TOOLS - Only for HR Admin */}
          {isHRAdmin && (
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle>Admin</CardTitle>
                <CardDescription>
                  System administration and configuration
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link
                  href="/dashboard/admin"
                  className="block w-full text-center bg-gray-600 text-white py-3 px-4 rounded-md hover:bg-gray-700 transition font-medium"
                >
                  Admin Console
                </Link>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Back to Main Dashboard - Only show for non-HR users or as optional link */}
        {!isHRWorkspace && (
          <div className="mt-8 pt-6 border-t border-gray-200">
            <Link
              href="/dashboard"
              className="text-blue-600 hover:text-blue-800 hover:underline"
            >
              ← Back to Main Dashboard
            </Link>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
