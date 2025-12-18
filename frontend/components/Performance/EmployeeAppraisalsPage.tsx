"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/hooks/use-auth";
import {
  AppraisalRecord,
  RatingEntry,
} from "./performanceRecords";
import {
  fetchEmployeeAppraisals,
} from "@/lib/api/performance/Api/performanceAppraisalsApi";
import {
  AppraisalDispute,
  SubmitDisputeInput,
} from "./performanceDisputes";
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

function getTokenFromStorage(): string | null {
  if (typeof window === "undefined") return null;
  return (
    localStorage.getItem("auth_token") ||
    localStorage.getItem("accessToken") ||
    localStorage.getItem("token") ||
    localStorage.getItem("jwt")
  );
}

function getUserFromStorage(): any | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function parseJwtPayload(token?: string | null): any | null {
  try {
    if (!token) return null;
    const parts = token.split(".");
    if (parts.length < 2) return null;

    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => `%${("00" + c.charCodeAt(0).toString(16)).slice(-2)}`)
        .join(""),
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

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

  const storedUser = getUserFromStorage();
  candidates.push(
    storedUser?.id,
    storedUser?.employeeProfileId,
    storedUser?.employeeProfile?._id,
    storedUser?.employeeProfile?.id,
    storedUser?.profileId,
    storedUser?.profile?._id,
    storedUser?.profile?.id,
  );

  const token = getTokenFromStorage();
  const payload = parseJwtPayload(token);
  candidates.push(
    payload?.id,
    payload?.employeeProfileId,
    payload?.profileId,
    payload?.employee_profile_id,
    payload?.employeeProfile?._id,
    payload?.employeeProfile?.id,
  );

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
    console.warn("[EmployeeAppraisalsPage] Could not extract employeeProfileId", {
      user,
      storedUser: getUserFromStorage(),
      tokenPayload: parseJwtPayload(getTokenFromStorage()),
      candidates: candidates.map((c) => getId(c)),
    });
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
  const value =
    r.hrPublishedAt || r.managerSubmittedAt || r.createdAt;
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString();
}

// ---- dispute helpers ----

function isWithinDisputeWindow(record: AppraisalRecord): boolean {
  const r: any = record;
  const base =
    r.hrPublishedAt || r.employeeViewedAt || r.managerSubmittedAt;
  if (!base) return false;

  const published = new Date(base);
  if (Number.isNaN(published.getTime())) return false;

  const now = new Date();
  const diffMs = now.getTime() - published.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  // 7-day window after publication
  return diffDays >= 0 && diffDays <= 7;
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
    null,
  );

  // dispute state
  const [disputes, setDisputes] = useState<AppraisalDispute[]>([]);
  const [disputeLoading, setDisputeLoading] = useState(false);
  const [disputeSubmitting, setDisputeSubmitting] = useState(false);
  const [disputeError, setDisputeError] = useState<string | null>(null);
  const [disputeSuccess, setDisputeSuccess] = useState<string | null>(null);
  const [disputeFormOpen, setDisputeFormOpen] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");
  const [disputeDetails, setDisputeDetails] = useState("");

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
            "Could not determine your employeeProfileId. Please log out and log in again (or contact HR).",
          );
        }

        setEmployeeProfileId(employeeProfileId);

        const data = await fetchEmployeeAppraisals(employeeProfileId);
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
            "Could not load your appraisals. Please contact HR if this persists.",
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
        console.error(err);
        setDisputeError(
          err?.message ??
            "Could not load dispute information for this appraisal.",
        );
      } finally {
        setDisputeLoading(false);
      }
    };

    void loadDisputes();
  }, [selectedId]);

  const selectedRecord: AppraisalRecord | null = useMemo(() => {
    if (!selectedId) return null;
    return (
      appraisals.find(
        (r: any) => getId(r) === selectedId,
      ) ?? null
    );
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
        "Could not determine your employee profile. Please log out and in again, or contact HR.",
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
        payload,
      );

      setDisputes((prev) => [created, ...prev]);
      setDisputeFormOpen(false);
      setDisputeReason("");
      setDisputeDetails("");
      setDisputeSuccess(
        "Your concern has been submitted. HR will review it and respond.",
      );
    } catch (err: any) {
      console.error(err);
      setDisputeError(
        err?.message ??
          "Could not submit your concern. Please try again or contact HR.",
      );
    } finally {
      setDisputeSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          My Appraisals
        </h1>
        <p className="text-gray-600 mt-1 text-sm">
          View your finalized ratings, feedback, and development
          notes across appraisal cycles.
        </p>
      </div>

      {loadState === "loading" && (
        <p className="text-sm text-gray-600">
          Loading your appraisals...
        </p>
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
            <CardTitle className="text-base">
              No appraisals yet
            </CardTitle>
            <CardDescription>
              Once your manager completes and HR publishes an
              appraisal, it will appear here.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {appraisals.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-6">
          {/* Left: list / history */}
          <Card className="h-fit">
            <CardHeader>
              <CardTitle className="text-base">
                Appraisal History
              </CardTitle>
              <CardDescription>
                Select an appraisal to see full details.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="divide-y divide-gray-200">
                {appraisals.map((rec, index) => {
                  const id = getId(rec) || `${index}`;
                  const isSelected = id === selectedId;
                  const status = (rec as any).status as
                    | string
                    | undefined;
                  const totalScore = (rec as any).totalScore as
                    | number
                    | undefined;
                  const label = (rec as any)
                    .overallRatingLabel as string | undefined;

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
                              <span className="font-semibold">
                                {label}
                              </span>
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
                    Choose an appraisal on the left to view its
                    details.
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
                      {resolveTemplateName(selectedRecord)} ·{" "}
                      Final rating and feedback
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm text-gray-800">
                    <div className="flex flex-wrap gap-4 text-sm">
                      <div>
                        <span className="text-gray-500 text-xs block">
                          Total Score
                        </span>
                        <span className="font-semibold">
                          {(selectedRecord as any).totalScore ??
                            "-"}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500 text-xs block">
                          Overall Rating
                        </span>
                        <span className="font-semibold">
                          {(selectedRecord as any)
                            .overallRatingLabel || "-"}
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
                          {(selectedRecord as any)
                            .improvementAreas ||
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
                          Checking if you have raised a concern for
                          this appraisal...
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
                                (primaryDispute as any).status,
                              )}
                            </span>
                          </p>
                          <p className="text-xs text-gray-600">
                            Submitted on:{" "}
                            {formatDisputeDate(
                              (primaryDispute as any).createdAt,
                            )}
                          </p>
                          <p className="text-sm text-gray-800 whitespace-pre-line mt-1">
                            {(primaryDispute as any).reason ||
                              (primaryDispute as any).details ||
                              "No description recorded."}
                          </p>
                          {(primaryDispute as any)
                            .resolutionComment && (
                            <p className="text-xs text-gray-700 whitespace-pre-line mt-2">
                              <span className="font-semibold">
                                HR Resolution:
                              </span>{" "}
                              {
                                (primaryDispute as any)
                                  .resolutionComment
                              }
                            </p>
                          )}
                        </div>
                      ) : canRaiseDispute ? (
                        <div className="space-y-2 text-sm text-gray-800">
                          {!disputeFormOpen && (
                            <>
                              <p className="text-xs text-gray-600">
                                If you disagree with this rating,
                                you can raise a concern within 7
                                days of publication. Your concern
                                will be logged for HR to review.
                              </p>
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
                          You cannot raise a dispute for this
                          appraisal (either the 7-day window has
                          passed or the rating is not in a
                          disputable state).
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Criteria breakdown */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      Criteria Breakdown
                    </CardTitle>
                    <CardDescription>
                      Detailed ratings and comments for each
                      criterion.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {ratings.length === 0 ? (
                      <p className="text-sm text-gray-600">
                        No individual criteria recorded for this
                        appraisal.
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
                                <p className="font-semibold">
                                  {r.ratingValue}
                                </p>
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
