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
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/shared/ui/Card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/shared/ui/Tabs";
import { Button } from "@/components/shared/ui/Button";
import { Select } from "@/components/leaves/Select";
import FinalizeLeaveRequestButton from "@/components/leaves/FinalizeLeaveRequestButton";
import ApproveLeaveRequestButton from "@/components/leaves/ApproveLeaveRequestButton";
import RejectLeaveRequestButton from "@/components/leaves/RejectLeaveRequestButton";
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
  
  // NEW: State for delegated pending requests
  const [delegatedPendingRequests, setDelegatedPendingRequests] = useState<LeaveRequest[]>([]);
  const [loadingDelegatedRequests, setLoadingDelegatedRequests] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("all");
  
  // NEW: State for team requests (HR Manager's direct team)
  const [teamRequests, setTeamRequests] = useState<LeaveRequest[]>([]);
  const [loadingTeamRequests, setLoadingTeamRequests] = useState(false);
  
  // NEW: State for document rejection
  const [showRejectDocumentDialog, setShowRejectDocumentDialog] = useState<{ [requestId: string]: boolean }>({});
  const [documentRejectionReason, setDocumentRejectionReason] = useState<{ [requestId: string]: string }>({});
  const [rejectingDocument, setRejectingDocument] = useState<{ [requestId: string]: boolean }>({});

  // NEW: State for delegate selection per request
  const [showDelegateDropdown, setShowDelegateDropdown] = useState<{ [requestId: string]: boolean }>({});
  const [selectedDelegate, setSelectedDelegate] = useState<{ [requestId: string]: string }>({});
  const [delegating, setDelegating] = useState<{ [requestId: string]: boolean }>({});

  // NEW CODE: Role-based access control - HR_MANAGER and HR_ADMIN can access
  useEffect(() => {
    if (!loading && isAuthenticated && user) {
      const roles = user.roles || [];
      if (!roles.includes(SystemRole.HR_MANAGER) && !roles.includes(SystemRole.HR_ADMIN)) {
        router.replace("/dashboard");
      }
    }
  }, [loading, isAuthenticated, user, router]);

  // NEW: Load employees for dropdown
  useEffect(() => {
    loadEmployees();
  }, []);

  // NEW: Fetch delegated pending requests (requests that need HR Manager/HR Admin approval)
  useEffect(() => {
    const fetchDelegatedRequests = async () => {
      // IMPORTANT: always prefer employee profile _id so delegation uses same id
      const userId = (user as any)?._id || user?.userId || (user as any)?.id;
      if (!userId) return;
      setLoadingDelegatedRequests(true);
      try {
        const roles = user?.roles || [];
        const isHRAdmin = roles.includes(SystemRole.HR_ADMIN);
        const isHRManager = roles.includes(SystemRole.HR_MANAGER);
        
        // Use the backend's delegation check - it will only return requests if user is a delegate
        // The backend getPastLeaveRequests checks getDelegatedManagerId internally
        const requests = await leavesApi.getEmployeeLeaveRequests(userId, {
          status: "pending",
        });

        // Only keep pending requests that do NOT belong to the current user
        // The backend already filters for delegated requests, but we ensure we don't show own requests
        const normalizedUserId = userId.toString();
        const pendingOnly = Array.isArray(requests) ? requests.filter((req) => {
          if (req.status?.toLowerCase() !== "pending") return false;

          // Normalize employeeId from the request (can be string or populated object)
          const rawEmployeeId: any = (req as any).employeeId;
          let employeeIdStr: string | null = null;

          if (typeof rawEmployeeId === "string") {
            employeeIdStr = rawEmployeeId;
          } else if (rawEmployeeId && typeof rawEmployeeId === "object") {
            employeeIdStr =
              (rawEmployeeId as any)._id ||
              (rawEmployeeId as any).id ||
              (typeof rawEmployeeId.toString === "function"
                ? rawEmployeeId.toString()
                : null);
          }

          // Exclude the HR Manager's own requests from the delegated list
          if (employeeIdStr && employeeIdStr === normalizedUserId) {
            return false;
          }

          return true;
        }) : [];

        // Only set delegated requests if there are any (user is a delegate)
        // If empty array, user is not a delegate, so don't show the delegated card
        setDelegatedPendingRequests(pendingOnly);
      } catch (error: any) {
        console.error("Error fetching delegated requests:", error);
        setDelegatedPendingRequests([]);
      } finally {
        setLoadingDelegatedRequests(false);
      }
    };

    if (isAuthenticated && user) {
      fetchDelegatedRequests();
      fetchTeamRequests(); // Also fetch team requests
    }
  }, [isAuthenticated, user]);
  
  // NEW: Fetch team requests for HR Manager
  const fetchTeamRequests = async () => {
    const userId = (user as any)?._id || user?.userId || (user as any)?.id;
    if (!userId) return;
    
    const roles = user?.roles || [];
    const isHRManager = roles.includes(SystemRole.HR_MANAGER);
    
    // Only fetch team requests for HR Managers (not HR Admin)
    if (!isHRManager) return;
    
    setLoadingTeamRequests(true);
    try {
      console.log("Fetching team requests for HR Manager:", userId);
      const result = await leavesApi.filterTeamLeaveData(userId, {
        status: "pending",
        limit: 1000,
      });
      console.log("Received team requests:", result);
      const teamRequestsList = Array.isArray(result.items) ? result.items : [];
      setTeamRequests(teamRequestsList);
    } catch (err: any) {
      console.error("Error fetching team requests:", err);
      setTeamRequests([]);
    } finally {
      setLoadingTeamRequests(false);
    }
  };

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
    // Refresh team requests
    fetchTeamRequests();
  };
  
  // NEW: Handle document view
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

  // NEW: Handle document rejection (for HR Managers - same as department heads)
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
      // Use the HR Manager document rejection endpoint (same as department head)
      await leavesApi.rejectDocumentByDepartmentHead(requestId, rejectionReason);
      setSuccessMessage("Document rejected. The leave request has been automatically rejected.");
      setShowRejectDocumentDialog(prev => ({ ...prev, [requestId]: false }));
      setDocumentRejectionReason(prev => {
        const newState = { ...prev };
        delete newState[requestId];
        return newState;
      });
      
      // Refresh team requests
      await fetchTeamRequests();
    } catch (err: any) {
      console.error("Error rejecting document:", err);
      setError(err?.response?.data?.message || err?.message || "Failed to reject document");
    } finally {
      setRejectingDocument(prev => ({ ...prev, [requestId]: false }));
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

  // NEW: Handle delegate selection
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
    setSuccessMessage(null);

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

  // NEW CODE: Check if request is from a department head (initial approval is HR Manager)
  const isDepartmentHeadRequest = (request: LeaveRequest): boolean => {
    if (!request.approvalFlow || request.approvalFlow.length === 0) {
      return false;
    }
    // Department head requests have "HR Manager" as the initial approval role
    const initialApproval = request.approvalFlow[0];
    return initialApproval?.role === "HR Manager";
  };

  // NEW CODE: Check if request is from an HR Manager (initial approval is CEO)
  const isHRManagerRequest = (request: LeaveRequest): boolean => {
    if (!request.approvalFlow || request.approvalFlow.length === 0) {
      return false;
    }
    // HR Manager requests have "CEO" as the initial approval role
    const initialApproval = request.approvalFlow[0];
    return initialApproval?.role === "CEO";
  };

  // NEW CODE: Check if request needs HR Manager approval (has pending HR Manager approval in flow)
  const needsHRManagerApproval = (request: LeaveRequest): boolean => {
    if (!request.approvalFlow || request.approvalFlow.length === 0) {
      return false;
    }
    // Check if there's a pending approval with role "HR Manager"
    // Status can be 'PENDING', 'pending', or LeaveStatus.PENDING
    const pendingHRApproval = request.approvalFlow.find(
      (approval) => {
        const status = approval.status?.toString().toUpperCase();
        return approval.role === "HR Manager" && status === "PENDING";
      }
    );
    return !!pendingHRApproval;
  };

  // NEW CODE: Check if request needs CEO/HR Admin approval (has pending CEO approval in flow)
  const needsCEOApproval = (request: LeaveRequest): boolean => {
    if (!request.approvalFlow || request.approvalFlow.length === 0) {
      return false;
    }
    // Check if there's a pending approval with role "CEO"
    // Status can be 'PENDING', 'pending', or LeaveStatus.PENDING
    const pendingCEOApproval = request.approvalFlow.find(
      (approval) => {
        const status = approval.status?.toString().toUpperCase();
        return approval.role === "CEO" && status === "PENDING";
      }
    );
    return !!pendingCEOApproval;
  };

  // NEW CODE: Check if request needs any approval (has any pending approval in flow)
  // This is a fallback to show Approve/Reject for any pending request when viewed by HR Manager/Admin
  const needsAnyApproval = (request: LeaveRequest): boolean => {
    if (!request.approvalFlow || request.approvalFlow.length === 0) {
      return false;
    }
    // Check if there's any pending approval
    const pendingApproval = request.approvalFlow.find(
      (approval) => {
        const status = approval.status?.toString().toUpperCase();
        return status === "PENDING";
      }
    );
    return !!pendingApproval;
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
    
    // If there are multiple HR Manager entries, it means an override happened after finalization
    if (hrManagerEntries.length > 1) {
      return true;
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
    
    // Check approvalFlow for document verification entries (both HR Manager and Department Head)
    const verificationEntry = request.approvalFlow?.find(
      (entry) => 
        entry.role === 'HR Manager - Document Verification' ||
        entry.role === 'Department Head - Document Verification'
    );
    
    const status = verificationEntry?.status?.toLowerCase() || 'pending';
    const verifiedBy = verificationEntry?.role?.includes('HR Manager') ? 'HR Manager' : 'Department Head';
    
    switch (status) {
      case 'verified':
        return (
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-full bg-green-100 text-green-800 border border-green-300 shadow-sm"
            title={`Document verified by ${verifiedBy}`}
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
            title={`Document rejected by ${verifiedBy}`}
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
            title="Document verification pending"
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
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {user?.roles?.includes(SystemRole.HR_ADMIN) ? "HR Admin - Leave Requests" : "HR Manager - Leave Requests"}
            </h1>
            <p className="text-gray-600">
              {user?.roles?.includes(SystemRole.HR_ADMIN) 
                ? "View leave requests (HR Admin can only view, not approve)"
                : "Manage leave requests: approve department head and HR Admin requests, finalize approved requests, override decisions, and process in bulk"}
            </p>
          </div>
          {!user?.roles?.includes(SystemRole.HR_ADMIN) && (
            <Link href="/dashboard/leaves/delegates">
              <Button variant="outline" className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Manage Delegates
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Messages */}
      {successMessage && (
        <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-blue-100 border-2 border-blue-300 rounded-xl shadow-sm">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <p className="text-blue-800 text-sm font-semibold">{successMessage}</p>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-gradient-to-r from-red-50 to-red-100 border-2 border-red-300 rounded-xl shadow-sm">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <p className="text-red-800 text-sm font-semibold">{error}</p>
          </div>
        </div>
      )}

      {/* Tabs for Quick Access */}
      <Tabs defaultValue="all" onValueChange={setActiveTab} className="mb-6">
        <TabsList className={`grid w-full ${delegatedPendingRequests.length > 0 ? 'grid-cols-2' : 'grid-cols-1'}`}>
          <TabsTrigger value="all">All Requests</TabsTrigger>
          {delegatedPendingRequests.length > 0 && (
            <TabsTrigger value="delegated" className="relative">
              Delegated Requests
              <span className="ml-2 px-2 py-0.5 text-xs font-bold bg-orange-500 text-white rounded-full">
                {delegatedPendingRequests.length}
              </span>
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="all" className="mt-6">
          {/* Search and Filters - More Compact */}
          <Card className="mb-8 shadow-md border-gray-200">
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
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900">
                Leave Requests <span className="text-blue-600">({leaveRequests.length})</span>
              </h2>
            </div>
          </div>
          
          {leaveRequests.map((request) => (
            <Card key={request._id} className="hover:shadow-lg transition-all duration-200 border-gray-200 bg-white">
              <CardContent className="pt-6 pb-6">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Left Section - Main Info */}
                  <div className="lg:col-span-8 space-y-5">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center flex-wrap gap-2.5 mb-3">
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
                          {/* Show Overridden OR Finalized, but prioritize Overridden */}
                          {isOverridden(request) ? (
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
                          ) : isFinalized(request) ? (
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
                          ) : null}
                          {/* Document verification status badge */}
                          {getDocumentVerificationBadge(request)}
                        </div>
                        <div className="flex flex-wrap gap-3 text-sm mt-2">
                          <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
                            <svg
                              className="w-4 h-4 text-blue-600"
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
                            <span className="font-medium text-gray-700">
                              {new Date(request.dates.from).toLocaleDateString()} -{" "}
                              {new Date(request.dates.to).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
                            <svg
                              className="w-4 h-4 text-green-600"
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
                            <span className="font-medium text-gray-700">
                              {request.durationDays} day{request.durationDays !== 1 ? "s" : ""}
                            </span>
                          </div>
                          {request.leaveTypeId && (
                            <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
                              <svg
                                className="w-4 h-4 text-purple-600"
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
                              <span className="capitalize font-medium text-gray-700">
                                {typeof request.leaveTypeId === 'object' 
                                  ? (request.leaveTypeId as any).name || 'Leave'
                                  : 'Leave'}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Document Section - Always visible */}
                      <div className="pt-5 mt-5 border-t border-gray-200">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-2.5">
                            <div className="p-1.5 bg-blue-50 rounded-lg">
                              <svg
                                className="w-5 h-5 text-blue-600"
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
                            </div>
                            <span className="text-sm font-semibold text-gray-800">Document</span>
                          </div>
                          <div className="flex items-center gap-2.5">
                            {request.attachmentId ? (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleViewDocument(request)}
                                  className="flex items-center gap-2 border-blue-200 text-blue-700 hover:bg-blue-50 hover:border-blue-300 transition-colors"
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
                                    className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white border-red-700 transition-colors shadow-sm"
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
                              <span className="text-sm text-gray-500 italic font-medium">No document attached</span>
                            )}
                          </div>
                        </div>
                        
                        {/* Document Rejection Dialog */}
                        {showRejectDocumentDialog[request._id] && (
                          <div className="mt-4 p-5 bg-gradient-to-br from-red-50 to-red-100 rounded-xl border-2 border-red-300 shadow-md">
                            <div className="mb-4">
                              <label className="block text-sm font-semibold text-red-800 mb-2.5 flex items-center gap-2">
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                                Reason for rejecting the document:
                              </label>
                              <textarea
                                value={documentRejectionReason[request._id] || ""}
                                onChange={(e) => setDocumentRejectionReason(prev => ({
                                  ...prev,
                                  [request._id]: e.target.value
                                }))}
                                placeholder="Please provide a reason for rejecting this document. The leave request will be automatically rejected."
                                className="w-full px-4 py-3 border-2 border-red-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white text-gray-800 placeholder-gray-400 transition-all"
                                rows={3}
                              />
                            </div>
                            <div className="flex items-center gap-3">
                              <Button
                                variant="danger"
                                size="sm"
                                onClick={() => handleRejectDocument(request._id)}
                                disabled={!documentRejectionReason[request._id]?.trim() || rejectingDocument[request._id]}
                                className="shadow-md hover:shadow-lg transition-shadow"
                              >
                                {rejectingDocument[request._id] ? (
                                  <>
                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Rejecting...
                                  </>
                                ) : (
                                  "Confirm Rejection"
                                )}
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
                                className="border-gray-300 hover:bg-gray-50"
                              >
                                Cancel
                              </Button>
                            </div>
                            <div className="mt-3 p-3 bg-red-200 rounded-lg border border-red-300">
                              <p className="text-xs font-medium text-red-800 flex items-center gap-2">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                                Warning: Rejecting the document will automatically reject the leave request.
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Section - Actions */}
                  <div className="lg:col-span-4 flex flex-col gap-3 lg:items-end lg:justify-start">
                    <div className="flex flex-wrap gap-2.5">
                      {/* NEW: Approve/Reject buttons for pending requests that need HR Manager approval */}
                      {/* HR Admin can only view, not approve */}
                      {(() => {
                        const roles = user?.roles || [];
                        const isHRAdminUser = roles.includes(SystemRole.HR_ADMIN);
                        return request.status?.toLowerCase() === "pending" && 
                         !isHRAdminUser && 
                         (needsHRManagerApproval(request) || needsCEOApproval(request) || needsAnyApproval(request));
                      })() && (
                        <>
                          <ApproveLeaveRequestButton
                            leaveRequestId={request._id}
                            onSuccess={handleFinalizeSuccess}
                            onError={handleError}
                            variant="primary"
                            size="sm"
                          />
                          <RejectLeaveRequestButton
                            leaveRequestId={request._id}
                            onSuccess={handleFinalizeSuccess}
                            onError={handleError}
                            variant="danger"
                            size="sm"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelegateClick(request._id)}
                            className="flex items-center gap-2"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Choose Delegate
                          </Button>
                        </>
                      )}
                      {/* Finalize button for approved requests */}
                      {request.status?.toLowerCase() === "approved" && !isFinalized(request) && (
                        <FinalizeLeaveRequestButton
                          leaveRequestId={request._id}
                          onSuccess={handleFinalizeSuccess}
                          onError={handleError}
                          size="sm"
                        />
                      )}
                      {/* Override button - only show when it's actually an override situation */}
                      {/* Don't show Override for pending requests that need approval (these use Approve/Reject buttons) */}
                      {/* Override is only for changing existing decisions, not for initial approvals */}
                      {(() => {
                        const isPending = request.status?.toLowerCase() === "pending";
                        const needsApproval = needsHRManagerApproval(request) || needsCEOApproval(request) || needsAnyApproval(request);
                        
                        // Never show Override for pending requests that need approval (use Approve/Reject instead)
                        if (isPending && needsApproval) {
                          return null;
                        }
                        
                        // For non-pending requests or requests that don't need approval, show Override
                        // Override is for changing decisions that were already made
                        if (!isPending || !needsApproval) {
                          return (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenOverride(request)}
                            >
                              Override
                            </Button>
                          );
                        }
                        
                        return null;
                      })()}
                    </div>
                    
                    {/* Delegate Selection Dropdown */}
                    {showDelegateDropdown[request._id] && (
                      <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200 w-full">
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
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
        </TabsContent>

        <TabsContent value="delegated" className="mt-6">
          {/* Bulk Process Button for Delegated Requests */}
          {delegatedPendingRequests.length > 0 && (
            <div className="mb-4 flex justify-end">
              <Button
                onClick={() => setShowBulkDialog(true)}
                variant="outline"
                disabled={delegatedPendingRequests.length === 0}
              >
                Bulk Process Delegated Requests
              </Button>
            </div>
          )}
          
          <Card className="border-orange-200 bg-orange-50">
            <CardHeader>
              <CardTitle className="text-orange-900">Delegated Pending Requests</CardTitle>
              <CardDescription className="text-orange-700">
                You have been delegated to review and approve these leave requests
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingDelegatedRequests ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-600 mx-auto"></div>
                  <p className="mt-2 text-sm text-gray-600">Loading pending requests...</p>
                </div>
              ) : delegatedPendingRequests.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No delegated pending requests at this time.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {delegatedPendingRequests
                    .filter((request) => request._id) // Ensure only requests with valid IDs are rendered
                    .map((request) => {
                    const leaveTypeName = (request as any).leaveTypeName ||
                      (typeof request.leaveTypeId === "object" && request.leaveTypeId !== null
                        ? (request.leaveTypeId as any).name
                        : "Unknown Leave Type");
                    
                    return (
                      <Card key={request._id} className="hover:shadow-md transition-shadow">
                        <CardContent className="pt-6">
                          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                            {/* Left Section - Main Info */}
                            <div className="lg:col-span-8 space-y-5">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center flex-wrap gap-2.5 mb-3">
                                    <span className="text-sm font-semibold text-gray-900">
                                      Employee: {request.employeeId}
                                    </span>
                                    <span className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-full ${getStatusBadgeColor(request.status)}`}>
                                      {request.status}
                                    </span>
                                    {/* Show Overridden OR Finalized, but prioritize Overridden */}
                                    {isOverridden(request) ? (
                                      <span
                                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800"
                                        title="Overridden by HR Manager"
                                      >
                                        Overridden
                                      </span>
                                    ) : isFinalized(request) ? (
                                      <span
                                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800"
                                        title="Finalized by HR Manager"
                                      >
                                        Finalized
                                      </span>
                                    ) : null}
                                    {getDocumentVerificationBadge(request)}
                                  </div>
                                  <p className="text-sm text-gray-600">
                                    <span className="font-medium">{leaveTypeName}</span> • {request.durationDays} day{request.durationDays !== 1 ? 's' : ''}
                                  </p>
                                  <p className="text-xs text-gray-500 mt-1">
                                    {request.dates?.from && new Date(request.dates.from).toLocaleDateString()} - {request.dates?.to && new Date(request.dates.to).toLocaleDateString()}
                                  </p>
                                  {request.justification && (
                                    <p className="text-xs text-gray-600 mt-2 italic">
                                      {request.justification}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                            {/* Right Section - Actions */}
                            <div className="lg:col-span-4 flex flex-col gap-2 lg:items-end lg:justify-start">
                              <div className="flex flex-wrap gap-2">
                                {/* NEW: Approve/Reject buttons for pending requests that need HR Manager approval */}
                                {/* HR Admin can only view, not approve */}
                                {(() => {
                                  const roles = user?.roles || [];
                                  const isHRAdminUser = roles.includes(SystemRole.HR_ADMIN);
                                  return request.status?.toLowerCase() === "pending" && 
                                   !isHRAdminUser && 
                                   (needsHRManagerApproval(request) || needsCEOApproval(request) || needsAnyApproval(request));
                                })() && (
                                  <>
                                    <ApproveLeaveRequestButton
                                      leaveRequestId={request._id}
                                      onSuccess={handleFinalizeSuccess}
                                      onError={handleError}
                                      variant="primary"
                                      size="sm"
                                    />
                                    <RejectLeaveRequestButton
                                      leaveRequestId={request._id}
                                      onSuccess={handleFinalizeSuccess}
                                      onError={handleError}
                                      variant="danger"
                                      size="sm"
                                    />
                                  </>
                                )}
                                {/* Finalize button for approved requests */}
                                {request.status?.toLowerCase() === "approved" && !isFinalized(request) && (
                                  <FinalizeLeaveRequestButton
                                    leaveRequestId={request._id}
                                    onSuccess={handleFinalizeSuccess}
                                    onError={handleError}
                                    size="sm"
                                  />
                                )}
                                {/* Override button - only show when it's actually an override situation */}
                                {/* Don't show Override for pending requests that need approval (these use Approve/Reject buttons) */}
                                {/* Override is only for changing existing decisions, not for initial approvals */}
                                {(() => {
                                  const isPending = request.status?.toLowerCase() === "pending";
                                  const needsApproval = needsHRManagerApproval(request) || needsCEOApproval(request) || needsAnyApproval(request);
                                  
                                  // Never show Override for pending requests that need approval (use Approve/Reject instead)
                                  if (isPending && needsApproval) {
                                    return null;
                                  }
                                  
                                  // For non-pending requests or requests that don't need approval, show Override
                                  // Override is for changing decisions that were already made
                                  if (!isPending || !needsApproval) {
                                    return (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleOpenOverride(request)}
                                      >
                                        Override
                                      </Button>
                                    );
                                  }
                                  
                                  return null;
                                })()}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                  <Link
                    href="/dashboard/leaves/requests/review"
                    className="block mt-4 text-center text-orange-600 hover:underline font-medium"
                  >
                    View All Delegated Requests →
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* NEW: Team Requests Tab */}
        <TabsContent value="team" className="mt-6">
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="text-blue-900">Team Leave Requests</CardTitle>
              <CardDescription className="text-blue-700">
                Review and manage leave requests from your team members (HR Admin, Recruiter, HR Employee)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingTeamRequests ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-sm text-gray-600">Loading team requests...</p>
                </div>
              ) : teamRequests.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No pending team requests at this time.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {teamRequests.map((request) => {
                    const leaveTypeName = (request as any).leaveTypeName ||
                      (typeof request.leaveTypeId === "object" && request.leaveTypeId !== null
                        ? (request.leaveTypeId as any).name
                        : "Unknown Leave Type");
                    
                    return (
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
                                    <span className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-full ${getStatusBadgeColor(request.status)}`}>
                                      {request.status}
                                    </span>
                                  </div>
                                  <p className="text-sm text-gray-600">
                                    <span className="font-medium">{leaveTypeName}</span> • {request.durationDays} day{request.durationDays !== 1 ? 's' : ''}
                                  </p>
                                  <p className="text-xs text-gray-500 mt-1">
                                    {request.dates?.from && new Date(request.dates.from).toLocaleDateString()} - {request.dates?.to && new Date(request.dates.to).toLocaleDateString()}
                                  </p>
                                  {request.justification && (
                                    <p className="text-xs text-gray-600 mt-2 italic">
                                      {request.justification}
                                    </p>
                                  )}
                                </div>
                              </div>
                              
                              {/* Document Section - Always visible */}
                              <div className="pt-4 border-t border-gray-200">
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
                            </div>

                            {/* Right Section - Actions */}
                            <div className="lg:col-span-4 flex flex-col gap-2 lg:items-end lg:justify-start">
                              <div className="flex flex-wrap gap-2">
                                {request.status?.toLowerCase() === "pending" && (
                                  <>
                                    <ApproveLeaveRequestButton
                                      leaveRequestId={request._id}
                                      onSuccess={handleFinalizeSuccess}
                                      onError={handleError}
                                      variant="primary"
                                      size="sm"
                                    />
                                    <RejectLeaveRequestButton
                                      leaveRequestId={request._id}
                                      onSuccess={handleFinalizeSuccess}
                                      onError={handleError}
                                      variant="danger"
                                      size="sm"
                                    />
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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
          leaveRequests={activeTab === "delegated" ? delegatedPendingRequests : leaveRequests}
          onSuccess={handleBulkProcessSuccess}
          onError={handleError}
          onClose={() => setShowBulkDialog(false)}
        />
      )}
    </div>
  );
}

