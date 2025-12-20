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

  // All roles except JOB_CANDIDATE can create leave requests
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
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl shadow-lg">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">Create Leave Request</h1>
              <p className="mt-2 text-sm text-gray-600">
                Submit a new leave request for approval. Please fill in all required fields.
              </p>
            </div>
          </div>
        </div>

      {successMessage && (
        <div className="mb-6 rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 p-4 border-2 border-green-300">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-gradient-to-br from-green-400 to-emerald-500 rounded-lg">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-green-800">
                {successMessage}
              </p>
              <p className="mt-1 text-xs text-green-700">
                Redirecting to dashboard...
              </p>
            </div>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="mb-6 rounded-xl bg-gradient-to-r from-red-50 to-rose-50 p-4 border-2 border-red-300">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-gradient-to-br from-red-400 to-rose-500 rounded-lg">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-red-800">{errorMessage}</p>
          </div>
        </div>
      )}

        <Card className="p-6 border-2 border-teal-200 bg-gradient-to-br from-teal-50 to-cyan-50">
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

