"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/lib/hooks/use-auth";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { SystemRole } from "@/types";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/shared/ui/Card";
import { Button } from "@/components/shared/ui/Button";
import { fetchAppraisalCycles, publishAppraisalCycle } from "@/lib/api/performance/Api/performanceCyclesApi";
import { AppraisalCycle } from "@/components/Performance/performanceCycles";
import { AppraisalRecord } from "@/components/Performance/performanceRecords";
import api from "@/lib/api/client";
import { organizationStructureApi } from "@/lib/api/organization-structure/org-structure-api";

function getId(value: any): string | undefined {
  if (!value) return undefined;
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    const id = value.id ?? value._id ?? value.toString?.();
    return id != null ? String(id) : undefined;
  }
  return String(value);
}

function formatDate(value?: string | Date): string {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString();
}

function formatStatus(status?: string): string {
  if (!status) return "Unknown";
  switch (status) {
    case "DRAFT":
      return "Draft";
    case "MANAGER_SUBMITTED":
      return "Manager Submitted";
    case "HR_PUBLISHED":
      return "Published";
    default:
      return status;
  }
}

function getStatusColor(status?: string): string {
  switch (status) {
    case "DRAFT":
      return "bg-gray-100 text-gray-800";
    case "MANAGER_SUBMITTED":
      return "bg-yellow-100 text-yellow-800";
    case "HR_PUBLISHED":
      return "bg-green-100 text-green-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

export default function PublishRatingsPage() {
  const { user } = useAuth();
  const [cycles, setCycles] = useState<AppraisalCycle[]>([]);
  const [appraisals, setAppraisals] = useState<AppraisalRecord[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Filters
  const [selectedCycleId, setSelectedCycleId] = useState<string>("");
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("MANAGER_SUBMITTED");
  const [selectedAppraisalIds, setSelectedAppraisalIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedCycleId || selectedDepartmentId || statusFilter) {
      loadAppraisals();
    }
  }, [selectedCycleId, selectedDepartmentId, statusFilter]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [cyclesData, departmentsData] = await Promise.all([
        fetchAppraisalCycles(),
        organizationStructureApi.getDepartments(true),
      ]);

      setCycles(cyclesData || []);
      setDepartments(departmentsData || []);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const loadAppraisals = async () => {
    try {
      setError(null);
      const params: { cycleId?: string; departmentId?: string; status?: string } = {};
      if (selectedCycleId) params.cycleId = selectedCycleId;
      if (selectedDepartmentId) params.departmentId = selectedDepartmentId;
      if (statusFilter) params.status = statusFilter;

      const data = await api.get("/performance/appraisals", { params });
      const appraisalsList = Array.isArray(data) ? data : (data?.data || []);
      setAppraisals(appraisalsList);
      setSelectedAppraisalIds(new Set());
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Failed to load appraisals");
    }
  };

  const handleAppraisalToggle = (appraisalId: string) => {
    setSelectedAppraisalIds((prev) => {
      const next = new Set(prev);
      if (next.has(appraisalId)) {
        next.delete(appraisalId);
      } else {
        next.add(appraisalId);
      }
      return next;
    });
  };

  const handlePublishCycle = async () => {
    if (!selectedCycleId) {
      setError("Please select a cycle to publish");
      return;
    }

    try {
      setPublishing(true);
      setError(null);
      setSuccess(null);

      await publishAppraisalCycle(selectedCycleId);
      setSuccess(`Successfully published all appraisals in cycle. Employees will be notified.`);
      
      // Reload appraisals to show updated status
      await loadAppraisals();
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.message || err?.message || "Failed to publish cycle");
    } finally {
      setPublishing(false);
    }
  };

  const canPublish = (appraisal: AppraisalRecord): boolean => {
    const status = (appraisal as any).status as string | undefined;
    return status === "MANAGER_SUBMITTED";
  };

  const publishableAppraisals = appraisals.filter(canPublish);
  const selectedCycle = cycles.find((c) => getId(c) === selectedCycleId);

  return (
    <ProtectedRoute
      allowedRoles={[SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN]}
    >
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Publish Appraisal Ratings
          </h1>
          <p className="text-gray-600 mt-1">
            Review and publish finalized appraisal ratings to employees. Published appraisals will be visible to employees and trigger notifications.
          </p>
        </div>

        {loading ? (
          <Card>
            <CardContent className="pt-6">
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-gray-600">Loading...</span>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Filters */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Filters</CardTitle>
                <CardDescription>
                  Filter appraisals by cycle, department, and status
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Appraisal Cycle
                    </label>
                    <select
                      value={selectedCycleId}
                      onChange={(e) => setSelectedCycleId(e.target.value)}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    >
                      <option value="">All Cycles</option>
                      {cycles.map((cycle) => {
                        const id = getId(cycle);
                        return (
                          <option key={id} value={id}>
                            {cycle.name} ({cycle.cycleType})
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Department
                    </label>
                    <select
                      value={selectedDepartmentId}
                      onChange={(e) => setSelectedDepartmentId(e.target.value)}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    >
                      <option value="">All Departments</option>
                      {departments.map((dept) => {
                        const id = getId(dept);
                        return (
                          <option key={id} value={id}>
                            {dept.name}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    >
                      <option value="">All Statuses</option>
                      <option value="DRAFT">Draft</option>
                      <option value="MANAGER_SUBMITTED">Manager Submitted</option>
                      <option value="HR_PUBLISHED">Published</option>
                    </select>
                  </div>
                </div>

                <div className="mt-4">
                  <Button onClick={loadAppraisals} variant="outline" size="sm">
                    Refresh
                  </Button>
                </div>
              </CardContent>
            </Card>

            {error && (
              <Card className="border-red-200 bg-red-50">
                <CardContent className="pt-6">
                  <p className="text-sm text-red-800">{error}</p>
                </CardContent>
              </Card>
            )}

            {success && (
              <Card className="border-green-200 bg-green-50">
                <CardContent className="pt-6">
                  <p className="text-sm text-green-800">{success}</p>
                </CardContent>
              </Card>
            )}

            {/* Cycle Publish Option */}
            {selectedCycleId && publishableAppraisals.length > 0 && (
              <Card className="border-blue-200 bg-blue-50">
                <CardHeader>
                  <CardTitle className="text-base text-blue-900">
                    Publish Entire Cycle
                  </CardTitle>
                  <CardDescription className="text-blue-700">
                    Publish all {publishableAppraisals.length} submitted appraisals in this cycle at once
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-blue-800">
                        Cycle: <strong>{selectedCycle?.name}</strong>
                      </p>
                      <p className="text-xs text-blue-700 mt-1">
                        {publishableAppraisals.length} appraisals ready to publish
                      </p>
                    </div>
                    <Button
                      onClick={handlePublishCycle}
                      disabled={publishing}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {publishing ? "Publishing..." : "Publish All in Cycle"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Appraisals List */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Appraisals ({appraisals.length})
                </CardTitle>
                <CardDescription>
                  {publishableAppraisals.length > 0 && (
                    <span className="text-yellow-700">
                      {publishableAppraisals.length} ready to publish
                    </span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {appraisals.length === 0 ? (
                  <p className="text-sm text-gray-600">
                    No appraisals found matching the filters
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">
                            Employee
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">
                            Cycle
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">
                            Score
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">
                            Rating
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">
                            Status
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">
                            Submitted
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {appraisals.map((appraisal) => {
                          const id = getId(appraisal);
                          if (!id) return null;
                          const r: any = appraisal;
                          const employee = r.employeeProfileId;
                          const cycle = r.cycleId;
                          const isPublishable = canPublish(appraisal);
                          
                          return (
                            <tr
                              key={id}
                              className={`hover:bg-gray-50 transition-colors ${
                                isPublishable ? "bg-yellow-50" : ""
                              }`}
                            >
                              <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {employee
                                  ? typeof employee === "object"
                                    ? `${employee.firstName || ""} ${employee.lastName || ""}`.trim() || employee.employeeNumber || "Unknown"
                                    : String(employee)
                                  : "Unknown"}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">
                                {cycle
                                  ? typeof cycle === "object"
                                    ? cycle.name || "Unknown Cycle"
                                    : String(cycle)
                                  : "Unknown"}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">
                                {r.totalScore ?? "-"}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">
                                {r.overallRatingLabel ?? "-"}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap">
                                <span
                                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(
                                    r.status
                                  )}`}
                                >
                                  {formatStatus(r.status)}
                                </span>
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">
                                {formatDate(r.managerSubmittedAt)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {publishableAppraisals.length > 0 && !selectedCycleId && (
                  <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                    <p className="text-xs text-yellow-800">
                      <strong>Note:</strong> Select a cycle above to publish all appraisals in that cycle at once, or use individual publish (requires backend endpoint).
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
