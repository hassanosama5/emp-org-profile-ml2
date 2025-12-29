// components/employee-profile/EducationSection.tsx - UPDATED FOR HR VIEW
"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/hooks/use-auth";
import { Button } from "@/components/shared/ui/Button";
import { Input } from "@/components/shared/ui/Input";
import { Toast, useToast } from "@/components/leaves/Toast";
import { employeeProfileApi } from "@/lib/api/employee-profile/employee-profile";
import type { EmployeeQualification } from "@/types";
import { Plus, Edit, Trash2, GraduationCap, User } from "lucide-react";

interface EducationSectionProps {
  employeeId?: string; // Optional: if viewing someone else's profile
  isHR?: boolean; // HR Admin can view others' qualifications
}

export default function EducationSection({
  employeeId,
  isHR = false,
}: EducationSectionProps) {
  const { user } = useAuth();
  const { toast, showToast, hideToast } = useToast();
  const [qualifications, setQualifications] = useState<EmployeeQualification[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    establishmentName: "",
    graduationType: "",
  });
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    loadQualifications();
  }, [employeeId]);

  const loadQualifications = async () => {
    try {
      setLoading(true);
      let data: EmployeeQualification[] = [];

      if (employeeId && isHR) {
        // HR viewing employee's qualifications
        console.log(`🔍 HR viewing employee ${employeeId} qualifications`);
        data = await employeeProfileApi.getEmployeeQualifications(employeeId);
      } else {
        // Employee viewing own qualifications
        data = await employeeProfileApi.getMyQualifications();
      }

      console.log("📊 Qualifications loaded:", data);
      setQualifications(data || []);
    } catch (error: any) {
      console.error("❌ Error loading qualifications:", error);
      showToast(error.message || "Failed to load education", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.establishmentName.trim() || !formData.graduationType) {
      showToast("Please fill all required fields", "error");
      return;
    }

    try {
      if (editingId) {
        // Update existing
        await employeeProfileApi.updateMyQualification(editingId, formData);
        showToast("Qualification updated successfully", "success");
      } else {
        // Add new (only for own profile)
        await employeeProfileApi.addMyQualification(formData);
        showToast("Qualification added successfully", "success");
      }

      resetForm();
      loadQualifications();
    } catch (error: any) {
      showToast(error.message || "Failed to save qualification", "error");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this qualification?")) return;

    try {
      await employeeProfileApi.deleteMyQualification(id);
      showToast("Qualification deleted successfully", "success");
      loadQualifications();
    } catch (error: any) {
      showToast(error.message || "Failed to delete qualification", "error");
    }
  };

  const resetForm = () => {
    setFormData({ establishmentName: "", graduationType: "" });
    setEditingId(null);
    setShowForm(false);
  };

  const startEdit = (qual: EmployeeQualification) => {
    setFormData({
      establishmentName: qual.establishmentName,
      graduationType: qual.graduationType,
    });
    setEditingId(qual.id || qual._id || "");
    setShowForm(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // HR viewing mode - read only
  if (isHR) {
    return (
      <div className="space-y-4">
        <Toast {...toast} onClose={hideToast} />

        {/* Header for HR View */}
        <div className="flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">
            Education & Qualifications
          </h3>
          <span className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
            HR View
          </span>
        </div>

        {/* Qualifications List - Read Only for HR */}
        {qualifications.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
            <GraduationCap className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">No qualifications recorded</p>
            <p className="text-sm text-gray-400 mt-1">
              Employee has not added any qualifications
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {qualifications.map((qual, index) => (
              <div
                key={qual.id || qual._id || `qual-${index}`}
                className="p-4 border border-gray-200 rounded-lg bg-gray-50"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">
                      {qual.establishmentName}
                    </h4>
                    <p className="text-sm text-gray-600 mt-1">
                      {typeof qual.graduationType === "string"
                        ? qual.graduationType.replace("_", " ").toLowerCase()
                        : qual.graduationType}
                    </p>
                    {qual.createdAt && (
                      <p className="text-xs text-gray-400 mt-2">
                        Added: {new Date(qual.createdAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <div className="text-xs text-gray-500">
                    ID: {(qual.id || qual._id || "").substring(0, 8)}...
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* HR Note */}
        <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg">
          <p className="text-sm text-blue-700">
            <strong>HR View:</strong> You can view but not edit employee's
            qualifications. Employees manage their own education records.
          </p>
        </div>
      </div>
    );
  }

  // Regular Employee View (with edit capabilities)
  return (
    <div className="space-y-4">
      <Toast {...toast} onClose={hideToast} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">
            Education & Qualifications
          </h3>
        </div>
        <Button
          size="sm"
          onClick={() => setShowForm(!showForm)}
          variant={showForm ? "outline" : "primary"}
        >
          <Plus className="h-4 w-4 mr-1" />
          {showForm ? "Cancel" : "Add Qualification"}
        </Button>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="bg-gray-50 p-4 rounded-lg border">
          <form onSubmit={handleSubmit} className="space-y-3">
            <Input
              label="Institution Name"
              placeholder="University/College/School"
              value={formData.establishmentName}
              onChange={(e) =>
                setFormData({ ...formData, establishmentName: e.target.value })
              }
              required
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Degree/Qualification
              </label>
              <select
                value={formData.graduationType}
                onChange={(e) =>
                  setFormData({ ...formData, graduationType: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select Degree</option>
                <option value="UNDERGRADE">Undergraduate</option>
                <option value="BACHELOR">Bachelor's Degree</option>
                <option value="MASTER">Master's Degree</option>
                <option value="PHD">Doctorate (PhD)</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div className="flex gap-2">
              <Button type="submit">
                {editingId ? "Update" : "Add"} Qualification
              </Button>
              <Button type="button" variant="outline" onClick={resetForm}>
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Qualifications List */}
      {qualifications.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
          <GraduationCap className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500">No qualifications added yet</p>
          <Button
            variant="outline"
            className="mt-3"
            onClick={() => setShowForm(true)}
          >
            Add your first qualification
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {qualifications.map((qual, index) => (
            <div
              key={qual.id || qual._id || `qual-${index}`}
              className="flex items-start justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              <div>
                <h4 className="font-medium text-gray-900">
                  {qual.establishmentName}
                </h4>
                <p className="text-sm text-gray-600 mt-1">
                  {typeof qual.graduationType === "string"
                    ? qual.graduationType.replace("_", " ").toLowerCase()
                    : qual.graduationType}
                </p>
                {qual.createdAt && (
                  <p className="text-xs text-gray-400 mt-2">
                    Added: {new Date(qual.createdAt).toLocaleDateString()}
                  </p>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => startEdit(qual)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDelete(qual.id || qual._id || "")}
                  className="text-red-600 hover:text-red-800"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
