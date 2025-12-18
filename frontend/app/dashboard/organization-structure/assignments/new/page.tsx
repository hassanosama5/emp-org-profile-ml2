"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import {
  DepartmentResponseDto,
  PositionResponseDto,
} from "@/types/organization-structure";

export default function NewAssignmentPage() {
  const router = useRouter();
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

  const [form, setForm] = useState({
    employeeProfileId: "",
    departmentId: "",
    positionId: "",
    startDate: "",
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
        setDepartments(deps);
        setPositions(pos);
      } catch (e) {
        console.error("Failed to load departments/positions:", e);
      }
    })();
  }, [getDepartments, getPositions]);

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
    const d = new Date(dateStr);
    return Number.isNaN(d.getTime()) ? dateStr : d.toISOString();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      await createPositionAssignment({
        employeeProfileId: form.employeeProfileId.trim(),
        departmentId: form.departmentId,
        positionId: form.positionId,
        startDate: toIso(form.startDate),
        endDate: form.endDate ? toIso(form.endDate) : undefined,
        reason: form.reason.trim() || undefined,
        notes: form.notes.trim() || undefined,
        changeRequestId: form.changeRequestId.trim() || undefined,
      });

      router.push(
        `/dashboard/organization-structure/assignments/employee/${form.employeeProfileId.trim()}?activeOnly=true`
      );
    } catch (err) {
      console.error("Failed to create position assignment:", err);
    }
  };

  const onChange = (
    name: keyof typeof form,
    value: string
  ) => {
    setForm((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: "" }));
    }
    if (error) clearError();
  };

  const selectedDeptPositions = useMemo(() => {
    if (!form.departmentId) return positions;
    return positions.filter((p: any) => {
      const dept = (p as any).departmentId;
      const deptId =
        typeof dept === "string"
          ? dept
          : dept?._id || dept?.id || (dept?.toString ? dept.toString() : "");
      return deptId === form.departmentId;
    });
  }, [form.departmentId, positions]);

  return (
    <ProtectedRoute
      allowedRoles={[SystemRole.SYSTEM_ADMIN, SystemRole.HR_ADMIN]}
    >
      <div className="container mx-auto px-6 py-8 max-w-3xl">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
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

        <Card>
          <CardHeader>
            <CardTitle>Assignment Details</CardTitle>
            <CardDescription>
              Fields marked with * are required.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <Input
                label="Employee Profile ID *"
                placeholder="MongoDB ObjectId of the employee profile"
                value={form.employeeProfileId}
                onChange={(e) => onChange("employeeProfileId", e.target.value)}
                error={formErrors.employeeProfileId}
              />

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
                    <option value="">Select position</option>
                    {selectedDeptPositions.map((p) => (
                      <option key={p._id} value={p._id}>
                        {p.title} ({p.code})
                      </option>
                    ))}
                  </select>
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


