"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/hooks/use-auth";
import { timeManagementApi } from "@/lib/api/time-management/time-management.api";
import { AttendanceCorrectionRequest, CorrectionRequestStatus } from "@/types/time-management";

export function CorrectionRequestList() {
    const { user } = useAuth();
    const [requests, setRequests] = useState<AttendanceCorrectionRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<string>("ALL");

    useEffect(() => {
        if (!user?.id) return;

        const fetchRequests = async () => {
            try {
                setLoading(true);
                setError(null);
                console.log("Fetching correction requests for employee:", user.id);
                const response = await timeManagementApi.getCorrectionRequestsByEmployee(
                    user.id,
                    statusFilter !== "ALL" ? { status: statusFilter } : undefined
                );
                
                console.log("Correction requests response:", response);
                
                // Backend returns { employeeId, summary, requests: [...] }
                let requests: AttendanceCorrectionRequest[] = [];
                if (response?.requests && Array.isArray(response.requests)) {
                    requests = response.requests;
                } else if (Array.isArray(response)) {
                    requests = response;
                } else if (response?.data?.requests && Array.isArray(response.data.requests)) {
                    requests = response.data.requests;
                } else if (response?.data && Array.isArray(response.data)) {
                    requests = response.data;
                }
                
                console.log("Extracted requests:", requests);
                setRequests(requests);
            } catch (err: any) {
                console.error("Failed to fetch correction requests:", err);
                setError(err.message || "Failed to load correction requests");
                setRequests([]);
            } finally {
                setLoading(false);
            }
        };

        fetchRequests();
    }, [user?.id, statusFilter]);

    const getStatusColor = (status: CorrectionRequestStatus) => {
        switch (status) {
            case CorrectionRequestStatus.SUBMITTED:
                return "bg-yellow-100 text-yellow-800 border-yellow-200";
            case CorrectionRequestStatus.IN_REVIEW:
                return "bg-blue-100 text-blue-800 border-blue-200";
            case CorrectionRequestStatus.APPROVED:
                return "bg-green-100 text-green-800 border-green-200";
            case CorrectionRequestStatus.REJECTED:
                return "bg-red-100 text-red-800 border-red-200";
            case CorrectionRequestStatus.ESCALATED:
                return "bg-purple-100 text-purple-800 border-purple-200";
            default:
                return "bg-gray-100 text-gray-800 border-gray-200";
        }
    };

    const formatDate = (date?: Date | string) => {
        if (!date) return "N/A";
        return new Date(date).toLocaleDateString([], {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    };

    if (loading) {
        return (
            <div className="bg-white rounded-lg shadow p-6">
                <div className="animate-pulse space-y-4">
                    <div className="h-6 bg-gray-200 rounded w-48"></div>
                    <div className="h-20 bg-gray-200 rounded"></div>
                    <div className="h-20 bg-gray-200 rounded"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Correction Requests</h3>

                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                    <option value="ALL">All Status</option>
                    <option value="SUBMITTED">Submitted</option>
                    <option value="IN_REVIEW">In Review</option>
                    <option value="APPROVED">Approved</option>
                    <option value="REJECTED">Rejected</option>
                    <option value="ESCALATED">Escalated</option>
                </select>
            </div>

            {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                    {error}
                </div>
            )}

            {requests.length === 0 ? (
                <div className="text-center py-8">
                    <svg
                        className="mx-auto h-12 w-12 text-gray-400"
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
                    <p className="mt-2 text-sm text-gray-600">No correction requests found</p>
                    <p className="text-xs text-gray-500 mt-1">
                        {statusFilter !== "ALL"
                            ? "Try changing the filter"
                            : "Submit a request when you need to correct attendance"}
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {requests.map((request) => {
                        const recordDate =
                            typeof request.attendanceRecord === "object" && request.attendanceRecord?.date
                                ? request.attendanceRecord.date
                                : null;

                        return (
                            <div
                                key={request._id || request.id}
                                className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow"
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <p className="font-medium text-gray-900">
                                            {recordDate ? formatDate(recordDate) : "Attendance Record"}
                                        </p>
                                        <p className="text-xs text-gray-500 mt-1">
                                            Submitted {formatDate(request.createdAt)}
                                        </p>
                                    </div>
                                    <span
                                        className={`px-2 py-1 text-xs font-medium rounded border ${getStatusColor(
                                            request.status
                                        )}`}
                                    >
                                        {request.status}
                                    </span>
                                </div>

                                {request.reason && (
                                    <div className="mt-2 p-2 bg-gray-50 rounded text-sm text-gray-700">
                                        <p className="text-xs text-gray-500 mb-1">Reason:</p>
                                        <p>{request.reason}</p>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
