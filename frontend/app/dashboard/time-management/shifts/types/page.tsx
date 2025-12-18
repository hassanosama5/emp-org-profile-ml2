"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/hooks/use-auth";
import { useRouter } from "next/navigation";
import { ShiftTypeForm, ShiftType } from "@/components/time-management/ShiftTypeForm";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/shared/ui/Card";
import { SystemRole } from "@/types";
import api from "@/lib/api/client";

export default function ShiftTypesPage() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();

  const [shiftTypes, setShiftTypes] = useState<ShiftType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingShiftType, setEditingShiftType] = useState<ShiftType | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [filterActive, setFilterActive] = useState<"all" | "active" | "inactive">("all");

  // Check if user has permission (HR Manager or System Admin)
  const hasPermission = user?.roles?.some(
    (role) => role === SystemRole.HR_MANAGER || role === SystemRole.SYSTEM_ADMIN
  );

  const canView = user?.roles?.some(
    (role) =>
      role === SystemRole.HR_MANAGER ||
      role === SystemRole.SYSTEM_ADMIN ||
      role === SystemRole.HR_ADMIN ||
      role === SystemRole.DEPARTMENT_HEAD
  );

  // Fetch shift types
  const fetchShiftTypes = async () => {
    try {
      setLoading(true);
      setError(null);

      let url = "/shift-schedule/shift/types";
      if (filterActive !== "all") {
        url += `?active=${filterActive === "active"}`;
      }

      const response = await api.get(url);
      const data = Array.isArray(response) ? response : response.data || [];
      setShiftTypes(data);
    } catch (err: any) {
      console.error("Failed to fetch shift types:", err);
      setError(err.message || "Failed to load shift types");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && isAuthenticated && canView) {
      fetchShiftTypes();
    }
  }, [authLoading, isAuthenticated, canView, filterActive]);

  // Handle delete
  const handleDelete = async (id: string) => {
    try {
      setDeleteLoading(true);
      await api.delete(`/shift-schedule/shift/type/${id}`);
      setShiftTypes((prev) => prev.filter((st) => st._id !== id));
      setDeleteConfirm(null);
    } catch (err: any) {
      console.error("Failed to delete shift type:", err);
      setError(err.message || "Failed to delete shift type");
    } finally {
      setDeleteLoading(false);
    }
  };

  // Handle form success
  const handleFormSuccess = (shiftType: ShiftType) => {
    if (editingShiftType) {
      // Update existing
      setShiftTypes((prev) =>
        prev.map((st) => (st._id === shiftType._id ? shiftType : st))
      );
      setEditingShiftType(null);
    } else {
      // Add new
      setShiftTypes((prev) => [shiftType, ...prev]);
      setShowCreateForm(false);
    }
  };

  // Loading state
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Permission check
  if (!canView) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <h2 className="text-xl font-semibold text-red-800 mb-2">Access Denied</h2>
          <p className="text-red-600">
            You don&apos;t have permission to view this page. This page is only accessible to
            HR Managers, System Admins, HR Admins, and Department Heads.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Shift Types Management</h1>
          <p className="text-gray-600 mt-1">
            Create and manage shift types for your organization (BR-TM-02)
          </p>
        </div>
        {hasPermission && !showCreateForm && !editingShiftType && (
          <button
            onClick={() => setShowCreateForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Shift Type
          </button>
        )}
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
          <svg className="h-5 w-5 text-red-600 mt-0.5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="flex-1">
            <p className="text-red-800">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="text-red-600 hover:text-red-800">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Create/Edit Form */}
      {(showCreateForm || editingShiftType) && hasPermission && (
        <div className="mb-8">
          <ShiftTypeForm
            shiftType={editingShiftType}
            onSuccess={handleFormSuccess}
            onCancel={() => {
              setShowCreateForm(false);
              setEditingShiftType(null);
            }}
          />
        </div>
      )}

      {/* Filter Controls */}
      <div className="mb-6 flex items-center gap-4">
        <span className="text-sm font-medium text-gray-700">Filter:</span>
        <div className="flex gap-2">
          {(["all", "active", "inactive"] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setFilterActive(filter)}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                filterActive === filter
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {filter.charAt(0).toUpperCase() + filter.slice(1)}
            </button>
          ))}
        </div>
        <button
          onClick={fetchShiftTypes}
          className="ml-auto px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {/* Shift Types List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            </div>
          ))}
        </div>
      ) : shiftTypes.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Shift Types Found</h3>
            <p className="text-gray-600 mb-4">
              {filterActive !== "all"
                ? `No ${filterActive} shift types found. Try changing the filter.`
                : "Get started by creating your first shift type."}
            </p>
            {hasPermission && filterActive === "all" && (
              <button
                onClick={() => setShowCreateForm(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Create Shift Type
              </button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {shiftTypes.map((shiftType) => (
            <Card key={shiftType._id} className="relative">
              {/* Status Badge */}
              <div className="absolute top-4 right-4">
                <span
                  className={`px-2 py-1 text-xs font-medium rounded-full ${
                    shiftType.active
                      ? "bg-green-100 text-green-800"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {shiftType.active ? "Active" : "Inactive"}
                </span>
              </div>

              <CardHeader>
                <CardTitle className="pr-16">{shiftType.name}</CardTitle>
                <CardDescription>
                  Shift Type ID: {shiftType._id.slice(-8)}
                </CardDescription>
              </CardHeader>

              <CardContent>
                {shiftType.createdAt && (
                  <p className="text-sm text-gray-500 mb-4">
                    Created: {new Date(shiftType.createdAt).toLocaleDateString()}
                  </p>
                )}

                {/* Actions */}
                {hasPermission && (
                  <div className="flex gap-2 pt-4 border-t">
                    <button
                      onClick={() => {
                        setEditingShiftType(shiftType);
                        setShowCreateForm(false);
                      }}
                      className="flex-1 px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      Edit
                    </button>
                    {deleteConfirm === shiftType._id ? (
                      <div className="flex-1 flex gap-1">
                        <button
                          onClick={() => handleDelete(shiftType._id)}
                          disabled={deleteLoading}
                          className="flex-1 px-2 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
                        >
                          {deleteLoading ? "..." : "Confirm"}
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          className="px-2 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirm(shiftType._id)}
                        className="flex-1 px-3 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Info Section */}
      <div className="mt-8 p-6 bg-gray-50 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">About Shift Types</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
          <div>
            <h4 className="font-medium text-gray-800 mb-1">Common Shift Types:</h4>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>Normal:</strong> Standard working hours (e.g., 9 AM - 5 PM)</li>
              <li><strong>Split:</strong> Shift with a break (e.g., 9 AM - 1 PM, 4 PM - 8 PM)</li>
              <li><strong>Overnight:</strong> Night shift spanning two days</li>
              <li><strong>Rotational:</strong> Rotating between different shift times</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-gray-800 mb-1">Next Steps:</h4>
            <ul className="list-disc list-inside space-y-1">
              <li>After creating shift types, create specific shifts with times</li>
              <li>Assign shifts to employees, departments, or positions</li>
              <li>Configure overtime and lateness rules for each shift</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

