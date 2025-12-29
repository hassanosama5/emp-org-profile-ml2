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

export default function PerformanceDashboardPage() {
  const { user } = useAuth();

  // Helper function to check roles
  const hasRole = (role: SystemRole | string): boolean => {
    if (!user?.roles) return false;
    return user.roles.some((userRole) => {
      if (typeof userRole === "string" && typeof role === "string") {
        return userRole.toLowerCase() === role.toLowerCase();
      }
      return userRole === role;
    });
  };

  // Determine user roles
  const isEmployee =
    user?.userType === "employee" || hasRole(SystemRole.DEPARTMENT_EMPLOYEE);
  const isHRManager = hasRole(SystemRole.HR_MANAGER);
  const isHRAdmin = hasRole(SystemRole.HR_ADMIN);
  const isHREmployee = hasRole(SystemRole.HR_EMPLOYEE);
  const isDepartmentHead = hasRole(SystemRole.DEPARTMENT_HEAD);

  const isHR = isHRManager || isHRAdmin || isHREmployee;
  const canManagePerformance = isHR || isDepartmentHead;
  const isManager = isDepartmentHead || isHRManager; // Line Manager / Department Head

  return (
    <ProtectedRoute>
      <div className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white-900">
            Performance Management
          </h1>
          <p className="text-gray-600 mt-1">
            Manage appraisals, ratings, and performance reviews
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Manager View - Assignments (Priority for Department Heads/Line Managers, but not HR) */}
          {isManager && !isHR && (
            <Card className="hover:shadow-lg transition-shadow border-2 border-green-200 bg-gradient-to-r from-green-50 to-emerald-50">
              <CardHeader>
                <CardTitle className="text-xl">
                  My Assigned Appraisals
                </CardTitle>
                <CardDescription>
                  View assigned appraisal forms and complete ratings for your
                  direct reports (REQ-PP-13, REQ-AE-03)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link
                  href="/dashboard/performance/assignments"
                  className="block w-full text-center bg-green-600 text-white py-3 px-4 rounded-md hover:bg-green-700 transition font-medium"
                >
                  View My Assignments
                </Link>
                <p className="text-xs text-gray-600 text-center">
                  Complete appraisal ratings for your team members
                </p>
              </CardContent>
            </Card>
          )}

          {/* Employee View - My Appraisals (Show for all employees including managers) */}
          {(isEmployee || isManager) && (
            <Card className="hover:shadow-lg transition-shadow border-2 border-blue-200">
              <CardHeader>
                <CardTitle>My Appraisals</CardTitle>
                <CardDescription>
                  View your own appraisal ratings, feedback, and development
                  notes (REQ-OD-01)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link
                  href="/dashboard/performance/my-appraisals"
                  className="block w-full text-center bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 transition font-medium"
                >
                  View My Appraisals
                </Link>
              </CardContent>
            </Card>
          )}

          {/* HR Management Features */}
          {canManagePerformance && (
            <>
              <Card className="hover:shadow-lg transition-shadow border-2 border-indigo-200">
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
                    Manage Templates
                  </Link>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow border-2 border-purple-200">
                <CardHeader>
                  <CardTitle>Appraisal Cycles</CardTitle>
                  <CardDescription>
                    Define and schedule appraisal cycles (annual, semi-annual,
                    probationary)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Link
                    href="/dashboard/performance/cycles"
                    className="block w-full text-center bg-purple-600 text-white py-3 px-4 rounded-md hover:bg-purple-700 transition font-medium"
                  >
                    Manage Cycles
                  </Link>
                </CardContent>
              </Card>

              {isHR && (
                <>
                  <Card className="hover:shadow-lg transition-shadow border-2 border-blue-200">
                    <CardHeader>
                      <CardTitle>Bulk Assignment</CardTitle>
                      <CardDescription>
                        Assign appraisal forms to multiple employees at once
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Link
                        href="/dashboard/performance/assignments/bulk"
                        className="block w-full text-center bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 transition font-medium"
                      >
                        Bulk Assignment
                      </Link>
                    </CardContent>
                  </Card>

                  <Card className="hover:shadow-lg transition-shadow border-2 border-green-200">
                    <CardHeader>
                      <CardTitle>Appraisal Assignments</CardTitle>
                      <CardDescription>
                        View and manage appraisal assignments for managers
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Link
                        href="/dashboard/performance/assignments"
                        className="block w-full text-center bg-green-600 text-white py-3 px-4 rounded-md hover:bg-green-700 transition font-medium"
                      >
                        View Assignments
                      </Link>
                    </CardContent>
                  </Card>

                  <Card className="hover:shadow-lg transition-shadow border-2 border-yellow-200">
                    <CardHeader>
                      <CardTitle>Publish Ratings</CardTitle>
                      <CardDescription>
                        Review and publish finalized appraisal ratings to
                        employees
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Link
                        href="/dashboard/performance/publish"
                        className="block w-full text-center bg-yellow-600 text-white py-3 px-4 rounded-md hover:bg-yellow-700 transition font-medium"
                      >
                        Publish Ratings
                      </Link>
                    </CardContent>
                  </Card>

                  {(isHRManager || isHRAdmin) && (
                    <Card className="hover:shadow-lg transition-shadow border-2 border-red-200">
                      <CardHeader>
                        <CardTitle>Dispute Resolution</CardTitle>
                        <CardDescription>
                          Review and resolve employee concerns about appraisal
                          ratings
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Link
                          href="/dashboard/performance/disputes"
                          className="block w-full text-center bg-red-600 text-white py-3 px-4 rounded-md hover:bg-red-700 transition font-medium"
                        >
                          Resolve Disputes
                        </Link>
                      </CardContent>
                    </Card>
                  )}
                </>
              )}
            </>
          )}
        </div>

        {/* Back to Dashboard */}
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
