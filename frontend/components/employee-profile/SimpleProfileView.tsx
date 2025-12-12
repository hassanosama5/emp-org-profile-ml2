// components/employee-profile/SimpleProfileView.tsx
"use client";

import { useState, useEffect } from "react";
import { employeeProfileApi } from "../../lib/api/employee-profile/employee-profile";
import type { EmployeeProfile } from "@/types";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/shared/ui/Card";

interface SimpleProfileViewProps {
  profile?: EmployeeProfile; // Optional: if profile is passed as prop
  employeeId?: string; // Optional: fetch by ID (for HR/admin views)
}

export default function SimpleProfileView({
  profile: initialProfile,
  employeeId,
}: SimpleProfileViewProps) {
  const [profile, setProfile] = useState<EmployeeProfile | null>(
    initialProfile || null
  );
  const [loading, setLoading] = useState(!initialProfile);

  useEffect(() => {
    if (!initialProfile) {
      loadProfile();
    }
  }, [employeeId]);

  const loadProfile = async () => {
    try {
      let response;
      if (employeeId) {
        response = await employeeProfileApi.getEmployeeById(employeeId);
      } else {
        response = await employeeProfileApi.getMyProfile();
      }
      const data = response && typeof response === "object" && "data" in response ? (response as any).data : response;
      setProfile(data as EmployeeProfile);
    } catch (error) {
      console.error("Failed to load profile:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!profile) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-gray-500">No profile data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">
          {profile.firstName} {profile.lastName}
          <span className="ml-2 text-sm font-normal text-gray-500">
            ({profile.employeeNumber})
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Position</p>
              <p className="mt-1">{profile.primaryPosition?.title || "N/A"}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Department</p>
              <p className="mt-1">{profile.primaryDepartment?.name || "N/A"}</p>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-gray-500">Email</p>
            <p className="mt-1">
              {profile.workEmail || profile.personalEmail || "N/A"}
            </p>
          </div>

          <div>
            <p className="text-sm font-medium text-gray-500">Status</p>
            <span
              className={`mt-1 inline-block px-2 py-1 text-xs rounded-full ${
                profile.status === "ACTIVE"
                  ? "bg-green-100 text-green-800"
                  : profile.status === "ON_LEAVE"
                  ? "bg-blue-100 text-blue-800"
                  : profile.status === "TERMINATED"
                  ? "bg-red-100 text-red-800"
                  : "bg-gray-100 text-gray-800"
              }`}
            >
              {profile.status}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
