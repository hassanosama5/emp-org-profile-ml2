"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/hooks/use-auth";
import { useRequireAuth } from "@/lib/hooks/use-auth";
import { SystemRole } from "@/types";
import { shiftScheduleApi, fetchShifts, fetchDepartments, fetchPositions } from "@/lib/api/time-management/shift-schedule.api";
import {
  ShiftAssignment,
  AssignShiftToEmployeeDto,
  AssignShiftToDepartmentDto,
  AssignShiftToPositionDto,
  UpdateShiftAssignmentDto,
  ShiftAssignmentStatus,
  Shift,
} from "@/types/time-management";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/shared/ui/Card";
import { Button } from "@/components/shared/ui/Button";
import { Input } from "@/components/shared/ui/Input";
import { Select } from "@/components/leaves/Select";
import { Modal } from "@/components/leaves/Modal";
import { Toast, useToast } from "@/components/leaves/Toast";

export default function ShiftAssignmentsPage() {
  const { user } = useAuth();
  useRequireAuth(SystemRole.HR_ADMIN);
  const { toast, showToast, hideToast } = useToast();

  const [assignments, setAssignments] = useState<ShiftAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<ShiftAssignment | null>(null);
  const [assignmentType, setAssignmentType] = useState<'employee' | 'department' | 'position'>('employee');
  const [formData, setFormData] = useState<AssignShiftToEmployeeDto | AssignShiftToDepartmentDto | AssignShiftToPositionDto>({
    employeeId: "",
    shiftId: "",
    startDate: "",
    endDate: "",
    status: ShiftAssignmentStatus.PENDING,
  } as AssignShiftToEmployeeDto);
  const [updateFormData, setUpdateFormData] = useState<UpdateShiftAssignmentDto>({
    status: ShiftAssignmentStatus.PENDING,
    startDate: new Date(),
    endDate: new Date(),
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [filters, setFilters] = useState<{
    status?: ShiftAssignmentStatus;
    employeeId?: string;
    departmentId?: string;
    positionId?: string;
    shiftId?: string;
  }>({});

  // Dropdown options state
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [positions, setPositions] = useState<any[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);

  useEffect(() => {
    loadAssignments();
    loadDropdownOptions();
  }, [filters]);

  const loadDropdownOptions = async () => {
    try {
      setLoadingOptions(true);
      const [shiftsData, departmentsData, positionsData] = await Promise.all([
        fetchShifts(true), // Active shifts only
        fetchDepartments(true), // Active departments only
        fetchPositions(true), // Active positions only
      ]);
      
      console.log("Shifts data:", shiftsData);
      console.log("Departments data:", departmentsData);
      console.log("Positions data:", positionsData);
      
      setShifts(shiftsData || []);
      setDepartments(departmentsData || []);
      setPositions(positionsData || []);
    } catch (error: any) {
      console.error("Failed to load dropdown options:", error);
      showToast(`Failed to load options: ${error.message}`, "error");
    } finally {
      setLoadingOptions(false);
    }
  };

  const loadAssignments = async () => {
    try {
      setLoading(true);
      const data = await shiftScheduleApi.getAllShiftAssignments(filters);
      setAssignments(data);
    } catch (error: any) {
      showToast(error.message || "Failed to load shift assignments", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setAssignmentType('employee');
    setFormData({
      employeeId: "",
      shiftId: "",
      startDate: "",
      endDate: "",
      status: ShiftAssignmentStatus.PENDING,
    } as AssignShiftToEmployeeDto);
    setErrors({});
    setIsCreateModalOpen(true);
  };

  const handleOpenUpdate = (assignment: ShiftAssignment) => {
    setEditingAssignment(assignment);
    setUpdateFormData({
      status: assignment.status,
      startDate: new Date(assignment.startDate),
      endDate: assignment.endDate ? new Date(assignment.endDate) : new Date(),
    });
    setErrors({});
    setIsUpdateModalOpen(true);
  };

  // Helper function to validate MongoDB ObjectId format
  const isValidObjectId = (id: string): boolean => {
    // MongoDB ObjectId is a 24-character hexadecimal string
    return /^[0-9a-fA-F]{24}$/.test(id);
  };

  const validateCreateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (assignmentType === 'employee') {
      const data = formData as AssignShiftToEmployeeDto;
      if (!data.employeeId) {
        newErrors.employeeId = "Employee ID is required";
      } else if (!isValidObjectId(data.employeeId)) {
        newErrors.employeeId = "Employee ID must be a valid 24-character hexadecimal ID";
      }
      if (!data.shiftId) {
        newErrors.shiftId = "Shift ID is required";
      } else if (!isValidObjectId(data.shiftId)) {
        newErrors.shiftId = "Shift ID must be a valid 24-character hexadecimal ID";
      }
      if (!data.startDate) newErrors.startDate = "Start date is required";
      if (!data.endDate) newErrors.endDate = "End date is required";
      if (data.startDate && data.endDate && new Date(data.endDate) < new Date(data.startDate)) {
        newErrors.endDate = "End date must be after start date";
      }
    } else if (assignmentType === 'department') {
      const data = formData as AssignShiftToDepartmentDto;
      if (!data.departmentId) {
        newErrors.departmentId = "Department ID is required";
      } else if (!isValidObjectId(data.departmentId)) {
        newErrors.departmentId = "Department ID must be a valid 24-character hexadecimal ID";
      }
      if (!data.shiftId) {
        newErrors.shiftId = "Shift ID is required";
      } else if (!isValidObjectId(data.shiftId)) {
        newErrors.shiftId = "Shift ID must be a valid 24-character hexadecimal ID";
      }
    } else if (assignmentType === 'position') {
      const data = formData as AssignShiftToPositionDto;
      if (!data.positionId) {
        newErrors.positionId = "Position ID is required";
      } else if (!isValidObjectId(data.positionId)) {
        newErrors.positionId = "Position ID must be a valid 24-character hexadecimal ID";
      }
      if (!data.shiftId) {
        newErrors.shiftId = "Shift ID is required";
      } else if (!isValidObjectId(data.shiftId)) {
        newErrors.shiftId = "Shift ID must be a valid 24-character hexadecimal ID";
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateUpdateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!updateFormData.startDate) newErrors.startDate = "Start date is required";
    if (!updateFormData.endDate) newErrors.endDate = "End date is required";
    if (new Date(updateFormData.endDate) < new Date(updateFormData.startDate)) {
      newErrors.endDate = "End date must be after start date";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateCreateForm()) return;

    try {
      if (assignmentType === 'employee') {
        await shiftScheduleApi.assignShiftToEmployee(formData as AssignShiftToEmployeeDto);
        showToast("Shift assigned to employee successfully", "success");
      } else if (assignmentType === 'department') {
        await shiftScheduleApi.assignShiftToDepartment(formData as AssignShiftToDepartmentDto);
        showToast("Shift assigned to department successfully", "success");
      } else if (assignmentType === 'position') {
        await shiftScheduleApi.assignShiftToPosition(formData as AssignShiftToPositionDto);
        showToast("Shift assigned to position successfully", "success");
      }
      setIsCreateModalOpen(false);
      loadAssignments();
    } catch (error: any) {
      showToast(error.message || "Failed to assign shift", "error");
    }
  };

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateUpdateForm() || !editingAssignment) return;

    try {
      await shiftScheduleApi.updateShiftAssignment(editingAssignment._id, updateFormData);
      showToast("Shift assignment updated successfully", "success");
      setIsUpdateModalOpen(false);
      setEditingAssignment(null);
      loadAssignments();
    } catch (error: any) {
      showToast(error.message || "Failed to update shift assignment", "error");
    }
  };

  const formatDate = (date: Date | string | undefined) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString();
  };

  const getStatusColor = (status: ShiftAssignmentStatus) => {
    switch (status) {
      case ShiftAssignmentStatus.APPROVED:
        return "text-green-600 bg-green-50";
      case ShiftAssignmentStatus.PENDING:
        return "text-yellow-600 bg-yellow-50";
      case ShiftAssignmentStatus.CANCELLED:
        return "text-red-600 bg-red-50";
      case ShiftAssignmentStatus.EXPIRED:
        return "text-gray-600 bg-gray-50";
      default:
        return "text-gray-600 bg-gray-50";
    }
  };

  // Helper functions to safely extract display values from populated objects
  const getEmployeeDisplay = (employeeId: any): string => {
    if (!employeeId) return "N/A";
    if (typeof employeeId === 'string') return employeeId;
    if (typeof employeeId === 'object' && employeeId !== null) {
      // Handle populated employee object
      if (employeeId.fullName) return employeeId.fullName;
      if (employeeId.firstName && employeeId.lastName) {
        return `${employeeId.firstName} ${employeeId.lastName}`;
      }
      if (employeeId.employeeNumber) return employeeId.employeeNumber;
      if (employeeId._id) return String(employeeId._id);
    }
    return "N/A";
  };

  const getDepartmentDisplay = (departmentId: any): string => {
    if (!departmentId) return "N/A";
    if (typeof departmentId === 'string') return departmentId;
    if (typeof departmentId === 'object' && departmentId !== null) {
      // Handle populated department object
      if (departmentId.name) return departmentId.name;
      if (departmentId._id) return String(departmentId._id);
    }
    return "N/A";
  };

  const getPositionDisplay = (positionId: any): string => {
    if (!positionId) return "N/A";
    if (typeof positionId === 'string') return positionId;
    if (typeof positionId === 'object' && positionId !== null) {
      // Handle populated position object
      if (positionId.name) return positionId.name;
      if (positionId._id) return String(positionId._id);
    }
    return "N/A";
  };

  const getShiftDisplay = (shiftId: any): string => {
    if (!shiftId) return "N/A";
    if (typeof shiftId === 'string') return shiftId;
    if (typeof shiftId === 'object' && shiftId !== null) {
      // Handle populated shift object
      if (shiftId.name) return shiftId.name;
      if (shiftId._id) return String(shiftId._id);
    }
    return "N/A";
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
          <h1 className="text-3xl font-bold text-gray-900">Shift Assignments</h1>
          <p className="text-gray-600 mt-1">
            Manage shift assignments for employees, departments, and positions
          </p>
        </div>
        <Button onClick={handleOpenCreate}>Assign Shift</Button>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Select
              label="Status"
              value={filters.status || ""}
              onChange={(e) => setFilters({
                ...filters,
                status: e.target.value ? (e.target.value as ShiftAssignmentStatus) : undefined,
              })}
              options={[
                { value: "", label: "All Statuses" },
                { value: ShiftAssignmentStatus.PENDING, label: "Pending" },
                { value: ShiftAssignmentStatus.APPROVED, label: "Approved" },
                { value: ShiftAssignmentStatus.CANCELLED, label: "Cancelled" },
                { value: ShiftAssignmentStatus.EXPIRED, label: "Expired" },
              ]}
              placeholder="Filter by status"
            />
            <Input
              label="Employee ID"
              value={filters.employeeId || ""}
              onChange={(e) => setFilters({
                ...filters,
                employeeId: e.target.value || undefined,
              })}
              placeholder="Filter by employee ID"
            />
            <Select
              label="Department"
              value={filters.departmentId || ""}
              onChange={(e) => setFilters({
                ...filters,
                departmentId: e.target.value || undefined,
              })}
              options={[
                { value: "", label: "All Departments" },
                ...departments.map((dept: any) => ({
                  value: dept._id || dept.id,
                  label: dept.name || dept._id,
                })),
              ]}
              placeholder="Filter by department"
              disabled={loadingOptions}
            />
            <Select
              label="Shift"
              value={filters.shiftId || ""}
              onChange={(e) => setFilters({
                ...filters,
                shiftId: e.target.value || undefined,
              })}
              options={[
                { value: "", label: "All Shifts" },
                ...shifts.map((shift: Shift) => ({
                  value: shift._id,
                  label: shift.name || shift._id,
                })),
              ]}
              placeholder="Filter by shift"
              disabled={loadingOptions}
            />
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Loading...</p>
        </div>
      ) : assignments.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500 mb-4">
              No shift assignments found. Assign your first shift to get started.
            </p>
            <Button onClick={handleOpenCreate}>Assign Shift</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Employee</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Department</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Position</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Shift ID</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Start Date</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">End Date</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {assignments.map((assignment) => (
                <tr key={assignment._id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4">{getEmployeeDisplay(assignment.employeeId)}</td>
                  <td className="py-3 px-4">{getDepartmentDisplay(assignment.departmentId)}</td>
                  <td className="py-3 px-4">{getPositionDisplay(assignment.positionId)}</td>
                  <td className="py-3 px-4">{getShiftDisplay(assignment.shiftId)}</td>
                  <td className="py-3 px-4">{formatDate(assignment.startDate)}</td>
                  <td className="py-3 px-4">{formatDate(assignment.endDate)}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(assignment.status)}`}>
                      {assignment.status}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenUpdate(assignment)}
                      >
                        Update
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Assignment Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Assign Shift"
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateSubmit}>
              Assign
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <Select
            label="Assignment Type *"
            value={assignmentType}
            onChange={(e) => {
              setAssignmentType(e.target.value as 'employee' | 'department' | 'position');
              // Reset form data when type changes
              if (e.target.value === 'employee') {
                setFormData({
                  employeeId: "",
                  shiftId: "",
                  startDate: "",
                  endDate: "",
                  status: ShiftAssignmentStatus.PENDING,
                } as AssignShiftToEmployeeDto);
              } else if (e.target.value === 'department') {
                setFormData({
                  departmentId: "",
                  shiftId: "",
                  startDate: undefined,
                  endDate: undefined,
                } as AssignShiftToDepartmentDto);
              } else {
                setFormData({
                  positionId: "",
                  shiftId: "",
                  startDate: undefined,
                  endDate: undefined,
                } as AssignShiftToPositionDto);
              }
            }}
            options={[
              { value: "employee", label: "Assign to Employee" },
              { value: "department", label: "Assign to Department" },
              { value: "position", label: "Assign to Position" },
            ]}
          />

          {assignmentType === 'employee' && (
            <>
              <Input
                label="Employee ID *"
                value={(formData as AssignShiftToEmployeeDto).employeeId || ""}
                onChange={(e) => setFormData({
                  ...formData,
                  employeeId: e.target.value,
                } as AssignShiftToEmployeeDto)}
                error={errors.employeeId}
                placeholder="e.g., 507f1f77bcf86cd799439011"
              />
              <Select
                label="Shift *"
                value={(formData as AssignShiftToEmployeeDto).shiftId || ""}
                onChange={(e) => setFormData({
                  ...formData,
                  shiftId: e.target.value,
                } as AssignShiftToEmployeeDto)}
                error={errors.shiftId}
                options={[
                  { value: "", label: "Select a shift..." },
                  ...shifts.map((shift: Shift) => ({
                    value: shift._id,
                    label: shift.name || shift._id,
                  })),
                ]}
                disabled={loadingOptions || shifts.length === 0}
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  type="date"
                  label="Start Date *"
                  value={(formData as AssignShiftToEmployeeDto).startDate || ""}
                  onChange={(e) => setFormData({
                    ...formData,
                    startDate: e.target.value,
                  } as AssignShiftToEmployeeDto)}
                  error={errors.startDate}
                />
                <Input
                  type="date"
                  label="End Date *"
                  value={(formData as AssignShiftToEmployeeDto).endDate || ""}
                  onChange={(e) => setFormData({
                    ...formData,
                    endDate: e.target.value,
                  } as AssignShiftToEmployeeDto)}
                  error={errors.endDate}
                />
              </div>
              <Select
                label="Status *"
                value={(formData as AssignShiftToEmployeeDto).status || ShiftAssignmentStatus.PENDING}
                onChange={(e) => setFormData({
                  ...formData,
                  status: e.target.value as ShiftAssignmentStatus,
                } as AssignShiftToEmployeeDto)}
                options={[
                  { value: ShiftAssignmentStatus.PENDING, label: "Pending" },
                  { value: ShiftAssignmentStatus.APPROVED, label: "Approved" },
                ]}
              />
            </>
          )}

          {assignmentType === 'department' && (
            <>
              <Select
                label="Department *"
                value={(formData as AssignShiftToDepartmentDto).departmentId || ""}
                onChange={(e) => setFormData({
                  ...formData,
                  departmentId: e.target.value,
                } as AssignShiftToDepartmentDto)}
                error={errors.departmentId}
                options={[
                  { value: "", label: "Select a department..." },
                  ...departments.map((dept: any) => ({
                    value: dept._id || dept.id,
                    label: dept.name || dept._id,
                  })),
                ]}
                disabled={loadingOptions || departments.length === 0}
              />
              <Select
                label="Shift *"
                value={(formData as AssignShiftToDepartmentDto).shiftId || ""}
                onChange={(e) => setFormData({
                  ...formData,
                  shiftId: e.target.value,
                } as AssignShiftToDepartmentDto)}
                error={errors.shiftId}
                options={[
                  { value: "", label: "Select a shift..." },
                  ...shifts.map((shift: Shift) => ({
                    value: shift._id,
                    label: shift.name || shift._id,
                  })),
                ]}
                disabled={loadingOptions || shifts.length === 0}
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  type="date"
                  label="Start Date (Optional)"
                  value={(formData as AssignShiftToDepartmentDto).startDate ? new Date((formData as AssignShiftToDepartmentDto).startDate!).toISOString().split('T')[0] : ""}
                  onChange={(e) => setFormData({
                    ...formData,
                    startDate: e.target.value ? new Date(e.target.value) : undefined,
                  } as AssignShiftToDepartmentDto)}
                />
                <Input
                  type="date"
                  label="End Date (Optional)"
                  value={(formData as AssignShiftToDepartmentDto).endDate ? new Date((formData as AssignShiftToDepartmentDto).endDate!).toISOString().split('T')[0] : ""}
                  onChange={(e) => setFormData({
                    ...formData,
                    endDate: e.target.value ? new Date(e.target.value) : undefined,
                  } as AssignShiftToDepartmentDto)}
                />
              </div>
            </>
          )}

          {assignmentType === 'position' && (
            <>
              <Select
                label="Position *"
                value={(formData as AssignShiftToPositionDto).positionId || ""}
                onChange={(e) => setFormData({
                  ...formData,
                  positionId: e.target.value,
                } as AssignShiftToPositionDto)}
                error={errors.positionId}
                options={[
                  { value: "", label: "Select a position..." },
                  ...positions.map((pos: any) => ({
                    value: pos._id || pos.id,
                    label: pos.title || pos.name || pos._id,
                  })),
                ]}
                disabled={loadingOptions || positions.length === 0}
              />
              <Select
                label="Shift *"
                value={(formData as AssignShiftToPositionDto).shiftId || ""}
                onChange={(e) => setFormData({
                  ...formData,
                  shiftId: e.target.value,
                } as AssignShiftToPositionDto)}
                error={errors.shiftId}
                options={[
                  { value: "", label: "Select a shift..." },
                  ...shifts.map((shift: Shift) => ({
                    value: shift._id,
                    label: shift.name || shift._id,
                  })),
                ]}
                disabled={loadingOptions || shifts.length === 0}
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  type="date"
                  label="Start Date (Optional)"
                  value={(formData as AssignShiftToPositionDto).startDate ? new Date((formData as AssignShiftToPositionDto).startDate!).toISOString().split('T')[0] : ""}
                  onChange={(e) => setFormData({
                    ...formData,
                    startDate: e.target.value ? new Date(e.target.value) : undefined,
                  } as AssignShiftToPositionDto)}
                />
                <Input
                  type="date"
                  label="End Date (Optional)"
                  value={(formData as AssignShiftToPositionDto).endDate ? new Date((formData as AssignShiftToPositionDto).endDate!).toISOString().split('T')[0] : ""}
                  onChange={(e) => setFormData({
                    ...formData,
                    endDate: e.target.value ? new Date(e.target.value) : undefined,
                  } as AssignShiftToPositionDto)}
                />
              </div>
            </>
          )}
        </form>
      </Modal>

      {/* Update Assignment Modal */}
      <Modal
        isOpen={isUpdateModalOpen}
        onClose={() => {
          setIsUpdateModalOpen(false);
          setEditingAssignment(null);
        }}
        title="Update Shift Assignment"
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => {
              setIsUpdateModalOpen(false);
              setEditingAssignment(null);
            }}>
              Cancel
            </Button>
            <Button onClick={handleUpdateSubmit}>
              Update
            </Button>
          </>
        }
      >
        <form onSubmit={handleUpdateSubmit} className="space-y-4">
          <Select
            label="Status *"
            value={updateFormData.status}
            onChange={(e) => setUpdateFormData({
              ...updateFormData,
              status: e.target.value as ShiftAssignmentStatus,
            })}
            options={[
              { value: ShiftAssignmentStatus.PENDING, label: "Pending" },
              { value: ShiftAssignmentStatus.APPROVED, label: "Approved" },
              { value: ShiftAssignmentStatus.CANCELLED, label: "Cancelled" },
              { value: ShiftAssignmentStatus.EXPIRED, label: "Expired" },
            ]}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              type="date"
              label="Start Date *"
              value={updateFormData.startDate ? new Date(updateFormData.startDate).toISOString().split('T')[0] : ""}
              onChange={(e) => setUpdateFormData({
                ...updateFormData,
                startDate: new Date(e.target.value),
              })}
              error={errors.startDate}
            />
            <Input
              type="date"
              label="End Date *"
              value={updateFormData.endDate ? new Date(updateFormData.endDate).toISOString().split('T')[0] : ""}
              onChange={(e) => setUpdateFormData({
                ...updateFormData,
                endDate: new Date(e.target.value),
              })}
              error={errors.endDate}
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}

