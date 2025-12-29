"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/shared/ui/Button";
import { Input } from "@/components/shared/ui/Input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/shared/ui/Card";
import { Select } from "@/components/leaves/Select";
import { Modal } from "@/components/leaves/Modal";
import { useToast } from "@/components/leaves/Toast";
import { useAuth } from "@/lib/hooks/use-auth";
import { SystemRole } from "@/types";
import { policyConfigApi } from "@/lib/api/time-management/policy-config.api";
import {
  OvertimeLimitsConfig,
  CheckOvertimeLimitsRequest,
  CheckOvertimeLimitsResponse,
  ValidatePreApprovalRequest,
  ValidatePreApprovalResponse,
} from "@/types/time-management";

// ===== TYPES =====
export interface PermissionRulesFormProps {
  /** Called after successful validation */
  onValidationComplete?: (result: CheckOvertimeLimitsResponse | ValidatePreApprovalResponse) => void;
}

// ===== COMPONENT =====
export default function PermissionRulesForm({ onValidationComplete }: PermissionRulesFormProps) {
  const { user } = useAuth();
  const { showToast } = useToast();

  // Role-based permission check (BR-TM-15: HR Admin can define limits)
  const canManageRules = user?.roles?.includes(SystemRole.HR_ADMIN);

  // State
  const [limitsConfig, setLimitsConfig] = useState<OvertimeLimitsConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [validating, setValidating] = useState(false);

  // Check limits form
  const [checkForm, setCheckForm] = useState<{
    employeeId: string;
    currentOvertimeMinutes: string;
    additionalOvertimeMinutes: string;
    period: "daily" | "weekly" | "monthly";
  }>({
    employeeId: "",
    currentOvertimeMinutes: "",
    additionalOvertimeMinutes: "",
    period: "daily",
  });

  // Validate pre-approval form
  const [validateForm, setValidateForm] = useState<{
    employeeId: string;
    date: string;
    expectedOvertimeMinutes: string;
  }>({
    employeeId: "",
    date: "",
    expectedOvertimeMinutes: "",
  });

  // Result modals
  const [isCheckModalOpen, setIsCheckModalOpen] = useState(false);
  const [isValidateModalOpen, setIsValidateModalOpen] = useState(false);
  const [checkResult, setCheckResult] = useState<CheckOvertimeLimitsResponse | null>(null);
  const [validationResult, setValidationResult] = useState<ValidatePreApprovalResponse | null>(null);

  // Load limits configuration
  const loadLimitsConfig = useCallback(async () => {
    try {
      setLoading(true);
      const config = await policyConfigApi.getOvertimeLimitsConfig();
      setLimitsConfig(config);
    } catch (error: any) {
      console.error("Failed to load limits config:", error);
      showToast(error.message || "Failed to load overtime limits configuration", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadLimitsConfig();
  }, [loadLimitsConfig]);

  // Handle check limits
  const handleCheckLimits = async () => {
    if (!checkForm.employeeId || !checkForm.currentOvertimeMinutes) {
      showToast("Please fill in Employee ID and Current Overtime", "error");
      return;
    }

    try {
      setChecking(true);
      const request: CheckOvertimeLimitsRequest = {
        employeeId: checkForm.employeeId,
        currentOvertimeMinutes: parseInt(checkForm.currentOvertimeMinutes),
        period: checkForm.period,
        additionalOvertimeMinutes: checkForm.additionalOvertimeMinutes
          ? parseInt(checkForm.additionalOvertimeMinutes)
          : undefined,
      };
      const result = await policyConfigApi.checkOvertimeLimits(request);
      setCheckResult(result);
      setIsCheckModalOpen(true);
      onValidationComplete?.(result);
    } catch (error: any) {
      showToast(error.message || "Failed to check overtime limits", "error");
    } finally {
      setChecking(false);
    }
  };

  // Handle validate pre-approval
  const handleValidatePreApproval = async () => {
    if (!validateForm.employeeId || !validateForm.date || !validateForm.expectedOvertimeMinutes) {
      showToast("Please fill in all required fields", "error");
      return;
    }

    try {
      setValidating(true);
      const request: ValidatePreApprovalRequest = {
        employeeId: validateForm.employeeId,
        date: validateForm.date,
        expectedOvertimeMinutes: parseInt(validateForm.expectedOvertimeMinutes),
      };
      const result = await policyConfigApi.validateOvertimePreApproval(request);
      setValidationResult(result);
      setIsValidateModalOpen(true);
      onValidationComplete?.(result);
    } catch (error: any) {
      showToast(error.message || "Failed to validate pre-approval", "error");
    } finally {
      setValidating(false);
    }
  };

  // Helper to format minutes to hours
  const formatMinutesToHours = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };

  // Get status color based on check result
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

  if (!canManageRules) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-gray-500">
            <p>You don&apos;t have permission to manage permission validation rules.</p>
            <p className="text-sm mt-2">Only HR Admin can access this feature.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Permission Types as per BR-TM-16
  const permissionTypes = [
    {
      type: "EARLY_IN",
      name: "Early In",
      description: "Employee arrives before scheduled start time",
      icon: "🌅",
      color: "bg-blue-100 text-blue-800 border-blue-200",
    },
    {
      type: "LATE_OUT",
      name: "Late Out",
      description: "Employee stays after scheduled end time (non-overtime)",
      icon: "🌙",
      color: "bg-purple-100 text-purple-800 border-purple-200",
    },
    {
      type: "OUT_OF_HOURS",
      name: "Out of Hours",
      description: "Work performed outside normal working hours",
      icon: "⏰",
      color: "bg-orange-100 text-orange-800 border-orange-200",
    },
    {
      type: "TOTAL",
      name: "Total",
      description: "Combined calculation of all permission types",
      icon: "📊",
      color: "bg-green-100 text-green-800 border-green-200",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Permission Types Definition (BR-TM-16) */}
      <Card>
        <CardHeader>
          <CardTitle>Permission Types (BR-TM-16)</CardTitle>
          <CardDescription>
            Types of Over/Short time permissions that can be Accepted or Rejected, impacting payroll and benefits
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {permissionTypes.map((perm) => (
              <div
                key={perm.type}
                className={`p-4 rounded-lg border ${perm.color}`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">{perm.icon}</span>
                  <h4 className="font-semibold">{perm.name}</h4>
                </div>
                <p className="text-sm opacity-80">{perm.description}</p>
                <div className="mt-3 pt-3 border-t border-current/20">
                  <span className="text-xs font-mono">{perm.type}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Permission Status (BR-TM-18)</h4>
            <p className="text-sm text-gray-600 mb-3">
              Over/Short time permissions can be Accepted or Rejected, impacting payroll and benefits:
            </p>
            <div className="flex flex-wrap gap-3">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 border border-green-200">
                ✓ Accepted - Affects Payroll
              </span>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800 border border-red-200">
                ✗ Rejected - No Payroll Impact
              </span>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">
                ⏳ Pending - Awaiting Approval
              </span>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200">
              <Link 
                href="/dashboard/time-management/exceptions"
                className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium"
              >
                Go to Time Exceptions to Accept/Reject Permissions →
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Overtime Limits Configuration Display */}
      <Card>
        <CardHeader>
          <CardTitle>Overtime Limits Configuration</CardTitle>
          <CardDescription>
            Current overtime limits and policies for daily, weekly, and monthly periods (BR-TM-15)
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
                    <p className="text-gray-900">
                      {formatMinutesToHours(limitsConfig.daily.maxOvertimeMinutes)} ({limitsConfig.daily.maxOvertimeHours} hours)
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Soft Limit</label>
                    <p className="text-gray-900">{formatMinutesToHours(limitsConfig.daily.softLimitMinutes)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Hard Limit</label>
                    <p className="text-gray-600 text-sm">{limitsConfig.daily.maxOvertimeMinutes} minutes</p>
                  </div>
                </div>
              </div>

              {/* Weekly Limits */}
              <div className="border-b border-gray-200 pb-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Weekly Limits</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Max Overtime</label>
                    <p className="text-gray-900">
                      {formatMinutesToHours(limitsConfig.weekly.maxOvertimeMinutes)} ({limitsConfig.weekly.maxOvertimeHours} hours)
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Soft Limit</label>
                    <p className="text-gray-900">{formatMinutesToHours(limitsConfig.weekly.softLimitMinutes)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Hard Limit</label>
                    <p className="text-gray-600 text-sm">{limitsConfig.weekly.maxOvertimeMinutes} minutes</p>
                  </div>
                </div>
              </div>

              {/* Monthly Limits */}
              <div className="border-b border-gray-200 pb-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Monthly Limits</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Max Overtime</label>
                    <p className="text-gray-900">
                      {formatMinutesToHours(limitsConfig.monthly.maxOvertimeMinutes)} ({limitsConfig.monthly.maxOvertimeHours} hours)
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Soft Limit</label>
                    <p className="text-gray-900">{formatMinutesToHours(limitsConfig.monthly.softLimitMinutes)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Hard Limit</label>
                    <p className="text-gray-600 text-sm">{limitsConfig.monthly.maxOvertimeMinutes} minutes</p>
                  </div>
                </div>
              </div>

              {/* Policies */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Policies (BR-TM-18)</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Enforce Hard Limits</label>
                    <span className={`inline-block px-2 py-1 rounded text-sm ${limitsConfig.policies.enforceHardLimits ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}>
                      {limitsConfig.policies.enforceHardLimits ? "Yes" : "No"}
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Require Approval Above Soft Limit</label>
                    <span className={`inline-block px-2 py-1 rounded text-sm ${limitsConfig.policies.requireApprovalAboveSoftLimit ? "bg-orange-100 text-orange-800" : "bg-gray-100 text-gray-800"}`}>
                      {limitsConfig.policies.requireApprovalAboveSoftLimit ? "Yes" : "No"}
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Carry Over Allowed</label>
                    <span className={`inline-block px-2 py-1 rounded text-sm ${limitsConfig.policies.carryOverAllowed ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-800"}`}>
                      {limitsConfig.policies.carryOverAllowed ? "Yes" : "No"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">Failed to load configuration</p>
              <Button variant="outline" onClick={loadLimitsConfig} className="mt-4">
                Retry
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Check Limits Card */}
        <Card>
          <CardHeader>
            <CardTitle>Check Overtime Limits</CardTitle>
            <CardDescription>
              Check if an employee is within overtime limits for a specific period (BR-TM-15)
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
                placeholder="Current overtime in minutes"
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
              Validate if overtime requires pre-approval before processing (BR-TM-18)
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
                placeholder="Expected overtime in minutes"
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Employee ID</label>
                <p className="text-gray-900">{checkResult.employeeId}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Period</label>
                <p className="text-gray-900 capitalize">{checkResult.period}</p>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <span className={`inline-block px-3 py-1 rounded text-sm font-medium border ${getStatusColor(checkResult.status)}`}>
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

            <div className="pt-2 border-t border-gray-200">
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

            <div className="pt-2 border-t border-gray-200">
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Employee ID</label>
                <p className="text-gray-900">{validationResult.employeeId}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <p className="text-gray-900">{new Date(validationResult.date).toLocaleDateString()}</p>
              </div>
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

            <div className="pt-2 border-t border-gray-200">
              <label className="block text-sm font-medium text-gray-700 mb-1">Date Information</label>
              <div className="bg-gray-50 p-3 rounded">
                <p className="text-sm text-gray-600">Day of Week: {validationResult.dateInfo.dayOfWeek}</p>
                <p className="text-sm text-gray-600">Is Holiday: {validationResult.dateInfo.isHoliday ? "Yes" : "No"}</p>
                <p className="text-sm text-gray-600">Is Weekend: {validationResult.dateInfo.isWeekend ? "Yes" : "No"}</p>
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
