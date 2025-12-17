"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { SystemRole } from "@/types";

export default function DepartmentsHierarchyRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard/organization-structure/hierarchy");
  }, [router]);

  return (
    <ProtectedRoute
      allowedRoles={[
        SystemRole.SYSTEM_ADMIN,
        SystemRole.HR_ADMIN,
        SystemRole.HR_MANAGER,
        SystemRole.DEPARTMENT_HEAD,
        SystemRole.DEPARTMENT_EMPLOYEE,
      ]}
    >
      <div className="container mx-auto px-6 py-8">
        <div className="flex flex-col items-center justify-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Redirecting to Organization Chart…</p>
        </div>
      </div>
    </ProtectedRoute>
  );
}


