"use client";
// Shift name suggestions for quick selection
const SHIFT_NAME_SUGGESTIONS = [
  "Fixed Core Hours",
  "Flex-Time",
  "Rotational",
  "Split",
  "Custom Weekly Patterns",
  "Overtime",
];


import { useState, useEffect } from "react";
import { useAuth } from "@/lib/hooks/use-auth";
import { SystemRole } from "@/types";
import { PunchPolicy } from "@/types/time-management";
import { shiftScheduleApi, fetchShiftTypes, fetchShifts, CreateShiftDto } from "@/lib/api/time-management/shift-schedule.api";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/shared/ui/Card";
import { Button } from "@/components/shared/ui/Button";
import { Input } from "@/components/shared/ui/Input";
import { Select } from "@/components/leaves/Select";
import { Modal } from "@/components/leaves/Modal";
import { Toast, useToast } from "@/components/leaves/Toast";
import { Shift, ShiftType } from "@/types/time-management";

export default function ShiftSchedulesPage() {
  const { user } = useAuth();
  const { toast, showToast, hideToast } = useToast();
  
  const isSystemAdmin = user?.roles?.includes(SystemRole.SYSTEM_ADMIN);
  const isHRManager = user?.roles?.includes(SystemRole.HR_MANAGER);
  const canManage = isSystemAdmin || isHRManager;

  const [shifts, setShifts] = useState<Shift[]>([]);
  const [shiftTypes, setShiftTypes] = useState<ShiftType[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [formData, setFormData] = useState<CreateShiftDto>({
    name: "",
    shiftType: "",
    startTime: "",
    endTime: "",
    punchPolicy: PunchPolicy.FIRST_LAST,
    graceInMinutes: 15,
    graceOutMinutes: 15,
    requiresApprovalForOvertime: false,
    active: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (canManage) {
      loadData();
    }
  }, [canManage]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [shiftsData, typesData] = await Promise.all([
        fetchShifts(false),
        fetchShiftTypes(false),
      ]);
      setShifts(shiftsData);
      setShiftTypes(typesData);
    } catch (error: any) {
      showToast(error.message || "Failed to load shifts", "error");
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Shift name is required";
    }
    if (!formData.shiftType) {
      newErrors.shiftType = "Shift type is required";
    }
    if (!formData.startTime) {
      newErrors.startTime = "Start time is required";
    }
    if (!formData.endTime) {
      newErrors.endTime = "End time is required";
    }
    if (formData.graceInMinutes < 0) {
      newErrors.graceInMinutes = "Grace period cannot be negative";
    }
    if (formData.graceOutMinutes < 0) {
      newErrors.graceOutMinutes = "Grace period cannot be negative";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreate = async () => {
    if (!validateForm()) return;

    try {
      await shiftScheduleApi.createShift(formData);
      showToast("Shift created successfully", "success");
      setIsCreateModalOpen(false);
      resetForm();
      loadData();
    } catch (error: any) {
      showToast(error.message || "Failed to create shift", "error");
    }
  };

  const handleUpdate = async () => {
    if (!validateForm() || !editingShift) return;

    try {
      await shiftScheduleApi.updateShift(editingShift._id, formData);
      showToast("Shift updated successfully", "success");
      setEditingShift(null);
      resetForm();
      loadData();
    } catch (error: any) {
      showToast(error.message || "Failed to update shift", "error");
    }
  };

  const handleDelete = async (shiftId: string) => {
    if (!confirm("Are you sure you want to delete this shift?")) return;

    try {
      await shiftScheduleApi.deleteShift(shiftId);
      showToast("Shift deleted successfully", "success");
      loadData();
    } catch (error: any) {
      showToast(error.message || "Failed to delete shift", "error");
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      shiftType: "",
      startTime: "",
      endTime: "",
      punchPolicy: PunchPolicy.FIRST_LAST,
      graceInMinutes: 15,
      graceOutMinutes: 15,
      requiresApprovalForOvertime: false,
      active: true,
    });
    setErrors({});
  };

  const openEditModal = (shift: Shift) => {
    setEditingShift(shift);
    setFormData({
      name: shift.name,
      shiftType: typeof shift.shiftType === 'string' ? shift.shiftType : (shift.shiftType as any)?._id || "",
      startTime: shift.startTime,
      endTime: shift.endTime,
      punchPolicy: shift.punchPolicy,
      graceInMinutes: shift.graceInMinutes || 15,
      graceOutMinutes: shift.graceOutMinutes || 15,
      requiresApprovalForOvertime: shift.requiresApprovalForOvertime || false,
      active: shift.active ?? true,
    });
  };

  const getShiftTypeName = (shiftTypeId: string): string => {
    const type = shiftTypes.find(t => t._id === shiftTypeId);
    return type?.name || shiftTypeId;
  };

  if (!canManage) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-500">
            Only System Admin and HR Manager can manage shifts.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8">
      <Toast message={toast.message} type={toast.type} isVisible={toast.isVisible} onClose={hideToast} />

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Shift Schedules</h1>
        <p className="text-gray-600 mt-1">
          Create and manage shifts with punch policies (Multiple punches or First-In/Last-Out)
        </p>
      </div>

      <div className="mb-6">
        <Button onClick={() => setIsCreateModalOpen(true)}>
          Create New Shift
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Loading shifts...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {shifts.map((shift) => (
            <Card key={shift._id}>
              <CardHeader>
                <CardTitle>{shift.name}</CardTitle>
                <CardDescription>
                  {getShiftTypeName(typeof shift.shiftType === 'string' ? shift.shiftType : (shift.shiftType as any)?._id || "")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium">Time:</span> {shift.startTime} - {shift.endTime}
                  </div>
                  <div>
                    <span className="font-medium">Punch Policy:</span>{" "}
                    <span className={`px-2 py-1 rounded text-xs ${
                      shift.punchPolicy === PunchPolicy.MULTIPLE
                        ? "bg-blue-100 text-blue-800"
                        : "bg-green-100 text-green-800"
                    }`}>
                      {shift.punchPolicy === PunchPolicy.MULTIPLE ? "Multiple Punches" : "First-In/Last-Out"}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium">Grace Period:</span> {shift.graceInMinutes} min in / {shift.graceOutMinutes} min out
                  </div>
                  <div>
                    <span className="font-medium">Status:</span>{" "}
                    <span className={`px-2 py-1 rounded text-xs ${
                      shift.active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                    }`}>
                      {shift.active ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditModal(shift)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(shift._id)}
                  >
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isCreateModalOpen || !!editingShift}
        onClose={() => {
          setIsCreateModalOpen(false);
          setEditingShift(null);
          resetForm();
        }}
        title={editingShift ? "Edit Shift" : "Create New Shift"}
      >
        <div className="space-y-4">
          <Input
            label="Shift Name *"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            error={errors.name}
            placeholder="e.g., Morning Shift 9-5"
          />
          {/* Shift Name Suggestions */}
          <div className="mb-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Quick Shift Name Suggestions</label>
            <div className="flex flex-wrap gap-2">
              {SHIFT_NAME_SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  className={`px-3 py-1.5 text-sm rounded-full border bg-gray-50 border-gray-300 text-gray-700 hover:bg-blue-100 hover:border-blue-500 hover:text-blue-700 transition-colors ${formData.name === suggestion ? 'ring-2 ring-blue-400' : ''}`}
                  onClick={() => setFormData({ ...formData, name: suggestion })}
                >
                  {suggestion}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-1">Click a suggestion to quickly fill the shift name.</p>
          </div>

          <Select
            label="Shift Type *"
            value={formData.shiftType}
            onChange={(e) => setFormData({ ...formData, shiftType: e.target.value })}
            options={[
              { value: "", label: "Select a shift type..." },
              ...shiftTypes.map((type) => ({
                value: type._id,
                label: type.name,
              })),
            ]}
            error={errors.shiftType}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Start Time *"
              type="time"
              value={formData.startTime}
              onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
              error={errors.startTime}
            />
            <Input
              label="End Time *"
              type="time"
              value={formData.endTime}
              onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
              error={errors.endTime}
            />
          </div>

          {/* Punch Policy Configuration - BR-TM-11 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Punch Policy * (BR-TM-11: Multiple punches or First-In/Last-Out)
            </label>
            <Select
              value={formData.punchPolicy}
              onChange={(e) => setFormData({ ...formData, punchPolicy: e.target.value as PunchPolicy })}
              options={[
                { value: PunchPolicy.FIRST_LAST, label: "First-In/Last-Out (Only 2 punches per day)" },
                { value: PunchPolicy.MULTIPLE, label: "Multiple Punches (Allow multiple clock-ins/outs)" },
              ]}
            />
            <p className="mt-1 text-xs text-gray-500">
              {formData.punchPolicy === PunchPolicy.FIRST_LAST
                ? "Employees can only clock in once and clock out once per day"
                : "Employees can clock in/out multiple times throughout the day"}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Grace In (minutes)"
              type="number"
              value={formData.graceInMinutes}
              onChange={(e) => setFormData({ ...formData, graceInMinutes: parseInt(e.target.value) || 0 })}
              error={errors.graceInMinutes}
              min="0"
            />
            <Input
              label="Grace Out (minutes)"
              type="number"
              value={formData.graceOutMinutes}
              onChange={(e) => setFormData({ ...formData, graceOutMinutes: parseInt(e.target.value) || 0 })}
              error={errors.graceOutMinutes}
              min="0"
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="requiresApproval"
              checked={formData.requiresApprovalForOvertime}
              onChange={(e) => setFormData({ ...formData, requiresApprovalForOvertime: e.target.checked })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="requiresApproval" className="ml-2 block text-sm text-gray-900">
              Requires approval for overtime
            </label>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="active"
              checked={formData.active}
              onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="active" className="ml-2 block text-sm text-gray-900">
              Active
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateModalOpen(false);
                setEditingShift(null);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button onClick={editingShift ? handleUpdate : handleCreate}>
              {editingShift ? "Update" : "Create"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
