"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/hooks/use-auth";
import { useRequireAuth } from "@/lib/hooks/use-auth";
import { SystemRole } from "@/types";
import { leavesApi } from "@/lib/api/leaves/leaves";
import { fetchPositions } from "@/lib/api/time-management/shift-schedule.api";
import { LeavePolicy, CreateLeavePolicyDto, UpdateLeavePolicyDto } from "@/types/leaves";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/shared/ui/Card";
import { Button } from "@/components/shared/ui/Button";
import { Input } from "@/components/shared/ui/Input";
import { Select } from "@/components/leaves/Select";
import { Modal } from "@/components/leaves/Modal";
import { Toast, useToast } from "@/components/leaves/Toast";
import { LeaveType } from "@/types/leaves";

export default function LeavePoliciesPage() {
  const { user } = useAuth();
  useRequireAuth(SystemRole.HR_ADMIN);
  const { toast, showToast, hideToast } = useToast();

  const [policies, setPolicies] = useState<LeavePolicy[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [positions, setPositions] = useState<any[]>([]);
  const [loadingPositions, setLoadingPositions] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<LeavePolicy | null>(null);
  const [deletingPolicy, setDeletingPolicy] = useState<LeavePolicy | null>(null);
  const [formData, setFormData] = useState<CreateLeavePolicyDto>({
    leaveTypeId: "",
    accrualMethod: "monthly",
    monthlyRate: 0,
    yearlyRate: 0,
    roundingRule: "none",
    maxCarryForward: 0,
    minNoticeDays: 0,
    eligibility: {
      minTenureMonths: undefined,
      positionsAllowed: [],
      contractTypesAllowed: [],
    },
  });
  const [eligibilityData, setEligibilityData] = useState({
    minTenureMonths: "",
    positionsAllowed: [] as string[],
    contractTypesAllowed: [] as string[],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadData();
    loadPositions();
  }, []);

  const loadPositions = async () => {
    try {
      setLoadingPositions(true);
      const positionsData = await fetchPositions(true);
      setPositions(positionsData || []);
    } catch (error: any) {
      console.warn("Failed to fetch positions:", error);
      setPositions([]);
    } finally {
      setLoadingPositions(false);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const policiesData = await leavesApi.getLeavePolicies();
      setPolicies(policiesData);
      
      // Load leave types
      try {
        const types = await leavesApi.getLeaveTypes();
        setLeaveTypes(types);
      } catch (typeError: any) {
        // If types endpoint fails, show empty
        console.warn("Leave types endpoint not available:", typeError);
        setLeaveTypes([]);
      }
    } catch (error: any) {
      showToast(error.message || "Failed to load leave policies", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingPolicy(null);
    setFormData({
      leaveTypeId: "",
      accrualMethod: "monthly",
      monthlyRate: 0,
      yearlyRate: 0,
      roundingRule: "none",
      maxCarryForward: 0,
      minNoticeDays: 0,
      eligibility: {
        minTenureMonths: undefined,
        positionsAllowed: [],
        contractTypesAllowed: [],
      },
    });
    setEligibilityData({
      minTenureMonths: "",
      positionsAllowed: [],
      contractTypesAllowed: [],
    });
    setErrors({});
    setIsModalOpen(true);
  };

  const handleOpenEdit = (policy: LeavePolicy) => {
    setEditingPolicy(policy);
    setFormData({
      leaveTypeId: policy.leaveTypeId.toString(),
      accrualMethod: policy.accrualMethod,
      monthlyRate: policy.monthlyRate,
      yearlyRate: policy.yearlyRate,
      roundingRule: policy.roundingRule,
      maxCarryForward: policy.maxCarryForward,
      minNoticeDays: policy.minNoticeDays,
      maxConsecutiveDays: policy.maxConsecutiveDays,
      eligibility: policy.eligibility || {
        minTenureMonths: undefined,
        positionsAllowed: [],
        contractTypesAllowed: [],
      },
    });
    setEligibilityData({
      minTenureMonths: policy.eligibility?.minTenureMonths?.toString() || "",
      positionsAllowed: Array.isArray(policy.eligibility?.positionsAllowed)
        ? policy.eligibility.positionsAllowed
        : [],
      contractTypesAllowed: Array.isArray(policy.eligibility?.contractTypesAllowed)
        ? policy.eligibility.contractTypesAllowed
        : [],
    });
    setErrors({});
    setIsModalOpen(true);
  };

  const handleOpenDelete = (policy: LeavePolicy) => {
    setDeletingPolicy(policy);
    setIsDeleteModalOpen(true);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.leaveTypeId) newErrors.leaveTypeId = "Leave type is required";
    if (formData.monthlyRate < 0) newErrors.monthlyRate = "Monthly rate must be >= 0";
    if (formData.yearlyRate < 0) newErrors.yearlyRate = "Yearly rate must be >= 0";
    if (formData.minNoticeDays < 0) newErrors.minNoticeDays = "Min notice days must be >= 0";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      // Build eligibility object from form data
      const eligibility: Record<string, any> = {};
      
      if (eligibilityData.minTenureMonths && eligibilityData.minTenureMonths.trim() !== "") {
        const tenureMonths = parseInt(eligibilityData.minTenureMonths);
        if (!isNaN(tenureMonths) && tenureMonths > 0) {
          eligibility.minTenureMonths = tenureMonths;
        }
      }

      if (eligibilityData.positionsAllowed && eligibilityData.positionsAllowed.length > 0) {
        eligibility.positionsAllowed = eligibilityData.positionsAllowed;
      }

      if (eligibilityData.contractTypesAllowed.length > 0) {
        eligibility.contractTypesAllowed = eligibilityData.contractTypesAllowed;
      }

      // Only include eligibility if it has at least one rule
      const submitData = {
        ...formData,
        eligibility: Object.keys(eligibility).length > 0 ? eligibility : undefined,
      };

      if (editingPolicy) {
        await leavesApi.updateLeavePolicy(editingPolicy._id, submitData);
        showToast("Leave policy updated successfully", "success");
      } else {
        await leavesApi.createLeavePolicy(submitData);
        showToast("Leave policy created successfully", "success");
      }
      setIsModalOpen(false);
      loadData();
    } catch (error: any) {
      showToast(error.message || "Failed to save leave policy", "error");
    }
  };

  const handleDelete = async () => {
    if (!deletingPolicy) return;
    try {
      await leavesApi.deleteLeavePolicy(deletingPolicy._id);
      showToast("Leave policy deleted successfully", "success");
      setIsDeleteModalOpen(false);
      setDeletingPolicy(null);
      loadData();
    } catch (error: any) {
      showToast(error.message || "Failed to delete leave policy", "error");
    }
  };

  const accrualMethodOptions = [
    { value: "monthly", label: "Monthly" },
    { value: "yearly", label: "Yearly" },
    { value: "per-term", label: "Per Term" },
  ];

  const roundingRuleOptions = [
    { value: "none", label: "None" },
    { value: "round", label: "Round" },
    { value: "round_up", label: "Round Up" },
    { value: "round_down", label: "Round Down" },
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
          <div className="p-3 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-xl shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-transparent">Leave Policies</h1>
            <p className="text-gray-600 mt-1">
              Configure accrual rates, carry-over, and eligibility rules
            </p>
          </div>
        </div>
        <div className="flex justify-end mt-4">
          <Button 
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-500 to-blue-600 text-white font-semibold rounded-lg hover:from-indigo-600 hover:to-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Policy
          </Button>
        </div>
      </div>

      {loading ? (
        <Card className="border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 to-blue-50">
          <CardContent className="py-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-400 to-blue-500 rounded-full mb-4 animate-pulse">
              <svg className="w-8 h-8 text-white animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <p className="text-indigo-700 font-semibold text-lg">Loading policies...</p>
          </CardContent>
        </Card>
      ) : policies.length === 0 ? (
        <Card className="border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 to-blue-50">
          <CardContent className="py-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-400 to-blue-500 rounded-full mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-gray-700 font-medium text-lg mb-2">
              No policies found
            </p>
            <p className="text-gray-500 mb-6">
              Create your first policy to get started.
            </p>
            <Button 
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-500 to-blue-600 text-white font-semibold rounded-lg hover:from-indigo-600 hover:to-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Policy
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 to-blue-50 overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-indigo-500 to-blue-600 text-white">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <CardTitle className="text-white text-xl">Leave Policies Management</CardTitle>
                <CardDescription className="text-indigo-100">
                  {policies.length} polic{policies.length !== 1 ? 'ies' : 'y'} configured
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gradient-to-r from-indigo-100 to-blue-100 border-b-2 border-indigo-300">
                    <th className="text-left py-4 px-6 font-bold text-indigo-900">Leave Type</th>
                    <th className="text-left py-4 px-6 font-bold text-indigo-900">Accrual Method</th>
                    <th className="text-left py-4 px-6 font-bold text-indigo-900">Monthly Rate</th>
                    <th className="text-left py-4 px-6 font-bold text-indigo-900">Yearly Rate</th>
                    <th className="text-left py-4 px-6 font-bold text-indigo-900">Max Carry Forward</th>
                    <th className="text-left py-4 px-6 font-bold text-indigo-900">Min Notice Days</th>
                    <th className="text-left py-4 px-6 font-bold text-indigo-900">Eligibility Rules</th>
                    <th className="text-right py-4 px-6 font-bold text-indigo-900">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {policies.map((policy, index) => {
                    const isEven = index % 2 === 0;
                    const leaveTypeName = leaveTypes.find((t) => t._id === policy.leaveTypeId.toString())?.name || policy.leaveTypeId;
                    return (
                      <tr 
                        key={policy._id} 
                        className={`border-b border-indigo-100 transition-all duration-200 ${
                          isEven 
                            ? 'bg-white hover:bg-gradient-to-r hover:from-indigo-50 hover:to-blue-50' 
                            : 'bg-gradient-to-r from-indigo-50/50 to-blue-50/50 hover:bg-gradient-to-r hover:from-indigo-100 hover:to-blue-100'
                        }`}
                      >
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-gradient-to-br from-indigo-400 to-blue-500 rounded-lg">
                              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                            <span className="font-bold text-gray-900 capitalize">{leaveTypeName}</span>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 capitalize">
                            {policy.accrualMethod}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <span className="font-semibold text-gray-900">{policy.monthlyRate}</span>
                        </td>
                        <td className="py-4 px-6">
                          <span className="font-semibold text-gray-900">{policy.yearlyRate}</span>
                        </td>
                        <td className="py-4 px-6">
                          <span className="font-semibold text-gray-900">{policy.maxCarryForward}</span>
                        </td>
                        <td className="py-4 px-6">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-gradient-to-r from-orange-100 to-amber-100 text-orange-800">
                            {policy.minNoticeDays} day{policy.minNoticeDays !== 1 ? 's' : ''}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          {policy.eligibility ? (
                            <div className="text-xs space-y-1.5">
                              {policy.eligibility.minTenureMonths && (
                                <div className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 font-medium">
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  Min Tenure: {policy.eligibility.minTenureMonths} months
                                </div>
                              )}
                              {Array.isArray(policy.eligibility.positionsAllowed) &&
                                policy.eligibility.positionsAllowed.length > 0 && (
                                  <div className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-gradient-to-r from-purple-100 to-pink-100 text-purple-800 font-medium">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                    Positions: {policy.eligibility.positionsAllowed.join(", ")}
                                  </div>
                                )}
                              {Array.isArray(policy.eligibility.contractTypesAllowed) &&
                                policy.eligibility.contractTypesAllowed.length > 0 && (
                                  <div className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-gradient-to-r from-cyan-100 to-blue-100 text-cyan-800 font-medium">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    Contracts: {policy.eligibility.contractTypesAllowed.join(", ")}
                                  </div>
                                )}
                              {!policy.eligibility.minTenureMonths &&
                                (!Array.isArray(policy.eligibility.positionsAllowed) ||
                                  policy.eligibility.positionsAllowed.length === 0) &&
                                (!Array.isArray(policy.eligibility.contractTypesAllowed) ||
                                  policy.eligibility.contractTypesAllowed.length === 0) && (
                                  <span className="inline-flex items-center px-2 py-1 rounded-md bg-gray-100 text-gray-500 italic text-xs">
                                    No restrictions
                                  </span>
                                )}
                            </div>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 rounded-md bg-gray-100 text-gray-500 italic text-xs">
                              No restrictions
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenEdit(policy)}
                              className="border-indigo-300 text-indigo-700 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-blue-50 hover:border-indigo-400 transition-all duration-200"
                            >
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenDelete(policy)}
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

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingPolicy ? "Edit Leave Policy" : "Create Leave Policy"}
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              {editingPolicy ? "Update" : "Create"}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            label="Leave Type *"
            value={formData.leaveTypeId}
            onChange={(e) =>
              setFormData({ ...formData, leaveTypeId: e.target.value })
            }
            error={errors.leaveTypeId}
            options={
              leaveTypes.length > 0
                ? leaveTypes.map((t) => ({ value: t._id, label: t.name }))
                : [{ value: "", label: "No leave types available" }]
            }
            placeholder="Select a leave type"
          />

          <Select
            label="Accrual Method *"
            value={formData.accrualMethod}
            onChange={(e) =>
              setFormData({
                ...formData,
                accrualMethod: e.target.value as any,
              })
            }
            options={accrualMethodOptions}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Monthly Rate *"
              type="number"
              step="0.01"
              value={formData.monthlyRate}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  monthlyRate: parseFloat(e.target.value) || 0,
                })
              }
              error={errors.monthlyRate}
            />
            <Input
              label="Yearly Rate *"
              type="number"
              step="0.01"
              value={formData.yearlyRate}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  yearlyRate: parseFloat(e.target.value) || 0,
                })
              }
              error={errors.yearlyRate}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Rounding Rule"
              value={formData.roundingRule}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  roundingRule: e.target.value as any,
                })
              }
              options={roundingRuleOptions}
            />
            <Input
              label="Max Carry Forward"
              type="number"
              value={formData.maxCarryForward}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  maxCarryForward: parseInt(e.target.value) || 0,
                })
              }
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Min Notice Days *"
              type="number"
              value={formData.minNoticeDays}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  minNoticeDays: parseInt(e.target.value) || 0,
                })
              }
              error={errors.minNoticeDays}
            />
            <Input
              label="Max Consecutive Days (Optional)"
              type="number"
              value={formData.maxConsecutiveDays || ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  maxConsecutiveDays: e.target.value
                    ? parseInt(e.target.value)
                    : undefined,
                })
              }
            />
          </div>

          {/* Eligibility Rules Section */}
          <div className="border-t pt-4 mt-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Eligibility Rules (REQ-007, BR 7)
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Configure who is eligible for this leave type based on tenure, position, or contract type.
            </p>

            <div className="space-y-4">
              <div>
                <Input
                  label="Minimum Tenure (Months)"
                  type="number"
                  placeholder="e.g., 6 (for 6 months minimum)"
                  value={eligibilityData.minTenureMonths}
                  onChange={(e) =>
                    setEligibilityData({
                      ...eligibilityData,
                      minTenureMonths: e.target.value,
                    })
                  }
                />
                <p className="text-xs text-gray-500 mt-1">
                  Employees must have worked for at least this many months to be eligible
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Allowed Positions
                </label>
                {loadingPositions ? (
                  <p className="text-sm text-gray-500">Loading positions...</p>
                ) : positions.length === 0 ? (
                  <p className="text-sm text-gray-500">No positions available</p>
                ) : (
                  <div className="max-h-64 overflow-y-auto border border-gray-300 rounded-md p-3 space-y-2">
                    {positions.map((position) => (
                      <label key={position._id} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={eligibilityData.positionsAllowed.includes(position.code)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setEligibilityData({
                                ...eligibilityData,
                                positionsAllowed: [
                                  ...eligibilityData.positionsAllowed,
                                  position.code,
                                ],
                              });
                            } else {
                    setEligibilityData({
                      ...eligibilityData,
                                positionsAllowed: eligibilityData.positionsAllowed.filter(
                                  (code) => code !== position.code
                                ),
                              });
                  }
                          }}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-700">
                          {position.code} - {position.title}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Select positions that are eligible for this leave type. Leave empty to allow all positions.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Allowed Contract Types
                </label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={eligibilityData.contractTypesAllowed.includes("FULL_TIME_CONTRACT")}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setEligibilityData({
                            ...eligibilityData,
                            contractTypesAllowed: [
                              ...eligibilityData.contractTypesAllowed,
                              "FULL_TIME_CONTRACT",
                            ],
                          });
                        } else {
                          setEligibilityData({
                            ...eligibilityData,
                            contractTypesAllowed: eligibilityData.contractTypesAllowed.filter(
                              (ct) => ct !== "FULL_TIME_CONTRACT"
                            ),
                          });
                        }
                      }}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Full Time Contract</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={eligibilityData.contractTypesAllowed.includes("PART_TIME_CONTRACT")}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setEligibilityData({
                            ...eligibilityData,
                            contractTypesAllowed: [
                              ...eligibilityData.contractTypesAllowed,
                              "PART_TIME_CONTRACT",
                            ],
                          });
                        } else {
                          setEligibilityData({
                            ...eligibilityData,
                            contractTypesAllowed: eligibilityData.contractTypesAllowed.filter(
                              (ct) => ct !== "PART_TIME_CONTRACT"
                            ),
                          });
                        }
                      }}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Part Time Contract</span>
                  </label>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Select contract types allowed. Leave empty to allow all contract types.
                </p>
              </div>
            </div>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Leave Policy"
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
          Are you sure you want to delete this leave policy? This action cannot
          be undone.
        </p>
      </Modal>
    </div>
  );
}