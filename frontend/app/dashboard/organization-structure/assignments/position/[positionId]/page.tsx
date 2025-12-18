"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { SystemRole } from "@/types";
import { Button } from "@/components/shared/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/shared/ui/Card";
import { useOrganizationStructure } from "@/lib/hooks/use-organization-structure";
import { useAuth } from "@/lib/hooks/use-auth";
import { PositionAssignmentResponseDto } from "@/types/organization-structure";

const shortId = (id?: string) => (id ? `${id.slice(0, 8)}…` : "—");

const getId = (value: any): string => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object") return value._id || value.id || (value.toString ? value.toString() : "");
  return "";
};

const getEmployeeLabel = (employeeProfileId: any) => {
  if (!employeeProfileId) return "—";
  if (typeof employeeProfileId === "string") return `Employee ${shortId(employeeProfileId)}`;
  const fullName = employeeProfileId.fullName;
  const employeeNumber = employeeProfileId.employeeNumber;
  if (fullName && employeeNumber) return `${fullName} (${employeeNumber})`;
  if (fullName) return String(fullName);
  const id = getId(employeeProfileId);
  return id ? `Employee ${shortId(id)}` : "—";
};

export default function PositionAssignmentsPage({
  params,
}: {
  params: Promise<{ positionId: string }>;
}) {
  const router = useRouter();
  const { user } = useAuth();

  const {
    getPositionAssignments,
    updatePositionAssignment,
    endPositionAssignment,
    isAssignmentActive,
    loading,
    error,
    clearError,
  } = useOrganizationStructure();

  const [assignments, setAssignments] = useState<PositionAssignmentResponseDto[]>(
    []
  );
  const [positionId, setPositionId] = useState<string>("");

  const canManageAssignments = useMemo(() => {
    const roles = user?.roles || [];
    const has = (role: string) =>
      roles.some((r) => String(r).toLowerCase() === role.toLowerCase());
    return has(SystemRole.SYSTEM_ADMIN) || has(SystemRole.HR_ADMIN);
  }, [user?.roles]);

  // Unwrap params Promise
  useEffect(() => {
    params.then((resolved) => {
      setPositionId(resolved.positionId);
    }).catch((error) => {
      console.error("Failed to resolve params:", error);
    });
  }, [params]);

  const fetchAssignments = async () => {
    if (!positionId) return;
    try {
      console.log("Fetching assignments for position:", positionId);
      const data = await getPositionAssignments(positionId);
      console.log("Received assignments:", data);
      setAssignments(data || []);
    } catch (e: any) {
      console.error("Failed to fetch position assignments:", e);
      setAssignments([]);
    }
  };

  useEffect(() => {
    if (positionId) {
      fetchAssignments();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [positionId]);

  const handleEnd = async (assignmentId: string) => {
    if (!canManageAssignments) return;
    const defaultDate = new Date().toISOString().slice(0, 10);
    const input = prompt("End date (YYYY-MM-DD):", defaultDate);
    if (!input) return;
    const end = new Date(input);
    if (Number.isNaN(end.getTime())) {
      alert("Invalid date format. Please use YYYY-MM-DD.");
      return;
    }
    try {
      await endPositionAssignment(assignmentId, end.toISOString());
      await fetchAssignments();
    } catch (e) {
      console.error("Failed to end assignment:", e);
    }
  };

  const handleEditNotes = async (assignmentId: string, current?: any) => {
    if (!canManageAssignments) return;
    const reason = prompt("Reason (optional):", current?.reason || "") ?? null;
    if (reason === null) return;
    const notes = prompt("Notes (optional):", current?.notes || "") ?? null;
    if (notes === null) return;
    try {
      await updatePositionAssignment(assignmentId, {
        reason: reason.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      await fetchAssignments();
    } catch (e) {
      console.error("Failed to update assignment:", e);
    }
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
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Position Assignments
            </h1>
            <p className="text-gray-600 mt-1">
              Position ID: <span className="font-mono">{positionId || "Loading..."}</span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => fetchAssignments()}
              disabled={loading}
            >
              Refresh
            </Button>
            <Link
              href="/dashboard/organization-structure/assignments"
              className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
            >
              ← Back
            </Link>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-start justify-between gap-4">
              <p className="text-red-700">{error}</p>
              <Button variant="ghost" onClick={clearError}>
                Clear
              </Button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : assignments.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center">
              <p className="text-gray-600 mb-2">No assignments found.</p>
              <p className="text-sm text-gray-500">
                This position has no employee assignments.
              </p>
              {positionId && (
                <>
                  <p className="text-xs text-gray-400 mt-2 font-mono">
                    Position ID: {positionId}
                  </p>
                  {canManageAssignments && (
                    <div className="mt-4">
                      <Link
                        href={`/dashboard/organization-structure/assignments/new?positionId=${positionId}`}
                      >
                        <Button variant="primary">
                          Create Assignment for This Position
                        </Button>
                      </Link>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Assignments ({assignments.length})</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left border-b">
                    <th className="py-3 pr-4">Employee</th>
                    <th className="py-3 pr-4">Start</th>
                    <th className="py-3 pr-4">End</th>
                    <th className="py-3 pr-4">Status</th>
                    <th className="py-3 pr-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {assignments.map((a: any) => {
                    const active = isAssignmentActive(a);
                    const empId = getId(a.employeeProfileId);
                    return (
                      <tr key={a._id} className="border-b last:border-b-0">
                        <td className="py-3 pr-4">
                          {getEmployeeLabel(a.employeeProfileId)}
                        </td>
                        <td className="py-3 pr-4">
                          {a.startDate
                            ? new Date(a.startDate).toLocaleDateString()
                            : "—"}
                        </td>
                        <td className="py-3 pr-4">
                          {a.endDate
                            ? new Date(a.endDate).toLocaleDateString()
                            : "—"}
                        </td>
                        <td className="py-3 pr-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              active
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {active ? "ACTIVE" : "ENDED"}
                          </span>
                        </td>
                        <td className="py-3 pr-4">
                          <div className="flex flex-wrap gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                router.push(
                                  `/dashboard/organization-structure/assignments/employee/${empId}?activeOnly=true`
                                )
                              }
                              disabled={!empId}
                            >
                              View Employee
                            </Button>
                            {canManageAssignments && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditNotes(a._id, a)}
                                >
                                  Edit Notes
                                </Button>
                                <Button
                                  variant="danger"
                                  size="sm"
                                  onClick={() => handleEnd(a._id)}
                                  disabled={!active}
                                >
                                  End
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}
      </div>
    </ProtectedRoute>
  );
}


