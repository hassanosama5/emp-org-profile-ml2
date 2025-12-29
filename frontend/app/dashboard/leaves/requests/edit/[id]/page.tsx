"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { EditLeaveRequestForm } from "@/components/leaves/EditLeaveRequestForm";
import { leavesApi } from "@/lib/api/leaves/leaves";
import { LeaveRequest } from "@/types/leaves";
import { useRequireAuth } from "@/lib/hooks/use-auth";
import { Card } from "@/components/shared/ui/Card";
import { RoleGuard } from "@/components/auth/role-guard";
import { SystemRole } from "@/types";
import { useAuthStore } from "@/lib/stores/auth.store";

export default function EditLeaveRequestPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuthStore();
  const [leaveRequest, setLeaveRequest] = useState<LeaveRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  useRequireAuth();

  // Allowed roles for editing leave requests - same as create
  const allowedRoles = [
    SystemRole.DEPARTMENT_EMPLOYEE,
    SystemRole.DEPARTMENT_HEAD,
    SystemRole.HR_MANAGER,
    SystemRole.HR_EMPLOYEE,
    SystemRole.PAYROLL_SPECIALIST,
    SystemRole.PAYROLL_MANAGER,
    SystemRole.SYSTEM_ADMIN,
    SystemRole.LEGAL_POLICY_ADMIN,
    SystemRole.FINANCE_STAFF,
    SystemRole.HR_ADMIN,
    SystemRole.RECRUITER,
  ];

  const accessDeniedFallback = (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="rounded-md bg-red-50 p-4 border border-red-200">
        <p className="text-sm font-medium text-red-800">
          Access denied: You need one of these roles: {allowedRoles.join(", ")}. Your roles: {user?.roles?.join(", ") || "None"}
        </p>
        <button
          onClick={() => router.push("/dashboard/leaves/requests")}
          className="mt-4 text-sm text-red-600 hover:text-red-800 underline"
        >
          Go back to leave requests
        </button>
      </div>
    </div>
  );

  useEffect(() => {
    const fetchLeaveRequest = async () => {
      try {
        setLoading(true);
        const id = params.id as string;
        const request = await leavesApi.getLeaveRequestById(id);
        setLeaveRequest(request);
      } catch (error: any) {
        setError(error.message || "Failed to load leave request");
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchLeaveRequest();
    }
  }, [params.id]);

  const handleSuccess = () => {
    router.push("/dashboard/leaves/requests");
  };

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
  };

  if (loading) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <div className="flex justify-center items-center min-h-[400px]">
          <p className="text-gray-600">Loading leave request...</p>
        </div>
      </div>
    );
  }

  if (error && !leaveRequest) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <div className="rounded-md bg-red-50 p-4 border border-red-200">
          <p className="text-sm text-red-800">{error}</p>
          <button
            onClick={() => router.push("/dashboard/leaves/requests")}
            className="mt-4 text-sm text-red-600 hover:text-red-800 underline"
          >
            Go back to leave requests
          </button>
        </div>
      </div>
    );
  }

  if (!leaveRequest) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <div className="rounded-md bg-yellow-50 p-4 border border-yellow-200">
          <p className="text-sm text-yellow-800">Leave request not found</p>
        </div>
      </div>
    );
  }

  // Check if request can be edited (only PENDING status)
  if (leaveRequest.status?.toUpperCase() !== "PENDING") {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <div className="rounded-md bg-yellow-50 p-4 border border-yellow-200">
          <p className="text-sm text-yellow-800">
            This leave request cannot be edited because it is {leaveRequest.status.toLowerCase()}.
            Only pending requests can be modified.
          </p>
          <button
            onClick={() => router.push("/dashboard/leaves/requests")}
            className="mt-4 text-sm text-yellow-600 hover:text-yellow-800 underline"
          >
            Go back to leave requests
          </button>
        </div>
      </div>
    );
  }

  return (
    <RoleGuard allowedRoles={allowedRoles} fallback={accessDeniedFallback}>
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Edit Leave Request</h1>
          <p className="mt-2 text-sm text-gray-600">
            Update your leave request details. Only pending requests can be modified.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-md bg-red-50 p-4 border border-red-200">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <Card className="p-6">
          <EditLeaveRequestForm
            leaveRequest={leaveRequest}
            onSuccess={handleSuccess}
            onError={handleError}
            onCancel={() => router.push("/dashboard/leaves/requests")}
          />
        </Card>
      </div>
    </RoleGuard>
  );
}

