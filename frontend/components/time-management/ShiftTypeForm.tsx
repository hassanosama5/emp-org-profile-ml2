"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/hooks/use-auth";
import api from "@/lib/api/client";

// Shift Type interface matching backend schema
export interface ShiftType {
  _id: string;
  name: string;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateShiftTypeDto {
  name: string;
  active: boolean;
}

interface ShiftTypeFormProps {
  shiftType?: ShiftType | null; // For edit mode
  onSuccess?: (shiftType: ShiftType) => void;
  onCancel?: () => void;
}

// Predefined shift type suggestions (BR-TM-02)
const SHIFT_TYPE_SUGGESTIONS = [
  { name: "Normal", description: "Standard working hours (e.g., 9 AM - 5 PM)" },
  { name: "Split", description: "Shift with a break in between (e.g., 9 AM - 1 PM, 4 PM - 8 PM)" },
  { name: "Overnight", description: "Night shift spanning two days (e.g., 10 PM - 6 AM)" },
  { name: "Mission", description: "Special assignment or mission-based shift" },
  { name: "Rotational", description: "Rotating between different shift times" },
];

export function ShiftTypeForm({ shiftType, onSuccess, onCancel }: ShiftTypeFormProps) {
  const { user } = useAuth();
  const [name, setName] = useState(shiftType?.name || "");
  const [active, setActive] = useState(shiftType?.active ?? true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const isEditMode = !!shiftType;

  // Reset form when shiftType prop changes
  useEffect(() => {
    if (shiftType) {
      setName(shiftType.name);
      setActive(shiftType.active);
    } else {
      setName("");
      setActive(true);
    }
    setError(null);
    setSuccess(false);
  }, [shiftType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError("Shift type name is required");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const payload: CreateShiftTypeDto = {
        name: name.trim(),
        active,
      };

      let response: ShiftType;

      if (isEditMode && shiftType) {
        // Update existing shift type
        response = await api.put(`/shift-schedule/shift/type/${shiftType._id}`, payload);
      } else {
        // Create new shift type
        response = await api.post("/shift-schedule/shift/type", payload);
      }

      setSuccess(true);
      
      // Reset form after successful creation (not edit)
      if (!isEditMode) {
        setName("");
        setActive(true);
      }

      // Notify parent
      if (onSuccess) {
        setTimeout(() => {
          onSuccess(response);
        }, 1000);
      }
    } catch (err: any) {
      console.error("Failed to save shift type:", err);
      setError(err.response?.data?.message || err.message || "Failed to save shift type");
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setName(suggestion);
    setError(null);
  };

  if (success) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
            <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {isEditMode ? "Shift Type Updated!" : "Shift Type Created!"}
          </h3>
          <p className="text-sm text-gray-600">
            {isEditMode
              ? `The shift type "${name}" has been updated successfully.`
              : `The shift type "${name}" has been created and is now available for use.`}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        {isEditMode ? "Edit Shift Type" : "Create New Shift Type"}
      </h3>

      {/* Info Banner */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start">
          <svg className="h-5 w-5 text-blue-600 mt-0.5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-sm text-blue-800 font-medium">About Shift Types (BR-TM-02)</p>
            <p className="text-sm text-blue-700 mt-1">
              Shift types define the category of work schedules. Common types include Normal, Split, 
              Overnight, and Rotational shifts. Once created, you can create specific shifts with 
              start/end times under each type.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Name Field */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
            Shift Type Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError(null);
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter shift type name (e.g., Normal, Split, Overnight)"
            required
          />
        </div>

        {/* Quick Suggestions */}
        {!isEditMode && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quick Suggestions
            </label>
            <div className="flex flex-wrap gap-2">
              {SHIFT_TYPE_SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion.name}
                  type="button"
                  onClick={() => handleSuggestionClick(suggestion.name)}
                  className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                    name === suggestion.name
                      ? "bg-blue-100 border-blue-500 text-blue-700"
                      : "bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100"
                  }`}
                  title={suggestion.description}
                >
                  {suggestion.name}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Click a suggestion or enter your own custom shift type name.
            </p>
          </div>
        )}

        {/* Active Status */}
        <div>
          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <div>
              <span className="text-sm font-medium text-gray-700">Active</span>
              <p className="text-xs text-gray-500">
                Inactive shift types cannot be assigned to new shifts
              </p>
            </div>
          </label>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 pt-4 border-t">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
          >
            {loading && (
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            )}
            {loading ? "Saving..." : isEditMode ? "Update Shift Type" : "Create Shift Type"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default ShiftTypeForm;
