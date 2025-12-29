"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/hooks/use-auth";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { ClockInOutButton } from "@/components/time-management/ClockInOutButton";
import { AttendanceRecordCard } from "@/components/time-management/AttendanceRecordCard";
import { CorrectionRequestForm } from "@/components/time-management/CorrectionRequestForm";
import { CorrectionRequestList } from "@/components/time-management/CorrectionRequestList";
import { timeManagementApi } from "@/lib/api/time-management/time-management.api";
import { AttendanceRecord } from "@/types/time-management";

export default function EmployeeTimeManagementPage() {
    const { user } = useAuth();
    const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
    const [loadingRecords, setLoadingRecords] = useState(true);
    const [selectedRecordForCorrection, setSelectedRecordForCorrection] = useState<string | null>(null);
    const [showCorrectionForm, setShowCorrectionForm] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);

    // Fetch attendance records
    useEffect(() => {
        if (!user?.id) return;

        const fetchRecords = async () => {
            try {
                setLoadingRecords(true);
                const response = await timeManagementApi.getAttendanceRecords(user.id);

                let records: any[] = [];

                if (response?.records && Array.isArray(response.records)) {
                    records = response.records;
                } else if (Array.isArray(response)) {
                    records = response;
                } else if (response?.data?.records && Array.isArray(response.data.records)) {
                    records = response.data.records;
                }

                // Fallback: if no list came back, try current status record
                if (records.length === 0) {
                const status = await timeManagementApi.getAttendanceStatus(user.id);
                if (status.currentRecord) {
                        records = [status.currentRecord];
                    }
                }

                setAttendanceRecords(records);
            } catch (err) {
                console.error("Failed to fetch attendance records:", err);
            } finally {
                setLoadingRecords(false);
            }
        };

        fetchRecords();
    }, [user?.id, refreshKey]);

    const handleRequestCorrection = (recordId: string) => {
        setSelectedRecordForCorrection(recordId);
        setShowCorrectionForm(true);
    };

    const handleCreateNewRequest = () => {
        setSelectedRecordForCorrection(null);
        setShowCorrectionForm(true);
    };

    const handleCorrectionSuccess = () => {
        setSelectedRecordForCorrection(null);
        setShowCorrectionForm(false);
        setRefreshKey(prev => prev + 1);
    };

    const handleCorrectionCancel = () => {
        setSelectedRecordForCorrection(null);
        setShowCorrectionForm(false);
    };

    return (
        <ProtectedRoute requiredUserType="employee">
            <div className="container mx-auto px-6 py-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Time Management</h1>
                    <p className="text-gray-600 mt-1">
                        Clock in/out and manage your attendance records
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Clock In/Out Section */}
                    <div className="lg:col-span-1">
                        <ClockInOutButton />

                        {/* Quick Create Correction Request Button */}
                        {!showCorrectionForm && (
                            <div className="mt-6">
                                <button
                                    onClick={handleCreateNewRequest}
                                    className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                                >
                                    + Create Correction Request
                                </button>
                                <p className="text-xs text-gray-500 mt-2 text-center">
                                    Submit a request to correct your attendance
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Main Content Section */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Correction Request Form (when creating) */}
                        {showCorrectionForm && (
                            <CorrectionRequestFormWithDropdown
                                attendanceRecords={attendanceRecords}
                                preSelectedRecordId={selectedRecordForCorrection}
                                onSuccess={handleCorrectionSuccess}
                                onCancel={handleCorrectionCancel}
                            />
                        )}

                        {/* Recent Attendance Records */}
                        {!showCorrectionForm && (
                            <div className="bg-white rounded-lg shadow p-6">
                                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                                    Recent Attendance
                                </h3>

                                {loadingRecords ? (
                                    <div className="animate-pulse space-y-3">
                                        <div className="h-24 bg-gray-200 rounded"></div>
                                        <div className="h-24 bg-gray-200 rounded"></div>
                                    </div>
                                ) : attendanceRecords.length > 0 ? (
                                    <div className="space-y-3">
                                        {attendanceRecords.map((record) => (
                                            <AttendanceRecordCard
                                                key={record._id || record.id}
                                                record={record}
                                                onRequestCorrection={handleRequestCorrection}
                                            />
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-gray-500">
                                        <p>No attendance records yet</p>
                                        <p className="text-sm mt-1">Clock in to create your first record</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Correction Requests List */}
                        {!showCorrectionForm && (
                            <CorrectionRequestList key={refreshKey} />
                        )}
                    </div>
                </div>
            </div>
        </ProtectedRoute>
    );
}

// Component with dropdown for selecting attendance records
function CorrectionRequestFormWithDropdown({
    attendanceRecords,
    preSelectedRecordId,
    onSuccess,
    onCancel,
}: {
    attendanceRecords: AttendanceRecord[];
    preSelectedRecordId: string | null;
    onSuccess: () => void;
    onCancel: () => void;
}) {
    const [selectedRecordId, setSelectedRecordId] = useState(preSelectedRecordId || "");
    const [reason, setReason] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const { user } = useAuth();

    // Default select the first record when available
    useEffect(() => {
        if (preSelectedRecordId) {
            setSelectedRecordId(preSelectedRecordId);
            return;
        }
        if (attendanceRecords.length > 0 && !selectedRecordId) {
            const first = attendanceRecords[0];
            setSelectedRecordId((first as any)._id || (first as any).id || "");
        }
    }, [attendanceRecords, preSelectedRecordId, selectedRecordId]);

    const formatRecordLabel = (record: AttendanceRecord) => {
        const date = new Date(record.date).toLocaleDateString([], {
            weekday: "short",
            month: "short",
            day: "numeric",
            year: "numeric",
        });
        const clockIn = record.clockIn
            ? new Date(record.clockIn).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
            : "N/A";
        const clockOut = record.clockOut
            ? new Date(record.clockOut).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
            : "N/A";
        return `${date} - In: ${clockIn}, Out: ${clockOut}`;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!user?.id) {
            setError("User not authenticated");
            return;
        }

        if (!selectedRecordId) {
            setError("Please select an attendance record");
            return;
        }

        if (!reason.trim()) {
            setError("Please provide a reason for the correction");
            return;
        }

        try {
            setLoading(true);
            setError(null);

            await timeManagementApi.submitCorrectionRequest({
                employeeId: user.id,
                attendanceRecord: selectedRecordId,
                reason: reason.trim(),
            });

            setSuccess(true);
            setTimeout(() => {
                onSuccess();
            }, 1500);
        } catch (err: any) {
            setError(err.message || "Failed to submit correction request");
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="bg-white rounded-lg shadow p-6">
                <div className="text-center">
                    <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                        <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Request Submitted!</h3>
                    <p className="text-sm text-gray-600">
                        Your correction request has been submitted and will be reviewed by your manager.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Request Attendance Correction</h3>

            {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="attendanceRecord" className="block text-sm font-medium text-gray-700 mb-2">
                        Select Attendance Record <span className="text-red-500">*</span>
                    </label>
                    <select
                        id="attendanceRecord"
                        value={selectedRecordId}
                        onChange={(e) => setSelectedRecordId(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                    >
                        <option value="">-- Select an attendance record --</option>
                        {attendanceRecords.map((record) => (
                            <option key={record._id || record.id} value={record._id || record.id}>
                                {formatRecordLabel(record)}
                            </option>
                        ))}
                    </select>
                    <p className="mt-1 text-xs text-gray-500">
                        Choose the attendance record you want to correct
                    </p>
                </div>

                <div>
                    <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-2">
                        Reason for Correction <span className="text-red-500">*</span>
                    </label>
                    <textarea
                        id="reason"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                        placeholder="Please explain why this attendance record needs correction..."
                        required
                    />
                    <p className="mt-1 text-xs text-gray-500">
                        Provide a clear explanation for your manager to review.
                    </p>
                </div>

                <div className="flex gap-3">
                    <button
                        type="submit"
                        disabled={loading || !selectedRecordId || !reason.trim()}
                        className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors font-medium"
                    >
                        {loading ? (
                            <span className="flex items-center justify-center">
                                <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                                    <circle
                                        className="opacity-25"
                                        cx="12"
                                        cy="12"
                                        r="10"
                                        stroke="currentColor"
                                        strokeWidth="4"
                                        fill="none"
                                    />
                                    <path
                                        className="opacity-75"
                                        fill="currentColor"
                                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                    />
                                </svg>
                                Submitting...
                            </span>
                        ) : (
                            "Submit Request"
                        )}
                    </button>

                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={loading}
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    );
}
