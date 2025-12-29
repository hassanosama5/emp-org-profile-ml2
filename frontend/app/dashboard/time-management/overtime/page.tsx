"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/hooks/use-auth";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { SystemRole } from "@/types";
import { OvertimeRequestForm } from "@/components/time-management/OvertimeRequestForm";
import { OvertimeRequestList } from "@/components/time-management/OvertimeRequestList";
import { timeManagementApi } from "@/lib/api/time-management/time-management.api";
import { AttendanceRecord } from "@/types/time-management";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/shared/ui/Card";
import { Button } from "@/components/shared/ui/Button";

export default function OvertimePage() {
  const { user } = useAuth();
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

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

        // Filter to only show records with clock out (completed days)
        // This helps employees select records where they actually worked overtime
        records = records.filter((record: any) => {
          const hasClockOut = 
            (record.punches && Array.isArray(record.punches) && 
             record.punches.some((p: any) => p.type === "OUT")) ||
            record.clockOut;
          return hasClockOut;
        });

        setAttendanceRecords(records);
      } catch (err) {
        console.error("Failed to fetch attendance records:", err);
      } finally {
        setLoadingRecords(false);
      }
    };

    fetchRecords();
  }, [user?.id, refreshKey]);

  const handleSuccess = () => {
    setShowForm(false);
    setRefreshKey(prev => prev + 1);
  };

  const handleCancel = () => {
    setShowForm(false);
  };

  return (
    <ProtectedRoute
      allowedRoles={[
        SystemRole.DEPARTMENT_EMPLOYEE,
        SystemRole.DEPARTMENT_HEAD,
        SystemRole.HR_ADMIN,
        SystemRole.HR_MANAGER,
        SystemRole.SYSTEM_ADMIN,
      ]}
    >
      <div className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Overtime Management</h1>
          <p className="text-gray-600 mt-1">
            Request overtime approval and track your overtime requests
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sidebar - Quick Actions */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                {!showForm ? (
                  <Button
                    onClick={() => setShowForm(true)}
                    variant="primary"
                    className="w-full"
                    disabled={loadingRecords || attendanceRecords.length === 0}
                  >
                    + Request Overtime
                  </Button>
                ) : (
                  <Button
                    onClick={handleCancel}
                    variant="outline"
                    className="w-full"
                  >
                    Cancel Request
                  </Button>
                )}
                {attendanceRecords.length === 0 && !loadingRecords && (
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    No attendance records available. Clock in/out first.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Overtime Request Form */}
            {showForm && (
              <OvertimeRequestForm
                attendanceRecords={attendanceRecords}
                onSuccess={handleSuccess}
                onCancel={handleCancel}
              />
            )}

            {/* Overtime Requests List */}
            {!showForm && <OvertimeRequestList key={refreshKey} />}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
