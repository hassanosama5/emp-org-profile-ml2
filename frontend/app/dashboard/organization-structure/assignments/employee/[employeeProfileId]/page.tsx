"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { SystemRole } from "@/types";
import { Button } from "@/components/shared/ui/Button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/shared/ui/Card";
import { useOrganizationStructure } from "@/lib/hooks/use-organization-structure";
import { useAuth } from "@/lib/hooks/use-auth";
import { employeeProfileApi } from "@/lib/api/employee-profile/profile";
import { PositionAssignmentResponseDto } from "@/types/organization-structure";
import type { EmployeeProfile } from "@/types";

const shortId = (id?: string) => (id ? `${id.slice(0, 8)}…` : "—");

const getId = (value: any): string => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object")
    return value._id || value.id || (value.toString ? value.toString() : "");
  return "";
};

const getPositionLabel = (positionId: any) => {
  if (!positionId) return "—";
  if (typeof positionId === "string") return `Position ${shortId(positionId)}`;
  const title = positionId.title || positionId.name;
  const code = positionId.code;
  if (title && code) return `${title} (${code})`;
  if (title) return String(title);
  const id = getId(positionId);
  return id ? `Position ${shortId(id)}` : "—";
};

const getDepartmentLabel = (departmentId: any) => {
  if (!departmentId) return "—";
  if (typeof departmentId === "string") return `Dept ${shortId(departmentId)}`;
  const name = departmentId.name;
  const code = departmentId.code;
  if (name && code) return `${name} (${code})`;
  if (name) return String(name);
  const id = getId(departmentId);
  return id ? `Dept ${shortId(id)}` : "—";
};

export default function EmployeeAssignmentsPage({
  params,
}: {
  params: Promise<{ employeeProfileId: string }>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const {
    getEmployeeAssignments,
    updatePositionAssignment,
    endPositionAssignment,
    isAssignmentActive,
    loading,
    error,
    clearError,
  } = useOrganizationStructure();

  const [assignments, setAssignments] = useState<
    PositionAssignmentResponseDto[]
  >([]);
  const [allAssignments, setAllAssignments] = useState<
    PositionAssignmentResponseDto[]
  >([]);
  const [employeeProfileId, setEmployeeProfileId] = useState<string>("");
  const [currentEmployee, setCurrentEmployee] =
    useState<EmployeeProfile | null>(null);
  const [loadingEmployee, setLoadingEmployee] = useState(false);

  const activeOnly = searchParams.get("activeOnly") === "true";

  const canManageAssignments = useMemo(() => {
    const roles = user?.roles || [];
    const has = (role: string) =>
      roles.some((r) => String(r).toLowerCase() === role.toLowerCase());
    return has(SystemRole.SYSTEM_ADMIN) || has(SystemRole.HR_ADMIN);
  }, [user?.roles]);

  // Unwrap params Promise
  useEffect(() => {
    params
      .then((resolved) => {
        setEmployeeProfileId(resolved.employeeProfileId);
      })
      .catch((error) => {
        console.error("Failed to resolve params:", error);
      });
  }, [params]);

  const fetchAssignments = async () => {
    if (!employeeProfileId) return;
    try {
      console.log("Fetching assignments for employee:", employeeProfileId);
      // Fetch filtered assignments (based on activeOnly)
      const data = await getEmployeeAssignments(employeeProfileId, {
        activeOnly,
      });
      console.log("Received assignments:", data);
      setAssignments(data || []);

      // Also fetch all assignments to check if there are any active ones
      if (activeOnly) {
        const allData = await getEmployeeAssignments(employeeProfileId, {
          activeOnly: false,
        });
        setAllAssignments(allData || []);
      } else {
        // If we're already showing all, use the same data
        setAllAssignments(data || []);
      }
    } catch (e: any) {
      console.error("Failed to fetch employee assignments:", e);
      setAssignments([]);
      setAllAssignments([]);
    }
  };

  useEffect(() => {
    if (employeeProfileId) {
      fetchAssignments();
      // Load employee profile to check current position
      const loadEmployee = async () => {
        try {
          setLoadingEmployee(true);
          const employee = await employeeProfileApi.getEmployeeById(
            employeeProfileId
          );
          setCurrentEmployee(employee as EmployeeProfile);
        } catch (err) {
          console.error("Failed to load employee:", err);
          setCurrentEmployee(null);
        } finally {
          setLoadingEmployee(false);
        }
      };
      loadEmployee();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeProfileId, activeOnly]);

  const toggleActiveOnly = (next: boolean) => {
    const qs = next ? "?activeOnly=true" : "";
    router.push(`${pathname}${qs}`);
  };

  const handleEnd = async (assignmentId: string) => {
    if (!canManageAssignments) return;

    // Check if this is the current assignment by comparing with employee's current position
    const assignment = assignments.find(
      (a: any) => a._id === assignmentId || a.id === assignmentId
    );
    if (!assignment) return;

    const isCurrent =
      assignment &&
      !assignment.endDate &&
      new Date(assignment.startDate) <= new Date();

    if (isCurrent) {
      const confirmEnd = confirm(
        "⚠️ WARNING: This is the employee's CURRENT active assignment. " +
          "Ending it will clear their current position and department from their profile. " +
          "If they have another active assignment, it will become the new current one. " +
          "\n\nDo you want to continue?"
      );
      if (!confirmEnd) return;
    }

    const defaultDate = new Date().toISOString().slice(0, 10);
    const input = prompt("End date (YYYY-MM-DD):", defaultDate);
    if (!input) return;

    // Parse the date - handle both YYYY-MM-DD and full ISO strings
    let endDate: Date;
    if (input.match(/^\d{4}-\d{2}-\d{2}$/)) {
      // YYYY-MM-DD format - create date at midnight UTC
      endDate = new Date(input + "T00:00:00.000Z");
    } else {
      endDate = new Date(input);
    }

    if (Number.isNaN(endDate.getTime())) {
      alert("Invalid date format. Please use YYYY-MM-DD.");
      return;
    }

    try {
      console.log("Ending assignment with date:", endDate.toISOString());
      await endPositionAssignment(assignmentId, endDate.toISOString());
      await fetchAssignments();
      // Also reload employee profile to see updated current position
      if (currentEmployee) {
        const employee = await employeeProfileApi.getEmployeeById(
          employeeProfileId
        );
        setCurrentEmployee(employee as EmployeeProfile);
      }
    } catch (e: any) {
      console.error("Failed to end assignment:", e);
      const errorMsg =
        e?.message || "Failed to end assignment. Please try again.";
      alert(errorMsg);
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
            <h1 className="text-2xl font-bold text-white-900">
              Employee Assignments
            </h1>
            <p className="text-white-600 mt-1">
              Employee Profile ID:{" "}
              <span className="font-mono">
                {employeeProfileId || "Loading..."}
              </span>
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

        <div className="mb-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <input
              id="activeOnly"
              type="checkbox"
              checked={activeOnly}
              onChange={(e) => toggleActiveOnly(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="activeOnly" className="text-sm text-white-700">
              Active only
            </label>
            <span className="text-xs text-white-500">
              (
              {activeOnly
                ? "Showing active assignments"
                : "Showing all assignments"}
              )
            </span>
          </div>
          {error && (
            <Button variant="ghost" onClick={clearError}>
              Clear error
            </Button>
          )}
        </div>

        {/* Warning if trying to create assignment but one exists */}
        {assignments.length === 0 && !loading && employeeProfileId && (
          <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-yellow-800 text-sm font-medium">
              ⚠️ No assignments found
            </p>
            <p className="text-yellow-700 text-xs mt-1">
              {activeOnly
                ? "No active assignments found. Uncheck 'Active only' to see all assignments, including historical ones."
                : "This employee has no position assignments in the system."}
            </p>
            {activeOnly && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => toggleActiveOnly(false)}
                className="mt-2"
              >
                Show All Assignments
              </Button>
            )}
          </div>
        )}

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Current Employee Info */}
        {currentEmployee && (
          <Card className="mb-6 bg-blue-50 border-blue-200">
            <CardHeader>
              <CardTitle className="text-lg">
                Current Employee Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="font-medium text-gray-700">Employee</p>
                  <p className="text-gray-900">
                    {currentEmployee.fullName} ({currentEmployee.employeeNumber}
                    )
                  </p>
                </div>
                {currentEmployee.primaryPositionId && (
                  <div>
                    <p className="font-medium text-gray-700">
                      Current Position
                    </p>
                    <p className="text-gray-900">
                      {typeof currentEmployee.primaryPositionId === "object"
                        ? (currentEmployee.primaryPositionId as any).title ||
                          "Unknown"
                        : "Loading..."}
                    </p>
                  </div>
                )}
                {currentEmployee.primaryDepartmentId && (
                  <div>
                    <p className="font-medium text-gray-700">
                      Current Department
                    </p>
                    <p className="text-gray-900">
                      {typeof currentEmployee.primaryDepartmentId === "object"
                        ? (currentEmployee.primaryDepartmentId as any).name ||
                          "Unknown"
                        : "Loading..."}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
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
                {activeOnly
                  ? "No active assignments for this employee."
                  : "This employee has no position assignments."}
              </p>
              {employeeProfileId && (
                <>
                  <p className="text-xs text-gray-400 mt-2 font-mono">
                    Employee ID: {employeeProfileId}
                  </p>
                  {canManageAssignments && (
                    <div className="mt-4">
                      <Link
                        href={`/dashboard/organization-structure/assignments/new?employeeProfileId=${employeeProfileId}`}
                      >
                        <Button variant="primary">
                          Create Assignment for This Employee
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
              {/* Show Create Assignment button if no active assignments exist */}
              {(() => {
                const hasActiveAssignment = allAssignments.some((a: any) =>
                  isAssignmentActive(a)
                );
                return !hasActiveAssignment &&
                  canManageAssignments &&
                  employeeProfileId ? (
                  <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-blue-800 text-sm font-medium">
                          ℹ️ No active assignments
                        </p>
                        <p className="text-blue-700 text-xs mt-1">
                          All assignments have ended. You can create a new
                          assignment for this employee.
                        </p>
                      </div>
                      <Link
                        href={`/dashboard/organization-structure/assignments/new?employeeProfileId=${employeeProfileId}`}
                      >
                        <Button variant="primary" size="sm">
                          Create Assignment
                        </Button>
                      </Link>
                    </div>
                  </div>
                ) : null;
              })()}
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left border-b">
                    <th className="py-3 pr-4">Position</th>
                    <th className="py-3 pr-4">Department</th>
                    <th className="py-3 pr-4">Start</th>
                    <th className="py-3 pr-4">End</th>
                    <th className="py-3 pr-4">Status</th>
                    <th className="py-3 pr-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {assignments.map((a: any) => {
                    const active = isAssignmentActive(a);
                    // Check if this is the current assignment by comparing with employee's current position
                    const assignmentPositionId =
                      typeof a.positionId === "string"
                        ? a.positionId
                        : (a.positionId as any)?._id?.toString() ||
                          (a.positionId as any)?.toString() ||
                          "";
                    const employeeCurrentPositionId =
                      currentEmployee?.primaryPositionId
                        ? typeof currentEmployee.primaryPositionId === "string"
                          ? currentEmployee.primaryPositionId
                          : (
                              currentEmployee.primaryPositionId as any
                            )?._id?.toString() ||
                            (
                              currentEmployee.primaryPositionId as any
                            )?.toString() ||
                            ""
                        : "";
                    const isCurrent =
                      active &&
                      assignmentPositionId &&
                      employeeCurrentPositionId &&
                      assignmentPositionId === employeeCurrentPositionId;
                    return (
                      <tr
                        key={a._id}
                        className={`border-b last:border-b-0 ${
                          isCurrent ? "bg-blue-50" : ""
                        }`}
                      >
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-2">
                            {getPositionLabel(a.positionId)}
                            {isCurrent && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                CURRENT
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 pr-4">
                          {getDepartmentLabel(a.departmentId)}
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
                                  `/dashboard/organization-structure/positions/${getId(
                                    a.positionId
                                  )}`
                                )
                              }
                              disabled={!getId(a.positionId)}
                            >
                              View Position
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
