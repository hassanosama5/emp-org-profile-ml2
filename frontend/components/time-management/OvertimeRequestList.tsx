"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/hooks/use-auth";
import { timeManagementApi } from "@/lib/api/time-management/time-management.api";
import { TimeException, TimeExceptionStatus } from "@/types/time-management";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/shared/ui/Card";
import { Toast, useToast } from "@/components/leaves/Toast";

export function OvertimeRequestList() {
  const { user } = useAuth();
  const { toast, showToast, hideToast } = useToast();
  const [requests, setRequests] = useState<TimeException[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      loadOvertimeRequests();
    }
  }, [user?.id]);

  const loadOvertimeRequests = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const data = await timeManagementApi.getAllTimeExceptions({
        employeeId: user.id,
        type: "OVERTIME_REQUEST",
      });
      const allRequests = Array.isArray(data) ? data : [];
      // Sort by created date (newest first)
      allRequests.sort((a, b) => {
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        return dateB - dateA;
      });
      setRequests(allRequests);
    } catch (error: any) {
      console.error("Failed to load overtime requests:", error);
      showToast(error.message || "Failed to load overtime requests", "error");
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: TimeExceptionStatus) => {
    switch (status) {
      case TimeExceptionStatus.APPROVED:
        return "bg-green-100 text-green-800 border-green-200";
      case TimeExceptionStatus.REJECTED:
        return "bg-red-100 text-red-800 border-red-200";
      case TimeExceptionStatus.PENDING:
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case TimeExceptionStatus.OPEN:
        return "bg-blue-100 text-blue-800 border-blue-200";
      case TimeExceptionStatus.ESCALATED:
        return "bg-orange-100 text-orange-800 border-orange-200";
      case TimeExceptionStatus.RESOLVED:
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const formatDate = (date: Date | string | undefined) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString([], {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const extractOvertimeMinutes = (reason: string | undefined): number => {
    if (!reason) return 0;
    // Reason format: "Overtime Request: {minutes} minutes. Reason: {reason}"
    const match = reason.match(/Overtime Request:\s*(\d+)\s*minutes/i);
    return match ? parseInt(match[1], 10) : 0;
  };

  const formatOvertimeDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0 && mins > 0) {
      return `${hours}h ${mins}m`;
    } else if (hours > 0) {
      return `${hours}h`;
    } else {
      return `${mins}m`;
    }
  };

  return (
    <Card>
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
      />
      
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>My Overtime Requests</CardTitle>
            <CardDescription>
              View the status of your submitted overtime requests
            </CardDescription>
          </div>
          <button
            onClick={loadOvertimeRequests}
            className="text-sm text-blue-600 hover:text-blue-800"
            disabled={loading}
          >
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8">
            <p className="text-gray-500">Loading overtime requests...</p>
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No overtime requests found</p>
            <p className="text-sm text-gray-400 mt-1">
              Submit a request to get started
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((request) => {
              const overtimeMinutes = extractOvertimeMinutes(request.reason);
              const reasonText = request.reason
                ?.replace(/Overtime Request:\s*\d+\s*minutes\.\s*Reason:\s*/i, "")
                .trim() || "No reason provided";

              return (
                <div
                  key={request._id || request.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-gray-900">
                          Overtime Request
                        </h4>
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium border ${getStatusColor(
                            request.status
                          )}`}
                        >
                          {request.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        <span className="font-medium">Duration:</span>{" "}
                        {formatOvertimeDuration(overtimeMinutes)}
                      </p>
                      <p className="text-sm text-gray-600 mb-2">
                        <span className="font-medium">Reason:</span> {reasonText}
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-between items-center text-xs text-gray-500 pt-2 border-t border-gray-100">
                    <span>
                      Submitted: {formatDate(request.createdAt)}
                    </span>
                    {request.updatedAt &&
                      request.updatedAt !== request.createdAt && (
                        <span>
                          Updated: {formatDate(request.updatedAt)}
                        </span>
                      )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
