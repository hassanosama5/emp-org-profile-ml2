"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/shared/ui/Button";
import { policyConfigApi, PermissionPolicy, CreatePermissionPolicyDto, UpdatePermissionPolicyDto } from "@/lib/api/time-management/policy-config.api";

interface PermissionPolicyFormProps {
  policy?: PermissionPolicy;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function PermissionPolicyForm({ policy, onSuccess, onCancel }: PermissionPolicyFormProps) {
  const [formData, setFormData] = useState<CreatePermissionPolicyDto>({
    name: "",
    description: "",
    permissionType: "EARLY_IN",
    maxDurationMinutes: 60,
    requiresApproval: true,
    affectsPayroll: true,
    active: true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (policy) {
      setFormData({
        name: policy.name,
        description: policy.description,
        permissionType: policy.permissionType,
        maxDurationMinutes: policy.maxDurationMinutes,
        requiresApproval: policy.requiresApproval,
        affectsPayroll: policy.affectsPayroll,
        active: policy.active,
      });
    }
  }, [policy]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.name.trim()) {
      setError("Policy name is required");
      return;
    }
    if (!formData.description.trim()) {
      setError("Description is required");
      return;
    }
    if (formData.maxDurationMinutes <= 0) {
      setError("Max duration must be greater than 0");
      return;
    }
    if (formData.maxDurationMinutes > 1440) {
      setError("Max duration cannot exceed 1440 minutes (24 hours)");
      return;
    }

    try {
      setLoading(true);
      if (policy) {
        await policyConfigApi.updatePermissionPolicy(policy._id, formData as UpdatePermissionPolicyDto);
      } else {
        await policyConfigApi.createPermissionPolicy(formData);
      }
      onSuccess();
    } catch (err: any) {
      setError(err.message || "Failed to save permission policy");
    } finally {
      setLoading(false);
    }
  };

  const permissionTypes = [
    { value: 'EARLY_IN', label: 'Early In', description: 'Arriving before scheduled shift start' },
    { value: 'LATE_OUT', label: 'Late Out', description: 'Leaving after scheduled shift end' },
    { value: 'OUT_OF_HOURS', label: 'Out of Hours', description: 'Working outside regular hours' },
    { value: 'TOTAL_OVERTIME', label: 'Total Overtime', description: 'Overall overtime calculation' },
    { value: 'SHORT_TIME', label: 'Short Time', description: 'Working less than scheduled hours' },
  ];

  const presetDurations = [
    { label: '30 minutes', value: 30 },
    { label: '1 hour', value: 60 },
    { label: '2 hours', value: 120 },
    { label: '4 hours', value: 240 },
    { label: '8 hours', value: 480 },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Policy Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Policy Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="e.g., Standard Early In Policy"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Description <span className="text-red-500">*</span>
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Describe when this policy applies and its purpose..."
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
      </div>

      {/* Permission Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Permission Type <span className="text-red-500">*</span>
        </label>
        <select
          value={formData.permissionType}
          onChange={(e) => setFormData({ ...formData, permissionType: e.target.value as any })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        >
          {permissionTypes.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label} - {type.description}
            </option>
          ))}
        </select>
        <p className="mt-1 text-sm text-gray-500">
          {permissionTypes.find(t => t.value === formData.permissionType)?.description}
        </p>
      </div>

      {/* Max Duration */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Maximum Duration (minutes) <span className="text-red-500">*</span>
        </label>
        <input
          type="number"
          value={formData.maxDurationMinutes}
          onChange={(e) => setFormData({ ...formData, maxDurationMinutes: parseInt(e.target.value) || 0 })}
          min="1"
          max="1440"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
        <div className="mt-2 flex flex-wrap gap-2">
          <span className="text-sm text-gray-600">Quick select:</span>
          {presetDurations.map((preset) => (
            <button
              key={preset.value}
              type="button"
              onClick={() => setFormData({ ...formData, maxDurationMinutes: preset.value })}
              className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
            >
              {preset.label}
            </button>
          ))}
        </div>
        <p className="mt-1 text-sm text-gray-500">
          Maximum allowed: 1440 minutes (24 hours)
        </p>
      </div>

      {/* Requires Approval */}
      <div className="flex items-start">
        <div className="flex items-center h-5">
          <input
            type="checkbox"
            checked={formData.requiresApproval}
            onChange={(e) => setFormData({ ...formData, requiresApproval: e.target.checked })}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
        </div>
        <div className="ml-3">
          <label className="text-sm font-medium text-gray-700">
            Requires Approval
          </label>
          <p className="text-sm text-gray-500">
            Permissions of this type must be approved before taking effect
          </p>
        </div>
      </div>

      {/* Affects Payroll */}
      <div className="flex items-start">
        <div className="flex items-center h-5">
          <input
            type="checkbox"
            checked={formData.affectsPayroll}
            onChange={(e) => setFormData({ ...formData, affectsPayroll: e.target.checked })}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
        </div>
        <div className="ml-3">
          <label className="text-sm font-medium text-gray-700">
            Affects Payroll
          </label>
          <p className="text-sm text-gray-500">
            Only approved permissions of this type will impact payroll calculations
          </p>
        </div>
      </div>

      {/* Active Status */}
      <div className="flex items-start">
        <div className="flex items-center h-5">
          <input
            type="checkbox"
            checked={formData.active}
            onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
        </div>
        <div className="ml-3">
          <label className="text-sm font-medium text-gray-700">
            Active
          </label>
          <p className="text-sm text-gray-500">
            Enable this policy to start enforcing limits
          </p>
        </div>
      </div>

      {/* Policy Summary */}
      <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
        <h4 className="text-sm font-medium text-blue-900 mb-2">Policy Summary</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Type: {permissionTypes.find(t => t.value === formData.permissionType)?.label}</li>
          <li>• Max Duration: {formData.maxDurationMinutes} minutes ({(formData.maxDurationMinutes / 60).toFixed(1)} hours)</li>
          <li>• Approval: {formData.requiresApproval ? 'Required' : 'Not required'}</li>
          <li>• Payroll Impact: {formData.affectsPayroll ? 'Yes (only approved permissions)' : 'No'}</li>
          <li>• Status: {formData.active ? 'Active' : 'Inactive'}</li>
        </ul>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          disabled={loading}
        >
          {loading ? "Saving..." : policy ? "Update Policy" : "Create Policy"}
        </Button>
      </div>
    </form>
  );
}
