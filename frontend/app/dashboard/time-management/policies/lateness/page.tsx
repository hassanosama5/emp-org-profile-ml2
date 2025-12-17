"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth, useRequireAuth } from "@/lib/hooks/use-auth";
import { SystemRole } from "@/types";
import { policyConfigApi, LatenessRule } from "@/lib/api/time-management/policy-config.api";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/shared/ui/Card";
import { Button } from "@/components/shared/ui/Button";
import { Modal } from "@/components/leaves/Modal";
import { Toast, useToast } from "@/components/leaves/Toast";
import LatenessRulesForm from "@/components/time-management/LatenessRulesForm";

export default function LatenessPoliciesPage() {
  const { user, loading: authLoading } = useAuth();
  useRequireAuth(SystemRole.HR_MANAGER);
  const { toast, showToast, hideToast } = useToast();

  const [rules, setRules] = useState<LatenessRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRule, setSelectedRule] = useState<LatenessRule | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Filters
  const [filters, setFilters] = useState({
    active: "",
    search: "",
  });

  const canEdit = user?.roles?.includes(SystemRole.HR_MANAGER);

  const loadRules = useCallback(async () => {
    try {
      setLoading(true);
      const queryFilters: Record<string, boolean> = {};
      if (filters.active !== "") {
        queryFilters.active = filters.active === "true";
      }
      const data = await policyConfigApi.getLatenessRules(queryFilters);
      
      // Apply search filter client-side
      let filteredData = data;
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        filteredData = data.filter(
          rule =>
            rule.name.toLowerCase().includes(searchLower) ||
            (rule.description && rule.description.toLowerCase().includes(searchLower))
        );
      }
      
      setRules(filteredData);
    } catch (error: any) {
      showToast(error.message || "Failed to load lateness rules", "error");
    } finally {
      setLoading(false);
    }
  }, [filters, showToast]);

  useEffect(() => {
    loadRules();
  }, [loadRules]);

  const handleDelete = async () => {
    if (!selectedRule?._id) return;
    
    try {
      setDeleting(true);
      await policyConfigApi.deleteLatenessRule(selectedRule._id);
      showToast("Lateness rule deleted successfully", "success");
      setIsDeleteModalOpen(false);
      setSelectedRule(null);
      loadRules();
    } catch (error: any) {
      showToast(error.message || "Failed to delete lateness rule", "error");
    } finally {
      setDeleting(false);
    }
  };

  const handleCreateSuccess = () => {
    setIsCreateModalOpen(false);
    loadRules();
    showToast("Lateness rule created successfully", "success");
  };

  const handleEditSuccess = () => {
    setIsEditModalOpen(false);
    setSelectedRule(null);
    loadRules();
    showToast("Lateness rule updated successfully", "success");
  };

  const clearFilters = () => {
    setFilters({
      active: "",
      search: "",
    });
  };

  if (authLoading) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="text-center py-12">
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8">
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Lateness Rules</h1>
          <p className="text-gray-600 mt-1">
            Configure grace periods, thresholds, and penalty settings (BR-TM-11)
          </p>
        </div>
        {canEdit && (
          <Button variant="primary" onClick={() => setIsCreateModalOpen(true)}>
            + Create Rule
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <input
                type="text"
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                placeholder="Search by name or description..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Active Status</label>
              <select
                value={filters.active}
                onChange={(e) => setFilters(prev => ({ ...prev, active: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All</option>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>
            <div className="flex items-end">
              <Button variant="outline" onClick={clearFilters}>
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rules List */}
      <Card>
        <CardHeader>
          <CardTitle>Lateness Rules ({rules.length})</CardTitle>
          <CardDescription>
            Define grace periods and automatic deductions for late arrivals
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Loading lateness rules...</p>
            </div>
          ) : rules.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Lateness Rules</h3>
              <p className="text-gray-500 mb-4">
                {filters.search || filters.active
                  ? "No rules match your filters. Try adjusting the criteria."
                  : "Get started by creating your first lateness rule."
                }
              </p>
              {canEdit && !filters.search && !filters.active && (
                <Button variant="primary" onClick={() => setIsCreateModalOpen(true)}>
                  + Create Rule
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Grace Period
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Deduction/Min
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    {canEdit && (
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {rules.map((rule) => (
                    <tr key={rule._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{rule.name}</div>
                        <div className="text-sm text-gray-500 max-w-xs truncate">
                          {rule.description || "-"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {rule.gracePeriodMinutes} min
                        </div>
                        <div className="text-xs text-gray-500">
                          {rule.gracePeriodMinutes === 0 ? "No grace period" : `${rule.gracePeriodMinutes} min tolerance`}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {rule.deductionForEachMinute}
                        </div>
                        <div className="text-xs text-gray-500">
                          per minute late
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            rule.active
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {rule.active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      {canEdit && (
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedRule(rule);
                              setIsEditModalOpen(true);
                            }}
                            className="text-blue-600 hover:text-blue-800 mr-2"
                          >
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedRule(rule);
                              setIsDeleteModalOpen(true);
                            }}
                            className="text-red-600 hover:text-red-800"
                          >
                            Delete
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create Lateness Rule"
        size="lg"
      >
        <LatenessRulesForm
          latenessRule={null}
          onSuccess={handleCreateSuccess}
          onCancel={() => setIsCreateModalOpen(false)}
        />
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedRule(null);
        }}
        title="Edit Lateness Rule"
        size="lg"
      >
        {selectedRule && (
          <LatenessRulesForm
            latenessRule={selectedRule}
            onSuccess={handleEditSuccess}
            onCancel={() => {
              setIsEditModalOpen(false);
              setSelectedRule(null);
            }}
          />
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedRule(null);
        }}
        title="Delete Lateness Rule"
        size="sm"
      >
        <div className="p-4">
          <p className="text-gray-700 mb-6">
            Are you sure you want to delete the lateness rule{" "}
            <strong>&quot;{selectedRule?.name}&quot;</strong>? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteModalOpen(false);
                setSelectedRule(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

