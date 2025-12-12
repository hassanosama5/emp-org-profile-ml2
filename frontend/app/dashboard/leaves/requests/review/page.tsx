"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/hooks/use-auth";
import { useRequireAuth } from "@/lib/hooks/use-auth";
import { SystemRole } from "@/types";
import { leavesApi } from "@/lib/api/leaves/leaves";
import { employeeProfileApi } from "@/lib/api/employee-profile/employee-profile";
import { LeaveRequest } from "@/types/leaves";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/shared/ui/Card";
import { Select } from "@/components/leaves/Select";
import ApproveLeaveRequestButton from "@/components/leaves/ApproveLeaveRequestButton";
import RejectLeaveRequestButton from "@/components/leaves/RejectLeaveRequestButton";
import { Button } from "@/components/shared/ui/Button";
import { useRouter } from "next/navigation";

export default function ManagerLeaveReviewPage() {
  const { user, isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const [pendingRequests, setPendingRequests] = useState<LeaveRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [employeeIdFilter, setEmployeeIdFilter] = useState("");
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  
  // NEW: State for employee dropdown
  const [employees, setEmployees] = useState<Array<{ _id: string; employeeId: string; firstName: string; lastName: string }>>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);

  useRequireAuth(SystemRole.DEPARTMENT_HEAD);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // NEW: Load employees for dropdown
  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    try {
      setLoadingEmployees(true);
      const response = await employeeProfileApi.getAllEmployees({ limit: 1000 });
      const employeesList = Array.isArray(response.data) ? response.data : [];
      setEmployees(employeesList.map((emp: any) => ({
        _id: emp._id,
        employeeId: emp.employeeId || emp._id,
        firstName: emp.firstName || '',
        lastName: emp.lastName || '',
      })));
    } catch (error: any) {
      console.error("Failed to load employees:", error);
    } finally {
      setLoadingEmployees(false);
    }
  };

  const fetchPendingRequests = async (employeeId?: string) => {
    if (!employeeId) {
      setPendingRequests([]);
      setLoadingRequests(false);
      setHasSearched(false);
      return;
    }

    setLoadingRequests(true);
    setError(null);
    setHasSearched(true);
    try {
      console.log("Fetching pending requests for employee:", employeeId);
      const requests = await leavesApi.getEmployeeLeaveRequests(employeeId, {
        status: "pending",
      });
      console.log("Received requests:", requests);
      // Filter to only show pending requests (in case backend returns all)
      const pendingOnly = requests.filter(
        (req) => req.status?.toLowerCase() === "pending"
      );
      console.log("Filtered pending requests:", pendingOnly);
      setPendingRequests(pendingOnly);
    } catch (err: any) {
      console.error("Error fetching pending requests:", err);
      const errorMessage = err?.response?.data?.message || err?.message || "Failed to fetch pending leave requests";
      setError(errorMessage);
      setPendingRequests([]);
    } finally {
      setLoadingRequests(false);
    }
  };

  const handleSearch = async () => {
    const trimmedId = employeeIdFilter.trim();
    if (!trimmedId) {
      setError("Please enter an employee ID");
      setHasSearched(false);
      setPendingRequests([]);
      return;
    }
    setError(null);
    setSuccessMessage(null);
    setSearching(true);
    console.log("Searching for employee ID:", trimmedId);
    await fetchPendingRequests(trimmedId);
    setSearching(false);
  };

  const handleApproveSuccess = () => {
    setSuccessMessage("Leave request approved successfully");
    // Refresh the list
    if (employeeIdFilter.trim()) {
      fetchPendingRequests(employeeIdFilter.trim());
    }
  };

  const handleRejectSuccess = () => {
    setSuccessMessage("Leave request rejected successfully");
    // Refresh the list
    if (employeeIdFilter.trim()) {
      fetchPendingRequests(employeeIdFilter.trim());
    }
  };

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
  };

  const formatDate = (date: Date | string | undefined): string => {
    if (!date) return "N/A";
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // NEW CODE: Check if leave request is finalized
  const isFinalized = (request: LeaveRequest): boolean => {
    if (!request.approvalFlow || request.approvalFlow.length === 0) {
      return false;
    }
    // Check if approvalFlow contains an HR Manager approval
    return request.approvalFlow.some(
      (approval) =>
        approval.role === "HR Manager" && approval.status?.toLowerCase() === "approved"
    );
  };

  // ENHANCED: Check if leave request is overridden by HR Manager
  const isOverridden = (request: LeaveRequest): boolean => {
    if (!request.approvalFlow || request.approvalFlow.length === 0) {
      return false;
    }
    // Check if approvalFlow contains an HR Manager override (can be approved or rejected)
    const hrApproval = request.approvalFlow.find(
      (approval) => approval.role === "HR Manager"
    );
    return hrApproval !== undefined;
  };

  const getStatusColor = (status: string): string => {
    switch (status.toLowerCase()) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "approved":
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      case "cancelled":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (loading || !isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  const roles = user?.roles || [];
  const isDepartmentHead = roles.includes(SystemRole.DEPARTMENT_HEAD);

  if (!isDepartmentHead) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <div className="rounded-md bg-red-50 p-4 border border-red-200">
          <p className="text-sm text-red-800">
            You do not have permission to access this page. Only department heads can review leave requests.
          </p>
          <button
            onClick={() => router.push("/dashboard/leaves/requests")}
            className="mt-4 text-sm text-red-600 hover:text-red-800 underline"
          >
            Go back to leave requests
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Review Leave Requests</h1>
        <p className="text-gray-600 mt-1">
          As a department head, review and approve or reject leave requests from your team members
        </p>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="mb-4 rounded-md bg-green-50 p-4 border border-green-200">
          <p className="text-sm text-green-800">{successMessage}</p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-4 border border-red-200">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Search Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Search Pending Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Select
                label=""
                value={employeeIdFilter}
                onChange={(e) => setEmployeeIdFilter(e.target.value)}
                options={
                  employees.length > 0
                    ? employees.map((emp) => ({
                        value: emp.employeeId || emp._id,
                        label: `${emp.employeeId || emp._id} - ${emp.firstName} ${emp.lastName}`,
                      }))
                    : [{ value: "", label: loadingEmployees ? "Loading employees..." : "No employees available" }]
                }
                placeholder="Select employee to view their pending leave requests"
              />
            </div>
            <Button
              variant="primary"
              onClick={handleSearch}
              disabled={searching || loadingRequests}
            >
              {searching ? "Searching..." : "Search"}
            </Button>
          </div>
          <p className="mt-2 text-xs text-gray-500">
            Note: Enter an employee ID (MongoDB ObjectId) to view their pending leave requests.
          </p>
          {employeeIdFilter && (
            <p className="mt-1 text-xs text-blue-600">
              Current search: {employeeIdFilter}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Pending Requests List */}
      {loadingRequests ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading pending requests...</p>
        </div>
      ) : !hasSearched ? (
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-gray-500">
              Enter an employee ID above to search for pending leave requests.
            </p>
          </CardContent>
        </Card>
      ) : pendingRequests.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-gray-500">
              No pending leave requests found for employee ID: {employeeIdFilter}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {pendingRequests.map((request) => {
            const leaveTypeName =
              typeof request.leaveTypeId === "object" && request.leaveTypeId !== null
                ? request.leaveTypeId.name
                : "Unknown Leave Type";

            return (
              <Card key={request._id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">
                        Leave Request #{request._id.slice(-8)}
                      </CardTitle>
                      <p className="text-sm text-gray-600 mt-1">
                        Employee ID: {request.employeeId}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                          request.status
                        )}`}
                      >
                        {request.status.toUpperCase()}
                      </span>
                      {/* ENHANCED: Show finalized indicator */}
                      {isFinalized(request) && (
                        <span
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800"
                          title="Finalized by HR Manager"
                        >
                          <svg
                            className="w-3 h-3"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                          Finalized
                        </span>
                      )}
                      {/* ENHANCED: Show overridden indicator */}
                      {isOverridden(request) && !isFinalized(request) && (
                        <span
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800"
                          title="Overridden by HR Manager"
                        >
                          <svg
                            className="w-3 h-3"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z"
                              clipRule="evenodd"
                            />
                          </svg>
                          Overridden
                        </span>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Leave Type</p>
                      <p className="text-sm text-gray-900">{leaveTypeName}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Duration</p>
                      <p className="text-sm text-gray-900">
                        {request.durationDays} working day
                        {request.durationDays !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Start Date</p>
                      <p className="text-sm text-gray-900">
                        {formatDate(request.dates.from)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">End Date</p>
                      <p className="text-sm text-gray-900">
                        {formatDate(request.dates.to)}
                      </p>
                    </div>
                    {request.justification && (
                      <div className="md:col-span-2">
                        <p className="text-sm font-medium text-gray-700">Justification</p>
                        <p className="text-sm text-gray-900">{request.justification}</p>
                      </div>
                    )}
                    {request.createdAt && (
                      <div>
                        <p className="text-sm font-medium text-gray-700">Submitted</p>
                        <p className="text-sm text-gray-900">
                          {formatDate(request.createdAt)}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Approval Actions */}
                  {request.status.toLowerCase() === "pending" && (
                    <div className="flex items-center gap-4 pt-4 border-t border-gray-200">
                      <ApproveLeaveRequestButton
                        leaveRequestId={request._id}
                        onSuccess={handleApproveSuccess}
                        onError={handleError}
                        variant="primary"
                        size="md"
                      />
                      <RejectLeaveRequestButton
                        leaveRequestId={request._id}
                        onSuccess={handleRejectSuccess}
                        onError={handleError}
                        variant="danger"
                        size="md"
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

