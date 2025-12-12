"use client";

import { useEffect, useState } from "react";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { useRequireAuth } from "@/lib/hooks/use-auth";
import { SystemRole } from "@/types";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/shared/ui/Card";
import { Toast, useToast } from "@/components/leaves/Toast";
import { employeeProfileApi } from "@/lib/api/employee-profile/profile";
import { TeamMember } from "@/types";

export default function TeamPage() {
  useRequireAuth([
    SystemRole.DEPARTMENT_HEAD,
    SystemRole.HR_MANAGER,
    SystemRole.HR_EMPLOYEE,
    SystemRole.HR_ADMIN,
    SystemRole.SYSTEM_ADMIN,
  ]);
  const { toast, showToast, hideToast } = useToast();
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const members = await employeeProfileApi.getMyTeam();
        setTeam(members);
      } catch (error: any) {
        showToast(error.message || "Failed to load team", "error");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <ProtectedRoute requiredUserType="employee">
      <div className="container mx-auto px-6 py-8">
        <Toast
          message={toast.message}
          type={toast.type}
          isVisible={toast.isVisible}
          onClose={hideToast}
        />
        <h1 className="text-3xl font-bold text-gray-900">My Team</h1>
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Team Members</CardTitle>
            <CardDescription>Your department teammates</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-gray-500">Loading...</p>
            ) : team.length === 0 ? (
              <p className="text-gray-600">No team members found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 px-3">Employee #</th>
                      <th className="text-left py-2 px-3">Name</th>
                      <th className="text-left py-2 px-3">Position</th>
                      <th className="text-left py-2 px-3">Department</th>
                    </tr>
                  </thead>
                  <tbody>
                    {team.map((m) => (
                      <tr key={m.id} className="border-b border-gray-100">
                        <td className="py-2 px-3 font-mono">
                          {m.employeeNumber}
                        </td>
                        <td className="py-2 px-3">{m.fullName}</td>
                        <td className="py-2 px-3">{m.positionTitle || "—"}</td>
                        <td className="py-2 px-3">{m.departmentName || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  );
}
