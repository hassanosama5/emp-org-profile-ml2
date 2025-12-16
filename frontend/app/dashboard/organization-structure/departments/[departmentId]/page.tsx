"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { SystemRole } from "@/types";
import { Button } from "@/components/shared/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/shared/ui/Card";
import { useOrganizationStructure } from "@/lib/hooks/use-organization-structure";
import { useAuth } from "@/lib/hooks/use-auth";
import { DepartmentResponseDto, PositionResponseDto } from "@/types/organization-structure";

const getId = (value: any): string => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object") return value._id || value.id || (value.toString ? value.toString() : "");
  return "";
};

export default function DepartmentDetailPage({
  params,
}: {
  params: { departmentId: string };
}) {
  const router = useRouter();
  const { user } = useAuth();
  const {
    getDepartmentById,
    getPositions,
    deactivateDepartment,
    loading,
    error,
    clearError,
  } = useOrganizationStructure();

  const [department, setDepartment] = useState<DepartmentResponseDto | null>(null);
  const [positions, setPositions] = useState<PositionResponseDto[]>([]);

  const canEdit = useMemo(() => {
    const roles = user?.roles || [];
    const has = (role: string) =>
      roles.some((r) => String(r).toLowerCase() === role.toLowerCase());
    return has(SystemRole.SYSTEM_ADMIN);
  }, [user?.roles]);

  const fetchAll = async () => {
    try {
      const dept = await getDepartmentById(params.departmentId);
      setDepartment(dept);
      const pos = await getPositions({ departmentId: params.departmentId });
      setPositions(pos);
    } catch (e) {
      console.error("Failed to load department detail:", e);
    }
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.departmentId]);

  const handleDeactivate = async () => {
    if (!department) return;
    if (!canEdit) return;
    if (!confirm(`Deactivate "${department.name}"?`)) return;
    try {
      await deactivateDepartment(department._id);
      await fetchAll();
    } catch (e) {
      console.error("Failed to deactivate department:", e);
    }
  };

  return (
    <ProtectedRoute allowedRoles={[SystemRole.SYSTEM_ADMIN, SystemRole.HR_ADMIN, SystemRole.HR_MANAGER]}>
      <div className="container mx-auto px-6 py-8">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Department Details</h1>
            <p className="text-gray-600 mt-1">
              ID: <span className="font-mono">{params.departmentId}</span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={fetchAll} disabled={loading}>
              Refresh
            </Button>
            <Link
              href="/dashboard/organization-structure/departments"
              className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
            >
              ← Back to Departments
            </Link>
          </div>
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

        {loading && !department ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>{department?.name || "—"}</CardTitle>
                <CardDescription>
                  <span className="font-mono">{department?.code || "—"}</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <span
                    className={`px-3 py-1 text-xs font-medium rounded-full ${
                      department?.isActive
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {department?.isActive ? "Active" : "Inactive"}
                  </span>
                  {department?.headPositionId && (
                    <span className="text-sm text-gray-600">
                      Head Position:{" "}
                      <span className="font-mono">
                        {getId(department.headPositionId)}
                      </span>
                    </span>
                  )}
                </div>

                {department?.description && (
                  <div>
                    <div className="text-sm font-medium text-gray-700 mb-1">
                      Description
                    </div>
                    <div className="text-sm text-gray-700">{department.description}</div>
                  </div>
                )}

                <div className="pt-4 border-t border-gray-200 flex justify-end gap-3">
                  {canEdit && department?.isActive && (
                    <>
                      <Button
                        variant="outline"
                        onClick={() =>
                          router.push(
                            `/dashboard/organization-structure/departments/${params.departmentId}/edit`
                          )
                        }
                      >
                        Edit
                      </Button>
                      <Button variant="danger" onClick={handleDeactivate}>
                        Deactivate
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Positions</CardTitle>
                <CardDescription>
                  {positions.length} position{positions.length !== 1 ? "s" : ""} in this department
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {positions.length === 0 ? (
                  <div className="text-sm text-gray-600">No positions found.</div>
                ) : (
                  <ul className="space-y-2">
                    {positions.slice(0, 8).map((p) => (
                      <li key={p._id} className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">
                            {p.title}
                          </div>
                          <div className="text-xs text-gray-500 font-mono">{p.code}</div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            router.push(
                              `/dashboard/organization-structure/positions/${p._id}`
                            )
                          }
                        >
                          Open
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}

                {positions.length > 8 && (
                  <Link
                    href="/dashboard/organization-structure/positions"
                    className="block text-sm text-blue-600 hover:text-blue-800 hover:underline pt-2"
                  >
                    View all positions →
                  </Link>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}


