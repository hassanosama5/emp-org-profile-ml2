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
import { ApprovalDecision, StructureApprovalResponseDto, StructureRequestStatus } from "@/types/organization-structure";

const shortId = (id?: string) => (id ? `${id.slice(0, 8)}…` : "—");

export default function ApprovalsDashboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const {
    getRequestApprovals,
    getChangeRequestById,
    getStatusDisplay,
    getRequestTypeDisplay,
    getDecisionDisplay,
    getApprovedRequestFormData,
    approveChangeRequest,
    rejectChangeRequest,
    loading,
    error,
    clearError,
  } = useOrganizationStructure();

  const [changeRequestId, setChangeRequestId] = useState("");
  const [comments, setComments] = useState("");
  const [approvals, setApprovals] = useState<StructureApprovalResponseDto[]>([]);
  const [changeRequest, setChangeRequest] = useState<any>(null);
  const [decisionComments, setDecisionComments] = useState("");

  const roles = user?.roles || [];
  const hasRole = (role: string) =>
    roles.some((r) => String(r).toLowerCase() === role.toLowerCase());

  // Only System Admin can approve/reject
  const canApprove = useMemo(() => hasRole(SystemRole.SYSTEM_ADMIN), [user?.roles]);

  const fetchApprovals = async (id: string) => {
    if (!id.trim()) return;
    try {
      const [approvalsData, requestData] = await Promise.all([
        getRequestApprovals(id.trim()).catch(() => []),
        getChangeRequestById(id.trim()).catch(() => null),
      ]);
      setApprovals(approvalsData || []);
      setChangeRequest(requestData || null);
    } catch (e) {
      console.error("Failed to fetch approvals:", e);
      setApprovals([]);
      setChangeRequest(null);
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

  const handleApprove = async () => {
    if (!changeRequestId.trim() || !changeRequest) return;
    try {
      await approveChangeRequest(changeRequestId.trim(), decisionComments.trim() || undefined);
      setDecisionComments("");
      await fetchApprovals(changeRequestId);
    } catch (e) {
      console.error("Failed to approve request:", e);
    }
  };

  const handleReject = async () => {
    if (!changeRequestId.trim() || !changeRequest) return;
    try {
      await rejectChangeRequest(changeRequestId.trim(), decisionComments.trim() || undefined);
      setDecisionComments("");
      await fetchApprovals(changeRequestId);
    } catch (e) {
      console.error("Failed to reject request:", e);
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

  const getStatusBadge = (status: string) => {
    const display = getStatusDisplay(status as any);
    const colorMap: Record<string, string> = {
      gray: "bg-gray-100 text-gray-800",
      blue: "bg-blue-100 text-blue-800",
      green: "bg-green-100 text-green-800",
      red: "bg-red-100 text-red-800",
      yellow: "bg-yellow-100 text-yellow-800",
      purple: "bg-purple-100 text-purple-800",
    };
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorMap[display.color] || colorMap.gray}`}>
        {display.label}
      </span>
    );
  };

  return (
    <ProtectedRoute allowedRoles={[SystemRole.SYSTEM_ADMIN]}>
      <div className="container mx-auto px-6 py-8 max-w-7xl">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Approvals Dashboard</h1>
            <p className="text-gray-600 mt-1">
              Review and approve change requests submitted by Managers and HR.
            </p>
          </div>
          <Link
            href="/dashboard/organization-structure/change-requests"
            className="text-sm text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
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

        {/* Search Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Find Change Request</CardTitle>
            <CardDescription>Enter a change request ID to view and manage its approvals</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <div className="flex-1">
                <Input
                  label="Change Request ID"
                  placeholder="Enter change request ID or request number"
                  value={changeRequestId}
                  onChange={(e) => setChangeRequestId(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && changeRequestId.trim()) {
                      fetchApprovals(changeRequestId);
                    }
                  }}
                />
              </div>
              <div className="flex items-end gap-2">
                <Button
                  variant="primary"
                  onClick={() => fetchApprovals(changeRequestId)}
                  disabled={loading || !changeRequestId.trim()}
                  isLoading={loading}
                >
                  Search
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setApprovals([]);
                    setChangeRequest(null);
                    setChangeRequestId("");
                  }}
                  disabled={loading}
                >
                  Clear
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Change Request Details with Approve/Reject Actions */}
        {changeRequest && (
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-3">
                    <span>{getRequestTypeDisplay(changeRequest.requestType).icon}</span>
                    <span>{getRequestTypeDisplay(changeRequest.requestType).label}</span>
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Request #{changeRequest.requestNumber}
                  </CardDescription>
                </div>
                {getStatusBadge(changeRequest.status)}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-4">
                <div>
                  <p className="text-gray-500">Requested By</p>
                  <p className="font-medium text-gray-900">
                    {typeof changeRequest.requestedByEmployeeId === 'object' 
                      ? `${changeRequest.requestedByEmployeeId?.firstName || ''} ${changeRequest.requestedByEmployeeId?.lastName || ''}`.trim() || changeRequest.requestedByEmployeeId?.employeeNumber || 'Unknown'
                      : shortId(changeRequest.requestedByEmployeeId)}
                  </p>
                </div>
                {changeRequest.submittedAt && (
                  <div>
                    <p className="text-gray-500">Submitted At</p>
                    <p className="font-medium text-gray-900">
                      {new Date(changeRequest.submittedAt).toLocaleString()}
                    </p>
                  </div>
                )}
                {changeRequest.reason && (
                  <div className="md:col-span-2">
                    <p className="text-gray-500">Reason</p>
                    <p className="font-medium text-gray-900">{changeRequest.reason}</p>
                  </div>
                )}
              </div>

              {/* Approve/Reject Actions - Only for SUBMITTED or UNDER_REVIEW and System Admin */}
              {canApprove && (changeRequest.status === StructureRequestStatus.SUBMITTED || 
                changeRequest.status === StructureRequestStatus.UNDER_REVIEW) && (
                <div className="mt-6 pt-6 border-t space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Comments (optional)
                    </label>
                    <Textarea
                      value={decisionComments}
                      onChange={(e) => setDecisionComments(e.target.value)}
                      rows={3}
                      placeholder="Add comments for your decision..."
                    />
                  </div>
                  <div className="flex gap-3">
                    <Button
                      variant="primary"
                      onClick={handleApprove}
                      disabled={loading}
                      isLoading={loading}
                      className="flex-1"
                    >
                      ✓ Approve Request
                    </Button>
                    <Button
                      variant="danger"
                      onClick={handleReject}
                      disabled={loading}
                      isLoading={loading}
                      className="flex-1"
                    >
                      ✗ Reject Request
                    </Button>
                  </div>
                </div>
              )}

              {/* Status-specific messages */}
              {canApprove && changeRequest.status === StructureRequestStatus.APPROVED && (
                <div className="mt-4 pt-4 border-t">
                  <div className="p-3 bg-green-50 border border-green-200 rounded-md mb-3">
                    <p className="text-sm text-green-800 font-medium mb-1">
                      ✓ Request Approved
                    </p>
                    <p className="text-xs text-green-700">
                      This request has been approved. Use the button below to open the form and implement the changes.
                    </p>
                  </div>
                  <Button
                    variant="primary"
                    onClick={async () => {
                      try {
                        const formData = await getApprovedRequestFormData(changeRequest._id);
                        router.push(formData.redirectUrl);
                      } catch (e) {
                        console.error("Failed to get form data:", e);
                        alert("Failed to load form data. Please check the console for details.");
                      }
                    }}
                  >
                    📝 Open Form to Implement
                  </Button>
                </div>
              )}

              {changeRequest.status === StructureRequestStatus.REJECTED && (
                <div className="mt-4 pt-4 border-t">
                  <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm text-red-800 font-medium">
                      ✗ Request Rejected
                    </p>
                    <p className="text-xs text-red-700 mt-1">
                      This request has been rejected and will not be implemented.
                    </p>
                  </div>
                </div>
              )}

              {changeRequest.status === StructureRequestStatus.IMPLEMENTED && (
                <div className="mt-4 pt-4 border-t">
                  <div className="p-3 bg-purple-50 border border-purple-200 rounded-md">
                    <p className="text-sm text-purple-800 font-medium">
                      ✓ Request Implemented
                    </p>
                    <p className="text-xs text-purple-700 mt-1">
                      The changes from this request have been successfully implemented.
                    </p>
                  </div>
                </div>
              )}

              <div className="mt-4 pt-4 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(`/dashboard/organization-structure/change-requests/${changeRequest._id}`)}
                >
                  View Full Details →
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Approval History (if exists) */}
        {approvals.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Approval History</CardTitle>
              <CardDescription>
                Approval record for this change request
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {approvals.map((a: any) => (
                  <div
                    key={a._id}
                    className="p-4 border border-gray-200 rounded-lg"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">
                          {typeof a.approverEmployeeId === "object" && a.approverEmployeeId
                            ? `${a.approverEmployeeId.firstName || ''} ${a.approverEmployeeId.lastName || ''}`.trim() || a.approverEmployeeId.employeeNumber || 'Unknown'
                            : typeof a.approverEmployeeId === "string"
                            ? `Employee ${shortId(a.approverEmployeeId)}`
                            : "Unknown Approver"}
                        </p>
                        {typeof a.approverEmployeeId === "object" && a.approverEmployeeId?.employeeNumber && (
                          <p className="text-xs text-gray-500 mt-0.5">
                            {a.approverEmployeeId.employeeNumber}
                          </p>
                        )}
                      </div>
                      {badge(a.decision)}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      {a.decidedAt ? (
                        <span>Decided: {new Date(a.decidedAt).toLocaleString()}</span>
                      ) : (
                        <span className="text-yellow-600 font-medium">Pending Decision</span>
                      )}
                    </div>
                    {a.comments && (
                      <div className="mt-2 p-2 bg-gray-50 rounded text-sm text-gray-700">
                        <p className="font-medium mb-1">Comments:</p>
                        <p>{a.comments}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </ProtectedRoute>
  );
}


