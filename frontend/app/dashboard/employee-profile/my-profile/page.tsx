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

import EducationSection from "@/components/employee-profile/EducationSection";
import ProfilePhotoUpload from "@/components/employee-profile/ProfilePhotoUpload";
import { fetchEmployeeAppraisals } from "@/lib/api/performance/Api/performanceAppraisalsApi";
import { AppraisalRecord } from "@/components/Performance/performanceRecords";

export default function MyProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<EmployeeProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [appraisals, setAppraisals] = useState<AppraisalRecord[]>([]);
  const [appraisalsLoading, setAppraisalsLoading] = useState(false);

  const canEdit = true;

  useEffect(() => {
    loadProfile();
  }, []);

  useEffect(() => {
    if (profile) {
      loadAppraisals();
    }
  }, [profile]);

  const loadAppraisals = async () => {
    try {
      setAppraisalsLoading(true);
      const profileId = profile?._id || profile?.id || user?.id || user?.userId;
      if (profileId) {
        const data = await fetchEmployeeAppraisals(String(profileId));
        setAppraisals(data || []);
      }
    } catch (err) {
      console.error("Failed to load appraisals:", err);
      // Don't show error to user, just log it
    } finally {
      setAppraisalsLoading(false);
    }
  };

  const loadProfile = async () => {
    try {
      setLoading(true);
      const response = await employeeProfileApi.getMyProfile();

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
            <h1 className="text-2xl font-bold text-white-900">My Profile</h1>
            <p className="text-white-900 mt-1">
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
          {/* Personal Information */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Full Name</p>
                  <p className="mt-1 text-black">
                    {profile?.fullName || user?.fullName || "Not available"}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    Employee Number
                  </p>
                  <p className="mt-1 font-mono text-black">
                    {profile?.employeeNumber || user?.employeeNumber || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    Date of Birth
                  </p>
                  <p className="mt-1 text-black">
                    {profile?.dateOfBirth
                      ? new Date(profile.dateOfBirth).toLocaleDateString()
                      : "Not provided"}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Gender</p>
                  <p className="mt-1 text-black">
                    {profile?.gender || "Not provided"}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    Marital Status
                  </p>
                  <p className="mt-1 text-black">
                    {profile?.maritalStatus || "Not provided"}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    National ID
                  </p>
                  <p className="mt-1 font-mono text-black">
                    {profile?.nationalId || "Not provided"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Profile Photo */}
          <Card>
            <CardHeader>
              <CardTitle>Profile Photo</CardTitle>
            </CardHeader>
            <CardContent>
              <ProfilePhotoUpload
                currentPhotoUrl={profile?.profilePictureUrl}
                onPhotoUpdated={(newUrl) => {
                  if (profile) {
                    setProfile({ ...profile, profilePictureUrl: newUrl });
                  }
                }}
              />
            </CardContent>
          </Card>

          {/* Employment Status */}
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle>Employment Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                  <p className="mt-1 text-black">
                    {profile?.dateOfHire
                      ? new Date(profile.dateOfHire).toLocaleDateString()
                      : "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    Contract Type
                  </p>
                  <p className="mt-1 text-black">
                    {profile?.contractType || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Work Type</p>
                  <p className="mt-1 text-black">
                    {profile?.workType || "N/A"}
                  </p>
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
                  <p className="mt-1 text-black">
                    {profile?.workEmail || user?.workEmail || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    Personal Email
                  </p>
                  <p className="mt-1 text-black">
                    {profile?.personalEmail || user?.personalEmail || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    Mobile Phone
                  </p>
                  <p className="mt-1 text-black">
                    {profile?.mobilePhone || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    Home Phone
                  </p>
                  <p className="mt-1 text-black">
                    {profile?.homePhone || "N/A"}
                  </p>
                </div>
                {profile?.address && (
                  <div className="md:col-span-2">
                    <p className="text-sm font-medium text-gray-500">Address</p>
                    <p className="mt-1 text-black">
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
                <p className="mt-1 text-black">
                  {(() => {
                    // Handle both cases: populated object or string ID
                    if (
                      profile?.primaryPositionId &&
                      typeof profile.primaryPositionId === "object"
                    ) {
                      return (
                        (profile.primaryPositionId as any).title ||
                        "Not assigned"
                      );
                    }
                    return profile?.primaryPosition?.title || "Not assigned";
                  })()}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Department</p>
                <p className="mt-1 text-black">
                  {(() => {
                    // Handle both cases: populated object or string ID
                    if (
                      profile?.primaryDepartmentId &&
                      typeof profile.primaryDepartmentId === "object"
                    ) {
                      return (
                        (profile.primaryDepartmentId as any).name ||
                        "Not assigned"
                      );
                    }
                    return profile?.primaryDepartment?.name || "Not assigned";
                  })()}
                </p>
              </div>
              {profile?.supervisor && (
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    Supervisor
                  </p>
                  <p className="mt-1 text-black">
                    {profile.supervisor.fullName}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Education & Qualifications */}
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle>Education & Qualifications</CardTitle>
            </CardHeader>
            <CardContent>
              <EducationSection />
            </CardContent>
          </Card>

          {/* Appraisal History */}
          <Card className="lg:col-span-3">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Appraisal History</CardTitle>
                <Link href="/dashboard/performance/my-appraisals">
                  <Button variant="outline" size="sm">
                    View All
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {appraisalsLoading ? (
                <p className="text-sm text-gray-600">Loading appraisal history...</p>
              ) : appraisals.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-gray-600">
                    No appraisal history available yet.
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    Your appraisal history will appear here once appraisals are completed and published.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {appraisals.slice(0, 5).map((appraisal, index) => {
                    const r: any = appraisal;
                    const cycle = r.cycleId;
                    const template = r.templateId;
                    const publishedDate = r.hrPublishedAt || r.managerSubmittedAt;
                    
                    return (
                      <div
                        key={r._id || r.id || index}
                        className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-semibold text-gray-900">
                                {cycle
                                  ? typeof cycle === "object"
                                    ? cycle.name || "Appraisal Cycle"
                                    : String(cycle)
                                  : "Appraisal Cycle"}
                              </h4>
                              {r.status && (
                                <span
                                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                                    r.status === "HR_PUBLISHED"
                                      ? "bg-green-100 text-green-800"
                                      : r.status === "MANAGER_SUBMITTED"
                                      ? "bg-yellow-100 text-yellow-800"
                                      : "bg-gray-100 text-gray-800"
                                  }`}
                                >
                                  {r.status === "HR_PUBLISHED"
                                    ? "Published"
                                    : r.status === "MANAGER_SUBMITTED"
                                    ? "Submitted"
                                    : r.status}
                                </span>
                              )}
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                              <div>
                                <p className="text-xs text-gray-500">Template</p>
                                <p className="text-gray-900 font-medium">
                                  {template
                                    ? typeof template === "object"
                                      ? template.name || "Template"
                                      : String(template)
                                    : "N/A"}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500">Score</p>
                                <p className="text-gray-900 font-medium">
                                  {r.totalScore ?? "-"}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500">Rating</p>
                                <p className="text-gray-900 font-medium">
                                  {r.overallRatingLabel ?? "-"}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500">Date</p>
                                <p className="text-gray-900 font-medium">
                                  {publishedDate
                                    ? new Date(publishedDate).toLocaleDateString()
                                    : "-"}
                                </p>
                              </div>
                            </div>
                            {r.managerSummary && (
                              <p className="text-xs text-gray-600 mt-2 line-clamp-2">
                                {r.managerSummary}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {appraisals.length > 5 && (
                    <div className="text-center pt-2">
                      <Link href="/dashboard/performance/my-appraisals">
                        <Button variant="outline" size="sm">
                          View All {appraisals.length} Appraisals
                        </Button>
                      </Link>
                    </div>
                  )}
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
