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

export default function WorkflowConfigurationPage() {
  const { toast, showToast, hideToast } = useToast();
  const [saving, setSaving] = useState(false);

  // Workflow configuration state
  const [approvalChains, setApprovalChains] = useState([
    {
      id: "1",
      name: "Profile Change Request",
      steps: [
        { order: 1, role: "HR_EMPLOYEE", action: "REVIEW" },
        { order: 2, role: "HR_MANAGER", action: "APPROVE" },
      ],
    },
    {
      id: "2",
      name: "Structure Change Request",
      steps: [
        { order: 1, role: "HR_MANAGER", action: "REVIEW" },
        { order: 2, role: "SYSTEM_ADMIN", action: "APPROVE" },
      ],
    },
  ]);

  const [escalationRules, setEscalationRules] = useState([
    {
      id: "1",
      workflow: "Profile Change Request",
      triggerAfterDays: 3,
      escalateTo: "HR_MANAGER",
    },
  ]);

  const handleSave = async () => {
    setSaving(true);
    try {
      // In a real implementation, this would call a backend API
      // await workflowConfigApi.saveWorkflowConfiguration({ approvalChains, escalationRules });
      showToast("Workflow configuration saved successfully", "success");
    } catch (error: any) {
      showToast(error.message || "Failed to save configuration", "error");
    } finally {
      setSaving(false);
    }
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
            Workflow Configuration
          </h1>
          <p className="text-gray-600 mt-1">
            Configure approval workflows and escalation rules for various processes
          </p>
        </div>

        {/* Approval Chains */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Approval Chains</CardTitle>
            <CardDescription>
              Define the sequence of approvals required for different request types
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {approvalChains.map((chain) => (
                <Card key={chain.id} className="bg-gray-50">
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-semibold text-gray-900">
                        {chain.name}
                      </h3>
                      <Button variant="outline" size="sm">
                        Edit
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {chain.steps.map((step, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-3 p-2 bg-white rounded border"
                        >
                          <span className="text-sm font-medium text-gray-600 w-8">
                            Step {step.order}:
                          </span>
                          <span className="text-sm text-gray-900">
                            {step.role} - {step.action}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="mt-4">
              <Button variant="outline">+ Add Approval Chain</Button>
            </div>
          </CardContent>
        </Card>

        {/* Escalation Rules */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Escalation Rules</CardTitle>
            <CardDescription>
              Configure automatic escalation when requests are pending for too long
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {escalationRules.map((rule) => (
                <div
                  key={rule.id}
                  className="p-4 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700">
                        Workflow
                      </label>
                      <p className="text-sm text-gray-900">{rule.workflow}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">
                        Escalate After (Days)
                      </label>
                      <p className="text-sm text-gray-900">
                        {rule.triggerAfterDays} days
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">
                        Escalate To
                      </label>
                      <p className="text-sm text-gray-900">{rule.escalateTo}</p>
                    </div>
                    <div className="flex items-end">
                      <Button variant="outline" size="sm">
                        Edit
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4">
              <Button variant="outline">+ Add Escalation Rule</Button>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end gap-3">
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
