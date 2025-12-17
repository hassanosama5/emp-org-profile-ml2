"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { SystemRole } from "@/types";
import { Button } from "@/components/shared/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/shared/ui/Card";
import { Textarea } from "@/components/shared/ui/Textarea";
import { useOrganizationStructure } from "@/lib/hooks/use-organization-structure";
import { useAuth } from "@/lib/hooks/use-auth";
import {
  DepartmentResponseDto,
  PositionResponseDto,
  StructureChangeRequestResponseDto,
  StructureRequestStatus,
} from "@/types/organization-structure";
import { StructureRequestType } from "@/types/enums";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/shared/ui/Select";

export default function EditChangeRequestPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const { user } = useAuth();
  const {
    getChangeRequestById,
    updateChangeRequest,
    getDepartments,
    getPositions,
    loading,
    error,
    clearError,
  } = useOrganizationStructure();

  const roles = user?.roles || [];
  const hasRole = (role: string) =>
    roles.some((r) => String(r).toLowerCase() === role.toLowerCase());

  const canEdit = useMemo(
    () => hasRole(SystemRole.SYSTEM_ADMIN) || hasRole(SystemRole.HR_ADMIN) || hasRole(SystemRole.HR_MANAGER),
    [user?.roles]
  );

  const [req, setReq] = useState<StructureChangeRequestResponseDto | null>(null);
  const [departments, setDepartments] = useState<any[]>([]);
  const [positions, setPositions] = useState<any[]>([]);

  const [form, setForm] = useState({
    requestType: "" as StructureRequestType,
    targetDepartmentId: "",
    targetPositionId: "",
    details: "",
    reason: "",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const getId = (value: any): string => {
    if (!value) return "";
    if (typeof value === "string") return value;
    if (typeof value === "object") return value._id || value.id || (value.toString ? value.toString() : "");
    return "";
  };

  const load = async () => {
    try {
      const [r, deps, pos] = await Promise.all([
        getChangeRequestById(params.id),
        getDepartments({ isActive: true }),
        getPositions({ isActive: true }),
      ]);

      setReq(r);
      setDepartments(deps as DepartmentResponseDto[]);
      setPositions(pos as PositionResponseDto[]);

      setForm({
        requestType: (r.requestType as any) || ("" as any),
        targetDepartmentId: getId((r as any).targetDepartmentId) || "",
        targetPositionId: getId((r as any).targetPositionId) || "",
        details: (r.details as any) || "",
        reason: (r.reason as any) || "",
      });
    } catch (e) {
      console.error("Failed to load change request for edit:", e);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const validate = () => {
    const next: Record<string, string> = {};
    if (!form.requestType) next.requestType = "Request type is required";
    if (!form.reason.trim()) next.reason = "Reason is required";

    if (form.requestType === StructureRequestType.UPDATE_DEPARTMENT) {
      if (!form.targetDepartmentId) next.targetDepartmentId = "Target department is required";
    }
    if (
      form.requestType === StructureRequestType.UPDATE_POSITION ||
      form.requestType === StructureRequestType.CLOSE_POSITION
    ) {
      if (!form.targetPositionId) next.targetPositionId = "Target position is required";
    }

    setFormErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;
    if (!validate()) return;
    try {
      await updateChangeRequest(params.id, {
        requestType: form.requestType,
        targetDepartmentId: form.targetDepartmentId || undefined,
        targetPositionId: form.targetPositionId || undefined,
        details: form.details.trim() || undefined,
        reason: form.reason.trim(),
      });
      router.push(`/dashboard/organization-structure/change-requests/${params.id}`);
    } catch (e2) {
      console.error("Failed to update change request:", e2);
    }
  };

  const isEditable =
    req?.status === StructureRequestStatus.DRAFT ||
    req?.status === StructureRequestStatus.SUBMITTED;

  return (
    <ProtectedRoute allowedRoles={[SystemRole.SYSTEM_ADMIN, SystemRole.HR_ADMIN, SystemRole.HR_MANAGER]}>
      <div className="container mx-auto px-6 py-8 max-w-3xl">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Edit Change Request</h1>
            <p className="text-gray-600 mt-1">
              ID: <span className="font-mono">{params.id}</span>
            </p>
          </div>
          <Link
            href={`/dashboard/organization-structure/change-requests/${params.id}`}
            className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
          >
            ← Back
          </Link>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-start justify-between gap-4">
              <p className="text-red-700">{error}</p>
              <Button variant="ghost" onClick={clearError}>
                Clear
              </Button>
            </div>
          </div>
        )}

        {!canEdit && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-md">
            <p className="text-amber-800 text-sm">You do not have permission to edit change requests.</p>
          </div>
        )}

        {req && !isEditable && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-md">
            <p className="text-amber-800 text-sm">
              This request is <b>{req.status}</b> and cannot be edited.
            </p>
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Request Details</CardTitle>
            <CardDescription>Update the request fields and save.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-6">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Request Type *
                </label>
                <Select
                  name="requestType"
                  value={form.requestType}
                  onValueChange={(value: StructureRequestType) =>
                    setForm((p) => ({ ...p, requestType: value }))
                  }
                  disabled={loading || !canEdit || !isEditable}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a request type" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(StructureRequestType).map((t) => (
                      <SelectItem key={t} value={t}>
                        {t.replace(/_/g, " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formErrors.requestType && (
                  <p className="text-sm text-red-600">{formErrors.requestType}</p>
                )}
              </div>

              {form.requestType === StructureRequestType.UPDATE_DEPARTMENT && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Target Department *
                  </label>
                  <Select
                    name="targetDepartmentId"
                    value={form.targetDepartmentId}
                    onValueChange={(value: string) =>
                      setForm((p) => ({ ...p, targetDepartmentId: value }))
                    }
                    disabled={loading || !canEdit || !isEditable}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a department" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((d: any) => (
                        <SelectItem key={d._id} value={d._id}>
                          {d.name} ({d.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formErrors.targetDepartmentId && (
                    <p className="text-sm text-red-600">{formErrors.targetDepartmentId}</p>
                  )}
                </div>
              )}

              {(form.requestType === StructureRequestType.UPDATE_POSITION ||
                form.requestType === StructureRequestType.CLOSE_POSITION) && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Target Position *
                  </label>
                  <Select
                    name="targetPositionId"
                    value={form.targetPositionId}
                    onValueChange={(value: string) =>
                      setForm((p) => ({ ...p, targetPositionId: value }))
                    }
                    disabled={loading || !canEdit || !isEditable}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a position" />
                    </SelectTrigger>
                    <SelectContent>
                      {positions.map((p: any) => (
                        <SelectItem key={p._id} value={p._id}>
                          {p.title} ({p.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formErrors.targetPositionId && (
                    <p className="text-sm text-red-600">{formErrors.targetPositionId}</p>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Details</label>
                <Textarea
                  value={form.details}
                  onChange={(e) => setForm((p) => ({ ...p, details: e.target.value }))}
                  rows={4}
                  disabled={loading || !canEdit || !isEditable}
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Reason *
                </label>
                <Textarea
                  value={form.reason}
                  onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))}
                  rows={3}
                  disabled={loading || !canEdit || !isEditable}
                />
                {formErrors.reason && (
                  <p className="text-sm text-red-600">{formErrors.reason}</p>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    router.push(`/dashboard/organization-structure/change-requests/${params.id}`)
                  }
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={loading}
                  disabled={!canEdit || !isEditable}
                >
                  Save Changes
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  );
}


