"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/hooks/use-auth";
import { useRequireAuth } from "@/lib/hooks/use-auth";
import { SystemRole } from "@/types";
import { leavesApi } from "@/lib/api/leaves/leaves";
import { LeaveCategory, CreateLeaveCategoryDto } from "@/types/leaves";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/shared/ui/Card";
import { Button } from "@/components/shared/ui/Button";
import { Input } from "@/components/shared/ui/Input";
import { Textarea } from "@/components/leaves/Textarea";
import { Modal } from "@/components/leaves/Modal";
import { Toast, useToast } from "@/components/leaves/Toast";

export default function LeaveCategoriesPage() {
  const { user } = useAuth();
  useRequireAuth(SystemRole.HR_ADMIN);
  const { toast, showToast, hideToast } = useToast();

  const [categories, setCategories] = useState<LeaveCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<LeaveCategory | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<LeaveCategory | null>(null);
  const [formData, setFormData] = useState<CreateLeaveCategoryDto>({
    name: "",
    description: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      // ENHANCED: Load leave categories from backend
      const data = await leavesApi.getLeaveCategories();
      setCategories(data);
    } catch (error: any) {
      // If endpoint doesn't exist or fails, show empty array
      console.warn("Failed to load leave categories:", error);
      setCategories([]);
      // Only show error toast if it's not a 404/not found error
      if (!error.message?.includes("not available") && !error.message?.includes("404") && !error.message?.includes("not found")) {
        showToast(error.message || "Failed to load leave categories", "error");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingCategory(null);
    setFormData({ name: "", description: "" });
    setErrors({});
    setIsModalOpen(true);
  };

  const handleOpenEdit = (category: LeaveCategory) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || "",
    });
    setErrors({});
    setIsModalOpen(true);
  };

  const handleOpenDelete = (category: LeaveCategory) => {
    setDeletingCategory(category);
    setIsDeleteModalOpen(true);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = "Name is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      if (editingCategory) {
        // TODO: Implement update when backend endpoint is ready
        showToast("Update functionality will be available soon", "info");
      } else {
        await leavesApi.createLeaveCategory(formData);
        showToast("Leave category created successfully", "success");
        setIsModalOpen(false);
        loadData();
      }
    } catch (error: any) {
      // Handle duplicate key error
      if (error.message?.includes("duplicate key") || error.message?.includes("E11000")) {
        showToast(`A category with the name "${formData.name}" already exists. Please use a different name.`, "error");
      } else {
        showToast(error.message || "Failed to save leave category", "error");
      }
    }
  };

  const handleDelete = async () => {
    if (!deletingCategory) return;
    try {
      await leavesApi.deleteLeaveCategory(deletingCategory._id);
      showToast("Leave category deleted successfully", "success");
      setIsDeleteModalOpen(false);
      setDeletingCategory(null);
      loadData();
    } catch (error: any) {
      showToast(error.message || "Failed to delete leave category", "error");
    }
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
          <h1 className="text-3xl font-bold text-gray-900">Leave Categories</h1>
          <p className="text-gray-600 mt-1">
            Organize leave types into categories
          </p>
        </div>
        <Button onClick={handleOpenCreate}>Create Category</Button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Loading...</p>
        </div>
      ) : categories.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500 mb-4">
              No categories found. Create your first category to get started.
            </p>
            <Button onClick={handleOpenCreate}>Create Category</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Name</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Description</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => (
                <tr key={category._id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 font-medium">{category.name}</td>
                  <td className="py-3 px-4 text-gray-600">
                    {category.description || "—"}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenEdit(category)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenDelete(category)}
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
        title={editingCategory ? "Edit Leave Category" : "Create Leave Category"}
        footer={
          <>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="category-form">
              {editingCategory ? "Update" : "Create"}
            </Button>
          </>
        }
      >
        <form id="category-form" onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Name *"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            error={errors.name}
            placeholder="e.g., Paid Leave"
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
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Leave Category"
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
          Are you sure you want to delete the category{" "}
          <strong>{deletingCategory?.name}</strong>? This action cannot be
          undone.
        </p>
      </Modal>
    </div>
  );
}

