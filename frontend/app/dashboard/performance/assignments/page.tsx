"use client";

import { ManagerAssignmentsPage } from "@/components/Performance/ManagerAssignmentsPage";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { SystemRole } from "@/types";

export default function ManagerAssignmentsRoute() {
  return (
    <ProtectedRoute
      allowedRoles={[
        SystemRole.DEPARTMENT_HEAD,
        SystemRole.HR_MANAGER,
        SystemRole.HR_EMPLOYEE,
        SystemRole.HR_ADMIN,
      ]}
    >
      <ManagerAssignmentsPage />
    </ProtectedRoute>
  );
}
