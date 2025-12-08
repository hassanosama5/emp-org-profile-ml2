"use client";

import Link from "next/link";
import { useAuth } from "@/lib/hooks/use-auth";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/shared/ui/Card";

export default function EmployeeDashboardPage() {
  const { user } = useAuth();

  return (
    <ProtectedRoute requiredUserType="employee">
      <div className="container mx-auto px-6 py-8">
        <h1 className="text-3xl font-bold text-gray-900">Welcome {user?.fullName}</h1>
        <p className="text-gray-600 mt-1">Employee Number: {user?.employeeNumber}</p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
              <CardDescription>View and update your personal information</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/dashboard/employee-profile/details" className="text-blue-600 hover:underline">
                Open Profile
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Leaves</CardTitle>
              <CardDescription>Check balance and request leaves</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/dashboard/leaves" className="text-blue-600 hover:underline">
                Go to Leaves
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payroll</CardTitle>
              <CardDescription>View payslips and salary info</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/dashboard/payroll" className="text-blue-600 hover:underline">
                Go to Payroll
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Organization</CardTitle>
              <CardDescription>See your department and reporting line</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/dashboard/organization" className="text-blue-600 hover:underline">
                View Org Chart
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Performance</CardTitle>
              <CardDescription>Latest appraisal cycle and score</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/dashboard/performance" className="text-blue-600 hover:underline">
                Performance Overview
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  );
}
