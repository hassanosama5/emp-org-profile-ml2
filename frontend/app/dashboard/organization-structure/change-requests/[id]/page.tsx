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
import { StructureChangeRequestResponseDto, StructureRequestStatus } from "@/types/organization-structure";

const shortId = (id?: string) => (id ? `${id.slice(0, 8)}…` : "—");
const getId = (value: any): string => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object") return value._id || value.id || (value.toString ? value.toString() : "");
  return "";
};

export default function ChangeRequestDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const { user } = useAuth();
  const {
    getChangeRequestById,
    cancelChangeRequest,
    getStatusDisplay,
    getRequestTypeDisplay,
    loading,
    error,
    clearError,
  } = useOrganizationStructure();

  const [request, setRequest] = useState<StructureChangeRequestResponseDto | null>(null);

  const roles = user?.roles || [];
  const hasRole = (role: string) =>
    roles.some((r) => String(r).toLowerCase() === role.toLowerCase());

  const canEdit = useMemo(
    () => hasRole(SystemRole.SYSTEM_ADMIN) || hasRole(SystemRole.HR_ADMIN) || hasRole(SystemRole.HR_MANAGER),
    [user?.roles]
  );

  const fetchReq = async () => {
    try {
      const data = await getChangeRequestById(params.id);
      setRequest(data);
    } catch (e) {
      console.error("Failed to fetch change request:", e);
    }
  };

  useEffect(() => {
    fetchReq();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const statusBadge = (status: StructureRequestStatus) => {
    const display = getStatusDisplay(status);
    const map: Record<string, string> = {
      gray: "bg-gray-100 text-gray-800",
      blue: "bg-blue-100 text-blue-800",
      green: "bg-green-100 text-green-800",
      red: "bg-red-100 text-red-800",
      yellow: "bg-yellow-100 text-yellow-800",
      purple: "bg-purple-100 text-purple-800",
    };
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${map[display.color] || map.gray}`}>
        {display.label}
      </span>
    );
  };

  const handleCancel = async () => {
    if (!request) return;
    if (!confirm("Cancel this change request?")) return;
    try {
      await cancelChangeRequest(request._id);
      await fetchReq();
    } catch (e) {
      console.error("Failed to cancel change request:", e);
    }
  };

  const requestTypeLabel = request
    ? getRequestTypeDisplay(request.requestType).label
    : "—";

  const requestedBy = request ? getId((request as any).requestedByEmployeeId) : "";
  const submittedBy = request ? getId((request as any).submittedByEmployeeId) : "";
  const targetDept = request ? getId((request as any).targetDepartmentId) : "";
  const targetPos = request ? getId((request as any).targetPositionId) : "";

  return (
    <ProtectedRoute
      allowedRoles={[SystemRole.SYSTEM_ADMIN, SystemRole.HR_ADMIN, SystemRole.HR_MANAGER]}
    >
      <div className="container mx-auto px-6 py-8">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Change Request</h1>
            <p className="text-gray-600 mt-1">
              ID: <span className="font-mono">{params.id}</span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={fetchReq} disabled={loading}>
              Refresh
            </Button>
            <Link
              href="/dashboard/organization-structure/change-requests"
              className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
            >
              ← Back to Change Requests
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

        {loading && !request ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : !request ? (
          <Card>
            <CardContent className="py-12 text-center text-gray-600">
              No change request found.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle className="text-xl">{requestTypeLabel}</CardTitle>
                    <CardDescription>
                      Request #: <span className="font-mono">{request.requestNumber}</span>
                    </CardDescription>
                  </div>
                  {statusBadge(request.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-gray-500">Requested by</div>
                    <div className="font-mono">{requestedBy || "—"}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Submitted by</div>
                    <div className="font-mono">{submittedBy || "—"}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Target department</div>
                    <div className="font-mono">{targetDept || "—"}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Target position</div>
                    <div className="font-mono">{targetPos || "—"}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Created</div>
                    <div>{request.createdAt ? new Date(request.createdAt as any).toLocaleString() : "—"}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Updated</div>
                    <div>{request.updatedAt ? new Date(request.updatedAt as any).toLocaleString() : "—"}</div>
                  </div>
                </div>

                {request.reason && (
                  <div>
                    <div className="text-sm font-medium text-gray-700 mb-1">
                      Reason
                    </div>
                    <div className="text-sm text-gray-700">{request.reason}</div>
                  </div>
                )}

                {request.details && (
                  <div>
                    <div className="text-sm font-medium text-gray-700 mb-1">
                      Details
                    </div>
                    <div className="text-sm text-gray-700 whitespace-pre-wrap">
                      {request.details}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Actions</CardTitle>
                <CardDescription>Workflow and related tools</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() =>
                    router.push(
                      `/dashboard/organization-structure/change-requests/approvals?changeRequestId=${request._id}`
                    )
                  }
                >
                  ✅ View Approvals
                </Button>

                {canEdit && (
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() =>
                      router.push(
                        `/dashboard/organization-structure/change-requests/${request._id}/edit`
                      )
                    }
                    disabled={
                      ![
                        StructureRequestStatus.DRAFT,
                        StructureRequestStatus.SUBMITTED,
                      ].includes(request.status)
                    }
                  >
                    ✏️ Edit Request
                  </Button>
                )}

                {canEdit && request.status === StructureRequestStatus.DRAFT && (
                  <Button
                    variant="primary"
                    className="w-full justify-start"
                    onClick={() =>
                      router.push(
                        `/dashboard/organization-structure/change-requests/${request._id}/submit`
                      )
                    }
                  >
                    📤 Submit for Approval
                  </Button>
                )}

                {canEdit &&
                  [
                    StructureRequestStatus.DRAFT,
                    StructureRequestStatus.SUBMITTED,
                    StructureRequestStatus.UNDER_REVIEW,
                  ].includes(request.status) && (
                    <Button
                      variant="danger"
                      className="w-full justify-start"
                      onClick={handleCancel}
                    >
                      🛑 Cancel Request
                    </Button>
                  )}

                <div className="pt-3 border-t border-gray-200">
                  <div className="text-xs text-gray-500 mb-2">
                    Quick links
                  </div>
                  {targetPos && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start"
                      onClick={() =>
                        router.push(
                          `/dashboard/organization-structure/positions/${targetPos}`
                        )
                      }
                    >
                      Open Target Position
                    </Button>
                  )}
                  {targetDept && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start mt-2"
                      onClick={() =>
                        router.push(
                          `/dashboard/organization-structure/departments/${targetDept}`
                        )
                      }
                    >
                      Open Target Department
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}


