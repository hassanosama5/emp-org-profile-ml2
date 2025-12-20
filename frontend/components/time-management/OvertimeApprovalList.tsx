"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/lib/hooks/use-auth";
import { employeeProfileApi } from "@/lib/api/employee-profile/employee-profile";
import { timeManagementApi } from "@/lib/api/time-management/time-management.api";
import { TimeException, TimeExceptionStatus, TimeExceptionType, GetAllTimeExceptionsFilters } from "@/types/time-management";
import { TimeExceptionCard } from "./TimeExceptionCard";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/shared/ui/Card";
import { Button } from "@/components/shared/ui/Button";
import { Select } from "@/components/leaves/Select";
import { Modal } from "@/components/leaves/Modal";
import { Toast, useToast } from "@/components/leaves/Toast";

interface OvertimeApprovalListProps {
  filters?: GetAllTimeExceptionsFilters;
  showTeamOnly?: boolean; // For Line Managers to see only their team
}

export function OvertimeApprovalList({
  filters = {},
  showTeamOnly = false,
}: OvertimeApprovalListProps) {
  const { user } = useAuth();
  const { toast, showToast, hideToast } = useToast();
  const [exceptions, setExceptions] = useState<TimeException[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>(filters?.type || "");
  const [teamMemberIds, setTeamMemberIds] = useState<string[]>([]);
  const [selectedException, setSelectedException] = useState<TimeException | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Memoize filter values from props to avoid unnecessary re-renders
  const filterTypeFromProps = useMemo(() => filters?.type, [filters?.type]);
  const filterStatusFromProps = useMemo(() => filters?.status, [filters?.status]);
  const filterAssignedToFromProps = useMemo(() => filters?.assignedTo, [filters?.assignedTo]);

  // Load team members if showTeamOnly is true
  const loadTeamMembers = useCallback(async () => {
    if (!showTeamOnly || !user?.id) return;
    
    try {
      const teamMembers = await employeeProfileApi.getMyTeam();
      const ids = teamMembers.map((member: any) => member.id || member._id).filter(Boolean);
      setTeamMemberIds(ids);
    } catch (error: any) {
      console.error("Failed to load team members:", error);
      // If we can't load team members, fall back to assignedTo filter
      setTeamMemberIds([]);
    }
  }, [showTeamOnly, user?.id]);

  useEffect(() => {
    if (showTeamOnly && user?.id) {
      loadTeamMembers();
    } else if (!showTeamOnly) {
      // If not showing team only, we can load exceptions immediately
      setTeamMemberIds([]);
    }
  }, [showTeamOnly, user?.id, loadTeamMembers]);

  const loadExceptions = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      // Use prop filters as base, then allow UI filters to override (unless prop filter is set)
      const filtersToUse: GetAllTimeExceptionsFilters = {
        status: statusFilter || filterStatusFromProps || undefined,
        // If filters.type is set (from prop), use it; otherwise use typeFilter from UI
        type: filterTypeFromProps || typeFilter || undefined,
        // Only set assignedTo if showTeamOnly is true AND we don't have team member IDs yet
        // Otherwise, filter by team member IDs on the frontend
        assignedTo: showTeamOnly && teamMemberIds.length === 0 ? user.id : filterAssignedToFromProps || undefined,
      };

      console.log("Loading time exceptions with filters:", filtersToUse);
      const data = await timeManagementApi.getAllTimeExceptions(filtersToUse);
      console.log("Time exceptions response:", data);
      
      let allExceptions = Array.isArray(data) ? data : [];

      // Filter by team members if showTeamOnly is true and we have team member IDs
      if (showTeamOnly && teamMemberIds.length > 0) {
        allExceptions = allExceptions.filter((exception) => {
          const employeeId = typeof exception.employeeId === "string" 
            ? exception.employeeId 
            : (exception.employeeId as any)?._id || (exception.employeeId as any)?.id;
          return teamMemberIds.includes(employeeId);
        });
      }

      console.log("Filtered exceptions:", allExceptions);
      setExceptions(allExceptions);
    } catch (error: any) {
      console.error("Failed to load time exceptions:", error);
      const errorMessage = error?.response?.data?.message || 
                          error?.message || 
                          error?.toString() ||
                          "Failed to load time exceptions";
      console.error("Error details:", errorMessage);
      showToast(errorMessage, "error");
      setExceptions([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id, statusFilter, typeFilter, teamMemberIds, showTeamOnly, filterTypeFromProps, filterStatusFromProps, filterAssignedToFromProps, showToast]);

  useEffect(() => {
    // Only load if user is available
    if (user?.id) {
      loadExceptions();
    } else {
      setLoading(false);
    }
  }, [user?.id, loadExceptions]);

  const handleApprove = async (id: string, notes?: string) => {
    try {
      await timeManagementApi.approveTimeException(id, notes);
      showToast("Time exception approved successfully", "success");
      loadExceptions();
    } catch (error: any) {
      showToast(error.message || "Failed to approve exception", "error");
    }
  };

  const handleReject = async (id: string, reason: string) => {
    if (!id) {
      showToast("Exception ID is required", "error");
      return;
    }
    try {
      const result = await timeManagementApi.rejectTimeException(id, reason?.trim());
      showToast("Time exception rejected successfully", "success");
      loadExceptions();
    } catch (error: any) {
      console.error("Reject error:", error);
      const errorMessage = error?.response?.data?.message || 
                          error?.message || 
                          error?.toString() ||
                          "Failed to reject exception";
      showToast(errorMessage, "error");
    }
  };

  const handleViewDetails = async (id: string) => {
    try {
      setLoadingDetails(true);
      setIsDetailsModalOpen(true);
      // Fetch full exception details
      const exception = await timeManagementApi.getTimeExceptionById(id);
      setSelectedException(exception);
    } catch (error: any) {
      console.error("Failed to load exception details:", error);
      const errorMessage = error?.response?.data?.message || 
                          error?.message || 
                          "Failed to load exception details";
      showToast(errorMessage, "error");
      setIsDetailsModalOpen(false);
    } finally {
      setLoadingDetails(false);
    }
  };

  const pendingExceptions = exceptions.filter(
    (e) =>
      e.status === TimeExceptionStatus.OPEN ||
      e.status === TimeExceptionStatus.PENDING
  );

  // Helper functions for displaying details
  const getTypeLabel = (type: TimeExceptionType | string) => {
    if (typeof type === 'string') {
      return type.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase());
    }

    switch (type) {
      case TimeExceptionType.MISSED_PUNCH:
        return "Missed Punch";
      case TimeExceptionType.LATE:
        return "Late Arrival";
      case TimeExceptionType.EARLY_LEAVE:
        return "Early Leave";
      case TimeExceptionType.SHORT_TIME:
        return "Short Time";
      case TimeExceptionType.OVERTIME_REQUEST:
        return "Overtime Request";
      case TimeExceptionType.MANUAL_ADJUSTMENT:
        return "Manual Adjustment";
      default:
        return "Unknown Type";
    }
  };

  const getStatusColor = (status: TimeExceptionStatus) => {
    switch (status) {
      case TimeExceptionStatus.APPROVED:
        return "text-green-600 bg-green-50 border-green-200";
      case TimeExceptionStatus.REJECTED:
        return "text-red-600 bg-red-50 border-red-200";
      case TimeExceptionStatus.PENDING:
        return "text-blue-600 bg-blue-50 border-blue-200";
      case TimeExceptionStatus.OPEN:
        return "text-yellow-600 bg-yellow-50 border-yellow-200";
      case TimeExceptionStatus.ESCALATED:
        return "text-orange-600 bg-orange-50 border-orange-200";
      case TimeExceptionStatus.RESOLVED:
        return "text-gray-600 bg-gray-50 border-gray-200";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  const getEmployeeDisplay = (employeeId: any): string => {
    if (typeof employeeId === "string") return employeeId;
    if (employeeId && typeof employeeId === "object") {
      if (employeeId.firstName && employeeId.lastName) {
        return `${employeeId.firstName} ${employeeId.lastName}`;
      }
      if (employeeId.employeeNumber) {
        return employeeId.employeeNumber;
      }
      if (employeeId._id) {
        return employeeId._id.toString();
      }
    }
    return "N/A";
  };

  const getAssignedToDisplay = (assignedTo: any): string => {
    if (typeof assignedTo === "string") return assignedTo;
    if (assignedTo && typeof assignedTo === "object") {
      if (assignedTo.firstName && assignedTo.lastName) {
        return `${assignedTo.firstName} ${assignedTo.lastName}`;
      }
      if (assignedTo.email) {
        return assignedTo.email;
      }
    }
    return "N/A";
  };

  const formatDateTime = (date: Date | string | undefined) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleString();
  };

  const canApproveOrReject = (status: TimeExceptionStatus) => {
    return status === TimeExceptionStatus.OPEN || status === TimeExceptionStatus.PENDING;
  };

  return (
    <div>
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
      />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>
            {filters?.type === "OVERTIME_REQUEST" 
              ? "Filter overtime requests by status" 
              : "Filter time exceptions by status and type"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={[
                { value: "", label: "All Statuses" },
                { value: TimeExceptionStatus.OPEN, label: "Open" },
                { value: TimeExceptionStatus.PENDING, label: "Pending" },
                { value: TimeExceptionStatus.APPROVED, label: "Approved" },
                { value: TimeExceptionStatus.REJECTED, label: "Rejected" },
                { value: TimeExceptionStatus.ESCALATED, label: "Escalated" },
                { value: TimeExceptionStatus.RESOLVED, label: "Resolved" },
              ]}
            />
            <Select
              label="Type"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              disabled={!!filters?.type} // Disable if filter is set via prop
              options={[
                { value: "", label: "All Types" },
                { value: "OVERTIME_REQUEST", label: "Overtime Request" },
                { value: "MISSED_PUNCH", label: "Missed Punch" },
                { value: "LATE", label: "Late Arrival" },
                { value: "EARLY_LEAVE", label: "Early Leave" },
                { value: "SHORT_TIME", label: "Short Time" },
                { value: "MANUAL_ADJUSTMENT", label: "Manual Adjustment" },
              ]}
            />
          </div>
          <div className="mt-4">
            <Button onClick={loadExceptions} variant="outline">
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>
                {filters?.type === "OVERTIME_REQUEST" 
                  ? "Overtime Requests" 
                  : "Time Exceptions"}
              </CardTitle>
              <CardDescription>
                {filters?.type === "OVERTIME_REQUEST"
                  ? showTeamOnly
                    ? "Review and approve overtime requests from your team"
                    : "Review and approve all overtime requests"
                  : showTeamOnly
                    ? "Review and approve time exceptions from your team"
                    : "Review and approve all time exceptions"}
              </CardDescription>
            </div>
            {pendingExceptions.length > 0 && (
              <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
                {pendingExceptions.length} Pending
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <p className="text-gray-500">
                {filters?.type === "OVERTIME_REQUEST" 
                  ? "Loading overtime requests..." 
                  : "Loading time exceptions..."}
              </p>
            </div>
          ) : exceptions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">
                {filters?.type === "OVERTIME_REQUEST" 
                  ? "No overtime requests found" 
                  : "No time exceptions found"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {exceptions.map((exception) => (
                <TimeExceptionCard
                  key={exception._id || exception.id}
                  exception={exception}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  onViewDetails={handleViewDetails}
                  showActions={true}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Details Modal */}
      <Modal
        isOpen={isDetailsModalOpen}
        onClose={() => {
          setIsDetailsModalOpen(false);
          setSelectedException(null);
        }}
        title="Time Exception Details"
        size="lg"
      >
        {loadingDetails ? (
          <div className="text-center py-8">
            <p className="text-gray-500">Loading details...</p>
          </div>
        ) : selectedException ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Employee</label>
              <p className="text-gray-900">{getEmployeeDisplay(selectedException.employeeId)}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <p className="text-gray-900">{getTypeLabel(selectedException.type)}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Assigned To</label>
              <p className="text-gray-900">{getAssignedToDisplay(selectedException.assignedTo)}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <span
                className={`inline-block px-2 py-1 rounded text-xs font-medium border ${getStatusColor(
                  selectedException.status
                )}`}
              >
                {selectedException.status}
              </span>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
              <p className="text-gray-900 whitespace-pre-wrap">{selectedException.reason || "N/A"}</p>
            </div>
            {selectedException.createdAt && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Created</label>
                <p className="text-gray-900">{formatDateTime(selectedException.createdAt)}</p>
              </div>
            )}
            {selectedException.updatedAt && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Updated</label>
                <p className="text-gray-900">{formatDateTime(selectedException.updatedAt)}</p>
              </div>
            )}
            {canApproveOrReject(selectedException.status) && (
              <div className="flex gap-2 pt-4 border-t">
                {handleApprove && (
                  <Button
                    variant="primary"
                    onClick={() => {
                      setIsDetailsModalOpen(false);
                      const notes = prompt("Approval notes (optional):");
                      if (notes !== null) {
                        const exceptionId = selectedException._id || selectedException.id || "";
                        handleApprove(exceptionId, notes || undefined);
                      }
                    }}
                  >
                    Approve
                  </Button>
                )}
                {handleReject && (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setIsDetailsModalOpen(false);
                      const reason = prompt("Rejection reason (optional):");
                      if (reason !== null) {
                        const exceptionId = selectedException._id || selectedException.id || "";
                        handleReject(exceptionId, reason?.trim() || "");
                      }
                    }}
                  >
                    Reject
                  </Button>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500">No details available</p>
          </div>
        )}
      </Modal>
    </div>
  );
}

