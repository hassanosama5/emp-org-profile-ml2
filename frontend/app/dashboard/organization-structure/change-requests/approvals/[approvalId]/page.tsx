"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { SystemRole } from "@/types";
import { Button } from "@/components/shared/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/shared/ui/Card";
import { Textarea } from "@/components/shared/ui/Textarea";
import { useOrganizationStructure } from "@/lib/hooks/use-organization-structure";
import { useAuth } from "@/lib/hooks/use-auth";
import { ApprovalDecision } from "@/types/organization-structure";

export default function ApprovalDecisionPage() {
  const router = useRouter();
  const params = useParams();
  const approvalId = params?.approvalId as string;
  const { user } = useAuth();
  const { 
    updateApprovalDecision, 
    getRequestApprovals,
    getApprovedRequestFormData,
    loading, 
    error, 
    clearError 
  } = useOrganizationStructure();

  const [comments, setComments] = useState("");
  const [decision, setDecision] = useState<ApprovalDecision>(ApprovalDecision.APPROVED);
  const [changeRequestId, setChangeRequestId] = useState<string | null>(null);

  const roles = user?.roles || [];
  const hasRole = (role: string) =>
    roles.some((r) => String(r).toLowerCase() === role.toLowerCase());
  const canDecide = useMemo(
    () => hasRole(SystemRole.SYSTEM_ADMIN) || hasRole(SystemRole.HR_ADMIN),
    [user?.roles]
  );

  // Fetch change request ID from approval
  useEffect(() => {
    const fetchApproval = async () => {
      try {
        // We need to get the approval to find the change request ID
        // For now, we'll get it from the approvals list or pass it as a query param
        const url = new URL(window.location.href);
        const requestId = url.searchParams.get("changeRequestId");
        if (requestId) {
          setChangeRequestId(requestId);
        }
      } catch (e) {
        console.error("Failed to fetch approval details:", e);
      }
    };
    fetchApproval();
  }, []);

  const submit = async () => {
    if (!canDecide || !approvalId) {
      console.error("Cannot submit: missing approvalId or no permission");
      return;
    }
    try {
      await updateApprovalDecision(approvalId, {
        decision,
        comments: comments.trim() || undefined,
      });
      
      // If approved, redirect to the appropriate form with pre-filled data
      if (decision === ApprovalDecision.APPROVED && changeRequestId) {
        try {
          const formData = await getApprovedRequestFormData(changeRequestId);
          // Redirect to the form URL with query parameters
          router.push(formData.redirectUrl);
          return;
        } catch (formError) {
          console.error("Failed to get form data, redirecting to approvals:", formError);
        }
      }
      
      // If rejected or form data fetch failed, go back to approvals
      router.push("/dashboard/organization-structure/change-requests/approvals");
    } catch (e) {
      console.error("Failed to update approval decision:", e);
    }
  };

  // REQ-OSM-04: Only System Admin can make approval decisions
  if (!canDecide) {
    return (
      <ProtectedRoute allowedRoles={[SystemRole.SYSTEM_ADMIN]}>
        <div className="container mx-auto px-6 py-8 max-w-2xl">
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-800 font-medium">Access Denied</p>
            <p className="text-red-700 text-sm mt-1">
              Only System Admin can make approval decisions. Please contact your System Admin to review this request.
            </p>
          </div>
          <Link
            href="/dashboard/organization-structure/change-requests"
            className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
          >
            ← Back to Change Requests
          </Link>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={[SystemRole.SYSTEM_ADMIN]}>
      <div className="container mx-auto px-6 py-8 max-w-2xl">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Approval Decision</h1>
            <p className="text-gray-600 mt-1">
              Approval ID: <span className="font-mono">{approvalId || "Loading..."}</span>
            </p>
          </div>
          <Link
            href="/dashboard/organization-structure/change-requests/approvals"
            className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
          >
            ← Back
          </Link>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
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
            <CardTitle>Record decision</CardTitle>
            <CardDescription>
              Choose Approved/Rejected and optionally add comments.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Decision
              </label>
              <select
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                value={decision}
                onChange={(e) => setDecision(e.target.value as ApprovalDecision)}
                disabled={loading}
              >
                <option value={ApprovalDecision.APPROVED}>APPROVED</option>
                <option value={ApprovalDecision.REJECTED}>REJECTED</option>
              </select>
              {!canDecide && (
                <p className="mt-2 text-sm text-amber-700">
                  You do not have permission to decide approvals.
                </p>
              )}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Comments (optional)
              </label>
              <Textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                rows={5}
                placeholder="Add any notes for audit trail..."
                disabled={loading}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <Button
                variant="outline"
                onClick={() =>
                  router.push(
                    "/dashboard/organization-structure/change-requests/approvals"
                  )
                }
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={submit}
                isLoading={loading}
                disabled={!canDecide}
              >
                Submit Decision
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  );
}


