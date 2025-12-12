"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/hooks/use-auth";
import { useRequireAuth } from "@/lib/hooks/use-auth";
import { SystemRole } from "@/types";
import { leavesApi } from "@/lib/api/leaves/leaves";
import { authApi } from "@/lib/api/auth/auth";
import { employeeProfileApi } from "@/lib/api/employee-profile/employee-profile";
import { LeaveAdjustment, CreateLeaveAdjustmentDto } from "@/types/leaves";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/shared/ui/Card";
import { Button } from "@/components/shared/ui/Button";
import { Input } from "@/components/shared/ui/Input";
import { Select } from "@/components/leaves/Select";
import { Textarea } from "@/components/leaves/Textarea";
import { Modal } from "@/components/leaves/Modal";
import { Toast, useToast } from "@/components/leaves/Toast";

export default function LeaveAdjustmentsPage() {
  const { user } = useAuth();
  useRequireAuth(SystemRole.HR_ADMIN);
  const { toast, showToast, hideToast } = useToast();

  const [adjustments, setAdjustments] = useState<LeaveAdjustment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingAdjustment, setDeletingAdjustment] = useState<LeaveAdjustment | null>(null);
  const [employeeId, setEmployeeId] = useState("");
  const [formData, setFormData] = useState<CreateLeaveAdjustmentDto>({
    employeeId: "",
    leaveTypeId: "",
    adjustmentType: "add",
    amount: 0,
    reason: "",
    hrUserId: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // NEW: State for dropdown options
  const [employees, setEmployees] = useState<Array<{ _id: string; employeeId: string; firstName: string; lastName: string }>>([]);
  const [leaveTypes, setLeaveTypes] = useState<Array<{ _id: string; name: string; code?: string }>>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [loadingLeaveTypes, setLoadingLeaveTypes] = useState(false);

  useEffect(() => {
    const userId = authApi.getUserId();
    if (userId) {
      setFormData((prev) => ({ ...prev, hrUserId: userId }));
    }
    // Load dropdown options
    loadEmployees();
    loadLeaveTypes();
  }, []);

  // NEW: Load employees for dropdown
  const loadEmployees = async () => {
    try {
      setLoadingEmployees(true);
      const response = await employeeProfileApi.getAllEmployees({ limit: 1000 });
      const employeesList = Array.isArray(response.data) ? response.data : [];
      setEmployees(employeesList.map((emp: any) => ({
        _id: emp._id,
        employeeId: emp.employeeId || emp._id,
        firstName: emp.firstName || '',
        lastName: emp.lastName || '',
      })));
    } catch (error: any) {
      console.error("Failed to load employees:", error);
      showToast("Failed to load employees list", "error");
    } finally {
      setLoadingEmployees(false);
    }
  };

  // NEW: Load leave types for dropdown
  const loadLeaveTypes = async () => {
    try {
      setLoadingLeaveTypes(true);
      const types = await leavesApi.getLeaveTypes();
      setLeaveTypes(types);
    } catch (error: any) {
      console.error("Failed to load leave types:", error);
      showToast("Failed to load leave types", "error");
    } finally {
      setLoadingLeaveTypes(false);
    }
  };

  const loadAdjustments = async () => {
    if (!employeeId) {
      setAdjustments([]);
      return;
    }

    try {
      setLoading(true);
      const data = await leavesApi.getLeaveAdjustments(employeeId);
      setAdjustments(data);
    } catch (error: any) {
      showToast(error.message || "Failed to load leave adjustments", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setFormData({
      employeeId: employeeId || "",
      leaveTypeId: "",
      adjustmentType: "add",
      amount: 0,
      reason: "",
      hrUserId: formData.hrUserId,
    });
    setErrors({});
    setIsModalOpen(true);
  };

  const handleOpenDelete = (adjustment: LeaveAdjustment) => {
    setDeletingAdjustment(adjustment);
    setIsDeleteModalOpen(true);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.employeeId) newErrors.employeeId = "Employee ID is required";
    if (!formData.leaveTypeId) newErrors.leaveTypeId = "Leave type ID is required";
    if (formData.amount <= 0) newErrors.amount = "Amount must be greater than 0";
    if (!formData.reason.trim()) newErrors.reason = "Reason is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      await leavesApi.createLeaveAdjustment(formData);
      showToast("Leave adjustment created successfully", "success");
      setIsModalOpen(false);
      loadAdjustments();
    } catch (error: any) {
      showToast(error.message || "Failed to create leave adjustment", "error");
    }
  };

  const handleDelete = async () => {
    if (!deletingAdjustment) return;
    try {
      await leavesApi.deleteLeaveAdjustment(deletingAdjustment._id);
      showToast("Leave adjustment deleted successfully", "success");
      setIsDeleteModalOpen(false);
      setDeletingAdjustment(null);
      loadAdjustments();
    } catch (error: any) {
      showToast(error.message || "Failed to delete leave adjustment", "error");
    }
  };

  const adjustmentTypeOptions = [
    { value: "add", label: "Add" },
    { value: "deduct", label: "Deduct" },
    { value: "encashment", label: "Encashment" },
  ];

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
          <h1 className="text-3xl font-bold text-gray-900">Leave Adjustments</h1>
          <p className="text-gray-600 mt-1">
            Manually adjust employee leave balances
          </p>
        </div>
        <Button onClick={handleOpenCreate} disabled={!employeeId}>
          Create Adjustment
        </Button>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>View Adjustments by Employee</CardTitle>
          <CardDescription>
            Enter an employee ID to view their leave adjustments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <div className="flex-1">
              <Select
                label="Employee ID"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                options={
                  employees.length > 0
                    ? employees.map((emp) => ({
                        value: emp.employeeId || emp._id,
                        label: `${emp.employeeId || emp._id} - ${emp.firstName} ${emp.lastName}`,
                      }))
                    : [{ value: "", label: loadingEmployees ? "Loading employees..." : "No employees available" }]
                }
                placeholder="Select employee"
              />
            </div>
            <div className="flex items-end">
              <Button onClick={loadAdjustments} disabled={!employeeId}>
                Load Adjustments
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Loading...</p>
        </div>
      ) : adjustments.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500">
              {employeeId
                ? "No adjustments found for this employee."
                : "Enter an employee ID to view adjustments."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Employee ID</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Leave Type ID</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Type</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Amount</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Reason</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Date</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {adjustments.map((adjustment) => {
                // FIXED: Handle populated objects from backend
                // employeeId can be a string or populated object with {_id, employeeId, firstName, lastName}
                const employeeIdDisplay = typeof adjustment.employeeId === 'object' && adjustment.employeeId !== null
                  ? (adjustment.employeeId as any).employeeId || (adjustment.employeeId as any)._id || 'N/A'
                  : adjustment.employeeId || 'N/A';
                
                // leaveTypeId can be a string or populated object with {_id, name, code}
                const leaveTypeDisplay = typeof adjustment.leaveTypeId === 'object' && adjustment.leaveTypeId !== null
                  ? (adjustment.leaveTypeId as any).name || (adjustment.leaveTypeId as any).code || (adjustment.leaveTypeId as any)._id || 'N/A'
                  : adjustment.leaveTypeId || 'N/A';
                
                return (
                  <tr key={adjustment._id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">{employeeIdDisplay}</td>
                    <td className="py-3 px-4">{leaveTypeDisplay}</td>
                    <td className="py-3 px-4 capitalize">{adjustment.adjustmentType}</td>
                    <td className="py-3 px-4">{adjustment.amount}</td>
                    <td className="py-3 px-4">{adjustment.reason}</td>
                    <td className="py-3 px-4">
                      {adjustment.createdAt
                        ? new Date(adjustment.createdAt).toLocaleDateString()
                        : "N/A"}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenDelete(adjustment)}
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Adjustment Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create Leave Adjustment"
        footer={
          <>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>Create</Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            label="Employee ID *"
            value={formData.employeeId}
            onChange={(e) =>
              setFormData({ ...formData, employeeId: e.target.value })
            }
            error={errors.employeeId}
            options={
              employees.length > 0
                ? employees.map((emp) => ({
                    value: emp.employeeId || emp._id,
                    label: `${emp.employeeId || emp._id} - ${emp.firstName} ${emp.lastName}`,
                  }))
                : [{ value: "", label: loadingEmployees ? "Loading employees..." : "No employees available" }]
            }
            placeholder="Select employee"
          />
          <Select
            label="Leave Type *"
            value={formData.leaveTypeId}
            onChange={(e) =>
              setFormData({ ...formData, leaveTypeId: e.target.value })
            }
            error={errors.leaveTypeId}
            options={
              leaveTypes.length > 0
                ? leaveTypes.map((type) => ({
                    value: type._id,
                    label: `${type.name}${type.code ? ` (${type.code})` : ''}`,
                  }))
                : [{ value: "", label: loadingLeaveTypes ? "Loading leave types..." : "No leave types available" }]
            }
            placeholder="Select leave type"
          />
          <Select
            label="Adjustment Type *"
            value={formData.adjustmentType}
            onChange={(e) =>
              setFormData({
                ...formData,
                adjustmentType: e.target.value as any,
              })
            }
            options={adjustmentTypeOptions}
          />
          <Input
            label="Amount *"
            type="number"
            step="0.01"
            value={formData.amount}
            onChange={(e) =>
              setFormData({
                ...formData,
                amount: parseFloat(e.target.value) || 0,
              })
            }
            error={errors.amount}
          />
          <Textarea
            label="Reason *"
            value={formData.reason}
            onChange={(e) =>
              setFormData({ ...formData, reason: e.target.value })
            }
            error={errors.reason}
            rows={3}
            placeholder="Reason for adjustment"
          />
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Leave Adjustment"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleDelete}>
              Delete
            </Button>
          </>
        }
      >
        <p className="text-gray-700">
          Are you sure you want to delete this leave adjustment? This action
          cannot be undone.
        </p>
      </Modal>
    </div>
  );
}

