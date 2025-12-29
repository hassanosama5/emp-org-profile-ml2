"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/shared/ui/Button";
import { Input } from "@/components/shared/ui/Input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/shared/ui/Card";
import { Select } from "@/components/leaves/Select";
import { useToast } from "@/components/leaves/Toast";
import { useAuth } from "@/lib/hooks/use-auth";
import { SystemRole } from "@/types";
import {
  policyConfigApi,
  OvertimeRule,
  CreateOvertimeRuleDto,
} from "@/lib/api/time-management/policy-config.api";

// ===== TYPES =====
export interface OvertimeRulesFormProps {
  /** Overtime rule being edited (null for create mode) */
  overtimeRule?: OvertimeRule | null;
  /** Called after successful create/update */
  onSuccess?: (overtimeRule: OvertimeRule) => void;
  /** Called when user cancels */
  onCancel?: () => void;
}

// Predefined rule templates for BR-TM-10
const RULE_TEMPLATES = [
  {
    name: "Standard Overtime",
    description: "Regular overtime rates apply after standard working hours (8+ hours per day)",
  },
  {
    name: "Short-Time Rule",
    description: "Handling of hours worked below standard shift duration with deduction policies",
  },
  {
    name: "Weekend Work Rule",
    description: "Compensation rules for work performed on Saturdays and Sundays",
  },
  {
    name: "Holiday Overtime",
    description: "Premium rates for work on public holidays",
  },
  {
    name: "Night Shift Overtime",
    description: "Additional compensation for overtime during night hours (10 PM - 6 AM)",
  },
];

// ===== COMPONENT =====
export function OvertimeRulesForm({
  overtimeRule,
  onSuccess,
  onCancel,
}: OvertimeRulesFormProps) {
  const { user } = useAuth();
  const { showToast } = useToast();

  // Check if user can manage overtime rules (HR Manager only per BR-TM-10)
  const canManageRules = user?.roles?.includes(SystemRole.HR_MANAGER);

  // Form state
  const [name, setName] = useState(overtimeRule?.name || "");
  const [description, setDescription] = useState(overtimeRule?.description || "");
  const [active, setActive] = useState(overtimeRule?.active ?? true);
  const [approved, setApproved] = useState(overtimeRule?.approved ?? false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isEditMode = !!overtimeRule;

  // Reset form when overtimeRule prop changes
  useEffect(() => {
    if (overtimeRule) {
      setName(overtimeRule.name);
      setDescription(overtimeRule.description);
      setActive(overtimeRule.active);
      setApproved(overtimeRule.approved);
    } else {
      setName("");
      setDescription("");
      setActive(true);
      setApproved(false);
    }
    setErrors({});
  }, [overtimeRule]);

  // ===== VALIDATION =====
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = "Rule name is required";
    }

    if (!description.trim()) {
      newErrors.description = "Description is required";
    } else if (description.trim().length < 10) {
      newErrors.description = "Description must be at least 10 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ===== FORM SUBMISSION =====
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      const dto: CreateOvertimeRuleDto = {
        name: name.trim(),
        description: description.trim(),
        active,
        approved,
      };

      let result: OvertimeRule;

      if (isEditMode && overtimeRule) {
        result = await policyConfigApi.updateOvertimeRule(overtimeRule._id, dto);
        showToast("Overtime rule updated successfully", "success");
      } else {
        result = await policyConfigApi.createOvertimeRule(dto);
        showToast("Overtime rule created successfully", "success");
      }

      onSuccess?.(result);
    } catch (error: any) {
      showToast(error.message || "Failed to save overtime rule", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateSelect = (template: typeof RULE_TEMPLATES[0]) => {
    setName(template.name);
    setDescription(template.description);
  };

  // ===== ROLE CHECK =====
  if (!canManageRules) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-red-500">
            Access Denied: Only HR Manager or System Admin can manage overtime rules.
          </p>
        </CardContent>
      </Card>
    );
  }

  // ===== RENDER =====
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {isEditMode ? "Edit Overtime Rule" : "Create Overtime Rule"}
        </CardTitle>
        <CardDescription>
          {isEditMode
            ? "Update the overtime rule configuration"
            : "Define overtime calculation and approval rules (BR-TM-10)"
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Rule Templates */}
          {!isEditMode && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quick Templates
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {RULE_TEMPLATES.map((template) => (
                  <button
                    key={template.name}
                    type="button"
                    onClick={() => handleTemplateSelect(template)}
                    className={`p-3 text-left border rounded-lg hover:bg-amber-50 hover:border-amber-300 transition-colors ${
                      name === template.name
                        ? "bg-amber-50 border-amber-500"
                        : "border-gray-200"
                    }`}
                  >
                    <div className="font-medium text-sm text-gray-900">
                      {template.name}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Rule Name */}
          <Input
            label="Rule Name *"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Standard Overtime"
            error={errors.name}
          />

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description *
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the overtime rule, when it applies, and any special conditions..."
              rows={4}
              className={`w-full rounded-md border ${
                errors.description ? "border-red-500" : "border-gray-300"
              } px-3 py-2 text-sm placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-600">{errors.description}</p>
            )}
          </div>

          {/* Status Options */}
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Status *"
              value={active ? "true" : "false"}
              onChange={(e) => setActive(e.target.value === "true")}
              options={[
                { value: "true", label: "Active" },
                { value: "false", label: "Inactive" },
              ]}
            />
            <Select
              label="Approval Status *"
              value={approved ? "true" : "false"}
              onChange={(e) => setApproved(e.target.value === "true")}
              options={[
                { value: "false", label: "Pending Approval" },
                { value: "true", label: "Approved" },
              ]}
            />
          </div>

          {/* Status Indicators */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Rule Status Preview</h4>
            <div className="flex gap-4">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"
              }`}>
                {active ? "✓ Active" : "○ Inactive"}
              </span>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                approved ? "bg-blue-100 text-blue-800" : "bg-yellow-100 text-yellow-800"
              }`}>
                {approved ? "✓ Approved" : "⏳ Pending Approval"}
              </span>
            </div>
            {!approved && (
              <p className="mt-2 text-xs text-gray-500">
                Note: Rules pending approval may not be applied to overtime calculations until approved.
              </p>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
            <Button type="submit" disabled={loading}>
              {loading
                ? "Saving..."
                : isEditMode
                  ? "Update Rule"
                  : "Create Rule"
              }
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export default OvertimeRulesForm;
