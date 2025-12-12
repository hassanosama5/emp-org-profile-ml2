"use client";

import { useState } from "react";
import { useAuth } from "@/lib/hooks/use-auth";
import { useRequireAuth } from "@/lib/hooks/use-auth";
import { SystemRole } from "@/types";
import { leavesApi } from "@/lib/api/leaves/leaves";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/shared/ui/Card";
import { Button } from "@/components/shared/ui/Button";
import { Select } from "@/components/leaves/Select";
import { Modal } from "@/components/leaves/Modal";
import { Toast, useToast } from "@/components/leaves/Toast";

export default function ResetLeaveBalancesPage() {
  const { user } = useAuth();
  useRequireAuth(SystemRole.HR_ADMIN);
  const { toast, showToast, hideToast } = useToast();

  const [criterion, setCriterion] = useState<string>("HIRE_DATE");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const criterionOptions = [
    { value: "HIRE_DATE", label: "Hire Date" },
    { value: "FIRST_VACATION_DATE", label: "First Vacation Date" },
    { value: "REVISED_HIRE_DATE", label: "Revised Hire Date" },
    { value: "WORK_RECEIVING_DATE", label: "Work Receiving Date" },
  ];

  const handleReset = async () => {
    try {
      setLoading(true);
      await leavesApi.resetLeaveBalances(criterion);
      showToast("Leave balances reset successfully", "success");
      setIsModalOpen(false);
    } catch (error: any) {
      showToast(error.message || "Failed to reset leave balances", "error");
    } finally {
      setLoading(false);
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

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Reset Leave Balances</h1>
        <p className="text-gray-600 mt-1">
          Reset leave balances for the new year based on selected criterion
        </p>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Reset Configuration</CardTitle>
          <CardDescription>
            Choose the criterion for calculating reset dates. Leave balances will be reset
            based on the selected criterion for each employee.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Select
              label="Reset Criterion *"
              value={criterion}
              onChange={(e) => setCriterion(e.target.value)}
              options={criterionOptions}
            />
            <p className="mt-2 text-sm text-gray-600">
              {criterion === "HIRE_DATE" && "Reset based on employee hire date"}
              {criterion === "FIRST_VACATION_DATE" && "Reset based on first vacation date"}
              {criterion === "REVISED_HIRE_DATE" && "Reset based on revised hire date"}
              {criterion === "WORK_RECEIVING_DATE" && "Reset based on work receiving date"}
            </p>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              <strong>Warning:</strong> This action will reset leave balances for all employees
              based on the selected criterion. This operation cannot be undone. Make sure you
              have backed up your data before proceeding.
            </p>
          </div>

          <Button
            onClick={() => setIsModalOpen(true)}
            variant="primary"
            className="w-full"
          >
            Reset Leave Balances
          </Button>
        </CardContent>
      </Card>

      {/* Confirmation Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Confirm Reset Leave Balances"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleReset}
              isLoading={loading}
            >
              Confirm Reset
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-gray-700">
            Are you sure you want to reset leave balances for all employees using the
            criterion: <strong>{criterionOptions.find((c) => c.value === criterion)?.label}</strong>?
          </p>
          <p className="text-sm text-red-600 font-medium">
            This action cannot be undone. Please ensure you have a backup of your data.
          </p>
        </div>
      </Modal>
    </div>
  );
}

