"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth, useRequireAuth } from "@/lib/hooks/use-auth";
import { SystemRole } from "@/types";
import { policyConfigApi, PermissionPolicy } from "@/lib/api/time-management/policy-config.api";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/shared/ui/Card";
import { Button } from "@/components/shared/ui/Button";
import { Modal } from "@/components/leaves/Modal";
import { Toast, useToast } from "@/components/leaves/Toast";
import PermissionPolicyForm from "@/components/time-management/PermissionPolicyForm";

export default function PermissionPoliciesPage() {
  const { user, loading: authLoading } = useAuth();
  useRequireAuth(SystemRole.HR_ADMIN);
  const { toast, showToast, hideToast } = useToast();

  const [mounted, setMounted] = useState(false);
  const [policies, setPolicies] = useState<PermissionPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPolicy, setSelectedPolicy] = useState<PermissionPolicy | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const canEdit = user?.roles?.includes(SystemRole.HR_ADMIN);

  const loadPolicies = useCallback(async () => {
    try {
      setLoading(true);
      const data = await policyConfigApi.getPermissionPolicies();
      setPolicies(data || []);
    } catch (error: any) {
      console.error("Failed to load permission policies:", error);
      showToast(error.message || "Failed to load permission policies", "error");
      setPolicies([]);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showToast]);

  useEffect(() => {
    if (mounted) {
      loadPolicies();
    }
  }, [loadPolicies, mounted]);

  // Prevent hydration mismatch
  if (!mounted) {
    return null;
  }

  const handleDelete = async () => {
    if (!selectedPolicy?._id) return;
    
    try {
      setDeleting(true);
      await policyConfigApi.deletePermissionPolicy(selectedPolicy._id);
      showToast("Permission policy deleted successfully", "success");
      setIsDeleteModalOpen(false);
      setSelectedPolicy(null);
      loadPolicies();
    } catch (error: any) {
      showToast(error.message || "Failed to delete permission policy", "error");
    } finally {
      setDeleting(false);
    }
  };

  const handleCreateSuccess = () => {
    setIsCreateModalOpen(false);
    loadPolicies();
    showToast("Permission policy created successfully", "success");
  };

  const handleEditSuccess = () => {
    setIsEditModalOpen(false);
    setSelectedPolicy(null);
    loadPolicies();
    showToast("Permission policy updated successfully", "success");
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'EARLY_IN': 'Early In',
      'LATE_OUT': 'Late Out',
      'OUT_OF_HOURS': 'Out of Hours',
      'TOTAL_OVERTIME': 'Total Overtime',
      'SHORT_TIME': 'Short Time'
    };
    return labels[type] || type;
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
          <h1 className="text-3xl font-bold text-gray-900">Permission Policies</h1>
          <p className="text-gray-600 mt-1">
            Define limits for permission durations and payroll impact
          </p>
        </div>
        {canEdit && (
          <Button variant="primary" onClick={() => setIsCreateModalOpen(true)}>
            + Create Policy
          </Button>
        )}
      </div>

      {/* Policies List */}
      <Card>
        <CardHeader>
          <CardTitle>Time Permission Policies ({policies.length})</CardTitle>
          <CardDescription>
            Configure Early In, Late Out, Out of Hours, and Total Overtime limits with payroll impact
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Loading permission policies...</p>
            </div>
          ) : policies.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Permission Policies</h3>
              <p className="text-gray-500 mb-4">
                Get started by creating your first permission policy.
              </p>
              {canEdit && (
                <Button variant="primary" onClick={() => setIsCreateModalOpen(true)}>
                  + Create Policy
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
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Max Duration
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Approval Required
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Affects Payroll
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Active
                    </th>
                    {canEdit && (
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {policies.map((policy) => (
                    <tr key={policy._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{policy.name}</div>
                        <div className="text-sm text-gray-500">{policy.description}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                          {getTypeLabel(policy.permissionType)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {policy.maxDurationMinutes} min
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {policy.requiresApproval ? (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                            Yes
                          </span>
                        ) : (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                            No
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {policy.affectsPayroll ? (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            Yes
                          </span>
                        ) : (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                            No
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {policy.active ? (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            Active
                          </span>
                        ) : (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                            Inactive
                          </span>
                        )}
                      </td>
                      {canEdit && (
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => {
                              setSelectedPolicy(policy);
                              setIsEditModalOpen(true);
                            }}
                            className="text-blue-600 hover:text-blue-900 mr-4"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => {
                              setSelectedPolicy(policy);
                              setIsDeleteModalOpen(true);
                            }}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
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
        title="Create Permission Policy"
      >
        <PermissionPolicyForm
          onSuccess={handleCreateSuccess}
          onCancel={() => setIsCreateModalOpen(false)}
        />
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedPolicy(null);
        }}
        title="Edit Permission Policy"
      >
        {selectedPolicy && (
          <PermissionPolicyForm
            policy={selectedPolicy}
            onSuccess={handleEditSuccess}
            onCancel={() => {
              setIsEditModalOpen(false);
              setSelectedPolicy(null);
            }}
          />
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedPolicy(null);
        }}
        title="Delete Permission Policy"
      >
        <div className="space-y-4">
          <p className="text-gray-700">
            Are you sure you want to delete the policy <strong>{selectedPolicy?.name}</strong>? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteModalOpen(false);
                setSelectedPolicy(null);
              }}
              disabled={deleting}
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
