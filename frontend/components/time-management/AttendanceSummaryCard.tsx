"use client";

import { useMemo } from "react";

interface AttendanceRecord {
  id: string;
  date: string;
  clockInTime?: string;
  clockOutTime?: string;
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'INCOMPLETE';
  duration?: number;
}

interface AttendanceSummaryCardProps {
  records: AttendanceRecord[];
}

export function AttendanceSummaryCard({ records = [] }: AttendanceSummaryCardProps) {
  const summary = useMemo(() => {
    const stats = {
      total: records.length,
      present: 0,
      absent: 0,
      late: 0,
      incomplete: 0,
      totalHours: 0,
    };

    records.forEach(record => {
      switch (record.status) {
        case 'PRESENT':
          stats.present++;
          break;
        case 'ABSENT':
          stats.absent++;
          break;
        case 'LATE':
          stats.late++;
          break;
        case 'INCOMPLETE':
          stats.incomplete++;
          break;
      }
      if (record.duration) {
        stats.totalHours += record.duration / 60;
      }
    });

    return stats;
  }, [records]);

  const StatBox = ({
    label,
    value,
    bgColor,
  }: {
    label: string;
    value: number | string;
    bgColor: string;
  }) => (
    <div className={`${bgColor} rounded-lg p-4`}>
      <p className="text-gray-600 text-sm font-medium">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
    </div>
  );

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      <StatBox label="Total Days" value={summary.total} bgColor="bg-blue-50" />
      <StatBox label="Present" value={summary.present} bgColor="bg-green-50" />
      <StatBox label="Absent" value={summary.absent} bgColor="bg-red-50" />
      <StatBox label="Late" value={summary.late} bgColor="bg-yellow-50" />
      <StatBox
        label="Total Hours"
        value={summary.totalHours.toFixed(1)}
        bgColor="bg-purple-50"
      />
    </div>
  );
}
