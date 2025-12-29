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

  const handleTestReset = async () => {
    try {
      setLoading(true);
      console.log('[ResetPage] Starting test reset...');
      const result = await leavesApi.resetLeaveBalancesForTest();
      console.log('[ResetPage] Test reset result:', result);
      showToast(
        result.message || `Test reset completed. Reset ${result.reset || 0} of ${result.total || 0} entitlements.`,
        "success"
      );
    } catch (error: any) {
      console.error('[ResetPage] Test reset error:', error);
      const errorMessage = error.response?.data?.message || error.message || "Failed to reset leave balances";
      showToast(errorMessage, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleAddAllEmployees = async () => {
    try {
      setLoading(true);
      console.log('[ResetPage] Starting add all employees...');
      const result = await leavesApi.addAllEmployeesToEntitlements();
      console.log('[ResetPage] Add employees result:', result);
      showToast(
        result.message || `Successfully added ${result.totalEmployees || 0} employees to entitlements.`,
        "success"
      );
    } catch (error: any) {
      console.error('[ResetPage] Add employees error:', error);
      const errorMessage = error.response?.data?.message || error.message || "Failed to add employees to entitlements";
      showToast(errorMessage, "error");
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
        <div className="flex items-center gap-3 mb-2">
          <div className="p-3 bg-gradient-to-br from-red-500 to-orange-600 rounded-xl shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">Reset Leave Balances</h1>
            <p className="text-gray-600 mt-1">
              Reset leave balances for the new year based on selected criterion
            </p>
          </div>
        </div>
      </div>

      <Card className="max-w-2xl border-2 border-red-200 bg-gradient-to-br from-red-50 to-orange-50">
        <CardHeader className="bg-gradient-to-r from-red-500 to-orange-600 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <div>
              <CardTitle className="text-white text-xl">Reset Configuration</CardTitle>
              <CardDescription className="text-red-100">
                Choose the criterion for calculating reset dates. Leave balances will be reset
                based on the selected criterion for each employee.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 p-6">
          <div>
            <Select
              label="Reset Criterion *"
              value={criterion}
              onChange={(e) => setCriterion(e.target.value)}
              options={criterionOptions}
            />
            <div className="mt-3 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg">
              <div className="flex items-start gap-2">
                <div className="p-1 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-lg mt-0.5">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-blue-900">
                  {criterion === "HIRE_DATE" && "Reset based on employee hire date"}
                  {criterion === "FIRST_VACATION_DATE" && "Reset based on first vacation date"}
                  {criterion === "REVISED_HIRE_DATE" && "Reset based on revised hire date"}
                  {criterion === "WORK_RECEIVING_DATE" && "Reset based on work receiving date"}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-yellow-50 to-amber-50 border-2 border-yellow-300 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className="p-1.5 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-lg mt-0.5">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-bold text-yellow-900 mb-1">Warning:</p>
                <p className="text-sm text-yellow-800">
                  This action will reset leave balances for all employees
                  based on the selected criterion. This operation cannot be undone. Make sure you
                  have backed up your data before proceeding.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <Button
              onClick={() => setIsModalOpen(true)}
              variant="primary"
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-red-500 to-orange-600 text-white font-semibold rounded-lg hover:from-red-600 hover:to-orange-700 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Reset Leave Balances (Based on Criterion)
            </Button>
            
            <div className="border-t-2 border-red-200 pt-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 bg-gradient-to-br from-gray-400 to-slate-500 rounded-lg">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-sm font-bold text-gray-800">For Testing:</h3>
              </div>
              <div className="space-y-3">
                <Button
                  onClick={handleAddAllEmployees}
                  variant="outline"
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 border-2 border-blue-300 text-blue-700 font-semibold rounded-lg hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 hover:border-blue-400 transition-all duration-200"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Processing...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Add All Employees to Entitlements
                    </>
                  )}
                </Button>
                <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
                  <p className="text-xs text-blue-800">
                    This will add all employees to leave entitlements for all leave types and set their contract type to Full-Time.
                  </p>
                </div>
                
                <Button
                  onClick={handleTestReset}
                  variant="outline"
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 border-2 border-red-300 text-red-700 font-semibold rounded-lg hover:bg-gradient-to-r hover:from-red-50 hover:to-rose-50 hover:border-red-400 transition-all duration-200"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Resetting...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      Reset All to Zero (Test Mode)
                    </>
                  )}
                </Button>
                <div className="p-3 bg-gradient-to-r from-red-50 to-rose-50 border border-red-200 rounded-lg">
                  <p className="text-xs text-red-800 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    This will immediately reset ALL leave balances to zero for all employees. Use only for testing.
                  </p>
                </div>
              </div>
            </div>
          </div>
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

