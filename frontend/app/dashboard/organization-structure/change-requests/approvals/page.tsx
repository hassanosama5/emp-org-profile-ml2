"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { SystemRole } from "@/types";
import { Button } from "@/components/shared/ui/Button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/shared/ui/Card";
import { Input } from "@/components/shared/ui/Input";
import { Textarea } from "@/components/shared/ui/Textarea";
import { useOrganizationStructure } from "@/lib/hooks/use-organization-structure";
import { useAuth } from "@/lib/hooks/use-auth";
import { ApprovalDecision, StructureApprovalResponseDto } from "@/types/organization-structure";

const shortId = (id?: string) => (id ? `${id.slice(0, 8)}…` : "—");

export default function ApprovalsDashboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const {
    getRequestApprovals,
    createApproval,
    getDecisionDisplay,
    loading,
    error,
    clearError,
  } = useOrganizationStructure();

  const [changeRequestId, setChangeRequestId] = useState("");
  const [approverEmployeeId, setApproverEmployeeId] = useState("");
  const [comments, setComments] = useState("");
  const [approvals, setApprovals] = useState<StructureApprovalResponseDto[]>([]);

  const roles = user?.roles || [];
  const hasRole = (role: string) =>
    roles.some((r) => String(r).toLowerCase() === role.toLowerCase());

  const canCreateApproval = useMemo(() => hasRole(SystemRole.SYSTEM_ADMIN), [user?.roles]);
  const canDecide = useMemo(
    () => hasRole(SystemRole.SYSTEM_ADMIN) || hasRole(SystemRole.HR_ADMIN),
    [user?.roles]
  );

  const fetchApprovals = async (id: string) => {
    if (!id.trim()) return;
    try {
      const data = await getRequestApprovals(id.trim());
      setApprovals(data);
    } catch (e) {
      console.error("Failed to fetch approvals:", e);
    }
  };

  useEffect(() => {
    // Allow deep linking via ?changeRequestId=...
    const url = new URL(window.location.href);
    const id = url.searchParams.get("changeRequestId");
    if (id) {
      setChangeRequestId(id);
      fetchApprovals(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreateApproval = async () => {
    if (!canCreateApproval) return;
    if (!changeRequestId.trim() || !approverEmployeeId.trim()) return;
    try {
      await createApproval({
        changeRequestId: changeRequestId.trim(),
        approverEmployeeId: approverEmployeeId.trim(),
        comments: comments.trim() || undefined,
      });
      setApproverEmployeeId("");
      setComments("");
      await fetchApprovals(changeRequestId);
    } catch (e) {
      console.error("Failed to create approval:", e);
    }
  };

  const badge = (decision: ApprovalDecision) => {
    const d = getDecisionDisplay(decision);
    const colorMap: Record<string, string> = {
      yellow: "bg-yellow-100 text-yellow-800",
      green: "bg-green-100 text-green-800",
      red: "bg-red-100 text-red-800",
      gray: "bg-gray-100 text-gray-800",
      blue: "bg-blue-100 text-blue-800",
      purple: "bg-purple-100 text-purple-800",
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

  // REQ-OSM-04: Only System Admin reviews and approves requests
  const canApprove = useMemo(
    () => hasRole(SystemRole.SYSTEM_ADMIN),
    [user?.roles]
  );

  return (
    <ProtectedRoute allowedRoles={[SystemRole.SYSTEM_ADMIN]}>
      <div className="container mx-auto px-6 py-8">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Approvals Dashboard</h1>
            <p className="text-gray-600 mt-1">
              Review and approve change requests submitted by Managers and HR.
            </p>
          </div>
          <Link
            href="/dashboard/organization-structure/change-requests"
            className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
          >
            ← Back to Change Requests
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
              <CardTitle>Find Approvals</CardTitle>
              <CardDescription>Search by Change Request ID</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                label="Change Request ID"
                placeholder="MongoDB ObjectId"
                value={changeRequestId}
                onChange={(e) => setChangeRequestId(e.target.value)}
              />
              <div className="flex gap-3">
                <Button
                  variant="primary"
                  onClick={() => fetchApprovals(changeRequestId)}
                  disabled={loading || !changeRequestId.trim()}
                >
                  Search
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setApprovals([]);
                    setChangeRequestId("");
                  }}
                  disabled={loading || (!changeRequestId && approvals.length === 0)}
                >
                  Clear
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Approvals List</CardTitle>
              <CardDescription>
                {changeRequestId.trim()
                  ? `For change request ${shortId(changeRequestId.trim())}`
                  : "Search a change request to load approvals"}
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {loading ? (
                <div className="flex justify-center py-10">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                </div>
              ) : approvals.length === 0 ? (
                <div className="py-10 text-center text-gray-600">
                  No approvals loaded.
                </div>
              ) : (
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left border-b">
                      <th className="py-3 pr-4">Approver</th>
                      <th className="py-3 pr-4">Decision</th>
                      <th className="py-3 pr-4">Decided At</th>
                      <th className="py-3 pr-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {approvals.map((a: any) => (
                      <tr key={a._id} className="border-b last:border-b-0">
                        <td className="py-3 pr-4">
                          {typeof a.approverEmployeeId === "string"
                            ? shortId(a.approverEmployeeId)
                            : a.approverEmployeeId?.fullName
                            ? `${a.approverEmployeeId.fullName} (${a.approverEmployeeId.employeeNumber || ""})`
                            : shortId(a.approverEmployeeId?._id)}
                        </td>
                        <td className="py-3 pr-4">{badge(a.decision)}</td>
                        <td className="py-3 pr-4">
                          {a.decidedAt ? new Date(a.decidedAt).toLocaleString() : "—"}
                        </td>
                        <td className="py-3 pr-4">
                          <div className="flex flex-wrap gap-2">
                            {canDecide && (
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() =>
                                  router.push(
                                    `/dashboard/organization-structure/change-requests/approvals/${a._id}`
                                  )
                                }
                              >
                                Decide
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                router.push(
                                  `/dashboard/organization-structure/change-requests?focus=${changeRequestId.trim()}`
                                )
                              }
                            >
                              View Requests
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </div>

        {canCreateApproval && (
          <div className="mt-8">
            <Card>
              <CardHeader>
                <CardTitle>Assign Approver (Create Approval)</CardTitle>
                <CardDescription>
                  System Admin only. Provide approver employee profile ID.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Change Request ID *"
                    value={changeRequestId}
                    onChange={(e) => setChangeRequestId(e.target.value)}
                    placeholder="MongoDB ObjectId"
                  />
                  <Input
                    label="Approver Employee Profile ID *"
                    value={approverEmployeeId}
                    onChange={(e) => setApproverEmployeeId(e.target.value)}
                    placeholder="MongoDB ObjectId"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Comments (optional)
                  </label>
                  <Textarea
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    rows={3}
                    placeholder="Optional note for the approver"
                  />
                </div>
                <div className="flex justify-end">
                  <Button
                    variant="primary"
                    onClick={handleCreateApproval}
                    isLoading={loading}
                    disabled={!changeRequestId.trim() || !approverEmployeeId.trim()}
                  >
                    Create Approval
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}


