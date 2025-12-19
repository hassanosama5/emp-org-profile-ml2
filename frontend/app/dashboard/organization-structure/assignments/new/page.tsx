"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { SystemRole } from "@/types";
import { Button } from "@/components/shared/ui/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/shared/ui/Card";
import { Input } from "@/components/shared/ui/Input";
import { Textarea } from "@/components/shared/ui/Textarea";
import { useOrganizationStructure } from "@/lib/hooks/use-organization-structure";
import { employeeProfileApi } from "@/lib/api/employee-profile/profile";
import {
  DepartmentResponseDto,
  PositionResponseDto,
} from "@/types/organization-structure";
import type { EmployeeProfile } from "@/types";

function NewAssignmentForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    createPositionAssignment,
    getDepartments,
    getPositions,
    loading,
    error,
    clearError,
  } = useOrganizationStructure();

  const [departments, setDepartments] = useState<DepartmentResponseDto[]>([]);
  const [positions, setPositions] = useState<PositionResponseDto[]>([]);
  const [currentEmployee, setCurrentEmployee] =
    useState<EmployeeProfile | null>(null);
  const [loadingEmployee, setLoadingEmployee] = useState(false);

  // Get employeeProfileId and positionId from URL query parameters if provided
  const employeeIdFromUrl = searchParams?.get("employeeProfileId") || "";
  const positionIdFromUrl = searchParams?.get("positionId") || "";

  // Set default start date to today
  const today = new Date().toISOString().split("T")[0];

  const [form, setForm] = useState({
    employeeProfileId: employeeIdFromUrl,
    departmentId: "",
    positionId: positionIdFromUrl,
    startDate: today,
    endDate: "",
    reason: "",
    notes: "",
    changeRequestId: "",
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      try {
        const [deps, pos] = await Promise.all([
          getDepartments({ isActive: true }),
          getPositions({ isActive: true }),
        ]);
        console.log("Loaded departments:", deps?.length || 0);
        console.log("Loaded positions:", pos?.length || 0);
        setDepartments(deps || []);
        setPositions(pos || []);
      } catch (e) {
        console.error("Failed to load departments/positions:", e);
        setDepartments([]);
        setPositions([]);
      }
    })();
  }, [getDepartments, getPositions]);

  // Load current employee profile when employeeProfileId is provided
  useEffect(() => {
    const loadEmployee = async () => {
      if (!form.employeeProfileId.trim()) {
        setCurrentEmployee(null);
        return;
      }

      try {
        setLoadingEmployee(true);
        const employee = await employeeProfileApi.getEmployeeById(
          form.employeeProfileId.trim()
        );
        setCurrentEmployee(employee as EmployeeProfile);

        // Auto-fill department and position from current employee profile if not already set
        if (employee && typeof employee === "object" && "primaryDepartmentId" in employee) {
          const emp = employee as any;
          const currentDeptId =
            (emp.primaryDepartmentId as any)?._id?.toString() ||
            (emp.primaryDepartmentId as any)?.toString() ||
            emp.primaryDepartmentId;
          const currentPosId =
            (emp.primaryPositionId as any)?._id?.toString() ||
            (emp.primaryPositionId as any)?.toString() ||
            emp.primaryPositionId;

          if (currentDeptId && !form.departmentId) {
            setForm((prev) => ({ ...prev, departmentId: currentDeptId }));
          }
          if (currentPosId && !form.positionId) {
            setForm((prev) => ({ ...prev, positionId: currentPosId }));
          }
        }
      } catch (err) {
        console.error("Failed to load employee profile:", err);
        setCurrentEmployee(null);
      } finally {
        setLoadingEmployee(false);
      }
    };

    loadEmployee();
  }, [form.employeeProfileId]);

  // Update employeeProfileId and positionId if URL parameters change
  useEffect(() => {
    if (employeeIdFromUrl && employeeIdFromUrl !== form.employeeProfileId) {
      setForm((prev) => ({ ...prev, employeeProfileId: employeeIdFromUrl }));
    }
    if (positionIdFromUrl && positionIdFromUrl !== form.positionId) {
      setForm((prev) => {
        const updated = { ...prev, positionId: positionIdFromUrl };
        // If position is pre-filled, try to auto-select its department
        if (positionIdFromUrl && positions.length > 0) {
          const position = positions.find((p: any) => {
            const pid =
              typeof p._id === "string"
                ? p._id
                : (p._id as any)?.toString() || "";
            return pid === positionIdFromUrl;
          });
          if (position && position.departmentId && !updated.departmentId) {
            const deptId =
              typeof position.departmentId === "string"
                ? position.departmentId
                : (position.departmentId as any)?._id ||
                  (position.departmentId as any)?.id ||
                  "";
            if (deptId) {
              updated.departmentId = deptId;
            }
          }
        }
        return updated;
      });
    }
  }, [
    employeeIdFromUrl,
    positionIdFromUrl,
    positions,
    form.employeeProfileId,
    form.positionId,
  ]);

  const validate = () => {
    const next: Record<string, string> = {};
    if (!form.employeeProfileId.trim())
      next.employeeProfileId = "Employee profile id is required";
    if (!form.departmentId) next.departmentId = "Department is required";
    if (!form.positionId) next.positionId = "Position is required";
    if (!form.startDate) next.startDate = "Start date is required";
    setFormErrors(next);
    return Object.keys(next).length === 0;
  };

  const toIso = (dateStr: string) => {
    if (!dateStr || !dateStr.trim()) return undefined;

    // If it's already in YYYY-MM-DD format (from HTML date input), convert to ISO
    // HTML date inputs return YYYY-MM-DD, which is valid for @IsDateString()
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
      // Return as-is - @IsDateString() accepts YYYY-MM-DD format
      return dateStr;
    }

    // Try to parse as Date and convert to ISO
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) {
      console.error("Invalid date:", dateStr);
      return dateStr; // Return as-is, let backend validate
    }
    // Return ISO string in format: YYYY-MM-DDTHH:mm:ss.sssZ
    return d.toISOString();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const payload = {
      employeeProfileId: form.employeeProfileId.trim(),
      departmentId: form.departmentId,
      positionId: form.positionId,
      startDate: toIso(form.startDate) as string | Date,
      endDate: form.endDate ? (toIso(form.endDate) as string | Date) : undefined,
      reason: form.reason.trim() || undefined,
      notes: form.notes.trim() || undefined,
      changeRequestId: form.changeRequestId.trim() || undefined,
    };

    console.log("Submitting assignment with payload:", payload);

    try {
      await createPositionAssignment(payload);

      router.push(
        `/dashboard/organization-structure/assignments/employee/${form.employeeProfileId.trim()}?activeOnly=true`
      );
    } catch (err: any) {
      console.error("Failed to create position assignment:", err);

      // Show user-friendly error message
      let errorMessage = "Failed to create assignment. Please try again.";

      if (err?.message) {
        errorMessage = err.message;
      } else if (err?.validationErrors && Array.isArray(err.validationErrors)) {
        errorMessage = `Validation errors: ${err.validationErrors.join(", ")}`;
      } else if (err?.responseData?.message) {
        errorMessage = err.responseData.message;
      }

      // Check if it's an overlapping assignment error
      if (errorMessage.includes("already has an active assignment")) {
        const confirmView = confirm(
          `${errorMessage}\n\nWould you like to view the existing assignments for this employee?`
        );
        if (confirmView) {
          router.push(
            `/dashboard/organization-structure/assignments/employee/${form.employeeProfileId.trim()}?activeOnly=true`
          );
        }
      } else {
        // Set form error or show alert
        alert(errorMessage);
      }

      // You could also set a state variable to display the error in the UI
      // setFormErrors({ submit: errorMessage });
    }
  };

  const onChange = (name: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: "" }));
    }
    if (error) clearError();
  };

  const selectedDeptPositions = useMemo(() => {
    // If no positions loaded, return empty array
    if (!positions || positions.length === 0) {
      return [];
    }

    // If no department selected, show all positions
    if (!form.departmentId) {
      return positions;
    }

    // Filter positions by department
    const filtered = positions.filter((p: any) => {
      if (!p.departmentId) {
        // If position has no department, don't include it when filtering
        return false;
      }

      const dept = p.departmentId;
      let deptId: string = "";

      if (typeof dept === "string") {
        deptId = dept;
      } else if (dept && typeof dept === "object") {
        deptId = dept._id || dept.id || (dept.toString ? dept.toString() : "");
      }

      // Compare with the selected department ID
      const selectedDeptId =
        typeof form.departmentId === "string"
          ? form.departmentId
          : (form.departmentId as any)?._id ||
            (form.departmentId as any)?.id ||
            "";

      return deptId === selectedDeptId;
    });

    // If filtering resulted in no positions, show all positions as fallback
    // (This handles cases where positions might not have departmentId set)
    if (filtered.length === 0 && positions.length > 0) {
      console.warn(
        "No positions found for selected department, showing all positions"
      );
      return positions;
    }

    return filtered;
  }, [form.departmentId, positions]);

  return (
    <ProtectedRoute
      allowedRoles={[SystemRole.SYSTEM_ADMIN, SystemRole.HR_ADMIN]}
    >
      <div className="container mx-auto px-6 py-8 max-w-3xl">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white-900">
              Create Position Assignment
            </h1>
            <p className="text-gray-600 mt-1">
              Assign an employee to a position within a department.
            </p>
          </div>
          <Link
            href="/dashboard/organization-structure/assignments"
            className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
          >
            ← Back
          </Link>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Current Employee Info Card */}
        {currentEmployee && (
          <Card className="mb-6 bg-blue-50 border-blue-200">
            <CardHeader>
              <CardTitle className="text-lg">
                Current Employee Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
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
              <p className="mt-3 text-xs text-blue-700">
                ℹ️ Creating a new active assignment will update the employee's
                current position and department.
              </p>
            </CardContent>
          </Card>
        )}

        {loadingEmployee && form.employeeProfileId.trim() && (
          <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-md">
            <p className="text-gray-600 text-sm">
              Loading employee information...
            </p>
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Assignment Details</CardTitle>
            <CardDescription>
              Fields marked with * are required. Creating an active assignment
              (no end date) will update the employee's current position.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="relative">
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Employee * (Search by name or employee number)
                </label>
                <Input
                  placeholder="Type employee name or number (e.g., EMP-2025-0001)"
                  value={form.employeeProfileId}
                  onChange={(e) => {
                    const value = e.target.value;
                    onChange("employeeProfileId", value);
                    // If it looks like an employee number, try to fetch
                    if (value.match(/^EMP-/i)) {
                      employeeProfileApi
                        .getEmployeeByNumber(value)
                        .then((emp) => {
                          if (emp) {
                            setForm((prev) => ({
                              ...prev,
                              employeeProfileId:
                                (emp as any)._id || (emp as any).id || value,
                            }));
                            setCurrentEmployee(emp as EmployeeProfile);
                          }
                        })
                        .catch(() => {
                          // Not found, continue with manual entry
                        });
                    }
                  }}
                  error={formErrors.employeeProfileId}
                />
                {employeeIdFromUrl &&
                  form.employeeProfileId === employeeIdFromUrl && (
                    <p className="mt-1 text-xs text-green-600">
                      ✓ Employee ID pre-filled from URL
                    </p>
                  )}
                <p className="mt-1 text-xs text-gray-500">
                  You can enter the employee's MongoDB ID directly, or search by
                  employee number (e.g., EMP-2025-0001)
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Department *
                  </label>
                  <select
                    className={`w-full rounded-md border px-3 py-2 text-sm text-gray-900 bg-white ${
                      formErrors.departmentId
                        ? "border-red-300"
                        : "border-gray-300"
                    }`}
                    value={form.departmentId}
                    onChange={(e) => onChange("departmentId", e.target.value)}
                    disabled={loading}
                  >
                    <option value="">Select department</option>
                    {departments.map((d) => (
                      <option key={d._id} value={d._id}>
                        {d.name} ({d.code})
                      </option>
                    ))}
                  </select>
                  {formErrors.departmentId && (
                    <p className="mt-1 text-sm text-red-600">
                      {formErrors.departmentId}
                    </p>
                  )}
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Position *
                  </label>
                  <select
                    className={`w-full rounded-md border px-3 py-2 text-sm text-gray-900 bg-white ${
                      formErrors.positionId
                        ? "border-red-300"
                        : "border-gray-300"
                    }`}
                    value={form.positionId}
                    onChange={(e) => onChange("positionId", e.target.value)}
                    disabled={loading}
                  >
                    <option value="">
                      {loading
                        ? "Loading positions..."
                        : selectedDeptPositions.length === 0
                        ? form.departmentId
                          ? "No positions in this department"
                          : "Select department first"
                        : "Select position"}
                    </option>
                    {selectedDeptPositions.map((p) => {
                      const positionId =
                        typeof p._id === "string"
                          ? p._id
                          : (p._id as any)?.toString() || "";
                      return (
                        <option key={positionId} value={positionId}>
                          {p.title} ({p.code || "N/A"})
                        </option>
                      );
                    })}
                  </select>
                  {positionIdFromUrl &&
                    form.positionId === positionIdFromUrl && (
                      <p className="mt-1 text-xs text-green-600">
                        ✓ Position pre-filled from URL
                      </p>
                    )}
                  {formErrors.positionId && (
                    <p className="mt-1 text-sm text-red-600">
                      {formErrors.positionId}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Start Date *"
                  type="date"
                  value={form.startDate}
                  onChange={(e) => onChange("startDate", e.target.value)}
                  error={formErrors.startDate}
                />
                <Input
                  label="End Date (optional)"
                  type="date"
                  value={form.endDate}
                  onChange={(e) => onChange("endDate", e.target.value)}
                />
              </div>

              <Input
                label="Change Request ID (optional)"
                placeholder="Link to a structure change request (ObjectId)"
                value={form.changeRequestId}
                onChange={(e) => onChange("changeRequestId", e.target.value)}
              />

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Reason (optional)
                </label>
                <Textarea
                  value={form.reason}
                  onChange={(e) => onChange("reason", e.target.value)}
                  rows={3}
                  placeholder="Why is this assignment being made?"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Notes (optional)
                </label>
                <Textarea
                  value={form.notes}
                  onChange={(e) => onChange("notes", e.target.value)}
                  rows={4}
                  placeholder="Any internal notes"
                  disabled={loading}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    router.push("/dashboard/organization-structure/assignments")
                  }
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" isLoading={loading}>
                  Create Assignment
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  );
}

export default function NewAssignmentPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto px-6 py-8 max-w-3xl">
          <div className="flex items-center justify-center min-h-[400px]">
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      }
    >
      <NewAssignmentForm />
    </Suspense>
  );
}
