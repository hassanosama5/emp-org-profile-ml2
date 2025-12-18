"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/hooks/use-auth";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/shared/ui/Card";
import { Button } from "@/components/shared/ui/Button";
import { Toast, useToast } from "@/components/leaves/Toast";

interface ShiftExpiryNotification {
  _id?: string;
  id?: string;
  assignmentId: string;
  employeeId: string;
  employeeName: string;
  shiftName: string;
  endDate: Date | string;
  daysRemaining: number;
  urgency: "HIGH" | "MEDIUM" | "LOW";
  message?: string;
  createdAt?: Date | string;
}

interface EscalationAlert {
  _id?: string;
  id?: string;
  type: string;
  title: string;
  message: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
  relatedId?: string;
  createdAt?: Date | string;
}

export function NotificationCenter() {
  const { user } = useAuth();
  const { toast, showToast, hideToast } = useToast();
  const [shiftExpiryNotifications, setShiftExpiryNotifications] = useState<ShiftExpiryNotification[]>([]);
  const [escalationAlerts, setEscalationAlerts] = useState<EscalationAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"shifts" | "escalations">("shifts");

  useEffect(() => {
    loadNotifications();
  }, [user?.id]);

  const loadNotifications = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      // Note: These endpoints need to be implemented in the backend
      // const shiftData = await timeManagementApi.getShiftExpiryNotifications();
      // const escalationData = await timeManagementApi.getEscalationAlerts();
      
      // Mock data structure - replace with actual API calls
      setShiftExpiryNotifications([]);
      setEscalationAlerts([]);
    } catch (error: any) {
      console.error("Failed to load notifications:", error);
      showToast(error.message || "Failed to load notifications", "error");
    } finally {
      setLoading(false);
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case "HIGH":
        return "bg-red-100 text-red-800 border-red-200";
      case "MEDIUM":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "LOW":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "HIGH":
        return "bg-red-100 text-red-800 border-red-200";
      case "MEDIUM":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "LOW":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const highUrgencyShifts = shiftExpiryNotifications.filter((s) => s.urgency === "HIGH");
  const highPriorityEscalations = escalationAlerts.filter((e) => e.priority === "HIGH");

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
              <CardTitle>Notification Center</CardTitle>
              <CardDescription>
                Shift expiry notifications and escalation alerts
              </CardDescription>
            </div>
            <div className="flex gap-2">
              {(highUrgencyShifts.length > 0 || highPriorityEscalations.length > 0) && (
                <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">
                  {highUrgencyShifts.length + highPriorityEscalations.length} Urgent
                </span>
              )}
              <Button onClick={loadNotifications} variant="outline" size="sm">
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Tabs */}
          <div className="flex border-b border-gray-200 mb-6">
            <button
              onClick={() => setActiveTab("shifts")}
              className={`px-4 py-2 font-medium ${
                activeTab === "shifts"
                  ? "border-b-2 border-blue-600 text-blue-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Shift Expiry ({shiftExpiryNotifications.length})
            </button>
            <button
              onClick={() => setActiveTab("escalations")}
              className={`px-4 py-2 font-medium ${
                activeTab === "escalations"
                  ? "border-b-2 border-blue-600 text-blue-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Escalations ({escalationAlerts.length})
            </button>
          </div>

          {/* Shift Expiry Notifications */}
          {activeTab === "shifts" && (
            <div>
              {loading ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">Loading shift expiry notifications...</p>
                </div>
              ) : shiftExpiryNotifications.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No shift expiry notifications</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {shiftExpiryNotifications.map((notification) => {
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
                                {notification.employeeName}
                              </h4>
                              <span
                                className={`px-2 py-1 rounded text-xs font-medium border ${getUrgencyColor(
                                  notification.urgency
                                )}`}
                              >
                                {notification.urgency}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 mb-1">
                              Shift: {notification.shiftName}
                            </p>
                            <p className="text-sm text-gray-600 mb-1">
                              Expires: {new Date(notification.endDate).toLocaleDateString()}
                            </p>
                            <p className="text-xs text-gray-500">
                              {notification.daysRemaining} days remaining
                            </p>
                            {notification.message && (
                              <p className="text-sm text-gray-700 mt-2">{notification.message}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Escalation Alerts */}
          {activeTab === "escalations" && (
            <div>
              {loading ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">Loading escalation alerts...</p>
                </div>
              ) : escalationAlerts.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No escalation alerts</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {escalationAlerts.map((alert) => {
                    const alertId = alert._id || alert.id || "";
                    return (
                      <div
                        key={alertId}
                        className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-semibold text-gray-900">{alert.title}</h4>
                              <span
                                className={`px-2 py-1 rounded text-xs font-medium border ${getPriorityColor(
                                  alert.priority
                                )}`}
                              >
                                {alert.priority}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 mb-1">Type: {alert.type}</p>
                            <p className="text-sm text-gray-700">{alert.message}</p>
                            {alert.createdAt && (
                              <p className="text-xs text-gray-500 mt-2">
                                {new Date(alert.createdAt).toLocaleString()}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

