"use client";

import Link from "next/link";
import { useAuth } from "@/lib/hooks/use-auth";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/shared/ui/Card";
import { useRequireAuth } from "@/lib/hooks/use-auth";
import { SystemRole } from "@/types";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LeavesPage() {
  const { user, isAuthenticated, loading } = useAuth();
  const router = useRouter();

  // Check if user is HR Admin, HR Manager, or Department Head
  useEffect(() => {
    if (!loading && isAuthenticated && user) {
      const roles = user.roles || [];
      const isHRAdmin = roles.includes(SystemRole.HR_ADMIN);
      const isHRManager = roles.includes(SystemRole.HR_MANAGER);
      const isDepartmentHead = roles.includes(SystemRole.DEPARTMENT_HEAD);
      
      if (!isHRAdmin && !isHRManager && !isDepartmentHead) {
        // Redirect employees to the employee-facing leave page
        router.replace("/dashboard/leaves/requests");
        return;
      }
    }
  }, [loading, isAuthenticated, user, router]);

  // Only show admin page if user is HR Admin, HR Manager, or Department Head
  const roles = user?.roles || [];
  const isHRAdmin = roles.includes(SystemRole.HR_ADMIN);
  const isHRManager = roles.includes(SystemRole.HR_MANAGER);
  const isDepartmentHead = roles.includes(SystemRole.DEPARTMENT_HEAD);

  // Show loading or redirect if not HR Admin, HR Manager, or Department Head
  if (loading || !isAuthenticated || (!isHRAdmin && !isHRManager && !isDepartmentHead)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Leaves Management</h1>
        <p className="text-gray-600 mt-1">Configure and manage leave policies, types, and entitlements</p>
      </div>

      {/* Department Head Section */}
      {isDepartmentHead && (
        <Card className="mb-6 border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-blue-900">Manager Actions</CardTitle>
            <CardDescription className="text-blue-700">
              Review and approve leave requests from your team members
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link 
              href="/dashboard/leaves/requests/review" 
              className="text-blue-600 hover:underline font-medium"
            >
              Review Pending Leave Requests →
            </Link>
          </CardContent>
        </Card>
      )}

      {/* NEW CODE: HR Manager Section - Only for HR_MANAGER (HR_ADMIN excluded) */}
      {isHRManager && !isHRAdmin && (
        <Card className="mb-6 border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-blue-900">HR Manager Actions</CardTitle>
            <CardDescription className="text-blue-700">
              Finalize approved requests, override decisions, and process requests in bulk
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link 
              href="/dashboard/leaves/hr-manager" 
              className="text-blue-600 hover:underline font-medium"
            >
              Manage Leave Requests →
            </Link>
          </CardContent>
        </Card>
      )}

      {/* HR Admin Section */}
      {isHRAdmin && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Leave Types</CardTitle>
              <CardDescription>Manage leave types (Annual, Sick, etc.)</CardDescription>
            </CardHeader>
            <CardContent>
              <Link 
                href="/dashboard/leaves/types" 
                className="text-blue-600 hover:underline font-medium"
              >
                Manage Leave Types →
              </Link>
            </CardContent>
          </Card>

        <Card>
          <CardHeader>
            <CardTitle>Leave Categories</CardTitle>
            <CardDescription>Organize leave types into categories</CardDescription>
          </CardHeader>
          <CardContent>
            <Link 
              href="/dashboard/leaves/categories" 
              className="text-blue-600 hover:underline font-medium"
            >
              Manage Categories →
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Leave Policies</CardTitle>
            <CardDescription>Configure accrual rates, carry-over, and eligibility rules</CardDescription>
          </CardHeader>
          <CardContent>
            <Link 
              href="/dashboard/leaves/policies" 
              className="text-blue-600 hover:underline font-medium"
            >
              Manage Policies →
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Leave Entitlements</CardTitle>
            <CardDescription>Assign and manage employee leave entitlements</CardDescription>
          </CardHeader>
          <CardContent>
            <Link 
              href="/dashboard/leaves/entitlements" 
              className="text-blue-600 hover:underline font-medium"
            >
              Manage Entitlements →
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Leave Adjustments</CardTitle>
            <CardDescription>Manually adjust employee leave balances</CardDescription>
          </CardHeader>
          <CardContent>
            <Link 
              href="/dashboard/leaves/adjustments" 
              className="text-blue-600 hover:underline font-medium"
            >
              Manage Adjustments →
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Calendar & Blocked Days</CardTitle>
            <CardDescription>Configure holidays and blocked periods</CardDescription>
          </CardHeader>
          <CardContent>
            <Link 
              href="/dashboard/leaves/calendar" 
              className="text-blue-600 hover:underline font-medium"
            >
              Manage Calendar →
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Reset Leave Balances</CardTitle>
            <CardDescription>Reset leave balances for the new year</CardDescription>
          </CardHeader>
          <CardContent>
            <Link 
              href="/dashboard/leaves/reset" 
              className="text-blue-600 hover:underline font-medium"
            >
              Reset Balances →
            </Link>
          </CardContent>
        </Card>
        </div>
      )}
    </div>
  );
}



