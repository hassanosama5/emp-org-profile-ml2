// frontend/components/Performance/AppraisalCyclesPage.tsx

"use client";

import React, { useEffect, useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/shared/ui/Card";
import { Button } from "@/components/shared/ui/Button";
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
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Loading cycles…</span>
            </div>
          </CardContent>
        </Card>
      ) : cycles.length === 0 ? (
        <p>No cycles found. Click “New Cycle” to create one.</p>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Appraisal Cycles ({cycles.length})</CardTitle>
            <CardDescription>
              Manage cycles, view progress, and control cycle status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Template
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Start
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      End
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {cycles.map((c, index) => {
                    const key = c.id ?? c._id ?? `${c.name}-${index}`;
                    const isSelected =
                      selectedCycleId &&
                      String(selectedCycleId) === String(c.id ?? c._id);

                    const statusColors: Record<string, string> = {
                      PLANNED: "bg-gray-100 text-gray-800",
                      ACTIVE: "bg-green-100 text-green-800",
                      CLOSED: "bg-blue-100 text-blue-800",
                      ARCHIVED: "bg-gray-100 text-gray-600",
                    };

                    return (
                      <tr
                        key={key}
                        className={`transition-colors ${
                          isSelected
                            ? "bg-blue-100 border-l-4 border-blue-600 ring-2 ring-blue-200"
                            : "hover:bg-gray-50"
                        }`}
                      >
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {c.name}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">
                          {c.cycleType}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">
                          {getPrimaryTemplateName(c)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">
                          {formatDate(c.startDate)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">
                          {formatDate(c.endDate)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              statusColors[c.status] ||
                              "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {c.status}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm">
                          <div className="flex flex-wrap gap-2">
                            <Button
                              onClick={() => handleViewProgress(c)}
                              variant="outline"
                              size="sm"
                            >
                              View Progress
                            </Button>
                            {canActivate(c.status) && (
                              <Button
                                onClick={() => handleActivate(c)}
                                variant="outline"
                                size="sm"
                              >
                                Activate
                              </Button>
                            )}
                            {canPublish(c.status) && (
                              <Button
                                onClick={() => handlePublish(c)}
                                variant="primary"
                                size="sm"
                              >
                                Publish
                              </Button>
                            )}
                            {canClose(c.status) && (
                              <Button
                                onClick={() => handleClose(c)}
                                variant="outline"
                                size="sm"
                              >
                                Close
                              </Button>
                            )}
                            {canArchive(c.status) && (
                              <Button
                                onClick={() => handleArchive(c)}
                                variant="danger"
                                size="sm"
                              >
                                Archive
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Progress Panel */}
      {selectedCycleId && (
        <Card className="mt-6">
          <CardHeader>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <CardTitle>Cycle Progress Overview</CardTitle>
                {cycleProgress && (
                  <CardDescription className="mt-1">
                    {cycleProgress.name} · Status: <span className="font-semibold">{cycleProgress.status}</span> · Completion: <span className="font-semibold">{cycleProgress.completionRate}%</span> ({cycleProgress.totalAssignments} assignments)
                  </CardDescription>
                )}
              </div>
              <Button
                onClick={handleSendReminders}
                disabled={saving}
                variant="primary"
                isLoading={saving}
              >
                Send Reminders
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {progressLoading ? (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-sm text-gray-600">Loading progress…</span>
              </div>
            ) : !cycleProgress ? (
              <p className="text-sm text-gray-600">
                Select a cycle and click "View Progress" to see completion details.
              </p>
            ) : (
              <div className="space-y-6">
                {/* By Status */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">
                    By Status
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(cycleProgress.byStatus).map(
                      ([status, count]) => (
                        <span
                          key={status}
                          className="inline-flex items-center rounded-full border border-gray-300 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-700"
                        >
                          <span className="font-semibold mr-1">{status}</span>
                          <span>· {count}</span>
                        </span>
                      ),
                    )}
                  </div>
                </div>

                {/* By Department */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">
                    By Department
                  </h3>
                  {cycleProgress.byDepartment.length === 0 ? (
                    <p className="text-sm text-gray-600">
                      No department-level data yet.
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Department ID
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Assignments
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Submitted
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Completion
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {cycleProgress.byDepartment.map((d) => (
                            <tr key={d.departmentId} className="hover:bg-gray-50 transition-colors">
                              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                                {d.departmentId}
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-700">
                                {d.totalAssignments}
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-700">
                                {d.submitted}
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-700">
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
          </CardContent>
        </Card>
      )}

      {/* Create Form */}
      {formMode === "create" && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Create Appraisal Cycle</CardTitle>
            <CardDescription>
              Fill in the details below to create a new appraisal cycle
            </CardDescription>
          </CardHeader>
          <CardContent>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., Annual Performance Review 2025"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Optional description for this cycle"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cycle Type
                </label>
                <select
                  value={cycleType}
                  onChange={(e) =>
                    setCycleType(e.target.value as AppraisalTemplateType)
                  }
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {APPRAISAL_TEMPLATE_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Manager Due Date (optional)
                  </label>
                  <input
                    type="date"
                    value={managerDueDate}
                    onChange={(e) => setManagerDueDate(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Employee Acknowledgement Due Date (optional)
                  </label>
                  <input
                    type="date"
                    value={employeeAckDueDate}
                    onChange={(e) =>
                      setEmployeeAckDueDate(e.target.value)
                    }
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

            {/* Template Assignments */}
            <div className="border-t border-gray-200 pt-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                <h3 className="text-sm font-semibold text-gray-900">Template Assignments</h3>
                <Button
                  type="button"
                  onClick={() =>
                    setTemplateRows((prev) => [
                      ...prev,
                      { templateId: "", departmentIdsCsv: "" },
                    ])
                  }
                  variant="outline"
                  size="sm"
                >
                  + Add Template Assignment
                </Button>
              </div>
              <div className="space-y-3">
                {templateRows.map((row, index) => (
                  <Card key={index} className="border-gray-200">
                    <CardContent className="pt-6">
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Template
                          </label>
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
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Department IDs (comma separated)
                          </label>
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
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        {templateRows.length > 1 && (
                          <div>
                            <Button
                              type="button"
                              onClick={() =>
                                setTemplateRows((prev) =>
                                  prev.filter((_, i) => i !== index),
                                )
                              }
                              variant="danger"
                              size="sm"
                            >
                              Remove
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Assignments */}
            <div className="border-t border-gray-200 pt-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                <h3 className="text-sm font-semibold text-gray-900">Assignments (Employee → Manager)</h3>
                <Button
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
                  variant="outline"
                  size="sm"
                >
                  + Add Assignment
                </Button>
              </div>
              <div className="space-y-3">
                {assignmentRows.map((row, index) => (
                  <Card key={index} className="border-gray-200">
                    <CardContent className="pt-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Employee Profile ID
                          </label>
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
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Manager Profile ID
                          </label>
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
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Department ID
                          </label>
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
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Position ID (optional)
                          </label>
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
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Template
                          </label>
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
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Due Date (optional)
                          </label>
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
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                      </div>
                      {assignmentRows.length > 1 && (
                        <div className="mt-3">
                          <Button
                            type="button"
                            onClick={() =>
                              setAssignmentRows((prev) =>
                                prev.filter((_, i) => i !== index),
                              )
                            }
                            variant="danger"
                            size="sm"
                          >
                            Remove
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
            </div>

            {/* Form Actions */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="flex justify-end gap-3">
                <Button type="button" onClick={closeForm} variant="outline">
                  Cancel
                </Button>
                <Button
                  type="button"
                  disabled={saving}
                  onClick={handleCreate}
                  variant="primary"
                  isLoading={saving}
                >
                  Create Cycle
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
