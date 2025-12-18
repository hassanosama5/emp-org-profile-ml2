"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
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
import { useAuth } from "@/lib/hooks/use-auth";
import {
  UpdatePositionDto,
  DepartmentResponseDto,
  PositionResponseDto,
} from "@/types/organization-structure";

export default function EditPositionPage() {
  const params = useParams();
  const router = useRouter();
  const positionId = params.id as string;
  const { user } = useAuth();

  const {
    getPositionById,
    updatePosition,
    getDepartments,
    getPositions,
    loading,
    error,
    clearError,
  } = useOrganizationStructure();

  // Only System Admin can edit codes
  const canEditCode = useMemo(() => {
    const roles = user?.roles || [];
    return roles.some((r: string) => 
      String(r).toLowerCase() === SystemRole.SYSTEM_ADMIN.toLowerCase()
    );
  }, [user?.roles]);

  const [position, setPosition] = useState<PositionResponseDto | null>(null);
  const [departments, setDepartments] = useState<DepartmentResponseDto[]>([]);
  const [allPositions, setAllPositions] = useState<PositionResponseDto[]>([]);
  const [formData, setFormData] = useState({
    code: "",
    title: "",
    description: "",
    departmentId: "",
    reportsToPositionId: "",
    isActive: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [debugMode, setDebugMode] = useState(false);

  useEffect(() => {
    if (positionId) {
      fetchPositionData();
    }
  }, [positionId]);

  const fetchPositionData = async () => {
    try {
      clearError();
      setSuccessMessage("");

      // Fetch position
      const posData = await getPositionById(positionId);
      setPosition(posData);
      setFormData({
        code: posData.code,
        title: posData.title,
        description: posData.description || "",
        departmentId: posData.departmentId,
        reportsToPositionId: posData.reportsToPositionId || "",
        isActive: posData.isActive,
      });

      // Fetch departments
      const deptData = await getDepartments({ isActive: true });
      setDepartments(deptData);

      // Fetch all positions for reportsTo dropdown
      const positionsData = await getPositions({ isActive: true });
      setAllPositions(positionsData.filter((p) => p._id !== positionId));
    } catch (err: any) {
      console.error("Failed to fetch position data:", err);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value, type } = e.target;

    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!position) return;

    setIsSubmitting(true);
    setSuccessMessage("");
    clearError();

    try {
      // Only System Admin can update code
      const updateData: UpdatePositionDto = {
        title: formData.title,
        description: formData.description || undefined,
        departmentId: formData.departmentId,
        reportsToPositionId: formData.reportsToPositionId || undefined,
        isActive: formData.isActive,
      };

      // Only System Admin can update code
      if (canEditCode && formData.code.trim()) {
        updateData.code = formData.code.toUpperCase().trim();
      }

      console.log("Sending UPDATE data:", JSON.stringify(updateData, null, 2));

      const result = await updatePosition(positionId, updateData);

      console.log("Update successful:", result);
      setSuccessMessage("Position updated successfully!");

      setTimeout(() => {
        router.push(
          `/dashboard/organization-structure/positions/${positionId}`
        );
      }, 1500);
    } catch (err: any) {
      console.error("Failed to update position:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push(`/dashboard/organization-structure/positions/${positionId}`);
  };

  // Direct API test
  const testDirectApi = async () => {
    if (!position) return;

    setIsSubmitting(true);
    clearError();

    try {
      // Test with the simplest possible update
      const testData = {
        title: position.title + " TEST",
      };

      console.log("Testing direct API with:", testData);

      // Make direct fetch call to bypass our API client
      const token = localStorage.getItem("auth_token");
      const response = await fetch(
        `http://localhost:5000/api/v1/organization-structure/positions/${positionId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(testData),
        }
      );

      const data = await response.json();
      console.log("Direct API response:", { status: response.status, data });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${JSON.stringify(data)}`);
      }

      setSuccessMessage(
        `Direct API test successful! Status: ${response.status}`
      );
      fetchPositionData(); // Refresh
    } catch (err: any) {
      console.error("Direct API test failed:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading && !position) {
    return (
      <ProtectedRoute
        allowedRoles={[SystemRole.SYSTEM_ADMIN, SystemRole.HR_ADMIN]}
      >
        <div className="container mx-auto px-6 py-12">
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (!position) {
    return (
      <ProtectedRoute
        allowedRoles={[SystemRole.SYSTEM_ADMIN, SystemRole.HR_ADMIN]}
      >
        <div className="container mx-auto px-6 py-12">
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-500 text-lg">Position not found</p>
              <Button
                onClick={() =>
                  router.push("/dashboard/organization-structure/positions")
                }
                variant="primary"
                className="mt-4"
              >
                Back to Positions
              </Button>
            </CardContent>
          </Card>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute
      allowedRoles={[SystemRole.SYSTEM_ADMIN, SystemRole.HR_ADMIN]}
    >
      <div className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Edit Position
              </h1>
              <p className="text-gray-600">ID: {positionId}</p>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={testDirectApi}
                variant="outline"
                size="sm"
                disabled={isSubmitting}
              >
                Test Direct API
              </Button>
              <Button
                onClick={() => setDebugMode(!debugMode)}
                variant="ghost"
                size="sm"
              >
                {debugMode ? "Hide Debug" : "Show Debug"}
              </Button>
              <Button onClick={handleCancel} variant="outline">
                ← Cancel
              </Button>
            </div>
          </div>

          {debugMode && position && (
            <div className="mt-4 p-4 bg-gray-100 border border-gray-300 rounded-md">
              <p className="font-mono text-sm">
                Current position data:{" "}
                {JSON.stringify(
                  {
                    _id: position._id,
                    code: position.code,
                    title: position.title,
                    departmentId: position.departmentId,
                    reportsToPositionId: position.reportsToPositionId,
                    isActive: position.isActive,
                  },
                  null,
                  2
                )}
              </p>
            </div>
          )}

          {successMessage && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
              <p className="text-green-700">{successMessage}</p>
            </div>
          )}

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-700 font-medium">
                Backend Error (HTTP 500)
              </p>
              <p className="text-red-600 mt-1">{error}</p>
              <p className="text-sm text-red-500 mt-3">
                This error is coming from your backend server. Check:
              </p>
              <ol className="text-sm text-red-500 mt-1 list-decimal list-inside">
                <li>Backend server console/logs</li>
                <li>UpdatePositionDto validation in backend</li>
                <li>Database constraints and relationships</li>
                <li>The updatePosition service method</li>
              </ol>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Position Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Position Code {!canEditCode && <span className="text-xs text-gray-500">(System Admin only)</span>}
                    </label>
                    <Input
                      name="code"
                      value={formData.code}
                      onChange={handleInputChange}
                      required
                      disabled={isSubmitting || !canEditCode}
                      readOnly={!canEditCode}
                    />
                    {!canEditCode && (
                      <p className="text-xs text-gray-500 mt-1">
                        Position codes can only be changed by System Admin.
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Position Title
                    </label>
                    <Input
                      name="title"
                      value={formData.title}
                      onChange={handleInputChange}
                      required
                      disabled={isSubmitting}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      rows={2}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                      disabled={isSubmitting}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Organization</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Department
                    </label>
                    <select
                      name="departmentId"
                      value={formData.departmentId}
                      onChange={handleInputChange}
                      required
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                      disabled={isSubmitting}
                    >
                      <option value="">Select department</option>
                      {departments.map((dept) => (
                        <option key={dept._id} value={dept._id}>
                          {dept.name} ({dept.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Reports To (Optional)
                    </label>
                    <select
                      name="reportsToPositionId"
                      value={formData.reportsToPositionId}
                      onChange={handleInputChange}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                      disabled={isSubmitting}
                    >
                      <option value="">No supervisor</option>
                      {allPositions.map((pos) => (
                        <option key={pos._id} value={pos._id}>
                          {pos.title} ({pos.code})
                        </option>
                      ))}
                    </select>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      name="isActive"
                      checked={formData.isActive}
                      onChange={handleInputChange}
                      className="h-4 w-4 rounded border-gray-300"
                      disabled={isSubmitting}
                    />
                    <label className="ml-2 text-sm text-gray-700">
                      Active position
                    </label>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Update Position</CardTitle>
                </CardHeader>
                <CardContent>
                  <Button
                    type="submit"
                    variant="primary"
                    className="w-full"
                    disabled={isSubmitting}
                    isLoading={isSubmitting}
                  >
                    {isSubmitting ? "Saving..." : "Save Changes"}
                  </Button>

                  <div className="mt-4 text-xs text-gray-500">
                    <p>Note: Sending all fields to backend</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </form>
      </div>
    </ProtectedRoute>
  );
}
