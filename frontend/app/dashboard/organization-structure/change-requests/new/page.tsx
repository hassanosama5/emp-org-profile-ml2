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
    details: "",
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
      details: "",
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
    if (formData.requestType === StructureRequestType.NEW_DEPARTMENT) {
      // NEW_DEPARTMENT doesn't need targetDepartmentId (it's creating a new one)
      // But details are required to specify the new department information
      if (!formData.details.trim()) {
        errors.details = "Details are required for new department (specify name, code, description, etc.)";
        isValid = false;
      }
    } else if (formData.requestType === StructureRequestType.UPDATE_DEPARTMENT) {
      if (!formData.targetDepartmentId) {
        errors.targetDepartmentId = "Target department is required";
        isValid = false;
      }
    } else if (formData.requestType === StructureRequestType.NEW_POSITION) {
      // NEW_POSITION needs a department to create the position in
      if (!formData.targetDepartmentId) {
        errors.targetDepartmentId = "Department is required for new position";
        isValid = false;
      }
      // Details are required to specify the new position information
      if (!formData.details.trim()) {
        errors.details = "Details are required for new position (specify title, code, description, reporting structure, etc.)";
        isValid = false;
      }
    } else if (
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
      const createdRequest = await createChangeRequest(payload);
      // After creation, redirect to the detail page so user can review and submit
      router.push(`/dashboard/organization-structure/change-requests/${createdRequest._id}`);
    } catch (err: any) {
      console.error("Change request creation failed:", err);
      const errorMessage = err?.response?.data?.message || err?.message || "Failed to create change request. Please try again.";
      setSubmitError(errorMessage);
    }
  };

  const handleCancel = () => {
    router.push("/dashboard/organization-structure/change-requests");
  };

  // REQ-OSM-03: Only Managers/HR submit change requests
  // System Admin can directly create departments/positions without change requests
  const canCreateRequest = user?.roles?.some((r: string) => 
    [SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.DEPARTMENT_HEAD]
      .includes(r as SystemRole)
  );

  return (
    <ProtectedRoute allowedRoles={[SystemRole.HR_ADMIN, SystemRole.HR_MANAGER, SystemRole.DEPARTMENT_HEAD]}>
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        {/* Info for System Admin */}
        {!canCreateRequest && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-blue-800 text-sm">
              <strong>Note:</strong> As a System Admin, you can directly create departments and positions without submitting change requests. 
              Change requests are for Managers and HR to propose changes that require approval.
            </p>
          </div>
        )}

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
                  {(formData.requestType === StructureRequestType.UPDATE_DEPARTMENT || 
                    formData.requestType === StructureRequestType.NEW_POSITION) && (
                    <div className="space-y-2">
                      <label htmlFor="targetDepartmentId" className="block text-sm font-medium text-gray-700">
                        {formData.requestType === StructureRequestType.NEW_POSITION 
                          ? "Department for New Position *" 
                          : "Target Department *"}
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
                      {formData.requestType === StructureRequestType.NEW_POSITION && (
                        <p className="text-xs text-gray-500">
                          Select the department where the new position will be created.
                        </p>
                      )}
                    </div>
                  )}

                  {/* Target Position (Conditional) */}
                  {(formData.requestType === StructureRequestType.UPDATE_POSITION || 
                    formData.requestType === StructureRequestType.CLOSE_POSITION) && (
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

                  {/* Info for NEW_DEPARTMENT */}
                  {formData.requestType === StructureRequestType.NEW_DEPARTMENT && (
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
                      <p className="text-sm text-blue-800">
                        <strong>New Department Request:</strong> Use the "Details" field below to specify the new department's name, code, and other information. The department will be created upon approval.
                      </p>
                    </div>
                  )}

                  {/* Details */}
                  <div className="space-y-2">
                    <label htmlFor="details" className="block text-sm font-medium text-gray-700">
                      {formData.requestType === StructureRequestType.NEW_DEPARTMENT || 
                       formData.requestType === StructureRequestType.NEW_POSITION
                        ? "Change Details *" 
                        : "Details"}
                    </label>
                    <Textarea
                      id="details"
                      name="details"
                      value={formData.details}
                      onChange={handleChange}
                      placeholder={
                        formData.requestType === StructureRequestType.NEW_DEPARTMENT
                          ? "Specify the new department name, code, description, and any other relevant information..."
                          : formData.requestType === StructureRequestType.NEW_POSITION
                          ? "Specify the new position title, code, description, reporting structure, and any other relevant information..."
                          : "Provide more details about the requested change..."
                      }
                      rows={formData.requestType === StructureRequestType.NEW_DEPARTMENT || 
                            formData.requestType === StructureRequestType.NEW_POSITION ? 6 : 4}
                      disabled={loading}
                      required={formData.requestType === StructureRequestType.NEW_DEPARTMENT || 
                               formData.requestType === StructureRequestType.NEW_POSITION}
                      className={formErrors.details ? "border-red-300" : ""}
                    />
                    {formErrors.details && (
                      <p className="text-sm text-red-600">{formErrors.details}</p>
                    )}
                    <p className="text-xs text-gray-500">
                      {formData.requestType === StructureRequestType.NEW_DEPARTMENT || 
                       formData.requestType === StructureRequestType.NEW_POSITION
                        ? "Required. Provide all necessary information to create the new entity."
                        : "Optional. Elaborate on the specifics of the change."}
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
                <div>
                  <p className="font-semibold text-gray-900 mb-2">Workflow:</p>
                  <ul className="list-disc list-inside space-y-1 text-gray-600">
                    <li>Managers/HR submit change requests</li>
                    <li>System Admin reviews and approves</li>
                    <li>Changes are implemented upon approval</li>
                  </ul>
                </div>
                <div>
                  <p className="font-semibold text-gray-900 mb-2">Request Types:</p>
                  <ul className="list-disc list-inside space-y-1 text-gray-600">
                    <li><strong>New Department:</strong> Create a new department</li>
                    <li><strong>Update Department:</strong> Modify existing department</li>
                    <li><strong>New Position:</strong> Create a new position</li>
                    <li><strong>Update Position:</strong> Modify existing position</li>
                    <li><strong>Close Position:</strong> Deactivate a position</li>
                  </ul>
                </div>
                <div>
                  <p className="font-semibold text-gray-900 mb-2">Tips:</p>
                  <ul className="list-disc list-inside space-y-1 text-gray-600">
                    <li>Be clear and concise in your reason</li>
                    <li>Provide all necessary information</li>
                    <li>Ensure request type matches the change</li>
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

