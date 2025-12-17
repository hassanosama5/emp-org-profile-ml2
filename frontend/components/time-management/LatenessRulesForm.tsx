"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/shared/ui/Button";
import { Input } from "@/components/shared/ui/Input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/shared/ui/Card";
import { useToast } from "@/components/leaves/Toast";
import { useAuth } from "@/lib/hooks/use-auth";
import { SystemRole } from "@/types";
import {
  policyConfigApi,
  LatenessRule,
  CreateLatenessRuleDto,
} from "@/lib/api/time-management/policy-config.api";

// ===== TYPES =====
export interface LatenessRulesFormProps {
  /** Lateness rule being edited (null for create mode) */
  latenessRule?: LatenessRule | null;
  /** Called after successful create/update */
  onSuccess?: (latenessRule: LatenessRule) => void;
  /** Called when user cancels */
  onCancel?: () => void;
}

// Predefined rule templates for BR-TM-11
const RULE_TEMPLATES = [
  {
    name: "Standard Lateness Policy",
    description: "Standard policy with 15-minute grace period and standard deduction",
    gracePeriodMinutes: 15,
    deductionForEachMinute: 1,
  },
  {
    name: "Strict Lateness Policy",
    description: "No grace period - deductions start from first minute late",
    gracePeriodMinutes: 0,
    deductionForEachMinute: 2,
  },
  {
    name: "Lenient Lateness Policy",
    description: "Generous 30-minute grace period with minimal deduction",
    gracePeriodMinutes: 30,
    deductionForEachMinute: 0.5,
  },
  {
    name: "Flexible Shift Lateness",
    description: "For flexible schedules with longer grace period",
    gracePeriodMinutes: 45,
    deductionForEachMinute: 0,
  },
  {
    name: "High Penalty Policy",
    description: "Short grace period with escalated deduction for chronic lateness",
    gracePeriodMinutes: 5,
    deductionForEachMinute: 3,
  },
];

export default function LatenessRulesForm({
  latenessRule,
  onSuccess,
  onCancel,
}: LatenessRulesFormProps) {
  const { toast, showToast } = useToast();
  const { user } = useAuth();

  // Role-based permission check (BR-TM-11: HR Manager can set grace periods and penalties)
  const canManageRules = user?.roles?.includes(SystemRole.HR_MANAGER);

  // Form state
  const [formData, setFormData] = useState<CreateLatenessRuleDto>({
    name: "",
    description: "",
    gracePeriodMinutes: 15,
    deductionForEachMinute: 1,
    active: true,
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initialize form with existing rule data if editing
  useEffect(() => {
    if (latenessRule) {
      setFormData({
        name: latenessRule.name,
        description: latenessRule.description || "",
        gracePeriodMinutes: latenessRule.gracePeriodMinutes,
        deductionForEachMinute: latenessRule.deductionForEachMinute,
        active: latenessRule.active,
      });
    }
  }, [latenessRule]);

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Rule name is required";
    }

    if (!formData.description.trim()) {
      newErrors.description = "Description is required";
    }

    if (formData.gracePeriodMinutes < 0) {
      newErrors.gracePeriodMinutes = "Grace period cannot be negative";
    }

    if (formData.gracePeriodMinutes > 120) {
      newErrors.gracePeriodMinutes = "Grace period cannot exceed 120 minutes (2 hours)";
    }

    if (formData.deductionForEachMinute < 0) {
      newErrors.deductionForEachMinute = "Deduction cannot be negative";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    if (!canManageRules) {
      showToast("You don't have permission to manage lateness rules", "error");
      return;
    }

    setLoading(true);

    try {
      let result: LatenessRule;

      if (latenessRule?._id) {
        // Update existing rule
        result = await policyConfigApi.updateLatenessRule(latenessRule._id, formData);
        showToast("Lateness rule updated successfully", "success");
      } else {
        // Create new rule
        result = await policyConfigApi.createLatenessRule(formData);
        showToast("Lateness rule created successfully", "success");
      }

      onSuccess?.(result);
    } catch (error: any) {
      showToast(error.message || "Failed to save lateness rule", "error");
    } finally {
      setLoading(false);
    }
  };

  // Apply template
  const applyTemplate = (template: typeof RULE_TEMPLATES[0]) => {
    setFormData(prev => ({
      ...prev,
      name: template.name,
      description: template.description,
      gracePeriodMinutes: template.gracePeriodMinutes,
      deductionForEachMinute: template.deductionForEachMinute,
    }));
    setErrors({});
  };

  // Calculate estimated monthly impact
  const calculateMonthlyImpact = () => {
    // Assume average 10 late arrivals per month, 15 minutes each
    const avgLateMinutes = 15;
    const avgLateInstances = 10;
    const effectiveLateMinutes = Math.max(0, avgLateMinutes - formData.gracePeriodMinutes);
    const monthlyDeduction = effectiveLateMinutes * formData.deductionForEachMinute * avgLateInstances;
    return monthlyDeduction;
  };

  if (!canManageRules) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="text-gray-400 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Access Restricted</h3>
          <p className="text-gray-500">
            Only HR Managers and System Admins can manage lateness rules.
          </p>
        </CardContent>
      </Card>
    );
  }

  const isEditMode = !!latenessRule?._id;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Quick Templates */}
      {!isEditMode && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Templates</CardTitle>
            <CardDescription>
              Start with a pre-configured template or create a custom rule
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {RULE_TEMPLATES.map((template, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => applyTemplate(template)}
                  className="p-3 text-left border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
                >
                  <div className="font-medium text-gray-900 text-sm">{template.name}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    Grace: {template.gracePeriodMinutes}min | Deduction: {template.deductionForEachMinute}/min
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rule Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {isEditMode ? "Edit Lateness Rule" : "Rule Details"}
          </CardTitle>
          <CardDescription>
            Configure grace period and penalty settings (BR-TM-11)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rule Name <span className="text-red-500">*</span>
            </label>
            <Input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Standard Lateness Policy"
              className={errors.name ? "border-red-500" : ""}
            />
            {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe when this rule applies and its purpose..."
              rows={3}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.description ? "border-red-500" : "border-gray-300"
              }`}
            />
            {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description}</p>}
          </div>

          {/* Grace Period & Deduction */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Grace Period (minutes) <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                min="0"
                max="120"
                value={formData.gracePeriodMinutes}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  gracePeriodMinutes: parseInt(e.target.value) || 0 
                }))}
                className={errors.gracePeriodMinutes ? "border-red-500" : ""}
              />
              {errors.gracePeriodMinutes && (
                <p className="text-red-500 text-sm mt-1">{errors.gracePeriodMinutes}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Time after shift start before lateness is recorded (0-120 min)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Deduction per Minute <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                min="0"
                step="0.1"
                value={formData.deductionForEachMinute}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  deductionForEachMinute: parseFloat(e.target.value) || 0 
                }))}
                className={errors.deductionForEachMinute ? "border-red-500" : ""}
              />
              {errors.deductionForEachMinute && (
                <p className="text-red-500 text-sm mt-1">{errors.deductionForEachMinute}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Amount deducted for each minute late (after grace period)
              </p>
            </div>
          </div>

          {/* Active Status */}
          <div className="flex items-center gap-3 pt-2">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.active}
                onChange={(e) => setFormData(prev => ({ ...prev, active: e.target.checked }))}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
            <span className="text-sm font-medium text-gray-700">
              Active Rule
            </span>
            <span className={`text-xs px-2 py-1 rounded-full ${
              formData.active 
                ? "bg-green-100 text-green-800" 
                : "bg-gray-100 text-gray-800"
            }`}>
              {formData.active ? "Will be applied" : "Inactive"}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Impact Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Impact Preview</CardTitle>
          <CardDescription>
            Estimated impact based on average lateness patterns
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm text-gray-500">Grace Period</div>
              <div className="text-2xl font-bold text-gray-900">
                {formData.gracePeriodMinutes} min
              </div>
              <div className="text-xs text-gray-500 mt-1">
                No penalty until {formData.gracePeriodMinutes} minutes late
              </div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm text-gray-500">Penalty Rate</div>
              <div className="text-2xl font-bold text-gray-900">
                {formData.deductionForEachMinute}/min
              </div>
              <div className="text-xs text-gray-500 mt-1">
                After grace period expires
              </div>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-sm text-blue-600">Est. Monthly Impact</div>
              <div className="text-2xl font-bold text-blue-700">
                {calculateMonthlyImpact().toFixed(1)}
              </div>
              <div className="text-xs text-blue-500 mt-1">
                Based on avg. 10 late arrivals, 15min each
              </div>
            </div>
          </div>

          {/* Example Calculation */}
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h4 className="text-sm font-medium text-yellow-800 mb-2">Example Calculation</h4>
            <p className="text-sm text-yellow-700">
              If an employee arrives <strong>20 minutes late</strong>:
              <br />
              • Effective late time: {Math.max(0, 20 - formData.gracePeriodMinutes)} minutes
              <br />
              • Deduction: {Math.max(0, 20 - formData.gracePeriodMinutes)} × {formData.deductionForEachMinute} = <strong>{(Math.max(0, 20 - formData.gracePeriodMinutes) * formData.deductionForEachMinute).toFixed(1)}</strong>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Form Actions */}
      <div className="flex justify-end gap-3 pt-4">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" variant="primary" disabled={loading}>
          {loading ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              {isEditMode ? "Updating..." : "Creating..."}
            </>
          ) : (
            isEditMode ? "Update Rule" : "Create Rule"
          )}
        </Button>
      </div>
    </form>
  );
}
