"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/hooks/use-auth";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/shared/ui/Card";
import { Button } from "@/components/shared/ui/Button";
import { Toast, useToast } from "@/components/leaves/Toast";

interface MissedPunchNotification {
  _id?: string;
  id?: string;
  employeeId: string | {
    _id: string;
    firstName?: string;
    lastName?: string;
    employeeNumber?: string;
  };
  attendanceRecordId: string;
  missedPunchType: "CLOCK_IN" | "CLOCK_OUT";
  date: Date | string;
  message?: string;
  status?: "PENDING" | "RESOLVED" | "ACKNOWLEDGED";
  createdAt?: Date | string;
}

export function MissedPunchAlert() {
  const { user } = useAuth();
  const { toast, showToast, hideToast } = useToast();
  const [notifications, setNotifications] = useState<MissedPunchNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("");

  useEffect(() => {
    loadMissedPunches();
  }, [statusFilter, user?.id]);

  const loadMissedPunches = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      // Note: This endpoint needs to be implemented in the backend
      // const data = await timeManagementApi.getMissedPunches({ status: statusFilter });
      // For now, using empty array
      setNotifications([]);
    } catch (error: any) {
      console.error("Failed to load missed punch notifications:", error);
      showToast(error.message || "Failed to load missed punch notifications", "error");
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledge = async (id: string) => {
    try {
      // Note: This endpoint needs to be implemented
      // await timeManagementApi.acknowledgeMissedPunch(id);
      showToast("Missed punch acknowledged", "success");
      loadMissedPunches();
    } catch (error: any) {
      showToast(error.message || "Failed to acknowledge missed punch", "error");
    }
  };

  const getEmployeeName = (employeeId: any): string => {
    if (typeof employeeId === "string") return employeeId;
    if (employeeId && typeof employeeId === "object") {
      if (employeeId.firstName && employeeId.lastName) {
        return `${employeeId.firstName} ${employeeId.lastName}`;
      }
      if (employeeId.employeeNumber) {
        return employeeId.employeeNumber;
      }
    }
    return "Unknown Employee";
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "RESOLVED":
        return "bg-green-100 text-green-800 border-green-200";
      case "ACKNOWLEDGED":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "PENDING":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const pendingNotifications = notifications.filter((n) => n.status === "PENDING" || !n.status);

  return (
    <div>
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
      />

      <Card className="mb-6">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Missed Punch Notifications</CardTitle>
              <CardDescription>
                View and manage missed clock-in/clock-out notifications
              </CardDescription>
            </div>
            {pendingNotifications.length > 0 && (
              <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
                {pendingNotifications.length} Pending
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="ACKNOWLEDGED">Acknowledged</option>
              <option value="RESOLVED">Resolved</option>
            </select>
            <Button onClick={loadMissedPunches} variant="outline" className="ml-2">
              Refresh
            </Button>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Loading missed punch notifications...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No missed punch notifications</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((notification) => {
                const notificationId = notification._id || notification.id || "";
                return (
                  <div
                    key={notificationId}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold text-gray-900">
                            {getEmployeeName(notification.employeeId)}
                          </h4>
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium border ${getStatusColor(
                              notification.status
                            )}`}
                          >
                            {notification.status || "PENDING"}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-1">
                          Missed {notification.missedPunchType === "CLOCK_IN" ? "Clock-In" : "Clock-Out"}
                        </p>
                        <p className="text-xs text-gray-500">
                          Date: {new Date(notification.date).toLocaleDateString()}
                        </p>
                        {notification.message && (
                          <p className="text-sm text-gray-700 mt-2">{notification.message}</p>
                        )}
                      </div>
                      {notification.status === "PENDING" || !notification.status ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAcknowledge(notificationId)}
                        >
                          Acknowledge
                        </Button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

