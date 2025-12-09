"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/hooks/use-auth";
import { useRequireAuth } from "@/lib/hooks/use-auth";
import { SystemRole } from "@/types";
import { notificationSyncApi } from "@/lib/api/time-management/notification-sync.api";
import {
  ShiftExpiryNotification,
  ExpiringShiftAssignment,
  CheckExpiringShiftsResponse,
} from "@/types/time-management";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/shared/ui/Card";
import { Button } from "@/components/shared/ui/Button";
import { Input } from "@/components/shared/ui/Input";
import { Toast, useToast } from "@/components/leaves/Toast";

export default function ShiftExpiryNotificationsPage() {
  const { user } = useAuth();
  useRequireAuth(SystemRole.HR_ADMIN);
  const { toast, showToast, hideToast } = useToast();

  const [notifications, setNotifications] = useState<ShiftExpiryNotification[]>([]);
  const [expiringAssignments, setExpiringAssignments] = useState<ExpiringShiftAssignment[]>([]);
  const [checkResult, setCheckResult] = useState<CheckExpiringShiftsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [daysBeforeExpiry, setDaysBeforeExpiry] = useState<number>(7);

  useEffect(() => {
    const loadNotifications = async () => {
      const userId = user?.id || user?.userId;
      if (!userId) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const response = await notificationSyncApi.getShiftExpiryNotifications(userId);
        setNotifications(response.notifications || []);
      } catch (error: any) {
        console.error("Failed to load notifications:", error);
        showToast(error.message || "Failed to load notifications", "error");
        setNotifications([]); // Set empty array on error
      } finally {
        setLoading(false);
      }
    };

    // Only load if user is available
    if (user) {
      loadNotifications();
    } else {
      setLoading(false);
    }
  }, [user, showToast]);

  const handleCheckExpiringShifts = async () => {
    try {
      setChecking(true);
      const result = await notificationSyncApi.checkExpiringShifts(daysBeforeExpiry);
      setCheckResult(result);
      setExpiringAssignments(result.assignments || []);
      showToast(
        `Found ${result.count} expiring shift assignment(s) within ${daysBeforeExpiry} days`,
        result.count > 0 ? "warning" : "success"
      );
    } catch (error: any) {
      showToast(error.message || "Failed to check expiring shifts", "error");
    } finally {
      setChecking(false);
    }
  };

  const formatDate = (date: Date | string | undefined) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString();
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case "HIGH":
        return "text-red-600 bg-red-50 border-red-200";
      case "MEDIUM":
        return "text-yellow-600 bg-yellow-50 border-yellow-200";
      case "LOW":
        return "text-blue-600 bg-blue-50 border-blue-200";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  return (
    <div className="container mx-auto px-6 py-8">
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
      />

      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Shift Expiry Notifications</h1>
          <p className="text-gray-600 mt-1">
            View notifications and check for shift assignments nearing expiry
          </p>
        </div>
      </div>

      {/* Check Expiring Shifts Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Check Expiring Shifts</CardTitle>
          <CardDescription>
            Manually trigger a check for shift assignments that are expiring soon
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-4">
            <div className="flex-1">
              <Input
                type="number"
                label="Days Before Expiry"
                value={daysBeforeExpiry}
                onChange={(e) => setDaysBeforeExpiry(parseInt(e.target.value) || 7)}
                placeholder="7"
                min={1}
                max={30}
              />
            </div>
            <Button onClick={handleCheckExpiringShifts} disabled={checking}>
              {checking ? "Checking..." : "Check Expiring Shifts"}
            </Button>
          </div>

          {checkResult && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-2">Check Results</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Total Found</p>
                  <p className="text-2xl font-bold text-gray-900">{checkResult.count}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">High Urgency</p>
                  <p className="text-2xl font-bold text-red-600">{checkResult.summary.highUrgency}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Medium Urgency</p>
                  <p className="text-2xl font-bold text-yellow-600">{checkResult.summary.mediumUrgency}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Low Urgency</p>
                  <p className="text-2xl font-bold text-blue-600">{checkResult.summary.lowUrgency}</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Expiring Assignments Table */}
      {expiringAssignments.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Expiring Shift Assignments</CardTitle>
            <CardDescription>
              Shift assignments that will expire within the next {daysBeforeExpiry} days
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Employee</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Shift</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Department</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">End Date</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Days Remaining</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Urgency</th>
                  </tr>
                </thead>
                <tbody>
                  {expiringAssignments.map((assignment) => (
                    <tr key={assignment.assignmentId} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium">{assignment.employeeName}</p>
                          {assignment.employeeNumber && (
                            <p className="text-sm text-gray-500">{assignment.employeeNumber}</p>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium">{assignment.shiftName}</p>
                          {assignment.shiftTimes && (
                            <p className="text-sm text-gray-500">{assignment.shiftTimes}</p>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">{assignment.departmentName || "N/A"}</td>
                      <td className="py-3 px-4">{formatDate(assignment.endDate)}</td>
                      <td className="py-3 px-4">
                        <span className="font-semibold">{assignment.daysRemaining}</span> days
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium border ${getUrgencyColor(
                            assignment.urgency
                          )}`}
                        >
                          {assignment.urgency}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notifications List */}
      <Card>
        <CardHeader>
          <CardTitle>Shift Expiry Notifications</CardTitle>
          <CardDescription>
            Recent notifications about shift assignments nearing expiry
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Loading notifications...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">No shift expiry notifications found.</p>
              <p className="text-sm text-gray-400">
                Click "Check Expiring Shifts" above to find assignments that need attention.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {notifications.map((notification) => (
                <div
                  key={notification._id}
                  className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                          {notification.type === "SHIFT_EXPIRY_ALERT"
                            ? "Alert"
                            : "Bulk Alert"}
                        </span>
                        <span className="text-sm text-gray-500">
                          {formatDate(notification.createdAt)}
                        </span>
                      </div>
                      <p className="text-gray-900">{notification.message}</p>
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

