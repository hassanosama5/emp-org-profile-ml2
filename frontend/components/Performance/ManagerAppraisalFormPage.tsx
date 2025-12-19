"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/use-auth";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/shared/ui/Card";
import { Button } from "@/components/shared/ui/Button";
import {
  AppraisalTemplate,
  RatingScaleDefinition,
} from "./performanceTemplates";
import { fetchAppraisalTemplateById } from "@/lib/api/performance/Api/performanceTemplatesApi";
import { fetchManagerAssignments } from "@/lib/api/performance/Api/performanceAssignmentsApi";
import {
  AppraisalRecord,
  RatingEntry,
  UpsertAppraisalRecordInput,
} from "./performanceRecords";
import {
  upsertAppraisalRecordApi,
  submitAppraisalRecordApi,
  fetchAppraisalById,
  fetchTimeManagementSummary,
} from "@/lib/api/performance/Api/performanceAppraisalsApi";

// Minimal local type for assignment (we only use these fields)
type MinimalAssignment = {
  id?: string;
  _id?: string;
  cycleId?: any;
  templateId?: any;
  employeeProfileId?: any;
  managerProfileId?: any;
  latestAppraisalId?: any;
  status?: string;
  dueDate?: string;
};

type LoadState = "idle" | "loading" | "loaded" | "error";

interface ManagerAppraisalFormPageProps {
  assignmentId: string;
}

function getId(value: any): string | undefined {
  if (!value) return undefined;
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    return value.id || value._id || value.toString?.();
  }
  return String(value);
}

function buildInitialRatingsFromTemplate(
  template: AppraisalTemplate,
  existingRecord?: AppraisalRecord | null
): RatingEntry[] {
  // If we already have a record, reuse its ratings
  if (
    existingRecord &&
    existingRecord.ratings &&
    existingRecord.ratings.length > 0
  ) {
    return existingRecord.ratings.map((r) => ({
      key: r.key,
      title: r.title,
      ratingValue: r.ratingValue,
      ratingLabel: r.ratingLabel,
      weightedScore: r.weightedScore,
      comments: r.comments ?? "",
    }));
  }

  // Otherwise, one rating entry per criterion
  const { min, max } = template.ratingScale;
  const defaultValue = Math.round((min + max) / 2);

  return template.criteria.map((c) => ({
    key: c.key,
    title: c.title,
    ratingValue: defaultValue,
    comments: "",
  }));
}

function computeRatingLabel(
  value: number,
  scale: RatingScaleDefinition
): string | undefined {
  const labels = scale.labels || [];
  if (!labels.length) return undefined;

  const range = scale.max - scale.min + 1;
  const normalized = Math.min(Math.max(value, scale.min), scale.max);

  // If labels match each discrete score
  if (labels.length === range) {
    const idx = normalized - scale.min;
    return labels[idx] ?? labels[labels.length - 1];
  }

  // Otherwise, bucket the value across labels
  const bucketSize = range / labels.length;
  const index = Math.min(
    labels.length - 1,
    Math.floor((normalized - scale.min) / bucketSize)
  );
  return labels[index];
}

function computeTotalScore(ratings: RatingEntry[]): number | undefined {
  if (!ratings.length) return undefined;
  const sum = ratings.reduce((acc, r) => acc + (r.ratingValue || 0), 0);
  return parseFloat((sum / ratings.length).toFixed(2)); // simple average
}

export const ManagerAppraisalFormPage: React.FC<
  ManagerAppraisalFormPageProps
> = ({ assignmentId }) => {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  // ✅ Prefer EmployeeProfile Mongo _id from JWT / /me response
  // Try multiple possible fields: id, employeeProfileId, _id, etc.
  const managerProfileId = useMemo(() => {
    if (!user) return null;

    const candidate =
      (user as any).id ||
      (user as any).employeeProfileId ||
      (user as any)._id ||
      (user as any).employeeProfile?._id ||
      (user as any).employeeProfileIdString ||
      null;

    if (typeof window !== "undefined") {
      console.log("[ManagerAppraisalForm] user =", user);
      console.log(
        "[ManagerAppraisalForm] derived managerProfileId =",
        candidate
      );
    }

    return candidate as string | null;
  }, [user]);

  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [error, setError] = useState<string | null>(null);

  const [assignment, setAssignment] = useState<MinimalAssignment | null>(null);
  const [template, setTemplate] = useState<AppraisalTemplate | null>(null);
  const [record, setRecord] = useState<AppraisalRecord | null>(null);

  const [ratings, setRatings] = useState<RatingEntry[]>([]);
  const [managerSummary, setManagerSummary] = useState("");
  const [strengths, setStrengths] = useState("");
  const [improvementAreas, setImprovementAreas] = useState("");
  const [overallRatingLabel, setOverallRatingLabel] = useState("");
  const [saving, setSaving] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const [timeManagementData, setTimeManagementData] = useState<any>(null);
  const [loadingTMData, setLoadingTMData] = useState(false);

  const totalScore = useMemo(() => computeTotalScore(ratings), [ratings]);

  const employeeName = useMemo(() => {
    const ep = assignment?.employeeProfileId;
    if (!ep || typeof ep === "string") return "Employee";
    return ep.fullName || ep.name || ep.displayName || "Employee";
  }, [assignment]);

  const cycleName = useMemo(() => {
    const c = assignment?.cycleId;
    if (!c) return "Cycle";
    if (typeof c === "string") return c;
    return c.name || "Cycle";
  }, [assignment]);

  const templateName = template?.name || "Appraisal Template";

  // Load assignment, template, and existing record
  useEffect(() => {
    if (authLoading || !managerProfileId) return;

    const doLoad = async () => {
      try {
        setLoadState("loading");
        setError(null);

        // 1) Load all assignments for this manager
        const assignments = await fetchManagerAssignments(managerProfileId);
        const found = assignments.find((a: any) => {
          const aid = a.id ?? a._id;
          return String(aid) === String(assignmentId);
        });

        if (!found) {
          setError("Assignment not found or not assigned to you.");
          setLoadState("error");
          return;
        }

        setAssignment(found);

        // 2) Resolve templateId
        const templateId = getId(found.templateId);
        if (!templateId) {
          setError("Assignment is missing template information.");
          setLoadState("error");
          return;
        }

        const tmpl = await fetchAppraisalTemplateById(templateId);
        setTemplate(tmpl);

        // 3) If there's an existing appraisal record, load it
        let existingRecord: AppraisalRecord | null = null;
        const latestId = getId(found.latestAppraisalId);
        if (latestId) {
          try {
            existingRecord = await fetchAppraisalById(latestId);
            setRecord(existingRecord);
          } catch (err) {
            console.warn("Failed to load existing appraisal record:", err);
          }
        }

        // 4) Initialize form fields from template + existing record
        const initialRatings = buildInitialRatingsFromTemplate(
          tmpl,
          existingRecord
        );

        const withLabels = initialRatings.map((r) => ({
          ...r,
          ratingLabel:
            r.ratingLabel ??
            computeRatingLabel(r.ratingValue, tmpl.ratingScale),
        }));

        setRatings(withLabels);
        setManagerSummary(existingRecord?.managerSummary ?? "");
        setStrengths(existingRecord?.strengths ?? "");
        setImprovementAreas(existingRecord?.improvementAreas ?? "");
        setOverallRatingLabel(
          existingRecord?.overallRatingLabel ??
            (totalScore ? `Overall score ${totalScore}` : "")
        );

        setLoadState("loaded");
      } catch (err: any) {
        console.error(err);
        setError(err?.message ?? "Failed to load appraisal form");
        setLoadState("error");
      }
    };

    void doLoad();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, managerProfileId, assignmentId]);

  // Load time management data when assignment and cycle are available (REQ-AE-03)
  useEffect(() => {
    if (!assignment || loadState !== "loaded") return;

    const cycle = assignment.cycleId;
    const employeeId = getId(assignment.employeeProfileId);

    if (!cycle || !employeeId) return;

    // Extract cycle dates
    const startDate =
      typeof cycle === "object" && cycle.startDate
        ? new Date(cycle.startDate).toISOString().split("T")[0]
        : null;
    const endDate =
      typeof cycle === "object" && cycle.endDate
        ? new Date(cycle.endDate).toISOString().split("T")[0]
        : null;

    if (!startDate || !endDate) {
      console.warn("Cycle dates not available for time management data");
      return;
    }

    const loadTMData = async () => {
      try {
        setLoadingTMData(true);
        const data = await fetchTimeManagementSummary(
          employeeId,
          startDate,
          endDate
        );
        // Only set data if we got valid data (not just error message)
        if (data && !data.error) {
          setTimeManagementData(data);
        } else {
          // If there's an error field, it means TM data is not available
          // Set empty data so the UI doesn't show loading forever
          setTimeManagementData({
            period: { startDate, endDate, totalDays: 0 },
            attendance: {
              totalWorkHours: 0,
              totalWorkMinutes: 0,
              averageHoursPerDay: 0,
            },
            punctuality: {
              missedPunches: 0,
              lateArrivals: 0,
              earlyDepartures: 0,
              absences: 0,
              punctualityScore: 0,
            },
            records: [],
            exceptions: [],
          });
        }
      } catch (err: any) {
        console.warn(
          "Failed to load time management data:",
          err?.message || err
        );
        // Set empty data on error so UI doesn't show loading forever
        setTimeManagementData({
          period: { startDate, endDate, totalDays: 0 },
          attendance: {
            totalWorkHours: 0,
            totalWorkMinutes: 0,
            averageHoursPerDay: 0,
          },
          punctuality: {
            missedPunches: 0,
            lateArrivals: 0,
            earlyDepartures: 0,
            absences: 0,
            punctualityScore: 0,
          },
          records: [],
          exceptions: [],
        });
      } finally {
        setLoadingTMData(false);
      }
    };

    void loadTMData();
  }, [assignment, loadState]);

  const handleChangeRating = (index: number, value: number) => {
    if (!template) return;
    setRatings((prev) =>
      prev.map((r, i) =>
        i === index
          ? {
              ...r,
              ratingValue: value,
              ratingLabel: computeRatingLabel(value, template.ratingScale),
            }
          : r
      )
    );
  };

  const handleChangeComment = (index: number, value: string) => {
    setRatings((prev) =>
      prev.map((r, i) => (i === index ? { ...r, comments: value } : r))
    );
  };

  const buildPayload = (): UpsertAppraisalRecordInput => {
    return {
      ratings: ratings.map((r) => ({
        key: r.key,
        title: r.title,
        ratingValue: r.ratingValue,
        ratingLabel: r.ratingLabel,
        comments: r.comments,
      })),
      totalScore: totalScore,
      overallRatingLabel: overallRatingLabel || undefined,
      managerSummary: managerSummary || undefined,
      strengths: strengths || undefined,
      improvementAreas: improvementAreas || undefined,
    };
  };

  const handleSaveDraft = async () => {
    if (!managerProfileId) {
      setError(
        "Missing manager profile ID. Cannot save appraisal. Please contact admin."
      );
      return;
    }

    try {
      setSaving(true);
      setSubmitMessage(null);
      setError(null);

      const payload = buildPayload();
      const saved = await upsertAppraisalRecordApi(
        assignmentId,
        String(managerProfileId),
        payload
      );

      setRecord(saved);
      setSubmitMessage("Draft saved successfully.");
    } catch (err: any) {
      console.error(err);
      setError(err?.message ?? "Failed to save appraisal draft");
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!managerProfileId) {
      setError(
        "Missing manager profile ID. Cannot submit appraisal. Please contact admin."
      );
      return;
    }

    try {
      setSaving(true);
      setSubmitMessage(null);
      setError(null);

      // 1) Ensure we have the latest saved draft
      const payload = buildPayload();
      const saved = await upsertAppraisalRecordApi(
        assignmentId,
        String(managerProfileId),
        payload
      );
      setRecord(saved);

      const recordId = saved.id ?? saved._id;
      if (!recordId) {
        throw new Error("Saved record has no id");
      }

      // 2) Call submit endpoint
      const submitted = await submitAppraisalRecordApi(
        String(recordId),
        String(managerProfileId)
      );
      setRecord(submitted);
      setSubmitMessage("Appraisal submitted successfully to HR.");
    } catch (err: any) {
      console.error(err);
      setError(err?.message ?? "Failed to submit appraisal");
    } finally {
      setSaving(false);
    }
  };

  // =========================
  //     RENDER LOGIC
  // =========================

  if (authLoading) {
    return <p className="p-4">Loading user...</p>;
  }

  // 🔴 Same “missing profile id” UX as ManagerAssignmentsPage
  if (!managerProfileId) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold mb-3">Manager Appraisal Form</h1>
        <p className="mb-3 text-sm text-red-500">
          Could not determine your employee profile ID from the logged-in user.
          The backend should include the EmployeeProfile Mongo <code>_id</code>{" "}
          in the JWT (for example as <code>employeeProfileId</code>) so we can
          load and save appraisal forms assigned to you.
        </p>

        <div className="rounded-md bg-slate-900 text-slate-100 text-xs p-4 overflow-auto">
          <div className="font-semibold mb-2">Current user object:</div>
          <pre className="whitespace-pre-wrap break-all">
            {JSON.stringify(user, null, 2)}
          </pre>
        </div>
      </div>
    );
  }

  if (loadState === "loading") {
    return <p className="p-4">Loading appraisal form...</p>;
  }

  if (loadState === "error") {
    return (
      <div className="p-4">
        <h1 className="text-xl font-semibold mb-2">Manager Appraisal Form</h1>
        <p className="text-red-600 text-sm">{error}</p>
        <button
          type="button"
          onClick={() => router.back()}
          className="mt-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1 text-xs font-medium text-white-800 hover:bg-gray-100"
        >
          Go Back
        </button>
      </div>
    );
  }

  if (!template || !assignment) {
    return (
      <div className="p-4">
        <h1 className="text-xl font-semibold mb-2">Manager Appraisal Form</h1>
        <p className="text-red-600 text-sm">
          Could not load template or assignment details.
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8 max-w-5xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white-900">{templateName}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-white-600">
          <span>
            Employee:{" "}
            <span className="font-medium text-white-900">{employeeName}</span>
          </span>
          <span className="text-white-300">•</span>
          <span>
            Cycle:{" "}
            <span className="font-medium text-white-900">{cycleName}</span>
          </span>
          {assignment.dueDate && (
            <>
              <span className="text-white-300">•</span>
              <span>
                Due:{" "}
                <span className="font-medium text-white-900">
                  {new Date(assignment.dueDate).toLocaleDateString()}
                </span>
              </span>
            </>
          )}
        </div>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <Card className="border-red-200 bg-red-50 mb-6">
          <CardContent className="pt-6">
            <p className="text-sm text-red-800">{error}</p>
          </CardContent>
        </Card>
      )}

      {submitMessage && (
        <Card className="border-green-200 bg-green-50 mb-6">
          <CardContent className="pt-6">
            <p className="text-sm text-green-800">{submitMessage}</p>
          </CardContent>
        </Card>
      )}

      {/* Time Management Data (REQ-AE-03) */}
      {timeManagementData && timeManagementData.period && (
        <Card className="mb-6 border-purple-200 bg-purple-50">
          <CardHeader>
            <CardTitle className="text-base">Time Management Summary</CardTitle>
            <CardDescription>
              Attendance and punctuality data for appraisal period
              {timeManagementData.period.totalDays === 0 && (
                <span className="text-xs text-gray-500 ml-2">
                  (No attendance data available for this period)
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-gray-600 text-xs">Total Work Hours</p>
                <p className="text-lg font-semibold text-gray-900">
                  {timeManagementData.attendance?.totalWorkHours || 0}h
                </p>
              </div>
              <div>
                <p className="text-gray-600 text-xs">Average Hours/Day</p>
                <p className="text-lg font-semibold text-gray-900">
                  {timeManagementData.attendance?.averageHoursPerDay || 0}h
                </p>
              </div>
              <div>
                <p className="text-gray-600 text-xs">Punctuality Score</p>
                <p className="text-lg font-semibold text-gray-900">
                  {timeManagementData.punctuality?.punctualityScore || 0}%
                </p>
              </div>
              <div>
                <p className="text-gray-600 text-xs">Missed Punches</p>
                <p className="text-lg font-semibold text-gray-900">
                  {timeManagementData.punctuality?.missedPunches || 0}
                </p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-purple-200 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div>
                <p className="text-gray-600">Late Arrivals</p>
                <p className="font-medium text-gray-900">
                  {timeManagementData.punctuality?.lateArrivals || 0}
                </p>
              </div>
              <div>
                <p className="text-gray-600">Early Departures</p>
                <p className="font-medium text-gray-900">
                  {timeManagementData.punctuality?.earlyDepartures || 0}
                </p>
              </div>
              <div>
                <p className="text-gray-600">Absences</p>
                <p className="font-medium text-gray-900">
                  {timeManagementData.punctuality?.absences || 0}
                </p>
              </div>
              <div>
                <p className="text-gray-600">Total Days</p>
                <p className="font-medium text-gray-900">
                  {timeManagementData.period?.totalDays || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {loadingTMData && (
        <Card className="mb-6 border-purple-200 bg-purple-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
              <span>Loading time management data...</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rating Scale Info */}
      <Card className="mb-6 border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-base">Rating Scale</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p className="text-gray-700">
              Range:{" "}
              <span className="font-semibold text-gray-900">
                {template.ratingScale.min} – {template.ratingScale.max}
              </span>{" "}
              ({template.ratingScale.type})
            </p>
            {template.ratingScale.labels &&
              template.ratingScale.labels.length > 0 && (
                <p className="text-gray-600">
                  Labels:{" "}
                  <span className="font-medium">
                    {template.ratingScale.labels.join(", ")}
                  </span>
                </p>
              )}
            {totalScore !== undefined && (
              <p className="text-gray-900 font-semibold pt-2 border-t border-blue-200">
                Current Total Score (Average): {totalScore}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Criteria Ratings */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Criteria Ratings</CardTitle>
          <CardDescription>
            Rate each criterion and provide specific examples or feedback
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {ratings.map((r, index) => (
              <Card key={r.key} className="border-gray-200">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold text-white-900 mb-1">
                        {r.title}
                      </h3>
                      <p className="text-xs text-gray-500">
                        Criterion: {r.key}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col">
                        <label className="text-xs text-gray-600 mb-1">
                          Rating
                        </label>
                        <input
                          type="number"
                          min={template.ratingScale.min}
                          max={template.ratingScale.max}
                          step={template.ratingScale.step ?? 1}
                          value={r.ratingValue}
                          onChange={(e) =>
                            handleChangeRating(index, Number(e.target.value))
                          }
                          className="w-24 rounded-md border border-gray-300 px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      {r.ratingLabel && (
                        <div className="flex flex-col justify-end">
                          <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-800">
                            {r.ratingLabel}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Comments / Examples
                    </label>
                    <textarea
                      rows={3}
                      value={r.comments ?? ""}
                      onChange={(e) =>
                        handleChangeComment(index, e.target.value)
                      }
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Add specific examples or feedback here..."
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Overall Summary and Feedback */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Overall Summary & Feedback</CardTitle>
          <CardDescription>
            Provide an overall assessment, strengths, and development
            recommendations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Overall Rating Label (optional)
            </label>
            <input
              type="text"
              value={overallRatingLabel}
              onChange={(e) => setOverallRatingLabel(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., Exceeds Expectations, Meets Expectations, etc."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Manager Summary
            </label>
            <textarea
              rows={4}
              value={managerSummary}
              onChange={(e) => setManagerSummary(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Summarize the employee's performance over the appraisal period."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Key Strengths
              </label>
              <textarea
                rows={4}
                value={strengths}
                onChange={(e) => setStrengths(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Highlight core strengths and achievements."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Improvement Areas / Development Plan
              </label>
              <textarea
                rows={4}
                value={improvementAreas}
                onChange={(e) => setImprovementAreas(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Note areas for improvement and suggested development actions."
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <Button onClick={() => router.back()} variant="outline">
              ← Back
            </Button>
            <div className="flex gap-3">
              <Button
                onClick={handleSaveDraft}
                disabled={saving}
                variant="outline"
                isLoading={saving}
              >
                Save Draft
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={saving}
                variant="primary"
                isLoading={saving}
              >
                Submit to HR
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
