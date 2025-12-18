"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/hooks/use-auth";
import Link from "next/link";
import { ClockInOutButton } from "@/components/time-management/ClockInOutButton";
import { AttendanceRecordTable } from "@/components/time-management/AttendanceRecordTable";
import { AttendanceSummaryCard } from "@/components/time-management/AttendanceSummaryCard";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/shared/ui/Card";
import { timeManagementApi } from "@/lib/api/time-management/time-management.api";
import { SystemRole } from "@/types";

export default function AttendancePage() {
  const { user } = useAuth();
  const isAdmin =
    user?.roles?.includes(SystemRole.HR_ADMIN) ||
    user?.roles?.includes(SystemRole.SYSTEM_ADMIN);
  const [loading, setLoading] = useState(true);
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refetchKey, setRefetchKey] = useState(0); // Force refetch on updates

  // Fetch attendance records
  useEffect(() => {
    if (!user?.id) return;

    const fetchRecords = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await timeManagementApi.getAttendanceRecords(user.id);
        
        console.log('Full API Response:', response);
        
        let records = [];
        
        // Handle the simple response format
        if (response?.records && Array.isArray(response.records)) {
          records = response.records;
          console.log('Found records:', records.length);
        } else if (Array.isArray(response)) {
          records = response;
          console.log('Response is an array:', records.length);
        } else {
          console.warn('Unexpected response format:', response);
          records = [];
        }
        
        setAttendanceRecords(records);
      } catch (err: any) {
        console.error("Failed to fetch attendance records:", err);
        setError(err?.message || "Failed to load attendance records");
      } finally {
        setLoading(false);
      }
    };

    fetchRecords();
  }, [user?.id, refetchKey]);

  // Listen for attendance updates from ClockInOutButton
  useEffect(() => {
    const handleAttendanceUpdate = () => {
      console.log('Attendance updated event received, refetching records...');
      // Wait a moment for the backend to process, then refetch
      setTimeout(() => {
        setRefetchKey(prev => prev + 1);
      }, 1000);
    };

    window.addEventListener('attendanceUpdated', handleAttendanceUpdate);
    return () => window.removeEventListener('attendanceUpdated', handleAttendanceUpdate);
  }, []);

  return (
    <div className="container mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Attendance</h1>
          <p className="text-gray-600 mt-1">Track your clock in/out and view your attendance records</p>
        </div>
        <button
          onClick={() => setRefetchKey(prev => prev + 1)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          title="Refresh attendance records"
        >
          Refresh
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Clock In/Out Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Clock In/Out</CardTitle>
              <CardDescription>Track your work hours by clocking in and out</CardDescription>
            </CardHeader>
            <CardContent>
              <ClockInOutButton />
            </CardContent>
          </Card>
        </div>

        {/* Quick Links */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Links</CardTitle>
            <CardDescription>Navigate to related pages</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link
              href="/dashboard/time-management/attendance/records"
              className="block text-blue-600 hover:underline font-medium"
            >
              View Detailed Records
            </Link>
                {isAdmin ? (
            <Link
              href="/dashboard/time-management/attendance/corrections"
              className="block text-blue-600 hover:underline font-medium"
            >
              Correction Requests
            </Link>
                ) : (
                  <Link
                    href="/dashboard/employee-profile/time-management"
                    className="block text-blue-600 hover:underline font-medium"
                  >
                    Correction Requests
                  </Link>
                )}
            <Link
              href="/dashboard/time-management"
              className="block text-blue-600 hover:underline font-medium"
            >
              Time Management Home
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Attendance Summary */}
      <div className="mb-8">
        <AttendanceSummaryCard records={attendanceRecords} />
      </div>

      {/* Recent Records Section */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Attendance Records</CardTitle>
          <CardDescription>Your recent clock in/out records</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Loading attendance records...</p>
            </div>
          ) : attendanceRecords.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No attendance records found</p>
              <Link
                href="/dashboard/time-management/attendance/records"
                className="text-blue-600 hover:underline mt-4 block"
              >
                View all records →
              </Link>
            </div>
          ) : (
            <AttendanceRecordTable
              records={attendanceRecords.slice(0, 5)}
              showViewAllLink={true}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
