"use client";

import { AttendanceRecord } from "@/types/time-management";

interface AttendanceRecordCardProps {
    record: AttendanceRecord;
    onRequestCorrection?: (recordId: string) => void;
}

export function AttendanceRecordCard({ record, onRequestCorrection }: AttendanceRecordCardProps) {
    const deriveFromPunches = () => {
        const raw: any[] = Array.isArray((record as any)?.punches) ? (record as any).punches : [];
        const flat = raw.flatMap((p: any) => (Array.isArray(p) ? p : [p]));
        const parsed = flat
            .map((p: any) => ({
                type: String(p?.type ?? "").trim().toUpperCase(),
                time: p?.time ? new Date(p.time) : null,
            }))
            .filter((p) => p.time && !isNaN((p.time as Date).getTime()))
            .sort((a, b) => (a.time as Date).getTime() - (b.time as Date).getTime());

        const firstIn = parsed.find((p) => p.type === "IN");
        const lastOut = [...parsed].reverse().find((p) => p.type === "OUT");
        const punchCount = parsed.length;

        return {
            punchCount,
            clockIn: (firstIn?.time || parsed[0]?.time || undefined) as Date | undefined,
            clockOut: (lastOut?.time || (punchCount > 1 ? parsed[punchCount - 1]?.time : undefined)) as Date | undefined,
        };
    };

    const derived = deriveFromPunches();

    const formatTime = (time?: Date | string) => {
        if (!time) return "N/A";
        return new Date(time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    };

    const formatDate = (date: Date | string) => {
        return new Date(date).toLocaleDateString([], {
            weekday: "short",
            year: "numeric",
            month: "short",
            day: "numeric"
        });
    };

    const formatWorkHours = (minutes?: number) => {
        if (!minutes) return "0h 0m";
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours}h ${mins}m`;
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "COMPLETE":
                return "bg-green-100 text-green-800 border-green-200";
            case "INCOMPLETE":
                return "bg-yellow-100 text-yellow-800 border-yellow-200";
            case "CORRECTION_PENDING":
                return "bg-blue-100 text-blue-800 border-blue-200";
            default:
                return "bg-gray-100 text-gray-800 border-gray-200";
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case "COMPLETE":
                return "Complete";
            case "INCOMPLETE":
                return "Incomplete";
            case "CORRECTION_PENDING":
                return "Correction Pending";
            default:
                return status;
        }
    };

    const effectiveClockIn = record.clockIn || (derived.clockIn as any);
    const effectiveClockOut = record.clockOut || (derived.clockOut as any);
    const displayStatus =
        (record.status === "COMPLETE" && !effectiveClockOut) || (derived.punchCount % 2 !== 0 && derived.punchCount > 0)
            ? "INCOMPLETE"
            : record.status;

    const hasMissedPunch = record.hasMissedPunch || displayStatus === "INCOMPLETE";

    return (
        <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-3">
                <div>
                    <h4 className="font-medium text-gray-900">{formatDate(record.date)}</h4>
                    <p className="text-sm text-gray-500 mt-1">
                        {formatWorkHours(record.totalWorkMinutes)} worked
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {hasMissedPunch && (
                        <span className="px-2 py-1 text-xs font-medium rounded border border-red-200 bg-red-50 text-red-700">
                            Missed Punch
                        </span>
                    )}
                    <span className={`px-2 py-1 text-xs font-medium rounded border ${getStatusColor(displayStatus)}`}>
                        {getStatusLabel(displayStatus)}
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-3">
                <div>
                    <p className="text-xs text-gray-500">Clock In</p>
                    <p className="text-sm font-medium text-gray-900">{formatTime(effectiveClockIn)}</p>
                </div>
                <div>
                    <p className="text-xs text-gray-500">Clock Out</p>
                    <p className="text-sm font-medium text-gray-900">{formatTime(effectiveClockOut)}</p>
                </div>
            </div>

            {hasMissedPunch && onRequestCorrection && (
                <button
                    onClick={() => onRequestCorrection(record._id || record.id || "")}
                    className="w-full mt-2 px-3 py-2 text-sm bg-blue-50 text-blue-700 hover:bg-blue-100 rounded border border-blue-200 transition-colors"
                >
                    Request Correction
                </button>
            )}

            {record.punches && record.punches.length > 2 && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-xs text-gray-500 mb-2">All Punches ({record.punches.length})</p>
                    <div className="space-y-1">
                        {record.punches.map((punch, index) => (
                            <div key={index} className="flex justify-between text-xs">
                                <span className="text-gray-600">
                                    {punch.type === "IN" ? "In" : "Out"}
                                    {punch.source && ` (${punch.source})`}
                                </span>
                                <span className="text-gray-900">{formatTime(punch.time)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
