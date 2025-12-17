"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { CreateLeaveRequestForm } from "../../../../../components/leaves/CreateLeaveRequestForm";
import { CreateLeaveRequestDto } from "../../../../../types/leaves";
import { leavesApi } from "../../../../../lib/api/leaves/leaves";
import { useRequireAuth } from "../../../../../lib/hooks/use-auth";
import { SystemRole } from "../../../../../types";
import { Card } from "../../../../../components/shared/ui/Card";
import { RoleGuard } from "../../../../../components/auth/role-guard";
import { useAuthStore } from "../../../../../lib/stores/auth.store";

export default function CreateLeaveRequestPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [successMessage, setSuccessMessage] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");

  // Require authentication - all roles except RECRUITER and JOB_CANDIDATE can create leave requests
  useRequireAuth();

  // All roles except RECRUITER and JOB_CANDIDATE can create leave requests
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
  ];

  const accessDeniedFallback = (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 rounded-md bg-red-50 p-4 border border-red-200">
        <p className="text-sm font-medium text-red-800">
          Access denied: You need one of these roles: {allowedRoles.join(", ")}. Your roles: {user?.roles?.join(", ") || "None"}
        </p>
      </div>
    </div>
  );

  const handleSuccess = () => {
    setSuccessMessage("Leave request created successfully!");
    setErrorMessage("");
    
    // Redirect to dashboard after 2 seconds
    setTimeout(() => {
      router.push("/dashboard/leaves/requests");
    }, 2000);
  };

  const handleError = (error: string) => {
    setErrorMessage(error || "An unknown error occurred");
    setSuccessMessage("");
  };

  const handleSubmit = async (data: CreateLeaveRequestDto) => {
    try {
      await leavesApi.createLeaveRequest(data);
      handleSuccess();
    } catch (error: any) {
      handleError(error.message || "Failed to create leave request");
      throw error; 
    }
  };

  return (
    <RoleGuard allowedRoles={allowedRoles} fallback={accessDeniedFallback}>
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Create Leave Request</h1>
          <p className="mt-2 text-sm text-gray-600">
            Submit a new leave request for approval. Please fill in all required fields.
          </p>
        </div>

      {successMessage && (
        <div className="mb-6 rounded-md bg-green-50 p-4 border border-green-200">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-green-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-green-800">
                {successMessage}
              </p>
              <p className="mt-1 text-sm text-green-700">
                Redirecting to dashboard...
              </p>
            </div>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="mb-6 rounded-md bg-red-50 p-4 border border-red-200">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-red-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-red-800">{errorMessage}</p>
            </div>
          </div>
        </div>
      )}

        <Card className="p-6">
          <CreateLeaveRequestForm
            onSubmit={handleSubmit}
            onSuccess={handleSuccess}
            onError={handleError}
          />
        </Card>
      </div>
    </RoleGuard>
  );
}

