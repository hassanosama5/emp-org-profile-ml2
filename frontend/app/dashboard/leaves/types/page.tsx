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

      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Leave Types</h1>
          <p className="text-gray-600 mt-1">
            Manage leave types (Annual, Sick, etc.)
          </p>
        </div>
        <Button onClick={handleOpenCreate}>Create Leave Type</Button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Loading...</p>
        </div>
      ) : leaveTypes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500 mb-4">
              No leave types found. Create your first leave type to get started.
            </p>
            <Button onClick={handleOpenCreate}>Create Leave Type</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Code</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Name</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Category</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Paid</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Requires Attachment</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {leaveTypes.map((type) => (
                <tr key={type._id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4">{type.code}</td>
                  <td className="py-3 px-4">{type.name}</td>
                  <td className="py-3 px-4">
                    {categories.find((c) => c._id === type.categoryId)?.name || "N/A"}
                  </td>
                  <td className="py-3 px-4">
                    {type.paid ? (
                      <span className="text-green-600">Yes</span>
                    ) : (
                      <span className="text-gray-400">No</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    {type.requiresAttachment ? (
                      <span className="text-blue-600">Yes</span>
                    ) : (
                      <span className="text-gray-400">No</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenEdit(type)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenDelete(type)}
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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

