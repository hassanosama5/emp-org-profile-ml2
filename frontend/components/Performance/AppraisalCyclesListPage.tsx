// frontend/components/Performance/AppraisalCyclesListPage.tsx

"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/shared/ui/Card";
import { Button } from "@/components/shared/ui/Button";
import { AppraisalCycle, CycleProgressSummary } from "./performanceCycles";
import {
  fetchAppraisalCycles,
  activateAppraisalCycle,
  publishAppraisalCycle,
  closeAppraisalCycle,
  archiveAppraisalCycle,
  fetchCycleProgress,
  sendCycleRemindersApi,
} from "@/lib/api/performance/Api/performanceCyclesApi";

export const AppraisalCyclesListPage: React.FC = () => {
  const [cycles, setCycles] = useState<AppraisalCycle[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Progress panel state
  const [selectedCycleId, setSelectedCycleId] = useState<string | null>(null);
  const [progressLoading, setProgressLoading] = useState(false);
  const [cycleProgress, setCycleProgress] =
    useState<CycleProgressSummary | null>(null);
  const [reminderMessage, setReminderMessage] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const cycleData = await fetchAppraisalCycles();
      setCycles(cycleData);
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

  // Status transition handlers
  const canActivate = (status: string) => status === "PLANNED";
  const canPublish = (status: string) => status === "ACTIVE";
  const canClose = (status: string) => status === "ACTIVE";
  const canArchive = (status: string) => status === "CLOSED";

  const handleActivate = async (cycle: AppraisalCycle) => {
    if (!confirm(`Activate cycle "${cycle.name}"?`)) return;
    try {
      setSaving(true);
      await activateAppraisalCycle(getId(cycle));
      await loadData();
    } catch (err: any) {
      alert(err?.message ?? "Failed to activate cycle");
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async (cycle: AppraisalCycle) => {
    if (
      !confirm(
        `Publish cycle "${cycle.name}"? This will publish all submitted appraisals to employees.`
      )
    )
      return;
    try {
      setSaving(true);
      await publishAppraisalCycle(getId(cycle));
      await loadData();
    } catch (err: any) {
      alert(err?.message ?? "Failed to publish cycle");
    } finally {
      setSaving(false);
    }
  };

  const handleClose = async (cycle: AppraisalCycle) => {
    if (!confirm(`Close cycle "${cycle.name}"?`)) return;
    try {
      setSaving(true);
      await closeAppraisalCycle(getId(cycle));
      await loadData();
    } catch (err: any) {
      alert(err?.message ?? "Failed to close cycle");
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async (cycle: AppraisalCycle) => {
    if (!confirm(`Archive cycle "${cycle.name}"?`)) return;
    try {
      setSaving(true);
      await archiveAppraisalCycle(getId(cycle));
      await loadData();
    } catch (err: any) {
      alert(err?.message ?? "Failed to archive cycle");
    } finally {
      setSaving(false);
    }
  };

  const handleViewProgress = async (cycle: AppraisalCycle) => {
    const cycleId = getId(cycle);
    if (selectedCycleId === cycleId) {
      setSelectedCycleId(null);
      setCycleProgress(null);
      return;
    }
    setSelectedCycleId(cycleId);
    try {
      setProgressLoading(true);
      const progress = await fetchCycleProgress(cycleId);
      setCycleProgress(progress);
    } catch (err: any) {
      console.error("Failed to load progress:", err);
      setCycleProgress(null);
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
        `Reminder queued: ${res.pendingCount} pending assignments in cycle "${res.cycleName}".`
      );
    } catch (err: any) {
      setError(err?.message ?? "Failed to send reminders");
    } finally {
      setSaving(false);
    }
  };

  const getId = (c: AppraisalCycle): string => {
    return (c.id ?? c._id ?? "") as string;
  };

  const formatDate = (date: Date | string | undefined): string => {
    if (!date) return "-";
    try {
      const d = typeof date === "string" ? new Date(date) : date;
      return d.toLocaleDateString();
    } catch {
      return "-";
    }
  };

  const getPrimaryTemplateName = (cycle: AppraisalCycle): string => {
    if (cycle.templateAssignments && cycle.templateAssignments.length > 0) {
      const first = cycle.templateAssignments[0];
      if (typeof first === "object" && first.templateId) {
        const templateId =
          typeof first.templateId === "string"
            ? first.templateId
            : (first.templateId as any)?._id ?? (first.templateId as any)?.id;
        return templateId ? `Template: ${templateId.substring(0, 8)}...` : "-";
      }
    }
    return "-";
  };

  return (
    <div className="container mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white-900">
              Appraisal Cycles
            </h1>
            <p className="text-gray-600 mt-1">
              Manage appraisal cycles, view progress, and control cycle status
            </p>
          </div>
          <Link href="/dashboard/performance/cycles/create">
            <Button variant="primary">+ New Cycle</Button>
          </Link>
        </div>
      </div>

      {error && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-sm text-red-800">{error}</p>
          </CardContent>
        </Card>
      )}

      {reminderMessage && (
        <Card className="mb-6 border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <p className="text-sm text-green-800">{reminderMessage}</p>
          </CardContent>
        </Card>
      )}

      {/* Progress Panel - Moved up for better visibility */}
      {selectedCycleId && (
        <Card className="mb-6 border-blue-200 bg-blue-50">
          <CardHeader>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <CardTitle>Cycle Progress Overview</CardTitle>
                {cycleProgress && (
                  <CardDescription className="mt-1">
                    {cycleProgress.name} · Status:{" "}
                    <span className="font-semibold">
                      {cycleProgress.status}
                    </span>{" "}
                    · Completion:{" "}
                    <span className="font-semibold">
                      {cycleProgress.completionRate}%
                    </span>{" "}
                    ({cycleProgress.totalAssignments} assignments)
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
                <span className="ml-3 text-sm text-gray-600">
                  Loading progress…
                </span>
              </div>
            ) : !cycleProgress ? (
              <p className="text-sm text-gray-600">
                Loading progress details...
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
                          className="inline-flex items-center rounded-full border border-gray-300 bg-white px-3 py-1 text-xs font-medium text-gray-700"
                        >
                          <span className="font-semibold mr-1">{status}</span>
                          <span>· {count}</span>
                        </span>
                      )
                    )}
                  </div>
                </div>

                {/* By Department */}
                {cycleProgress.byDepartment &&
                  Object.keys(cycleProgress.byDepartment).length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 mb-3">
                        By Department
                      </h3>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                Department
                              </th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                Total
                              </th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                Completed
                              </th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                Pending
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {Object.entries(cycleProgress.byDepartment).map(
                              ([dept, stats]: [string, any]) => (
                                <tr key={dept}>
                                  <td className="px-3 py-2 text-sm text-gray-900">
                                    {dept}
                                  </td>
                                  <td className="px-3 py-2 text-sm text-gray-700">
                                    {stats.total || 0}
                                  </td>
                                  <td className="px-3 py-2 text-sm text-gray-700">
                                    {stats.completed || 0}
                                  </td>
                                  <td className="px-3 py-2 text-sm text-gray-700">
                                    {stats.pending || 0}
                                  </td>
                                </tr>
                              )
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
              </div>
            )}
          </CardContent>
        </Card>
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
        <Card>
          <CardHeader>
            <CardTitle>No Cycles Found</CardTitle>
            <CardDescription>
              <Link
                href="/dashboard/performance/cycles/create"
                className="text-blue-600 hover:underline"
              >
                Create your first appraisal cycle
              </Link>
            </CardDescription>
          </CardHeader>
        </Card>
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
                    const key = getId(c);
                    const isSelected =
                      selectedCycleId && selectedCycleId === key;

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
    </div>
  );
};
