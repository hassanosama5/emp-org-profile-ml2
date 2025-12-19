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

function OrganizationStructureDashboardPage() {
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
  const isSystemAdmin = hasRole(SystemRole.SYSTEM_ADMIN);
  const isHRAdmin = hasRole(SystemRole.HR_ADMIN);
  const isHRManager = hasRole(SystemRole.HR_MANAGER);
  const isDepartmentHead = hasRole(SystemRole.DEPARTMENT_HEAD);
  const isEmployee = hasRole(SystemRole.DEPARTMENT_EMPLOYEE);

  // Permission flags
  const canManageStructure = isSystemAdmin || isHRAdmin;
  const canViewHierarchy =
    isSystemAdmin || isHRAdmin || isHRManager || isDepartmentHead || isEmployee;
  const canSubmitRequests = isHRManager || isDepartmentHead;
  const canApproveRequests = isSystemAdmin || isHRAdmin;
  const canViewChangeLogs = isSystemAdmin || isHRAdmin;

  return (
    <ProtectedRoute
      allowedRoles={[
        SystemRole.SYSTEM_ADMIN,
        SystemRole.HR_ADMIN,
        SystemRole.HR_MANAGER,
        SystemRole.DEPARTMENT_HEAD,
        SystemRole.DEPARTMENT_EMPLOYEE,
      ]}
    >
      <div className="container mx-auto px-6 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white-900">
            Organization Structure
          </h1>
          <div className="mt-2 flex items-center gap-3">
            <p className="text-gray-600">Welcome, {user?.fullName || "User"}</p>
            {canManageStructure && (
              <span className="px-3 py-1 text-sm font-medium bg-green-100 text-green-800 rounded-full">
                Administrator
              </span>
            )}
            {canSubmitRequests && !canManageStructure && (
              <span className="px-3 py-1 text-sm font-medium bg-blue-100 text-blue-800 rounded-full">
                Manager
              </span>
            )}
          </div>
        </div>

        {/* Main Dashboard Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* STRUCTURE MANAGEMENT (Admin only) */}
          {canManageStructure && (
            <>
              {/* Departments Management */}
              <Card className="hover:shadow-lg transition-shadow border-2 border-green-200">
                <CardHeader>
                  <CardTitle className="text-xl">Departments</CardTitle>
                  <CardDescription>
                    Define and manage organizational departments
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Link
                    href="/dashboard/organization-structure/departments"
                    className="block w-full text-center bg-green-600 text-white py-3 px-4 rounded-md hover:bg-green-700 transition font-medium"
                  >
                    Manage Departments
                  </Link>
                  <Link
                    href="/dashboard/organization-structure/departments/new"
                    className="block w-full text-center border border-green-600 text-green-600 py-2 px-4 rounded-md hover:bg-green-50 transition"
                  >
                    Create New Department
                  </Link>
                </CardContent>
              </Card>

              {/* Positions Management */}
              <Card className="hover:shadow-lg transition-shadow border-2 border-green-200">
                <CardHeader>
                  <CardTitle className="text-xl">Positions</CardTitle>
                  <CardDescription>
                    Create and manage job positions and roles
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Link
                    href="/dashboard/organization-structure/positions"
                    className="block w-full text-center bg-green-600 text-white py-3 px-4 rounded-md hover:bg-green-700 transition font-medium"
                  >
                    Manage Positions
                  </Link>
                  <Link
                    href="/dashboard/organization-structure/positions/new"
                    className="block w-full text-center border border-green-600 text-green-600 py-2 px-4 rounded-md hover:bg-green-50 transition"
                  >
                    Create New Position
                  </Link>
                </CardContent>
              </Card>
            </>
          )}

          {/* HIERARCHY VIEW (All authenticated users) */}
          {canViewHierarchy && (
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle>Organization Chart</CardTitle>
                <CardDescription>
                  View the complete organizational hierarchy
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link
                  href="/dashboard/organization-structure/hierarchy"
                  className="block w-full text-center bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 transition font-medium"
                >
                  View Chart
                </Link>
              </CardContent>
            </Card>
          )}

          {/* CHANGE REQUEST WORKFLOW (Managers and Admins) */}
          {(canSubmitRequests || canApproveRequests) && (
            <Card className="hover:shadow-lg transition-shadow border-2 border-amber-200">
              <CardHeader>
                <CardTitle>Change Requests</CardTitle>
                <CardDescription>
                  {canSubmitRequests && !canApproveRequests
                    ? "Submit requests for structural changes"
                    : canApproveRequests
                    ? "Review and approve structural changes"
                    : "Track structural change requests"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link
                  href="/dashboard/organization-structure/change-requests"
                  className="block w-full text-center bg-amber-600 text-white py-3 px-4 rounded-md hover:bg-amber-700 transition font-medium"
                >
                  {canApproveRequests ? "Review Requests" : "My Requests"}
                </Link>
                {canSubmitRequests && (
                  <Link
                    href="/dashboard/organization-structure/change-requests/new"
                    className="block w-full text-center border border-amber-600 text-amber-600 py-2 px-4 rounded-md hover:bg-amber-50 transition"
                  >
                    New Request
                  </Link>
                )}
              </CardContent>
            </Card>
          )}

          {/* POSITION ASSIGNMENTS (HR/Admin only) */}
          {(canManageStructure || isHRManager) && (
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle>Assignments</CardTitle>
                <CardDescription>
                  Assign employees to positions and manage assignments
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link
                  href="/dashboard/organization-structure/assignments"
                  className="block w-full text-center bg-purple-600 text-white py-3 px-4 rounded-md hover:bg-purple-700 transition font-medium"
                >
                  Manage Assignments
                </Link>
              </CardContent>
            </Card>
          )}

          {/* AUDIT LOGS (Admin only) */}
          {canViewChangeLogs && (
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle>Change Logs</CardTitle>
                <CardDescription>
                  View audit trail of all structural changes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link
                  href="/dashboard/organization-structure/change-logs"
                  className="block w-full text-center bg-gray-600 text-white py-3 px-4 rounded-md hover:bg-gray-700 transition font-medium"
                >
                  View Logs
                </Link>
              </CardContent>
            </Card>
          )}

          {/* TEAM VIEW (Managers and Employees) */}
          {(isDepartmentHead || isEmployee) && (
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle>My Team Structure</CardTitle>
                <CardDescription>
                  View your team's reporting lines and structure
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
        </div>

        {/* Back to Main Dashboard */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <Link
            href="/dashboard"
            className="text-blue-600 hover:text-blue-800 hover:underline"
          >
            ← Back to Main Dashboard
          </Link>
        </div>
      </div>
    </ProtectedRoute>
  );
}

export default OrganizationStructureDashboardPage;
