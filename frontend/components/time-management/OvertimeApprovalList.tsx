"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/hooks/use-auth";
import { employeeProfileApi } from "@/lib/api/employee-profile/employee-profile";
import { timeManagementApi } from "@/lib/api/time-management/time-management.api";
import { TimeException, TimeExceptionStatus, GetAllTimeExceptionsFilters } from "@/types/time-management";
import { TimeExceptionCard } from "./TimeExceptionCard";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/shared/ui/Card";
import { Button } from "@/components/shared/ui/Button";
import { Select } from "@/components/leaves/Select";
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
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [teamMemberIds, setTeamMemberIds] = useState<string[]>([]);

  // Load team members if showTeamOnly is true
  useEffect(() => {
    if (showTeamOnly && user?.id) {
      loadTeamMembers();
    }
  }, [showTeamOnly, user?.id]);

  useEffect(() => {
    loadExceptions();
  }, [statusFilter, typeFilter, user?.id, teamMemberIds]);

  const loadTeamMembers = async () => {
    try {
      const teamMembers = await employeeProfileApi.getMyTeam();
      const ids = teamMembers.map((member: any) => member.id || member._id).filter(Boolean);
      setTeamMemberIds(ids);
    } catch (error: any) {
      console.error("Failed to load team members:", error);
      // If we can't load team members, fall back to assignedTo filter
      setTeamMemberIds([]);
    }
  };

  const loadExceptions = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const filtersToUse: GetAllTimeExceptionsFilters = {
        ...filters,
        status: statusFilter || undefined,
        type: typeFilter || undefined,
        assignedTo: showTeamOnly && teamMemberIds.length === 0 ? user.id : undefined,
      };

      const data = await timeManagementApi.getAllTimeExceptions(filtersToUse);
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

      setExceptions(allExceptions);
    } catch (error: any) {
      console.error("Failed to load time exceptions:", error);
      showToast(error.message || "Failed to load time exceptions", "error");
      setExceptions([]);
    } finally {
      setLoading(false);
    }
  };

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
    try {
      await timeManagementApi.rejectTimeException(id, reason);
      showToast("Time exception rejected successfully", "success");
      loadExceptions();
    } catch (error: any) {
      showToast(error.message || "Failed to reject exception", "error");
    }
  };

  const handleViewDetails = (id: string) => {
    // Navigate to details page or open modal
    window.location.href = `/dashboard/time-management/exceptions/${id}`;
  };

  const pendingExceptions = exceptions.filter(
    (e) =>
      e.status === TimeExceptionStatus.OPEN ||
      e.status === TimeExceptionStatus.PENDING
  );

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
          <CardDescription>Filter time exceptions by status and type</CardDescription>
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
              <CardTitle>Time Exceptions</CardTitle>
              <CardDescription>
                {showTeamOnly
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
              <p className="text-gray-500">Loading time exceptions...</p>
            </div>
          ) : exceptions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No time exceptions found</p>
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
    </div>
  );
}

