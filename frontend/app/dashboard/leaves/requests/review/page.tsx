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
  
  // State for delegate selection per request
  const [showDelegateDropdown, setShowDelegateDropdown] = useState<{ [requestId: string]: boolean }>({});
  const [selectedDelegate, setSelectedDelegate] = useState<{ [requestId: string]: string }>({});
  const [delegating, setDelegating] = useState<{ [requestId: string]: boolean }>({});

  // State for document rejection
  const [showRejectDocumentDialog, setShowRejectDocumentDialog] = useState<{ [requestId: string]: boolean }>({});
  const [documentRejectionReason, setDocumentRejectionReason] = useState<{ [requestId: string]: string }>({});
  const [rejectingDocument, setRejectingDocument] = useState<{ [requestId: string]: boolean }>({});

  // Allow both department heads and delegates to access this page
  // useRequireAuth(SystemRole.DEPARTMENT_HEAD); // Commented out to allow delegates

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

  // Check if user is a delegate and auto-load delegated requests
  useEffect(() => {
    if (isAuthenticated && user && !hasSearched) {
      // Auto-fetch if user might be a delegate
      fetchPendingRequests();
    }
  }, [isAuthenticated, user]);

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
    // If no employeeId provided, check if user is a delegate, Payroll Manager, or Department Head
    if (!employeeId) {
      // Check if there's an employeeId in URL query params (for delegates clicking from dashboard)
      const urlParams = new URLSearchParams(window.location.search);
      const queryEmployeeId = urlParams.get('employeeId');
      
      if (queryEmployeeId) {
        // Use the employeeId from query params
        await fetchPendingRequests(queryEmployeeId);
        return;
      }
      
      const roles = user?.roles || [];
      const isPayrollManager = roles.includes(SystemRole.PAYROLL_MANAGER);
      const isDepartmentHead = roles.includes(SystemRole.DEPARTMENT_HEAD);
      const userId = (user as any)?._id || user?.userId || (user as any)?.id;
      
      if (userId) {
        setLoadingRequests(true);
        setError(null);
        setHasSearched(true);
        try {
          // First check if user is a delegate (for Payroll Managers or others)
          // Delegates should fetch delegated requests, not team requests
          let isDelegate = false;
          try {
            const delegateRequests = await leavesApi.getEmployeeLeaveRequests(userId, {
              status: "pending",
            });
            // If we get requests and user is not a Department Head, they might be a delegate
            // Check if requests exist and don't belong to the user
            const normalizedUserId = userId.toString();
            const hasDelegatedRequests = Array.isArray(delegateRequests) && delegateRequests.some((req: any) => {
              const rawEmployeeId: any = req.employeeId;
              let employeeIdStr: string | null = null;
              if (typeof rawEmployeeId === "string") {
                employeeIdStr = rawEmployeeId;
              } else if (rawEmployeeId && typeof rawEmployeeId === "object") {
                employeeIdStr = rawEmployeeId._id || rawEmployeeId.id || (typeof rawEmployeeId.toString === "function" ? rawEmployeeId.toString() : null);
              }
              return employeeIdStr && employeeIdStr !== normalizedUserId && req.status?.toLowerCase() === "pending";
            });
            
            if (hasDelegatedRequests) {
              isDelegate = true;
              console.log("User is a delegate, fetching delegated requests");
              const pendingOnly = delegateRequests.filter(
                (req: any) => {
                  if (req.status?.toLowerCase() !== "pending") return false;
                  const rawEmployeeId: any = req.employeeId;
                  let employeeIdStr: string | null = null;
                  if (typeof rawEmployeeId === "string") {
                    employeeIdStr = rawEmployeeId;
                  } else if (rawEmployeeId && typeof rawEmployeeId === "object") {
                    employeeIdStr = rawEmployeeId._id || rawEmployeeId.id || (typeof rawEmployeeId.toString === "function" ? rawEmployeeId.toString() : null);
                  }
                  return employeeIdStr && employeeIdStr !== normalizedUserId;
                }
              );
              setPendingRequests(pendingOnly);
            }
          } catch (delegateErr) {
            // Not a delegate or error fetching, continue to team requests
            console.log("User is not a delegate or error checking:", delegateErr);
          }
          
          // If not a delegate, fetch team requests for Payroll Managers or Department Heads
          if (!isDelegate) {
            if (isPayrollManager) {
              console.log("Fetching team pending requests for Payroll Manager:", userId);
              const result = await leavesApi.filterTeamLeaveData(userId, {
                status: "pending",
                limit: 1000, // Get all pending requests
              });
              console.log("Received team requests:", result);
              const teamRequests = Array.isArray(result.items) ? result.items : [];
              const pendingOnly = teamRequests.filter(
                (req: any) => req.status?.toLowerCase() === "pending"
              );
              console.log("Filtered team pending requests:", pendingOnly);
              setPendingRequests(pendingOnly);
            } else if (isDepartmentHead) {
            // Department Head: fetch team requests using filterTeamLeaveData
            console.log("Fetching team pending requests for Department Head:", userId);
            const result = await leavesApi.filterTeamLeaveData(userId, {
              status: "pending",
              limit: 1000,
            });
            console.log("Received team requests:", result);
            const teamRequests = Array.isArray(result.items) ? result.items : [];
            const pendingOnly = teamRequests.filter(
              (req: any) => req.status?.toLowerCase() === "pending"
            );
              console.log("Filtered team pending requests:", pendingOnly);
              setPendingRequests(pendingOnly);
            } else {
              // For other users (not Payroll Manager or Department Head), try fetching delegated requests
              // The backend will handle this when userId is passed
              console.log("Fetching delegated pending requests for user:", userId);
              const requests = await leavesApi.getEmployeeLeaveRequests(userId, {
                status: "pending",
              });
              console.log("Received delegated requests:", requests);
              const pendingOnly = requests.filter(
                (req) => req.status?.toLowerCase() === "pending"
              );
              console.log("Filtered delegated pending requests:", pendingOnly);
              setPendingRequests(pendingOnly);
            }
          }
        } catch (err: any) {
          console.error("Error fetching requests:", err);
          // If error, user might not have access - that's okay
          setPendingRequests([]);
          setHasSearched(false);
        } finally {
          setLoadingRequests(false);
        }
        return;
      }
      
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
    } else {
      // Refresh team requests if no specific employee filter
      fetchPendingRequests();
    }
  };

  const handleRejectSuccess = () => {
    setSuccessMessage("Leave request rejected successfully");
    // Refresh the list
    if (employeeIdFilter.trim()) {
      fetchPendingRequests(employeeIdFilter.trim());
    } else {
      // Refresh team requests if no specific employee filter
      fetchPendingRequests();
    }
  };

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
  };

  const handleDelegateClick = (requestId: string) => {
    setShowDelegateDropdown(prev => ({
      ...prev,
      [requestId]: !prev[requestId]
    }));
  };

  const handleDelegateSelect = (requestId: string, delegateId: string) => {
    setSelectedDelegate(prev => ({
      ...prev,
      [requestId]: delegateId
    }));
  };

  const handleDelegateSubmit = async (requestId: string) => {
    const delegateId = selectedDelegate[requestId];
    if (!delegateId) {
      setError("Please select a delegate");
      return;
    }

    setDelegating(prev => ({ ...prev, [requestId]: true }));
    setError(null);

    try {
      // Create delegation for 7 days from now
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 7);

      await leavesApi.delegateApprovalAuthority(delegateId, startDate, endDate);
      
      setSuccessMessage(`Delegation created successfully. The selected employee can now approve leave requests on your behalf for the next 7 days.`);
      setShowDelegateDropdown(prev => ({ ...prev, [requestId]: false }));
      setSelectedDelegate(prev => {
        const newState = { ...prev };
        delete newState[requestId];
        return newState;
      });
    } catch (err: any) {
      console.error("Error delegating approval authority:", err);
      const errorMessage = err?.response?.data?.message || err?.message || "Failed to delegate approval authority";
      setError(errorMessage);
    } finally {
      setDelegating(prev => ({ ...prev, [requestId]: false }));
    }
  };

  // NEW CODE: Handle document view
  const handleViewDocument = async (request: LeaveRequest) => {
    if (!request.attachmentId) {
      setError("No attachment found for this leave request");
      return;
    }

    try {
      const attachmentId = typeof request.attachmentId === 'object' 
        ? (request.attachmentId as any)._id || (request.attachmentId as any).toString()
        : String(request.attachmentId);
      
      const blob = await leavesApi.downloadAttachment(attachmentId);
      const url = window.URL.createObjectURL(blob);
      
      // Open in new tab
      const newWindow = window.open(url, '_blank');
      if (!newWindow) {
        // If popup blocked, try downloading instead
        const a = document.createElement('a');
        a.href = url;
        a.target = '_blank';
        a.click();
      }
      
      // Clean up after a delay
      setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    } catch (err: any) {
      console.error("Error viewing document:", err);
      setError(err?.message || "Failed to view document. Please try again.");
    }
  };

  // NEW CODE: Handle document rejection
  const handleRejectDocument = async (requestId: string) => {
    const rejectionReason = documentRejectionReason[requestId]?.trim();
    if (!rejectionReason) {
      setError("Please provide a reason for rejecting the document");
      return;
    }

    setRejectingDocument(prev => ({ ...prev, [requestId]: true }));
    setError(null);
    setSuccessMessage(null);

    try {
      await leavesApi.rejectDocumentByDepartmentHead(requestId, rejectionReason);
      setSuccessMessage("Document rejected. The leave request has been automatically rejected.");
      setShowRejectDocumentDialog(prev => ({ ...prev, [requestId]: false }));
      setDocumentRejectionReason(prev => {
        const newState = { ...prev };
        delete newState[requestId];
        return newState;
      });
      
      // Refresh the list
      if (employeeIdFilter.trim()) {
        await fetchPendingRequests(employeeIdFilter.trim());
      } else {
        await fetchPendingRequests();
      }
    } catch (err: any) {
      console.error("Error rejecting document:", err);
      setError(err?.response?.data?.message || err?.message || "Failed to reject document");
    } finally {
      setRejectingDocument(prev => ({ ...prev, [requestId]: false }));
    }
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
    
    // Check if the initial approval role is "HR Manager" (department head request)
    // If so, HR Manager approval is the initial approval, not an override
    const initialApproval = request.approvalFlow[0];
    if (initialApproval?.role === "HR Manager") {
      return false; // This is initial approval for department head, not an override
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
      return false; // This is finalization, not override
    }
    
    // If statuses don't match = override (HR changed the decision)
    return true;
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
  const isPayrollManager = roles.includes(SystemRole.PAYROLL_MANAGER);
  
  // Allow access if user is department head, Payroll Manager, OR if they have delegated requests
  const hasDelegatedRequests = pendingRequests.length > 0 && !isDepartmentHead && !isPayrollManager;
  
  // Department heads always have access to this page
  if (!isDepartmentHead && !isPayrollManager && !hasDelegatedRequests && hasSearched) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <div className="rounded-md bg-yellow-50 p-4 border border-yellow-200">
          <p className="text-sm text-yellow-800">
            No delegated leave requests found. You need to be assigned as a delegate by a department head to review requests.
          </p>
          <button
            onClick={() => router.push("/dashboard/leaves")}
            className="mt-4 text-sm text-yellow-600 hover:text-yellow-800 underline"
          >
            Go back to leaves dashboard
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
          {isDepartmentHead 
            ? "As a department head, review and approve or reject leave requests from your team members. You can view documents, reject documents (which automatically rejects the request), and manage all team leave data."
            : isPayrollManager
            ? "As a payroll manager, review and approve or reject leave requests from your team members"
            : "Review and approve or reject leave requests delegated to you"
          }
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
            // Use leaveTypeName from backend if available, otherwise fallback to checking leaveTypeId
            const leaveTypeName = (request as any).leaveTypeName ||
              (typeof request.leaveTypeId === "object" && request.leaveTypeId !== null
                ? request.leaveTypeId.name
                : "Unknown Leave Type");

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

                  {/* Document Section - Always visible for department heads */}
                  <div className="mb-4 pt-4 border-t border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <svg
                          className="w-5 h-5 text-gray-600"
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
                        <span className="text-sm font-medium text-gray-700">Document</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {request.attachmentId ? (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewDocument(request)}
                              className="flex items-center gap-2"
                            >
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                />
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                                />
                              </svg>
                              View Document
                            </Button>
                            {request.status.toLowerCase() === "pending" && (
                              <Button
                                variant="danger"
                                size="sm"
                                onClick={() => setShowRejectDocumentDialog(prev => ({ ...prev, [request._id]: true }))}
                                className="flex items-center gap-2"
                              >
                                <svg
                                  className="w-4 h-4"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M6 18L18 6M6 6l12 12"
                                  />
                                </svg>
                                Reject Document
                              </Button>
                            )}
                          </>
                        ) : (
                          <span className="text-sm text-gray-500 italic">No document attached</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Approval Actions */}
                  {request.status.toLowerCase() === "pending" && (
                    <div className="pt-4 border-t border-gray-200">
                      <div className="flex items-center gap-4 mb-4">
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
                        <Button
                          variant="outline"
                          size="md"
                          onClick={() => handleDelegateClick(request._id)}
                          className="ml-auto"
                        >
                          Choose Delegate
                        </Button>
                      </div>
                      
                      {/* Delegate Selection Dropdown */}
                      {showDelegateDropdown[request._id] && (
                        <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                          <div className="mb-3">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Select an employee to delegate approval authority:
                            </label>
                            <Select
                              label=""
                              value={selectedDelegate[request._id] || ""}
                              onChange={(e) => handleDelegateSelect(request._id, e.target.value)}
                              options={
                                employees.length > 0
                                  ? employees
                                      .filter(emp => {
                                        const currentUserId = user?.userId || (user as any)?._id || (user as any)?.id;
                                        return emp._id !== currentUserId;
                                      }) // Don't show self
                                      .map((emp) => ({
                                        value: emp._id,
                                        label: `${emp.firstName} ${emp.lastName} (${emp.employeeId || emp._id})`,
                                      }))
                                  : [{ value: "", label: loadingEmployees ? "Loading employees..." : "No employees available" }]
                              }
                              placeholder="Select an employee to delegate to"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => handleDelegateSubmit(request._id)}
                              disabled={!selectedDelegate[request._id] || delegating[request._id]}
                            >
                              {delegating[request._id] ? "Delegating..." : "Confirm Delegate"}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setShowDelegateDropdown(prev => ({ ...prev, [request._id]: false }));
                                setSelectedDelegate(prev => {
                                  const newState = { ...prev };
                                  delete newState[request._id];
                                  return newState;
                                });
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                          <p className="mt-2 text-xs text-gray-500">
                            The selected employee will be able to approve leave requests on your behalf for the next 7 days.
                          </p>
                        </div>
                      )}

                      {/* Document Rejection Dialog */}
                      {showRejectDocumentDialog[request._id] && (
                        <div className="mt-4 p-4 bg-red-50 rounded-lg border border-red-200">
                          <div className="mb-3">
                            <label className="block text-sm font-medium text-red-700 mb-2">
                              Reason for rejecting the document:
                            </label>
                            <textarea
                              value={documentRejectionReason[request._id] || ""}
                              onChange={(e) => setDocumentRejectionReason(prev => ({
                                ...prev,
                                [request._id]: e.target.value
                              }))}
                              placeholder="Please provide a reason for rejecting this document. The leave request will be automatically rejected."
                              className="w-full px-3 py-2 border border-red-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                              rows={3}
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => handleRejectDocument(request._id)}
                              disabled={!documentRejectionReason[request._id]?.trim() || rejectingDocument[request._id]}
                            >
                              {rejectingDocument[request._id] ? "Rejecting..." : "Confirm Rejection"}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setShowRejectDocumentDialog(prev => ({ ...prev, [request._id]: false }));
                                setDocumentRejectionReason(prev => {
                                  const newState = { ...prev };
                                  delete newState[request._id];
                                  return newState;
                                });
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                          <p className="mt-2 text-xs text-red-600">
                            ⚠️ Warning: Rejecting the document will automatically reject the leave request.
                          </p>
                        </div>
                      )}
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

