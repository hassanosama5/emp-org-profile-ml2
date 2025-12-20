"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/hooks/use-auth";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { SystemRole } from "@/types";
import { timeManagementApi } from "@/lib/api/time-management/time-management.api";
import {
  AttendanceCorrectionRequest,
  CorrectionRequestStatus,
  GetAllCorrectionRequestsFilters,
} from "@/types/time-management";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/shared/ui/Card";
import { Button } from "@/components/shared/ui/Button";
import { Input } from "@/components/shared/ui/Input";
import { Select } from "@/components/leaves/Select";
import { Modal } from "@/components/leaves/Modal";
import { Toast, useToast } from "@/components/leaves/Toast";
import { CorrectionRequestList } from "@/components/time-management/CorrectionRequestList";
import Link from "next/link";

export default function AttendanceCorrectionsPage() {
  const { user } = useAuth();
  const { toast, showToast, hideToast } = useToast();

  const [requests, setRequests] = useState<AttendanceCorrectionRequest[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPending, setLoadingPending] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<AttendanceCorrectionRequest | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [approveReason, setApproveReason] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [processing, setProcessing] = useState(false);
  const [filters, setFilters] = useState<GetAllCorrectionRequestsFilters>({});
  const [viewMode, setViewMode] = useState<"all" | "pending">("all");
  const [isAdmin, setIsAdmin] = useState(false);
  const [accessError, setAccessError] = useState<string | null>(null);

  // Check if user is admin-level for corrections
  useEffect(() => {
    if (
      user?.roles?.includes(SystemRole.HR_ADMIN) ||
      user?.roles?.includes(SystemRole.SYSTEM_ADMIN) ||
      user?.roles?.includes(SystemRole.DEPARTMENT_HEAD) ||
      user?.roles?.includes(SystemRole.HR_MANAGER)
    ) {
      setIsAdmin(true);
    } else {
      setIsAdmin(false);
      setAccessError(null); // Employees are allowed to view/submit; only admin actions are gated
    }
  }, [user?.roles]);

  useEffect(() => {
    if (!isAdmin) return;
    
    if (viewMode === "all") {
      loadAllRequests();
    } else {
      loadPendingRequests();
    }
  }, [filters, viewMode, isAdmin]);

  const loadAllRequests = async () => {
    try {
      setLoading(true);
      const data = await timeManagementApi.getAllCorrectionRequests(filters);
      setRequests(Array.isArray(data) ? data : []);
    } catch (error: any) {
      showToast(error.message || "Failed to load correction requests", "error");
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const loadPendingRequests = async () => {
    try {
      setLoadingPending(true);
      const response = await timeManagementApi.getPendingCorrectionRequestsForManager();
      setPendingRequests(response.requests || []);
    } catch (error: any) {
      showToast(error.message || "Failed to load pending requests", "error");
      setPendingRequests([]);
    } finally {
      setLoadingPending(false);
    }
  };

  const handleViewDetails = async (request: AttendanceCorrectionRequest) => {
    try {
      const requestId = request._id || request.id || "";
      if (!requestId) {
        showToast("Invalid request ID", "error");
        return;
      }
      const response = await timeManagementApi.getCorrectionRequestById(requestId);
      if (response.success && response.request) {
        setSelectedRequest(response.request as AttendanceCorrectionRequest);
        setIsDetailsModalOpen(true);
      } else {
        showToast(response.message || "Failed to load request details", "error");
      }
    } catch (error: any) {
      showToast(error.message || "Failed to load request details", "error");
    }
  };

  const handleOpenApprove = (request: AttendanceCorrectionRequest) => {
    setSelectedRequest(request);
    setApproveReason("");
    setIsApproveModalOpen(true);
  };

  const handleOpenReject = (request: AttendanceCorrectionRequest) => {
    setSelectedRequest(request);
    setRejectReason("");
    setIsRejectModalOpen(true);
  };

  const handleApprove = async () => {
    if (!selectedRequest) return;
    try {
      setProcessing(true);
      const requestId = selectedRequest._id || selectedRequest.id || "";
      await timeManagementApi.approveCorrectionRequest(
        requestId,
        approveReason || undefined
      );
      showToast("Correction request approved successfully", "success");
      setIsApproveModalOpen(false);
      setSelectedRequest(null);
      setApproveReason("");
      if (viewMode === "all") {
        loadAllRequests();
      } else {
        loadPendingRequests();
      }
    } catch (error: any) {
      showToast(error.message || "Failed to approve request", "error");
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest || !rejectReason.trim()) {
      showToast("Please provide a reason for rejection", "error");
      return;
    }
    try {
      setProcessing(true);
      const requestId = selectedRequest._id || selectedRequest.id || "";
      await timeManagementApi.rejectCorrectionRequest(requestId, rejectReason);
      showToast("Correction request rejected successfully", "success");
      setIsRejectModalOpen(false);
      setSelectedRequest(null);
      setRejectReason("");
      if (viewMode === "all") {
        loadAllRequests();
      } else {
        loadPendingRequests();
      }
    } catch (error: any) {
      showToast(error.message || "Failed to reject request", "error");
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

  const getStatusColor = (status: CorrectionRequestStatus) => {
    switch (status) {
      case CorrectionRequestStatus.APPROVED:
        return "text-green-600 bg-green-50 border-green-200";
      case CorrectionRequestStatus.REJECTED:
        return "text-red-600 bg-red-50 border-red-200";
      case CorrectionRequestStatus.IN_REVIEW:
        return "text-blue-600 bg-blue-50 border-blue-200";
      case CorrectionRequestStatus.SUBMITTED:
        return "text-yellow-600 bg-yellow-50 border-yellow-200";
      case CorrectionRequestStatus.ESCALATED:
        return "text-orange-600 bg-orange-50 border-orange-200";
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

  const getAttendanceRecordDisplay = (attendanceRecord: any): string => {
    if (typeof attendanceRecord === "string") return attendanceRecord;
    if (attendanceRecord && typeof attendanceRecord === "object") {
      if (attendanceRecord.date) {
        return formatDate(attendanceRecord.date);
      }
      if (attendanceRecord._id) {
        return attendanceRecord._id.toString();
      }
    }
    return "N/A";
  };

  const canApproveOrReject = (status: CorrectionRequestStatus): boolean => {
    return (
      status === CorrectionRequestStatus.SUBMITTED ||
      status === CorrectionRequestStatus.IN_REVIEW ||
      status === CorrectionRequestStatus.ESCALATED
    );
  };

  const displayRequests = viewMode === "all" ? requests : pendingRequests;
  const isLoading = viewMode === "all" ? loading : loadingPending;

  return (
    <ProtectedRoute
      allowedRoles={[
        SystemRole.HR_ADMIN,
        SystemRole.HR_MANAGER,
        SystemRole.DEPARTMENT_HEAD,
        SystemRole.SYSTEM_ADMIN,
        SystemRole.DEPARTMENT_EMPLOYEE, // Employees can view their own requests
      ]}
    >
      <div className="container mx-auto px-6 py-8">
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
      />

      {!isAdmin ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">My Correction Requests</h1>
              <p className="text-gray-600 mt-1">
                Submit and track your own attendance correction requests
          </p>
        </div>
            <Link
              href="/dashboard/employee-profile/time-management"
              className="text-blue-600 hover:underline font-medium"
            >
              Request a Correction →
            </Link>
          </div>
          <CorrectionRequestList />
        </div>
      ) : (
        <>
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Attendance Correction Requests</h1>
              <p className="text-gray-600 mt-1">
                Review, approve, or reject attendance correction requests
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant={viewMode === "all" ? "primary" : "outline"}
                onClick={() => setViewMode("all")}
              >
                All Requests
              </Button>
              <Button
                variant={viewMode === "pending" ? "primary" : "outline"}
                onClick={() => setViewMode("pending")}
          >
            Pending Requests
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                { value: CorrectionRequestStatus.SUBMITTED, label: "Submitted" },
                { value: CorrectionRequestStatus.IN_REVIEW, label: "In Review" },
                { value: CorrectionRequestStatus.APPROVED, label: "Approved" },
                { value: CorrectionRequestStatus.REJECTED, label: "Rejected" },
                { value: CorrectionRequestStatus.ESCALATED, label: "Escalated" },
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

      {/* Requests Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            {viewMode === "all" ? "All Correction Requests" : "Pending Correction Requests"}
          </CardTitle>
          <CardDescription>
            {viewMode === "all"
              ? "View and manage all attendance correction requests"
              : "Review requests awaiting your approval"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Loading requests...</p>
            </div>
          ) : displayRequests.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">
                {viewMode === "all"
                  ? "No correction requests found."
                  : "No pending requests to review."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Employee</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Attendance Date</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Reason</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Submitted</th>
                    {viewMode === "pending" && (
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Waiting Days</th>
                    )}
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {displayRequests.map((request) => {
                    const requestId = request._id || request.id || "";
                    const employeeDisplay = getEmployeeDisplay(request.employeeId);
                    const attendanceDisplay = getAttendanceRecordDisplay(request.attendanceRecord);
                    const attendanceRecord = request.attendanceRecord as any;
                    const attendanceDate = attendanceRecord?.date
                      ? formatDate(attendanceRecord.date)
                      : attendanceDisplay;

                    return (
                      <tr
                        key={requestId}
                        className="border-b border-gray-100 hover:bg-gray-50"
                      >
                        <td className="py-3 px-4 text-gray-900">{employeeDisplay}</td>
                        <td className="py-3 px-4 text-gray-900">{attendanceDate}</td>
                        <td className="py-3 px-4 text-gray-900">
                          <div className="max-w-xs truncate" title={request.reason || "No reason provided"}>
                            {request.reason || "N/A"}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium border ${getStatusColor(
                              request.status
                            )}`}
                          >
                            {request.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-gray-900">{formatDate(request.createdAt)}</td>
                        {viewMode === "pending" && (request as any).waitingDays !== undefined && (
                          <td className="py-3 px-4 text-gray-900">{(request as any).waitingDays} days</td>
                        )}
                        <td className="py-3 px-4">
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewDetails(request)}
                            >
                              View
                            </Button>
                            {canApproveOrReject(request.status) && isAdmin && (
                              <>
                                <Button
                                  variant="primary"
                                  size="sm"
                                  onClick={() => handleOpenApprove(request)}
                                >
                                  Approve
                                </Button>
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => handleOpenReject(request)}
                                >
                                  Reject
                                </Button>
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
          )}
        </CardContent>
      </Card>

      {/* Details Modal */}
      <Modal
        isOpen={isDetailsModalOpen}
        onClose={() => {
          setIsDetailsModalOpen(false);
          setSelectedRequest(null);
        }}
        title="Correction Request Details"
        size="lg"
      >
        {selectedRequest && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Employee</label>
              <p className="text-gray-900">{getEmployeeDisplay(selectedRequest.employeeId)}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <span
                className={`inline-block px-2 py-1 rounded text-xs font-medium border ${getStatusColor(
                  selectedRequest.status
                )}`}
              >
                {selectedRequest.status}
              </span>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
              <p className="text-gray-900 whitespace-pre-wrap">{selectedRequest.reason || "N/A"}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Attendance Record</label>
              <p className="text-gray-900">{getAttendanceRecordDisplay(selectedRequest.attendanceRecord)}</p>
            </div>
            {selectedRequest.createdAt && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Submitted</label>
                <p className="text-gray-900">{formatDateTime(selectedRequest.createdAt)}</p>
              </div>
            )}
            {selectedRequest.updatedAt && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Updated</label>
                <p className="text-gray-900">{formatDateTime(selectedRequest.updatedAt)}</p>
              </div>
            )}
            {canApproveOrReject(selectedRequest.status) && (
              <div className="flex gap-2 pt-4">
                <Button
                  variant="primary"
                  onClick={() => {
                    setIsDetailsModalOpen(false);
                    handleOpenApprove(selectedRequest);
                  }}
                >
                  Approve
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setIsDetailsModalOpen(false);
                    handleOpenReject(selectedRequest);
                  }}
                >
                  Reject
                </Button>
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
          setSelectedRequest(null);
          setApproveReason("");
        }}
        title="Approve Correction Request"
        footer={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsApproveModalOpen(false);
                setSelectedRequest(null);
                setApproveReason("");
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
        {selectedRequest && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Employee</label>
              <p className="text-gray-900">{getEmployeeDisplay(selectedRequest.employeeId)}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
              <p className="text-gray-900">{selectedRequest.reason || "N/A"}</p>
            </div>
            <div>
              <Input
                type="text"
                label="Approval Notes (Optional)"
                value={approveReason}
                onChange={(e) => setApproveReason(e.target.value)}
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
          setSelectedRequest(null);
          setRejectReason("");
        }}
        title="Reject Correction Request"
        footer={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsRejectModalOpen(false);
                setSelectedRequest(null);
                setRejectReason("");
              }}
              disabled={processing}
            >
              Cancel
            </Button>
            <Button variant="secondary" onClick={handleReject} disabled={processing || !rejectReason.trim()}>
              {processing ? "Rejecting..." : "Reject"}
            </Button>
          </div>
        }
      >
        {selectedRequest && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Employee</label>
              <p className="text-gray-900">{getEmployeeDisplay(selectedRequest.employeeId)}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Request Reason</label>
              <p className="text-gray-900">{selectedRequest.reason || "N/A"}</p>
            </div>
            <div>
              <Input
                type="text"
                label="Rejection Reason *"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Please provide a reason for rejection"
                required
              />
              <p className="text-sm text-gray-500 mt-1">Rejection reason is required</p>
            </div>
          </div>
        )}
      </Modal>
        </>
      )}
      </div>
    </ProtectedRoute>
  );
}

