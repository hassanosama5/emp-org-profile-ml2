// Shift name suggestions for quick selection
const SHIFT_NAME_SUGGESTIONS = [
  "Fixed Core Hours",
  "Flex-Time",
  "Rotational",
  "Split",
  "Custom Weekly Patterns",
  "Overtime",
];
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/shared/ui/Button";
import { Input } from "@/components/shared/ui/Input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/shared/ui/Card";
import { Select } from "@/components/leaves/Select";
import { useToast } from "@/components/leaves/Toast";
import { useAuth } from "@/lib/hooks/use-auth";
import { SystemRole } from "@/types";
import {
  shiftScheduleApi,
  fetchShifts,
  fetchDepartments,
  fetchPositions,
  fetchEmployees,
  ScheduleRule,
} from "@/lib/api/time-management/shift-schedule.api";
import {
  Shift,
  ShiftAssignment,
  ShiftAssignmentStatus,
  AssignShiftToEmployeeDto,
  AssignShiftToDepartmentDto,
  AssignShiftToPositionDto,
  UpdateShiftAssignmentDto,
} from "@/types/time-management";

// ===== TYPES =====
export type AssignmentType = 'employee' | 'department' | 'position';

export interface ShiftAssignmentFormProps {
  /** Assignment being edited (null for create mode) */
  assignment?: ShiftAssignment | null;
  /** Initial assignment type for create mode */
  initialType?: AssignmentType;
  /** Called after successful create/update */
  onSuccess?: () => void;
  /** Called when user cancels */
  onCancel?: () => void;
  /** Whether to show as compact (for modals) */
  compact?: boolean;
  /** Custom title */
  title?: string;
}

interface DropdownOption {
  _id: string;
  name?: string;
  title?: string;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  employeeNumber?: string;
}

// ===== COMPONENT =====
export const ShiftAssignmentForm: React.FC<ShiftAssignmentFormProps> = ({
  assignment = null,
  initialType = 'employee',
  onSuccess,
  onCancel,
  compact = false,
  title,
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();

  // Check if user can manage assignments (HR Admin or System Admin per BR-TM-01, BR-TM-05)
  const canManageAssignments = user?.roles?.includes(SystemRole.HR_ADMIN) || 
                                user?.roles?.includes(SystemRole.SYSTEM_ADMIN);

  // Form State
  const [assignmentType, setAssignmentType] = useState<AssignmentType>(initialType);
  const [loading, setLoading] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Dropdown options
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [departments, setDepartments] = useState<DropdownOption[]>([]);
  const [positions, setPositions] = useState<DropdownOption[]>([]);
  const [employees, setEmployees] = useState<DropdownOption[]>([]);
  const [scheduleRules, setScheduleRules] = useState<ScheduleRule[]>([]);

  // Form data for create mode
  const [createData, setCreateData] = useState<{
    employeeId: string;
    departmentId: string;
    positionId: string;
    shiftId: string;
    scheduleRuleId: string;
    startDate: string;
    endDate: string;
    status: ShiftAssignmentStatus;
  }>({
    employeeId: "",
    departmentId: "",
    positionId: "",
    shiftId: "",
    scheduleRuleId: "",
    startDate: "",
    endDate: "",
    status: ShiftAssignmentStatus.ENTERED,
  });

  // Form data for update mode
  const [updateData, setUpdateData] = useState<{
    status: ShiftAssignmentStatus;
    startDate: string;
    endDate: string;
    scheduleRuleId: string;
  }>({
    status: ShiftAssignmentStatus.ENTERED,
    startDate: "",
    endDate: "",
    scheduleRuleId: "",
  });

  const isEditMode = !!assignment;

  // ===== LOAD DROPDOWN OPTIONS =====
  const loadDropdownOptions = useCallback(async () => {
    setLoadingOptions(true);
    try {
      const [shiftsRes, departmentsRes, positionsRes, employeesRes, scheduleRulesRes] = await Promise.all([
        fetchShifts(true),
        fetchDepartments(true),
        fetchPositions(true),
        fetchEmployees(),
        shiftScheduleApi.getScheduleRules(true), // Load active schedule rules
      ]);
      setShifts(shiftsRes);
      setDepartments(departmentsRes);
      setPositions(positionsRes);
      setEmployees(Array.isArray(employeesRes) ? employeesRes : []);
      setScheduleRules(Array.isArray(scheduleRulesRes) ? scheduleRulesRes : []);
    } catch (error) {
      console.error("Error loading dropdown options:", error);
      showToast("Failed to load form options", "error");
    } finally {
      setLoadingOptions(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadDropdownOptions();
  }, [loadDropdownOptions]);

  // ===== INITIALIZE EDIT MODE =====
  useEffect(() => {
    if (assignment) {
      setUpdateData({
        status: assignment.status,
        startDate: assignment.startDate ? formatDateForInput(assignment.startDate) : "",
        endDate: assignment.endDate ? formatDateForInput(assignment.endDate) : "",
        scheduleRuleId: assignment.scheduleRuleId || "",
      });
    }
  }, [assignment]);

  // ===== HELPER FUNCTIONS =====
  const formatDateForInput = (date: Date | string): string => {
    if (!date) return "";
    const d = new Date(date);
    return d.toISOString().split('T')[0];
  };

  const isValidObjectId = (id: string): boolean => {
    return /^[0-9a-fA-F]{24}$/.test(id);
  };

  const getDisplayName = (option: DropdownOption): string => {
    if (option.fullName) return option.fullName;
    if (option.firstName && option.lastName) return `${option.firstName} ${option.lastName}`;
    if (option.name) return option.name;
    if (option.title) return option.title;
    if (option.employeeNumber) return option.employeeNumber;
    return option._id;
  };

  // ===== VALIDATION =====
  const validateCreateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validate shift (required for all types)
    if (!createData.shiftId) {
      newErrors.shiftId = "Shift is required";
    } else if (!isValidObjectId(createData.shiftId)) {
      newErrors.shiftId = "Invalid shift selection";
    }

    // Type-specific validation
    if (assignmentType === 'employee') {
      if (!createData.employeeId) {
        newErrors.employeeId = "Employee is required";
      } else if (!isValidObjectId(createData.employeeId)) {
        newErrors.employeeId = "Invalid employee selection";
      }
      // Employee assignments require dates
      if (!createData.startDate) {
        newErrors.startDate = "Start date is required";
      }
      if (!createData.endDate) {
        newErrors.endDate = "End date is required";
      }
    } else if (assignmentType === 'department') {
      if (!createData.departmentId) {
        newErrors.departmentId = "Department is required";
      } else if (!isValidObjectId(createData.departmentId)) {
        newErrors.departmentId = "Invalid department selection";
      }
    } else if (assignmentType === 'position') {
      if (!createData.positionId) {
        newErrors.positionId = "Position is required";
      } else if (!isValidObjectId(createData.positionId)) {
        newErrors.positionId = "Invalid position selection";
      }
    }

    // Date validation (if both provided)
    if (createData.startDate && createData.endDate) {
      if (new Date(createData.endDate) < new Date(createData.startDate)) {
        newErrors.endDate = "End date must be after start date";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateUpdateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!updateData.startDate) {
      newErrors.startDate = "Start date is required";
    }
    if (!updateData.endDate) {
      newErrors.endDate = "End date is required";
    }
    if (updateData.startDate && updateData.endDate) {
      if (new Date(updateData.endDate) < new Date(updateData.startDate)) {
        newErrors.endDate = "End date must be after start date";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ===== FORM SUBMISSION =====
  const handleCreate = async () => {
    if (!validateCreateForm()) return;

    setLoading(true);
    try {
      if (assignmentType === 'employee') {
        const dto: AssignShiftToEmployeeDto = {
          employeeId: createData.employeeId,
          shiftId: createData.shiftId,
          startDate: createData.startDate,
          endDate: createData.endDate,
          status: createData.status,
          scheduleRuleId: createData.scheduleRuleId || undefined,
        };
        await shiftScheduleApi.assignShiftToEmployee(dto);
        showToast("Shift assigned to employee successfully", "success");
      } else if (assignmentType === 'department') {
        const dto: AssignShiftToDepartmentDto = {
          departmentId: createData.departmentId,
          shiftId: createData.shiftId,
          startDate: createData.startDate ? new Date(createData.startDate) : undefined,
          endDate: createData.endDate ? new Date(createData.endDate) : undefined,
          status: createData.status,
        };
        await shiftScheduleApi.assignShiftToDepartment(dto);
        showToast("Shift assigned to department successfully", "success");
      } else if (assignmentType === 'position') {
        const dto: AssignShiftToPositionDto = {
          positionId: createData.positionId,
          shiftId: createData.shiftId,
          startDate: createData.startDate ? new Date(createData.startDate) : undefined,
          endDate: createData.endDate ? new Date(createData.endDate) : undefined,
          status: createData.status,
        };
        await shiftScheduleApi.assignShiftToPosition(dto);
        showToast("Shift assigned to position successfully", "success");
      }
      onSuccess?.();
    } catch (error: any) {
      showToast(error.message || "Failed to assign shift", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!assignment || !validateUpdateForm()) return;

    setLoading(true);
    try {
      const dto: UpdateShiftAssignmentDto = {
        status: updateData.status,
        startDate: new Date(updateData.startDate),
        endDate: new Date(updateData.endDate),
        scheduleRuleId: updateData.scheduleRuleId || undefined,
      };
      await shiftScheduleApi.updateShiftAssignment(assignment._id, dto);
      showToast("Shift assignment updated successfully", "success");
      onSuccess?.();
    } catch (error: any) {
      showToast(error.message || "Failed to update assignment", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEditMode) {
      handleUpdate();
    } else {
      handleCreate();
    }
  };

  const handleTypeChange = (newType: AssignmentType) => {
    setAssignmentType(newType);
    // Reset form data when type changes
    setCreateData({
      employeeId: "",
      departmentId: "",
      positionId: "",
      shiftId: "",
      scheduleRuleId: "",
      startDate: "",
      endDate: "",
      status: ShiftAssignmentStatus.ENTERED,
    });
    setErrors({});
  };

  // ===== ROLE CHECK =====
  if (!canManageAssignments) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-red-500">
            Access Denied: Only HR Admin or System Admin can manage shift assignments.
          </p>
        </CardContent>
      </Card>
    );
  }

  // ===== RENDER =====
  const formContent = (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Assignment Type Selector (Create mode only) */}
      {!isEditMode && (
        <Select
          label="Assignment Type *"
          value={assignmentType}
          onChange={(e) => handleTypeChange(e.target.value as AssignmentType)}
          options={[
            { value: "employee", label: "Assign to Employee" },
            { value: "department", label: "Assign to Department" },
            { value: "position", label: "Assign to Position" },
          ]}
        />
      )}

      {/* Common - Shift Selection */}
      {!isEditMode && (
        <>
          <Select
            label="Shift *"
            value={createData.shiftId}
            onChange={(e) => setCreateData({ ...createData, shiftId: e.target.value })}
            options={[
              { value: "", label: "Select a shift..." },
              ...shifts.map((shift) => ({
                value: shift._id,
                label: shift.name || shift._id,
              })),
            ]}
            error={errors.shiftId}
            disabled={loadingOptions || shifts.length === 0}
          />
          {/* Shift Name Suggestions */}
          <div className="mb-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Quick Shift Name Suggestions</label>
            <div className="flex flex-wrap gap-2">
              {SHIFT_NAME_SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  className="px-3 py-1.5 text-sm rounded-full border bg-gray-50 border-gray-300 text-gray-700 hover:bg-blue-100 hover:border-blue-500 hover:text-blue-700 transition-colors"
                  onClick={() => {
                    // Find a shift with this name and select it if exists
                    const found = shifts.find((s) => s.name === suggestion);
                    if (found) {
                      setCreateData({ ...createData, shiftId: found._id });
                    }
                  }}
                >
                  {suggestion}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-1">Click a suggestion to quickly select a shift by name (if available).</p>
          </div>
          
          {/* Schedule Rule Selection */}
          <Select
            label="Schedule Rule (Optional)"
            value={createData.scheduleRuleId}
            onChange={(e) => setCreateData({ ...createData, scheduleRuleId: e.target.value })}
            options={[
              { value: "", label: "Select a schedule rule..." },
              ...scheduleRules.map((rule) => ({
                value: rule._id,
                label: `${rule.name} (${rule.pattern})`,
              })),
            ]}
            disabled={loadingOptions || scheduleRules.length === 0}
          />
        </>
      )}

      {/* Employee-specific fields */}
      {!isEditMode && assignmentType === 'employee' && (
        <>
          <Select
            label="Employee *"
            value={createData.employeeId}
            onChange={(e) => setCreateData({ ...createData, employeeId: e.target.value })}
            options={[
              { value: "", label: "Select an employee..." },
              ...employees.map((emp) => ({
                value: emp._id,
                label: getDisplayName(emp),
              })),
            ]}
            error={errors.employeeId}
            disabled={loadingOptions || employees.length === 0}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              type="date"
              label="Start Date *"
              value={createData.startDate}
              onChange={(e) => setCreateData({ ...createData, startDate: e.target.value })}
              error={errors.startDate}
            />
            <Input
              type="date"
              label="End Date *"
              value={createData.endDate}
              onChange={(e) => setCreateData({ ...createData, endDate: e.target.value })}
              error={errors.endDate}
            />
          </div>
          <Select
            label="Status *"
            value={createData.status}
            onChange={(e) => setCreateData({ ...createData, status: e.target.value as ShiftAssignmentStatus })}
            options={[
              { value: ShiftAssignmentStatus.ENTERED, label: "Entered" },
              { value: ShiftAssignmentStatus.SUBMITTED, label: "Submitted" },
              { value: ShiftAssignmentStatus.APPROVED, label: "Approved" },
              { value: ShiftAssignmentStatus.REJECTED, label: "Rejected" },
              { value: ShiftAssignmentStatus.CANCELLED, label: "Cancelled" },
              { value: ShiftAssignmentStatus.POSTPONED, label: "Postponed" },
              { value: ShiftAssignmentStatus.EXPIRED, label: "Expired" },
            ]}
          />
        </>
      )}

      {/* Department-specific fields */}
      {!isEditMode && assignmentType === 'department' && (
        <>
          <Select
            label="Department *"
            value={createData.departmentId}
            onChange={(e) => setCreateData({ ...createData, departmentId: e.target.value })}
            options={[
              { value: "", label: "Select a department..." },
              ...departments.map((dept) => ({
                value: dept._id,
                label: dept.name || dept._id,
              })),
            ]}
            error={errors.departmentId}
            disabled={loadingOptions || departments.length === 0}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              type="date"
              label="Start Date (Optional)"
              value={createData.startDate}
              onChange={(e) => setCreateData({ ...createData, startDate: e.target.value })}
            />
            <Input
              type="date"
              label="End Date (Optional)"
              value={createData.endDate}
              onChange={(e) => setCreateData({ ...createData, endDate: e.target.value })}
            />
          </div>
          <Select
            label="Status *"
            value={createData.status}
            onChange={(e) => setCreateData({ ...createData, status: e.target.value as ShiftAssignmentStatus })}
            options={[
              { value: ShiftAssignmentStatus.ENTERED, label: "Entered" },
              { value: ShiftAssignmentStatus.SUBMITTED, label: "Submitted" },
              { value: ShiftAssignmentStatus.APPROVED, label: "Approved" },
              { value: ShiftAssignmentStatus.REJECTED, label: "Rejected" },
              { value: ShiftAssignmentStatus.CANCELLED, label: "Cancelled" },
              { value: ShiftAssignmentStatus.POSTPONED, label: "Postponed" },
              { value: ShiftAssignmentStatus.EXPIRED, label: "Expired" },
            ]}
          />
        </>
      )}

      {/* Position-specific fields */}
      {!isEditMode && assignmentType === 'position' && (
        <>
          <Select
            label="Position *"
            value={createData.positionId}
            onChange={(e) => setCreateData({ ...createData, positionId: e.target.value })}
            options={[
              { value: "", label: "Select a position..." },
              ...positions.map((pos) => ({
                value: pos._id,
                label: pos.title || pos.name || pos._id,
              })),
            ]}
            error={errors.positionId}
            disabled={loadingOptions || positions.length === 0}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              type="date"
              label="Start Date (Optional)"
              value={createData.startDate}
              onChange={(e) => setCreateData({ ...createData, startDate: e.target.value })}
            />
            <Input
              type="date"
              label="End Date (Optional)"
              value={createData.endDate}
              onChange={(e) => setCreateData({ ...createData, endDate: e.target.value })}
            />
          </div>
          <Select
            label="Status *"
            value={createData.status}
            onChange={(e) => setCreateData({ ...createData, status: e.target.value as ShiftAssignmentStatus })}
            options={[
              { value: ShiftAssignmentStatus.ENTERED, label: "Entered" },
              { value: ShiftAssignmentStatus.SUBMITTED, label: "Submitted" },
              { value: ShiftAssignmentStatus.APPROVED, label: "Approved" },
              { value: ShiftAssignmentStatus.REJECTED, label: "Rejected" },
              { value: ShiftAssignmentStatus.CANCELLED, label: "Cancelled" },
              { value: ShiftAssignmentStatus.POSTPONED, label: "Postponed" },
              { value: ShiftAssignmentStatus.EXPIRED, label: "Expired" },
            ]}
          />
        </>
      )}

      {/* Update mode fields */}
      {isEditMode && (
        <>
          <Select
            label="Status *"
            value={updateData.status}
            onChange={(e) => setUpdateData({ ...updateData, status: e.target.value as ShiftAssignmentStatus })}
            options={[
              { value: ShiftAssignmentStatus.ENTERED, label: "Entered" },
              { value: ShiftAssignmentStatus.SUBMITTED, label: "Submitted" },
              { value: ShiftAssignmentStatus.APPROVED, label: "Approved" },
              { value: ShiftAssignmentStatus.REJECTED, label: "Rejected" },
              { value: ShiftAssignmentStatus.CANCELLED, label: "Cancelled" },
              { value: ShiftAssignmentStatus.POSTPONED, label: "Postponed" },
              { value: ShiftAssignmentStatus.EXPIRED, label: "Expired" },
            ]}
          />
          <Select
            label="Schedule Rule (Optional)"
            value={updateData.scheduleRuleId}
            onChange={(e) => setUpdateData({ ...updateData, scheduleRuleId: e.target.value })}
            options={[
              { value: "", label: "Select a schedule rule..." },
              ...scheduleRules.map((rule) => ({
                value: rule._id,
                label: `${rule.name} (${rule.pattern})`,
              })),
            ]}
            disabled={loadingOptions || scheduleRules.length === 0}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              type="date"
              label="Start Date *"
              value={updateData.startDate}
              onChange={(e) => setUpdateData({ ...updateData, startDate: e.target.value })}
              error={errors.startDate}
            />
            <Input
              type="date"
              label="End Date *"
              value={updateData.endDate}
              onChange={(e) => setUpdateData({ ...updateData, endDate: e.target.value })}
              error={errors.endDate}
            />
          </div>
        </>
      )}

      {/* Form Actions */}
      {!compact && (
        <div className="flex justify-end gap-3 pt-4">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={loading || loadingOptions}>
            {loading ? "Processing..." : isEditMode ? "Update Assignment" : "Assign Shift"}
          </Button>
        </div>
      )}
    </form>
  );

  if (compact) {
    return formContent;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {title || (isEditMode ? "Update Shift Assignment" : "Assign Shift")}
        </CardTitle>
      </CardHeader>
      <CardContent>{formContent}</CardContent>
    </Card>
  );
};

export default ShiftAssignmentForm;
