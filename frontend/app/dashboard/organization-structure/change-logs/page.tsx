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
import { useOrganizationStructure } from "@/lib/hooks/use-organization-structure";
import { StructureChangeLogResponseDto } from "@/types/organization-structure";

const shortId = (id?: string) => (id ? `${id.slice(0, 8)}…` : "—");

const getId = (value: any): string => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object")
    return value._id || value.id || (value.toString ? value.toString() : "");
  return "";
};

export default function ChangeLogsPage() {
  const router = useRouter();
  const {
    getChangeLogs,
    getActionDisplay,
    loading,
    error,
    clearError,
  } = useOrganizationStructure();

  const [entityType, setEntityType] = useState("");
  const [entityId, setEntityId] = useState("");
  const [logs, setLogs] = useState<StructureChangeLogResponseDto[]>([]);

  const badge = (action: string) => {
    const d = getActionDisplay(action);
    const colorMap: Record<string, string> = {
      green: "bg-green-100 text-green-800",
      blue: "bg-blue-100 text-blue-800",
      red: "bg-red-100 text-red-800",
      purple: "bg-purple-100 text-purple-800",
      gray: "bg-gray-100 text-gray-800",
      yellow: "bg-yellow-100 text-yellow-800",
    };
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
          colorMap[d.color] || colorMap.gray
        }`}
      >
        <span>{d.icon}</span>
        <span>{d.label}</span>
      </span>
    );
  };

  const fetchLogs = async (next?: { entityType?: string; entityId?: string }) => {
    try {
      const data = await getChangeLogs({
        entityType: next?.entityType ?? (entityType.trim() || undefined),
        entityId: next?.entityId ?? (entityId.trim() || undefined),
      });
      console.log("Fetched change logs:", data?.length || 0, "logs");
      setLogs(data || []);
    } catch (e) {
      console.error("Failed to fetch change logs:", e);
      setLogs([]);
    }
  };

  useEffect(() => {
    // Initial load (all logs)
    fetchLogs({ entityType: undefined, entityId: undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canFilterEntity = useMemo(() => entityType.trim() && entityId.trim(), [
    entityType,
    entityId,
  ]);

  return (
    <ProtectedRoute allowedRoles={[SystemRole.SYSTEM_ADMIN, SystemRole.HR_ADMIN]}>
      <div className="container mx-auto px-6 py-8">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Change Logs</h1>
            <p className="text-gray-600 mt-1">
              Audit trail of all organization structure changes.
            </p>
          </div>
          <Link
            href="/dashboard/organization-structure"
            className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
          >
            ← Back to Organization Structure
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Filter</CardTitle>
              <CardDescription>
                Narrow logs by entity type and entity id.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                label="Entity Type"
                placeholder="Department | Position | PositionAssignment | ..."
                value={entityType}
                onChange={(e) => setEntityType(e.target.value)}
              />
              <Input
                label="Entity ID"
                placeholder="MongoDB ObjectId"
                value={entityId}
                onChange={(e) => setEntityId(e.target.value)}
              />
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="primary"
                  onClick={() => fetchLogs()}
                  disabled={loading}
                >
                  Apply
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setEntityType("");
                    setEntityId("");
                    fetchLogs({ entityType: undefined, entityId: undefined });
                  }}
                  disabled={loading}
                >
                  Reset
                </Button>
                <Button
                  variant="outline"
                  onClick={() => fetchLogs()}
                  disabled={loading}
                >
                  Refresh
                </Button>
              </div>

              <div className="pt-2 border-t border-gray-200">
                <Button
                  variant="ghost"
                  onClick={() =>
                    router.push(
                      `/dashboard/organization-structure/change-logs/${encodeURIComponent(
                        entityType.trim()
                      )}/${encodeURIComponent(entityId.trim())}`
                    )
                  }
                  disabled={!canFilterEntity}
                >
                  View entity timeline →
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Logs</CardTitle>
              <CardDescription>
                {entityType.trim() || entityId.trim()
                  ? `Filtered results`
                  : "Latest changes across all entities"}
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {loading ? (
                <div className="flex justify-center py-10">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                </div>
              ) : logs.length === 0 ? (
                <div className="py-10 text-center">
                  <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <svg
                      className="w-8 h-8 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No logs found
                  </h3>
                  <p className="text-sm text-gray-500 mb-4">
                    {entityType.trim() || entityId.trim()
                      ? "No change logs match your filter criteria."
                      : "No change logs have been created yet."}
                  </p>
                  <div className="text-xs text-gray-400 space-y-1">
                    <p>Change logs are automatically created when:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Departments are created, updated, or deactivated</li>
                      <li>Positions are created, updated, or deactivated</li>
                      <li>Position assignments are created or ended</li>
                      <li>Change requests are processed</li>
                    </ul>
                  </div>
                </div>
              ) : (
                <table className="min-w-full text-sm border-collapse">
                  <thead>
                    <tr className="text-left border-b-2 border-gray-300 bg-gray-50">
                      <th className="py-3 px-4 font-semibold text-gray-700">Timestamp</th>
                      <th className="py-3 px-4 font-semibold text-gray-700">Action</th>
                      <th className="py-3 px-4 font-semibold text-gray-700">Entity Type</th>
                      <th className="py-3 px-4 font-semibold text-gray-700">Entity ID</th>
                      <th className="py-3 px-4 font-semibold text-gray-700">Changed By</th>
                      <th className="py-3 px-4 font-semibold text-gray-700">Summary</th>
                      <th className="py-3 px-4 font-semibold text-gray-700">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((l: any) => {
                      const byId = getId(l.performedByEmployeeId);
                      const byLabel =
                        typeof l.performedByEmployeeId === "object" &&
                        l.performedByEmployeeId
                          ? l.performedByEmployeeId.fullName ||
                            l.performedByEmployeeId.employeeNumber ||
                            shortId(byId)
                          : byId
                          ? shortId(byId)
                          : "—";

                      return (
                        <tr
                          key={l._id}
                          className="border-b last:border-b-0 hover:bg-gray-50 transition-colors"
                        >
                          <td className="py-3 px-4">
                            <div className="flex flex-col">
                              <span className="text-sm font-medium text-gray-900">
                                {l.createdAt
                                  ? new Date(l.createdAt).toLocaleDateString()
                                  : "—"}
                              </span>
                              <span className="text-xs text-gray-500">
                                {l.createdAt
                                  ? new Date(l.createdAt).toLocaleTimeString()
                                  : ""}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4">{badge(l.action)}</td>
                          <td className="py-3 px-4">
                            <span className="font-medium text-gray-900">
                              {l.entityType || "—"}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-xs text-gray-500 font-mono">
                              {shortId(l.entityId)}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex flex-col">
                              <span className="text-sm text-gray-900">
                                {byLabel}
                              </span>
                              {byId && (
                                <span className="text-xs text-gray-500 font-mono">
                                  {shortId(byId)}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            {l.summary ? (
                              <span className="text-sm text-gray-700 line-clamp-2">
                                {l.summary}
                              </span>
                            ) : (
                              <span className="text-gray-400 text-sm">—</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                router.push(
                                  `/dashboard/organization-structure/change-logs/${encodeURIComponent(
                                    l.entityType
                                  )}/${encodeURIComponent(l.entityId)}`
                                )
                              }
                              disabled={!l.entityType || !l.entityId}
                              className="text-xs"
                            >
                              View Timeline
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  );
}


