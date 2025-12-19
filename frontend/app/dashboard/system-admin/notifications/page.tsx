"use client";

import React, { useState } from "react";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { SystemRole } from "@/types";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/shared/ui/Card";
import { Button } from "@/components/shared/ui/Button";
import { Input } from "@/components/shared/ui/Input";
import { Select } from "@/components/leaves/Select";
import { Toast, useToast } from "@/components/leaves/Toast";

export default function NotificationConfigurationPage() {
  const { toast, showToast, hideToast } = useToast();
  const [saving, setSaving] = useState(false);

  // Notification rules state
  const [notificationRules, setNotificationRules] = useState([
    {
      id: "1",
      event: "Structure Change Created",
      recipients: ["HR_MANAGER", "SYSTEM_ADMIN"],
      enabled: true,
    },
    {
      id: "2",
      event: "Structure Change Approved",
      recipients: ["REQUESTER", "DEPARTMENT_HEAD"],
      enabled: true,
    },
    {
      id: "3",
      event: "Position Created",
      recipients: ["RECRUITMENT_MODULE"],
      enabled: true,
    },
    {
      id: "4",
      event: "Position Deactivated",
      recipients: ["RECRUITMENT_MODULE", "OFFBOARDING_MODULE"],
      enabled: true,
    },
  ]);

  const handleSave = async () => {
    setSaving(true);
    try {
      // In a real implementation, this would call a backend API
      // await notificationConfigApi.saveNotificationRules(notificationRules);
      showToast("Notification configuration saved successfully", "success");
    } catch (error: any) {
      showToast(error.message || "Failed to save configuration", "error");
    } finally {
      setSaving(false);
    }
  };

  const toggleRule = (id: string) => {
    setNotificationRules(
      notificationRules.map((rule) =>
        rule.id === id ? { ...rule, enabled: !rule.enabled } : rule
      )
    );
  };

  return (
    <ProtectedRoute
      allowedRoles={[SystemRole.SYSTEM_ADMIN, SystemRole.HR_ADMIN]}
    >
      <div className="container mx-auto px-6 py-8">
        <Toast
          message={toast.message}
          type={toast.type}
          isVisible={toast.isVisible}
          onClose={hideToast}
        />

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Notification Configuration
          </h1>
          <p className="text-gray-600 mt-1">
            Configure notification rules and recipients for organizational structure changes
          </p>
        </div>

        {/* Notification Rules */}
        <Card>
          <CardHeader>
            <CardTitle>Notification Rules</CardTitle>
            <CardDescription>
              Manage who receives notifications for different events
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {notificationRules.map((rule) => (
                <div
                  key={rule.id}
                  className="p-4 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-gray-900">
                          {rule.event}
                        </h3>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={rule.enabled}
                            onChange={() => toggleRule(rule.id)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">
                            {rule.enabled ? "Enabled" : "Disabled"}
                          </span>
                        </label>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {rule.recipients.map((recipient, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                          >
                            {recipient}
                          </span>
                        ))}
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      Edit
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4">
              <Button variant="outline">+ Add Notification Rule</Button>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline">Cancel</Button>
          <Button
            variant="primary"
            onClick={handleSave}
            isLoading={saving}
          >
            Save Configuration
          </Button>
        </div>
      </div>
    </ProtectedRoute>
  );
}
