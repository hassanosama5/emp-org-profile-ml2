// components/employee-profile/RoleAssignmentSection.tsx - FINAL SIMPLE VERSION
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/shared/ui/Button";
import { Toast, useToast } from "@/components/leaves/Toast";
import { employeeProfileApi } from "@/lib/api/employee-profile/employee-profile";
import { SystemRole } from "@/types";
import { Shield, Check, X, Lock } from "lucide-react";

interface RoleAssignmentSectionProps {
  employeeId: string;
  currentUserRoles: SystemRole[];
}

export default function RoleAssignmentSection({
  employeeId,
  currentUserRoles,
}: RoleAssignmentSectionProps) {
  const { toast, showToast, hideToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentRoles, setCurrentRoles] = useState<SystemRole[]>([]);
  const [isActive, setIsActive] = useState(true);

  // System Admin can assign all roles; HR Admin can only assign roles they have
  const isSystemAdmin = currentUserRoles.includes(SystemRole.SYSTEM_ADMIN);
  const assignableRoles = Object.values(SystemRole).filter((role) => {
    if (role === SystemRole.JOB_CANDIDATE) return false; // Never for employees
    if (isSystemAdmin) return true; // System Admin can assign all roles
    if (role === SystemRole.SYSTEM_ADMIN) return false; // HR Admin cannot assign System Admin
    if (currentUserRoles.includes(role)) return true; // Can assign roles they have
    if (role === SystemRole.DEPARTMENT_EMPLOYEE) return true; // Can assign basic employee role
    return false;
  });

  useEffect(() => {
    loadRoles();
  }, [employeeId]);

  const loadRoles = async () => {
    try {
      setLoading(true);
      const data = await employeeProfileApi.getEmployeeRoles(employeeId);
      setCurrentRoles(data.roles || []);
      setIsActive(data.isActive !== false);
    } catch (error: any) {
      showToast(error.message || "Failed to load roles", "error");
    } finally {
      setLoading(false);
    }
  };

  const toggleRole = (role: SystemRole) => {
    const newRoles = currentRoles.includes(role)
      ? currentRoles.filter((r) => r !== role)
      : [...currentRoles, role];

    // Must have at least one role
    if (newRoles.length === 0) {
      showToast("Employee must have at least one role", "error");
      return;
    }

    setCurrentRoles(newRoles);
  };

  const saveRoles = async () => {
    try {
      setSaving(true);
      await employeeProfileApi.updateEmployeeRoles(
        employeeId,
        currentRoles,
        []
      );
      showToast("Roles updated successfully", "success");
    } catch (error: any) {
      showToast(error.message || "Failed to update roles", "error");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async () => {
    const action = isActive ? "deactivate" : "activate";
    const message = isActive
      ? "Deactivate all roles? Employee will lose system access."
      : "Activate roles? Employee will regain system access.";

    if (!confirm(message)) return;

    try {
      if (isActive) {
        await employeeProfileApi.deactivateEmployeeRoles(employeeId);
        showToast("Roles deactivated", "success");
      } else {
        await employeeProfileApi.updateEmployeeRoles(
          employeeId,
          [SystemRole.DEPARTMENT_EMPLOYEE],
          []
        );
        showToast("Roles activated", "success");
      }
      loadRoles(); // Refresh
    } catch (error: any) {
      showToast(error.message || `Failed to ${action} roles`, "error");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Toast {...toast} onClose={hideToast} />

      {/* Status Bar */}
      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-blue-600" />
          <span className="font-medium">Access Status:</span>
          <span
            className={`px-2 py-1 text-xs rounded-full ${
              isActive
                ? "bg-green-100 text-green-800"
                : "bg-red-100 text-red-800"
            }`}
          >
            {isActive ? "ACTIVE" : "INACTIVE"}
          </span>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={toggleActive}
          className={
            isActive
              ? "text-red-600 border-red-300"
              : "text-green-600 border-green-300"
          }
        >
          {isActive ? (
            <>
              <X className="h-4 w-4 mr-1" />
              Deactivate
            </>
          ) : (
            <>
              <Check className="h-4 w-4 mr-1" />
              Activate
            </>
          )}
        </Button>
      </div>

      {/* Role Selection */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Lock className="h-4 w-4 text-gray-500" />
          <h3 className="font-medium text-gray-900">Assign Roles</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {assignableRoles.map((role) => {
            const hasRole = currentUserRoles.includes(role);
            const isSelected = currentRoles.includes(role);
            const canAssign =
              isSystemAdmin || hasRole || role === SystemRole.DEPARTMENT_EMPLOYEE;

            return (
              <button
                key={role}
                type="button"
                onClick={() => canAssign && toggleRole(role)}
                disabled={!canAssign}
                className={`p-3 border rounded-lg text-left transition-colors flex items-center justify-between ${
                  isSelected
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300"
                } ${!canAssign ? "opacity-50 cursor-not-allowed" : ""}`}
                title={
                  !canAssign
                    ? "You don't have permission to assign this role"
                    : isSystemAdmin && role === SystemRole.SYSTEM_ADMIN
                    ? "System Admin can assign System Admin role"
                    : ""
                }
              >
                <div>
                  <div className="font-medium text-gray-900">{role}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {role === SystemRole.DEPARTMENT_EMPLOYEE && "Basic access"}
                    {role === SystemRole.DEPARTMENT_HEAD && "Team management"}
                    {role === SystemRole.HR_MANAGER && "HR operations"}
                    {role === SystemRole.HR_ADMIN && "HR configuration"}
                    {role === SystemRole.HR_EMPLOYEE && "HR support"}
                    {role === SystemRole.PAYROLL_SPECIALIST &&
                      "Payroll processing"}
                    {role === SystemRole.PAYROLL_MANAGER &&
                      "Payroll management"}
                    {role === SystemRole.RECRUITER && "Recruitment"}
                    {role === SystemRole.FINANCE_STAFF && "Finance"}
                    {role === SystemRole.LEGAL_POLICY_ADMIN && "Legal & policy"}
                    {role === SystemRole.SYSTEM_ADMIN && "Full system access"}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!isSystemAdmin && !hasRole && role !== SystemRole.DEPARTMENT_EMPLOYEE && (
                    <span className="text-xs text-amber-600">
                      Requires {role}
                    </span>
                  )}
                  {isSelected && <Check className="h-5 w-5 text-blue-600" />}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Current Selection & Actions */}
      <div className="pt-4 border-t border-gray-200">
        <div className="mb-4">
          <p className="text-sm font-medium text-gray-700 mb-2">
            Selected Roles:
          </p>
          <div className="flex flex-wrap gap-2">
            {currentRoles.length === 0 ? (
              <span className="text-gray-500 italic">No roles selected</span>
            ) : (
              currentRoles.map((role) => (
                <span
                  key={role}
                  className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
                >
                  {role}
                </span>
              ))
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={loadRoles} disabled={saving}>
            Reset
          </Button>
          <Button
            onClick={saveRoles}
            disabled={saving || !isActive || currentRoles.length === 0}
            className="min-w-[100px]"
          >
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      {/* Info Note */}
      <div className="text-xs text-gray-500 p-2 bg-gray-50 rounded">
        {isSystemAdmin ? (
          <>
            <p>• System Admin can assign all roles including System Admin</p>
            <p>• All changes are logged for audit purposes</p>
          </>
        ) : (
          <>
            <p>• HR Admin can only assign roles they personally have</p>
            <p>• System Admin role is restricted to System Administrators only</p>
            <p>• All changes are logged for audit purposes</p>
          </>
        )}
      </div>
    </div>
  );
}
