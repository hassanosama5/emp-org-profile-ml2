"use client";

import { useMemo } from "react";

interface AttendanceRecord {
  _id?: string;
  id?: string;
  date: string | Date;
  clockIn?: string | Date;
  clockOut?: string | Date;
  clockInTime?: string | Date;
  clockOutTime?: string | Date;
  totalWorkMinutes?: number;
  duration?: number;
  punches?: Array<{ type?: string; time?: string | Date } | any>;
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'INCOMPLETE' | 'COMPLETE' | 'CORRECTION_PENDING' | 'MISSED PUNCH';
}

interface AttendanceRecordTableProps {
  records: AttendanceRecord[];
  showViewAllLink?: boolean;
}

export function AttendanceRecordTable({
  records = [],
  showViewAllLink = false,
}: AttendanceRecordTableProps) {
  const deriveFromPunches = (record: AttendanceRecord) => {
    const raw = Array.isArray(record.punches) ? record.punches : [];
    const flat = raw.flatMap((p: any) => (Array.isArray(p) ? p : [p]));
    const parsed = flat
      .map((p: any) => ({
        type: String(p?.type ?? '').trim().toUpperCase(),
        time: p?.time ? new Date(p.time) : null,
      }))
      .filter((p) => p.time && !isNaN((p.time as Date).getTime()))
      .sort((a, b) => (a.time as Date).getTime() - (b.time as Date).getTime());

    const firstIn = parsed.find((p) => p.type === 'IN');
    const lastOut = [...parsed].reverse().find((p) => p.type === 'OUT');
    const punchCount = parsed.length;

    return {
      punchCount,
      clockIn: (firstIn?.time || parsed[0]?.time || undefined) as Date | undefined,
      clockOut: (lastOut?.time || (punchCount > 1 ? parsed[punchCount - 1]?.time : undefined)) as
        | Date
        | undefined,
    };
  };

  const formatTime = (time?: string | Date) => {
    if (!time) return '-';
    return new Date(time).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDuration = (minutes?: number) => {
    if (minutes === undefined || minutes === null) return '-';
    // Round to avoid floating point display issues
    const totalMinutes = Math.round(minutes);
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return `${hours}h ${mins}m`;
  };

  // Calculate duration from clock in/out times if totalWorkMinutes is missing
  const calculateDurationFromTimes = (clockIn?: Date | string, clockOut?: Date | string): number | undefined => {
    if (!clockIn || !clockOut) return undefined;
    try {
      const inTime = new Date(clockIn);
      const outTime = new Date(clockOut);
      if (isNaN(inTime.getTime()) || isNaN(outTime.getTime())) return undefined;
      const diffMs = outTime.getTime() - inTime.getTime();
      if (diffMs < 0) return undefined; // Invalid if out is before in
      return Math.floor(diffMs / (1000 * 60)); // Convert to minutes
    } catch {
      return undefined;
    }
  };

  const getStatusBadgeColor = (status: string) => {
    const colors = {
      'PRESENT': 'bg-green-100 text-green-800',
      'COMPLETE': 'bg-green-100 text-green-800',
      'ABSENT': 'bg-red-100 text-red-800',
      'LATE': 'bg-yellow-100 text-yellow-800',
      'INCOMPLETE': 'bg-gray-100 text-gray-800',
      'MISSED PUNCH': 'bg-red-100 text-red-800',
      'CORRECTION_PENDING': 'bg-orange-100 text-orange-800',
    };
    return colors[status as keyof typeof colors] || colors['ABSENT'];
  };

  if (records.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No attendance records found</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b">
          <tr>
            <th className="px-4 py-3 text-left font-semibold text-gray-900">Date</th>
            <th className="px-4 py-3 text-left font-semibold text-gray-900">Clock In</th>
            <th className="px-4 py-3 text-left font-semibold text-gray-900">Clock Out</th>
            <th className="px-4 py-3 text-left font-semibold text-gray-900">Duration</th>
            <th className="px-4 py-3 text-left font-semibold text-gray-900">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {records.map(record => {
            const recordId = record._id || record.id || `${String(record.date)}-${Math.random()}`;
            const derived = deriveFromPunches(record);
            // Support backend field names and legacy names, with punches fallback
            const clockInTime = record.clockIn || record.clockInTime || derived.clockIn;
            const clockOutTime = record.clockOut || record.clockOutTime || derived.clockOut;
            
            // Calculate duration: use totalWorkMinutes if available, otherwise calculate from times
            let workDuration = record.totalWorkMinutes || record.duration;
            if (!workDuration || workDuration <= 0) {
              workDuration = calculateDurationFromTimes(clockInTime, clockOutTime);
            }

            // Determine status: if clock out is missing, show "MISSED PUNCH"
            let displayStatus = record.status;
            if (!clockOutTime) {
              displayStatus = 'MISSED PUNCH';
            } else if ((record.status === 'COMPLETE' && !clockOutTime) || (derived.punchCount % 2 !== 0 && derived.punchCount > 0)) {
              displayStatus = 'MISSED PUNCH';
            }
            
            return (
              <tr key={recordId} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-900">
                  {new Date(record.date).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-gray-700">
                  {formatTime(clockInTime)}
                </td>
                <td className="px-4 py-3 text-gray-700">
                  {formatTime(clockOutTime)}
                </td>
                <td className="px-4 py-3 text-gray-700">
                  {formatDuration(workDuration)}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(
                      displayStatus,
                    )}`}
                  >
                    {displayStatus}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
