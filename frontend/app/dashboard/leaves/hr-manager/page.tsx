"use client";

// NEW CODE: HR Manager page for managing leave requests
// This page implements all HR manager requirements:
// 1. Finalize approved leave requests (updates records and payroll)
// 2. Override manager decisions (handles policy exceptions)
// 3. Bulk process multiple requests (efficiency)
// 4. Verify medical leave documents (via document page link)
// 5. Automatic balance updates (handled by backend on finalization)

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/hooks/use-auth";
import { useRequireAuth } from "@/lib/hooks/use-auth";
import { SystemRole } from "@/types";
import { leavesApi } from "@/lib/api/leaves/leaves";
import { employeeProfileApi } from "@/lib/api/employee-profile/employee-profile";
import { LeaveRequest } from "@/types/leaves";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/shared/ui/Card";
import { Button } from "@/components/shared/ui/Button";
import { Select } from "@/components/leaves/Select";
import FinalizeLeaveRequestButton from "@/components/leaves/FinalizeLeaveRequestButton";
import OverrideDecisionDialog from "@/components/leaves/OverrideDecisionDialog";
import BulkProcessDialog from "@/components/leaves/BulkProcessDialog";

export default function HRManagerLeavePage() {
  const { user, isAuthenticated, loading } = useAuth();
  const router = useRouter();
  
  // NEW CODE: State management for HR Manager page
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [employeeIdFilter, setEmployeeIdFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showOverrideDialog, setShowOverrideDialog] = useState(false);
  const [selectedRequestForOverride, setSelectedRequestForOverride] = useState<LeaveRequest | null>(null);
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  
  // NEW: State for employee dropdown
  const [employees, setEmployees] = useState<Array<{ _id: string; employeeId: string; firstName: string; lastName: string }>>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);

  // NEW CODE: Role-based access control - only HR_MANAGER can access (HR_ADMIN excluded)
  useEffect(() => {
    if (!loading && isAuthenticated && user) {
      const roles = user.roles || [];
      if (!roles.includes(SystemRole.HR_MANAGER)) {
        router.replace("/dashboard");
      }
    }
  }, [loading, isAuthenticated, user, router]);

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

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // ENHANCED: Refresh leave requests when returning to this page (e.g., after document verification)
  useEffect(() => {
    const handleFocus = () => {
      if (employeeIdFilter.trim()) {
        fetchLeaveRequests(employeeIdFilter.trim());
      }
    };
    
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [employeeIdFilter]);

  // NEW CODE: Fetch leave requests with filters
  const fetchLeaveRequests = async (employeeId: string, status?: string) => {
    if (!employeeId.trim()) {
      setLeaveRequests([]);
      setLoadingRequests(false);
      return;
    }

    setLoadingRequests(true);
    setError(null);

    try {
      const filters: {
        status?: string;
      } = {};

      // Use the passed status parameter, or fall back to statusFilter state
      const filterStatus = status !== undefined ? status : statusFilter;
      if (filterStatus) {
        filters.status = filterStatus;
      }

      const requests = await leavesApi.getEmployeeLeaveRequests(
        employeeId.trim(),
        filters
      );
      setLeaveRequests(requests);
    } catch (err: any) {
      console.error("Error fetching leave requests:", err);
      const errorMessage =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to fetch leave requests";
      setError(errorMessage);
      setLeaveRequests([]);
    } finally {
      setLoadingRequests(false);
    }
  };

  const handleSearch = async () => {
    const trimmedId = employeeIdFilter.trim();
    if (!trimmedId) {
      setError("Please enter an employee ID");
      setLeaveRequests([]);
      return;
    }
    setError(null);
    setSuccessMessage(null);
    await fetchLeaveRequests(trimmedId);
  };

  // NEW CODE: Success handlers for different actions
  const handleFinalizeSuccess = () => {
    setSuccessMessage("Leave request finalized successfully");
    if (employeeIdFilter.trim()) {
      fetchLeaveRequests(employeeIdFilter.trim());
    }
  };

  const handleOverrideSuccess = () => {
    setSuccessMessage("Manager decision overridden successfully");
    setShowOverrideDialog(false);
    setSelectedRequestForOverride(null);
    if (employeeIdFilter.trim()) {
      fetchLeaveRequests(employeeIdFilter.trim());
    }
  };

  const handleBulkProcessSuccess = () => {
    setSuccessMessage("Leave requests processed successfully");
    setShowBulkDialog(false);
    if (employeeIdFilter.trim()) {
      fetchLeaveRequests(employeeIdFilter.trim());
    }
  };

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
  };

  // NEW CODE: Open override dialog for a specific request
  const handleOpenOverride = (request: LeaveRequest) => {
    setSelectedRequestForOverride(request);
    setShowOverrideDialog(true);
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

  // ENHANCED: Check if leave request is overridden by HR Manager (not finalized)
  const isOverridden = (request: LeaveRequest): boolean => {
    if (!request.approvalFlow || request.approvalFlow.length === 0) {
      return false;
    }
    
    // Find all HR Manager entries
    const hrManagerEntries = request.approvalFlow.filter(
      (approval) => approval.role === "HR Manager"
    );
    
    if (hrManagerEntries.length === 0) {
      return false;
    }
    
    // Find the first HR Manager entry index
    const firstHrIndex = request.approvalFlow.findIndex(
      (approval) => approval.role === "HR Manager"
    );
    
    if (firstHrIndex === -1) {
      return false;
    }
    
    // Check if there's a Department Head decision before the first HR Manager entry
    const deptHeadEntry = request.approvalFlow
      .slice(0, firstHrIndex)
      .reverse()
      .find((approval) => 
        approval.role === "Departement_Head" || 
        approval.role === "Department Head" ||
        approval.role?.toLowerCase().includes("department")
      );
    
    if (!deptHeadEntry) {
      // No Department Head decision before HR Manager = it's an override
      return true;
    }
    
    // Get the HR Manager entry and Department Head status
    const hrEntry = request.approvalFlow[firstHrIndex];
    const deptHeadStatus = deptHeadEntry.status?.toLowerCase();
    const hrStatus = hrEntry.status?.toLowerCase();
    
    // Finalization: Department Head approved → HR Manager approves (same status, normal flow)
    // Override: Department Head rejected → HR Manager approves (status changed)
    // Override: Department Head approved → HR Manager rejects (status changed)
    // Override: Any status change by HR Manager
    
    // If both are approved and Department Head approved first = finalization (not override)
    if (deptHeadStatus === "approved" && hrStatus === "approved") {
      // Check if this is the normal flow (Department Head approved, then HR finalized)
      // vs override (HR changed from rejected to approved)
      return false; // This is finalization, not override
    }
    
    // If statuses don't match = override (HR changed the decision)
    return true;
  };

  // NEW CODE: Get document verification status badge (using approvalFlow instead of schema fields)
  // ENHANCED: Get document verification status badge - More prominent and visible
  const getDocumentVerificationBadge = (request: LeaveRequest) => {
    if (!request.attachmentId) return null;
    
    // Check approvalFlow for document verification entries
    const verificationEntry = request.approvalFlow?.find(
      (entry) => entry.role === 'HR Manager - Document Verification'
    );
    
    const status = verificationEntry?.status?.toLowerCase() || 'pending';
    switch (status) {
      case 'verified':
        return (
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-full bg-green-100 text-green-800 border border-green-300 shadow-sm"
            title="Document verified by HR Manager"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            ✓ Doc Verified
          </span>
        );
      case 'rejected':
        return (
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-full bg-red-100 text-red-800 border border-red-300 shadow-sm"
            title="Document rejected by HR Manager"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            ✗ Doc Rejected
          </span>
        );
      default:
        return (
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-full bg-yellow-100 text-yellow-800 border border-yellow-300 shadow-sm"
            title="Document verification pending - Click Verify Document to review"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
            </svg>
            ⏳ Verify Doc
          </span>
        );
    }
  };

  // NEW CODE: Get status badge color
  const getStatusBadgeColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "approved":
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      case "cancelled":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-blue-100 text-blue-800";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      {/* Header Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">HR Manager - Leave Requests</h1>
        <p className="text-gray-600">
          Manage leave requests: finalize approved requests, override decisions, and process in bulk
        </p>
      </div>

      {/* Messages */}
      {successMessage && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-blue-800 text-sm font-medium">{successMessage}</p>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800 text-sm font-medium">{error}</p>
        </div>
      )}

      {/* Search and Filters - More Compact */}
      <Card className="mb-8 shadow-sm">
        <CardContent className="pt-6 pb-4">
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1 w-full sm:w-auto">
              <Select
                label="Employee ID"
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
                placeholder="Select employee"
              />
            </div>

            <div className="w-full sm:w-48">
              <label
                htmlFor="statusFilter"
                className="block text-sm font-medium text-gray-700 mb-1.5"
              >
                Status
              </label>
              <select
                id="statusFilter"
                value={statusFilter}
                onChange={(e) => {
                  const newStatus = e.target.value;
                  setStatusFilter(newStatus);
                  if (employeeIdFilter.trim()) {
                    fetchLeaveRequests(employeeIdFilter.trim(), newStatus);
                  }
                }}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div className="flex gap-2 w-full sm:w-auto">
              <Button onClick={handleSearch} variant="primary" className="flex-1 sm:flex-none">
                Search
              </Button>
              <Button
                onClick={() => setShowBulkDialog(true)}
                variant="outline"
                disabled={leaveRequests.length === 0}
                className="flex-1 sm:flex-none"
              >
                Bulk Process
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Leave Requests - Card-based Layout */}
      {loadingRequests ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading requests...</p>
            </div>
          </CardContent>
        </Card>
      ) : leaveRequests.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-gray-500">
              <svg
                className="mx-auto h-12 w-12 text-gray-400 mb-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <p className="text-base">
                {employeeIdFilter.trim()
                  ? "No leave requests found for this employee."
                  : "Enter an employee ID and click Search to view leave requests."}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Leave Requests ({leaveRequests.length})
            </h2>
          </div>
          
          {leaveRequests.map((request) => (
            <Card key={request._id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                  {/* Left Section - Main Info */}
                  <div className="lg:col-span-8 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-sm font-semibold text-gray-900">
                            Employee: {request.employeeId}
                          </span>
                          <span
                            className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-full ${getStatusBadgeColor(
                              request.status
                            )}`}
                          >
                            {request.status}
                          </span>
                          {isFinalized(request) && (
                            <span
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800"
                              title="Finalized by HR Manager"
                            >
                              <svg
                                className="w-3.5 h-3.5"
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
                          {isOverridden(request) && (
                            <span
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800"
                              title="Overridden by HR Manager"
                            >
                              <svg
                                className="w-3.5 h-3.5"
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
                          {/* NEW CODE: Document verification status badge */}
                          {getDocumentVerificationBadge(request)}
                        </div>
                        <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-1.5">
                            <svg
                              className="w-4 h-4 text-gray-400"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                              />
                            </svg>
                            <span>
                              {new Date(request.dates.from).toLocaleDateString()} -{" "}
                              {new Date(request.dates.to).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <svg
                              className="w-4 h-4 text-gray-400"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                            <span>
                              {request.durationDays} day{request.durationDays !== 1 ? "s" : ""}
                            </span>
                          </div>
                          {request.leaveTypeId && (
                            <div className="flex items-center gap-1.5">
                              <svg
                                className="w-4 h-4 text-gray-400"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                                />
                              </svg>
                              <span className="capitalize">
                                {typeof request.leaveTypeId === 'object' 
                                  ? (request.leaveTypeId as any).name || 'Leave'
                                  : 'Leave'}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Section - Actions */}
                  <div className="lg:col-span-4 flex flex-col gap-2 lg:items-end lg:justify-start">
                    <div className="flex flex-wrap gap-2">
                      {request.status?.toLowerCase() === "approved" && !isFinalized(request) && (
                        <FinalizeLeaveRequestButton
                          leaveRequestId={request._id}
                          onSuccess={handleFinalizeSuccess}
                          onError={handleError}
                          size="sm"
                        />
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenOverride(request)}
                      >
                        Override
                      </Button>
                      {/* NEW CODE: Verify Document button - Always visible for HR Managers */}
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => router.push(`/dashboard/leaves/requests/${request._id}/document`)}
                        className="bg-blue-600 hover:bg-blue-700 text-white border-blue-700"
                        title={request.attachmentId ? "Verify Document" : "View Document Verification Page"}
                      >
                        <svg
                          className="w-4 h-4 mr-1.5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                        {request.attachmentId ? "Verify Document" : "View Documents"}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* NEW CODE: Override Decision Dialog */}
      {showOverrideDialog && selectedRequestForOverride && (
        <OverrideDecisionDialog
          leaveRequestId={selectedRequestForOverride._id}
          currentStatus={selectedRequestForOverride.status}
          leaveRequest={selectedRequestForOverride}
          onSuccess={handleOverrideSuccess}
          onError={handleError}
          onClose={() => {
            setShowOverrideDialog(false);
            setSelectedRequestForOverride(null);
          }}
        />
      )}

      {/* NEW CODE: Bulk Process Dialog */}
      {showBulkDialog && (
        <BulkProcessDialog
          leaveRequests={leaveRequests}
          onSuccess={handleBulkProcessSuccess}
          onError={handleError}
          onClose={() => setShowBulkDialog(false)}
        />
      )}
    </div>
  );
}

