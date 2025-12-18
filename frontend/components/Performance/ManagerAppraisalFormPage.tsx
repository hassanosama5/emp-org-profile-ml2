"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/lib/hooks/use-auth";
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
  existingRecord?: AppraisalRecord | null,
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
  scale: RatingScaleDefinition,
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
    Math.floor((normalized - scale.min) / bucketSize),
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
  const managerProfileId =
    (user as any)?.employeeProfileId as string | undefined;

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

  const totalScore = useMemo(
    () => computeTotalScore(ratings),
    [ratings],
  );

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
          existingRecord,
        );

        const withLabels = initialRatings.map((r) => ({
          ...r,
          ratingLabel:
            r.ratingLabel ?? computeRatingLabel(r.ratingValue, tmpl.ratingScale),
        }));

        setRatings(withLabels);
        setManagerSummary(existingRecord?.managerSummary ?? "");
        setStrengths(existingRecord?.strengths ?? "");
        setImprovementAreas(existingRecord?.improvementAreas ?? "");
        setOverallRatingLabel(
          existingRecord?.overallRatingLabel ??
            (totalScore ? `Overall score ${totalScore}` : ""),
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
          : r,
      ),
    );
  };

  const handleChangeComment = (index: number, value: string) => {
    setRatings((prev) =>
      prev.map((r, i) => (i === index ? { ...r, comments: value } : r)),
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
        "Missing manager profile ID. Cannot save appraisal. Please contact admin.",
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
        payload,
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
        "Missing manager profile ID. Cannot submit appraisal. Please contact admin.",
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
        payload,
      );
      setRecord(saved);

      const recordId = saved.id ?? saved._id;
      if (!recordId) {
        throw new Error("Saved record has no id");
      }

      // 2) Call submit endpoint
      const submitted = await submitAppraisalRecordApi(
        String(recordId),
        String(managerProfileId),
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
          className="mt-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1 text-xs font-medium text-gray-800 hover:bg-gray-100"
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
    <div className="p-6 max-w-5xl mx-auto">
      <header className="mb-6 border-b border-gray-200 pb-4">
        <h1 className="text-2xl font-semibold mb-1">{templateName}</h1>
        <p className="text-sm text-gray-600">
          Employee: <span className="font-medium">{employeeName}</span> · Cycle:{" "}
          <span className="font-medium">{cycleName}</span>
        </p>
        {assignment.dueDate && (
          <p className="text-xs text-gray-500 mt-1">
            Due date: {new Date(assignment.dueDate).toLocaleDateString()}
          </p>
        )}
      </header>

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {submitMessage && (
        <div className="mb-4 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
          {submitMessage}
        </div>
      )}

      {/* Rating scale summary */}
      <section className="mb-4 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm">
        <p className="font-medium text-gray-800 mb-1">Rating Scale</p>
        <p className="text-gray-600">
          {template.ratingScale.min} – {template.ratingScale.max} (
          {template.ratingScale.type})
        </p>
        {template.ratingScale.labels &&
          template.ratingScale.labels.length > 0 && (
            <p className="text-gray-600 mt-1 text-xs">
              Labels: {template.ratingScale.labels.join(", ")}
            </p>
          )}
        {totalScore !== undefined && (
          <p className="text-gray-800 mt-2 text-sm">
            Current total score (avg):{" "}
            <span className="font-semibold">{totalScore}</span>
          </p>
        )}
      </section>

      {/* Criteria ratings */}
      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-3">Criteria Ratings</h2>
        <div className="space-y-4">
          {ratings.map((r, index) => (
            <div
              key={r.key}
              className="rounded-md border border-gray-200 px-3 py-3"
            >
              <div className="flex items-center justify-between mb-1">
                <div>
                  <p className="text-sm font-medium text-gray-900">{r.title}</p>
                  <p className="text-xs text-gray-500">
                    Criterion key: {r.key}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={template.ratingScale.min}
                    max={template.ratingScale.max}
                    step={template.ratingScale.step ?? 1}
                    value={r.ratingValue}
                    onChange={(e) =>
                      handleChangeRating(index, Number(e.target.value))
                    }
                    className="w-20 rounded-md border border-gray-300 px-2 py-1 text-sm"
                  />
                  {r.ratingLabel && (
                    <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                      {r.ratingLabel}
                    </span>
                  )}
                </div>
              </div>
              <div className="mt-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Comments / Examples
                </label>
                <textarea
                  rows={2}
                  value={r.comments ?? ""}
                  onChange={(e) => handleChangeComment(index, e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm"
                  placeholder="Add specific examples or feedback here..."
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Overall summary / strengths / improvements */}
      <section className="mb-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-800 mb-1">
            Overall Rating Label (optional)
          </label>
          <input
            type="text"
            value={overallRatingLabel}
            onChange={(e) => setOverallRatingLabel(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            placeholder="e.g., Exceeds Expectations, Meets Expectations, etc."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-800 mb-1">
            Manager Summary
          </label>
          <textarea
            rows={3}
            value={managerSummary}
            onChange={(e) => setManagerSummary(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            placeholder="Summarize the employee's performance over the appraisal period."
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-800 mb-1">
              Key Strengths
            </label>
            <textarea
              rows={3}
              value={strengths}
              onChange={(e) => setStrengths(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              placeholder="Highlight core strengths and achievements."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-800 mb-1">
              Improvement Areas / Development Plan
            </label>
            <textarea
              rows={3}
              value={improvementAreas}
              onChange={(e) => setImprovementAreas(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              placeholder="Note areas for improvement and suggested development actions."
            />
          </div>
        </div>
      </section>

      {/* Actions */}
      <section className="flex items-center justify-between border-t border-gray-200 pt-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-100"
        >
          Back
        </button>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={saving}
            className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-100 disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save Draft"}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {saving ? "Submitting..." : "Submit to HR"}
          </button>
        </div>
      </section>
    </div>
  );
};
