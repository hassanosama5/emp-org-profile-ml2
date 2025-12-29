"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { SystemRole } from "@/types";
import { Button } from "@/components/shared/ui/Button";
import { useAuth } from "@/lib/hooks/use-auth";
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

// Helper function to extract department ID from either string or object
const extractDepartmentId = (departmentId: any): string => {
  if (!departmentId) return "";

  if (typeof departmentId === "string") {
    return departmentId;
  }

  if (typeof departmentId === "object" && departmentId !== null) {
    // Handle MongoDB ObjectId or similar
    if (departmentId._id) {
      return departmentId._id;
    }
    if (departmentId.id) {
      return departmentId.id;
    }
    if (departmentId.toString) {
      return departmentId.toString();
    }
  }

  return "";
};

// Helper function to check if department filter matches position
const matchesDepartmentFilter = (
  positionDeptId: any,
  filterDeptId: string
): boolean => {
  if (!filterDeptId) return true;

  const extractedId = extractDepartmentId(positionDeptId);
  return extractedId === filterDeptId;
};

export default function PositionsPage() {
  const router = useRouter();
  const {
    getPositions,
    getDepartments,
    deactivatePosition,
    loading,
    error,
    clearError,
  } = useOrganizationStructure();

  const [positions, setPositions] = useState<PositionResponseDto[]>([]);
  const [allPositions, setAllPositions] = useState<PositionResponseDto[]>([]);
  const [departments, setDepartments] = useState<DepartmentResponseDto[]>([]);
  const [filterActive, setFilterActive] = useState<boolean>(true);
  const [departmentFilter, setDepartmentFilter] = useState<string>("");

  // Department name lookup map
  const departmentMap = departments.reduce((acc, dept) => {
    acc[dept._id] = { name: dept.name, code: dept.code };
    return acc;
  }, {} as Record<string, { name: string; code: string }>);

  useEffect(() => {
    fetchDepartments();
    fetchAllPositions();
  }, []);

  useEffect(() => {
    filterPositions();
  }, [filterActive, departmentFilter, allPositions]);

  const fetchDepartments = async () => {
    try {
      const data = await getDepartments({ isActive: true });
      setDepartments(data);
    } catch (err) {
      console.error("Failed to fetch departments:", err);
    }
  };

  const fetchAllPositions = async () => {
    try {
      const data = await getPositions(); // Get all positions without filters
      setAllPositions(data);
    } catch (err) {
      console.error("Failed to fetch positions:", err);
    }
  };

  const filterPositions = () => {
    let filtered = [...allPositions];

    // Apply active filter
    if (filterActive) {
      filtered = filtered.filter((pos) => pos.isActive);
    }

    // Apply department filter
    if (departmentFilter) {
      filtered = filtered.filter((pos) =>
        matchesDepartmentFilter(pos.departmentId, departmentFilter)
      );
    }

    setPositions(filtered);
  };

  const handleDeactivate = async (id: string, positionTitle: string) => {
    if (
      !confirm(
        `Are you sure you want to deactivate the position "${positionTitle}"? This will mark it as inactive.`
      )
    ) {
      return;
    }

    try {
      await deactivatePosition(id);
      fetchAllPositions(); // Refresh the list
    } catch (err) {
      console.error("Failed to deactivate position:", err);
    }
  };

  const getDepartmentInfo = (departmentId: any) => {
    const deptId = extractDepartmentId(departmentId);
    const dept = departmentMap[deptId];

    if (dept) {
      return `${dept.name} (${dept.code})`;
    }

    // If we have the department ID but no name, show the ID
    if (deptId && typeof deptId === "string" && deptId.length > 0) {
      return `Department ID: ${deptId.substring(0, 8)}...`;
    }

    return "Department: Unknown";
  };

  const formatReportsTo = (reportsToId: any) => {
    if (!reportsToId) return "No reporting line";

    // Try to find the position title
    let positionId = "";

    if (typeof reportsToId === "string") {
      positionId = reportsToId;
    } else if (typeof reportsToId === "object" && reportsToId !== null) {
      if (reportsToId._id) positionId = reportsToId._id;
      else if (reportsToId.id) positionId = reportsToId.id;
      else if (reportsToId.toString) positionId = reportsToId.toString();
    }

    if (positionId) {
      const reportsToPosition = allPositions.find((p) => {
        const posId = extractDepartmentId(p._id);
        return posId === positionId;
      });

      if (reportsToPosition) {
        return reportsToPosition.title;
      }

      if (typeof positionId === "string" && positionId.length > 0) {
        return `Position: ${positionId.substring(0, 8)}...`;
      }
    }

    return "Reporting: Unknown";
  };

  // REQ-SANV-01, REQ-SANV-02: Department Heads can view positions (read-only)
  // REQ-OSM-01, REQ-OSM-02: Only System Admin/HR Admin can manage
  const { user } = useAuth();
  const canManage = useMemo(() => {
    const roles = user?.roles || [];
    return roles.some((r: string) => 
      [SystemRole.SYSTEM_ADMIN, SystemRole.HR_ADMIN].includes(r as SystemRole)
    );
  }, [user?.roles]);

  return (
    <ProtectedRoute
      allowedRoles={[
        SystemRole.SYSTEM_ADMIN,
        SystemRole.HR_ADMIN,
        SystemRole.HR_MANAGER,
        SystemRole.DEPARTMENT_HEAD,
        SystemRole.SYSTEM_ADMIN,
        SystemRole.HR_ADMIN,
        SystemRole.HR_MANAGER,
      ]}
    >
      <div className="container mx-auto px-6 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Positions</h1>
              <p className="text-gray-600 mt-1">
                Manage job positions and organizational roles
              </p>
            </div>
            {canManage && (
              <Button
                onClick={() =>
                  router.push("/dashboard/organization-structure/positions/new")
                }
                variant="primary"
              >
                + Create New Position
              </Button>
            )}
          </div>

          <div className="mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="activeFilter"
                    checked={filterActive}
                    onChange={(e) => setFilterActive(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label
                    htmlFor="activeFilter"
                    className="text-sm text-gray-700"
                  >
                    Show active positions only
                  </label>
                </div>

                {departments.length > 0 && (
                  <div className="flex items-center gap-2">
                    <label
                      htmlFor="departmentFilter"
                      className="text-sm text-gray-700 whitespace-nowrap"
                    >
                      Filter by Department:
                    </label>
                    <select
                      id="departmentFilter"
                      value={departmentFilter}
                      onChange={(e) => setDepartmentFilter(e.target.value)}
                      className="rounded border border-gray-300 text-sm min-w-[200px] bg-white text-gray-900"
                    >
                      <option value="">All Departments</option>
                      {departments.map((dept) => (
                        <option key={dept._id} value={dept._id}>
                          {dept.name} ({dept.code})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Button
                onClick={fetchAllPositions}
                variant="outline"
                size="sm"
                disabled={loading}
              >
                Refresh
              </Button>
              <Link
                href="/dashboard/organization-structure"
                className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
              >
                ← Back to Structure
              </Link>
            </div>
          </div>
        </div>

        {/* Debug Info - Remove in production
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm">
          <p className="font-medium text-yellow-800">Debug Info:</p>
          <p className="text-yellow-700">
            Positions: {allPositions.length} total, {positions.length} filtered
          </p>
          <p className="text-yellow-700">
            Departments: {departments.length} loaded
          </p>
          {allPositions.length > 0 && (
            <p className="text-yellow-700">
              Sample position departmentId type:{" "}
              {typeof allPositions[0].departmentId}
            </p>
          )}
        </div> */}

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
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

        {/* Loading State */}
        {loading && allPositions.length === 0 ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : positions.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-500 text-lg">No positions found</p>
              <p className="text-gray-400 mt-2">
                {filterActive
                  ? "No active positions. Try showing inactive positions or create a new one."
                  : "No positions found with the current filter."}
              </p>
              <Button
                onClick={() =>
                  router.push("/dashboard/organization-structure/positions/new")
                }
                variant="primary"
                className="mt-4"
              >
                Create Your First Position
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {positions.map((position) => (
              <Card
                key={position._id}
                className={`hover:shadow-lg transition-shadow border-l-4 ${
                  position.isActive
                    ? "border-l-blue-500"
                    : "border-l-gray-400 opacity-75 bg-gray-50"
                }`}
              >
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">
                        {position.title}
                      </CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm text-gray-500 font-mono bg-gray-100 px-2 py-0.5 rounded">
                          {position.code}
                        </span>
                        <span
                          className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                            position.isActive
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {position.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {position.description && (
                    <p className="text-gray-600 mb-4 line-clamp-2">
                      {position.description}
                    </p>
                  )}

                  <div className="space-y-2 mb-4">
                    <div className="text-sm">
                      <span className="text-gray-500">Department:</span>
                      <span className="ml-2 font-medium text-gray-700">
                        {getDepartmentInfo(position.departmentId)}
                      </span>
                    </div>

                    {position.reportsToPositionId && (
                      <div className="text-sm">
                        <span className="text-gray-500">Reports to:</span>
                        <span className="ml-2 text-gray-600">
                          {formatReportsTo(position.reportsToPositionId)}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                    <div className="text-xs text-gray-400">
                      Created:{" "}
                      {new Date(position.createdAt).toLocaleDateString()}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={() =>
                          router.push(
                            `/dashboard/organization-structure/positions/${position._id}`
                          )
                        }
                        variant="outline"
                        size="sm"
                      >
                        View
                      </Button>

                      {position.isActive && canManage && (
                        <>
                          <Button
                            onClick={() =>
                              router.push(
                                `/dashboard/organization-structure/positions/${position._id}/edit`
                              )
                            }
                            variant="ghost"
                            size="sm"
                          >
                            Edit
                          </Button>
                          <Button
                            onClick={() =>
                              handleDeactivate(position._id, position.title)
                            }
                            variant="danger"
                            size="sm"
                          >
                            Deactivate
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Stats and Navigation Footer */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div>
              <p className="text-sm text-gray-600">
                Showing{" "}
                <span className="font-semibold">{positions.length}</span> of{" "}
                <span className="font-semibold">{allPositions.length}</span>{" "}
                position{positions.length !== 1 ? "s" : ""}
                {filterActive ? " (active only)" : " (all)"}
                {departmentFilter && (
                  <span>
                    {" "}
                    in{" "}
                    <span className="font-semibold">
                      {departmentMap[departmentFilter]?.name ||
                        "selected department"}
                    </span>
                  </span>
                )}
              </p>
              {departments.length > 0 && (
                <p className="text-xs text-gray-400 mt-1">
                  {departments.length} departments available
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-4">
              <Link
                href="/dashboard/organization-structure/departments"
                className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
              >
                ← View Departments
              </Link>
              <Link
                href="/dashboard/organization-structure/positions/hierarchy"
                className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
              >
                View Position Hierarchy →
              </Link>
              <Link
                href="/dashboard/organization-structure/change-requests"
                className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
              >
                Manage Change Requests →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
