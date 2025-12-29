// dashboard/candidate-profile/my-profile/page.tsx
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
import type { Candidate } from "@/types";

export default function CandidateMyProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Candidate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const response = await employeeProfileApi.getMyProfile();

      if (response && typeof response === "object") {
        // The API returns either EmployeeProfile or Candidate based on user type
        setProfile(response as unknown as Candidate);
      } else {
        setProfile(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute requiredUserType="candidate">
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
      <ProtectedRoute requiredUserType="candidate">
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
    <ProtectedRoute requiredUserType="candidate">
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
            <p className="text-gray-600 mt-1">
              Candidate Number: {profile?.candidateNumber || user?.candidateNumber || "N/A"}
            </p>
          </div>
          <div className="flex gap-3 mt-4 md:mt-0">
            <Link href="/candidate-portal">
              <Button variant="outline">Back to Portal</Button>
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
                    Candidate Number
                  </p>
                  <p className="mt-1 font-mono text-black">
                    {profile?.candidateNumber || user?.candidateNumber || "N/A"}
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

          {/* Application Status */}
          <Card>
            <CardHeader>
              <CardTitle>Application Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Status</p>
                  <span
                    className={`mt-1 inline-block px-3 py-1 text-sm rounded-full ${
                      profile?.status === "APPLIED"
                        ? "bg-blue-100 text-blue-800"
                        : profile?.status === "SCREENING"
                        ? "bg-yellow-100 text-yellow-800"
                        : profile?.status === "INTERVIEW"
                        ? "bg-purple-100 text-purple-800"
                        : profile?.status === "OFFER_SENT"
                        ? "bg-green-100 text-green-800"
                        : profile?.status === "OFFER_ACCEPTED"
                        ? "bg-green-200 text-green-900"
                        : profile?.status === "HIRED"
                        ? "bg-emerald-100 text-emerald-800"
                        : profile?.status === "REJECTED"
                        ? "bg-red-100 text-red-800"
                        : profile?.status === "WITHDRAWN"
                        ? "bg-gray-100 text-gray-800"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {profile?.status || "UNKNOWN"}
                  </span>
                </div>
                {profile?.applicationDate && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      Application Date
                    </p>
                    <p className="mt-1 text-black">
                      {new Date(profile.applicationDate).toLocaleDateString()}
                    </p>
                  </div>
                )}
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
              <CardTitle>Application Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Position</p>
                <p className="mt-1 text-black">
                  {(() => {
                    // Handle both cases: populated object or string ID
                    if (
                      profile?.positionId &&
                      typeof profile.positionId === "object"
                    ) {
                      return (
                        (profile.positionId as any).title || "Not assigned"
                      );
                    }
                    return profile?.position?.title || "Not assigned";
                  })()}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Department</p>
                <p className="mt-1 text-black">
                  {(() => {
                    // Handle both cases: populated object or string ID
                    if (
                      profile?.departmentId &&
                      typeof profile.departmentId === "object"
                    ) {
                      return (
                        (profile.departmentId as any).name || "Not assigned"
                      );
                    }
                    return profile?.department?.name || "Not assigned";
                  })()}
                </p>
              </div>
              {profile?.resumeUrl && (
                <div>
                  <p className="text-sm font-medium text-gray-500">Resume</p>
                  <a
                    href={profile.resumeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 text-blue-600 hover:underline"
                  >
                    View Resume
                  </a>
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
            <Link href="/candidate-portal">
              <Button variant="ghost">← Back to Candidate Portal</Button>
            </Link>
            <Link href="/dashboard/recruitment/my-applications">
              <Button variant="outline">View My Applications</Button>
            </Link>
            <Link href="/dashboard/recruitment/jobs">
              <Button variant="outline">Browse Jobs</Button>
            </Link>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
