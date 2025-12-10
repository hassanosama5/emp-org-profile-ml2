"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/hooks/use-auth";
import { SystemRole, EmployeeProfile } from "@/types";
import { useParams, useRouter } from "next/navigation";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/shared/ui/Card";
import { Button } from "@/components/shared/ui/Button";
import { Toast, useToast } from "@/components/leaves/Toast";
import { employeeProfileApi } from "@/lib/api/employee-profile/profile";
import { isHRAdminOrManager } from "@/lib/utils/role-utils";

export default function ManageProfilePage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const { toast, showToast, hideToast } = useToast();

  const [profile, setProfile] = useState<EmployeeProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const isAuthorized = isHRAdminOrManager(user);

  useEffect(() => {
    const load = async () => {
      try {
        if (!id || !isAuthorized) return;

        setLoading(true);
        const response = await employeeProfileApi.getEmployeeById(id);

        if (response && typeof response === "object") {
          setProfile(response as EmployeeProfile);
        } else {
          setProfile(null);
          showToast("Profile not found", "error");
        }
      } catch (error: any) {
        showToast(error.message || "Failed to load profile", "error");
      } finally {
        setLoading(false);
      }
    };

    if (isAuthorized) load();
  }, [id, isAuthorized, showToast]);

  if (!isAuthorized) {
    return (
      <div className="container mx-auto px-6 py-8">
        <Card>
          <CardContent className="py-12 text-center">
            <h2 className="text-2xl font-bold text-red-600 mb-4">
              Access Denied
            </h2>
            <p className="text-gray-600 mb-6">
              Only HR Admin and HR Manager can access this page.
            </p>
            <div className="flex justify-center gap-4">
              <Button
                onClick={() => router.push("/dashboard/employee-profile")}
              >
                Profile Dashboard
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push("/dashboard")}
              >
                Main Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8">
      <Toast {...toast} onClose={hideToast} />

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Manage Employee Profile
          </h1>
          <p className="text-gray-600 mt-1">Employee ID: {id}</p>
        </div>
        <div className="flex gap-3 mt-4 md:mt-0">
          <Button
            variant="outline"
            onClick={() =>
              router.push("/dashboard/employee-profile/admin/search")
            }
          >
            ← Back to Search
          </Button>
          <Button onClick={() => router.push("/dashboard/employee-profile")}>
            Profile Dashboard
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-gray-300 border-t-blue-600" />
          <p className="ml-4 text-gray-600">Loading employee profile...</p>
        </div>
      ) : !profile ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-600 text-lg mb-4">
              Employee profile not found.
            </p>
            <div className="flex justify-center gap-3">
              <Button
                onClick={() =>
                  router.push("/dashboard/employee-profile/admin/search")
                }
              >
                Search Employees
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push("/dashboard")}
              >
                Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Personal Information */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>Employee personal details</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  ["Full Name", profile.fullName],
                  ["Employee Number", profile.employeeNumber],
                  [
                    "Date of Birth",
                    profile.dateOfBirth
                      ? new Date(profile.dateOfBirth).toLocaleDateString()
                      : "Not provided",
                  ],
                  ["Gender", profile.gender || "Not provided"],
                  ["Marital Status", profile.maritalStatus || "Not provided"],
                  ["National ID", profile.nationalId || "Not provided"],
                ].map(([label, value]) => (
                  <div key={label}>
                    <p className="text-sm font-medium text-gray-800">{label}</p>
                    <p className="mt-1 text-gray-900">{value}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Employment Information */}
          <Card>
            <CardHeader>
              <CardTitle>Employment Information</CardTitle>
              <CardDescription>Job and contract details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-800">Status</p>
                <span className="inline-block mt-1 px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                  {profile.status}
                </span>
              </div>
              {[
                ["Date of Hire", profile.dateOfHire],
                ["Contract Type", profile.contractType],
                ["Work Type", profile.workType],
              ].map(([label, value]) => (
                <div key={label}>
                  <p className="text-sm font-medium text-gray-800">{label}</p>
                  <p className="mt-1 text-gray-900">
                    {value
                      ? new Date(value as any).toLocaleDateString?.() || value
                      : "N/A"}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
              <CardDescription>Employee contact details</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  ["Work Email", profile.workEmail],
                  ["Personal Email", profile.personalEmail],
                  ["Mobile Phone", profile.mobilePhone],
                  ["Home Phone", profile.homePhone],
                ].map(([label, value]) => (
                  <div key={label}>
                    <p className="text-sm font-medium text-gray-800">{label}</p>
                    <p className="mt-1 text-gray-900">{value || "N/A"}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Organization */}
          <Card>
            <CardHeader>
              <CardTitle>Organization Information</CardTitle>
              <CardDescription>Department and position</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-800">Department</p>
                <p className="mt-1 text-gray-900">
                  {profile.primaryDepartment?.name || "Not assigned"}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-800">Position</p>
                <p className="mt-1 text-gray-900">
                  {profile.primaryPosition?.title || "Not assigned"}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Notes */}
      <div className="mt-8 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-semibold text-blue-900 mb-2">HR Access Notes</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Full access granted for HR Admin / Manager</li>
          <li>• All changes are audited</li>
          <li>• Status syncs with Payroll and Attendance</li>
        </ul>
      </div>
    </div>
  );
}
