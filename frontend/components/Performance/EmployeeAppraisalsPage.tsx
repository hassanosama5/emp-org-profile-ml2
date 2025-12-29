"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/hooks/use-auth";
import { SystemRole } from "@/types";
import { AppraisalRecord, RatingEntry } from "./performanceRecords";
import {
  fetchEmployeeAppraisals,
  fetchMyAppraisals,
} from "@/lib/api/performance/Api/performanceAppraisalsApi";
import { AppraisalDispute, SubmitDisputeInput } from "./performanceDisputes";
import {
  submitDisputeApi,
  fetchDisputesForAppraisal,
} from "@/lib/api/performance/Api/performanceDisputesApi";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/shared/ui/Card";
import api from "@/lib/api/client";
import Link from "next/link";

type LoadState = "idle" | "loading" | "loaded" | "error";

function getId(value: any): string | undefined {
  if (!value) return undefined;
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    const id = value.id ?? value._id ?? value.toString?.();
    return id != null ? String(id) : undefined;
  }
  return String(value);
}

function isMongoObjectId(id?: string | null): boolean {
  if (!id) return false;
  return /^[a-fA-F0-9]{24}$/.test(id);
}

// Removed: getTokenFromStorage and getUserFromStorage
// Tokens are now in HTTP-only cookies, not accessible from JavaScript
// Use useAuth hook instead to get user data

// Removed: parseJwtPayload
// Tokens are now in HTTP-only cookies, not accessible from JavaScript
// Use useAuth hook to get user data instead

function extractEmployeeProfileId(user: any): string | null {
  const candidates: any[] = [
    // Check user.id first (this is the employee profile ID based on ManagerAssignmentsPage)
    user?.id,
    user?.employeeProfileId,
    user?.employeeProfile?._id,
    user?.employeeProfile?.id,
    user?.profileId,
    user?.profile?._id,
    user?.profile?.id,
    user?.employee?.profileId,
    user?.employee?.profile?._id,
    user?.employee?.profile?.id,
  ];

  // Removed localStorage usage - user is now from useAuth hook
  // Token is in HTTP-only cookie, not accessible from JavaScript

  let found: string | null = null;

  for (const c of candidates) {
    const id = getId(c);
    if (isMongoObjectId(id)) {
      found = id!;
      break;
    }
  }

  // Debug logging if not found (only in development)
  if (!found && typeof window !== "undefined") {
    console.warn(
      "[EmployeeAppraisalsPage] Could not extract employeeProfileId",
      {
        user,
        candidates: candidates.map((c) => getId(c)),
      }
    );
  }

  return found;
}

function resolveCycleName(record: AppraisalRecord): string {
  const c: any = (record as any).cycleId;
  if (!c) return "Appraisal Cycle";
  if (typeof c === "string") return c;
  return c.name || c.title || "Appraisal Cycle";
}

function resolveTemplateName(record: AppraisalRecord): string {
  const t: any = (record as any).templateId;
  if (!t) return "Template";
  if (typeof t === "string") return t;
  return t.name || t.title || "Template";
}

function resolvePublishedDate(record: AppraisalRecord): string {
  const r: any = record;
  const value = r.hrPublishedAt || r.managerSubmittedAt || r.createdAt;
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString();
}

// ---- dispute helpers ----

function isWithinDisputeWindow(record: AppraisalRecord): boolean {
  const r: any = record;
  const base = r.hrPublishedAt;
  if (!base) return false;

  const published = new Date(base);
  if (Number.isNaN(published.getTime())) return false;

  const now = new Date();
  const diffMs = now.getTime() - published.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  // 7-day window after publication
  return diffDays >= 0 && diffDays <= 7;
}

function getDaysRemainingInDisputeWindow(
  record: AppraisalRecord
): number | null {
  const r: any = record;
  const base = r.hrPublishedAt;
  if (!base) return null;

  const published = new Date(base);
  if (Number.isNaN(published.getTime())) return null;

  const now = new Date();
  const diffMs = published.getTime() + 7 * 24 * 60 * 60 * 1000 - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  return diffDays > 0 ? diffDays : 0;
}

function formatDisputeStatus(status?: string): string {
  if (!status) return "Unknown";
  switch (status) {
    case "OPEN":
      return "Open";
    case "UNDER_REVIEW":
      return "Under review";
    case "ADJUSTED":
      return "Adjusted";
    case "REJECTED":
      return "Rejected";
    default:
      return status;
  }
}

function formatDisputeDate(value?: string | Date): string {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString();
}

export const EmployeeAppraisalsPage: React.FC = () => {
  const { user, loading, isAuthenticated } = useAuth();

  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [appraisals, setAppraisals] = useState<AppraisalRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [employeeProfileId, setEmployeeProfileId] = useState<string | null>(
    null
  );

  // Check if user is a manager (Department Head)
  const isManager = useMemo(() => {
    if (!user?.roles) return false;
    return user.roles.some((role) => {
      const roleStr = String(role).toLowerCase();
      // Check for department head role (case-insensitive)
      return (
        roleStr === "department head" ||
        roleStr === SystemRole.DEPARTMENT_HEAD.toLowerCase() ||
        roleStr === "department_head"
      );
    });
  }, [user?.roles]);

  // dispute state
  const [disputes, setDisputes] = useState<AppraisalDispute[]>([]);
  const [disputeLoading, setDisputeLoading] = useState(false);
  const [disputeSubmitting, setDisputeSubmitting] = useState(false);
  const [disputeError, setDisputeError] = useState<string | null>(null);
  const [disputeSuccess, setDisputeSuccess] = useState<string | null>(null);
  const [disputeFormOpen, setDisputeFormOpen] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");
  const [disputeDetails, setDisputeDetails] = useState("");

  // acknowledgment state
  const [acknowledging, setAcknowledging] = useState(false);
  const [acknowledgmentComment, setAcknowledgmentComment] = useState("");
  const [acknowledgmentError, setAcknowledgmentError] = useState<string | null>(
    null
  );
  const [acknowledgmentSuccess, setAcknowledgmentSuccess] = useState<
    string | null
  >(null);

  useEffect(() => {
    const load = async () => {
      try {
        if (loading) return;

        setLoadState("loading");
        setError(null);

        if (!isAuthenticated) {
          setAppraisals([]);
          setSelectedId(null);
          setLoadState("loaded");
          return;
        }

        const employeeProfileId = extractEmployeeProfileId(user);

        if (!employeeProfileId) {
          throw new Error(
            "Could not determine your employeeProfileId. Please log out and log in again (or contact HR)."
          );
        }

        setEmployeeProfileId(employeeProfileId);

        // Try using /me endpoint first (more reliable), fallback to specific ID
        let data: AppraisalRecord[] = [];
        try {
          data = await fetchMyAppraisals();
        } catch (err) {
          console.warn(
            "Failed to fetch via /me endpoint, trying with profile ID:",
            err
          );
          // Fallback to using employeeProfileId
          data = await fetchEmployeeAppraisals(employeeProfileId);
        }
        setAppraisals(data || []);

        // auto-select the latest (assume first item is latest)
        if (data && data.length > 0) {
          const firstId = getId(data[0]);
          setSelectedId(firstId || null);
        } else {
          setSelectedId(null);
        }

        setLoadState("loaded");
      } catch (err: any) {
        console.error(err);
        setError(
          err?.message ??
            "Could not load your appraisals. Please contact HR if this persists."
        );
        setLoadState("error");
      }
    };

    void load();
  }, [loading, isAuthenticated, user]);

  // load disputes whenever selected appraisal changes
  useEffect(() => {
    const loadDisputes = async () => {
      try {
        setDisputeError(null);
        setDisputeSuccess(null);

        if (!selectedId) {
          setDisputes([]);
          return;
        }

        setDisputeLoading(true);
        const data = await fetchDisputesForAppraisal(selectedId);
        setDisputes(data || []);
      } catch (err: any) {
        // Handle permission errors gracefully - employees may not have access to view disputes
        // but they can still submit disputes
        const errorMessage = err?.message || "";
        if (
          errorMessage.includes("Access denied") ||
          errorMessage.includes("role")
        ) {
          // Employee doesn't have permission to view disputes list, but can still submit
          // Set empty disputes array and don't show error
          setDisputes([]);
          setDisputeError(null);
        } else {
          console.error(err);
          setDisputeError(
            err?.message ??
              "Could not load dispute information for this appraisal."
          );
        }
      } finally {
        setDisputeLoading(false);
      }
    };

    void loadDisputes();
  }, [selectedId]);

  const selectedRecord: AppraisalRecord | null = useMemo(() => {
    if (!selectedId) return null;
    return appraisals.find((r: any) => getId(r) === selectedId) ?? null;
  }, [appraisals, selectedId]);

  const ratings: RatingEntry[] =
    (selectedRecord?.ratings as RatingEntry[]) || [];

  const primaryDispute: AppraisalDispute | undefined = disputes[0];

  const canRaiseDispute = useMemo(() => {
    if (!selectedRecord) return false;
    const status = (selectedRecord as any).status as string | undefined;

    // only allow after HR has published and within 7 days, and if no existing dispute
    if (status && status !== "HR_PUBLISHED") return false;
    if (!isWithinDisputeWindow(selectedRecord)) return false;
    if (primaryDispute) return false;
    return true;
  }, [selectedRecord, primaryDispute]);

  const handleSubmitDispute = async () => {
    if (!selectedRecord) return;
    if (!employeeProfileId) {
      setDisputeError(
        "Could not determine your employee profile. Please log out and in again, or contact HR."
      );
      return;
    }
    if (!disputeReason.trim()) {
      setDisputeError("Please describe your concern before submitting.");
      return;
    }

    try {
      setDisputeSubmitting(true);
      setDisputeError(null);
      setDisputeSuccess(null);

      const payload: SubmitDisputeInput = {
        // adjust fields here if your DTO uses different names
        reason: disputeReason.trim(),
        details: disputeDetails.trim() || undefined,
      } as SubmitDisputeInput;

      const appraisalId = getId(selectedRecord)!;

      const created = await submitDisputeApi(
        appraisalId,
        employeeProfileId,
        payload
      );

      setDisputes((prev) => [created, ...prev]);
      setDisputeFormOpen(false);
      setDisputeReason("");
      setDisputeDetails("");
      setDisputeSuccess(
        "Your concern has been submitted. HR will review it and respond."
      );
    } catch (err: any) {
      console.error(err);
      setDisputeError(
        err?.message ??
          "Could not submit your concern. Please try again or contact HR."
      );
    } finally {
      setDisputeSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white-900">My Appraisals</h1>
            <p className="text-gray-600 mt-1">
              View your finalized ratings, feedback, and development notes
              across appraisal cycles.
            </p>
          </div>
          {isManager && (
            <Link
              href="/dashboard/performance/assignments"
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 transition"
            >
              Manage Team Appraisals →
            </Link>
          )}
        </div>
        {isManager && (
          <Card className="mt-4 border-blue-200 bg-blue-50">
            <CardContent className="pt-6">
              <p className="text-sm text-blue-800">
                <strong>Manager Notice:</strong> As a Department Head, you can
                also{" "}
                <Link
                  href="/dashboard/performance/assignments"
                  className="underline font-medium hover:text-blue-900"
                >
                  view and complete appraisal ratings for your direct reports
                </Link>
                . This page shows your own appraisals as an employee.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {loadState === "loading" && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">
                Loading your appraisals…
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {loadState === "error" && (
        <Card className="border-red-200 bg-red-50 mb-4">
          <CardHeader>
            <CardTitle className="text-red-800 text-base">
              Could not load your appraisal history
            </CardTitle>
            <CardDescription className="text-red-700 text-sm">
              {error}
            </CardDescription>
          </CardHeader>
          {user && (
            <CardContent>
              <p className="text-xs text-red-700 mb-1">
                Technical details (for support):
              </p>
              <pre className="text-[11px] bg-red-100 rounded-md p-2 overflow-x-auto">
                {JSON.stringify(user, null, 2)}
              </pre>
            </CardContent>
          )}
        </Card>
      )}

      {loadState === "loaded" && appraisals.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">No appraisals yet</CardTitle>
            <CardDescription>
              Once your manager completes and HR publishes an appraisal, it will
              appear here.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {appraisals.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-6">
          {/* Left: list / history */}
          <Card className="h-fit">
            <CardHeader>
              <CardTitle className="text-base">Appraisal History</CardTitle>
              <CardDescription>
                Select an appraisal to see full details.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="divide-y divide-gray-200">
                {appraisals.map((rec, index) => {
                  const id = getId(rec) || `${index}`;
                  const isSelected = id === selectedId;
                  const status = (rec as any).status as string | undefined;
                  const totalScore = (rec as any).totalScore as
                    | number
                    | undefined;
                  const label = (rec as any).overallRatingLabel as
                    | string
                    | undefined;

                  return (
                    <li key={id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(id)}
                        className={`w-full text-left px-3 py-3 text-sm ${
                          isSelected
                            ? "bg-blue-50 border-l-4 border-blue-500"
                            : "hover:bg-gray-50"
                        }`}
                      >
                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <p className="font-medium text-gray-900">
                              {resolveCycleName(rec)}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {resolveTemplateName(rec)} ·{" "}
                              {resolvePublishedDate(rec)}
                            </p>
                          </div>
                          {status && (
                            <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-700">
                              {status}
                            </span>
                          )}
                        </div>
                        <div className="mt-1 text-xs text-gray-700 flex flex-wrap gap-3">
                          {typeof totalScore === "number" && (
                            <span>
                              Score:{" "}
                              <span className="font-semibold">
                                {totalScore}
                              </span>
                            </span>
                          )}
                          {label && (
                            <span>
                              Rating:{" "}
                              <span className="font-semibold">{label}</span>
                            </span>
                          )}
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>

          {/* Right: details of selected appraisal */}
          <div className="space-y-4">
            {!selectedRecord ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Select an appraisal
                  </CardTitle>
                  <CardDescription>
                    Choose an appraisal on the left to view its details.
                  </CardDescription>
                </CardHeader>
              </Card>
            ) : (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      {resolveCycleName(selectedRecord)}
                    </CardTitle>
                    <CardDescription>
                      {resolveTemplateName(selectedRecord)} · Final rating and
                      feedback
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm text-gray-800">
                    <div className="flex flex-wrap gap-4 text-sm">
                      <div>
                        <span className="text-gray-500 text-xs block">
                          Total Score
                        </span>
                        <span className="font-semibold">
                          {(selectedRecord as any).totalScore ?? "-"}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500 text-xs block">
                          Overall Rating
                        </span>
                        <span className="font-semibold">
                          {(selectedRecord as any).overallRatingLabel || "-"}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500 text-xs block">
                          Published On
                        </span>
                        <span className="font-semibold">
                          {resolvePublishedDate(selectedRecord)}
                        </span>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
                        Manager Summary
                      </p>
                      <p className="text-sm text-gray-800 whitespace-pre-line">
                        {(selectedRecord as any).managerSummary ||
                          "No summary recorded."}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
                          Key Strengths
                        </p>
                        <p className="text-sm text-gray-800 whitespace-pre-line">
                          {(selectedRecord as any).strengths ||
                            "No strengths recorded."}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
                          Improvement Areas / Development Notes
                        </p>
                        <p className="text-sm text-gray-800 whitespace-pre-line">
                          {(selectedRecord as any).improvementAreas ||
                            "No improvement areas recorded."}
                        </p>
                      </div>
                    </div>

                    {/* --- Dispute / concern section --- */}
                    <div className="mt-4 border-t border-gray-200 pt-3">
                      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
                        Dispute / Concern
                      </p>

                      {disputeLoading && (
                        <p className="text-xs text-gray-600">
                          Checking if you have raised a concern for this
                          appraisal...
                        </p>
                      )}

                      {disputeError && (
                        <p className="text-xs text-red-600 mb-1">
                          {disputeError}
                        </p>
                      )}

                      {disputeSuccess && (
                        <p className="text-xs text-green-600 mb-1">
                          {disputeSuccess}
                        </p>
                      )}

                      {primaryDispute ? (
                        <div className="space-y-1 text-sm text-gray-800">
                          <p>
                            Status:{" "}
                            <span className="font-semibold">
                              {formatDisputeStatus(
                                (primaryDispute as any).status
                              )}
                            </span>
                          </p>
                          <p className="text-xs text-gray-600">
                            Submitted on:{" "}
                            {formatDisputeDate(
                              (primaryDispute as any).createdAt
                            )}
                          </p>
                          <p className="text-sm text-gray-800 whitespace-pre-line mt-1">
                            {(primaryDispute as any).reason ||
                              (primaryDispute as any).details ||
                              "No description recorded."}
                          </p>
                          {(primaryDispute as any).resolutionSummary && (
                            <p className="text-xs text-gray-700 whitespace-pre-line mt-2">
                              <span className="font-semibold">
                                HR Resolution:
                              </span>{" "}
                              {(primaryDispute as any).resolutionSummary}
                            </p>
                          )}
                        </div>
                      ) : canRaiseDispute ? (
                        <div className="space-y-2 text-sm text-gray-800">
                          {!disputeFormOpen && (
                            <>
                              <div className="flex items-start gap-2">
                                <p className="text-xs text-gray-600 flex-1">
                                  If you disagree with this rating, you can
                                  raise a concern within 7 days of publication.
                                  Your concern will be logged for HR to review.
                                </p>
                                {(() => {
                                  const daysRemaining =
                                    getDaysRemainingInDisputeWindow(
                                      selectedRecord
                                    );
                                  if (
                                    daysRemaining !== null &&
                                    daysRemaining > 0
                                  ) {
                                    return (
                                      <span
                                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                                          daysRemaining <= 2
                                            ? "bg-red-100 text-red-700"
                                            : daysRemaining <= 3
                                            ? "bg-yellow-100 text-yellow-700"
                                            : "bg-blue-100 text-blue-700"
                                        }`}
                                      >
                                        {daysRemaining}{" "}
                                        {daysRemaining === 1 ? "day" : "days"}{" "}
                                        left
                                      </span>
                                    );
                                  }
                                  return null;
                                })()}
                              </div>
                              <button
                                type="button"
                                onClick={() => setDisputeFormOpen(true)}
                                className="mt-1 inline-flex items-center rounded-md border border-red-200 bg-red-50 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
                              >
                                Raise a concern about this rating
                              </button>
                            </>
                          )}

                          {disputeFormOpen && (
                            <div className="space-y-2">
                              <textarea
                                rows={3}
                                value={disputeReason}
                                onChange={(e) =>
                                  setDisputeReason(e.target.value)
                                }
                                className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm"
                                placeholder="Briefly explain why you disagree with this appraisal outcome."
                              />
                              <textarea
                                rows={3}
                                value={disputeDetails}
                                onChange={(e) =>
                                  setDisputeDetails(e.target.value)
                                }
                                className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm"
                                placeholder="Optional: share any extra details, examples, or what change you’re requesting."
                              />

                              <div className="flex gap-2 justify-end">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setDisputeFormOpen(false);
                                    setDisputeReason("");
                                    setDisputeDetails("");
                                    setDisputeError(null);
                                  }}
                                  className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1 text-xs font-medium text-gray-800 hover:bg-gray-100"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  disabled={disputeSubmitting}
                                  onClick={handleSubmitDispute}
                                  className="inline-flex items-center rounded-md bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-60"
                                >
                                  {disputeSubmitting
                                    ? "Submitting..."
                                    : "Submit Concern"}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-600">
                          You cannot raise a dispute for this appraisal (either
                          the 7-day window has passed or the rating is not in a
                          disputable state).
                        </p>
                      )}
                    </div>

                    {/* Employee Acknowledgment Section */}
                    {(() => {
                      const r: any = selectedRecord;
                      const status = r.status as string | undefined;
                      const isPublished = status === "HR_PUBLISHED";
                      const isAcknowledged = !!r.employeeAcknowledgedAt;

                      if (!isPublished) return null;

                      return (
                        <div className="mt-4 border-t border-gray-200 pt-3">
                          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                            Acknowledgment
                          </p>

                          {isAcknowledged ? (
                            <div className="space-y-1 text-sm text-gray-800">
                              <p className="text-green-700 font-medium">
                                ✓ Acknowledged on{" "}
                                {r.employeeAcknowledgedAt
                                  ? new Date(
                                      r.employeeAcknowledgedAt
                                    ).toLocaleDateString()
                                  : "-"}
                              </p>
                              {r.employeeAcknowledgementComment && (
                                <p className="text-xs text-gray-600 whitespace-pre-line mt-1">
                                  {r.employeeAcknowledgementComment}
                                </p>
                              )}
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <p className="text-xs text-gray-600">
                                Please acknowledge that you have reviewed this
                                appraisal. You can optionally add a comment.
                              </p>

                              {acknowledgmentError && (
                                <p className="text-xs text-red-600">
                                  {acknowledgmentError}
                                </p>
                              )}

                              {acknowledgmentSuccess && (
                                <p className="text-xs text-green-600">
                                  {acknowledgmentSuccess}
                                </p>
                              )}

                              <textarea
                                rows={2}
                                value={acknowledgmentComment}
                                onChange={(e) =>
                                  setAcknowledgmentComment(e.target.value)
                                }
                                className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm"
                                placeholder="Optional: Add a comment about this appraisal..."
                              />

                              <button
                                type="button"
                                disabled={acknowledging}
                                onClick={async () => {
                                  if (!selectedRecord || !employeeProfileId)
                                    return;

                                  try {
                                    setAcknowledging(true);
                                    setAcknowledgmentError(null);
                                    setAcknowledgmentSuccess(null);

                                    const appraisalId = getId(selectedRecord)!;
                                    // Note: This endpoint needs to be implemented in the backend
                                    // POST /performance/appraisals/:id/acknowledge
                                    const response = await api
                                      .patch(
                                        `/performance/appraisals/${appraisalId}/acknowledge`,
                                        {
                                          comment:
                                            acknowledgmentComment.trim() ||
                                            undefined,
                                        },
                                        {
                                          params: { employeeProfileId },
                                        }
                                      )
                                      .catch((err) => {
                                        // If endpoint doesn't exist, show helpful message
                                        if (err?.response?.status === 404) {
                                          throw new Error(
                                            "Acknowledgment endpoint not yet implemented. Please contact HR."
                                          );
                                        }
                                        throw err;
                                      });

                                    // Update the record
                                    setAppraisals((prev) =>
                                      prev.map((r) => {
                                        const id = getId(r);
                                        if (id === appraisalId) {
                                          return {
                                            ...r,
                                            employeeAcknowledgedAt:
                                              new Date().toISOString(),
                                            employeeAcknowledgementComment:
                                              acknowledgmentComment.trim() ||
                                              undefined,
                                          } as any;
                                        }
                                        return r;
                                      })
                                    );

                                    setAcknowledgmentComment("");
                                    setAcknowledgmentSuccess(
                                      "Appraisal acknowledged successfully."
                                    );
                                  } catch (err: any) {
                                    console.error(err);
                                    setAcknowledgmentError(
                                      err?.response?.data?.message ||
                                        err?.message ||
                                        "Failed to acknowledge appraisal. Please try again."
                                    );
                                  } finally {
                                    setAcknowledging(false);
                                  }
                                }}
                                className="inline-flex items-center rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-60"
                              >
                                {acknowledging
                                  ? "Acknowledging..."
                                  : "Acknowledge This Appraisal"}
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>

                {/* Criteria breakdown */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      Criteria Breakdown
                    </CardTitle>
                    <CardDescription>
                      Detailed ratings and comments for each criterion.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {ratings.length === 0 ? (
                      <p className="text-sm text-gray-600">
                        No individual criteria recorded for this appraisal.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {ratings.map((r) => (
                          <div
                            key={r.key}
                            className="border border-gray-200 rounded-md px-3 py-2"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className="text-sm font-medium text-gray-900">
                                  {r.title}
                                </p>
                                <p className="text-[11px] text-gray-500">
                                  Key: {r.key}
                                </p>
                              </div>
                              <div className="text-right text-sm">
                                <p className="font-semibold">{r.ratingValue}</p>
                                {r.ratingLabel && (
                                  <p className="text-[11px] text-gray-600">
                                    {r.ratingLabel}
                                  </p>
                                )}
                              </div>
                            </div>
                            {r.comments && (
                              <p className="mt-2 text-sm text-gray-700 whitespace-pre-line">
                                {r.comments}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
