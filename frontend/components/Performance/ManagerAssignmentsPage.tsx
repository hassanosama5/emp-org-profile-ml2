"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/use-auth";
import { AppraisalAssignment } from "./performanceAssignments";
import { fetchManagerAssignments } from "@/lib/api/performance/Api/performanceAssignmentsApi";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/shared/ui/Card";
import { Button } from "@/components/shared/ui/Button";

type LoadState = "idle" | "loading" | "loaded" | "error";

export const ManagerAssignmentsPage: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [assignments, setAssignments] = useState<AppraisalAssignment[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [error, setError] = useState<string | null>(null);

  /**
   * Derive the manager's EmployeeProfile _id.
   */
  const managerProfileId = useMemo(() => {
    if (!user) return null;

    const candidate =
      (user as any).id ||
      (user as any).employeeProfileId ||
      (user as any).employeeProfile?._id ||
      (user as any).employeeProfileIdString ||
      null;

    if (typeof window !== "undefined") {
      console.log("[ManagerAssignments] user =", user);
      console.log("[ManagerAssignments] derived managerProfileId =", candidate);
    }

    return candidate as string | null;
  }, [user]);

  const loadAssignments = async (profileId: string) => {
    try {
      setLoadState("loading");
      setError(null);

      const data = await fetchManagerAssignments(profileId);
      setAssignments(data);
      setLoadState("loaded");
    } catch (err: any) {
      console.error("[ManagerAssignments] loadAssignments error:", err);
      setError(err?.message ?? "Failed to load assignments");
      setLoadState("error");
    }
  };

  useEffect(() => {
    if (!authLoading && managerProfileId) {
      void loadAssignments(managerProfileId);
    }
  }, [authLoading, managerProfileId]);

  const handleOpenAppraisal = (assignment: AppraisalAssignment) => {
    const assignmentId = (assignment as any).id ?? (assignment as any)._id;
    if (!assignmentId) return;

    router.push(`/dashboard/performance/manager/appraisals/${assignmentId}`);
  };

  const formatDate = (value?: string | Date) => {
    if (!value) return "-";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleDateString();
  };

  // ---------------- RENDER STATES ----------------

  if (authLoading) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto px-6 py-8">
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-800">
              Authentication Required
            </CardTitle>
            <CardDescription className="text-red-700">
              You need to be logged in to view your assigned appraisals.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!managerProfileId) {
    return (
      <div className="container mx-auto px-6 py-8">
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-800">
              Profile Configuration Error
            </CardTitle>
            <CardDescription className="text-red-700">
              We couldn't link your account to an employee profile. Please
              contact HR or the system administrator to check your profile
              configuration.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <details className="mt-3">
              <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800">
                Technical details (for support)
              </summary>
              <pre className="mt-2 rounded-md bg-gray-900 text-gray-100 p-3 text-xs overflow-x-auto">
                {JSON.stringify(user, null, 2)}
              </pre>
            </details>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white-900">
          My Assigned Appraisals
        </h1>
        <p className="text-gray-600 mt-1">
          View all appraisal forms assigned to you for your direct reports. Use
          this list to track which forms are pending, in progress, or submitted.
        </p>
      </div>

      {/* Error State */}
      {error && (
        <Card className="border-red-200 bg-red-50 mb-6">
          <CardContent className="pt-6">
            <p className="text-sm text-red-800">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {loadState === "loading" && assignments.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Loading assignments…</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {loadState === "loaded" && assignments.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>No Assignments Found</CardTitle>
            <CardDescription>
              No appraisal assignments found for your profile. Assignments will
              appear here once HR assigns appraisal forms to you for your direct
              reports.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {/* Assignments Table */}
      {assignments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Appraisal Assignments ({assignments.length})</CardTitle>
            <CardDescription>
              Click "Open Appraisal" to complete ratings for each employee
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Employee
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cycle
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Template
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Due Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {assignments.map((a, index) => {
                    const key = (a as any).id ?? (a as any)._id ?? index;

                    const employee =
                      (a as any).employeeProfileId || (a as any).employee;
                    const employeeName =
                      employee?.fullName ||
                      employee?.name ||
                      employee?.displayName ||
                      "Employee";

                    const cycle = (a as any).cycleId || (a as any).cycle;
                    const template =
                      (a as any).templateId || (a as any).template;

                    const cycleName =
                      typeof cycle === "string"
                        ? cycle
                        : cycle?.name || "Cycle";
                    const templateName =
                      typeof template === "string"
                        ? template
                        : template?.name || "Template";

                    const status = a.status || "UNKNOWN";
                    const statusColors: Record<string, string> = {
                      PENDING: "bg-yellow-100 text-yellow-800",
                      IN_PROGRESS: "bg-blue-100 text-blue-800",
                      SUBMITTED: "bg-green-100 text-green-800",
                      DRAFT: "bg-gray-100 text-gray-800",
                    };

                    return (
                      <tr
                        key={key}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {employeeName}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">
                          {cycleName}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">
                          {templateName}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              statusColors[status] ||
                              "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {status}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">
                          {formatDate((a as any).dueDate)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm">
                          <Button
                            onClick={() => handleOpenAppraisal(a)}
                            variant="primary"
                            size="sm"
                          >
                            Open Appraisal
                          </Button>
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
