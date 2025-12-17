"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { SystemRole } from "@/types";
import { Button } from "@/components/shared/ui/Button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/shared/ui/Card";
import { Input } from "@/components/shared/ui/Input";
import { Textarea } from "@/components/leaves/Textarea";
import { useOrganizationStructure } from "@/lib/hooks/use-organization-structure";
import { useAuth } from "@/lib/hooks/use-auth";
import { StructureRequestType } from "@/types/enums"; // Corrected import path
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/shared/ui/Select";

export default function CreateChangeRequestPage() {
  const router = useRouter();
  const { createChangeRequest, getDepartments, getPositions, loading, error, clearError } = useOrganizationStructure();
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    requestType: "" as StructureRequestType,
    targetDepartmentId: "",
    targetPositionId: "",
    details: "",
    reason: "",
  });

  const [formErrors, setFormErrors] = useState({
    requestType: "",
    targetDepartmentId: "",
    targetPositionId: "",
    reason: "",
  });

  const [departments, setDepartments] = useState<any[]>([]);
  const [positions, setPositions] = useState<any[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const departmentsData = await getDepartments();
        setDepartments(departmentsData);
        const positionsData = await getPositions();
        setPositions(positionsData);
      } catch (err) {
        console.error("Failed to fetch departments/positions for change request form:", err);
      }
    };
    fetchOptions();
  }, [getDepartments, getPositions]);

  const validateForm = () => {
    const errors = {
      requestType: "",
      targetDepartmentId: "",
      targetPositionId: "",
      reason: "",
    };
    let isValid = true;

    if (!formData.requestType) {
      errors.requestType = "Request type is required";
      isValid = false;
    }

    if (!formData.reason.trim()) {
      errors.reason = "Reason for change is required";
      isValid = false;
    }

    // Conditional validation based on requestType
    if (
      formData.requestType === StructureRequestType.UPDATE_DEPARTMENT
    ) {
      if (!formData.targetDepartmentId) {
        errors.targetDepartmentId = "Target department is required";
        isValid = false;
      }
    }

    if (
      formData.requestType === StructureRequestType.UPDATE_POSITION ||
      formData.requestType === StructureRequestType.CLOSE_POSITION
    ) {
      if (!formData.targetPositionId) {
        errors.targetPositionId = "Target position is required";
        isValid = false;
      }
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
    if (error) clearError();
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (formErrors[name as keyof typeof formErrors]) {
      setFormErrors((prev) => ({ ...prev, [name]: "" }));
    }
    if (error) clearError();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const requesterId = user?.userId || user?.id;
    if (!requesterId) {
      console.error("Missing employee id for requester");
      return;
    }

    setSubmitError(null);
    try {
      const payload = {
        requestedByEmployeeId: requesterId,
        requestType: formData.requestType,
        targetDepartmentId: formData.targetDepartmentId?.trim() || undefined,
        targetPositionId: formData.targetPositionId?.trim() || undefined,
        details: formData.details?.trim() || undefined,
        reason: formData.reason?.trim() || undefined,
      };

      console.log("Submitting change request payload:", payload);
      await createChangeRequest(payload);
      router.push("/dashboard/organization-structure/change-requests");
    } catch (err: any) {
      console.error("Change request creation failed:", err);
      const errorMessage = err?.response?.data?.message || err?.message || "Failed to create change request. Please try again.";
      setSubmitError(errorMessage);
    }
  };

  const handleCancel = () => {
    router.push("/dashboard/organization-structure/change-requests");
  };

  return (
    <ProtectedRoute allowedRoles={[SystemRole.SYSTEM_ADMIN, SystemRole.HR_ADMIN, SystemRole.HR_MANAGER]}>
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
            <Link href="/dashboard/organization-structure/change-requests" className="hover:text-blue-600">
              Change Requests
            </Link>
            <span className="mx-2">/</span>
            <span className="text-gray-900 font-medium">New Request</span>
          </nav>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Submit New Change Request</h1>
              <p className="text-gray-600 mt-1">
                Propose changes to the organizational structure
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
              <CardHeader>
                <CardTitle>Request Details</CardTitle>
                <CardDescription>
                  Fill in the details for your change request. Fields marked with * are required.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Global Error */}
                  {(error || submitError) && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                      <p className="text-red-700 font-medium">Error: {error || submitError}</p>
                      <p className="text-red-600 text-sm mt-1">
                        Please check your inputs and try again.
                      </p>
                      {(error || submitError) && (
                        <button
                          type="button"
                          onClick={() => {
                            clearError();
                            setSubmitError(null);
                          }}
                          className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
                        >
                          Dismiss
                        </button>
                      )}
                    </div>
                  )}

                  {/* Request Type */}
                  <div className="space-y-2">
                    <label htmlFor="requestType" className="block text-sm font-medium text-gray-700">
                      Request Type *
                    </label>
                    <Select
                      name="requestType"
                      value={formData.requestType}
                      onValueChange={(value: StructureRequestType) => handleSelectChange("requestType", value)}
                      disabled={loading}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a request type" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.values(StructureRequestType).map((type) => (
                          <SelectItem key={type} value={type}>
                            {type.replace(/_/g, " ")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {formErrors.requestType && (
                      <p className="text-sm text-red-600">{formErrors.requestType}</p>
                    )}
                  </div>

                  {/* Target Department (Conditional) */}
                  {formData.requestType === StructureRequestType.UPDATE_DEPARTMENT && (
                    <div className="space-y-2">
                      <label htmlFor="targetDepartmentId" className="block text-sm font-medium text-gray-700">
                        Target Department *
                      </label>
                      <Select
                        name="targetDepartmentId"
                        value={formData.targetDepartmentId}
                        onValueChange={(value: string) => handleSelectChange("targetDepartmentId", value)}
                        disabled={loading}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select a department" />
                        </SelectTrigger>
                        <SelectContent>
                          {departments.map((dept) => (
                            <SelectItem key={dept._id} value={dept._id}>
                              {dept.name} ({dept.code})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {formErrors.targetDepartmentId && (
                        <p className="text-sm text-red-600">{formErrors.targetDepartmentId}</p>
                      )}
                    </div>
                  )}

                  {/* Target Position (Conditional) */}
                  {(formData.requestType === StructureRequestType.UPDATE_POSITION || formData.requestType === StructureRequestType.CLOSE_POSITION) && (
                    <div className="space-y-2">
                      <label htmlFor="targetPositionId" className="block text-sm font-medium text-gray-700">
                        Target Position *
                      </label>
                      <Select
                        name="targetPositionId"
                        value={formData.targetPositionId}
                        onValueChange={(value: string) => handleSelectChange("targetPositionId", value)}
                        disabled={loading}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select a position" />
                        </SelectTrigger>
                        <SelectContent>
                          {positions.map((pos) => (
                            <SelectItem key={pos._id} value={pos._id}>
                              {pos.title} ({pos.code})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {formErrors.targetPositionId && (
                        <p className="text-sm text-red-600">{formErrors.targetPositionId}</p>
                      )}
                    </div>
                  )}

                  {/* Details */}
                  <div className="space-y-2">
                    <label htmlFor="details" className="block text-sm font-medium text-gray-700">
                      Details
                    </label>
                    <Textarea
                      id="details"
                      name="details"
                      value={formData.details}
                      onChange={handleChange}
                      placeholder="Provide more details about the requested change..."
                      rows={4}
                      disabled={loading}
                    />
                    <p className="text-xs text-gray-500">
                      Optional. Elaborate on the specifics of the change.
                    </p>
                  </div>

                  {/* Reason */}
                  <div className="space-y-2">
                    <label htmlFor="reason" className="block text-sm font-medium text-gray-700">
                      Reason for Change *
                    </label>
                    <Textarea
                      id="reason"
                      name="reason"
                      value={formData.reason}
                      onChange={handleChange}
                      placeholder="Explain why this change is needed..."
                      rows={3}
                      className={`w-full ${formErrors.reason ? "border-red-300" : ""}`}
                      disabled={loading}
                      required
                    />
                    {formErrors.reason && (
                      <p className="text-sm text-red-600">{formErrors.reason}</p>
                    )}
                  </div>

                  {/* Form Actions */}
                  <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCancel}
                      disabled={loading}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      isLoading={loading}
                      disabled={loading}
                    >
                      {loading ? "Submitting..." : "Submit Request"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Guidelines Sidebar */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Change Request Guidelines</CardTitle>
                <CardDescription>
                  Follow these guidelines when submitting a change request.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-gray-600">
                <p>1. Be clear and concise in your reason and details.</p>
                <p>2. Provide all necessary information for reviewers.</p>
                <p>3. Ensure the request type matches the proposed change.</p>
                <p>4. All requests go through an approval workflow.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}

