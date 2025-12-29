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
import { Shield, Users, Settings, Lock } from "lucide-react";

export default function SystemAdminDashboardPage() {
  const { user } = useAuth();

  return (
    <ProtectedRoute allowedRoles={[SystemRole.SYSTEM_ADMIN]}>
      <div className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white-900">
            System Administration
          </h1>
          <p className="text-gray-600 mt-1">
            Welcome, {user?.fullName || "System Admin"}. Manage system-wide
            configurations and access controls.
          </p>
        </div>

        {/* System Administration Features */}
        <div className="mb-10">
          <h2 className="text-2xl font-semibold text-white-900 mb-4">
            Access & Role Management
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="hover:shadow-lg transition-shadow border-2 border-blue-200">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Shield className="h-6 w-6 text-blue-600" />
                  <CardTitle className="text-lg">Role Assignment</CardTitle>
                </div>
                <CardDescription>
                  Assign and manage system roles for employees
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link
                  href="/dashboard/system-admin/role-assignment"
                  className="block w-full text-center bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 transition font-medium"
                >
                  Manage Roles
                </Link>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Users className="h-6 w-6 text-gray-600" />
                  <CardTitle>User Management</CardTitle>
                </div>
                <CardDescription>
                  View and manage all system users
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link
                  href="/dashboard/employee-profile/admin/search"
                  className="block w-full text-center border border-gray-300 text-gray-700 py-3 px-4 rounded-md hover:bg-gray-50 transition font-medium"
                >
                  View Users
                </Link>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Lock className="h-6 w-6 text-gray-600" />
                  <CardTitle>Security Settings</CardTitle>
                </div>
                <CardDescription>
                  Configure system security and access policies
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-gray-500 text-center py-3">
                  Coming soon
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* System Configuration */}
        <div className="mb-10">
          <h2 className="text-2xl font-semibold text-'white'-900 mb-4">
            System Configuration
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Settings className="h-6 w-6 text-gray-600" />
                  <CardTitle>Organization Structure</CardTitle>
                </div>
                <CardDescription>
                  Manage departments, positions, and hierarchy
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link
                  href="/dashboard/organization-structure"
                  className="block w-full text-center border border-gray-300 text-gray-700 py-3 px-4 rounded-md hover:bg-gray-50 transition font-medium"
                >
                  Manage Structure
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
