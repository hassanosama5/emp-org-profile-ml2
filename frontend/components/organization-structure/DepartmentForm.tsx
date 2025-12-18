"use client";

import { useState, useEffect, useMemo } from "react";
import { Input } from "@/components/shared/ui/Input";
import { Textarea } from "@/components/leaves/Textarea";
import { Button } from "@/components/shared/ui/Button";
import { CardContent, CardHeader, CardTitle, CardDescription } from "@/components/shared/ui/Card";
import { DepartmentResponseDto } from "@/types/organization-structure";
import { useAuth } from "@/lib/hooks/use-auth";
import { SystemRole } from "@/types";

interface DepartmentFormProps {
  initialData?: DepartmentResponseDto;
  onSubmit: (data: { code: string; name: string; description: string; headPositionId?: string }) => void;
  loading: boolean;
  error?: string | null;
  isEditMode?: boolean;
  onCancel: () => void;
}

export function DepartmentForm({
  initialData,
  onSubmit,
  loading,
  error,
  isEditMode = false,
  onCancel,
}: DepartmentFormProps) {
  const { user } = useAuth();
  
  // Only System Admin can edit codes
  const canEditCode = useMemo(() => {
    const roles = user?.roles || [];
    return roles.some((r: string) => 
      String(r).toLowerCase() === SystemRole.SYSTEM_ADMIN.toLowerCase()
    );
  }, [user?.roles]);

  const [formData, setFormData] = useState({
    code: "",
    name: "",
    description: "",
    headPositionId: "",
  });

  const [formErrors, setFormErrors] = useState({
    code: "",
    name: "",
    description: "",
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        code: initialData.code || "",
        name: initialData.name || "",
        description: initialData.description || "",
        headPositionId: initialData.headPositionId || "",
      });
    }
  }, [initialData]);

  const validateForm = () => {
    const errors = {
      code: "",
      name: "",
      description: "",
    };
    let isValid = true;

    if (!formData.code.trim()) {
      errors.code = "Department code is required";
      isValid = false;
    } else if (!/^[A-Z0-9-_]+$/.test(formData.code)) {
      errors.code = "Code can only contain uppercase letters, numbers, hyphens, and underscores";
      isValid = false;
    }

    if (!formData.name.trim()) {
      errors.name = "Department name is required";
      isValid = false;
    } else if (formData.name.length < 3) {
      errors.name = "Name must be at least 3 characters";
      isValid = false;
    }

    setFormErrors(errors);
    return isValid;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (formErrors[name as keyof typeof formErrors]) {
      setFormErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit({
        code: formData.code.toUpperCase().trim(),
        name: formData.name.trim(),
        description: formData.description.trim(),
        headPositionId: formData.headPositionId.trim() || undefined,
      });
    }
  };

  return (
    <>
      <CardHeader>
        <CardTitle>{isEditMode ? "Edit Department" : "Department Information"}</CardTitle>
        <CardDescription>
          {isEditMode ? "Update the department details." : "Fill in the details below. Fields marked with * are required."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-700 font-medium">Error: {error}</p>
              <p className="text-red-600 text-sm mt-1">
                Please check your inputs and try again.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="code" className="block text-sm font-medium text-gray-700">
              Department Code * {!canEditCode && isEditMode && <span className="text-xs text-gray-500">(System Admin only)</span>}
            </label>
            <Input
              id="code"
              name="code"
              value={formData.code}
              onChange={handleChange}
              placeholder="e.g., HR, IT, FINANCE"
              className={`w-full ${formErrors.code ? "border-red-300" : ""}`}
              disabled={loading || (isEditMode && !canEditCode)}
              required
              readOnly={isEditMode && !canEditCode}
            />
            {formErrors.code && <p className="text-sm text-red-600">{formErrors.code}</p>}
            <p className="text-xs text-gray-500">
              {isEditMode && !canEditCode 
                ? "Department codes can only be changed by System Admin."
                : "Unique identifier for the department. Use uppercase letters, numbers, hyphens, or underscores."}
            </p>
          </div>

          <div className="space-y-2">
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Department Name *
            </label>
            <Input
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g., Human Resources, Information Technology"
              className={`w-full ${formErrors.name ? "border-red-300" : ""}`}
              disabled={loading}
              required
            />
            {formErrors.name && <p className="text-sm text-red-600">{formErrors.name}</p>}
          </div>

          <div className="space-y-2">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <Textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Describe the department's purpose, responsibilities, and scope..."
              rows={4}
              disabled={loading}
            />
            <p className="text-xs text-gray-500">
              Optional. Provide details about what this department does.
            </p>
          </div>

          <div className="space-y-2">
            <label htmlFor="headPositionId" className="block text-sm font-medium text-gray-700">
              Head Position ID (Optional)
            </label>
            <Input
              id="headPositionId"
              name="headPositionId"
              value={formData.headPositionId}
              onChange={handleChange}
              placeholder="Enter position ID for department head"
              disabled={loading}
            />
            <p className="text-xs text-gray-500">
              The ID of the position that will head this department. Can be assigned later.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
            <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={loading} disabled={loading}>
              {loading ? (isEditMode ? "Updating..." : "Creating...") : (isEditMode ? "Update Department" : "Create Department")}
            </Button>
          </div>
        </form>
      </CardContent>
    </>
  );
}

