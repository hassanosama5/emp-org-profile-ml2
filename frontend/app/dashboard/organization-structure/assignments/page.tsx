"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { Button } from "@/components/shared/ui/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/shared/ui/Card";
import { Input } from "@/components/shared/ui/Input";
import { useAuth } from "@/lib/hooks/use-auth";
import { SystemRole } from "@/types";
import { employeeProfileApi } from "@/lib/api/employee-profile/profile";
import { positionsApi } from "@/lib/api/organization-structure/positions.api";
import type { EmployeeProfile } from "@/types";
import type { PositionResponseDto } from "@/types/organization-structure";

export default function AssignmentsHomePage() {
  const router = useRouter();
  const { user } = useAuth();

  const [employeeSearch, setEmployeeSearch] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeProfile | null>(null);
  const [employeeSearchResults, setEmployeeSearchResults] = useState<EmployeeProfile[]>([]);
  const [searchingEmployees, setSearchingEmployees] = useState(false);

  const [positionSearch, setPositionSearch] = useState("");
  const [selectedPosition, setSelectedPosition] = useState<PositionResponseDto | null>(null);
  const [positionSearchResults, setPositionSearchResults] = useState<PositionResponseDto[]>([]);
  const [searchingPositions, setSearchingPositions] = useState(false);

  const [activeOnly, setActiveOnly] = useState(true);

  const canCreateAssignments = useMemo(() => {
    const roles = user?.roles || [];
    const has = (role: string) =>
      roles.some((r) => String(r).toLowerCase() === role.toLowerCase());
    return has(SystemRole.SYSTEM_ADMIN) || has(SystemRole.HR_ADMIN);
  }, [user?.roles]);

  // Search employees by name or employee number
  useEffect(() => {
    const searchEmployees = async () => {
      const query = employeeSearch.trim();
      if (!query || query.length < 2) {
        setEmployeeSearchResults([]);
        return;
      }

      setSearchingEmployees(true);
      try {
        // Try searching by employee number first
        if (query.match(/^EMP-/i)) {
          try {
            const employee = await employeeProfileApi.getEmployeeByNumber(query);
            if (employee) {
              setEmployeeSearchResults([employee as EmployeeProfile]);
              return;
            }
          } catch (err) {
            // Not found by number, continue with name search
          }
        }

        // Search by name
        const result = await employeeProfileApi.getAllEmployees({
          search: query,
          limit: 10,
          status: "ACTIVE",
        });
        setEmployeeSearchResults(result.data || []);
      } catch (err) {
        console.error("Error searching employees:", err);
        setEmployeeSearchResults([]);
      } finally {
        setSearchingEmployees(false);
      }
    };

    const debounceTimer = setTimeout(searchEmployees, 300);
    return () => clearTimeout(debounceTimer);
  }, [employeeSearch]);

  // Search positions by title or code
  useEffect(() => {
    const searchPositions = async () => {
      const query = positionSearch.trim();
      if (!query || query.length < 2) {
        setPositionSearchResults([]);
        return;
      }

      setSearchingPositions(true);
      try {
        const positions = await positionsApi.getAllPositions({
          isActive: true,
          search: query,
        });
        setPositionSearchResults(positions || []);
      } catch (err) {
        console.error("Error searching positions:", err);
        setPositionSearchResults([]);
      } finally {
        setSearchingPositions(false);
      }
    };

    const debounceTimer = setTimeout(searchPositions, 300);
    return () => clearTimeout(debounceTimer);
  }, [positionSearch]);

  const goEmployee = () => {
    if (!selectedEmployee?._id) return;
    router.push(
      `/dashboard/organization-structure/assignments/employee/${selectedEmployee._id}${
        activeOnly ? "?activeOnly=true" : ""
      }`
    );
  };

  const goPosition = () => {
    if (!selectedPosition?._id) return;
    router.push(
      `/dashboard/organization-structure/assignments/position/${selectedPosition._id}`
    );
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
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white-900">
              Position Assignments
            </h1>
            <p className="text-gray-600 mt-1">
              View assignments by employee/position and manage assignment
              lifecycle.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="primary"
              disabled={!canCreateAssignments}
              onClick={() =>
                router.push("/dashboard/organization-structure/assignments/new")
              }
            >
              + New Assignment
            </Button>
            <Link
              href="/dashboard/organization-structure"
              className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
            >
              ← Back
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle>Find by Employee</CardTitle>
              <CardDescription>
                Search by employee name or employee number (e.g., EMP-2025-0001)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Input
                  label="Search Employee"
                  placeholder="Type name or employee number (e.g., EMP-2025-0001)"
                  value={employeeSearch}
                  onChange={(e) => {
                    setEmployeeSearch(e.target.value);
                    setSelectedEmployee(null);
                  }}
                />
                {employeeSearchResults.length > 0 && !selectedEmployee && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                    {employeeSearchResults.map((emp) => (
                      <button
                        key={emp._id}
                        type="button"
                        onClick={() => {
                          setSelectedEmployee(emp);
                          setEmployeeSearch(`${emp.fullName} (${emp.employeeNumber})`);
                          setEmployeeSearchResults([]);
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-blue-50 focus:bg-blue-50 focus:outline-none border-b last:border-b-0"
                      >
                        <div className="font-medium text-gray-900">{emp.fullName}</div>
                        <div className="text-sm text-gray-500">{emp.employeeNumber}</div>
                        {emp.workEmail && (
                          <div className="text-xs text-gray-400">{emp.workEmail}</div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
                {searchingEmployees && (
                  <p className="mt-1 text-xs text-gray-500">Searching...</p>
                )}
              </div>

              {selectedEmployee && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="text-sm font-medium text-blue-900">
                    Selected: {selectedEmployee.fullName}
                  </p>
                  <p className="text-xs text-blue-700">
                    {selectedEmployee.employeeNumber}
                  </p>
                </div>
              )}

              <div className="flex items-center gap-2">
                <input
                  id="activeOnly"
                  type="checkbox"
                  checked={activeOnly}
                  onChange={(e) => setActiveOnly(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="activeOnly" className="text-sm text-gray-700">
                  Show active assignments only
                </label>
              </div>
              <div className="flex gap-3">
                <Button
                  variant="primary"
                  onClick={goEmployee}
                  disabled={!selectedEmployee}
                >
                  View Employee Assignments
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setEmployeeSearch("");
                    setSelectedEmployee(null);
                    setEmployeeSearchResults([]);
                  }}
                  disabled={!selectedEmployee && !employeeSearch}
                >
                  Clear
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle>Find by Position</CardTitle>
              <CardDescription>
                Search by position title or code
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Input
                  label="Search Position"
                  placeholder="Type position title or code"
                  value={positionSearch}
                  onChange={(e) => {
                    setPositionSearch(e.target.value);
                    setSelectedPosition(null);
                  }}
                />
                {positionSearchResults.length > 0 && !selectedPosition && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                    {positionSearchResults.map((pos) => {
                      const posId = typeof pos._id === "string" ? pos._id : (pos._id as any)?.toString() || "";
                      return (
                        <button
                          key={posId}
                          type="button"
                          onClick={() => {
                            setSelectedPosition(pos);
                            setPositionSearch(`${pos.title} (${pos.code || "N/A"})`);
                            setPositionSearchResults([]);
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-blue-50 focus:bg-blue-50 focus:outline-none border-b last:border-b-0"
                        >
                          <div className="font-medium text-gray-900">{pos.title}</div>
                          <div className="text-sm text-gray-500">
                            Code: {pos.code || "N/A"}
                            {pos.departmentId && typeof pos.departmentId === "object" && (
                              <span className="ml-2">
                                • {(pos.departmentId as any).name || "Dept"}
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
                {searchingPositions && (
                  <p className="mt-1 text-xs text-gray-500">Searching...</p>
                )}
              </div>

              {selectedPosition && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="text-sm font-medium text-blue-900">
                    Selected: {selectedPosition.title}
                  </p>
                  <p className="text-xs text-blue-700">
                    Code: {selectedPosition.code || "N/A"}
                  </p>
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  variant="primary"
                  onClick={goPosition}
                  disabled={!selectedPosition}
                >
                  View Position Assignments
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setPositionSearch("");
                    setSelectedPosition(null);
                    setPositionSearchResults([]);
                  }}
                  disabled={!selectedPosition && !positionSearch}
                >
                  Clear
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {!canCreateAssignments && (
          <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-md">
            <p className="text-amber-800 text-sm">
              You can view assignments, but only <b>HR Admin</b> and{" "}
              <b>System Admin</b> can create/update/end assignments.
            </p>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
