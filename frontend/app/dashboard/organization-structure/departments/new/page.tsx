"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { SystemRole } from "@/types";
import { Button } from "@/components/shared/ui/Button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/shared/ui/Card";
import { useOrganizationStructure } from "@/lib/hooks/use-organization-structure";
import { DepartmentForm } from "@/components/organization-structure/DepartmentForm";

function CreateDepartmentForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { createDepartment, loading, error, clearError } = useOrganizationStructure();
  
  // Get pre-filled data from approved change request
  const fromRequest = searchParams?.get("fromRequest");
  const prefillCode = searchParams?.get("code");
  const prefillName = searchParams?.get("name");
  const prefillDescription = searchParams?.get("description");

  const handleSubmit = async (formData: { code: string; name: string; description: string; headPositionId?: string }) => {
    clearError();
    try {
      await createDepartment({
        code: formData.code.toUpperCase().trim(),
        name: formData.name.trim(),
        description: formData.description.trim(),
        headPositionId: formData.headPositionId?.trim() || undefined,
      });
      
      // If this was from an approved change request, mark it as IMPLEMENTED
      if (fromRequest) {
        try {
          const { markRequestAsImplemented } = await import("@/lib/hooks/use-organization-structure").then(m => m.useOrganizationStructure());
          await markRequestAsImplemented(fromRequest);
        } catch (markError) {
          console.error("Failed to mark request as implemented:", markError);
          // Don't fail the whole operation if marking fails
        }
      }
      
      router.push("/dashboard/organization-structure/departments");
    } catch (err) {
      console.error("Department creation failed:", err);
    }
  };

  const handleCancel = () => {
    router.push("/dashboard/organization-structure/departments");
  };

  return (
    <ProtectedRoute allowedRoles={[SystemRole.SYSTEM_ADMIN, SystemRole.HR_ADMIN]}>
      <div className="container mx-auto px-4 py-8 max-w-3xl">
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
            <span className="text-gray-900 font-medium">Create New</span>
          </nav>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Create New Department</h1>
              <p className="text-gray-600 mt-1">
                Define a new department for your organization
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Card>
              {fromRequest && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-md mb-4">
                  <p className="text-sm text-blue-800">
                    <strong>Pre-filled from approved change request:</strong> Review and finalize the department details below.
                  </p>
                </div>
              )}
              <DepartmentForm
                onSubmit={handleSubmit}
                loading={loading}
                error={error}
                onCancel={handleCancel}
                prefillData={fromRequest ? {
                  code: prefillCode || undefined,
                  name: prefillName || undefined,
                  description: prefillDescription || undefined,
                } : undefined}
              />
            </Card>
          </div>

          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Guidelines</CardTitle>
                <CardDescription>
                  Best practices for creating departments
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                      <span className="text-blue-600 text-sm">1</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Unique Codes</p>
                      <p className="text-sm text-gray-600">
                        Department codes must be unique across the organization.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                      <span className="text-blue-600 text-sm">2</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Clear Names</p>
                      <p className="text-sm text-gray-600">
                        Use descriptive names that clearly identify the department's function.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                      <span className="text-blue-600 text-sm">3</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Head Position</p>
                      <p className="text-sm text-gray-600">
                        The head position can be assigned after creating the department.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                      <span className="text-blue-600 text-sm">4</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Data Integrity</p>
                      <p className="text-sm text-gray-600">
                        Departments can be deactivated but not deleted (BR 12, BR 37).
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-gray-50 rounded-md border border-gray-200">
                  <p className="font-medium text-gray-900 mb-2">API Requirements</p>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• REQ-OSM-01: System Admin can define departments</li>
                    <li>• BR 5: Unique ID for entities</li>
                    <li>• BR 30: Creation requires cost center validation</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}

export default function CreateDepartmentPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <CreateDepartmentForm />
    </Suspense>
  );
}