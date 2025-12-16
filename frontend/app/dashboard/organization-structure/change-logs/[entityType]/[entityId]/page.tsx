"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { SystemRole } from "@/types";
import { Button } from "@/components/shared/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/shared/ui/Card";
import { useOrganizationStructure } from "@/lib/hooks/use-organization-structure";
import { StructureChangeLogResponseDto } from "@/types/organization-structure";

const shortId = (id?: string) => (id ? `${id.slice(0, 8)}…` : "—");

export default function EntityChangeLogsPage({
  params,
}: {
  params: { entityType: string; entityId: string };
}) {
  const router = useRouter();
  const { getEntityChangeLogs, getActionDisplay, loading, error, clearError } =
    useOrganizationStructure();

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

  const fetch = async () => {
    try {
      const data = await getEntityChangeLogs(params.entityType, params.entityId);
      setLogs(data);
    } catch (e) {
      console.error("Failed to fetch entity change logs:", e);
    }
  };

  useEffect(() => {
    fetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.entityType, params.entityId]);

  return (
    <ProtectedRoute allowedRoles={[SystemRole.SYSTEM_ADMIN, SystemRole.HR_ADMIN]}>
      <div className="container mx-auto px-6 py-8">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Change Log Timeline
            </h1>
            <p className="text-gray-600 mt-1">
              <span className="font-medium">{params.entityType}</span> —{" "}
              <span className="font-mono">{params.entityId}</span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={fetch} disabled={loading}>
              Refresh
            </Button>
            <Link
              href="/dashboard/organization-structure/change-logs"
              className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
            >
              ← Back to Logs
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

        <Card>
          <CardHeader>
            <CardTitle>Events</CardTitle>
            <CardDescription>
              {logs.length} event{logs.length !== 1 ? "s" : ""} for this entity.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-10">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
              </div>
            ) : logs.length === 0 ? (
              <div className="py-10 text-center text-gray-600">
                No change logs found.
              </div>
            ) : (
              <ol className="space-y-4">
                {logs.map((l: any) => (
                  <li
                    key={l._id}
                    className="p-4 border border-gray-200 rounded-md hover:shadow-sm transition"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          {badge(l.action)}
                          <span className="text-xs text-gray-500 font-mono">
                            {shortId(l._id)}
                          </span>
                        </div>
                        <div className="text-sm text-gray-700">
                          {l.summary || <span className="text-gray-500">—</span>}
                        </div>
                        <div className="text-xs text-gray-500">
                          {l.createdAt
                            ? new Date(l.createdAt).toLocaleString()
                            : "—"}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          router.push(
                            `/dashboard/organization-structure/change-logs?entityType=${encodeURIComponent(
                              params.entityType
                            )}&entityId=${encodeURIComponent(params.entityId)}`
                          )
                        }
                      >
                        Open in table
                      </Button>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  );
}


