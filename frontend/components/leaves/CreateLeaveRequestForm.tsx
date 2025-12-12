"use client";

import React, { useState, useEffect } from "react";
import { Button } from "../shared/ui/Button";
import { Input } from "../shared/ui/Input";
import { Select } from "./Select";
import { leavesApi } from "../../lib/api/leaves/leaves";
import { authApi } from "../../lib/api/auth/auth";
import { CreateLeaveRequestDto, LeaveType, Calendar } from "../../types/leaves";
import { useAuthStore } from "../../lib/stores/auth.store";
import { FileUpload } from "./FileUpload";

interface CreateLeaveRequestFormProps {
  onSubmit?: (data: CreateLeaveRequestDto) => Promise<void> | void;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export const CreateLeaveRequestForm: React.FC<CreateLeaveRequestFormProps> = ({
  onSubmit,
  onSuccess,
  onError,
}) => {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [loadingLeaveTypes, setLoadingLeaveTypes] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState<CreateLeaveRequestDto>({
    employeeId: authApi.getUserId() || user?.id || user?.userId || "",
    leaveTypeId: "",
    dates: {
      from: "",
      to: "",
    },
    durationDays: 0,
    justification: "",
    attachmentId: "",
  });

  // Fetch leave types on component mount
  useEffect(() => {
    const fetchLeaveTypes = async () => {
      try {
        setLoadingLeaveTypes(true);
        const types = await leavesApi.getLeaveTypes();
        setLeaveTypes(types || []);
      } catch (error: any) {
        // Silently fail - user can still enter leave type ID manually
        console.warn("Failed to fetch leave types (this is okay - you can enter ID manually):", error.message);
        setLeaveTypes([]);
        // Don't call onError here - this shouldn't block form submission
      } finally {
        setLoadingLeaveTypes(false);
      }
    };

    fetchLeaveTypes();
  }, []); // Remove onError from dependencies to prevent re-fetching on error

  // Update employeeId when user changes - prioritize JWT token
  useEffect(() => {
    const employeeId = authApi.getUserId() || user?.id || user?.userId;
    if (employeeId) {
      setFormData((prev) => ({
        ...prev,
        employeeId: employeeId,
      }));
    }
  }, [user]);

  // Calculate duration days when dates change (excluding weekends, holidays, and blocked periods)
  useEffect(() => {
    if (formData.dates.from && formData.dates.to) {
      const calculateDuration = async () => {
        try {
          const from = new Date(formData.dates.from);
          const to = new Date(formData.dates.to);
          
          if (to < from) {
            setFormData((prev) => ({ ...prev, durationDays: 0 }));
            return;
          }

          // Normalize dates to start of day
          from.setHours(0, 0, 0, 0);
          to.setHours(23, 59, 59, 999);

          // Fetch calendars for relevant years
          const startYear = from.getFullYear();
          const endYear = to.getFullYear();
          const yearsToFetch = new Set<number>();
          
          for (let year = startYear; year <= endYear; year++) {
            yearsToFetch.add(year);
          }

          // Fetch calendars (may fail if user doesn't have HR_ADMIN role)
          // getCalendarByYear already handles 403 errors silently, so no need for catch here
          const calendarPromises = Array.from(yearsToFetch).map(year =>
            leavesApi.getCalendarByYear(year)
          );
          
          const calendars = (await Promise.all(calendarPromises)).filter(
            (cal): cal is Calendar => cal !== null
          );

          // Extract holiday dates from all calendars
          const holidayDates = new Set<string>();
          
          for (const calendar of calendars) {
            if (!calendar.holidays || calendar.holidays.length === 0) {
              continue;
            }

            for (const holiday of calendar.holidays) {
              if (typeof holiday === 'string') {
                continue; // Skip ID strings, can't resolve on frontend
              } else if (typeof holiday === 'object' && holiday !== null) {
                const h = holiday as any;
                
                if (h.active === false) {
                  continue;
                }

                let holidayStart: Date | null = null;
                let holidayEnd: Date | null = null;

                if (h.startDate) {
                  holidayStart = new Date(h.startDate);
                } else if (h.date) {
                  holidayStart = new Date(h.date);
                } else {
                  continue;
                }

                if (h.endDate) {
                  holidayEnd = new Date(h.endDate);
                } else {
                  holidayEnd = holidayStart;
                }

                if (holidayStart && !isNaN(holidayStart.getTime())) {
                  const currentHolidayDate = new Date(holidayStart);
                  currentHolidayDate.setHours(0, 0, 0, 0);
                  const endHolidayDate = new Date(holidayEnd);
                  endHolidayDate.setHours(23, 59, 59, 999);

                  while (currentHolidayDate <= endHolidayDate) {
                    const dateStr = currentHolidayDate.toISOString().split('T')[0];
                    holidayDates.add(dateStr);
                    currentHolidayDate.setDate(currentHolidayDate.getDate() + 1);
                  }
                }
              }
            }
          }

          // Collect blocked periods from all calendars
          const blockedPeriods: Array<{ from: Date; to: Date }> = [];
          for (const calendar of calendars) {
            if (calendar.blockedPeriods && calendar.blockedPeriods.length > 0) {
              for (const period of calendar.blockedPeriods) {
                blockedPeriods.push({
                  from: new Date(period.from),
                  to: new Date(period.to),
                });
              }
            }
          }

          // Calculate working days
          let workingDays = 0;
          const currentDate = new Date(from);

          while (currentDate <= to) {
            const dayOfWeek = currentDate.getDay();
            const dateString = currentDate.toISOString().split('T')[0];

            // Skip weekends (Saturday = 6, Sunday = 0)
            if (dayOfWeek !== 0 && dayOfWeek !== 6) {
              // Check if it's a holiday
              const isHoliday = holidayDates.has(dateString);

              // Check if it's in a blocked period
              const isBlocked = blockedPeriods.some((period) => {
                const periodStart = new Date(period.from);
                periodStart.setHours(0, 0, 0, 0);
                const periodEnd = new Date(period.to);
                periodEnd.setHours(23, 59, 59, 999);
                return currentDate >= periodStart && currentDate <= periodEnd;
              });

              // Count as working day if not holiday and not blocked
              if (!isHoliday && !isBlocked) {
                workingDays++;
              }
            }

            // Move to next day
            currentDate.setDate(currentDate.getDate() + 1);
          }
          
          setFormData((prev) => ({
            ...prev,
            durationDays: workingDays,
          }));
        } catch (error) {
          console.error("Error calculating working days:", error);
          // Fallback to simple weekend exclusion if calendar fetch fails
          const from = new Date(formData.dates.from);
          const to = new Date(formData.dates.to);
          
          if (to >= from) {
            let workingDays = 0;
            const currentDate = new Date(from);
            
            while (currentDate <= to) {
              const dayOfWeek = currentDate.getDay();
              // Count only weekdays (Monday-Friday, excluding weekends)
              if (dayOfWeek !== 0 && dayOfWeek !== 6) {
                workingDays++;
              }
              currentDate.setDate(currentDate.getDate() + 1);
            }
            
            setFormData((prev) => ({
              ...prev,
              durationDays: workingDays,
            }));
          }
        }
      };

      calculateDuration();
    }
  }, [formData.dates.from, formData.dates.to]);

  // Helper function to format date value for input (YYYY-MM-DD)
  const formatDateForInput = (date: Date | string | undefined): string => {
    if (!date) return "";
    if (typeof date === "string") return date;
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.employeeId || !formData.employeeId.trim()) {
      newErrors.employeeId = "Employee ID is required";
    }

    if (!formData.leaveTypeId || !formData.leaveTypeId.trim()) {
      newErrors.leaveTypeId = "Leave type is required";
    }

    // Note: Backend will validate ObjectId format, we just ensure it's not empty

    if (!formData.dates.from) {
      newErrors.fromDate = "Start date is required";
    }

    if (!formData.dates.to) {
      newErrors.toDate = "End date is required";
    }

    if (formData.dates.from && formData.dates.to) {
      const from = new Date(formData.dates.from);
      const to = new Date(formData.dates.to);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (to < from) {
        newErrors.toDate = "End date must be after start date";
      }

      // REQ-031: Allow post-leave submissions within grace period (7 days after end date)
      const maxGracePeriodDays = 7;
      const daysSinceEndDate = Math.floor(
        (today.getTime() - to.getTime()) / (1000 * 60 * 60 * 24)
      );
      
      // Check if leave end date is too far in the past (beyond grace period)
      if (daysSinceEndDate > maxGracePeriodDays) {
        newErrors.toDate = `Post-leave requests must be submitted within ${maxGracePeriodDays} days after the leave end date. This leave ended ${daysSinceEndDate} days ago.`;
      }
      
      // Note: We allow past dates for emergency post-leave submissions
      // The backend will validate the grace period
    }

    if (formData.durationDays <= 0) {
      newErrors.durationDays = "Duration must be greater than 0";
    }

    // Check if selected leave type requires attachment
    const selectedLeaveType = leaveTypes.find(lt => lt._id === formData.leaveTypeId);
    if (selectedLeaveType?.requiresAttachment && !formData.attachmentId) {
      newErrors.attachmentId = `Attachment is required for ${selectedLeaveType.name} leave requests`;
    }

    // Check for sick leave > 1 day requiring attachment
    if (selectedLeaveType?.code === 'SICK_LEAVE' && formData.durationDays > 1 && !formData.attachmentId) {
      newErrors.attachmentId = "Medical certificate is required for sick leave exceeding one day";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      // Ensure dates are valid strings before submitting
      if (!formData.dates.from || !formData.dates.to) {
        throw new Error("Please select both start and end dates");
      }

      // Ensure all IDs are trimmed and valid
      const trimmedLeaveTypeId = formData.leaveTypeId.trim();
      const trimmedAttachmentId = formData.attachmentId?.trim();
      const trimmedJustification = formData.justification?.trim();

      if (!trimmedLeaveTypeId) {
        setErrors({ leaveTypeId: "Leave type ID is required" });
        setLoading(false);
        return;
      }

      // Double-check required attachment before submitting
      const selectedLeaveType = leaveTypes.find(lt => lt._id === formData.leaveTypeId);
      if (selectedLeaveType?.requiresAttachment && !trimmedAttachmentId) {
        setErrors({ attachmentId: `Attachment is required for ${selectedLeaveType.name} leave requests` });
        setLoading(false);
        return;
      }

      if (selectedLeaveType?.code === 'SICK_LEAVE' && formData.durationDays > 1 && !trimmedAttachmentId) {
        setErrors({ attachmentId: "Medical certificate is required for sick leave exceeding one day" });
        setLoading(false);
        return;
      }

      const submitData: CreateLeaveRequestDto = {
        employeeId: formData.employeeId.trim(),
        leaveTypeId: trimmedLeaveTypeId,
        dates: {
          from: formData.dates.from,
          to: formData.dates.to,
        },
        durationDays: formData.durationDays,
        // Only include if not empty - don't send empty strings
        ...(trimmedJustification && { justification: trimmedJustification }),
        ...(trimmedAttachmentId && { attachmentId: trimmedAttachmentId }),
      };

      // Call onSubmit if provided, otherwise use default service call
      if (onSubmit) {
        await onSubmit(submitData);
      } else {
        await leavesApi.createLeaveRequest(submitData);
      }

      // Only call onSuccess if submission was successful (no error thrown)
      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      // Extract more detailed error message
      let errorMessage = "Failed to create leave request. Please try again.";
      
      // The error is already processed by the API client interceptor
      // so error.message should contain the formatted message
      if (error.message) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }


      setErrors({ submit: errorMessage });
      if (onError) {
        onError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;

    if (name === "leaveTypeId") {
      // Trim whitespace from leave type ID (handles copy/paste with extra spaces)
      const trimmedValue = value.trim().replace(/\s+/g, '');
      setFormData((prev) => ({
        ...prev,
        leaveTypeId: trimmedValue,
        // Clear attachment requirement error when leave type changes
        attachmentId: prev.attachmentId,
      }));
      // Clear attachment error when leave type changes
      if (errors.attachmentId) {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors.attachmentId;
          return newErrors;
        });
      }
      // Clear leave type error when user types
      if (errors.leaveTypeId && trimmedValue) {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors.leaveTypeId;
          return newErrors;
        });
      }
    } else if (name === "fromDate") {
      setFormData((prev) => ({
        ...prev,
        dates: {
          ...prev.dates,
          from: value,
        },
      }));
    } else if (name === "toDate") {
      setFormData((prev) => ({
        ...prev,
        dates: {
          ...prev.dates,
          to: value,
        },
      }));
    } else if (name === "durationDays") {
      setFormData((prev) => ({
        ...prev,
        durationDays: parseInt(value) || 0,
      }));
    } else if (name === "attachmentId") {
      // Trim whitespace from attachment ID (handles copy/paste with extra spaces)
      const trimmedValue = value.trim().replace(/\s+/g, '');
      setFormData((prev) => ({
        ...prev,
        attachmentId: trimmedValue,
      }));
      // Clear attachment error when user types
      if (errors.attachmentId && trimmedValue) {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors.attachmentId;
          return newErrors;
        });
      }
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }

    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const selectedLeaveType = leaveTypes.find(lt => lt._id === formData.leaveTypeId);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        {/* Leave Type */}
        <div>
          <Select
            label="Leave Type *"
            value={formData.leaveTypeId}
            onChange={(e) => {
              const selectedId = e.target.value;
              setFormData((prev) => ({
                ...prev,
                leaveTypeId: selectedId,
              }));
              // Clear error if selection is made
              if (errors.leaveTypeId) {
                setErrors((prev) => {
                  const newErrors = { ...prev };
                  delete newErrors.leaveTypeId;
                  return newErrors;
                });
              }
            }}
            error={errors.leaveTypeId}
            disabled={loadingLeaveTypes}
            options={
              leaveTypes.length > 0
                ? leaveTypes.map((type) => ({
                    value: type._id,
                    label: `${type.name}${type.requiresAttachment ? " (Requires Attachment)" : ""}`,
                  }))
                : [{ value: "", label: loadingLeaveTypes ? "Loading leave types..." : "No leave types available" }]
            }
            placeholder="Select leave type"
          />
          {selectedLeaveType?.description && (
            <p className="mt-1 text-xs text-gray-600">{selectedLeaveType.description}</p>
          )}
        </div>

        {/* Date Range */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <Input
              label="Start Date"
              type="date"
              name="fromDate"
              value={formatDateForInput(formData.dates.from)}
              onChange={handleChange}
              error={errors.fromDate}
              required
            />
            {formData.dates.from && (() => {
              const fromDate = new Date(formData.dates.from);
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const isPast = fromDate < today;
              return isPast && (
                <p className="mt-1 text-xs text-blue-600">
                  ⚠️ Post-leave submission (for emergency situations)
                </p>
              );
            })()}
          </div>
          <div>
            <Input
              label="End Date"
              type="date"
              name="toDate"
              value={formatDateForInput(formData.dates.to)}
              onChange={handleChange}
              error={errors.toDate}
              required
            />
            {formData.dates.to && (() => {
              const toDate = new Date(formData.dates.to);
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const daysSinceEnd = Math.floor(
                (today.getTime() - toDate.getTime()) / (1000 * 60 * 60 * 24)
              );
              const maxGracePeriodDays = 7;
              
              if (daysSinceEnd > 0 && daysSinceEnd <= maxGracePeriodDays) {
                return (
                  <p className="mt-1 text-xs text-blue-600">
                    ✓ Post-leave submission allowed (within {maxGracePeriodDays}-day grace period)
                  </p>
                );
              } else if (daysSinceEnd > maxGracePeriodDays) {
                return (
                  <p className="mt-1 text-xs text-red-600">
                    ✗ Grace period expired ({daysSinceEnd} days ago, max {maxGracePeriodDays} days)
                  </p>
                );
              }
              return null;
            })()}
          </div>
        </div>
        
        {/* Post-Leave Information Banner */}
        {formData.dates.from && formData.dates.to && (() => {
          const fromDate = new Date(formData.dates.from);
          const toDate = new Date(formData.dates.to);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const isPastLeave = toDate < today;
          const daysSinceEnd = Math.floor(
            (today.getTime() - toDate.getTime()) / (1000 * 60 * 60 * 24)
          );
          const maxGracePeriodDays = 7;
          
          if (isPastLeave && daysSinceEnd <= maxGracePeriodDays && daysSinceEnd > 0) {
            return (
              <div className="rounded-md bg-blue-50 p-4 border border-blue-200">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-5 w-5 text-blue-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-blue-800">
                      Post-Leave Submission
                    </h3>
                    <div className="mt-2 text-sm text-blue-700">
                      <p>
                        You are submitting a leave request for dates that have already passed.
                        This is allowed for emergency situations within {maxGracePeriodDays} days after the leave end date.
                      </p>
                      {daysSinceEnd > 0 && (
                        <p className="mt-1">
                          Leave ended {daysSinceEnd} day{daysSinceEnd !== 1 ? 's' : ''} ago.
                          {daysSinceEnd <= maxGracePeriodDays && (
                            <span className="font-semibold"> You have {maxGracePeriodDays - daysSinceEnd} day{maxGracePeriodDays - daysSinceEnd !== 1 ? 's' : ''} remaining in the grace period.</span>
                          )}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          }
          return null;
        })()}

        {/* Duration Days */}
        <div>
          <Input
            label="Duration (Working Days)"
            type="number"
            name="durationDays"
            value={formData.durationDays}
            onChange={handleChange}
            error={errors.durationDays}
            min={1}
            disabled
            className="bg-gray-50"
          />
          <p className="mt-1 text-xs text-gray-500">
            Duration is automatically calculated based on selected dates (excluding weekends)
          </p>
        </div>

        {/* Justification */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Justification / Reason
          </label>
          <textarea
            name="justification"
            value={formData.justification}
            onChange={handleChange}
            rows={4}
            className={`w-full rounded-md border ${
              errors.justification ? "border-red-500" : "border-gray-300"
            } px-3 py-2 text-sm placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
            placeholder="Please provide a reason for your leave request..."
          />
          {errors.justification && (
            <p className="mt-1 text-sm text-red-600">{errors.justification}</p>
          )}
        </div>

        {/* Attachment Upload */}
        <div>
          {(selectedLeaveType?.requiresAttachment || 
            (selectedLeaveType?.code === 'SICK_LEAVE' && formData.durationDays > 1)) ? (
            <FileUpload
              label={
                selectedLeaveType?.code === 'SICK_LEAVE' && formData.durationDays > 1
                  ? "Medical Certificate"
                  : "Supporting Document"
              }
              required={
                selectedLeaveType?.requiresAttachment === true ||
                (selectedLeaveType?.code === 'SICK_LEAVE' && formData.durationDays > 1)
              }
              onUploadSuccess={(attachmentId) => {
                setFormData((prev) => ({
                  ...prev,
                  attachmentId: attachmentId,
                }));
                // Clear attachment error
                if (errors.attachmentId) {
                  setErrors((prev) => {
                    const newErrors = { ...prev };
                    delete newErrors.attachmentId;
                    return newErrors;
                  });
                }
              }}
              onUploadError={(error) => {
                setErrors((prev) => ({
                  ...prev,
                  attachmentId: error,
                }));
              }}
            />
          ) : (
            <>
              <FileUpload
                label="Supporting Document (Optional)"
                required={false}
                onUploadSuccess={(attachmentId) => {
                  setFormData((prev) => ({
                    ...prev,
                    attachmentId: attachmentId,
                  }));
                }}
                onUploadError={(error) => {
                  // Don't set error for optional uploads
                  console.warn("Upload error:", error);
                }}
              />
              <p className="mt-1 text-xs text-gray-500">
                You can upload supporting documents (e.g., medical certificate, travel documents) if needed.
              </p>
            </>
          )}
          {errors.attachmentId && (
            <p className="mt-1 text-sm text-red-600">{errors.attachmentId}</p>
          )}
        </div>
      </div>

      {/* Submit Error */}
      {errors.submit && (
        <div className="rounded-md bg-red-50 p-4 border border-red-200">
          <p className="text-sm text-red-800">{errors.submit}</p>
        </div>
      )}

      {/* Submit Button */}
      <div className="flex justify-end gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setFormData({
              employeeId: user?.id || user?.userId || "",
              leaveTypeId: "",
              dates: { from: "", to: "" },
              durationDays: 0,
              justification: "",
              attachmentId: "",
            });
            setErrors({});
          }}
          disabled={loading}
        >
          Reset
        </Button>
        <Button type="submit" isLoading={loading} disabled={loading}>
          Submit Leave Request
        </Button>
      </div>
    </form>
  );
};

