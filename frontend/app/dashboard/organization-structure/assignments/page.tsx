"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { Button } from "@/components/shared/ui/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/shared/ui/Card";
import { Input } from "@/components/shared/ui/Input";
import { useAuth } from "@/lib/hooks/use-auth";
import { SystemRole } from "@/types";

export default function AssignmentsHomePage() {
  const router = useRouter();
  const { user } = useAuth();

  const [employeeId, setEmployeeId] = useState("");
  const [positionId, setPositionId] = useState("");
  const [activeOnly, setActiveOnly] = useState(true);

  const canCreateAssignments = useMemo(() => {
    const roles = user?.roles || [];
    const has = (role: string) =>
      roles.some((r) => String(r).toLowerCase() === role.toLowerCase());
    return has(SystemRole.SYSTEM_ADMIN) || has(SystemRole.HR_ADMIN);
  }, [user?.roles]);

  const goEmployee = () => {
    const trimmed = employeeId.trim();
    if (!trimmed) return;
    router.push(
      `/dashboard/organization-structure/assignments/employee/${trimmed}${
        activeOnly ? "?activeOnly=true" : ""
      }`
    );
  };

  const goPosition = () => {
    const trimmed = positionId.trim();
    if (!trimmed) return;
    router.push(
      `/dashboard/organization-structure/assignments/position/${trimmed}`
    );
  };

  return (
    <ProtectedRoute
      allowedRoles={[
        SystemRole.SYSTEM_ADMIN,
        SystemRole.HR_ADMIN,
        SystemRole.HR_MANAGER,
      ]}
    >
      <div className="container mx-auto px-6 py-8">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Position Assignments
            </h1>
            <p className="text-gray-600 mt-1">
              View assignments by employee/position and manage assignment
              lifecycle.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="primary"
              disabled={!canCreateAssignments}
              onClick={() =>
                router.push("/dashboard/organization-structure/assignments/new")
              }
            >
              + New Assignment
            </Button>
            <Link
              href="/dashboard/organization-structure"
              className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
            >
              ← Back
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle>Find by Employee</CardTitle>
              <CardDescription>
                Enter an Employee Profile MongoDB ID to view assignments.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                label="Employee Profile ID"
                placeholder="e.g. 64f1c2... (ObjectId)"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
              />
              <div className="flex items-center gap-2">
                <input
                  id="activeOnly"
                  type="checkbox"
                  checked={activeOnly}
                  onChange={(e) => setActiveOnly(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="activeOnly" className="text-sm text-gray-700">
                  Show active assignments only
                </label>
              </div>
              <div className="flex gap-3">
                <Button
                  variant="primary"
                  onClick={goEmployee}
                  disabled={!employeeId.trim()}
                >
                  View Employee Assignments
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setEmployeeId("")}
                  disabled={!employeeId}
                >
                  Clear
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle>Find by Position</CardTitle>
              <CardDescription>
                Enter a Position MongoDB ID to see assignments for that role.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                label="Position ID"
                placeholder="e.g. 64f1c2... (ObjectId)"
                value={positionId}
                onChange={(e) => setPositionId(e.target.value)}
              />
              <div className="flex gap-3">
                <Button
                  variant="primary"
                  onClick={goPosition}
                  disabled={!positionId.trim()}
                >
                  View Position Assignments
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setPositionId("")}
                  disabled={!positionId}
                >
                  Clear
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {!canCreateAssignments && (
          <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-md">
            <p className="text-amber-800 text-sm">
              You can view assignments, but only <b>HR Admin</b> and{" "}
              <b>System Admin</b> can create/update/end assignments.
            </p>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}


