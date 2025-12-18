"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { SystemRole } from "@/types";
import { Card } from "@/components/shared/ui/Card";
import { useOrganizationStructure } from "@/lib/hooks/use-organization-structure";
import { DepartmentForm } from "@/components/organization-structure/DepartmentForm";
import { Button } from "@/components/shared/ui/Button";
import { useAuth } from "@/lib/hooks/use-auth";

export default function EditDepartmentPage() {
  const router = useRouter();
  const params = useParams();
  const departmentId = params.departmentId as string;
  const { user } = useAuth();

  const {
    getDepartmentById,
    updateDepartment,
    loading,
    error,
    clearError,
  } = useOrganizationStructure();

  const [initialData, setInitialData] = useState<any>(null);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Only System Admin can edit codes
  const canEditCode = useMemo(() => {
    const roles = user?.roles || [];
    return roles.some((r: string) => 
      String(r).toLowerCase() === SystemRole.SYSTEM_ADMIN.toLowerCase()
    );
  }, [user?.roles]);

  useEffect(() => {
    const fetchDepartment = async () => {
      try {
        setFetchLoading(true);
        const data = await getDepartmentById(departmentId);
        setInitialData(data);
        setFetchError(null);
      } catch (err: any) {
        console.error("Failed to fetch department for editing:", err);
        setFetchError(err.message || "Failed to load department data.");
      } finally {
        setFetchLoading(false);
      }
    };

    if (departmentId) {
      fetchDepartment();
    }
  }, [departmentId, getDepartmentById]);

  const handleSubmit = async (formData: { code: string; name: string; description: string; headPositionId?: string }) => {
    clearError();
    try {
      const updateData: any = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        headPositionId: formData.headPositionId?.trim() || undefined,
      };
      
      // Only System Admin can update code
      if (canEditCode && formData.code.trim()) {
        updateData.code = formData.code.toUpperCase().trim();
      }
      
      await updateDepartment(departmentId, updateData);
      router.push("/dashboard/organization-structure/departments");
    } catch (err) {
      console.error("Department update failed:", err);
    }
  };

  const handleCancel = () => {
    router.push("/dashboard/organization-structure/departments");
  };

  if (fetchLoading) {
    return (
      <ProtectedRoute allowedRoles={[SystemRole.SYSTEM_ADMIN, SystemRole.HR_ADMIN]}>
        <div className="container mx-auto px-4 py-8 max-w-3xl text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4 mx-auto"></div>
          <p className="text-gray-600">Loading department details...</p>
        </div>
      </ProtectedRoute>
    );
  }

  if (fetchError) {
    return (
      <ProtectedRoute allowedRoles={[SystemRole.SYSTEM_ADMIN, SystemRole.HR_ADMIN]}>
        <div className="container mx-auto px-4 py-8 max-w-3xl">
          <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
            <p className="font-medium mb-2">Error loading department:</p>
            <p>{fetchError}</p>
            <Button onClick={handleCancel} className="mt-4">Go Back</Button>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (!initialData) {
    return (
      <ProtectedRoute allowedRoles={[SystemRole.SYSTEM_ADMIN, SystemRole.HR_ADMIN]}>
        <div className="container mx-auto px-4 py-8 max-w-3xl">
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md text-yellow-700">
            <p className="font-medium mb-2">Department not found.</p>
            <p>The department you are trying to edit does not exist or you do not have permission to view it.</p>
            <Button onClick={handleCancel} className="mt-4">Go Back</Button>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={[SystemRole.SYSTEM_ADMIN, SystemRole.HR_ADMIN]}>
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        {/* Header with breadcrumb */}
        <div className="mb-8">
          <nav className="flex items-center text-sm text-gray-600 mb-4">
            <Link href="/dashboard" className="hover:text-blue-600">
              Dashboard
            </Link>
            <span className="mx-2">/</span>
            <Link href="/dashboard/organization-structure" className="hover:text-blue-600">
              Organization Structure
            </Link>
            <span className="mx-2">/</span>
            <Link href="/dashboard/organization-structure/departments" className="hover:text-blue-600">
              Departments
            </Link>
            <span className="mx-2">/</span>
            <span className="text-gray-900 font-medium">Edit Department</span>
          </nav>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Edit Department</h1>
              <p className="text-gray-600 mt-1">
                Update the details for department: {initialData?.name}
              </p>
            </div>
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={loading}
            >
              Cancel
            </Button>
          </div>
        </div>

        {/* Main Form Card */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Card>
              <DepartmentForm
                initialData={initialData}
                onSubmit={handleSubmit}
                loading={loading}
                error={error || fetchError}
                isEditMode={true}
                onCancel={handleCancel}
              />
            </Card>
          </div>

          {/* Guidelines Sidebar */}
          <div className="lg:col-span-1">
            <Card>
              {/* Content from new/page.tsx guidelines sidebar can be placed here */}
              {/* For now, a simplified version or a placeholder can be used */}
              <p className="p-6 text-sm text-gray-600">
                Guidelines for editing departments can be added here.
              </p>
            </Card>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
