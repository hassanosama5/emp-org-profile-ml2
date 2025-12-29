// app/dashboard/employee-profile/admin/approvals/page.tsx - REFACTORED
"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/hooks/use-auth";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { SystemRole, ProfileChangeRequest } from "@/types";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/shared/ui/Card";
import { Button } from "@/components/shared/ui/Button";
import { Toast, useToast } from "@/components/leaves/Toast";
import { employeeProfileApi } from "@/lib/api/employee-profile/employee-profile";
import { isHRAdminOrManager } from "@/lib/utils/role-utils";

export default function ApprovalsPage() {
  const { user } = useAuth();
  const { toast, showToast, hideToast } = useToast();
  const [requests, setRequests] = useState<ProfileChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);

      // Check if user is HR Admin/Manager
      if (!isHRAdminOrManager(user)) {
        setError(
          "Access denied. Only HR Admin and HR Manager can view approvals."
        );
        return;
      }

      const data = await employeeProfileApi.getPendingChangeRequests({
        status: "PENDING",
      });

      if (Array.isArray(data)) {
        setRequests(data);
        if (data.length === 0) {
          showToast("No pending change requests found", "info");
        }
      } else {
        const directData =
          await employeeProfileApi.getPendingChangeRequestsDirect();
        if (Array.isArray(directData) && directData.length > 0) {
          setRequests(directData);
        } else {
          setRequests([]);
          showToast("No change requests available", "info");
        }
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to load approvals";
      setError(`Error: ${errorMessage}`);
      showToast(errorMessage, "error");
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const approve = async (id: string) => {
    try {
      const reason = prompt("Enter approval reason (optional):");
      await employeeProfileApi.approveChangeRequest(id, reason || undefined);
      showToast("Request approved successfully", "success");
      setTimeout(() => load(), 500);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to approve request";
      showToast(errorMessage, "error");
    }
  };

  const reject = async (id: string) => {
    try {
      const reason = prompt("Enter rejection reason (required):");
      if (!reason || reason.trim() === "") {
        showToast("Rejection reason is required", "error");
        return;
      }

      await employeeProfileApi.rejectChangeRequest(id, reason);
      showToast("Request rejected", "success");
      setTimeout(() => load(), 500);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to reject request";
      showToast(errorMessage, "error");
    }
  };

  useEffect(() => {
    if (user) {
      load();
    }
  }, [user]);

  return (
    <ProtectedRoute allowedRoles={[SystemRole.HR_ADMIN, SystemRole.HR_MANAGER]}>
      <div className="container mx-auto px-6 py-8">
        <Toast
          message={toast.message}
          type={toast.type}
          isVisible={toast.isVisible}
          onClose={hideToast}
        />

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white-900">
              Change Request Approvals
            </h1>
            <p className="text-gray-600 mt-1">
              HR Admin/Manager Portal
              {user?.roles?.includes(SystemRole.HR_ADMIN) && (
                <span className="ml-2 px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded-full">
                  HR Admin
                </span>
              )}
              {user?.roles?.includes(SystemRole.HR_MANAGER) && (
                <span className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                  HR Manager
                </span>
              )}
            </p>
          </div>
          <div className="flex gap-3 mt-4 md:mt-0">
            <Button onClick={load} variant="outline">
              Refresh
            </Button>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <h3 className="font-semibold text-red-800 mb-2">
              Error Loading Approvals:
            </h3>
            <p className="text-red-700 mb-3">{error}</p>
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Pending Approval Requests</CardTitle>
            <CardDescription>
              {loading
                ? "Loading change requests..."
                : `${requests.length} pending request${
                    requests.length !== 1 ? "s" : ""
                  }`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-2 border-gray-300 border-t-blue-600 mb-4" />
                <p className="text-gray-600">Loading approvals...</p>
              </div>
            ) : requests.length === 0 ? (
              <div className="text-center py-12">
                <div className="mb-4">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-3">
                    <span className="text-2xl">✓</span>
                  </div>
                </div>
                <p className="text-gray-600 text-lg mb-2">
                  No pending approvals
                </p>
                <p className="text-gray-400 mb-4">
                  All change requests have been processed or none exist
                </p>
                <Button onClick={load} variant="outline">
                  Check Again
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-medium text-gray-700">
                        Request ID
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">
                        Employee
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">
                        Request Type
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">
                        Description
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">
                        Submitted
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {requests.map((request, index) => {
                      const requestId =
                        request.id ||
                        request._id ||
                        request.requestId ||
                        `REQ-${index + 1}`;

                      // Handle employee data
                      let employeeName = "Employee";
                      let employeeId = "N/A";

                      if (request.employeeProfileId) {
                        const emp = request.employeeProfileId as any;
                        if (emp && typeof emp === "object") {
                          employeeName =
                            `${emp.firstName || ""} ${
                              emp.lastName || ""
                            }`.trim() || "Employee";
                          employeeId = emp.employeeNumber || "N/A";
                        }
                      }

                      const description =
                        request.requestDescription || "No description";

                      // Parse JSON description
                      let parsedDescription = description;
                      let requestType = "General Update"; // DECLARE OUTSIDE try-catch

                      try {
                        const trimmed = description.trim();
                        if (
                          trimmed.startsWith("{") ||
                          trimmed.startsWith("[")
                        ) {
                          const parsed = JSON.parse(description);
                          if (parsed.type) requestType = parsed.type;
                          if (
                            parsed.changes &&
                            typeof parsed.changes === "object"
                          ) {
                            parsedDescription = Object.entries(parsed.changes)
                              .map(([key, value]) => `${key}: ${value}`)
                              .join(", ");
                          } else if (parsed.description) {
                            parsedDescription = parsed.description;
                          }
                        }
                      } catch {
                        // Not JSON, use as-is
                      }
                      return (
                        <tr
                          key={requestId}
                          className="border-b border-gray-100 hover:bg-gray-50"
                        >
                          <td className="py-4 px-4 font-mono text-sm text-black">
                            {requestId.length > 10
                              ? `${requestId.substring(0, 8)}...`
                              : requestId}
                          </td>
                          <td className="py-4 px-4">
                            <div>
                              <p className="font-medium text-black">
                                {employeeName}
                              </p>
                              <p className="text-sm text-gray-500">
                                ID: {employeeId}
                              </p>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <span className="px-3 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                              {requestType}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <p className="text-gray-700 text-sm">
                              {parsedDescription}
                            </p>
                            {request.reason && (
                              <p className="text-xs text-gray-500 mt-1">
                                <span className="font-medium">
                                  Employee reason:
                                </span>{" "}
                                {request.reason}
                              </p>
                            )}
                          </td>
                          <td className="py-4 px-4">
                            {request.submittedAt ? (
                              <div className="text-sm">
                                <p className="text-gray-600">
                                  {new Date(
                                    request.submittedAt
                                  ).toLocaleDateString()}
                                </p>
                                <p className="text-gray-400 text-xs">
                                  {new Date(
                                    request.submittedAt
                                  ).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </p>
                              </div>
                            ) : (
                              <p className="text-sm text-gray-400">
                                Date unknown
                              </p>
                            )}
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => approve(requestId)}
                                className="bg-green-600 hover:bg-green-700 text-white"
                              >
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => reject(requestId)}
                                className="border-red-300 text-red-700 hover:bg-red-50"
                              >
                                Reject
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  );
}
