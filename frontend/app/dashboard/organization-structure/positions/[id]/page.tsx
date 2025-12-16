"use client";

import { useState, useEffect } from "react";
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
import { useOrganizationStructure } from "@/lib/hooks/use-organization-structure";
import {
  PositionResponseDto,
  DepartmentResponseDto,
} from "@/types/organization-structure";

export default function ViewPositionPage() {
  const params = useParams();
  const router = useRouter();
  const positionId = params.id as string;

  const {
    getPositionById,
    getDepartmentById,
    getPositionAssignments,
    deactivatePosition,
    loading,
    error,
    clearError,
  } = useOrganizationStructure();

  const [position, setPosition] = useState<PositionResponseDto | null>(null);
  const [department, setDepartment] = useState<DepartmentResponseDto | null>(
    null
  );
  const [assignments, setAssignments] = useState<any[]>([]);
  const [reportsToPosition, setReportsToPosition] =
    useState<PositionResponseDto | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(true);
  const [detailsError, setDetailsError] = useState<string | null>(null);

  useEffect(() => {
    if (positionId) {
      fetchPositionDetails();
    }
  }, [positionId]);

  const fetchPositionDetails = async () => {
    setIsLoadingDetails(true);
    setDetailsError(null);
    clearError();

    try {
      // 1. Fetch position
      const posData = await getPositionById(positionId);
      setPosition(posData);

      // 2. Extract department ID from position data
      let departmentId = "";

      if (posData.departmentId) {
        // Type assertion for departmentId
        const deptId = posData.departmentId as any;

        // Handle both string ID and populated object
        if (typeof deptId === "string") {
          departmentId = deptId;
        } else if (deptId._id) {
          departmentId = deptId._id;
        } else if (deptId.id) {
          departmentId = deptId.id;
        } else if (deptId.$oid) {
          departmentId = deptId.$oid;
        }

        // Fetch department using the extracted ID
        if (departmentId) {
          try {
            const deptData = await getDepartmentById(departmentId);
            setDepartment(deptData);
          } catch (deptErr: any) {
            console.warn("Could not fetch department:", deptErr.message);
            setDepartment(null);
          }
        } else {
          console.warn("Could not extract department ID from position data");
          setDepartment(null);
        }
      } else {
        setDepartment(null);
      }

      // 3. Fetch assignments
      try {
        const assignData = await getPositionAssignments(positionId);
        setAssignments(
          assignData.filter(
            (a) => !a.endDate || new Date(a.endDate) > new Date()
          )
        );
      } catch (assignErr: any) {
        console.log("No assignments found:", assignErr.message);
        setAssignments([]);
      }

      // 4. Fetch reports to position if exists
      let reportsToId = "";

      if (posData.reportsToPositionId) {
        // Type assertion for reportsToPositionId
        const reportsToIdObj = posData.reportsToPositionId as any;

        // Handle both string ID and populated object
        if (typeof reportsToIdObj === "string") {
          reportsToId = reportsToIdObj;
        } else if (reportsToIdObj._id) {
          reportsToId = reportsToIdObj._id;
        } else if (reportsToIdObj.id) {
          reportsToId = reportsToIdObj.id;
        } else if (reportsToIdObj.$oid) {
          reportsToId = reportsToIdObj.$oid;
        }

        if (reportsToId) {
          try {
            const reportsTo = await getPositionById(reportsToId);
            setReportsToPosition(reportsTo);
          } catch (reportsErr: any) {
            console.log(
              "Could not fetch reports to position:",
              reportsErr.message
            );
            setReportsToPosition(null);
          }
        }
      }
    } catch (err: any) {
      console.error("Failed to fetch position details:", err);
      setDetailsError(err.message || "Failed to load position details");
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleDeactivate = async () => {
    if (!position) return;

    if (
      !confirm(
        `Are you sure you want to deactivate the position "${position.title}"? This will mark it as inactive and prevent new assignments.`
      )
    ) {
      return;
    }

    try {
      await deactivatePosition(position._id);
      // Refresh the page data after deactivation
      fetchPositionDetails();
    } catch (err: any) {
      console.error("Failed to deactivate position:", err);
    }
  };

  const formatDate = (date: Date | string) => {
    try {
      return new Date(date).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch (e) {
      return "Invalid date";
    }
  };

  const handleRefresh = () => {
    fetchPositionDetails();
  };

  if (isLoadingDetails && !position) {
    return (
      <ProtectedRoute
        allowedRoles={[
          SystemRole.SYSTEM_ADMIN,
          SystemRole.HR_ADMIN,
          SystemRole.HR_MANAGER,
        ]}
      >
        <div className="container mx-auto px-6 py-12">
          <div className="flex flex-col items-center justify-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="text-gray-600">Loading position details...</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (!position && detailsError) {
    return (
      <ProtectedRoute
        allowedRoles={[
          SystemRole.SYSTEM_ADMIN,
          SystemRole.HR_ADMIN,
          SystemRole.HR_MANAGER,
        ]}
      >
        <div className="container mx-auto px-6 py-12">
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-500 text-lg">Failed to load position</p>
              <p className="text-gray-400 mt-2">{detailsError}</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
                <Button onClick={handleRefresh} variant="primary">
                  Try Again
                </Button>
                <Button
                  onClick={() =>
                    router.push("/dashboard/organization-structure/positions")
                  }
                  variant="outline"
                >
                  Back to Positions
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </ProtectedRoute>
    );
  }

  if (!position) {
    return (
      <ProtectedRoute
        allowedRoles={[
          SystemRole.SYSTEM_ADMIN,
          SystemRole.HR_ADMIN,
          SystemRole.HR_MANAGER,
        ]}
      >
        <div className="container mx-auto px-6 py-12">
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-500 text-lg">Position not found</p>
              <p className="text-gray-400 mt-2">
                The position you're looking for doesn't exist or you don't have
                access.
              </p>
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

  // Helper function to extract ID from departmentId (for display)
  const getDepartmentIdForDisplay = () => {
    if (!position.departmentId) return "";
    const deptId = position.departmentId as any;

    if (typeof deptId === "string") {
      return deptId;
    } else if (deptId._id) {
      return deptId._id;
    } else if (deptId.id) {
      return deptId.id;
    } else if (deptId.$oid) {
      return deptId.$oid;
    }
    return "";
  };

  return (
    <ProtectedRoute
      allowedRoles={[
        SystemRole.SYSTEM_ADMIN,
        SystemRole.HR_ADMIN,
        SystemRole.HR_MANAGER,
      ]}
    >
      <div className="container mx-auto px-6 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-bold text-gray-900">
                  {position.title}
                </h1>
                <span
                  className={`px-3 py-1 text-sm font-medium rounded-full ${
                    position.isActive
                      ? "bg-green-100 text-green-800"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {position.isActive ? "Active" : "Inactive"}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-4 mt-2">
                <p className="text-gray-600">
                  Position Code:{" "}
                  <span className="font-mono font-medium bg-gray-100 px-2 py-0.5 rounded">
                    {position.code}
                  </span>
                </p>
                <span className="text-gray-400 hidden sm:inline">•</span>
                <p className="text-gray-600">
                  Created: {formatDate(position.createdAt)}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button
                onClick={() =>
                  router.push(
                    `/dashboard/organization-structure/positions/${positionId}/edit`
                  )
                }
                variant="primary"
                size="sm"
                disabled={!position.isActive}
              >
                Edit Position
              </Button>
              <Button
                onClick={handleRefresh}
                variant="outline"
                size="sm"
                disabled={loading}
              >
                Refresh
              </Button>
              <Button
                onClick={() =>
                  router.push("/dashboard/organization-structure/positions")
                }
                variant="outline"
                size="sm"
              >
                ← Back
              </Button>
            </div>
          </div>

          {/* Error Messages */}
          {(error || detailsError) && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-red-700 font-medium">Error</p>
                  <p className="text-red-600 mt-1">{error || detailsError}</p>
                </div>
                <button
                  onClick={() => {
                    clearError();
                    setDetailsError(null);
                  }}
                  className="text-red-500 hover:text-red-700 text-sm"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Position Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Position Information Card */}
            <Card>
              <CardHeader>
                <CardTitle>Position Information</CardTitle>
                <CardDescription>
                  Details about this position in the organization
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {position.description && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-1">
                      Description
                    </h4>
                    <p className="text-gray-700">{position.description}</p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-1">
                      Department
                    </h4>
                    <div className="flex items-center gap-2">
                      {department ? (
                        <>
                          <span className="text-gray-700">
                            {department.name}
                          </span>
                          <span className="text-xs text-gray-500 font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                            {department.code}
                          </span>
                          {department.isActive ? (
                            <span className="text-xs bg-green-100 text-green-800 px-1.5 py-0.5 rounded">
                              Active
                            </span>
                          ) : (
                            <span className="text-xs bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded">
                              Inactive
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-gray-500 italic">
                          Department not found
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-1">
                      Reports To
                    </h4>
                    <div className="flex items-center gap-2">
                      {reportsToPosition ? (
                        <Link
                          href={`/dashboard/organization-structure/positions/${reportsToPosition._id}`}
                          className="text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-2"
                        >
                          <span>{reportsToPosition.title}</span>
                          <span className="text-xs text-gray-500 font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                            {reportsToPosition.code}
                          </span>
                        </Link>
                      ) : position.reportsToPositionId ? (
                        <span className="text-gray-500 italic">
                          Position not accessible
                        </span>
                      ) : (
                        <span className="text-gray-500 italic">
                          No direct supervisor
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100">
                  <h4 className="text-sm font-medium text-gray-500 mb-2">
                    Position Metadata
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Created:</span>
                      <span className="ml-2 text-gray-700">
                        {formatDate(position.createdAt)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Last Updated:</span>
                      <span className="ml-2 text-gray-700">
                        {formatDate(position.updatedAt)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Position ID:</span>
                      <span className="ml-2 font-mono text-xs text-gray-600">
                        {position._id.substring(0, 8)}...
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Department ID:</span>
                      <span className="ml-2 font-mono text-xs text-gray-600">
                        {(() => {
                          const deptId = getDepartmentIdForDisplay();
                          return deptId
                            ? deptId.substring(0, 8) + "..."
                            : "N/A";
                        })()}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Active Assignments Card */}
            {assignments.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle>
                    Current Assignments ({assignments.length})
                  </CardTitle>
                  <CardDescription>
                    Employees currently assigned to this position
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead>
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Employee ID
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Start Date
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {assignments.map((assignment) => (
                          <tr key={assignment._id}>
                            <td className="px-4 py-3 text-sm">
                              <span className="font-mono text-gray-900">
                                {(() => {
                                  const empId = assignment.employeeProfileId;
                                  if (!empId) return "Unknown";

                                  // Handle both string and object
                                  if (typeof empId === "string") {
                                    return empId.substring(0, 12);
                                  } else {
                                    const empIdObj = empId as any;
                                    const idStr =
                                      empIdObj._id ||
                                      empIdObj.id ||
                                      empIdObj.$oid ||
                                      "";
                                    return idStr
                                      ? idStr.substring(0, 12)
                                      : "Unknown";
                                  }
                                })()}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500">
                              {formatDate(assignment.startDate)}
                              {assignment.endDate && (
                                <div className="text-xs text-gray-400">
                                  Ends: {formatDate(assignment.endDate)}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`px-2 py-1 text-xs font-medium rounded-full ${
                                  assignment.endDate &&
                                  new Date(assignment.endDate) <= new Date()
                                    ? "bg-gray-100 text-gray-800"
                                    : "bg-green-100 text-green-800"
                                }`}
                              >
                                {assignment.endDate &&
                                new Date(assignment.endDate) <= new Date()
                                  ? "Ended"
                                  : "Active"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Assignments</CardTitle>
                  <CardDescription>
                    No active assignments for this position
                  </CardDescription>
                </CardHeader>
                <CardContent className="py-8 text-center">
                  <p className="text-gray-500">
                    This position has no current employee assignments.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Actions and Status */}
          <div className="space-y-6">
            {/* Status Card */}
            <Card>
              <CardHeader>
                <CardTitle>Position Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">Current Status:</span>
                  <span
                    className={`px-3 py-1 text-sm font-medium rounded-full ${
                      position.isActive
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {position.isActive ? "Active" : "Inactive"}
                  </span>
                </div>

                <div className="pt-4 border-t border-gray-100">
                  <p className="text-sm text-gray-500 mb-3">
                    {position.isActive
                      ? "This position is active and available for assignments."
                      : "This position is inactive and cannot be assigned to new employees."}
                  </p>

                  {position.isActive && (
                    <Button
                      onClick={handleDeactivate}
                      variant="danger"
                      className="w-full"
                      disabled={assignments.length > 0 || loading}
                      isLoading={loading}
                    >
                      {assignments.length > 0
                        ? "Cannot Deactivate (Has Active Assignments)"
                        : "Deactivate Position"}
                    </Button>
                  )}

                  {assignments.length > 0 && position.isActive && (
                    <p className="text-xs text-red-600 mt-2">
                      Reassign or end assignments before deactivating.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions Card */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  onClick={() =>
                    router.push(
                      `/dashboard/organization-structure/positions/${positionId}/edit`
                    )
                  }
                  variant="outline"
                  className="w-full justify-start"
                  disabled={!position.isActive}
                >
                  ✏️ Edit Position Details
                </Button>

                <Button
                  onClick={() =>
                    router.push(
                      `/dashboard/organization-structure/positions/new?clone=${positionId}`
                    )
                  }
                  variant="outline"
                  className="w-full justify-start"
                >
                  🧬 Clone Position
                </Button>

                <Button
                  onClick={() =>
                    router.push(
                      `/dashboard/organization-structure/positions/${positionId}/hierarchy`
                    )
                  }
                  variant="outline"
                  className="w-full justify-start"
                >
                  📊 View Reporting Hierarchy
                </Button>

                <Button
                  onClick={() =>
                    router.push(
                      `/dashboard/organization-structure/change-requests/new?positionId=${positionId}`
                    )
                  }
                  variant="outline"
                  className="w-full justify-start"
                >
                  📝 Request Changes
                </Button>
              </CardContent>
            </Card>

            {/* Navigation Links */}
            <Card>
              <CardContent className="space-y-3 pt-6">
                <Link
                  href="/dashboard/organization-structure/positions"
                  className="block text-sm text-blue-600 hover:text-blue-800 hover:underline"
                >
                  ← All Positions
                </Link>
                <Link
                  href="/dashboard/organization-structure/departments"
                  className="block text-sm text-blue-600 hover:text-blue-800 hover:underline"
                >
                  ← Department Management
                </Link>
                <Link
                  href="/dashboard/organization-structure/change-requests"
                  className="block text-sm text-blue-600 hover:text-blue-800 hover:underline"
                >
                  → Change Requests
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
