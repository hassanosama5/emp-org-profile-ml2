"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/hooks/use-auth";
import { useRouter } from "next/navigation";
import { SystemRole } from "@/types";
import {
  shiftScheduleApi,
  ScheduleRule,
} from "@/lib/api/time-management/shift-schedule.api";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/shared/ui/Card";
import { Button } from "@/components/shared/ui/Button";
import { Select } from "@/components/leaves/Select";
import { Modal } from "@/components/leaves/Modal";
import { Toast, useToast } from "@/components/leaves/Toast";
import { SchedulingRulesForm } from "@/components/time-management/SchedulingRulesForm";

export default function SchedulingRulesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast, showToast, hideToast } = useToast();

  // Role check: Only HR_MANAGER can manage scheduling rules (per BR-TM-03)
  const canManageRules = user?.roles?.includes(SystemRole.HR_MANAGER);

  // Redirect if not authorized
  useEffect(() => {
    if (!authLoading && user && !canManageRules) {
      router.push('/dashboard');
    }
  }, [authLoading, user, canManageRules, router]);

  // State
  const [rules, setRules] = useState<ScheduleRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<ScheduleRule | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Load rules
  const loadRules = useCallback(async () => {
    try {
      setLoading(true);
      const activeFilter = filter === 'all' ? undefined : filter === 'active';
      const data = await shiftScheduleApi.getScheduleRules(activeFilter);
      setRules(data);
    } catch (error: any) {
      showToast(error.message || "Failed to load scheduling rules", "error");
    } finally {
      setLoading(false);
    }
  }, [filter, showToast]);

  useEffect(() => {
    if (canManageRules) {
      loadRules();
    }
  }, [canManageRules, loadRules]);

  // Handlers
  const handleOpenCreate = () => {
    setIsCreateModalOpen(true);
  };

  const handleOpenEdit = (rule: ScheduleRule) => {
    setEditingRule(rule);
    setIsEditModalOpen(true);
  };

  const handleCreateSuccess = (rule: ScheduleRule) => {
    setIsCreateModalOpen(false);
    loadRules();
  };

  const handleEditSuccess = (rule: ScheduleRule) => {
    setIsEditModalOpen(false);
    setEditingRule(null);
    loadRules();
  };

  const handleDelete = async (id: string) => {
    try {
      await shiftScheduleApi.deleteScheduleRule(id);
      showToast("Schedule rule deleted successfully", "success");
      setDeleteConfirmId(null);
      loadRules();
    } catch (error: any) {
      showToast(error.message || "Failed to delete schedule rule", "error");
    }
  };

  const getPatternDescription = (pattern: string): string => {
    const match = pattern.match(/^(\d+)-ON\/(\d+)-OFF$/i);
    if (match) {
      return `Work ${match[1]} days, off ${match[2]} days`;
    }
    if (pattern === "FLEX-IN/FLEX-OUT") {
      return "Flexible arrival and departure times";
    }
    if (pattern === "ROTATIONAL") {
      return "Rotating between different shifts";
    }
    return pattern;
  };

  // Loading state
  if (authLoading) {
    return (
      <div className="container mx-auto px-6 py-8">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  // Access denied
  if (!canManageRules) {
    return (
      <div className="container mx-auto px-6 py-8">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-red-500">
              Access Denied: Only HR Manager can manage scheduling rules.
            </p>
          </CardContent>
        </Card>
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
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Scheduling Rules</h1>
          <p className="text-gray-600 mt-1">
            Define custom scheduling patterns for shift assignments (BR-TM-03)
          </p>
        </div>
        <Button onClick={handleOpenCreate}>Create Rule</Button>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Select
              label="Status"
              value={filter}
              onChange={(e) => setFilter(e.target.value as 'all' | 'active' | 'inactive')}
              options={[
                { value: "all", label: "All Rules" },
                { value: "active", label: "Active Only" },
                { value: "inactive", label: "Inactive Only" },
              ]}
            />
          </div>
        </CardContent>
      </Card>

      {/* Rules List */}
      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Loading...</p>
        </div>
      ) : rules.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500 mb-4">
              No scheduling rules found. Create your first rule to get started.
            </p>
            <Button onClick={handleOpenCreate}>Create Rule</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rules.map((rule) => (
            <Card key={rule._id} className={`border-l-4 ${rule.active ? 'border-l-green-500' : 'border-l-gray-300'}`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{rule.name}</CardTitle>
                    <div className="mt-2">
                      <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 font-mono text-sm rounded">
                        {rule.pattern}
                      </span>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    rule.active 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {rule.active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">
                  {getPatternDescription(rule.pattern)}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenEdit(rule)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:bg-red-50"
                    onClick={() => setDeleteConfirmId(rule._id)}
                  >
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create Scheduling Rule"
        size="lg"
      >
        <SchedulingRulesForm
          onSuccess={handleCreateSuccess}
          onCancel={() => setIsCreateModalOpen(false)}
        />
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingRule(null);
        }}
        title="Edit Scheduling Rule"
        size="lg"
      >
        <SchedulingRulesForm
          scheduleRule={editingRule}
          onSuccess={handleEditSuccess}
          onCancel={() => {
            setIsEditModalOpen(false);
            setEditingRule(null);
          }}
        />
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        title="Delete Scheduling Rule"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              Cancel
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700"
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
            >
              Delete
            </Button>
          </>
        }
      >
        <p className="text-gray-600">
          Are you sure you want to delete this scheduling rule? This action cannot be undone.
        </p>
      </Modal>
    </div>
  );
}
