"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/hooks/use-auth";
import { useRequireAuth } from "@/lib/hooks/use-auth";
import { SystemRole } from "@/types";
import { policyConfigApi } from "@/lib/api/time-management/policy-config.api";
import {
  OvertimeLimitsConfig,
  CheckOvertimeLimitsResponse,
  ValidatePreApprovalResponse,
} from "@/types/time-management";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/shared/ui/Card";
import { Button } from "@/components/shared/ui/Button";
import { Input } from "@/components/shared/ui/Input";
import { Select } from "@/components/leaves/Select";
import { Modal } from "@/components/leaves/Modal";
import { Toast, useToast } from "@/components/leaves/Toast";

export default function OvertimePoliciesPage() {
  const { user } = useAuth();
  useRequireAuth(SystemRole.HR_MANAGER);
  const { toast, showToast, hideToast } = useToast();

  const [limitsConfig, setLimitsConfig] = useState<OvertimeLimitsConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkResult, setCheckResult] = useState<CheckOvertimeLimitsResponse | null>(null);
  const [validationResult, setValidationResult] = useState<ValidatePreApprovalResponse | null>(null);
  const [checking, setChecking] = useState(false);
  const [validating, setValidating] = useState(false);
  const [isCheckModalOpen, setIsCheckModalOpen] = useState(false);
  const [isValidateModalOpen, setIsValidateModalOpen] = useState(false);

  // Check limits form
  const [checkForm, setCheckForm] = useState({
    employeeId: "",
    currentOvertimeMinutes: "",
    period: "daily" as "daily" | "weekly" | "monthly",
    additionalOvertimeMinutes: "",
  });

  // Validation form
  const [validateForm, setValidateForm] = useState({
    employeeId: "",
    date: "",
    expectedOvertimeMinutes: "",
  });

  useEffect(() => {
    loadLimitsConfig();
  }, []);

  const loadLimitsConfig = async () => {
    try {
      setLoading(true);
      const config = await policyConfigApi.getOvertimeLimitsConfig();
      setLimitsConfig(config);
    } catch (error: any) {
      showToast(error.message || "Failed to load overtime limits configuration", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleCheckLimits = async () => {
    if (!checkForm.employeeId || !checkForm.currentOvertimeMinutes) {
      showToast("Please fill in all required fields", "error");
      return;
    }

    try {
      setChecking(true);
      const result = await policyConfigApi.checkOvertimeLimits({
        employeeId: checkForm.employeeId,
        currentOvertimeMinutes: parseFloat(checkForm.currentOvertimeMinutes) || 0,
        period: checkForm.period,
        additionalOvertimeMinutes: checkForm.additionalOvertimeMinutes
          ? parseFloat(checkForm.additionalOvertimeMinutes)
          : undefined,
      });
      setCheckResult(result);
      setIsCheckModalOpen(true);
    } catch (error: any) {
      showToast(error.message || "Failed to check overtime limits", "error");
    } finally {
      setChecking(false);
    }
  };

  const handleValidatePreApproval = async () => {
    if (!validateForm.employeeId || !validateForm.date || !validateForm.expectedOvertimeMinutes) {
      showToast("Please fill in all required fields", "error");
      return;
    }

    try {
      setValidating(true);
      const result = await policyConfigApi.validateOvertimePreApproval({
        employeeId: validateForm.employeeId,
        date: validateForm.date,
        expectedOvertimeMinutes: parseFloat(validateForm.expectedOvertimeMinutes) || 0,
      });
      setValidationResult(result);
      setIsValidateModalOpen(true);
    } catch (error: any) {
      showToast(error.message || "Failed to validate pre-approval", "error");
    } finally {
      setValidating(false);
    }
  };

  const formatMinutesToHours = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const getStatusColor = (status: { withinSoftLimit: boolean; withinHardLimit: boolean; blocked: boolean }) => {
    if (status.blocked) return "text-red-600 bg-red-50 border-red-200";
    if (!status.withinSoftLimit) return "text-orange-600 bg-orange-50 border-orange-200";
    return "text-green-600 bg-green-50 border-green-200";
  };

  const getStatusText = (status: { withinSoftLimit: boolean; withinHardLimit: boolean; blocked: boolean }) => {
    if (status.blocked) return "BLOCKED";
    if (!status.withinSoftLimit) return "WARNING";
    return "OK";
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
        <h1 className="text-3xl font-bold text-gray-900">Permission Validation Rules</h1>
        <p className="text-gray-600 mt-1">
          Define limits for permission durations and ensure only approved permissions affect payroll
        </p>
      </div>

      {/* Overtime Limits Configuration */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Overtime Limits Configuration</CardTitle>
          <CardDescription>
            Current overtime limits and policies for daily, weekly, and monthly periods
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Loading configuration...</p>
            </div>
          ) : limitsConfig ? (
            <div className="space-y-6">
              {/* Daily Limits */}
              <div className="border-b border-gray-200 pb-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Daily Limits</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Max Overtime</label>
                    <p className="text-gray-900">{formatMinutesToHours(limitsConfig.daily.maxOvertimeMinutes)} ({limitsConfig.daily.maxOvertimeHours} hours)</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Soft Limit</label>
                    <p className="text-gray-900">{formatMinutesToHours(limitsConfig.daily.softLimitMinutes)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <p className="text-gray-600 text-sm">Hard limit: {limitsConfig.daily.maxOvertimeMinutes} min</p>
                  </div>
                </div>
              </div>

              {/* Weekly Limits */}
              <div className="border-b border-gray-200 pb-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Weekly Limits</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Max Overtime</label>
                    <p className="text-gray-900">{formatMinutesToHours(limitsConfig.weekly.maxOvertimeMinutes)} ({limitsConfig.weekly.maxOvertimeHours} hours)</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Soft Limit</label>
                    <p className="text-gray-900">{formatMinutesToHours(limitsConfig.weekly.softLimitMinutes)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <p className="text-gray-600 text-sm">Hard limit: {limitsConfig.weekly.maxOvertimeMinutes} min</p>
                  </div>
                </div>
              </div>

              {/* Monthly Limits */}
              <div className="border-b border-gray-200 pb-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Monthly Limits</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Max Overtime</label>
                    <p className="text-gray-900">{formatMinutesToHours(limitsConfig.monthly.maxOvertimeMinutes)} ({limitsConfig.monthly.maxOvertimeHours} hours)</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Soft Limit</label>
                    <p className="text-gray-900">{formatMinutesToHours(limitsConfig.monthly.softLimitMinutes)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <p className="text-gray-600 text-sm">Hard limit: {limitsConfig.monthly.maxOvertimeMinutes} min</p>
                  </div>
                </div>
              </div>

              {/* Policies */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Policies</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Enforce Hard Limits</label>
                    <p className="text-gray-900">{limitsConfig.policies.enforceHardLimits ? "Yes" : "No"}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Require Approval Above Soft Limit</label>
                    <p className="text-gray-900">{limitsConfig.policies.requireApprovalAboveSoftLimit ? "Yes" : "No"}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Carry Over Allowed</label>
                    <p className="text-gray-900">{limitsConfig.policies.carryOverAllowed ? "Yes" : "No"}</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">Failed to load configuration</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Check Limits Card */}
        <Card>
          <CardHeader>
            <CardTitle>Check Overtime Limits</CardTitle>
            <CardDescription>
              Check if an employee is within overtime limits for a specific period
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Input
                type="text"
                label="Employee ID *"
                value={checkForm.employeeId}
                onChange={(e) => setCheckForm({ ...checkForm, employeeId: e.target.value })}
                placeholder="Enter employee ID"
              />
              <Input
                type="number"
                label="Current Overtime (minutes) *"
                value={checkForm.currentOvertimeMinutes}
                onChange={(e) => setCheckForm({ ...checkForm, currentOvertimeMinutes: e.target.value })}
                placeholder="Current overtime minutes"
              />
              <Input
                type="number"
                label="Additional Overtime (minutes)"
                value={checkForm.additionalOvertimeMinutes}
                onChange={(e) => setCheckForm({ ...checkForm, additionalOvertimeMinutes: e.target.value })}
                placeholder="Optional: additional overtime to check"
              />
              <Select
                label="Period *"
                value={checkForm.period}
                onChange={(e) =>
                  setCheckForm({
                    ...checkForm,
                    period: e.target.value as "daily" | "weekly" | "monthly",
                  })
                }
                options={[
                  { value: "daily", label: "Daily" },
                  { value: "weekly", label: "Weekly" },
                  { value: "monthly", label: "Monthly" },
                ]}
              />
              <Button
                variant="primary"
                onClick={handleCheckLimits}
                disabled={checking || !checkForm.employeeId || !checkForm.currentOvertimeMinutes}
                className="w-full"
              >
                {checking ? "Checking..." : "Check Limits"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Validate Pre-Approval Card */}
        <Card>
          <CardHeader>
            <CardTitle>Validate Pre-Approval</CardTitle>
            <CardDescription>
              Validate if overtime requires pre-approval before processing
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Input
                type="text"
                label="Employee ID *"
                value={validateForm.employeeId}
                onChange={(e) => setValidateForm({ ...validateForm, employeeId: e.target.value })}
                placeholder="Enter employee ID"
              />
              <Input
                type="date"
                label="Date *"
                value={validateForm.date}
                onChange={(e) => setValidateForm({ ...validateForm, date: e.target.value })}
              />
              <Input
                type="number"
                label="Expected Overtime (minutes) *"
                value={validateForm.expectedOvertimeMinutes}
                onChange={(e) => setValidateForm({ ...validateForm, expectedOvertimeMinutes: e.target.value })}
                placeholder="Expected overtime minutes"
              />
              <Button
                variant="primary"
                onClick={handleValidatePreApproval}
                disabled={
                  validating ||
                  !validateForm.employeeId ||
                  !validateForm.date ||
                  !validateForm.expectedOvertimeMinutes
                }
                className="w-full"
              >
                {validating ? "Validating..." : "Validate Pre-Approval"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Check Limits Result Modal */}
      <Modal
        isOpen={isCheckModalOpen}
        onClose={() => {
          setIsCheckModalOpen(false);
          setCheckResult(null);
        }}
        title="Overtime Limits Check Result"
        size="lg"
      >
        {checkResult && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Employee ID</label>
              <p className="text-gray-900">{checkResult.employeeId}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Period</label>
              <p className="text-gray-900 capitalize">{checkResult.period}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <span
                className={`inline-block px-3 py-1 rounded text-sm font-medium border ${getStatusColor(
                  checkResult.status
                )}`}
              >
                {getStatusText(checkResult.status)}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-200">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Current Overtime</label>
                <p className="text-gray-900">{formatMinutesToHours(checkResult.current.minutes)}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Projected Overtime</label>
                <p className="text-gray-900">{formatMinutesToHours(checkResult.projected.minutes)}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-200">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Remaining to Soft Limit</label>
                <p className="text-gray-900">{formatMinutesToHours(checkResult.remaining.toSoftLimit)}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Remaining to Hard Limit</label>
                <p className="text-gray-900">{formatMinutesToHours(checkResult.remaining.toHardLimit)}</p>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Limits</label>
              <div className="bg-gray-50 p-3 rounded">
                <p className="text-sm text-gray-600">
                  Soft Limit: {formatMinutesToHours(checkResult.limits.softLimitMinutes)}
                </p>
                <p className="text-sm text-gray-600">
                  Hard Limit: {formatMinutesToHours(checkResult.limits.maxOvertimeMinutes)} ({checkResult.limits.maxOvertimeHours} hours)
                </p>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Recommendation</label>
              <p className="text-gray-900">{checkResult.recommendation}</p>
            </div>
            {checkResult.status.requiresApproval && (
              <div className="bg-orange-50 border border-orange-200 rounded p-3">
                <p className="text-sm text-orange-800">
                  ⚠️ Approval required: Overtime exceeds soft limit
                </p>
              </div>
            )}
            {checkResult.status.blocked && (
              <div className="bg-red-50 border border-red-200 rounded p-3">
                <p className="text-sm text-red-800">
                  🚫 BLOCKED: Overtime exceeds hard limit and cannot be processed
                </p>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Validation Result Modal */}
      <Modal
        isOpen={isValidateModalOpen}
        onClose={() => {
          setIsValidateModalOpen(false);
          setValidationResult(null);
        }}
        title="Pre-Approval Validation Result"
        size="lg"
      >
        {validationResult && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Employee ID</label>
              <p className="text-gray-900">{validationResult.employeeId}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <p className="text-gray-900">{new Date(validationResult.date).toLocaleDateString()}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Expected Overtime</label>
              <p className="text-gray-900">
                {formatMinutesToHours(validationResult.expectedOvertimeMinutes)} ({validationResult.expectedOvertimeHours} hours)
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pre-Approval Required</label>
              <span
                className={`inline-block px-3 py-1 rounded text-sm font-medium border ${
                  validationResult.preApprovalRequired
                    ? "text-orange-600 bg-orange-50 border-orange-200"
                    : "text-green-600 bg-green-50 border-green-200"
                }`}
              >
                {validationResult.preApprovalRequired ? "YES" : "NO"}
              </span>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
              <p className="text-gray-900">{validationResult.reason}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date Information</label>
              <div className="bg-gray-50 p-3 rounded">
                <p className="text-sm text-gray-600">
                  Day of Week: {validationResult.dateInfo.dayOfWeek}
                </p>
                <p className="text-sm text-gray-600">
                  Is Holiday: {validationResult.dateInfo.isHoliday ? "Yes" : "No"}
                </p>
                <p className="text-sm text-gray-600">
                  Is Weekend: {validationResult.dateInfo.isWeekend ? "Yes" : "No"}
                </p>
              </div>
            </div>
            {validationResult.preApprovalRequired && (
              <div className="bg-orange-50 border border-orange-200 rounded p-3">
                <p className="text-sm text-orange-800">
                  ⚠️ Pre-approval is required before processing this overtime request
                </p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

