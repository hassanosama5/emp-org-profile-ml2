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

      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Leave Categories</h1>
            <p className="text-gray-600 mt-1">
              Organize leave types into categories
            </p>
          </div>
        </div>
        <div className="flex justify-end mt-4">
          <Button 
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-600 text-white font-semibold rounded-lg hover:from-purple-600 hover:to-pink-700 transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Category
          </Button>
        </div>
      </div>

      {loading ? (
        <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
          <CardContent className="py-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full mb-4 animate-pulse">
              <svg className="w-8 h-8 text-white animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <p className="text-purple-700 font-semibold text-lg">Loading categories...</p>
          </CardContent>
        </Card>
      ) : categories.length === 0 ? (
        <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
          <CardContent className="py-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <p className="text-gray-700 font-medium text-lg mb-2">
              No categories found
            </p>
            <p className="text-gray-500 mb-6">
              Create your first category to get started.
            </p>
            <Button 
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-600 text-white font-semibold rounded-lg hover:from-purple-600 hover:to-pink-700 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Category
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50 overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-purple-500 to-pink-600 text-white">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <div>
                <CardTitle className="text-white text-xl">Leave Categories Management</CardTitle>
                <CardDescription className="text-purple-100">
                  {categories.length} categor{categories.length !== 1 ? 'ies' : 'y'} configured
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gradient-to-r from-purple-100 to-pink-100 border-b-2 border-purple-300">
                    <th className="text-left py-4 px-6 font-bold text-purple-900">Name</th>
                    <th className="text-left py-4 px-6 font-bold text-purple-900">Description</th>
                    <th className="text-right py-4 px-6 font-bold text-purple-900">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((category, index) => {
                    const isEven = index % 2 === 0;
                    return (
                      <tr 
                        key={category._id} 
                        className={`border-b border-purple-100 transition-all duration-200 ${
                          isEven 
                            ? 'bg-white hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50' 
                            : 'bg-gradient-to-r from-purple-50/50 to-pink-50/50 hover:bg-gradient-to-r hover:from-purple-100 hover:to-pink-100'
                        }`}
                      >
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-gradient-to-br from-purple-400 to-pink-500 rounded-lg">
                              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                              </svg>
                            </div>
                            <span className="font-bold text-gray-900 capitalize">{category.name}</span>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <span className="text-gray-700">
                            {category.description || (
                              <span className="text-gray-400 italic">—</span>
                            )}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenEdit(category)}
                              className="border-purple-300 text-purple-700 hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 hover:border-purple-400 transition-all duration-200"
                            >
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenDelete(category)}
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

