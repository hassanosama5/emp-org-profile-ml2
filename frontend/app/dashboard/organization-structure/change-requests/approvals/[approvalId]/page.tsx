"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { SystemRole } from "@/types";
import { Button } from "@/components/shared/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/shared/ui/Card";
import { Textarea } from "@/components/shared/ui/Textarea";
import { useOrganizationStructure } from "@/lib/hooks/use-organization-structure";
import { useAuth } from "@/lib/hooks/use-auth";
import { ApprovalDecision } from "@/types/organization-structure";

export default function ApprovalDecisionPage({
  params,
}: {
  params: { approvalId: string };
}) {
  const router = useRouter();
  const { user } = useAuth();
  const { updateApprovalDecision, loading, error, clearError } =
    useOrganizationStructure();

  const [comments, setComments] = useState("");
  const [decision, setDecision] = useState<ApprovalDecision>(ApprovalDecision.APPROVED);

  const roles = user?.roles || [];
  const hasRole = (role: string) =>
    roles.some((r) => String(r).toLowerCase() === role.toLowerCase());
  const canDecide = useMemo(
    () => hasRole(SystemRole.SYSTEM_ADMIN) || hasRole(SystemRole.HR_ADMIN),
    [user?.roles]
  );

  const submit = async () => {
    if (!canDecide) return;
    try {
      await updateApprovalDecision(params.approvalId, {
        decision,
        comments: comments.trim() || undefined,
      });
      router.push("/dashboard/organization-structure/change-requests/approvals");
    } catch (e) {
      console.error("Failed to update approval decision:", e);
    }
  };

  return (
    <ProtectedRoute allowedRoles={[SystemRole.SYSTEM_ADMIN, SystemRole.HR_ADMIN]}>
      <div className="container mx-auto px-6 py-8 max-w-2xl">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Approval Decision</h1>
            <p className="text-gray-600 mt-1">
              Approval ID: <span className="font-mono">{params.approvalId}</span>
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


