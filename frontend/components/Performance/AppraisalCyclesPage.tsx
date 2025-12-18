// frontend/components/Performance/AppraisalCyclesPage.tsx

"use client";

import React, { useEffect, useState } from "react";
import {
  AppraisalCycle,
  AppraisalCycleStatus,
  CreateAppraisalCycleInput,
  CycleAssignment,
  CycleTemplateAssignment,
  CycleProgressSummary,
} from "./performanceCycles";
import {
  fetchAppraisalCycles,
  createAppraisalCycle,
  activateAppraisalCycle,
  publishAppraisalCycle,
  closeAppraisalCycle,
  archiveAppraisalCycle,
  fetchCycleProgress,
  sendCycleRemindersApi,
} from "@/lib/api/performance/Api/performanceCyclesApi";
import {
  AppraisalTemplate,
  APPRAISAL_TEMPLATE_TYPES,
  AppraisalTemplateType,
} from "./performanceTemplates";
import { fetchAppraisalTemplates } from "@/lib/api/performance/Api/performanceTemplatesApi";

type FormMode = "none" | "create";

interface TemplateAssignmentFormRow {
  templateId: string;
  departmentIdsCsv: string; // comma-separated department ids
}

interface AssignmentFormRow {
  employeeProfileId: string;
  managerProfileId: string;
  departmentId: string;
  positionId: string;
  templateId: string;
  dueDate: string;
}

export const AppraisalCyclesPage: React.FC = () => {
  const [cycles, setCycles] = useState<AppraisalCycle[]>([]);
  const [templates, setTemplates] = useState<AppraisalTemplate[]>([]);

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [formMode, setFormMode] = useState<FormMode>("none");

  // ---------- Step 4 state (progress + reminders) ----------
  const [selectedCycleId, setSelectedCycleId] = useState<string | null>(null);
  const [progressLoading, setProgressLoading] = useState(false);
  const [cycleProgress, setCycleProgress] =
    useState<CycleProgressSummary | null>(null);
  const [reminderMessage, setReminderMessage] = useState<string | null>(null);

  // Form state for creating a cycle
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [cycleType, setCycleType] =
    useState<AppraisalTemplateType>("ANNUAL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [managerDueDate, setManagerDueDate] = useState("");
  const [employeeAckDueDate, setEmployeeAckDueDate] = useState("");

  const [templateRows, setTemplateRows] =
    useState<TemplateAssignmentFormRow[]>([
      { templateId: "", departmentIdsCsv: "" },
    ]);

  const [assignmentRows, setAssignmentRows] =
    useState<AssignmentFormRow[]>([
      {
        employeeProfileId: "",
        managerProfileId: "",
        departmentId: "",
        positionId: "",
        templateId: "",
        dueDate: "",
      },
    ]);

  // ---------- helpers ----------

  const resetForm = () => {
    setName("");
    setDescription("");
    setCycleType("ANNUAL");
    setStartDate("");
    setEndDate("");
    setManagerDueDate("");
    setEmployeeAckDueDate("");
    setTemplateRows([{ templateId: "", departmentIdsCsv: "" }]);
    setAssignmentRows([
      {
        employeeProfileId: "",
        managerProfileId: "",
        departmentId: "",
        positionId: "",
        templateId: "",
        dueDate: "",
      },
    ]);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [cycleData, templateData] = await Promise.all([
        fetchAppraisalCycles(),
        fetchAppraisalTemplates(),
      ]);
      setCycles(cycleData);
      setTemplates(templateData);
    } catch (err: any) {
      console.error(err);
      setError(err?.message ?? "Failed to load cycles");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const openCreateForm = () => {
    resetForm();
    setFormMode("create");
  };

  const closeForm = () => {
    resetForm();
    setFormMode("none");
  };

  // ---------- create cycle ----------

  const handleCreate = async () => {
    // Basic validation mirroring backend rules
    if (!name.trim()) {
      alert("Cycle name is required.");
      return;
    }
    if (!startDate || !endDate) {
      alert("Start and end dates are required.");
      return;
    }
    if (new Date(startDate) >= new Date(endDate)) {
      alert("Start date must be before end date.");
      return;
    }

    // Build templateAssignments DTO
    const templateAssignments: CycleTemplateAssignment[] = templateRows
      .map((row) => ({
        templateId: row.templateId.trim(),
        departmentIds: row.departmentIdsCsv
          .split(",")
          .map((d) => d.trim())
          .filter(Boolean),
      }))
      .filter((t) => t.templateId && t.departmentIds.length > 0);

    if (templateAssignments.length === 0) {
      alert(
        "Please add at least one template assignment with a template and at least one department id.",
      );
      return;
    }

    // Build assignments DTO
    const assignments: CycleAssignment[] = assignmentRows
      .map((row) => ({
        employeeProfileId: row.employeeProfileId.trim(),
        managerProfileId: row.managerProfileId.trim(),
        departmentId: row.departmentId.trim(),
        positionId: row.positionId.trim() || undefined,
        templateId: row.templateId.trim(),
        dueDate: row.dueDate.trim() || undefined,
      }))
      .filter(
        (a) =>
          a.employeeProfileId &&
          a.managerProfileId &&
          a.departmentId &&
          a.templateId,
      );

    if (assignments.length === 0) {
      alert(
        "Please add at least one assignment with employee, manager, department, and template.",
      );
      return;
    }

    const payload: CreateAppraisalCycleInput = {
      name,
      description: description.trim() || undefined,
      cycleType,
      startDate,
      endDate,
      managerDueDate: managerDueDate || undefined,
      employeeAcknowledgementDueDate:
        employeeAckDueDate || undefined,
      templateAssignments,
      assignments,
    };

    try {
      setSaving(true);
      setError(null);
      const created = await createAppraisalCycle(payload);
      setCycles((prev) => [...prev, created]);
      closeForm();
    } catch (err: any) {
      console.error(err);
      setError(err?.message ?? "Failed to create cycle");
    } finally {
      setSaving(false);
    }
  };

  // ---------- status actions ----------

  const updateCycleInState = (updated: AppraisalCycle) => {
    const id = updated.id ?? updated._id;
    setCycles((prev) =>
      prev.map((c) => ((c.id ?? c._id) === id ? updated : c)),
    );
  };

  const withStatusAction =
    (
      fn: (id: string) => Promise<AppraisalCycle>,
      label: string,
    ) =>
    async (cycle: AppraisalCycle) => {
      const id = cycle.id ?? cycle._id;
      if (!id) {
        console.error("Cycle has no id/_id");
        return;
      }
      const ok = window.confirm(
        `${label} cycle "${cycle.name}"?`,
      );
      if (!ok) return;

      try {
        setSaving(true);
        setError(null);
        const updated = await fn(id);
        updateCycleInState(updated);
      } catch (err: any) {
        console.error(err);
        setError(err?.message ?? `Failed to ${label.toLowerCase()} cycle`);
      } finally {
        setSaving(false);
      }
    };

  const handleActivate = withStatusAction(
    activateAppraisalCycle,
    "Activate",
  );
  const handlePublish = withStatusAction(
    publishAppraisalCycle,
    "Publish",
  );
  const handleClose = withStatusAction(
    closeAppraisalCycle,
    "Close",
  );
  const handleArchive = withStatusAction(
    archiveAppraisalCycle,
    "Archive",
  );

  // ---------- Step 4: progress & reminders ----------

  const handleViewProgress = async (cycle: AppraisalCycle) => {
    const id = cycle.id ?? cycle._id;
    if (!id) {
      console.error("Cycle has no id/_id");
      return;
    }

    setSelectedCycleId(String(id));
    setProgressLoading(true);
    setError(null);
    setReminderMessage(null);

    try {
      const data = await fetchCycleProgress(String(id));
      setCycleProgress(data);
    } catch (err: any) {
      console.error(err);
      setCycleProgress(null);
      setError(
        err?.message ?? "Failed to load cycle progress overview",
      );
    } finally {
      setProgressLoading(false);
    }
  };

  const handleSendReminders = async () => {
    if (!selectedCycleId) return;
    try {
      setSaving(true);
      setError(null);
      setReminderMessage(null);

      const res = await sendCycleRemindersApi(selectedCycleId);
      setReminderMessage(
        `Reminder queued: ${res.pendingCount} pending assignments in cycle "${res.cycleName}".`,
      );
    } catch (err: any) {
      console.error(err);
      setError(err?.message ?? "Failed to send reminders");
    } finally {
      setSaving(false);
    }
  };

  // ---------- rendering helpers ----------

  const formatDate = (value?: string) => {
    if (!value) return "-";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toISOString().slice(0, 10);
  };

  const getPrimaryTemplateName = (cycle: AppraisalCycle) => {
    const first = cycle.templateAssignments?.[0];
    if (!first) return "-";
    const tpl = templates.find(
      (t) => (t.id ?? t._id) === first.templateId,
    );
    return tpl?.name ?? first.templateId;
  };

  const canActivate = (status: AppraisalCycleStatus) =>
    status === "PLANNED";
  const canPublish = (status: AppraisalCycleStatus) =>
    status === "PLANNED" || status === "ACTIVE";
  const canClose = (status: AppraisalCycleStatus) =>
    status === "ACTIVE";
  const canArchive = (status: AppraisalCycleStatus) =>
    status === "CLOSED";

  // ---------- render ----------

  return (
    <div style={{ padding: "1.5rem" }}>
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "1rem",
        }}
      >
        <div>
          <h1 style={{ fontSize: "1.5rem", marginBottom: "0.25rem" }}>
            Appraisal Cycles
          </h1>
          <p
            style={{
              color: "#6b7280",
              fontSize: "0.9rem",
              maxWidth: "40rem",
            }}
          >
            Define appraisal cycles (e.g. annual, probationary),
            assign templates and departments, manage cycle status,
            and monitor completion progress.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateForm}
          style={{
            padding: "0.5rem 1rem",
            borderRadius: "0.5rem",
            border: "none",
            background: "#2563eb",
            color: "#fff",
            cursor: "pointer",
          }}
        >
          + New Cycle
        </button>
      </header>

      {error && (
        <div
          style={{
            marginBottom: "1rem",
            padding: "0.75rem 1rem",
            borderRadius: "0.5rem",
            background: "#fee2e2",
            color: "#991b1b",
          }}
        >
          {error}
        </div>
      )}

      {reminderMessage && (
        <div
          style={{
            marginBottom: "1rem",
            padding: "0.75rem 1rem",
            borderRadius: "0.5rem",
            background: "#ecfdf3",
            color: "#14532d",
          }}
        >
          {reminderMessage}
        </div>
      )}

      {loading ? (
        <p>Loading cycles...</p>
      ) : cycles.length === 0 ? (
        <p>No cycles found. Click “New Cycle” to create one.</p>
      ) : (
        <div style={{ overflowX: "auto", marginBottom: "1rem" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              minWidth: "900px",
            }}
          >
            <thead>
              <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                <th style={{ textAlign: "left", padding: "0.5rem" }}>
                  Name
                </th>
                <th style={{ textAlign: "left", padding: "0.5rem" }}>
                  Type
                </th>
                <th style={{ textAlign: "left", padding: "0.5rem" }}>
                  Template
                </th>
                <th style={{ textAlign: "left", padding: "0.5rem" }}>
                  Start
                </th>
                <th style={{ textAlign: "left", padding: "0.5rem" }}>
                  End
                </th>
                <th style={{ textAlign: "left", padding: "0.5rem" }}>
                  Status
                </th>
                <th style={{ textAlign: "left", padding: "0.5rem" }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {cycles.map((c, index) => {
                const key = c.id ?? c._id ?? `${c.name}-${index}`;
                const isSelected =
                  selectedCycleId &&
                  String(selectedCycleId) === String(c.id ?? c._id);

                return (
                  <tr
                    key={key}
                    style={{
                      borderBottom: "1px solid #f3f4f6",
                      backgroundColor: isSelected ? "#eff6ff" : "inherit",
                    }}
                  >
                    <td style={{ padding: "0.5rem" }}>{c.name}</td>
                    <td style={{ padding: "0.5rem" }}>
                      {c.cycleType}
                    </td>
                    <td style={{ padding: "0.5rem" }}>
                      {getPrimaryTemplateName(c)}
                    </td>
                    <td style={{ padding: "0.5rem" }}>
                      {formatDate(c.startDate)}
                    </td>
                    <td style={{ padding: "0.5rem" }}>
                      {formatDate(c.endDate)}
                    </td>
                    <td style={{ padding: "0.5rem" }}>{c.status}</td>
                    <td style={{ padding: "0.5rem" }}>
                      <button
                        type="button"
                        onClick={() => handleViewProgress(c)}
                        style={{
                          marginRight: "0.5rem",
                          padding: "0.25rem 0.75rem",
                          borderRadius: "0.375rem",
                          border: "1px solid #bfdbfe",
                          background: "#eff6ff",
                          cursor: "pointer",
                        }}
                      >
                        View Progress
                      </button>
                      {canActivate(c.status) && (
                        <button
                          type="button"
                          onClick={() => handleActivate(c)}
                          style={{
                            marginRight: "0.5rem",
                            padding: "0.25rem 0.75rem",
                            borderRadius: "0.375rem",
                            border: "1px solid #d1d5db",
                            background: "#f9fafb",
                            cursor: "pointer",
                          }}
                        >
                          Activate
                        </button>
                      )}
                      {canPublish(c.status) && (
                        <button
                          type="button"
                          onClick={() => handlePublish(c)}
                          style={{
                            marginRight: "0.5rem",
                            padding: "0.25rem 0.75rem",
                            borderRadius: "0.375rem",
                            border: "1px solid #d1d5db",
                            background: "#eef2ff",
                            cursor: "pointer",
                          }}
                        >
                          Publish
                        </button>
                      )}
                      {canClose(c.status) && (
                        <button
                          type="button"
                          onClick={() => handleClose(c)}
                          style={{
                            marginRight: "0.5rem",
                            padding: "0.25rem 0.75rem",
                            borderRadius: "0.375rem",
                            border: "1px solid #facc15",
                            background: "#fef9c3",
                            cursor: "pointer",
                          }}
                        >
                          Close
                        </button>
                      )}
                      {canArchive(c.status) && (
                        <button
                          type="button"
                          onClick={() => handleArchive(c)}
                          style={{
                            padding: "0.25rem 0.75rem",
                            borderRadius: "0.375rem",
                            border: "1px solid #fecaca",
                            background: "#fee2e2",
                            color: "#b91c1c",
                            cursor: "pointer",
                          }}
                        >
                          Archive
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ---------- Step 4 progress panel ---------- */}
      {selectedCycleId && (
        <section
          style={{
            marginTop: "1rem",
            border: "1px solid #e5e7eb",
            borderRadius: "0.75rem",
            padding: "1rem",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "0.75rem",
            }}
          >
            <div>
              <h2
                style={{
                  fontSize: "1.1rem",
                  fontWeight: 600,
                  marginBottom: "0.25rem",
                }}
              >
                Cycle Progress Overview
              </h2>
              {cycleProgress && (
                <p style={{ fontSize: "0.9rem", color: "#4b5563" }}>
                  {cycleProgress.name} · Status:{" "}
                  <span style={{ fontWeight: 600 }}>
                    {cycleProgress.status}
                  </span>{" "}
                  · Completion:{" "}
                  <span style={{ fontWeight: 600 }}>
                    {cycleProgress.completionRate}%
                  </span>{" "}
                  ({cycleProgress.totalAssignments} assignments)
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={handleSendReminders}
              disabled={saving}
              style={{
                padding: "0.4rem 0.9rem",
                borderRadius: "0.5rem",
                border: "none",
                background: "#2563eb",
                color: "#fff",
                cursor: "pointer",
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? "Sending..." : "Send Reminders"}
            </button>
          </div>

          {progressLoading ? (
            <p>Loading progress...</p>
          ) : !cycleProgress ? (
            <p style={{ fontSize: "0.9rem", color: "#6b7280" }}>
              Select a cycle and click &quot;View Progress&quot; to see
              completion details.
            </p>
          ) : (
            <div style={{ display: "grid", gap: "1rem" }}>
              {/* By status */}
              <div>
                <h3
                  style={{
                    fontSize: "0.95rem",
                    fontWeight: 600,
                    marginBottom: "0.35rem",
                  }}
                >
                  By Status
                </h3>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "0.5rem",
                  }}
                >
                  {Object.entries(cycleProgress.byStatus).map(
                    ([status, count]) => (
                      <span
                        key={status}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          borderRadius: "999px",
                          border: "1px solid #e5e7eb",
                          padding: "0.25rem 0.6rem",
                          fontSize: "0.8rem",
                          background: "#f9fafb",
                        }}
                      >
                        <span
                          style={{
                            fontWeight: 600,
                            marginRight: "0.25rem",
                          }}
                        >
                          {status}
                        </span>
                        <span>· {count}</span>
                      </span>
                    ),
                  )}
                </div>
              </div>

              {/* By department */}
              <div>
                <h3
                  style={{
                    fontSize: "0.95rem",
                    fontWeight: 600,
                    marginBottom: "0.35rem",
                  }}
                >
                  By Department
                </h3>
                {cycleProgress.byDepartment.length === 0 ? (
                  <p
                    style={{
                      fontSize: "0.85rem",
                      color: "#6b7280",
                    }}
                  >
                    No department-level data yet.
                  </p>
                ) : (
                  <div style={{ overflowX: "auto" }}>
                    <table
                      style={{
                        width: "100%",
                        borderCollapse: "collapse",
                        minWidth: "400px",
                        fontSize: "0.85rem",
                      }}
                    >
                      <thead>
                        <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                          <th
                            style={{
                              textAlign: "left",
                              padding: "0.35rem",
                            }}
                          >
                            Department ID
                          </th>
                          <th
                            style={{
                              textAlign: "left",
                              padding: "0.35rem",
                            }}
                          >
                            Assignments
                          </th>
                          <th
                            style={{
                              textAlign: "left",
                              padding: "0.35rem",
                            }}
                          >
                            Submitted
                          </th>
                          <th
                            style={{
                              textAlign: "left",
                              padding: "0.35rem",
                            }}
                          >
                            Completion
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {cycleProgress.byDepartment.map((d) => (
                          <tr
                            key={d.departmentId}
                            style={{
                              borderBottom: "1px solid #f3f4f6",
                            }}
                          >
                            <td style={{ padding: "0.35rem" }}>
                              {d.departmentId}
                            </td>
                            <td style={{ padding: "0.35rem" }}>
                              {d.totalAssignments}
                            </td>
                            <td style={{ padding: "0.35rem" }}>
                              {d.submitted}
                            </td>
                            <td style={{ padding: "0.35rem" }}>
                              {d.completionRate}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      )}

      {/* ---------- create form (unchanged) ---------- */}
      {formMode === "create" && (
        <div
          style={{
            marginTop: "1.5rem",
            border: "1px solid #e5e7eb",
            padding: "1rem",
            borderRadius: "0.75rem",
          }}
        >
          <h2
            style={{
              fontSize: "1.25rem",
              marginBottom: "0.75rem",
            }}
          >
            Create Appraisal Cycle
          </h2>

          <div style={{ display: "grid", gap: "0.75rem" }}>
            <label>
              Name
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{ width: "100%", padding: "0.5rem" }}
              />
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

            <label>
              Cycle Type
              <select
                value={cycleType}
                onChange={(e) =>
                  setCycleType(e.target.value as AppraisalTemplateType)
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

            <div style={{ display: "flex", gap: "0.75rem" }}>
              <label style={{ flex: 1 }}>
                Start Date
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  style={{ width: "100%", padding: "0.5rem" }}
                />
              </label>
              <label style={{ flex: 1 }}>
                End Date
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  style={{ width: "100%", padding: "0.5rem" }}
                />
              </label>
            </div>

            <div style={{ display: "flex", gap: "0.75rem" }}>
              <label style={{ flex: 1 }}>
                Manager Due Date (optional)
                <input
                  type="date"
                  value={managerDueDate}
                  onChange={(e) => setManagerDueDate(e.target.value)}
                  style={{ width: "100%", padding: "0.5rem" }}
                />
              </label>
              <label style={{ flex: 1 }}>
                Employee Acknowledgement Due Date (optional)
                <input
                  type="date"
                  value={employeeAckDueDate}
                  onChange={(e) =>
                    setEmployeeAckDueDate(e.target.value)
                  }
                  style={{ width: "100%", padding: "0.5rem" }}
                />
              </label>
            </div>

            {/* Template assignments */}
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "0.5rem",
                }}
              >
                <span>Template Assignments</span>
                <button
                  type="button"
                  onClick={() =>
                    setTemplateRows((prev) => [
                      ...prev,
                      { templateId: "", departmentIdsCsv: "" },
                    ])
                  }
                >
                  + Add Template Assignment
                </button>
              </div>
              <div style={{ display: "grid", gap: "0.5rem" }}>
                {templateRows.map((row, index) => (
                  <div
                    key={index}
                    style={{
                      border: "1px solid #e5e7eb",
                      borderRadius: "0.5rem",
                      padding: "0.5rem",
                    }}
                  >
                    <label>
                      Template
                      <select
                        value={row.templateId}
                        onChange={(e) =>
                          setTemplateRows((prev) =>
                            prev.map((r, i) =>
                              i === index
                                ? {
                                    ...r,
                                    templateId: e.target.value,
                                  }
                                : r,
                            ),
                          )
                        }
                        style={{ width: "100%", padding: "0.25rem" }}
                      >
                        <option value="">Select template</option>
                        {templates.map((t) => {
                          const id = t.id ?? t._id ?? "";
                          return (
                            <option key={id} value={id}>
                              {t.name}
                            </option>
                          );
                        })}
                      </select>
                    </label>
                    <label>
                      Department IDs (comma separated)
                      <input
                        value={row.departmentIdsCsv}
                        onChange={(e) =>
                          setTemplateRows((prev) =>
                            prev.map((r, i) =>
                              i === index
                                ? {
                                    ...r,
                                    departmentIdsCsv: e.target.value,
                                  }
                                : r,
                            ),
                          )
                        }
                        placeholder="depId1, depId2, ..."
                        style={{ width: "100%", padding: "0.25rem" }}
                      />
                    </label>
                    {templateRows.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          setTemplateRows((prev) =>
                            prev.filter((_, i) => i !== index),
                          )
                        }
                        style={{
                          marginTop: "0.25rem",
                          fontSize: "0.85rem",
                        }}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Assignments */}
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "0.5rem",
                }}
              >
                <span>Assignments (Employee → Manager)</span>
                <button
                  type="button"
                  onClick={() =>
                    setAssignmentRows((prev) => [
                      ...prev,
                      {
                        employeeProfileId: "",
                        managerProfileId: "",
                        departmentId: "",
                        positionId: "",
                        templateId: "",
                        dueDate: "",
                      },
                    ])
                  }
                >
                  + Add Assignment
                </button>
              </div>
              <div style={{ display: "grid", gap: "0.5rem" }}>
                {assignmentRows.map((row, index) => (
                  <div
                    key={index}
                    style={{
                      border: "1px solid #e5e7eb",
                      borderRadius: "0.5rem",
                      padding: "0.5rem",
                    }}
                  >
                    <label>
                      Employee Profile ID
                      <input
                        value={row.employeeProfileId}
                        onChange={(e) =>
                          setAssignmentRows((prev) =>
                            prev.map((r, i) =>
                              i === index
                                ? {
                                    ...r,
                                    employeeProfileId: e.target.value,
                                  }
                                : r,
                            ),
                          )
                        }
                        style={{ width: "100%", padding: "0.25rem" }}
                      />
                    </label>
                    <label>
                      Manager Profile ID
                      <input
                        value={row.managerProfileId}
                        onChange={(e) =>
                          setAssignmentRows((prev) =>
                            prev.map((r, i) =>
                              i === index
                                ? {
                                    ...r,
                                    managerProfileId: e.target.value,
                                  }
                                : r,
                            ),
                          )
                        }
                        style={{ width: "100%", padding: "0.25rem" }}
                      />
                    </label>
                    <label>
                      Department ID
                      <input
                        value={row.departmentId}
                        onChange={(e) =>
                          setAssignmentRows((prev) =>
                            prev.map((r, i) =>
                              i === index
                                ? {
                                    ...r,
                                    departmentId: e.target.value,
                                  }
                                : r,
                            ),
                          )
                        }
                        style={{ width: "100%", padding: "0.25rem" }}
                      />
                    </label>
                    <label>
                      Position ID (optional)
                      <input
                        value={row.positionId}
                        onChange={(e) =>
                          setAssignmentRows((prev) =>
                            prev.map((r, i) =>
                              i === index
                                ? {
                                    ...r,
                                    positionId: e.target.value,
                                  }
                                : r,
                            ),
                          )
                        }
                        style={{ width: "100%", padding: "0.25rem" }}
                      />
                    </label>
                    <label>
                      Template
                      <select
                        value={row.templateId}
                        onChange={(e) =>
                          setAssignmentRows((prev) =>
                            prev.map((r, i) =>
                              i === index
                                ? {
                                    ...r,
                                    templateId: e.target.value,
                                  }
                                : r,
                            ),
                          )
                        }
                        style={{ width: "100%", padding: "0.25rem" }}
                      >
                        <option value="">Select template</option>
                        {templates.map((t) => {
                          const id = t.id ?? t._id ?? "";
                          return (
                            <option key={id} value={id}>
                              {t.name}
                            </option>
                          );
                        })}
                      </select>
                    </label>
                    <label>
                      Due Date (optional)
                      <input
                        type="date"
                        value={row.dueDate}
                        onChange={(e) =>
                          setAssignmentRows((prev) =>
                            prev.map((r, i) =>
                              i === index
                                ? {
                                    ...r,
                                    dueDate: e.target.value,
                                  }
                                : r,
                            ),
                          )
                        }
                        style={{ width: "100%", padding: "0.25rem" }}
                      />
                    </label>
                    {assignmentRows.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          setAssignmentRows((prev) =>
                            prev.filter((_, i) => i !== index),
                          )
                        }
                        style={{
                          marginTop: "0.25rem",
                          fontSize: "0.85rem",
                        }}
                      >
                        Remove
                      </button>
                    )}
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
            <button type="button" onClick={closeForm}>
              Cancel
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={handleCreate}
              style={{
                padding: "0.5rem 1rem",
                borderRadius: "0.5rem",
                border: "none",
                background: "#2563eb",
                color: "#fff",
                cursor: "pointer",
              }}
            >
              {saving ? "Creating..." : "Create Cycle"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
