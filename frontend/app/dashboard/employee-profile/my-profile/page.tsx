// dashboard/employee-profile/my-profile/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/hooks/use-auth";
import { ProtectedRoute } from "@/components/auth/protected-route";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/shared/ui/Card";
import { Button } from "@/components/shared/ui/Button";
import Link from "next/link";
import { employeeProfileApi } from "@/lib/api/employee-profile/profile";
import type { EmployeeProfile } from "@/types";

export default function MyProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<EmployeeProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const canEdit = true;

  // app/dashboard/employee-profile/my-profile/page.tsx - UPDATED "use client" section
  // Update just the useEffect and loadProfile function:

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const response = await employeeProfileApi.getMyProfile();

      // The API helper now extracts data properly
      if (response && typeof response === "object") {
        setProfile(response as EmployeeProfile);
      } else {
        setProfile(response as EmployeeProfile | null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute requiredUserType="employee">
        <div className="container mx-auto px-6 py-8">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (error) {
    return (
      <ProtectedRoute requiredUserType="employee">
        <div className="container mx-auto px-6 py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-700">{error}</p>
            <Button onClick={() => loadProfile()} className="mt-3">
              Try Again
            </Button>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredUserType="employee">
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
            <p className="text-gray-600 mt-1">
              Employee ID: {profile?.employeeNumber || user?.employeeNumber}
            </p>
          </div>
          <div className="flex gap-3 mt-4 md:mt-0">
            {canEdit && (
              <Link href="/dashboard/employee-profile/my-profile/edit">
                <Button variant="primary">Edit Profile</Button>
              </Link>
            )}
            <Link href="/dashboard/employee-profile/change-requests/new">
              <Button variant="outline">Request Correction</Button>
            </Link>
          </div>
        </div>

        {/* Profile Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Personal Info */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Full Name</p>
                  <p className="mt-1">
                    {profile?.fullName || user?.fullName || "Not available"}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    Employee Number
                  </p>
                  <p className="mt-1 font-mono">
                    {profile?.employeeNumber || user?.employeeNumber || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    Date of Birth
                  </p>
                  <p className="mt-1">
                    {profile?.dateOfBirth
                      ? new Date(profile.dateOfBirth).toLocaleDateString()
                      : "Not provided"}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Gender</p>
                  <p className="mt-1">{profile?.gender || "Not provided"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    Marital Status
                  </p>
                  <p className="mt-1">
                    {profile?.maritalStatus || "Not provided"}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    National ID
                  </p>
                  <p className="mt-1 font-mono">
                    {profile?.nationalId || "Not provided"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Status Card */}
          <Card>
            <CardHeader>
              <CardTitle>Employment Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Status</p>
                  <span
                    className={`mt-1 inline-block px-3 py-1 text-sm rounded-full ${
                      profile?.status === "ACTIVE"
                        ? "bg-green-100 text-green-800"
                        : profile?.status === "ON_LEAVE"
                        ? "bg-blue-100 text-blue-800"
                        : profile?.status === "TERMINATED"
                        ? "bg-red-100 text-red-800"
                        : profile?.status
                        ? "bg-gray-100 text-gray-800"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {profile?.status || "UNKNOWN"}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    Date of Hire
                  </p>
                  <p className="mt-1">
                    {profile?.dateOfHire
                      ? new Date(profile.dateOfHire).toLocaleDateString()
                      : "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    Contract Type
                  </p>
                  <p className="mt-1">{profile?.contractType || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Work Type</p>
                  <p className="mt-1">{profile?.workType || "N/A"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    Work Email
                  </p>
                  <p className="mt-1">
                    {profile?.workEmail || user?.workEmail || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    Personal Email
                  </p>
                  <p className="mt-1">
                    {profile?.personalEmail || user?.personalEmail || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    Mobile Phone
                  </p>
                  <p className="mt-1">{profile?.mobilePhone || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    Home Phone
                  </p>
                  <p className="mt-1">{profile?.homePhone || "N/A"}</p>
                </div>
                {profile?.address && (
                  <div className="md:col-span-2">
                    <p className="text-sm font-medium text-gray-500">Address</p>
                    <p className="mt-1">
                      {[
                        profile.address.streetAddress,
                        profile.address.city,
                        profile.address.country,
                      ]
                        .filter(Boolean)
                        .join(", ") || "Not provided"}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Position & Department */}
          <Card>
            <CardHeader>
              <CardTitle>Position & Department</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Position</p>
                <p className="mt-1">
                  {profile?.primaryPosition?.title || "Not assigned"}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Department</p>
                <p className="mt-1">
                  {profile?.primaryDepartment?.name || "Not assigned"}
                </p>
              </div>
              {profile?.supervisor && (
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    Supervisor
                  </p>
                  <p className="mt-1">{profile.supervisor.fullName}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Links */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Quick Actions
          </h2>
          <div className="flex flex-wrap gap-3">
            <Link href="/dashboard/employee-profile">
              <Button variant="ghost">← Back to Profile Dashboard</Button>
            </Link>
            <Link href="/dashboard/employee-profile/my-profile/edit">
              <Button variant="outline">Update Contact Information</Button>
            </Link>
            <Link href="/dashboard/employee-profile/change-requests/new">
              <Button variant="outline">Request Data Correction</Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="outline">Go to Main Dashboard</Button>
            </Link>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
