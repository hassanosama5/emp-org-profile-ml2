"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/hooks/use-auth";
import { useRequireAuth } from "@/lib/hooks/use-auth";
import { SystemRole } from "@/types";
import { policyConfigApi } from "@/lib/api/time-management/policy-config.api";
import { fetchShifts, fetchDepartments } from "@/lib/api/time-management/shift-schedule.api";
import {
  Holiday,
  HolidayType,
  CreateHolidayRequest,
  GetHolidaysFilters,
  BulkCreateHolidaysRequest,
  BulkCreateHolidaysResponse,
  ConfigureRestDaysRequest,
  ConfigureRestDaysResponse,
  LinkHolidaysToShiftRequest,
  LinkHolidaysToShiftResponse,
  Shift,
} from "@/types/time-management";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/shared/ui/Card";
import { Button } from "@/components/shared/ui/Button";
import { Input } from "@/components/shared/ui/Input";
import { Select } from "@/components/leaves/Select";
import { Modal } from "@/components/leaves/Modal";
import { Toast, useToast } from "@/components/leaves/Toast";
import HolidayCalendar from "@/components/time-management/HolidayCalendar";

export default function HolidaysPage() {
  const { user } = useAuth();
  useRequireAuth([SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN]);
  const { toast, showToast, hideToast } = useToast();

  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<GetHolidaysFilters>({});
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isBulkCreateModalOpen, setIsBulkCreateModalOpen] = useState(false);
  const [isRestDaysModalOpen, setIsRestDaysModalOpen] = useState(false);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedHoliday, setSelectedHoliday] = useState<Holiday | null>(null);
  const [processing, setProcessing] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");

  // Dropdown data
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loadingDropdowns, setLoadingDropdowns] = useState(false);

  // Create holiday form
  const [createForm, setCreateForm] = useState<CreateHolidayRequest>({
    type: HolidayType.NATIONAL,
    startDate: "",
    endDate: "",
    name: "",
    active: true,
  });

  // Edit holiday form
  const [editForm, setEditForm] = useState<CreateHolidayRequest>({
    type: HolidayType.NATIONAL,
    startDate: "",
    endDate: "",
    name: "",
    active: true,
  });

  // Bulk create form
  const [bulkForm, setBulkForm] = useState<{
    holidays: Array<{
      name: string;
      type: string;
      startDate: string;
      endDate?: string;
    }>;
    year?: number;
  }>({
    holidays: [{ name: "", type: HolidayType.NATIONAL, startDate: "", endDate: "" }],
    year: new Date().getFullYear(),
  });

  // Rest days form
  const [restDaysForm, setRestDaysForm] = useState<ConfigureRestDaysRequest>({
    restDays: [0, 6], // Default: Sunday and Saturday
    effectiveFrom: "",
    effectiveTo: "",
    departmentId: "",
  });

  // Link to shift form
  const [linkForm, setLinkForm] = useState<LinkHolidaysToShiftRequest>({
    shiftId: "",
    holidayIds: [],
    action: "NO_WORK",
  });

  // Helper functions to get display names
  const getShiftDisplay = (shiftId: string): string => {
    if (!shiftId) return "Select a shift...";
    const shift = shifts.find((s) => (s._id || (s as any).id) === shiftId);
    if (!shift) return shiftId;
    return shift.name || (typeof shift.shiftType === 'object' && shift.shiftType !== null ? (shift.shiftType as any).name : shift.shiftType) || shiftId;
  };

  const getDepartmentDisplay = (deptId: string): string => {
    if (!deptId) return "All Departments (Organization-wide)";
    const dept = departments.find((d) => (d._id || d.id) === deptId);
    if (!dept) return deptId;
    return dept.name || deptId;
  };

  useEffect(() => {
    console.log("Filters changed, reloading holidays:", filters);
    loadHolidays();
    loadDropdowns();
  }, [filters]);

  const loadDropdowns = async () => {
    try {
      setLoadingDropdowns(true);
      
      // Try to fetch shifts - first try active only, then try all if that fails
      let shiftsData: any[] = [];
      try {
        shiftsData = await fetchShifts(true);
        console.log("Active shifts data:", shiftsData);
      } catch (shiftError: any) {
        console.warn("Failed to fetch active shifts, trying all shifts:", shiftError);
        try {
          shiftsData = await fetchShifts(false);
          console.log("All shifts data:", shiftsData);
        } catch (allShiftError: any) {
          console.error("Failed to fetch shifts (both active and all):", allShiftError);
          showToast(`Failed to load shifts: ${allShiftError.message}`, "error");
        }
      }
      
      // Try to fetch departments
      let departmentsData: any[] = [];
      try {
        departmentsData = await fetchDepartments(true);
        console.log("Active departments data:", departmentsData);
      } catch (deptError: any) {
        console.warn("Failed to fetch active departments, trying all:", deptError);
        try {
          departmentsData = await fetchDepartments(false);
          console.log("All departments data:", departmentsData);
        } catch (allDeptError: any) {
          console.error("Failed to fetch departments:", allDeptError);
          // Don't show toast for departments as it's less critical
        }
      }
      
      // Handle different response formats
      const finalShifts = Array.isArray(shiftsData) ? shiftsData : ((shiftsData as any)?.data || (shiftsData as any)?.shifts || []);
      const finalDepartments = Array.isArray(departmentsData) ? departmentsData : ((departmentsData as any)?.data || (departmentsData as any)?.departments || []);
      
      console.log("Final shifts array:", finalShifts);
      console.log("Final departments array:", finalDepartments);
      
      setShifts(finalShifts);
      setDepartments(finalDepartments);
      
      if (finalShifts.length === 0) {
        console.warn("No shifts found in the system");
      }
    } catch (error: any) {
      console.error("Failed to load dropdowns:", error);
      showToast(`Failed to load options: ${error.message}`, "error");
    } finally {
      setLoadingDropdowns(false);
    }
  };

  const loadHolidays = async () => {
    try {
      setLoading(true);
      console.log("Loading holidays with filters:", filters);
      const data = await policyConfigApi.getHolidays(filters);
      console.log("Holidays response:", data);
      setHolidays(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error("Failed to load holidays:", error);
      showToast(error.message || "Failed to load holidays", "error");
      setHolidays([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateHoliday = async () => {
    if (!createForm.name || !createForm.startDate || !createForm.endDate) {
      showToast("Please fill in all required fields", "error");
      return;
    }

    try {
      setProcessing(true);
      await policyConfigApi.createHoliday(createForm);
      showToast("Holiday created successfully!", "success");
      setIsCreateModalOpen(false);
      setCreateForm({
        type: HolidayType.NATIONAL,
        startDate: "",
        endDate: "",
        name: "",
        active: true,
      });
      loadHolidays();
    } catch (error: any) {
      showToast(error.message || "Failed to create holiday", "error");
    } finally {
      setProcessing(false);
    }
  };

  const handleBulkCreate = async () => {
    if (bulkForm.holidays.length === 0 || bulkForm.holidays.some((h) => !h.name || !h.startDate)) {
      showToast("Please fill in all required fields for all holidays", "error");
      return;
    }

    try {
      setProcessing(true);
      const result: BulkCreateHolidaysResponse = await policyConfigApi.bulkCreateHolidays({
        holidays: bulkForm.holidays.map((h) => ({
          name: h.name,
          type: h.type as HolidayType,
          startDate: h.startDate,
          endDate: h.endDate,
        })),
        year: bulkForm.year,
      });
      showToast(
        `Bulk creation complete: ${result.summary.created} created, ${result.summary.failed} failed`,
        result.summary.failed === 0 ? "success" : "error"
      );
      setIsBulkCreateModalOpen(false);
      setBulkForm({
        holidays: [{ name: "", type: HolidayType.NATIONAL, startDate: "", endDate: "" }],
        year: new Date().getFullYear(),
      });
      loadHolidays();
    } catch (error: any) {
      showToast(error.message || "Failed to bulk create holidays", "error");
    } finally {
      setProcessing(false);
    }
  };

  const handleConfigureRestDays = async () => {
    if (restDaysForm.restDays.length === 0) {
      showToast("Please select at least one rest day", "error");
      return;
    }

    try {
      setProcessing(true);
      const result: ConfigureRestDaysResponse = await policyConfigApi.configureRestDays(restDaysForm);
      showToast(result.penaltySuppression.message, "success");
      setIsRestDaysModalOpen(false);
      setRestDaysForm({
        restDays: [0, 6],
        effectiveFrom: "",
        effectiveTo: "",
        departmentId: "",
      });
    } catch (error: any) {
      showToast(error.message || "Failed to configure rest days", "error");
    } finally {
      setProcessing(false);
    }
  };

  const handleLinkToShift = async () => {
    if (!linkForm.shiftId || linkForm.holidayIds.length === 0) {
      showToast("Please select a shift and at least one holiday", "error");
      return;
    }

    try {
      setProcessing(true);
      const result: LinkHolidaysToShiftResponse = await policyConfigApi.linkHolidaysToShift(linkForm);
      showToast(
        `Successfully linked ${result.holidayCount} holiday(s) to shift: ${result.actionDescription}`,
        "success"
      );
      setIsLinkModalOpen(false);
      setLinkForm({
        shiftId: "",
        holidayIds: [],
        action: "NO_WORK",
      });
    } catch (error: any) {
      showToast(error.message || "Failed to link holidays to shift", "error");
    } finally {
      setProcessing(false);
    }
  };

  const addBulkHolidayRow = () => {
    setBulkForm({
      ...bulkForm,
      holidays: [
        ...bulkForm.holidays,
        { name: "", type: HolidayType.NATIONAL, startDate: "", endDate: "" },
      ],
    });
  };

  const removeBulkHolidayRow = (index: number) => {
    setBulkForm({
      ...bulkForm,
      holidays: bulkForm.holidays.filter((_, i) => i !== index),
    });
  };

  const updateBulkHoliday = (index: number, field: string, value: any) => {
    const updated = [...bulkForm.holidays];
    updated[index] = { ...updated[index], [field]: value };
    setBulkForm({ ...bulkForm, holidays: updated });
  };

  const toggleRestDay = (day: number) => {
    if (restDaysForm.restDays.includes(day)) {
      setRestDaysForm({
        ...restDaysForm,
        restDays: restDaysForm.restDays.filter((d) => d !== day),
      });
    } else {
      setRestDaysForm({
        ...restDaysForm,
        restDays: [...restDaysForm.restDays, day].sort((a, b) => a - b),
      });
    }
  };

  const toggleHolidaySelection = (holidayId: string) => {
    if (linkForm.holidayIds.includes(holidayId)) {
      setLinkForm({
        ...linkForm,
        holidayIds: linkForm.holidayIds.filter((id) => id !== holidayId),
      });
    } else {
      setLinkForm({
        ...linkForm,
        holidayIds: [...linkForm.holidayIds, holidayId],
      });
    }
  };

  const getHolidayTypeBadgeClass = (type: HolidayType) => {
    switch (type) {
      case HolidayType.NATIONAL:
        return "bg-blue-100 text-blue-800";
      case HolidayType.ORGANIZATIONAL:
        return "bg-purple-100 text-purple-800";
      case HolidayType.WEEKLY_REST:
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  return (
    <div className="container mx-auto px-6 py-8">
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
      />

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Holiday & Rest Day Configuration</h1>
        <p className="text-gray-600 mt-1">
          Define national holidays, organizational holidays, and weekly rest days. Link holidays to shift schedules.
        </p>
      </div>

      {/* View Toggle */}
      <div className="flex gap-2 mb-6">
        <Button
          variant={viewMode === "list" ? "primary" : "outline"}
          onClick={() => setViewMode("list")}
        >
          📋 List View
        </Button>
        <Button
          variant={viewMode === "calendar" ? "primary" : "outline"}
          onClick={() => setViewMode("calendar")}
        >
          📅 Calendar View
        </Button>
      </div>

      {viewMode === "calendar" ? (
        <HolidayCalendar
          onHolidayClick={(holiday) => {
            setSelectedHoliday(holiday);
          }}
        />
      ) : (
        <>
      {/* Action Buttons */}
      <div className="flex flex-wrap gap-4 mb-6">
        <Button variant="primary" onClick={() => setIsCreateModalOpen(true)}>
          Create Holiday
        </Button>
        <Button variant="secondary" onClick={() => setIsBulkCreateModalOpen(true)}>
          Bulk Create Holidays
        </Button>
        <Button variant="secondary" onClick={() => setIsRestDaysModalOpen(true)}>
          Configure Rest Days
        </Button>
        <Button variant="secondary" onClick={() => setIsLinkModalOpen(true)}>
          Link Holidays to Shift
        </Button>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Select
              label="Holiday Type"
              value={filters.type || ""}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  type: e.target.value ? (e.target.value as HolidayType) : undefined,
                })
              }
              options={[
                { value: "", label: "All Types" },
                { value: HolidayType.NATIONAL, label: "National" },
                { value: HolidayType.ORGANIZATIONAL, label: "Organizational" },
                { value: HolidayType.WEEKLY_REST, label: "Weekly Rest" },
              ]}
            />
            <Select
              label="Status"
              value={filters.active === undefined ? "" : filters.active ? "true" : "false"}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  active: e.target.value === "" ? undefined : e.target.value === "true",
                })
              }
              options={[
                { value: "", label: "All" },
                { value: "true", label: "Active" },
                { value: "false", label: "Inactive" },
              ]}
            />
            <Input
              type="date"
              label="Start Date"
              value={filters.startDate || ""}
              onChange={(e) =>
                setFilters({ ...filters, startDate: e.target.value || undefined })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Holidays Table */}
      <Card>
        <CardHeader>
          <CardTitle>Holidays</CardTitle>
          <CardDescription>View and manage all configured holidays</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Loading holidays...</p>
            </div>
          ) : holidays.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No holidays found.</div>
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
                      Start Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      End Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {holidays.map((holiday) => (
                    <tr key={holiday._id || holiday.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {holiday.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getHolidayTypeBadgeClass(
                            holiday.type
                          )}`}
                        >
                          {holiday.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(holiday.startDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {holiday.endDate ? new Date(holiday.endDate).toLocaleDateString() : "N/A"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            holiday.active
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {holiday.active ? "Active" : "Inactive"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Holiday Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create Holiday"
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateHoliday} isLoading={processing}>
              {processing ? "Creating..." : "Create Holiday"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Holiday Name *"
            value={createForm.name}
            onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
            placeholder="Enter holiday name"
          />
          <Select
            label="Holiday Type *"
            value={createForm.type}
            onChange={(e) =>
              setCreateForm({ ...createForm, type: e.target.value as HolidayType })
            }
            options={[
              { value: HolidayType.NATIONAL, label: "National" },
              { value: HolidayType.ORGANIZATIONAL, label: "Organizational" },
              { value: HolidayType.WEEKLY_REST, label: "Weekly Rest" },
            ]}
          />
          <Input
            type="date"
            label="Start Date *"
            value={createForm.startDate}
            onChange={(e) => setCreateForm({ ...createForm, startDate: e.target.value })}
          />
          <Input
            type="date"
            label="End Date *"
            value={createForm.endDate}
            onChange={(e) => setCreateForm({ ...createForm, endDate: e.target.value })}
          />
          <Select
            label="Status *"
            value={createForm.active ? "true" : "false"}
            onChange={(e) =>
              setCreateForm({ ...createForm, active: e.target.value === "true" })
            }
            options={[
              { value: "true", label: "Active" },
              { value: "false", label: "Inactive" },
            ]}
          />
        </div>
      </Modal>

      {/* Bulk Create Modal */}
      <Modal
        isOpen={isBulkCreateModalOpen}
        onClose={() => setIsBulkCreateModalOpen(false)}
        title="Bulk Create Holidays"
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setIsBulkCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleBulkCreate} isLoading={processing}>
              {processing ? "Creating..." : "Create All Holidays"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            type="number"
            label="Year"
            value={bulkForm.year || ""}
            onChange={(e) =>
              setBulkForm({ ...bulkForm, year: e.target.value ? parseInt(e.target.value) : undefined })
            }
          />
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {bulkForm.holidays.map((holiday, index) => (
              <div key={index} className="border p-4 rounded">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-medium">Holiday {index + 1}</h4>
                  {bulkForm.holidays.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeBulkHolidayRow(index)}
                    >
                      Remove
                    </Button>
                  )}
                </div>
                <div className="space-y-2">
                  <Input
                    label="Name *"
                    value={holiday.name}
                    onChange={(e) => updateBulkHoliday(index, "name", e.target.value)}
                    placeholder="Holiday name"
                  />
                  <Select
                    label="Type *"
                    value={holiday.type}
                    onChange={(e) => updateBulkHoliday(index, "type", e.target.value)}
                    options={[
                      { value: HolidayType.NATIONAL, label: "National" },
                      { value: HolidayType.ORGANIZATIONAL, label: "Organizational" },
                      { value: HolidayType.WEEKLY_REST, label: "Weekly Rest" },
                    ]}
                  />
                  <Input
                    type="date"
                    label="Start Date *"
                    value={holiday.startDate}
                    onChange={(e) => updateBulkHoliday(index, "startDate", e.target.value)}
                  />
                  <Input
                    type="date"
                    label="End Date (Optional)"
                    value={holiday.endDate || ""}
                    onChange={(e) => updateBulkHoliday(index, "endDate", e.target.value)}
                  />
                </div>
              </div>
            ))}
          </div>
          <Button variant="outline" onClick={addBulkHolidayRow} className="w-full">
            Add Another Holiday
          </Button>
        </div>
      </Modal>

      {/* Configure Rest Days Modal */}
      <Modal
        isOpen={isRestDaysModalOpen}
        onClose={() => setIsRestDaysModalOpen(false)}
        title="Configure Weekly Rest Days"
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setIsRestDaysModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfigureRestDays} isLoading={processing}>
              {processing ? "Configuring..." : "Configure Rest Days"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Rest Days (0=Sunday, 6=Saturday)
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {dayNames.map((day, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => toggleRestDay(index)}
                  className={`px-4 py-2 rounded border ${
                    restDaysForm.restDays.includes(index)
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>
            {restDaysForm.restDays.length > 0 && (
              <p className="mt-2 text-sm text-gray-600">
                Selected: {restDaysForm.restDays.map((d) => dayNames[d]).join(", ")}
              </p>
            )}
          </div>
          <Input
            type="date"
            label="Effective From (Optional)"
            value={restDaysForm.effectiveFrom}
            onChange={(e) => setRestDaysForm({ ...restDaysForm, effectiveFrom: e.target.value })}
          />
          <Input
            type="date"
            label="Effective To (Optional)"
            value={restDaysForm.effectiveTo}
            onChange={(e) => setRestDaysForm({ ...restDaysForm, effectiveTo: e.target.value })}
          />
          <Select
            label="Department (Optional - leave empty for organization-wide)"
            value={restDaysForm.departmentId || ""}
            onChange={(e) => setRestDaysForm({ ...restDaysForm, departmentId: e.target.value || "" })}
            options={[
              { value: "", label: "All Departments (Organization-wide)" },
              ...departments.map((dept) => ({
                value: dept._id || dept.id,
                label: dept.name || dept._id || dept.id,
              })),
            ]}
            disabled={loadingDropdowns}
          />
        </div>
      </Modal>

      {/* Link Holidays to Shift Modal */}
      <Modal
        isOpen={isLinkModalOpen}
        onClose={() => setIsLinkModalOpen(false)}
        title="Link Holidays to Shift"
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setIsLinkModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleLinkToShift} isLoading={processing}>
              {processing ? "Linking..." : "Link Holidays"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select
            label="Shift *"
            value={linkForm.shiftId}
            onChange={(e) => setLinkForm({ ...linkForm, shiftId: e.target.value })}
            options={[
              { value: "", label: "Select a shift..." },
              ...shifts.map((shift: Shift) => ({
                value: shift._id,
                label: shift.name || shift._id,
              })),
            ]}
            disabled={loadingDropdowns || shifts.length === 0}
          />
          {loadingDropdowns && (
            <p className="text-sm text-gray-500">Loading shifts...</p>
          )}
          {!loadingDropdowns && shifts.length === 0 && (
            <p className="text-sm text-yellow-600">No shifts available. Please create shifts first.</p>
          )}
          <Select
            label="Action *"
            value={linkForm.action}
            onChange={(e) =>
              setLinkForm({
                ...linkForm,
                action: e.target.value as "NO_WORK" | "OPTIONAL" | "OVERTIME_ELIGIBLE",
              })
            }
            options={[
              { value: "NO_WORK", label: "No Work - Employees not expected to work" },
              { value: "OPTIONAL", label: "Optional - Work is optional with no penalty" },
              {
                value: "OVERTIME_ELIGIBLE",
                label: "Overtime Eligible - Work is eligible for overtime rates",
              },
            ]}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Holidays to Link *
            </label>
            <div className="max-h-64 overflow-y-auto border rounded p-2">
              {holidays.length === 0 ? (
                <p className="text-gray-500 text-sm">No holidays available. Create holidays first.</p>
              ) : (
                <div className="space-y-2">
                  {holidays.map((holiday) => (
                    <label
                      key={holiday._id || holiday.id}
                      className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
                    >
                      <input
                        type="checkbox"
                        checked={linkForm.holidayIds.includes(holiday._id || holiday.id || "")}
                        onChange={() =>
                          toggleHolidaySelection(holiday._id || holiday.id || "")
                        }
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm">
                        {holiday.name} ({holiday.type}) -{" "}
                        {new Date(holiday.startDate).toLocaleDateString()}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
            {linkForm.holidayIds.length > 0 && (
              <p className="mt-2 text-sm text-gray-600">
                Selected: {linkForm.holidayIds.length} holiday(s)
              </p>
            )}
          </div>
        </div>
      </Modal>
      </>
      )}
    </div>
  );
}

