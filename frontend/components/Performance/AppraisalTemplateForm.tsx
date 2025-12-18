"use client";

import React, { useEffect, useState } from "react";
import {
  AppraisalTemplate,
  APPRAISAL_TEMPLATE_TYPES,
  RATING_SCALE_TYPES,
  AppraisalTemplateType,
  AppraisalRatingScaleType,
  RatingScaleDefinition,
  EvaluationCriterion,
  CreateAppraisalTemplateInput,
  UpdateAppraisalTemplateInput,
} from "./performanceTemplates";

interface AppraisalTemplateFormProps {
  mode: "create" | "edit";
  initialValue?: AppraisalTemplate;
  onCreate?: (input: CreateAppraisalTemplateInput) => Promise<void> | void;
  onUpdate?: (input: UpdateAppraisalTemplateInput) => Promise<void> | void;
  onCancel: () => void;
  isSubmitting: boolean;
}

export const AppraisalTemplateForm: React.FC<AppraisalTemplateFormProps> = ({
  mode,
  initialValue,
  onCreate,
  onUpdate,
  onCancel,
  isSubmitting,
}) => {
  const [name, setName] = useState(initialValue?.name ?? "");
  const [templateType, setTemplateType] = useState<AppraisalTemplateType>(
    initialValue?.templateType ?? "ANNUAL",
  );
  const [description, setDescription] = useState(
    initialValue?.description ?? "",
  );
  const [ratingType, setRatingType] = useState<AppraisalRatingScaleType>(
    initialValue?.ratingScale.type ?? "FIVE_POINT",
  );
  const [min, setMin] = useState(initialValue?.ratingScale.min ?? 1);
  const [max, setMax] = useState(initialValue?.ratingScale.max ?? 5);
  const [labels, setLabels] = useState(
    initialValue?.ratingScale.labels?.join(", ") ?? "",
  );

  const [criteria, setCriteria] = useState<EvaluationCriterion[]>(
    initialValue?.criteria ?? [
      {
        key: "criterion_1",
        title: "Quality of Work",
        description: "",
        weight: 0,
        maxScore: max,
        required: true,
      },
    ],
  );

  useEffect(() => {
    if (initialValue && mode === "edit") {
      setName(initialValue.name);
      setTemplateType(initialValue.templateType);
      setDescription(initialValue.description ?? "");
      setRatingType(initialValue.ratingScale.type);
      setMin(initialValue.ratingScale.min);
      setMax(initialValue.ratingScale.max);
      setLabels(initialValue.ratingScale.labels?.join(", ") ?? "");
      setCriteria(initialValue.criteria);
    }
  }, [initialValue, mode]);

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  // Basic client-side validation

  // 1) Remove completely empty criteria (no title)
  const cleanedCriteria = criteria.filter(
    (c) => c.title.trim().length > 0,
  );

  if (cleanedCriteria.length === 0) {
    alert("Please define at least one evaluation criterion.");
    return;
  }

  // 2) Check weight sum rule (0 or 100)
  const totalWeight = cleanedCriteria.reduce(
    (sum, c) => sum + (c.weight ?? 0),
    0,
  );

  if (totalWeight !== 0 && totalWeight !== 100) {
    alert("Sum of criteria weights must be either 0 or 100.");
    return;
  }

  const ratingScale: RatingScaleDefinition = {
    type: ratingType,
    min,
    max,
    labels: labels
      .split(",")
      .map((l) => l.trim())
      .filter(Boolean),
  };

  // Strip UI-only fields before sending to backend
  const apiCriteria = cleanedCriteria.map((c) => ({
    key: c.key,
    title: c.title,
    weight: c.weight,
    maxScore: c.maxScore,
    required: c.required,
  }));

  if (mode === "create" && onCreate) {
    const payload: CreateAppraisalTemplateInput = {
      name,
      templateType,
      description,
      ratingScale,
      criteria: apiCriteria,
    };
    await onCreate(payload);
  } else if (mode === "edit" && onUpdate) {
    const payload: UpdateAppraisalTemplateInput = {
      description,
      ratingScale,
      criteria: apiCriteria,
    };
    await onUpdate(payload);
  }
};


  const updateCriterion = (
    index: number,
    patch: Partial<EvaluationCriterion>,
  ) => {
    setCriteria((prev) =>
      prev.map((c, i) => (i === index ? { ...c, ...patch } : c)),
    );
  };

  const addCriterion = () => {
    setCriteria((prev) => [
      ...prev,
      {
        key: `criterion_${prev.length + 1}`,
        title: `Criterion ${prev.length + 1}`,
        description: "",
        weight: 0,
        maxScore: max,
        required: false,
      },
    ]);
  };

  const removeCriterion = (index: number) => {
    setCriteria((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        border: "1px solid #e5e7eb",
        padding: "1rem",
        borderRadius: "0.75rem",
        marginTop: "1rem",
      }}
    >
      <h2 style={{ fontSize: "1.25rem", marginBottom: "0.75rem" }}>
        {mode === "create" ? "Create Appraisal Template" : "Edit Template"}
      </h2>

      <div style={{ display: "grid", gap: "0.75rem" }}>
        <label>
          Name
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ width: "100%", padding: "0.5rem" }}
          />
        </label>

        <label>
          Type
          <select
            value={templateType}
            onChange={(e) =>
              setTemplateType(e.target.value as AppraisalTemplateType)
            }
            style={{ width: "100%", padding: "0.5rem" }}
          >
            {APPRAISAL_TEMPLATE_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>

        <label>
          Description
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            style={{ width: "100%", padding: "0.5rem" }}
          />
        </label>

        <div style={{ display: "flex", gap: "0.75rem" }}>
          <label style={{ flex: 1 }}>
            Rating Type
            <select
              value={ratingType}
              onChange={(e) =>
                setRatingType(e.target.value as AppraisalRatingScaleType)
            }
              style={{ width: "100%", padding: "0.5rem" }}
            >
              {RATING_SCALE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label style={{ flex: 1 }}>
            Min
            <input
              type="number"
              value={min}
              onChange={(e) => setMin(Number(e.target.value))}
              style={{ width: "100%", padding: "0.5rem" }}
            />
          </label>
          <label style={{ flex: 1 }}>
            Max
            <input
              type="number"
              value={max}
              onChange={(e) => setMax(Number(e.target.value))}
              style={{ width: "100%", padding: "0.5rem" }}
            />
          </label>
        </div>

        <label>
          Labels (comma separated, optional)
          <input
            value={labels}
            onChange={(e) => setLabels(e.target.value)}
            placeholder="Poor, Fair, Good, Very Good, Excellent"
            style={{ width: "100%", padding: "0.5rem" }}
          />
        </label>

        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "0.5rem",
            }}
          >
            <span>Criteria</span>
            <button type="button" onClick={addCriterion}>
              + Add Criterion
            </button>
          </div>
          <div style={{ display: "grid", gap: "0.5rem" }}>
            {criteria.map((c, index) => (
              <div
                key={c.key}
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: "0.5rem",
                  padding: "0.5rem",
                }}
              >
                <label>
                  Title
                  <input
                    value={c.title}
                    onChange={(e) =>
                      updateCriterion(index, { title: e.target.value })
                    }
                    style={{ width: "100%", padding: "0.25rem" }}
                  />
                </label>
                <label>
                  Description (UI only)
                  <textarea
                    value={c.description ?? ""}
                    onChange={(e) =>
                      updateCriterion(index, { description: e.target.value })
                    }
                    rows={2}
                    style={{ width: "100%", padding: "0.25rem" }}
                  />
                </label>
                <label>
                  Weight (%)
                  <input
                    type="number"
                    value={c.weight ?? 0}
                    onChange={(e) =>
                      updateCriterion(index, {
                        weight: Number(e.target.value),
                      })
                    }
                    style={{ width: "100%", padding: "0.25rem" }}
                  />
                </label>
                <label>
                  Required?
                  <input
                    type="checkbox"
                    checked={c.required ?? false}
                    onChange={(e) =>
                      updateCriterion(index, { required: e.target.checked })
                    }
                    style={{ marginLeft: "0.5rem" }}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => removeCriterion(index)}
                  style={{ marginTop: "0.25rem", fontSize: "0.85rem" }}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div
        style={{
          marginTop: "1rem",
          display: "flex",
          justifyContent: "flex-end",
          gap: "0.5rem",
        }}
      >
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          style={{
            padding: "0.5rem 1rem",
            borderRadius: "0.5rem",
            border: "none",
            background: "#2563eb",
            color: "#fff",
            cursor: "pointer",
          }}
        >
          {isSubmitting
            ? "Saving..."
            : mode === "create"
            ? "Create Template"
            : "Save Changes"}
        </button>
      </div>
    </form>
  );
};