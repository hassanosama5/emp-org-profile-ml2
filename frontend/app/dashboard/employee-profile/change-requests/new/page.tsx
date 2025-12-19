// app/dashboard/employee-profile/change-requests/new/page.tsx
"use client";

import { ProtectedRoute } from "@/components/auth/protected-route";
import { useRequireAuth } from "@/lib/hooks/use-auth";
import { SystemRole } from "@/types";
import { Input } from "@/components/shared/ui/Input";
import { Textarea } from "@/components/leaves/Textarea";
import { Select } from "@/components/leaves/Select";
import { Button } from "@/components/shared/ui/Button";
import { useState, useEffect } from "react";
import { Toast, useToast } from "@/components/leaves/Toast";
import { employeeProfileApi } from "@/lib/api/employee-profile/profile";
import Link from "next/link";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/shared/ui/Card";
import { departmentsApi } from "@/lib/api/organization-structure/departments.api";
import { positionsApi } from "@/lib/api/organization-structure/positions.api";
import type { EmployeeProfile } from "@/types";
import type {
  DepartmentResponseDto,
  PositionResponseDto,
} from "@/types/organization-structure";

export default function NewChangeRequestPage() {
  useRequireAuth([SystemRole.DEPARTMENT_EMPLOYEE, SystemRole.RECRUITER]);
  const [subject, setSubject] = useState("");
  const [details, setDetails] = useState("");
  const [changeType, setChangeType] = useState<string>("");
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [newPositionId, setNewPositionId] = useState("");
  const [newDepartmentId, setNewDepartmentId] = useState("");
  const [maritalStatus, setMaritalStatus] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const { toast, showToast, hideToast } = useToast();

  // State for current profile and options
  const [currentProfile, setCurrentProfile] = useState<EmployeeProfile | null>(
    null
  );
  const [departments, setDepartments] = useState<DepartmentResponseDto[]>([]);
  const [positions, setPositions] = useState<PositionResponseDto[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [filteredPositions, setFilteredPositions] = useState<
    PositionResponseDto[]
  >([]);

  // Load current profile and options
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoadingOptions(true);
        const [profileResponse, deptsResponse, posResponse] = await Promise.all([
          employeeProfileApi.getMyProfile(),
          departmentsApi.getAllDepartments({ isActive: true }),
          positionsApi.getAllPositions({ isActive: true }),
        ]);

        // Handle profile response - extract data if nested
        let profile: EmployeeProfile | null = null;
        if (profileResponse && typeof profileResponse === "object") {
          if ("data" in profileResponse) {
            profile = profileResponse.data as EmployeeProfile;
          } else {
            profile = profileResponse as EmployeeProfile;
          }
        }

        // Handle departments response
        let depts: DepartmentResponseDto[] = [];
        if (Array.isArray(deptsResponse)) {
          depts = deptsResponse;
        } else if (deptsResponse && typeof deptsResponse === "object") {
          if ("data" in deptsResponse && Array.isArray((deptsResponse as any).data)) {
            depts = (deptsResponse as any).data;
          } else if (Array.isArray((deptsResponse as any).departments)) {
            depts = (deptsResponse as any).departments;
          }
        }

        // Handle positions response
        let pos: PositionResponseDto[] = [];
        if (Array.isArray(posResponse)) {
          pos = posResponse;
        } else if (posResponse && typeof posResponse === "object") {
          if ("data" in posResponse && Array.isArray((posResponse as any).data)) {
            pos = (posResponse as any).data;
          } else if (Array.isArray((posResponse as any).positions)) {
            pos = (posResponse as any).positions;
          }
        }

        setCurrentProfile(profile);
        setDepartments(depts);
        setPositions(pos);
        setFilteredPositions(pos);
      } catch (error: any) {
        console.error("Failed to load data:", error);
        showToast(
          error.message || "Failed to load profile or options",
          "error"
        );
      } finally {
        setLoadingOptions(false);
      }
    };
    loadData();
  }, []);

  // Filter positions when department changes
  useEffect(() => {
    if (newDepartmentId) {
      const filtered = positions.filter((p) => {
        // Handle departmentId - can be string, ObjectId, or populated object
        let posDeptId: string = "";
        if (typeof p.departmentId === "string") {
          posDeptId = p.departmentId;
        } else if (p.departmentId && typeof p.departmentId === "object") {
          posDeptId =
            (p.departmentId as any)?._id?.toString() ||
            (p.departmentId as any)?.toString() ||
            "";
        }
        return posDeptId === newDepartmentId;
      });
      setFilteredPositions(filtered);
      // Clear position if it's not in the filtered list
      if (
        newPositionId &&
        !filtered.some((p) => {
          const posId = typeof p._id === "string" ? p._id : (p._id as any)?.toString() || "";
          return posId === newPositionId;
        })
      ) {
        setNewPositionId("");
      }
    } else {
      setFilteredPositions(positions);
    }
  }, [newDepartmentId, positions, newPositionId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (!changeType) {
        showToast("Select a change type", "error");
        setSaving(false);
        return;
      }

      let changes: Record<string, any> = {};
      if (changeType === "LEGAL_NAME") {
        if (!firstName.trim() && !lastName.trim()) {
          showToast("Provide first or last name", "error");
          setSaving(false);
          return;
        }
        if (firstName.trim()) changes.firstName = firstName.trim();
        if (middleName.trim()) changes.middleName = middleName.trim();
        if (lastName.trim()) changes.lastName = lastName.trim();
      } else if (changeType === "NATIONAL_ID") {
        if (!nationalId.trim()) {
          showToast("Provide national ID", "error");
          setSaving(false);
          return;
        }
        changes.nationalId = nationalId.trim();
      } else if (changeType === "POSITION") {
        if (!newPositionId) {
          showToast("Select a position", "error");
          setSaving(false);
          return;
        }
        changes.primaryPositionId = newPositionId;
        if (newDepartmentId) {
          changes.primaryDepartmentId = newDepartmentId;
        }
      } else if (changeType === "MARITAL_STATUS") {
        if (!maritalStatus) {
          showToast("Select marital status", "error");
          setSaving(false);
          return;
        }
        changes.maritalStatus = maritalStatus;
      }

      const payload = JSON.stringify({ type: changeType, changes });
      const autoSubjectMap: Record<string, string> = {
        LEGAL_NAME: "Legal Name Change Request",
        NATIONAL_ID: "National ID Change Request",
        POSITION: "Position/Department Change Request",
        MARITAL_STATUS: "Marital Status Change Request",
      };
      const finalSubject =
        (subject && subject.trim()) ||
        autoSubjectMap[changeType] ||
        "Profile Change Request";

      await employeeProfileApi.submitChangeRequest({
        requestDescription: payload,
        reason: finalSubject,
      });
      showToast("Request submitted successfully", "success");
      setSubject("");
      setDetails("");
      setChangeType("");
      setFirstName("");
      setMiddleName("");
      setLastName("");
      setNationalId("");
      setNewPositionId("");
      setNewDepartmentId("");
      setMaritalStatus("");
    } catch (error: any) {
      showToast(error.message || "Failed to submit request", "error");
    } finally {
      setSaving(false);
    }
  };

  // Helper to get current position/department names - handles both populated objects and IDs
  const getCurrentPositionName = () => {
    if (!currentProfile) return "Loading...";
    
    const positionId =
      (currentProfile.primaryPositionId as any)?._id?.toString() ||
      (currentProfile.primaryPositionId as any)?.toString() ||
      currentProfile.primaryPositionId;

    if (!positionId) return "Not assigned";

    // Check if it's a populated object
    if (
      currentProfile.primaryPositionId &&
      typeof currentProfile.primaryPositionId === "object"
    ) {
      return (currentProfile.primaryPositionId as any).title || "Unknown Position";
    }

    // Otherwise find by ID
    const pos = positions.find((p) => {
      const posId = typeof p._id === "string" ? p._id : (p._id as any)?.toString() || "";
      return posId === positionId;
    });
    return pos?.title || "Unknown Position";
  };

  const getCurrentDepartmentName = () => {
    if (!currentProfile) return "Loading...";
    
    const departmentId =
      (currentProfile.primaryDepartmentId as any)?._id?.toString() ||
      (currentProfile.primaryDepartmentId as any)?.toString() ||
      currentProfile.primaryDepartmentId;

    if (!departmentId) return "Not assigned";

    // Check if it's a populated object
    if (
      currentProfile.primaryDepartmentId &&
      typeof currentProfile.primaryDepartmentId === "object"
    ) {
      return (currentProfile.primaryDepartmentId as any).name || "Unknown Department";
    }

    // Otherwise find by ID
    const dept = departments.find((d) => {
      const deptId = typeof d._id === "string" ? d._id : (d._id as any)?.toString() || "";
      return deptId === departmentId;
    });
    return dept?.name || "Unknown Department";
  };

  return (
    <ProtectedRoute requiredUserType="employee">
      <div className="container mx-auto px-6 py-8">
        <Toast
          message={toast.message}
          type={toast.type}
          isVisible={toast.isVisible}
          onClose={hideToast}
        />

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              New Change Request
            </h1>
            <p className="text-gray-600 mt-1">
              Submit a request to update your profile information
            </p>
          </div>
          <Link
            href="/dashboard/employee-profile/change-requests"
            className="mt-4 md:mt-0"
          >
            <Button variant="outline">View My Requests</Button>
          </Link>
        </div>

        {/* Form Card */}
        <Card>
          <CardHeader>
            <CardTitle>Request Details</CardTitle>
            <CardDescription>
              Select the type of change you want to request and provide the
              necessary information
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingOptions ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <form className="space-y-6" onSubmit={handleSubmit}>
                {/* Change Type */}
                <div>
                  <Select
                    label="Change Type"
                    value={changeType}
                    onChange={(e) => {
                      const val = e.target.value;
                      setChangeType(val);
                      const autoSubjectMap: Record<string, string> = {
                        LEGAL_NAME: "Legal Name Change Request",
                        NATIONAL_ID: "National ID Change Request",
                        POSITION: "Position/Department Change Request",
                        MARITAL_STATUS: "Marital Status Change Request",
                      };
                      setSubject(
                        autoSubjectMap[val] || "Profile Change Request"
                      );
                    }}
                    options={[
                      { value: "LEGAL_NAME", label: "Legal Name" },
                      { value: "NATIONAL_ID", label: "National ID" },
                      { value: "POSITION", label: "Position / Department" },
                      { value: "MARITAL_STATUS", label: "Marital Status" },
                    ]}
                    placeholder="Select change type"
                    className="text-gray-900"
                  />
                </div>

                {/* Conditional Fields Based on Change Type */}
                {changeType === "LEGAL_NAME" && (
                  <Card className="bg-gray-50">
                    <CardHeader>
                      <CardTitle className="text-lg">Legal Name Change</CardTitle>
                      <CardDescription>
                        Update your legal name. This change requires supporting documentation.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm text-blue-900">
                          <strong>Current Name:</strong> {currentProfile?.fullName || "Loading..."}
                        </p>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Input
                          label="New First Name *"
                          placeholder="Enter new first name"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          className="text-gray-900"
                          required
                        />
                        <Input
                          label="New Middle Name (optional)"
                          placeholder="Enter new middle name"
                          value={middleName}
                          onChange={(e) => setMiddleName(e.target.value)}
                          className="text-gray-900"
                        />
                        <Input
                          label="New Last Name *"
                          placeholder="Enter new last name"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          className="text-gray-900"
                          required
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        * At least first name or last name is required. You may need to provide supporting documentation for legal name changes.
                      </p>
                    </CardContent>
                  </Card>
                )}

                {changeType === "NATIONAL_ID" && (
                  <Card className="bg-gray-50">
                    <CardHeader>
                      <CardTitle className="text-lg">National ID</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Input
                        label="National ID"
                        placeholder="Enter 14-digit national ID"
                        value={nationalId}
                        onChange={(e) => setNationalId(e.target.value)}
                        className="text-gray-900"
                      />
                    </CardContent>
                  </Card>
                )}

                {changeType === "POSITION" && (
                  <Card className="bg-gray-50">
                    <CardHeader>
                      <CardTitle className="text-lg">
                        Position & Department Transfer
                      </CardTitle>
                      <CardDescription>
                        Request to transfer from your current position to a new
                        one
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Current Position Info */}
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <p className="text-sm font-medium text-blue-900 mb-2">
                          Current Assignment
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-gray-600">Position: </span>
                            <span className="font-medium text-gray-900">
                              {getCurrentPositionName()}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600">Department: </span>
                            <span className="font-medium text-gray-900">
                              {getCurrentDepartmentName()}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* New Position Selection */}
                      <div className="space-y-4">
                        <div>
                          <Select
                            label="New Department (optional)"
                            value={newDepartmentId}
                            onChange={(e) => {
                              setNewDepartmentId(e.target.value);
                              if (!e.target.value) {
                                setFilteredPositions(positions);
                              }
                            }}
                            options={[
                              { value: "", label: "Select department (optional)" },
                              ...departments.map((dept) => ({
                                value: typeof dept._id === "string" ? dept._id : (dept._id as any)?.toString() || "",
                                label: dept.name || "Unknown",
                              })),
                            ]}
                            placeholder="Select new department"
                            className="text-gray-900"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Selecting a department will filter available positions
                          </p>
                        </div>

                        <div>
                          <Select
                            label="New Position *"
                            value={newPositionId}
                            onChange={(e) => setNewPositionId(e.target.value)}
                            options={[
                              { value: "", label: "Select position" },
                              ...filteredPositions.map((pos) => ({
                                value: typeof pos._id === "string" ? pos._id : (pos._id as any)?.toString() || "",
                                label: pos.title || "Unknown Position",
                              })),
                            ]}
                            placeholder="Select new position"
                            className="text-gray-900"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Required: Select the position you want to transfer to
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {changeType === "MARITAL_STATUS" && (
                  <Card className="bg-gray-50">
                    <CardHeader>
                      <CardTitle className="text-lg">Marital Status Change</CardTitle>
                      <CardDescription>
                        Update your marital status. This information may be used for benefits and tax purposes.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm text-blue-900">
                          <strong>Current Marital Status:</strong>{" "}
                          {currentProfile?.maritalStatus
                            ? currentProfile.maritalStatus.charAt(0) +
                              currentProfile.maritalStatus.slice(1).toLowerCase()
                            : "Not specified"}
                        </p>
                      </div>
                      <Select
                        label="New Marital Status *"
                        value={maritalStatus}
                        onChange={(e) => setMaritalStatus(e.target.value)}
                        options={[
                          { value: "SINGLE", label: "Single" },
                          { value: "MARRIED", label: "Married" },
                          { value: "DIVORCED", label: "Divorced" },
                          { value: "WIDOWED", label: "Widowed" },
                        ]}
                        placeholder="Select new marital status"
                        className="text-gray-900"
                        required
                      />
                      <p className="text-xs text-gray-500 mt-2">
                        * Required. This change may require supporting documentation depending on your organization's policies.
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* Subject and Details */}
                <div className="space-y-4">
                  <Input
                    label="Subject"
                    placeholder="Request subject (auto-filled based on change type)"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="text-gray-900"
                  />
                  <Textarea
                    label="Additional Details"
                    rows={4}
                    placeholder="Provide any additional information or context for your request"
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    className="text-gray-900"
                  />
                </div>

                {/* Submit Button */}
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                  <Link href="/dashboard/employee-profile/change-requests">
                    <Button type="button" variant="outline">
                      Cancel
                    </Button>
                  </Link>
                  <Button type="submit" isLoading={saving} variant="primary">
                    Submit Request
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  );
}
