"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/hooks/use-auth";
import { useRequireAuth } from "@/lib/hooks/use-auth";
import { SystemRole } from "@/types";
import { leavesApi } from "@/lib/api/leaves/leaves";
import { LeaveType, CreateLeaveTypeDto, UpdateLeaveTypeDto } from "@/types/leaves";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/shared/ui/Card";
import { Button } from "@/components/shared/ui/Button";
import { Input } from "@/components/shared/ui/Input";
import { Select } from "@/components/leaves/Select";
import { Textarea } from "@/components/leaves/Textarea";
import { Modal } from "@/components/leaves/Modal";
import { Toast, useToast } from "@/components/leaves/Toast";
import { LeaveCategory } from "@/types/leaves";

export default function LeaveTypesPage() {
  const { user } = useAuth();
  useRequireAuth(SystemRole.HR_ADMIN);
  const { toast, showToast, hideToast } = useToast();

  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [categories, setCategories] = useState<LeaveCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingType, setEditingType] = useState<LeaveType | null>(null);
  const [deletingType, setDeletingType] = useState<LeaveType | null>(null);
  const [formData, setFormData] = useState<CreateLeaveTypeDto>({
    code: "",
    name: "",
    categoryId: "",
    description: "",
    paid: true,
    deductible: true,
    requiresAttachment: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      // Load categories - try to load even if types endpoint isn't ready
      try {
        const cats = await leavesApi.getLeaveCategories();
        setCategories(cats);
      } catch (catError: any) {
        // If categories endpoint doesn't exist yet, show empty
        console.warn("Categories endpoint not available:", catError);
        setCategories([]);
      }
      
      // Load leave types
      try {
        const types = await leavesApi.getLeaveTypes();
        setLeaveTypes(types);
      } catch (typeError: any) {
        // If types endpoint doesn't exist yet, show empty
        console.warn("Leave types endpoint not available:", typeError);
        setLeaveTypes([]);
      }
    } catch (error: any) {
      showToast(error.message || "Failed to load leave types", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingType(null);
    setFormData({
      code: "",
      name: "",
      categoryId: "",
      description: "",
      paid: true,
      deductible: true,
      requiresAttachment: false,
    });
    setErrors({});
    setIsModalOpen(true);
  };

  const handleOpenEdit = (type: LeaveType) => {
    setEditingType(type);
    setFormData({
      code: type.code,
      name: type.name,
      categoryId: type.categoryId,
      description: type.description || "",
      paid: type.paid,
      deductible: type.deductible,
      requiresAttachment: type.requiresAttachment,
      attachmentType: type.attachmentType,
    });
    setErrors({});
    setIsModalOpen(true);
  };

  const handleOpenDelete = (type: LeaveType) => {
    setDeletingType(type);
    setIsDeleteModalOpen(true);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.code.trim()) newErrors.code = "Code is required";
    if (!formData.name.trim()) newErrors.name = "Name is required";
    if (!formData.categoryId) newErrors.categoryId = "Category is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      if (editingType) {
        await leavesApi.updateLeaveType(editingType._id, formData);
        showToast("Leave type updated successfully", "success");
      } else {
        await leavesApi.createLeaveType(formData);
        showToast("Leave type created successfully", "success");
      }
      setIsModalOpen(false);
      loadData();
    } catch (error: any) {
      showToast(error.message || "Failed to save leave type", "error");
    }
  };

  const handleDelete = async () => {
    if (!deletingType) return;
    try {
      await leavesApi.deleteLeaveType(deletingType._id);
      showToast("Leave type deleted successfully", "success");
      setIsDeleteModalOpen(false);
      setDeletingType(null);
      loadData();
    } catch (error: any) {
      showToast(error.message || "Failed to delete leave type", "error");
    }
  };

  const attachmentTypeOptions = [
    { value: "medical", label: "Medical" },
    { value: "document", label: "Document" },
    { value: "other", label: "Other" },
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
          <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Leave Types</h1>
            <p className="text-gray-600 mt-1">
              Manage leave types (Annual, Sick, etc.)
            </p>
          </div>
        </div>
        <div className="flex justify-end mt-4">
          <Button 
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Leave Type
          </Button>
        </div>
      </div>

      {loading ? (
        <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
          <CardContent className="py-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full mb-4 animate-pulse">
              <svg className="w-8 h-8 text-white animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <p className="text-blue-700 font-semibold text-lg">Loading leave types...</p>
          </CardContent>
        </Card>
      ) : leaveTypes.length === 0 ? (
        <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
          <CardContent className="py-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
            </div>
            <p className="text-gray-700 font-medium text-lg mb-2">
              No leave types found
            </p>
            <p className="text-gray-500 mb-6">
              Create your first leave type to get started.
            </p>
            <Button 
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Leave Type
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <CardTitle className="text-white text-xl">Leave Types Management</CardTitle>
                <CardDescription className="text-blue-100">
                  {leaveTypes.length} leave type{leaveTypes.length !== 1 ? 's' : ''} configured
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gradient-to-r from-blue-100 to-indigo-100 border-b-2 border-blue-300">
                    <th className="text-left py-4 px-6 font-bold text-blue-900">Code</th>
                    <th className="text-left py-4 px-6 font-bold text-blue-900">Name</th>
                    <th className="text-left py-4 px-6 font-bold text-blue-900">Category</th>
                    <th className="text-left py-4 px-6 font-bold text-blue-900">Paid</th>
                    <th className="text-left py-4 px-6 font-bold text-blue-900">Requires Attachment</th>
                    <th className="text-right py-4 px-6 font-bold text-blue-900">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {leaveTypes.map((type, index) => {
                    const isEven = index % 2 === 0;
                    return (
                      <tr 
                        key={type._id} 
                        className={`border-b border-blue-100 transition-all duration-200 ${
                          isEven 
                            ? 'bg-white hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50' 
                            : 'bg-gradient-to-r from-blue-50/50 to-indigo-50/50 hover:bg-gradient-to-r hover:from-blue-100 hover:to-indigo-100'
                        }`}
                      >
                        <td className="py-4 px-6">
                          <span className="px-3 py-1 bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 font-mono text-sm rounded-md font-semibold">
                            {type.code}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <span className="font-semibold text-gray-900">{type.name}</span>
                        </td>
                        <td className="py-4 px-6">
                          <span className="px-3 py-1 bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 font-medium rounded-full text-sm">
                            {categories.find((c) => c._id === type.categoryId)?.name || "N/A"}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          {type.paid ? (
                            <span className="inline-flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 font-semibold rounded-full text-sm">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              Yes
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-gray-100 to-gray-200 text-gray-500 font-semibold rounded-full text-sm">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                              No
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-6">
                          {type.requiresAttachment ? (
                            <span className="inline-flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-700 font-semibold rounded-full text-sm">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              Yes
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-gray-100 to-gray-200 text-gray-500 font-semibold rounded-full text-sm">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                              No
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenEdit(type)}
                              className="border-blue-300 text-blue-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 hover:border-blue-400 transition-all duration-200"
                            >
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenDelete(type)}
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
        title={editingType ? "Edit Leave Type" : "Create Leave Type"}
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              {editingType ? "Update" : "Create"}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Code *"
              value={formData.code}
              onChange={(e) =>
                setFormData({ ...formData, code: e.target.value })
              }
              error={errors.code}
              placeholder="e.g., ANNUAL_LEAVE"
            />
            <Input
              label="Name *"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              error={errors.name}
              placeholder="e.g., Annual Leave"
            />
          </div>

          <Select
            label="Category *"
            value={formData.categoryId}
            onChange={(e) =>
              setFormData({ ...formData, categoryId: e.target.value })
            }
            error={errors.categoryId}
            options={
              categories.length > 0
                ? categories.map((cat) => ({
                    value: cat._id,
                    label: cat.name,
                  }))
                : [{ value: "", label: "No categories available - Create one first" }]
            }
            placeholder="Select a category"
            disabled={categories.length === 0}
          />

          <Textarea
            label="Description"
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            rows={3}
            placeholder="Optional description"
          />

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="paid"
                checked={formData.paid}
                onChange={(e) =>
                  setFormData({ ...formData, paid: e.target.checked })
                }
                className="rounded border-gray-300"
              />
              <label htmlFor="paid" className="text-sm text-gray-700">
                Paid Leave
              </label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="deductible"
                checked={formData.deductible}
                onChange={(e) =>
                  setFormData({ ...formData, deductible: e.target.checked })
                }
                className="rounded border-gray-300"
              />
              <label htmlFor="deductible" className="text-sm text-gray-700">
                Deductible from Balance
              </label>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="requiresAttachment"
              checked={formData.requiresAttachment}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  requiresAttachment: e.target.checked,
                })
              }
              className="rounded border-gray-300"
            />
            <label
              htmlFor="requiresAttachment"
              className="text-sm text-gray-700"
            >
              Requires Attachment
            </label>
          </div>

          {formData.requiresAttachment && (
            <Select
              label="Attachment Type"
              value={formData.attachmentType || ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  attachmentType: e.target.value as any,
                })
              }
              options={attachmentTypeOptions}
              placeholder="Select attachment type"
            />
          )}
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Leave Type"
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
          Are you sure you want to delete the leave type{" "}
          <strong>{deletingType?.name}</strong>? This action cannot be undone.
        </p>
      </Modal>
    </div>
  );
}

