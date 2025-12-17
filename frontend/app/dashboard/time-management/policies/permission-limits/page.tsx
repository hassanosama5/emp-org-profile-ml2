"use client";

import { useAuth, useRequireAuth } from "@/lib/hooks/use-auth";
import { SystemRole } from "@/types";
import { Toast, useToast } from "@/components/leaves/Toast";
import PermissionRulesForm from "@/components/time-management/PermissionRulesForm";

export default function PermissionLimitsPage() {
  const { user, loading: authLoading } = useAuth();
  useRequireAuth(SystemRole.HR_ADMIN);
  const { toast, showToast, hideToast } = useToast();

  const canAccess = user?.roles?.includes(SystemRole.HR_ADMIN);

  if (authLoading) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="text-center py-12">
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (!canAccess) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-500">
            You don&apos;t have permission to access this page. Only HR Admin can manage permission validation rules.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8">
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
      />

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Permission Validation Rules</h1>
        <p className="text-gray-600 mt-1">
          Define limits for permission durations and ensure only approved permissions affect payroll (BR-TM-15, BR-TM-18)
        </p>
      </div>

      <PermissionRulesForm 
        onValidationComplete={(result) => {
          console.log("Validation complete:", result);
        }}
      />
    </div>
  );
}
