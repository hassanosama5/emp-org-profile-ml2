"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { leavesApi } from "@/lib/api/leaves/leaves";
import { authApi } from "@/lib/api/auth/auth";
import { LeaveRequest, LeaveType } from "@/types/leaves";
import { useAuthStore } from "@/lib/stores/auth.store";
import { useRequireAuth } from "@/lib/hooks/use-auth";
import { Card, CardContent } from "@/components/shared/ui/Card";
import { Button } from "@/components/shared/ui/Button";
import { CancelLeaveRequestButton } from "@/components/leaves/CancelLeaveRequestButton";
import { RoleGuard } from "@/components/auth/role-guard";
import { SystemRole } from "@/types";

export default function LeaveRequestsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [successMessage, setSuccessMessage] = useState<string>("");
  
  // Filter states
  const [filters, setFilters] = useState({
    leaveTypeId: "",
    fromDate: "",
    toDate: "",
    status: "",
    sortByDate: "desc" as "asc" | "desc",
    sortByStatus: "" as "asc" | "desc" | "",
  });
  const [showFilters, setShowFilters] = useState(false);

  useRequireAuth();

  useEffect(() => {
    // Get employeeId from user hook
    const employeeId = (user?.id || user?.userId || "") as string;
    if (employeeId && employeeId.trim()) {
      fetchLeaveRequests();
      fetchLeaveTypes();
    } else {
      console.warn("No employee ID found. User:", user);
      setError("Unable to retrieve employee ID. Please log in again.");
      setLoading(false);
    }
  }, [user]);

  const fetchLeaveRequests = async (useFilters = false) => {
    try {
      setLoading(true);
      setError("");
      // Get employeeId from multiple sources - prioritize JWT token
      const employeeId = (user?.id || user?.userId || "") as string;
      
      if (!employeeId || !employeeId.trim()) {
        throw new Error("Employee ID is required. Please log in again.");
      }
      
      if (useFilters && (filters.leaveTypeId || filters.fromDate || filters.toDate || filters.status || filters.sortByDate || filters.sortByStatus)) {
        // Use filter endpoint
        const result = await leavesApi.filterLeaveHistory(employeeId.trim(), {
          leaveTypeId: filters.leaveTypeId || undefined,
          fromDate: filters.fromDate || undefined,
          toDate: filters.toDate || undefined,
          status: filters.status || undefined,
          sortByDate: filters.sortByDate || undefined,
          sortByStatus: filters.sortByStatus || undefined,
        });
        setLeaveRequests(Array.isArray(result.items) ? result.items : []);
      } else {
        // Use simple endpoint with basic filters
        const requestFilters: any = {};
        if (filters.fromDate) requestFilters.fromDate = filters.fromDate;
        if (filters.toDate) requestFilters.toDate = filters.toDate;
        if (filters.status) requestFilters.status = filters.status;
        if (filters.leaveTypeId) requestFilters.leaveTypeId = filters.leaveTypeId;
        
        const requests = await leavesApi.getEmployeeLeaveRequests(employeeId.trim(), Object.keys(requestFilters).length > 0 ? requestFilters : undefined);
        let sortedRequests = Array.isArray(requests) ? requests : [];
        
        // Client-side sorting if needed
        if (filters.sortByDate) {
          sortedRequests.sort((a, b) => {
            const dateA = new Date(a.dates?.from || 0).getTime();
            const dateB = new Date(b.dates?.from || 0).getTime();
            return filters.sortByDate === "asc" ? dateA - dateB : dateB - dateA;
          });
        }
        if (filters.sortByStatus) {
          sortedRequests.sort((a, b) => {
            const statusA = a.status || "";
            const statusB = b.status || "";
            return filters.sortByStatus === "asc" 
              ? statusA.localeCompare(statusB)
              : statusB.localeCompare(statusA);
          });
        }
        
        setLeaveRequests(sortedRequests);
      }
    } catch (error: any) {
      console.error("Error fetching leave requests:", error);
      setError(error.message || "Failed to load leave requests");
      setLeaveRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchLeaveTypes = async () => {
    try {
      const types = await leavesApi.getLeaveTypes();
      setLeaveTypes(types || []);
    } catch (error) {
      console.warn("Failed to fetch leave types:", error);
      setLeaveTypes([]);
    }
  };

  const handleCancelSuccess = () => {
    setSuccessMessage("Leave request cancelled successfully");
    fetchLeaveRequests();
    setTimeout(() => setSuccessMessage(""), 3000);
  };

  const handleCancelError = (errorMessage: string) => {
    setError(errorMessage);
    setTimeout(() => setError(""), 5000);
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
    
    // Check if the initial approval role is "HR Manager" (department head request)
    // If so, HR Manager approval is the initial approval, not an override
    const initialApproval = request.approvalFlow[0];
    if (initialApproval?.role === "HR Manager" && hrManagerEntries.length === 1) {
      return false; // This is initial approval for department head, not an override
    }
    
    // Find the LAST HR Manager entry index (overrides are added at the end)
    let lastHrIndex = -1;
    for (let i = request.approvalFlow.length - 1; i >= 0; i--) {
      if (request.approvalFlow[i].role === "HR Manager") {
        lastHrIndex = i;
        break;
      }
    }
    
    if (lastHrIndex === -1) {
      return false;
    }
    
    // If there are multiple HR Manager entries, the last one is likely an override
    // (HR Manager added a new entry after already having one)
    if (hrManagerEntries.length > 1) {
      // Check if there's a Department Head or other supervisor decision before the last HR Manager entry
      const supervisorEntry = request.approvalFlow
        .slice(0, lastHrIndex)
        .reverse()
        .find((approval) => 
          approval.role === "Departement_Head" || 
          approval.role === "Department Head" ||
          approval.role === "HR Manager" ||
          approval.role?.toLowerCase().includes("department") ||
          approval.role?.toLowerCase().includes("manager")
        );
      
      // If there's a supervisor decision before the last HR Manager entry, it's an override
      if (supervisorEntry) {
        return true;
      }
    }
    
    // Check if there's a Department Head decision before the last HR Manager entry
    const deptHeadEntry = request.approvalFlow
      .slice(0, lastHrIndex)
      .reverse()
      .find((approval) => 
        approval.role === "Departement_Head" || 
        approval.role === "Department Head" ||
        approval.role?.toLowerCase().includes("department")
      );
    
    if (!deptHeadEntry) {
      // No Department Head decision before HR Manager = it's an override
      // But only if there are multiple HR Manager entries (meaning one was added for override)
      return hrManagerEntries.length > 1;
    }
    
    // Get the LAST HR Manager entry and Department Head status
    const hrEntry = request.approvalFlow[lastHrIndex];
    const deptHeadStatus = deptHeadEntry.status?.toLowerCase();
    const hrStatus = hrEntry.status?.toLowerCase();
    
    // Finalization: Department Head approved → HR Manager approves (same status, normal flow)
    // Override: Department Head rejected → HR Manager approves (status changed)
    // Override: Department Head approved → HR Manager rejects (status changed)
    // Override: Any status change by HR Manager
    
    // If both are approved and Department Head approved first = finalization (not override)
    // But only if there's only one HR Manager entry
    if (deptHeadStatus === "approved" && hrStatus === "approved" && hrManagerEntries.length === 1) {
      return false; // This is finalization, not override
    }
    
    // If statuses don't match = override (HR changed the decision)
    if (deptHeadStatus !== hrStatus) {
      return true;
    }
    
    // If there are multiple HR Manager entries, it's an override (HR Manager added a new entry)
    return hrManagerEntries.length > 1;
  };

  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case "PENDING":
        return "bg-yellow-100 text-yellow-800";
      case "APPROVED":
        return "bg-green-100 text-green-800";
      case "REJECTED":
        return "bg-red-100 text-red-800";
      case "CANCELLED":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-blue-100 text-blue-800";
    }
  };

  const getLeaveTypeName = (request: LeaveRequest): string => {
    // First, check if leaveTypeName is directly provided (from backend population)
    if (request.leaveTypeName) {
      return request.leaveTypeName;
    }
    
    // Otherwise, try to resolve from leaveTypeId
    const leaveTypeId = request.leaveTypeId;
    if (!leaveTypeId) {
      return "Unknown Leave Type";
    }
    
    if (typeof leaveTypeId === "string") {
      const type = leaveTypes.find((lt) => lt._id === leaveTypeId);
      return type?.name || leaveTypeId;
    }
    
    // If it's an object (LeaveType), check if it has a name property
    if (typeof leaveTypeId === "object" && leaveTypeId !== null) {
      return (leaveTypeId as LeaveType).name || "Unknown Leave Type";
    }
    
    return "Unknown Leave Type";
  };

  const formatDate = (date: Date | string | undefined): string => {
    if (!date) return "N/A";
    const d = new Date(date);
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // All roles except JOB_CANDIDATE can create leave requests
  const allowedRoles = [
    SystemRole.DEPARTMENT_EMPLOYEE,
    SystemRole.DEPARTMENT_HEAD,
    SystemRole.HR_MANAGER,
    SystemRole.HR_EMPLOYEE,
    SystemRole.PAYROLL_SPECIALIST,
    SystemRole.PAYROLL_MANAGER,
    SystemRole.SYSTEM_ADMIN,
    SystemRole.LEGAL_POLICY_ADMIN,
    SystemRole.FINANCE_STAFF,
    SystemRole.HR_ADMIN,
    SystemRole.RECRUITER,
  ];

  const accessDeniedFallback = (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 rounded-md bg-red-50 p-4 border border-red-200">
        <p className="text-sm font-medium text-red-800">
          Access denied: You need one of these roles: {allowedRoles.join(", ")}. Your roles: {user?.roles?.join(", ") || "None"}
        </p>
      </div>
    </div>
  );

  return (
    <RoleGuard allowedRoles={allowedRoles} fallback={accessDeniedFallback}>
      <div className="container mx-auto max-w-6xl px-4 py-8">
        {loading && (
          <Card className="border-2 border-teal-200 bg-gradient-to-br from-teal-50 to-cyan-50">
            <CardContent className="py-12 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-teal-400 to-cyan-500 rounded-full mb-4 animate-pulse">
                <svg className="w-8 h-8 text-white animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              <p className="text-teal-700 font-semibold text-lg">Loading leave requests...</p>
            </CardContent>
          </Card>
        )}
        {!loading && (
          <>
            <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-3 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">My Leave Requests</h1>
            <p className="mt-2 text-sm text-gray-600">
              View and manage your leave requests
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Link href="/dashboard/leaves/balance">
            <Button 
              variant="outline"
              className="inline-flex items-center gap-2 px-4 py-2 border-2 border-teal-300 text-teal-700 font-semibold rounded-lg hover:bg-gradient-to-r hover:from-teal-50 hover:to-cyan-50 hover:border-teal-400 transition-all duration-200"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              View Leave Balance
            </Button>
          </Link>
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="inline-flex items-center gap-2 px-4 py-2 border-2 border-teal-300 text-teal-700 font-semibold rounded-lg hover:bg-gradient-to-r hover:from-teal-50 hover:to-cyan-50 hover:border-teal-400 transition-all duration-200"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            {showFilters ? "Hide Filters" : "Show Filters"}
          </Button>
          <Link href="/dashboard/leaves/requests/new">
            <Button className="inline-flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-teal-500 to-cyan-600 text-white font-semibold rounded-lg hover:from-teal-600 hover:to-cyan-700 transition-all duration-200 shadow-lg hover:shadow-xl">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create New Request
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <Card className="mb-6 border-2 border-teal-200 bg-gradient-to-br from-teal-50 to-cyan-50">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Leave Type
                </label>
                <select
                  value={filters.leaveTypeId}
                  onChange={(e) => setFilters({ ...filters, leaveTypeId: e.target.value })}
                  className="w-full px-3 py-2 border-2 border-teal-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-400"
                >
                  <option value="">All Types</option>
                  {leaveTypes.map((type) => (
                    <option key={type._id} value={type._id}>
                      {type.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  className="w-full px-3 py-2 border-2 border-teal-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-400"
                >
                  <option value="">All Statuses</option>
                  <option value="PENDING">Pending</option>
                  <option value="APPROVED">Approved</option>
                  <option value="REJECTED">Rejected</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  From Date
                </label>
                <input
                  type="date"
                  value={filters.fromDate}
                  onChange={(e) => setFilters({ ...filters, fromDate: e.target.value })}
                  className="w-full px-3 py-2 border-2 border-teal-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  To Date
                </label>
                <input
                  type="date"
                  value={filters.toDate}
                  onChange={(e) => setFilters({ ...filters, toDate: e.target.value })}
                  className="w-full px-3 py-2 border-2 border-teal-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sort By Date
                </label>
                <select
                  value={filters.sortByDate}
                  onChange={(e) => setFilters({ ...filters, sortByDate: e.target.value as "asc" | "desc" })}
                  className="w-full px-3 py-2 border-2 border-teal-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-400"
                >
                  <option value="desc">Newest First</option>
                  <option value="asc">Oldest First</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sort By Status
                </label>
                <select
                  value={filters.sortByStatus}
                  onChange={(e) => setFilters({ ...filters, sortByStatus: e.target.value as "asc" | "desc" | "" })}
                  className="w-full px-3 py-2 border-2 border-teal-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-400"
                >
                  <option value="">No Sort</option>
                  <option value="asc">A-Z</option>
                  <option value="desc">Z-A</option>
                </select>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <Button 
                onClick={() => fetchLeaveRequests(true)}
                className="inline-flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-teal-500 to-cyan-600 text-white font-semibold rounded-lg hover:from-teal-600 hover:to-cyan-700 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                Apply Filters
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setFilters({
                    leaveTypeId: "",
                    fromDate: "",
                    toDate: "",
                    status: "",
                    sortByDate: "desc",
                    sortByStatus: "",
                  });
                  fetchLeaveRequests();
                }}
                className="inline-flex items-center gap-2 px-6 py-2 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gradient-to-r hover:from-gray-50 hover:to-slate-50 hover:border-gray-400 transition-all duration-200"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>
            )}

            {successMessage && (
        <div className="mb-6 rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 p-4 border-2 border-green-300">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-gradient-to-br from-green-400 to-emerald-500 rounded-lg">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-green-800">{successMessage}</p>
          </div>
        </div>
            )}

            {error && (
        <div className="mb-6 rounded-xl bg-gradient-to-r from-red-50 to-rose-50 p-4 border-2 border-red-300">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-gradient-to-br from-red-400 to-rose-500 rounded-lg">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-red-800">{error}</p>
          </div>
        </div>
            )}

            {leaveRequests.length === 0 ? (
        <Card className="p-8 text-center border-2 border-teal-200 bg-gradient-to-br from-teal-50 to-cyan-50">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-teal-400 to-cyan-500 rounded-full mb-4">
            <svg
              className="w-8 h-8 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <h3 className="mt-4 text-lg font-bold text-gray-900">
            No leave requests
          </h3>
          <p className="mt-2 text-sm text-gray-600">
            You haven't submitted any leave requests yet.
          </p>
          <div className="mt-6">
            <Link href="/dashboard/leaves/requests/new">
              <Button className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-teal-500 to-cyan-600 text-white font-semibold rounded-lg hover:from-teal-600 hover:to-cyan-700 transition-all duration-200 shadow-lg hover:shadow-xl">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create Your First Request
              </Button>
            </Link>
          </div>
        </Card>
            ) : (
              <div className="space-y-4">
          {leaveRequests.map((request, index) => {
            const isEven = index % 2 === 0;
            return (
            <Card 
              key={request._id} 
              className={`p-6 border-2 transition-all duration-200 hover:shadow-lg ${
                isEven 
                  ? 'border-teal-200 bg-gradient-to-br from-teal-50 to-cyan-50 hover:border-teal-300' 
                  : 'border-cyan-200 bg-gradient-to-br from-cyan-50 to-teal-50 hover:border-cyan-300'
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3 flex-wrap">
                    <div className="p-2 bg-gradient-to-br from-teal-400 to-cyan-500 rounded-lg">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">
                      {getLeaveTypeName(request)}
                    </h3>
                    <span
                      className={`inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full ${
                        request.status?.toUpperCase() === "PENDING"
                          ? "bg-gradient-to-r from-yellow-100 to-amber-100 text-yellow-800 border border-yellow-300"
                          : request.status?.toUpperCase() === "APPROVED"
                          ? "bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border border-green-300"
                          : request.status?.toUpperCase() === "REJECTED"
                          ? "bg-gradient-to-r from-red-100 to-rose-100 text-red-800 border border-red-300"
                          : request.status?.toUpperCase() === "CANCELLED"
                          ? "bg-gradient-to-r from-gray-100 to-slate-100 text-gray-800 border border-gray-300"
                          : "bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 border border-blue-300"
                      }`}
                    >
                      {request.status}
                    </span>
                    {/* ENHANCED: Show finalized indicator */}
                    {isFinalized(request) && (
                      <span
                        className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-full bg-gradient-to-r from-purple-100 to-pink-100 text-purple-800 border border-purple-300"
                        title="Finalized by HR Manager - Leave balances have been updated"
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
                        className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-full bg-gradient-to-r from-orange-100 to-amber-100 text-orange-800 border border-orange-300"
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
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
                    <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                      <p className="text-xs font-semibold text-blue-700 mb-1">From Date</p>
                      <p className="text-sm font-bold text-blue-900">{formatDate(request.dates.from)}</p>
                    </div>
                    <div className="p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
                      <p className="text-xs font-semibold text-purple-700 mb-1">To Date</p>
                      <p className="text-sm font-bold text-purple-900">{formatDate(request.dates.to)}</p>
                    </div>
                    <div className="p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                      <p className="text-xs font-semibold text-green-700 mb-1">Duration</p>
                      <p className="text-sm font-bold text-green-900">
                        {request.durationDays} day{request.durationDays !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                  {request.justification && (
                    <div className="mt-3 p-3 bg-gradient-to-r from-gray-50 to-slate-50 rounded-lg border border-gray-200">
                      <p className="text-xs font-semibold text-gray-700 mb-1">Reason</p>
                      <p className="text-sm text-gray-800">{request.justification}</p>
                    </div>
                  )}
                  {request.createdAt && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-gray-500">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Submitted on {formatDate(request.createdAt)}
                    </div>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  {request.status?.toUpperCase() === "PENDING" && (
                    <>
                      <Link href={`/dashboard/leaves/requests/edit/${request._id}`}>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="border-teal-300 text-teal-700 hover:bg-gradient-to-r hover:from-teal-50 hover:to-cyan-50 hover:border-teal-400 transition-all duration-200"
                        >
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Edit
                        </Button>
                      </Link>
                      <CancelLeaveRequestButton
                        leaveRequestId={request._id}
                        onSuccess={handleCancelSuccess}
                        onError={handleCancelError}
                        size="sm"
                      />
                    </>
                  )}
                  {request.status?.toUpperCase() !== "PENDING" && (
                    <div className="flex items-center gap-1 px-3 py-1 rounded-md bg-gray-100 text-gray-600 text-xs">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                      </svg>
                      Cannot modify {request.status?.toLowerCase() || "this"} requests
                    </div>
                  )}
                </div>
              </div>
            </Card>
            );
          })}
              </div>
            )}
          </>
        )}
      </div>
    </RoleGuard>
  );
}
