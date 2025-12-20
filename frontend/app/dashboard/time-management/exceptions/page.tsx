"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/hooks/use-auth";
import { useRequireAuth } from "@/lib/hooks/use-auth";
import { SystemRole } from "@/types";
import { timeManagementApi } from "@/lib/api/time-management/time-management.api";
import {
  TimeException,
  TimeExceptionStatus,
  TimeExceptionType,
  GetAllTimeExceptionsFilters,
  OverdueExceptionsResponse,
  AutoEscalateResponse,
} from "@/types/time-management";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/shared/ui/Card";
import { Button } from "@/components/shared/ui/Button";
import { Input } from "@/components/shared/ui/Input";
import { Select } from "@/components/leaves/Select";
import { Modal } from "@/components/leaves/Modal";
import { Toast, useToast } from "@/components/leaves/Toast";

export default function TimeExceptionsPage() {
  const { user } = useAuth();
  // Allow Department Heads and HR roles to access this page
  const isHRAdmin = user?.roles?.includes(SystemRole.HR_ADMIN);
  const isHRManager = user?.roles?.includes(SystemRole.HR_MANAGER);
  const isDepartmentHead = user?.roles?.includes(SystemRole.DEPARTMENT_HEAD);
  const isSystemAdmin = user?.roles?.includes(SystemRole.SYSTEM_ADMIN);
  
  if (!isHRAdmin && !isHRManager && !isDepartmentHead && !isSystemAdmin) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="text-center py-12">
          <p className="text-gray-500">Access denied. You need HR Admin, HR Manager, Department Head, or System Admin role.</p>
        </div>
      </div>
    );
  }
  
  const { toast, showToast, hideToast } = useToast();

  const [exceptions, setExceptions] = useState<TimeException[]>([]);
  const [overdueExceptions, setOverdueExceptions] = useState<OverdueExceptionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingOverdue, setLoadingOverdue] = useState(false);
  const [selectedException, setSelectedException] = useState<TimeException | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [isEscalateModalOpen, setIsEscalateModalOpen] = useState(false);
  const [isAutoEscalateModalOpen, setIsAutoEscalateModalOpen] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [processing, setProcessing] = useState(false);
  const [filters, setFilters] = useState<GetAllTimeExceptionsFilters>({});
  const [viewMode, setViewMode] = useState<"all" | "pending" | "overdue">("all");
  const [exceptionSection, setExceptionSection] = useState<"all" | "overtime" | "permission" | "exceptions">("all");
  const [thresholdDays, setThresholdDays] = useState<number>(3);
  const [autoEscalateDays, setAutoEscalateDays] = useState<number>(3);

  useEffect(() => {
    if (viewMode === "all") {
      loadAllExceptions();
      setExceptionSection("all"); // Reset section when switching to "all" view
    } else if (viewMode === "pending") {
      loadPendingExceptions();
    } else if (viewMode === "overdue") {
      loadOverdueExceptions();
    }
  }, [filters, viewMode]);

  const loadAllExceptions = async () => {
    try {
      setLoading(true);
      const data = await timeManagementApi.getAllTimeExceptions(filters);
      setExceptions(Array.isArray(data) ? data : []);
    } catch (error: any) {
      showToast(error.message || "Failed to load time exceptions", "error");
      setExceptions([]);
    } finally {
      setLoading(false);
    }
  };

  const loadPendingExceptions = async () => {
    try {
      setLoading(true);
      const data = await timeManagementApi.getMyPendingExceptions();
      setExceptions(Array.isArray(data) ? data : []);
    } catch (error: any) {
      showToast(error.message || "Failed to load pending exceptions", "error");
      setExceptions([]);
    } finally {
      setLoading(false);
    }
  };

  const loadOverdueExceptions = async () => {
    try {
      setLoadingOverdue(true);
      const data = await timeManagementApi.getOverdueExceptions(thresholdDays);
      setOverdueExceptions(data);
      // Map the response to TimeException array, providing default for attendanceRecordId
      const mappedExceptions: TimeException[] = (data.exceptions || []).map((exc: any) => ({
        ...exc,
        _id: exc.id || exc._id,
        attendanceRecordId: exc.attendanceRecordId || '',
      }));
      setExceptions(mappedExceptions);
    } catch (error: any) {
      showToast(error.message || "Failed to load overdue exceptions", "error");
      setOverdueExceptions(null);
      setExceptions([]);
    } finally {
      setLoadingOverdue(false);
    }
  };

  const handleViewDetails = async (exception: TimeException) => {
    try {
      const exceptionId = exception._id || exception.id || "";
      if (!exceptionId) {
        showToast("Invalid exception ID", "error");
        return;
      }
      const data = await timeManagementApi.getTimeExceptionById(exceptionId);
      setSelectedException(data);
      setIsDetailsModalOpen(true);
    } catch (error: any) {
      showToast(error.message || "Failed to load exception details", "error");
    }
  };

  const handleOpenApprove = (exception: TimeException) => {
    setSelectedException(exception);
    setApprovalNotes("");
    setIsApproveModalOpen(true);
  };

  const handleOpenReject = (exception: TimeException) => {
    setSelectedException(exception);
    setRejectionReason("");
    setIsRejectModalOpen(true);
  };

  const handleOpenEscalate = (exception: TimeException) => {
    setSelectedException(exception);
    setIsEscalateModalOpen(true);
  };

  const handleApprove = async () => {
    if (!selectedException) return;
    try {
      setProcessing(true);
      const exceptionId = selectedException._id || selectedException.id || "";
      await timeManagementApi.approveTimeException(
        exceptionId,
        approvalNotes || undefined
      );
      showToast("Time exception approved successfully", "success");
      setIsApproveModalOpen(false);
      setSelectedException(null);
      setApprovalNotes("");
      // Reload current view
      if (viewMode === "all") {
        loadAllExceptions();
      } else if (viewMode === "pending") {
        loadPendingExceptions();
      } else if (viewMode === "overdue") {
        loadOverdueExceptions();
      }
    } catch (error: any) {
      showToast(error.message || "Failed to approve exception", "error");
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedException) return;
    try {
      setProcessing(true);
      const exceptionId = selectedException._id || selectedException.id || "";
      await timeManagementApi.rejectTimeException(
        exceptionId,
        rejectionReason || undefined
      );
      showToast("Time exception rejected successfully", "success");
      setIsRejectModalOpen(false);
      setSelectedException(null);
      setRejectionReason("");
      // Reload current view
      if (viewMode === "all") {
        loadAllExceptions();
      } else if (viewMode === "pending") {
        loadPendingExceptions();
      } else if (viewMode === "overdue") {
        loadOverdueExceptions();
      }
    } catch (error: any) {
      showToast(error.message || "Failed to reject exception", "error");
    } finally {
      setProcessing(false);
    }
  };

  const handleEscalate = async () => {
    if (!selectedException) return;
    try {
      setProcessing(true);
      const exceptionId = selectedException._id || selectedException.id || "";
      await timeManagementApi.escalateTimeException(exceptionId);
      showToast("Time exception escalated successfully", "success");
      setIsEscalateModalOpen(false);
      setSelectedException(null);
      // Reload current view
      if (viewMode === "all") {
        loadAllExceptions();
      } else if (viewMode === "pending") {
        loadPendingExceptions();
      } else if (viewMode === "overdue") {
        loadOverdueExceptions();
      }
    } catch (error: any) {
      showToast(error.message || "Failed to escalate exception", "error");
    } finally {
      setProcessing(false);
    }
  };

  const handleAutoEscalate = async () => {
    try {
      setProcessing(true);
      const response = await timeManagementApi.autoEscalateOverdueExceptions(
        autoEscalateDays
      );
      showToast(
        `Successfully escalated ${response.summary.escalated} exception(s)`,
        "success"
      );
      setIsAutoEscalateModalOpen(false);
      setAutoEscalateDays(3);
      // Reload current view
      if (viewMode === "all") {
        loadAllExceptions();
      } else if (viewMode === "pending") {
        loadPendingExceptions();
      } else if (viewMode === "overdue") {
        loadOverdueExceptions();
      }
    } catch (error: any) {
      showToast(error.message || "Failed to auto-escalate exceptions", "error");
    } finally {
      setProcessing(false);
    }
  };

  const formatDate = (date: Date | string | undefined) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString();
  };

  const formatDateTime = (date: Date | string | undefined) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleString();
  };

  const getDaysPending = (createdAt: string | Date | undefined): number => {
    if (!createdAt) return 0;
    const created = new Date(createdAt);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - created.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const isOverdue = (createdAt: string | Date | undefined, status: string): boolean => {
    if (status === TimeExceptionStatus.APPROVED || status === TimeExceptionStatus.REJECTED || status === TimeExceptionStatus.RESOLVED) {
      return false;
    }
    const daysPending = getDaysPending(createdAt);
    return daysPending >= 3; // Overdue if pending for 3+ days
  };

  const getOverdueBadge = (createdAt: string | Date | undefined, status: string) => {
    if (!isOverdue(createdAt, status)) return null;
    const daysPending = getDaysPending(createdAt);
    return (
      <span className="ml-2 px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800 border border-red-300">
        {daysPending} days overdue
      </span>
    );
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

  const getTypeLabel = (type: TimeExceptionType) => {
    return type.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase());
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
      if (assignedTo._id) {
        return assignedTo._id.toString();
      }
    }
    return "N/A";
  };

  const canApproveOrReject = (status: TimeExceptionStatus): boolean => {
    return (
      status === TimeExceptionStatus.OPEN ||
      status === TimeExceptionStatus.PENDING ||
      status === TimeExceptionStatus.ESCALATED
    );
  };

  const isLoading = loading || (viewMode === "overdue" && loadingOverdue);

  return (
    <div className="container mx-auto px-6 py-8">
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
      />

      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Time Exception Approval Workflow</h1>
          <p className="text-gray-600 mt-1">
            Review, approve, or reject time-related requests and manage escalations
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={viewMode === "all" ? "primary" : "outline"}
            onClick={() => setViewMode("all")}
          >
            All Exceptions
          </Button>
          <Button
            variant={viewMode === "pending" ? "primary" : "outline"}
            onClick={() => setViewMode("pending")}
          >
            My Pending
          </Button>
          <Button
            variant={viewMode === "overdue" ? "primary" : "outline"}
            onClick={() => setViewMode("overdue")}
          >
            Overdue
          </Button>
          <Button
            variant="secondary"
            onClick={() => setIsAutoEscalateModalOpen(true)}
          >
            Auto-Escalate
          </Button>
        </div>
      </div>

      {/* Filters (only for "all" view) */}
      {viewMode === "all" && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Select
                label="Status"
                value={filters.status || ""}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    status: e.target.value || undefined,
                  })
                }
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
                value={filters.type || ""}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    type: e.target.value || undefined,
                  })
                }
                options={[
                  { value: "", label: "All Types" },
                  { value: TimeExceptionType.MISSED_PUNCH, label: "Missed Punch" },
                  { value: TimeExceptionType.LATE, label: "Late" },
                  { value: TimeExceptionType.EARLY_LEAVE, label: "Early Leave" },
                  { value: TimeExceptionType.SHORT_TIME, label: "Short Time" },
                  { value: TimeExceptionType.OVERTIME_REQUEST, label: "Overtime Request" },
                  { value: TimeExceptionType.MANUAL_ADJUSTMENT, label: "Manual Adjustment" },
                ]}
              />
              <Input
                type="text"
                label="Employee ID"
                value={filters.employeeId || ""}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    employeeId: e.target.value || undefined,
                  })
                }
                placeholder="Filter by employee ID"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Overdue threshold setting */}
      {viewMode === "overdue" && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Overdue Threshold</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Input
                type="number"
                label="Threshold (days)"
                value={thresholdDays.toString()}
                onChange={(e) => setThresholdDays(parseInt(e.target.value) || 3)}
                className="w-32"
                min="1"
              />
              <Button onClick={loadOverdueExceptions}>Refresh</Button>
              {overdueExceptions && (
                <div className="text-sm text-gray-600">
                  Total Overdue: <strong>{overdueExceptions.totalOverdue}</strong>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Exception Type Sections (only for "all" view) */}
      {viewMode === "all" && (
        <Card className="mb-6">
          <CardContent className="p-0">
            <div className="flex border-b border-gray-200 overflow-x-auto">
              <button
                onClick={() => setExceptionSection("all")}
                className={`px-6 py-4 font-medium whitespace-nowrap ${
                  exceptionSection === "all"
                    ? "border-b-2 border-blue-600 text-blue-600"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                All Requests
              </button>
              <button
                onClick={() => setExceptionSection("overtime")}
                className={`px-6 py-4 font-medium whitespace-nowrap ${
                  exceptionSection === "overtime"
                    ? "border-b-2 border-blue-600 text-blue-600"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Overtime Requests
              </button>
              <button
                onClick={() => setExceptionSection("permission")}
                className={`px-6 py-4 font-medium whitespace-nowrap ${
                  exceptionSection === "permission"
                    ? "border-b-2 border-blue-600 text-blue-600"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Permission Requests
              </button>
              <button
                onClick={() => setExceptionSection("exceptions")}
                className={`px-6 py-4 font-medium whitespace-nowrap ${
                  exceptionSection === "exceptions"
                    ? "border-b-2 border-blue-600 text-blue-600"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Time Exception Requests
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Exceptions Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            {viewMode === "all"
              ? exceptionSection === "all"
                ? "All Time Exceptions"
                : exceptionSection === "overtime"
                ? "Overtime Requests"
                : exceptionSection === "permission"
                ? "Permission Requests"
                : "Time Exception Requests"
              : viewMode === "pending"
              ? "My Pending Exceptions"
              : "Overdue Exceptions"}
          </CardTitle>
          <CardDescription>
            {viewMode === "all"
              ? exceptionSection === "all"
                ? "View and manage all time exceptions"
                : exceptionSection === "overtime"
                ? "Review and approve overtime requests from employees"
                : exceptionSection === "permission"
                ? "Review and approve permission requests (early in, late out, etc.)"
                : "Review and approve time exception requests (missed punch, late, early leave, etc.)"
              : viewMode === "pending"
              ? "Review exceptions assigned to you"
              : "View exceptions that need escalation"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Loading exceptions...</p>
            </div>
          ) : (() => {
            // Filter exceptions based on section
            let filteredExceptions = exceptions;
            if (viewMode === "all" && exceptionSection !== "all") {
              if (exceptionSection === "overtime") {
                filteredExceptions = exceptions.filter(
                  (ex) => ex.type === TimeExceptionType.OVERTIME_REQUEST
                );
              } else if (exceptionSection === "permission") {
                filteredExceptions = exceptions.filter(
                  (ex) =>
                    ex.type === TimeExceptionType.MANUAL_ADJUSTMENT &&
                    ex.reason?.includes("PERMISSION REQUEST")
                );
              } else if (exceptionSection === "exceptions") {
                filteredExceptions = exceptions.filter(
                  (ex) =>
                    ex.type !== TimeExceptionType.OVERTIME_REQUEST &&
                    !(ex.type === TimeExceptionType.MANUAL_ADJUSTMENT && ex.reason?.includes("PERMISSION REQUEST"))
                );
              }
            }

            return filteredExceptions.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500">
                  {viewMode === "all"
                    ? exceptionSection === "all"
                      ? "No time exceptions found."
                      : exceptionSection === "overtime"
                      ? "No overtime requests found."
                      : exceptionSection === "permission"
                      ? "No permission requests found."
                      : "No time exception requests found."
                    : viewMode === "pending"
                    ? "No pending exceptions assigned to you."
                    : "No overdue exceptions found."}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Employee</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Type</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Assigned To</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Reason</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Created</th>
                      {viewMode === "overdue" && (
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Days Pending</th>
                      )}
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredExceptions.map((exception) => {
                    const exceptionId = exception._id || exception.id || "";
                    const employeeDisplay = getEmployeeDisplay(exception.employeeId);
                    const assignedToDisplay = getAssignedToDisplay(exception.assignedTo);
                    
                    // Get display type - show "Permission Request" for permission requests
                    let displayType = getTypeLabel(exception.type);
                    if (exception.type === TimeExceptionType.MANUAL_ADJUSTMENT && exception.reason?.includes("PERMISSION REQUEST")) {
                      const reasonParts = exception.reason.split("|");
                      const typePart = reasonParts.find(p => p.includes("Type:"))?.replace("Type:", "").trim();
                      displayType = typePart ? `Permission: ${typePart}` : "Permission Request";
                    }

                    return (
                      <tr
                        key={exceptionId}
                        className="border-b border-gray-100 hover:bg-gray-50"
                      >
                        <td className="py-3 px-4">{employeeDisplay}</td>
                        <td className="py-3 px-4">{displayType}</td>
                        <td className="py-3 px-4">{assignedToDisplay}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center">
                            <span
                              className={`px-2 py-1 rounded text-xs font-medium border ${getStatusColor(
                                exception.status
                              )}`}
                            >
                              {exception.status}
                            </span>
                            {getOverdueBadge(exception.createdAt, exception.status)}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="max-w-xs truncate" title={exception.reason || "No reason provided"}>
                            {exception.reason || "N/A"}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div>
                            {formatDate(exception.createdAt)}
                            {viewMode !== "overdue" && (
                              <div className="text-xs text-gray-500 mt-1">
                                {getDaysPending(exception.createdAt)} days ago
                              </div>
                            )}
                          </div>
                        </td>
                        {viewMode === "overdue" && (exception as any).daysPending !== undefined && (
                          <td className="py-3 px-4">
                            <span className={isOverdue(exception.createdAt, exception.status) ? "text-red-600 font-medium" : ""}>
                              {(exception as any).daysPending} days
                            </span>
                          </td>
                        )}
                        <td className="py-3 px-4">
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewDetails(exception)}
                            >
                              View
                            </Button>
                            {canApproveOrReject(exception.status) && (
                              <>
                                <Button
                                  variant="primary"
                                  size="sm"
                                  onClick={() => handleOpenApprove(exception)}
                                >
                                  Approve
                                </Button>
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => handleOpenReject(exception)}
                                >
                                  Reject
                                </Button>
                                {exception.status !== TimeExceptionStatus.ESCALATED && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleOpenEscalate(exception)}
                                  >
                                    Escalate
                                  </Button>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })()}
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
        {selectedException && (
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
              <div className="flex gap-2 pt-4">
                <Button
                  variant="primary"
                  onClick={() => {
                    setIsDetailsModalOpen(false);
                    handleOpenApprove(selectedException);
                  }}
                >
                  Approve
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setIsDetailsModalOpen(false);
                    handleOpenReject(selectedException);
                  }}
                >
                  Reject
                </Button>
                {selectedException.status !== TimeExceptionStatus.ESCALATED && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsDetailsModalOpen(false);
                      handleOpenEscalate(selectedException);
                    }}
                  >
                    Escalate
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Approve Modal */}
      <Modal
        isOpen={isApproveModalOpen}
        onClose={() => {
          setIsApproveModalOpen(false);
          setSelectedException(null);
          setApprovalNotes("");
        }}
        title="Approve Time Exception"
        footer={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsApproveModalOpen(false);
                setSelectedException(null);
                setApprovalNotes("");
              }}
              disabled={processing}
            >
              Cancel
            </Button>
            <Button variant="primary" onClick={handleApprove} disabled={processing}>
              {processing ? "Approving..." : "Approve"}
            </Button>
          </div>
        }
      >
        {selectedException && (
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
              <p className="text-gray-900">{selectedException.reason || "N/A"}</p>
            </div>
            <div>
              <Input
                type="text"
                label="Approval Notes (Optional)"
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                placeholder="Add any notes for approval"
              />
            </div>
          </div>
        )}
      </Modal>

      {/* Reject Modal */}
      <Modal
        isOpen={isRejectModalOpen}
        onClose={() => {
          setIsRejectModalOpen(false);
          setSelectedException(null);
          setRejectionReason("");
        }}
        title="Reject Time Exception"
        footer={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsRejectModalOpen(false);
                setSelectedException(null);
                setRejectionReason("");
              }}
              disabled={processing}
            >
              Cancel
            </Button>
            <Button variant="secondary" onClick={handleReject} disabled={processing}>
              {processing ? "Rejecting..." : "Reject"}
            </Button>
          </div>
        }
      >
        {selectedException && (
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
              <p className="text-gray-900">{selectedException.reason || "N/A"}</p>
            </div>
            <div>
              <Input
                type="text"
                label="Rejection Reason (Optional)"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Provide a reason for rejection"
              />
            </div>
          </div>
        )}
      </Modal>

      {/* Escalate Modal */}
      <Modal
        isOpen={isEscalateModalOpen}
        onClose={() => {
          setIsEscalateModalOpen(false);
          setSelectedException(null);
        }}
        title="Escalate Time Exception"
        footer={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsEscalateModalOpen(false);
                setSelectedException(null);
              }}
              disabled={processing}
            >
              Cancel
            </Button>
            <Button variant="secondary" onClick={handleEscalate} disabled={processing}>
              {processing ? "Escalating..." : "Escalate"}
            </Button>
          </div>
        }
      >
        {selectedException && (
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
              <p className="text-gray-900">{selectedException.reason || "N/A"}</p>
            </div>
            <p className="text-sm text-gray-600">
              This exception will be escalated for urgent review.
            </p>
          </div>
        )}
      </Modal>

      {/* Auto-Escalate Modal */}
      <Modal
        isOpen={isAutoEscalateModalOpen}
        onClose={() => {
          setIsAutoEscalateModalOpen(false);
          setAutoEscalateDays(3);
        }}
        title="Auto-Escalate Overdue Exceptions"
        footer={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsAutoEscalateModalOpen(false);
                setAutoEscalateDays(3);
              }}
              disabled={processing}
            >
              Cancel
            </Button>
            <Button variant="primary" onClick={handleAutoEscalate} disabled={processing}>
              {processing ? "Processing..." : "Auto-Escalate"}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Automatically escalate all exceptions that have been pending for more than the specified number of days.
          </p>
          <div>
            <Input
              type="number"
              label="Threshold (days)"
              value={autoEscalateDays.toString()}
              onChange={(e) => setAutoEscalateDays(parseInt(e.target.value) || 3)}
              min="1"
            />
            <p className="text-sm text-gray-500 mt-1">
              Exceptions pending for more than {autoEscalateDays} days will be escalated.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
}

