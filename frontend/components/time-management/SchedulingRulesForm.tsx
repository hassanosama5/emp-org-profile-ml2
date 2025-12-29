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
  shiftScheduleApi,
  ScheduleRule,
  CreateScheduleRuleDto,
} from "@/lib/api/time-management/shift-schedule.api";

// ===== TYPES =====
export interface SchedulingRulesFormProps {
  /** Schedule rule being edited (null for create mode) */
  scheduleRule?: ScheduleRule | null;
  /** Called after successful create/update */
  onSuccess?: (scheduleRule: ScheduleRule) => void;
  /** Called when user cancels */
  onCancel?: () => void;
}

// Predefined pattern suggestions for BR-TM-03
const PATTERN_SUGGESTIONS = [
  { 
    pattern: "5-ON/2-OFF", 
    name: "Standard Week",
    description: "Work 5 days, off 2 days (typical Mon-Fri)" 
  },
  { 
    pattern: "4-ON/3-OFF", 
    name: "4-Day Work Week",
    description: "Work 4 days, off 3 days" 
  },
  { 
    pattern: "6-ON/1-OFF", 
    name: "6-Day Work Week",
    description: "Work 6 days, off 1 day" 
  },
  { 
    pattern: "3-ON/3-OFF", 
    name: "Balanced Rotation",
    description: "Work 3 days, off 3 days" 
  },
  { 
    pattern: "2-ON/2-OFF", 
    name: "Short Rotation",
    description: "Work 2 days, off 2 days" 
  },
  { 
    pattern: "7-ON/7-OFF", 
    name: "Week On/Week Off",
    description: "Work 7 days, off 7 days" 
  },
  { 
    pattern: "FLEX-IN/FLEX-OUT", 
    name: "Flexible Hours",
    description: "Flexible arrival and departure times" 
  },
  { 
    pattern: "ROTATIONAL", 
    name: "Rotational Schedule",
    description: "Rotating shifts between morning, evening, night" 
  },
];

// ===== COMPONENT =====
export function SchedulingRulesForm({ 
  scheduleRule, 
  onSuccess, 
  onCancel 
}: SchedulingRulesFormProps) {
  const { user } = useAuth();
  const { showToast } = useToast();

  // Check if user can manage scheduling rules (Only HR Manager per BR-TM-03)
  const canManageRules = user?.roles?.includes(SystemRole.HR_MANAGER);

  // Form state
  const [name, setName] = useState(scheduleRule?.name || "");
  const [pattern, setPattern] = useState(scheduleRule?.pattern || "");
  const [active, setActive] = useState(scheduleRule?.active ?? true);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isEditMode = !!scheduleRule;

  // Reset form when scheduleRule prop changes
  useEffect(() => {
    if (scheduleRule) {
      setName(scheduleRule.name);
      setPattern(scheduleRule.pattern);
      setActive(scheduleRule.active);
    } else {
      setName("");
      setPattern("");
      setActive(true);
    }
    setErrors({});
  }, [scheduleRule]);

  // ===== VALIDATION =====
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = "Rule name is required";
    }

    if (!pattern.trim()) {
      newErrors.pattern = "Pattern is required";
    } else {
      // Validate pattern format (X-ON/Y-OFF or FLEX-IN/FLEX-OUT or ROTATIONAL)
      const validPatterns = [
        /^\d+-ON\/\d+-OFF$/i,  // e.g., 5-ON/2-OFF
        /^FLEX-IN\/FLEX-OUT$/i,
        /^ROTATIONAL$/i,
        /^FLEXIBLE$/i,
      ];
      const isValidPattern = validPatterns.some(regex => regex.test(pattern.toUpperCase()));
      if (!isValidPattern) {
        newErrors.pattern = "Invalid pattern format. Use formats like: 5-ON/2-OFF, FLEX-IN/FLEX-OUT, or ROTATIONAL";
      }
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
      const dto: CreateScheduleRuleDto = {
        name: name.trim(),
        pattern: pattern.toUpperCase().trim(),
        active,
      };

      let result: ScheduleRule;

      if (isEditMode && scheduleRule) {
        result = await shiftScheduleApi.updateScheduleRule(scheduleRule._id, dto);
        showToast("Schedule rule updated successfully", "success");
      } else {
        result = await shiftScheduleApi.createScheduleRule(dto);
        showToast("Schedule rule created successfully", "success");
      }

      onSuccess?.(result);
    } catch (error: any) {
      showToast(error.message || "Failed to save schedule rule", "error");
    } finally {
      setLoading(false);
    }
  };

  const handlePatternSelect = (suggestion: typeof PATTERN_SUGGESTIONS[0]) => {
    setPattern(suggestion.pattern);
    if (!name.trim()) {
      setName(suggestion.name);
    }
  };

  // ===== ROLE CHECK =====
  if (!canManageRules) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-red-500">
            Access Denied: Only HR Manager can manage scheduling rules.
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
          {isEditMode ? "Edit Schedule Rule" : "Create Schedule Rule"}
        </CardTitle>
        <CardDescription>
          {isEditMode 
            ? "Update the scheduling rule details"
            : "Define a new scheduling pattern for shift assignments (BR-TM-03)"
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Pattern Suggestions */}
          {!isEditMode && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quick Select Pattern
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {PATTERN_SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion.pattern}
                    type="button"
                    onClick={() => handlePatternSelect(suggestion)}
                    className={`p-3 text-left border rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors ${
                      pattern === suggestion.pattern 
                        ? "bg-blue-50 border-blue-500" 
                        : "border-gray-200"
                    }`}
                  >
                    <div className="font-medium text-sm text-gray-900">
                      {suggestion.name}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {suggestion.pattern}
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
            placeholder="e.g., Standard 5-Day Week"
            error={errors.name}
          />

          {/* Pattern */}
          <div>
            <Input
              label="Pattern *"
              value={pattern}
              onChange={(e) => setPattern(e.target.value.toUpperCase())}
              placeholder="e.g., 5-ON/2-OFF"
              error={errors.pattern}
            />
            <p className="mt-1 text-xs text-gray-500">
              Supported formats: X-ON/Y-OFF (e.g., 5-ON/2-OFF), FLEX-IN/FLEX-OUT, ROTATIONAL
            </p>
          </div>

          {/* Active Status */}
          <Select
            label="Status *"
            value={active ? "true" : "false"}
            onChange={(e) => setActive(e.target.value === "true")}
            options={[
              { value: "true", label: "Active" },
              { value: "false", label: "Inactive" },
            ]}
          />

          {/* Pattern Preview */}
          {pattern && (
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Pattern Preview</h4>
              <div className="text-lg font-mono text-blue-600">{pattern}</div>
              {pattern.match(/^(\d+)-ON\/(\d+)-OFF$/i) && (
                <p className="text-sm text-gray-600 mt-2">
                  Work {pattern.match(/^(\d+)-ON/i)?.[1]} days, then off {pattern.match(/(\d+)-OFF$/i)?.[1]} days
                </p>
              )}
              {pattern === "FLEX-IN/FLEX-OUT" && (
                <p className="text-sm text-gray-600 mt-2">
                  Employees can arrive and leave within flexible time windows
                </p>
              )}
              {pattern === "ROTATIONAL" && (
                <p className="text-sm text-gray-600 mt-2">
                  Employees rotate between different shift times (morning, evening, night)
                </p>
              )}
            </div>
          )}

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

export default SchedulingRulesForm;
