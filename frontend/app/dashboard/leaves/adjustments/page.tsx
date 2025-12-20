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
    // Get user ID from auth hook
    if (user?.id || user?.userId) {
      const userId = (user.id || user.userId) as string;
      setFormData((prev) => ({ ...prev, hrUserId: userId }));
    }
    // Load dropdown options
    loadEmployees();
    loadLeaveTypes();
  }, [user]);

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

      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">Leave Adjustments</h1>
            <p className="text-gray-600 mt-1">
              Manually adjust employee leave balances
            </p>
          </div>
        </div>
        <div className="flex justify-end mt-4">
          <Button 
            onClick={handleOpenCreate} 
            disabled={!employeeId}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold rounded-lg hover:from-amber-600 hover:to-orange-700 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Adjustment
          </Button>
        </div>
      </div>

      <Card className="mb-6 border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50">
        <CardHeader className="bg-gradient-to-r from-amber-500 to-orange-600 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <CardTitle className="text-white text-xl">View Adjustments by Employee</CardTitle>
              <CardDescription className="text-amber-100">
                Enter an employee ID to view their leave adjustments
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
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
              <Button 
                onClick={loadAdjustments} 
                disabled={!employeeId}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold rounded-lg hover:from-amber-600 hover:to-orange-700 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Load Adjustments
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <Card className="border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50">
          <CardContent className="py-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full mb-4 animate-pulse">
              <svg className="w-8 h-8 text-white animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <p className="text-amber-700 font-semibold text-lg">Loading adjustments...</p>
          </CardContent>
        </Card>
      ) : adjustments.length === 0 ? (
        <Card className="border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50">
          <CardContent className="py-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
            </div>
            <p className="text-gray-700 font-medium text-lg mb-2">
              {employeeId
                ? "No adjustments found"
                : "Select an employee"}
            </p>
            <p className="text-gray-500">
              {employeeId
                ? "No adjustments found for this employee."
                : "Enter an employee ID to view adjustments."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-amber-500 to-orange-600 text-white">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              </div>
              <div>
                <CardTitle className="text-white text-xl">Leave Adjustments</CardTitle>
                <CardDescription className="text-amber-100">
                  {adjustments.length} adjustment{adjustments.length !== 1 ? 's' : ''} found
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gradient-to-r from-amber-100 to-orange-100 border-b-2 border-amber-300">
                    <th className="text-left py-4 px-6 font-bold text-amber-900">Employee ID</th>
                    <th className="text-left py-4 px-6 font-bold text-amber-900">Leave Type ID</th>
                    <th className="text-left py-4 px-6 font-bold text-amber-900">Type</th>
                    <th className="text-left py-4 px-6 font-bold text-amber-900">Amount</th>
                    <th className="text-left py-4 px-6 font-bold text-amber-900">Reason</th>
                    <th className="text-left py-4 px-6 font-bold text-amber-900">Date</th>
                    <th className="text-right py-4 px-6 font-bold text-amber-900">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {adjustments.map((adjustment, index) => {
                    // FIXED: Handle populated objects from backend
                    // employeeId can be a string or populated object with {_id, employeeId, firstName, lastName}
                    const employeeIdDisplay = typeof adjustment.employeeId === 'object' && adjustment.employeeId !== null
                      ? (adjustment.employeeId as any).employeeId || (adjustment.employeeId as any)._id || 'N/A'
                      : adjustment.employeeId || 'N/A';
                    
                    // leaveTypeId can be a string or populated object with {_id, name, code}
                    const leaveTypeDisplay = typeof adjustment.leaveTypeId === 'object' && adjustment.leaveTypeId !== null
                      ? (adjustment.leaveTypeId as any).name || (adjustment.leaveTypeId as any).code || (adjustment.leaveTypeId as any)._id || 'N/A'
                      : adjustment.leaveTypeId || 'N/A';
                    
                    const isEven = index % 2 === 0;
                    const adjustmentTypeColor = adjustment.adjustmentType === 'add' 
                      ? 'from-green-100 to-emerald-100 text-green-800 border-green-200'
                      : adjustment.adjustmentType === 'deduct'
                      ? 'from-red-100 to-rose-100 text-red-800 border-red-200'
                      : 'from-blue-100 to-indigo-100 text-blue-800 border-blue-200';
                    
                    return (
                      <tr 
                        key={adjustment._id} 
                        className={`border-b border-amber-100 transition-all duration-200 ${
                          isEven 
                            ? 'bg-white hover:bg-gradient-to-r hover:from-amber-50 hover:to-orange-50' 
                            : 'bg-gradient-to-r from-amber-50/50 to-orange-50/50 hover:bg-gradient-to-r hover:from-amber-100 hover:to-orange-100'
                        }`}
                      >
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg">
                              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                            </div>
                            <span className="font-medium text-gray-900">{employeeIdDisplay}</span>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-gradient-to-r from-purple-100 to-pink-100 text-purple-800">
                            {leaveTypeDisplay}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-gradient-to-r border ${adjustmentTypeColor}`}>
                            {adjustment.adjustmentType === 'add' && (
                              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                            )}
                            {adjustment.adjustmentType === 'deduct' && (
                              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                              </svg>
                            )}
                            {adjustment.adjustmentType === 'encashment' && (
                              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            )}
                            {adjustment.adjustmentType.charAt(0).toUpperCase() + adjustment.adjustmentType.slice(1)}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <span className="font-bold text-lg text-gray-900">{adjustment.amount}</span>
                          <span className="text-sm text-gray-600 ml-1">days</span>
                        </td>
                        <td className="py-4 px-6">
                          <span className="text-gray-700">{adjustment.reason}</span>
                        </td>
                        <td className="py-4 px-6">
                          <span className="inline-flex items-center px-2 py-1 rounded-md bg-gradient-to-r from-gray-100 to-slate-100 text-gray-700 text-sm font-medium">
                            {adjustment.createdAt
                              ? new Date(adjustment.createdAt).toLocaleDateString()
                              : "N/A"}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex justify-end">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenDelete(adjustment)}
                              className="border-red-300 text-red-700 hover:bg-gradient-to-r hover:from-red-50 hover:to-rose-50 hover:border-red-400 transition-all duration-200"
                            >
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
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
          </CardContent>
        </Card>
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

