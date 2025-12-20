"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/hooks/use-auth";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/shared/ui/Card";
import { Button } from "@/components/shared/ui/Button";
import { Toast, useToast } from "@/components/leaves/Toast";
import { timeManagementApi } from "@/lib/api/time-management/time-management.api";

interface SyncStatus {
  module: string;
  lastSyncTime?: Date | string;
  status: "SYNCED" | "PENDING" | "ERROR" | "NEVER_SYNCED";
  recordsSynced?: number;
  errorMessage?: string;
}

interface SyncResult {
  overallStatus: "SUCCESS" | "FAILED" | "PARTIAL";
  syncDate?: Date | string;
  executedAt?: Date | string;
  results?: Record<
    string,
    { status: "SUCCESS" | "FAILED"; error?: string; data?: any }
  >;
}

export function DataSyncStatus() {
  const { user } = useAuth();
  const { toast, showToast, hideToast } = useToast();
  const [syncStatuses, setSyncStatuses] = useState<SyncStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    loadSyncStatus();
  }, [user?.id]);

  const loadSyncStatus = async () => {
    try {
      setLoading(true);
      const data = await timeManagementApi.getSyncStatus();

      const lastSync = data?.modules?.timeManagement?.lastSync || null;
      const payrollPending = data?.modules?.payroll?.pendingRecords;
      const payrollFinalized = data?.modules?.payroll?.finalizedRecords;

      const attendanceTotal = data?.attendance?.total;
      const attendanceFinalized = data?.attendance?.finalized;
      const attendancePending = data?.attendance?.pending;

      const derived: SyncStatus[] = [
        {
          module: "Payroll",
          status:
            payrollPending === 0 ? "SYNCED" : payrollPending > 0 ? "PENDING" : "NEVER_SYNCED",
          lastSyncTime: lastSync,
          recordsSynced: typeof payrollFinalized === "number" ? payrollFinalized : undefined,
        },
        {
          module: "Leaves",
          status: data?.modules?.leaves?.status ? "SYNCED" : "NEVER_SYNCED",
          lastSyncTime: lastSync,
        },
        {
          module: "Benefits",
          status: data?.modules?.benefits?.status ? "SYNCED" : "NEVER_SYNCED",
          lastSyncTime: lastSync,
        },
        {
          module: "Attendance Records",
          status:
            typeof attendancePending === "number"
              ? attendancePending === 0
                ? "SYNCED"
                : "PENDING"
              : "NEVER_SYNCED",
          lastSyncTime: lastSync,
          recordsSynced: typeof attendanceFinalized === "number" ? attendanceFinalized : undefined,
          errorMessage:
            typeof attendanceTotal === "number"
              ? `Total=${attendanceTotal}, Pending=${attendancePending ?? "?"}`
              : undefined,
        },
      ];

      setSyncStatuses(derived);
    } catch (error: any) {
      console.error("Failed to load sync status:", error);
      showToast(error.message || "Failed to load sync status", "error");
    } finally {
      setLoading(false);
    }
  };

  const triggerSync = async () => {
    try {
      setSyncing(true);
      // Run full cross-module sync for today by default
      const result: SyncResult = await timeManagementApi.syncData({
        syncDate: new Date(),
        modules: ["payroll", "leaves", "benefits"],
      });

      showToast(
        `Sync completed: ${result.overallStatus}`,
        result.overallStatus === "SUCCESS" ? "success" : "error",
      );
      loadSyncStatus();
    } catch (error: any) {
      console.error("Failed to sync data:", error);
      showToast(error.message || "Failed to sync data", "error");
    } finally {
      setSyncing(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "SYNCED":
        return "bg-green-100 text-green-800 border-green-200";
      case "PENDING":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "ERROR":
        return "bg-red-100 text-red-800 border-red-200";
      case "NEVER_SYNCED":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const formatSyncTime = (time?: Date | string) => {
    if (!time) return "Never";
    return new Date(time).toLocaleString();
  };

  return (
    <div>
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
      />

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Data Synchronization Status</CardTitle>
              <CardDescription>
                Monitor cross-module data synchronization status
              </CardDescription>
            </div>
            <Button
              onClick={triggerSync}
              disabled={syncing}
              variant="primary"
            >
              {syncing ? "Syncing..." : "Trigger Sync"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Loading sync status...</p>
            </div>
          ) : syncStatuses.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No sync status information available</p>
            </div>
          ) : (
            <div className="space-y-3">
              {syncStatuses.map((status, index) => (
                <div
                  key={index}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold text-gray-900">{status.module}</h4>
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium border ${getStatusColor(
                            status.status
                          )}`}
                        >
                          {status.status}
                        </span>
                      </div>
                      {status.lastSyncTime && (
                        <p className="text-sm text-gray-600 mb-1">
                          Last Sync: {formatSyncTime(status.lastSyncTime)}
                        </p>
                      )}
                      {status.recordsSynced !== undefined && (
                        <p className="text-sm text-gray-600 mb-1">
                          Records Synced: {status.recordsSynced}
                        </p>
                      )}
                      {status.errorMessage && (
                        <p className="text-sm text-red-600 mt-2">{status.errorMessage}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

