"use client";

import { ManagerAppraisalFormPage } from "@/components/Performance/ManagerAppraisalFormPage";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { SystemRole } from "@/types";
import { useParams } from "next/navigation";

export default function ManagerAppraisalRoute() {
  const params = useParams();
  const assignmentId = params.assignmentId as string;

  return (
    <ProtectedRoute
      allowedRoles={[
        SystemRole.DEPARTMENT_HEAD,
        SystemRole.HR_MANAGER,
        SystemRole.HR_EMPLOYEE,
        SystemRole.HR_ADMIN,
      ]}
    >
      <ManagerAppraisalFormPage assignmentId={assignmentId} />
    </ProtectedRoute>
  );
}
