"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { SystemRole } from "@/types";
import { Button } from "@/components/shared/ui/Button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/shared/ui/Card";
import { useOrganizationStructure } from "@/lib/hooks/use-organization-structure";
import { DepartmentResponseDto } from "@/types/organization-structure";
import { Input } from "@/components/shared/ui/Input";
import { useAuth } from "@/lib/hooks/use-auth";

export default function DepartmentsPage() {
  const router = useRouter();
  const { getDepartments, deactivateDepartment, loading, error } = useOrganizationStructure();
  const [departments, setDepartments] = useState<DepartmentResponseDto[]>([]);
  const [filterActive, setFilterActive] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");

  useEffect(() => {
    fetchDepartments();
  }, [filterActive]);

  const fetchDepartments = async () => {
    try {
      const data = await getDepartments({ isActive: filterActive });
      setDepartments(data);
    } catch (err) {
      console.error("Failed to fetch departments:", err);
    }
  };

  const handleDeactivate = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to deactivate "${name}"? This department will be marked as inactive.`)) {
      return;
    }

    try {
      await deactivateDepartment(id);
      fetchDepartments(); // Refresh the list
    } catch (err) {
      console.error("Failed to deactivate department:", err);
    }
  };

  // Filter departments based on search query
  const filteredDepartments = departments.filter(dept =>
    dept.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    dept.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (dept.description && dept.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleCreateNew = () => {
    router.push("/dashboard/organization-structure/departments/new");
  };

  // REQ-SANV-01, REQ-SANV-02: Department Heads can view departments (read-only)
  // REQ-OSM-01, REQ-OSM-02: Only System Admin/HR Admin can manage
  const { user } = useAuth();
  const canManage = user?.roles?.some((r: string) => 
    [SystemRole.SYSTEM_ADMIN, SystemRole.HR_ADMIN].includes(r as SystemRole)
  );

  return (
    <ProtectedRoute allowedRoles={[
      SystemRole.SYSTEM_ADMIN, 
      SystemRole.HR_ADMIN, 
      SystemRole.HR_MANAGER,
      SystemRole.DEPARTMENT_HEAD
    ]}>
      <div className="container mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Departments</h1>
              <p className="text-gray-600 mt-1">
                Manage organizational departments and structure
              </p>
            </div>
            {canManage && (
              <Button
                onClick={handleCreateNew}
                variant="primary"
                className="whitespace-nowrap"
              >
                + Create New Department
              </Button>
            )}
          </div>
          
          {/* Filters and Search */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="activeFilter"
                  checked={filterActive}
                  onChange={(e) => setFilterActive(e.target.checked)}
                  className="rounded border-gray-300 focus:ring-blue-500"
                />
                <label htmlFor="activeFilter" className="text-sm font-medium text-gray-700">
                  Show active only
                </label>
              </div>
              
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <Input
                  type="text"
                  placeholder="Search departments..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-full md:w-64"
                />
              </div>
            </div>
            
            <Link
              href="/dashboard/organization-structure"
              className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
            >
              ← Back to Organization Structure
            </Link>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-red-800">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Departments Grid */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-600">Loading departments...</p>
          </div>
        ) : filteredDepartments.length === 0 ? (
          <Card className="border-2 border-dashed border-gray-300">
            <CardContent className="py-16 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-gray-100 mb-4">
                <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchQuery ? "No matching departments" : "No departments found"}
              </h3>
              <p className="text-gray-500 mb-6 max-w-md mx-auto">
                {searchQuery
                  ? "Try adjusting your search or filter to find what you're looking for."
                  : filterActive
                    ? "Get started by creating your first department."
                    : "No departments found with the current filter."}
              </p>
              {!searchQuery && canManage && (
                <Button onClick={handleCreateNew} variant="primary">
                  Create Your First Department
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Stats Summary */}
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-600">
                  Showing <span className="font-semibold">{filteredDepartments.length}</span> of{" "}
                  <span className="font-semibold">{departments.length}</span> departments
                </span>
                {searchQuery && (
                  <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                    Filtered
                  </span>
                )}
              </div>
              <div className="text-sm text-gray-500">
                {filterActive ? "Active departments only" : "All departments"}
              </div>
            </div>

            {/* Departments Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredDepartments.map((dept) => (
                <Card
                  key={dept._id}
                  className={`hover:shadow-lg transition-all duration-200 hover:-translate-y-1 ${
                    !dept.isActive ? "opacity-75 bg-gray-50" : "border-gray-200"
                  }`}
                >
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{dept.name}</CardTitle>
                        <CardDescription className="font-mono text-sm mt-1">
                          {dept.code}
                        </CardDescription>
                      </div>
                      <span
                        className={`px-3 py-1 text-xs font-medium rounded-full ${
                          dept.isActive
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {dept.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {dept.description && (
                      <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                        {dept.description}
                      </p>
                    )}
                    
                    <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                      <Button
                        onClick={() => router.push(`/dashboard/organization-structure/departments/${dept._id}`)}
                        variant="outline"
                        size="sm"
                      >
                        View Details
                      </Button>
                      
                      {dept.isActive && canManage && (
                        <div className="flex gap-2">
                          <Button
                            onClick={() => router.push(`/dashboard/organization-structure/departments/${dept._id}/edit`)}
                            variant="ghost"
                            size="sm"
                          >
                            Edit
                          </Button>
                          <Button
                            onClick={() => handleDeactivate(dept._id, dept.name)}
                            variant="danger"
                            size="sm"
                          >
                            Deactivate
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}

        {/* Footer */}
        <div className="mt-10 pt-8 border-t border-gray-200">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <p className="text-sm text-gray-600">
                Need help managing departments?{" "}
                <Link href="/dashboard/organization-structure/departments/hierarchy" className="text-blue-600 hover:underline">
                  View the department hierarchy
                </Link>
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Button
                onClick={handleCreateNew}
                variant="primary"
                size="sm"
              >
                + Add Another Department
              </Button>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}