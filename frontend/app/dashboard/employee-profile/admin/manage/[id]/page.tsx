"use client";

import { useEffect, useState, useMemo } from "react";
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
import { employeeProfileApi } from "@/lib/api/employee-profile/employee-profile";
import { isHRAdminOrManager } from "@/lib/utils/role-utils";

import RoleAssignmentSection from "@/components/employee-profile/RoleAssignmentSection";
import EducationSection from "@/components/employee-profile/EducationSection";

// Helper function to format dates consistently (prevents hydration errors)
const formatDate = (date: Date | string | undefined | null): string => {
  if (!date) return "Not provided";
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return "Invalid date";
    // Use a consistent format that works on both server and client
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  } catch {
    return "Invalid date";
  }
};

export default function ManageProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const { toast, showToast, hideToast } = useToast();

  const [profile, setProfile] = useState<EmployeeProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const isAuthorized = useMemo(() => isHRAdminOrManager(user), [user]);

  useEffect(() => {
    // Wait for auth to finish loading
    if (authLoading) {
      setLoading(true);
      return;
    }

    // If not authorized, stop loading immediately
    if (!isAuthorized) {
      setLoading(false);
      return;
    }

    // If no ID, stop loading
    if (!id) {
      setLoading(false);
      return;
    }

    let isMounted = true;
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        console.log("Loading employee profile for ID:", id);
        const response = await employeeProfileApi.getEmployeeById(id);
        console.log("Employee profile response:", response);

        if (cancelled || !isMounted) return;

        // The API already extracts data, so response should be the EmployeeProfile directly
        // or wrapped in { data: EmployeeProfile }
        let profileData: EmployeeProfile | null = null;
        
        if (response) {
          // If response is already an EmployeeProfile (has employeeNumber or fullName)
          if (typeof response === "object" && ("employeeNumber" in response || "fullName" in response || "id" in response || "_id" in response)) {
            profileData = response as EmployeeProfile;
          } 
          // If response has a data property
          else if (typeof response === "object" && "data" in response) {
            profileData = (response as any).data as EmployeeProfile;
          }
        }

        // Validate profile data - check for any identifier
        if (profileData && (profileData.id || profileData._id || profileData.employeeNumber || (profileData as any)._id)) {
          // Ensure we have both id and _id for consistency
          if (profileData._id && !profileData.id) {
            profileData.id = profileData._id as string;
          }
          if (profileData.id && !profileData._id) {
            profileData._id = profileData.id as any;
          }
          console.log("Profile loaded successfully:", profileData);
          setProfile(profileData);
        } else {
          console.error("Profile data validation failed:", {
            hasResponse: !!response,
            responseType: typeof response,
            responseKeys: response && typeof response === "object" ? Object.keys(response) : [],
            profileData,
            hasId: profileData?.id,
            has_id: profileData?._id,
            hasEmployeeNumber: profileData?.employeeNumber,
          });
          setProfile(null);
          showToast("Profile not found. Please check the employee ID.", "error");
        }
      } catch (error: any) {
        if (cancelled || !isMounted) return;
        console.error("Error loading employee profile:", error);
        showToast(error.message || "Failed to load profile", "error");
        setProfile(null);
      } finally {
        if (!cancelled && isMounted) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isAuthorized, authLoading]);

  if (!isAuthorized) {
    return (
      <div className="container mx-auto px-6 py-8">
        <Card>
          <CardContent className="py-12 text-center">
            <h2 className="text-2xl font-bold text-red-600 mb-4">
              Access Denied
            </h2>
            <p className="text-gray-600 mb-6">
              Only HR Admin, HR Manager, and System Admin can access this page.
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
                    formatDate(profile.dateOfBirth),
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
                    {label === "Date of Hire"
                      ? formatDate(value as any)
                      : value || "N/A"}
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
                  {/* Handle both cases: object or string ID */}
                  {(() => {
                    if (
                      profile.primaryDepartmentId &&
                      typeof profile.primaryDepartmentId === "object"
                    ) {
                      return (
                        (profile.primaryDepartmentId as any).name ||
                        "Not assigned"
                      );
                    }
                    return profile.primaryDepartment?.name || "Not assigned";
                  })()}
                </p>
                {profile.primaryDepartmentId &&
                  typeof profile.primaryDepartmentId === "object" &&
                  (profile.primaryDepartmentId as any).code && (
                    <p className="text-xs text-gray-500 mt-1">
                      Code: {(profile.primaryDepartmentId as any).code}
                    </p>
                  )}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-800">Position</p>
                <p className="mt-1 text-gray-900">
                  {/* Handle both cases: object or string ID */}
                  {(() => {
                    if (
                      profile.primaryPositionId &&
                      typeof profile.primaryPositionId === "object"
                    ) {
                      return (
                        (profile.primaryPositionId as any).title ||
                        "Not assigned"
                      );
                    }
                    return profile.primaryPosition?.title || "Not assigned";
                  })()}
                </p>
                {profile.primaryPositionId &&
                  typeof profile.primaryPositionId === "object" &&
                  (profile.primaryPositionId as any).code && (
                    <p className="text-xs text-gray-500 mt-1">
                      Code: {(profile.primaryPositionId as any).code}
                    </p>
                  )}
              </div>
              {profile.payGradeId && (
                <div>
                  <p className="text-sm font-medium text-gray-800">Pay Grade</p>
                  <p className="mt-1 text-gray-900">
                    {typeof profile.payGradeId === "object"
                      ? (profile.payGradeId as any).grade || "Not set"
                      : "Not set"}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
          {/* Education & Qualifications */}
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle>Education & Qualifications</CardTitle>
              <CardDescription>
                Employee's educational background
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EducationSection employeeId={id} isHR={true} />
            </CardContent>
          </Card>
          {/* Role Management */}
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle>Role & Access Management</CardTitle>
              <CardDescription>
                Assign system roles and permissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RoleAssignmentSection
                employeeId={id}
                currentUserRoles={(user?.roles as SystemRole[]) || []}
              />
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
