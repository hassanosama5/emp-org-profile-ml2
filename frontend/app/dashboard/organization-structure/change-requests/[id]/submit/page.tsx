"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { SystemRole } from "@/types";
import { Button } from "@/components/shared/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/shared/ui/Card";
import { Textarea } from "@/components/shared/ui/Textarea";
import { useOrganizationStructure } from "@/lib/hooks/use-organization-structure";
import { useAuth } from "@/lib/hooks/use-auth";
import { StructureChangeRequestResponseDto, StructureRequestStatus } from "@/types/organization-structure";

export default function SubmitChangeRequestPage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  const router = useRouter();
  const { user } = useAuth();
  const {
    getChangeRequestById,
    submitChangeRequest,
    loading,
    error,
    clearError,
  } = useOrganizationStructure();

  const [req, setReq] = useState<StructureChangeRequestResponseDto | null>(null);
  const [comments, setComments] = useState("");
  const [requestId, setRequestId] = useState<string>("");

  const roles = user?.roles || [];
  const hasRole = (role: string) =>
    roles.some((r) => String(r).toLowerCase() === role.toLowerCase());

  const canSubmit = useMemo(
    () => hasRole(SystemRole.SYSTEM_ADMIN) || hasRole(SystemRole.HR_ADMIN) || hasRole(SystemRole.HR_MANAGER),
    [user?.roles]
  );

  // Unwrap params if it's a Promise
  useEffect(() => {
    if (params && typeof params === 'object' && 'then' in params) {
      (params as Promise<{ id: string }>).then((resolved) => {
        setRequestId(resolved.id);
      });
    } else {
      setRequestId((params as { id: string }).id);
    }
  }, [params]);

  const fetchReq = async () => {
    if (!requestId) return;
    try {
      const data = await getChangeRequestById(requestId);
      setReq(data);
    } catch (e) {
      console.error("Failed to fetch change request:", e);
    }
  };

  useEffect(() => {
    if (requestId) {
      fetchReq();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId]);

  const doSubmit = async () => {
    if (!canSubmit || !requestId) return;
    const submittedByEmployeeId = user?.id || (user as any)?.userId;
    if (!submittedByEmployeeId) {
      console.error("Missing user id for submit");
      return;
    }

    if (!confirm("Submit this change request for approval?")) return;

    try {
      await submitChangeRequest(requestId, { submittedByEmployeeId });
      // After submission, redirect to change requests list
      // System Admin will see it in the list and can approve it
      router.push(`/dashboard/organization-structure/change-requests`);
    } catch (e) {
      console.error("Failed to submit change request:", e);
    }
  };

  const canSubmitNow = req?.status === StructureRequestStatus.DRAFT;

  return (
    <ProtectedRoute allowedRoles={[SystemRole.SYSTEM_ADMIN, SystemRole.HR_ADMIN, SystemRole.HR_MANAGER]}>
      <div className="container mx-auto px-6 py-8 max-w-2xl">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Submit for Approval</h1>
            <p className="text-gray-600 mt-1">
              Change Request ID: <span className="font-mono">{requestId || "Loading..."}</span>
            </p>
          </div>
          <Link
            href={`/dashboard/organization-structure/change-requests/${requestId || "#"}`}
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

        {req && req.status !== StructureRequestStatus.DRAFT && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-md">
            <p className="text-amber-800 text-sm">
              This request is <b>{req.status}</b> and cannot be submitted again.
            </p>
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Confirm submission</CardTitle>
            <CardDescription>
              Submitting moves the request from <b>DRAFT</b> to <b>SUBMITTED</b>.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="text-sm text-gray-700">
              {req ? (
                <div className="space-y-1">
                  <div>
                    <span className="text-gray-500">Request #:</span>{" "}
                    <span className="font-mono">{req.requestNumber}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Type:</span>{" "}
                    <span className="font-mono">{req.requestType}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Status:</span>{" "}
                    <span className="font-mono">{req.status}</span>
                  </div>
                </div>
              ) : (
                "Loading request…"
              )}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Optional submission note (stored locally only)
              </label>
              <Textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                rows={4}
                placeholder="Add a note for yourself before submitting…"
                disabled={loading}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <Button
                variant="outline"
                onClick={() => router.push(`/dashboard/organization-structure/change-requests/${requestId || "#"}`)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={doSubmit}
                isLoading={loading}
                disabled={!canSubmit || !canSubmitNow}
              >
                Submit
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  );
}


