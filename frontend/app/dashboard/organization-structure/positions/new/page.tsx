"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { SystemRole } from "@/types";
import { Button } from "@/components/shared/ui/Button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/shared/ui/Card";
import { Input } from "@/components/shared/ui/Input";
import { useOrganizationStructure } from "@/lib/hooks/use-organization-structure";
import {
  CreatePositionDto,
  DepartmentResponseDto,
  PositionResponseDto,
} from "@/types/organization-structure";

function NewPositionForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const clonePositionId = searchParams.get("clone");
  const fromRequest = searchParams.get("fromRequest");
  const prefillCode = searchParams.get("code");
  const prefillTitle = searchParams.get("title");
  const prefillDescription = searchParams.get("description");
  const prefillDepartmentId = searchParams.get("departmentId");
  const prefillReportsTo = searchParams.get("reportsToPositionId");

  const {
    createPosition,
    getPositionById,
    getDepartments,
    getPositions,
    loading,
    error,
    clearError,
  } = useOrganizationStructure();

  const [departments, setDepartments] = useState<DepartmentResponseDto[]>([]);
  const [allPositions, setAllPositions] = useState<PositionResponseDto[]>([]);
  const [clonedPosition, setClonedPosition] =
    useState<PositionResponseDto | null>(null);
  const [formData, setFormData] = useState<CreatePositionDto>({
    code: prefillCode || "",
    title: prefillTitle || "",
    description: prefillDescription || "",
    departmentId: prefillDepartmentId || "",
    reportsToPositionId: prefillReportsTo || "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (clonePositionId && !clonedPosition) {
      loadPositionForCloning();
    }
  }, [clonePositionId]);

  // If pre-filled from approved request, show info banner
  useEffect(() => {
    if (fromRequest && (prefillCode || prefillTitle)) {
      console.log("Position form pre-filled from approved change request:", {
        code: prefillCode,
        title: prefillTitle,
        departmentId: prefillDepartmentId,
      });
    }
  }, [fromRequest, prefillCode, prefillTitle, prefillDepartmentId]);

  const fetchInitialData = async () => {
    try {
      clearError();
      setSuccessMessage("");

      // Fetch departments
      const deptData = await getDepartments({ isActive: true });
      setDepartments(deptData);

      // Fetch all positions for reportsTo dropdown
      const positionsData = await getPositions({ isActive: true });
      setAllPositions(positionsData);
    } catch (err) {
      console.error("Failed to fetch initial data:", err);
    }
  };

  const loadPositionForCloning = async () => {
    try {
      const position = await getPositionById(clonePositionId!);
      setClonedPosition(position);

      // Pre-fill form with cloned position data
      setFormData({
        code: `${position.code}-COPY`,
        title: `${position.title} (Copy)`,
        description: position.description || "",
        departmentId: position.departmentId,
        reportsToPositionId: position.reportsToPositionId || "",
      });
    } catch (err) {
      console.error("Failed to load position for cloning:", err);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.code || !formData.title || !formData.departmentId) {
      return;
    }

    setIsSubmitting(true);
    setSuccessMessage("");
    clearError();

    try {
      await createPosition(formData);

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

      setSuccessMessage("Position created successfully!");
      setTimeout(() => {
        router.push("/dashboard/organization-structure/positions");
      }, 1500);
    } catch (err) {
      console.error("Failed to create position:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push("/dashboard/organization-structure/positions");
  };

  const clearForm = () => {
    setFormData({
      code: "",
      title: "",
      description: "",
      departmentId: "",
      reportsToPositionId: "",
    });
    setClonedPosition(null);
  };

  return (
    <ProtectedRoute
      allowedRoles={[SystemRole.SYSTEM_ADMIN, SystemRole.HR_ADMIN]}
    >
      <div className="container mx-auto px-6 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {clonedPosition ? "Clone Position" : "Create New Position"}
              </h1>
              <p className="text-gray-600 mt-1">
                {clonedPosition
                  ? `Cloning from: ${clonedPosition.title}`
                  : "Define a new position in the organization structure"}
              </p>
            </div>

            <Button onClick={handleCancel} variant="outline">
              ← Cancel
            </Button>
          </div>

          {/* Cloning Notice */}
          {clonedPosition && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-blue-700 font-medium">Cloning Position</p>
                  <p className="text-blue-600 text-sm mt-1">
                    You are cloning "{clonedPosition.title}". Some fields have
                    been pre-filled.
                    <button
                      onClick={clearForm}
                      className="ml-2 text-blue-500 hover:text-blue-700 underline"
                    >
                      Start fresh instead
                    </button>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Success Message */}
          {successMessage && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
              <p className="text-green-700">{successMessage}</p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <div className="flex justify-between items-start">
                <p className="text-red-700">{error}</p>
                <button
                  onClick={clearError}
                  className="text-red-500 hover:text-red-700 text-sm"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}
        </div>

        {fromRequest && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-blue-800">
              <strong>Pre-filled from approved change request:</strong> Review and finalize the position details below.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Form */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Basic Information</CardTitle>
                  <CardDescription>
                    Define the position details and description
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="code"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        Position Code *
                      </label>
                      <Input
                        id="code"
                        name="code"
                        value={formData.code}
                        onChange={handleInputChange}
                        required
                        placeholder="e.g., DEV-001"
                        disabled={isSubmitting}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Unique identifier. Use format like DEPT-001
                      </p>
                    </div>

                    <div>
                      <label
                        htmlFor="title"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        Position Title *
                      </label>
                      <Input
                        id="title"
                        name="title"
                        value={formData.title}
                        onChange={handleInputChange}
                        required
                        placeholder="e.g., Senior Developer"
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="description"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Description
                    </label>
                    <textarea
                      id="description"
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      rows={4}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
                      placeholder="Describe the position responsibilities, requirements, and expectations..."
                      disabled={isSubmitting}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Organization Structure</CardTitle>
                  <CardDescription>
                    Set department and reporting relationships
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label
                      htmlFor="departmentId"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Department *
                    </label>
                    <select
                      id="departmentId"
                      name="departmentId"
                      value={formData.departmentId}
                      onChange={handleInputChange}
                      required
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:border-blue-500 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
                      disabled={isSubmitting || loading}
                    >
                      <option value="">Select a department</option>
                      {departments.map((dept) => (
                        <option key={dept._id} value={dept._id}>
                          {dept.name} ({dept.code})
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      The department this position belongs to
                    </p>
                  </div>

                  <div>
                    <label
                      htmlFor="reportsToPositionId"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Reports To Position
                    </label>
                    <select
                      id="reportsToPositionId"
                      name="reportsToPositionId"
                      value={formData.reportsToPositionId}
                      onChange={handleInputChange}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:border-blue-500 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
                      disabled={isSubmitting || loading}
                    >
                      <option value="">
                        No supervisor (Top-level position)
                      </option>
                      {allPositions.map((pos) => (
                        <option key={pos._id} value={pos._id}>
                          {pos.title} ({pos.code})
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      Leave empty if this is a top-level position or department
                      head
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Actions and Info */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Requirements</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-start gap-2">
                    <div className="flex-shrink-0 mt-0.5">
                      <div className="h-5 w-5 rounded-full bg-blue-100 flex items-center justify-center">
                        <span className="text-xs text-blue-600">1</span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600">
                      Position code must be unique across the organization
                    </p>
                  </div>

                  <div className="flex items-start gap-2">
                    <div className="flex-shrink-0 mt-0.5">
                      <div className="h-5 w-5 rounded-full bg-blue-100 flex items-center justify-center">
                        <span className="text-xs text-blue-600">2</span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600">
                      Department must be active and exist in the system
                    </p>
                  </div>

                  <div className="flex items-start gap-2">
                    <div className="flex-shrink-0 mt-0.5">
                      <div className="h-5 w-5 rounded-full bg-blue-100 flex items-center justify-center">
                        <span className="text-xs text-blue-600">3</span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600">
                      Avoid circular reporting structures
                    </p>
                  </div>

                  <div className="pt-3 border-t border-gray-100">
                    <p className="text-xs text-gray-500">
                      <strong>Note:</strong> All new positions are created as
                      active by default.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Create Position</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <Button
                      type="submit"
                      variant="primary"
                      className="w-full"
                      disabled={isSubmitting || loading}
                      isLoading={isSubmitting}
                    >
                      {isSubmitting ? "Creating..." : "Create Position"}
                    </Button>

                    <Button
                      type="button"
                      onClick={handleCancel}
                      variant="outline"
                      className="w-full"
                      disabled={isSubmitting}
                    >
                      Cancel
                    </Button>

                    <Button
                      type="button"
                      onClick={clearForm}
                      variant="ghost"
                      className="w-full"
                      disabled={isSubmitting}
                    >
                      Clear Form
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Navigation Links */}
              <div className="space-y-3">
                <Link
                  href="/dashboard/organization-structure/positions"
                  className="block text-sm text-blue-600 hover:text-blue-800 hover:underline"
                >
                  ← View All Positions
                </Link>
                <Link
                  href="/dashboard/organization-structure/departments"
                  className="block text-sm text-blue-600 hover:text-blue-800 hover:underline"
                >
                  ← Manage Departments
                </Link>
                {!clonePositionId && (
                  <Link
                    href="/dashboard/organization-structure/positions?showInactive=true"
                    className="block text-sm text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    → View Inactive Positions
                  </Link>
                )}
              </div>
            </div>
          </div>
        </form>
      </div>
    </ProtectedRoute>
  );
}

export default function NewPositionPage() {
  return (
    <Suspense
      fallback={
        <ProtectedRoute
          allowedRoles={[SystemRole.SYSTEM_ADMIN, SystemRole.HR_ADMIN]}
        >
          <div className="container mx-auto px-6 py-8">
            <div className="flex flex-col items-center justify-center py-16">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
              <p className="text-gray-600">Loading...</p>
            </div>
          </div>
        </ProtectedRoute>
      }
    >
      <NewPositionForm />
    </Suspense>
  );
}
