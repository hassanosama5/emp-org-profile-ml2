"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/hooks/use-auth";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { SystemRole } from "@/types";
import { employeeProfileApi } from "@/lib/api/employee-profile/profile";
import { timeManagementApi } from "@/lib/api/time-management/time-management.api";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/shared/ui/Card";
import { Button } from "@/components/shared/ui/Button";
import { Input } from "@/components/shared/ui/Input";
import { Select } from "@/components/leaves/Select";
import { Modal } from "@/components/leaves/Modal";
import { Toast, useToast } from "@/components/leaves/Toast";
import { TeamMember } from "@/types";
import { AttendanceRecord } from "@/types/time-management";
import Link from "next/link";

export default function ManualAttendancePage() {
  const { user } = useAuth();
  const { toast, showToast, hideToast } = useToast();
  
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
  const [saving, setSaving] = useState(false);

  type AmPm = "AM" | "PM";

  const pad2 = (n: number) => n.toString().padStart(2, "0");

  const getClockInOutFromPunches = (record: AttendanceRecord) => {
    const parseDateLike = (v: any): Date | undefined => {
      if (!v) return undefined;
      if (v instanceof Date) return isNaN(v.getTime()) ? undefined : v;
      if (typeof v === "number") {
        const d = new Date(v);
        return isNaN(d.getTime()) ? undefined : d;
      }
      if (typeof v === "string") {
        const d = new Date(v);
        return isNaN(d.getTime()) ? undefined : d;
      }
      // common serialized shapes
      const maybe =
        v?.$date ??
        v?.date ??
        v?.time ??
        v?.value ??
        (typeof v?.toString === "function" ? v.toString() : undefined);
      if (typeof maybe === "string" || typeof maybe === "number") {
        const d = new Date(maybe as any);
        return isNaN(d.getTime()) ? undefined : d;
      }
      return undefined;
    };

    const raw: any[] = Array.isArray((record as any)?.punches) ? (record as any).punches : [];
    // Some bad records come back as `[[]]` or nested arrays — flatten one level
    const punches: any[] = raw.flatMap((p) => (Array.isArray(p) ? p : [p]));
    if (punches.length === 0) {
      return { clockIn: undefined as Date | undefined, clockOut: undefined as Date | undefined };
    }

    const normalizeType = (t: any): "IN" | "OUT" | "UNKNOWN" => {
      const u = String(t ?? "").trim().toUpperCase();
      if (u === "IN" || u === "CLOCK_IN") return "IN";
      if (u === "OUT" || u === "CLOCK_OUT") return "OUT";
      return "UNKNOWN";
    };

    const parsed = punches
      .map((p) => {
        const time = parseDateLike(p?.time);
        return {
          type: normalizeType(p?.type),
          time,
        };
      })
      .filter((p) => !!p.time)
      .sort((a, b) => (a.time as Date).getTime() - (b.time as Date).getTime());

    const firstIn = parsed.find((p) => p.type === "IN");
    const lastOut = [...parsed].reverse().find((p) => p.type === "OUT");
    const fallbackFirst = parsed[0];
    const fallbackLast = parsed.length > 1 ? parsed[parsed.length - 1] : undefined;

    return {
      clockIn: (firstIn?.time || fallbackFirst?.time) as Date | undefined,
      clockOut: (lastOut?.time || fallbackLast?.time) as Date | undefined,
    };
  };

  const to12HourParts = (d: Date): { time: string; period: AmPm } => {
    const hours = d.getHours();
    const minutes = d.getMinutes();
    const period: AmPm = hours >= 12 ? "PM" : "AM";
    const h12 = hours % 12 === 0 ? 12 : hours % 12;
    return { time: `${pad2(h12)}:${pad2(minutes)}`, period };
  };

  const isValidTime12 = (value: string) => {
    // HH:MM where HH is 01-12, MM is 00-59
    const m = value.match(/^(\d{1,2}):(\d{2})$/);
    if (!m) return false;
    const hh = Number(m[1]);
    const mm = Number(m[2]);
    return hh >= 1 && hh <= 12 && mm >= 0 && mm <= 59;
  };

  const toLocalDateFromDateAnd12h = (date: string, time12: string, period: AmPm) => {
    // Build a Date using local components (avoids Safari parsing differences)
    // date: YYYY-MM-DD, time12: HH:MM (01-12)
    if (!date || !time12) return null as Date | null;
    const [yStr, mStr, dStr] = date.split("-");
    const [hhStr, mmStr] = time12.split(":");
    const y = Number(yStr);
    const mo = Number(mStr); // 1-12
    const da = Number(dStr);
    const hh = Number(hhStr);
    const mi = Number(mmStr);
    if (!y || !mo || !da || !hhStr || !mmStr) return null;
    let hour24 = hh % 12;
    if (period === "PM") hour24 += 12;
    const dt = new Date(y, mo - 1, da, hour24, mi, 0, 0);
    return isNaN(dt.getTime()) ? null : dt;
  };

  // Form state for creating/editing attendance
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    clockInTime: "",
    clockInPeriod: "AM" as AmPm,
    clockOutTime: "",
    clockOutPeriod: "PM" as AmPm,
    reason: "",
  });

  // Load team members
  useEffect(() => {
    const loadTeam = async () => {
      try {
        setLoading(true);
        const members = await employeeProfileApi.getMyTeam();
        setTeamMembers(members);
      } catch (error: any) {
        showToast(error.message || "Failed to load team members", "error");
      } finally {
        setLoading(false);
      }
    };
    loadTeam();
  }, []);

  // Load attendance records when employee is selected
  useEffect(() => {
    if (!selectedEmployeeId) {
      setAttendanceRecords([]);
      return;
    }

    const loadRecords = async () => {
      try {
        setLoadingRecords(true);
        const response = await timeManagementApi.getAttendanceRecords(selectedEmployeeId);
        
        let records: AttendanceRecord[] = [];
        if (response?.records && Array.isArray(response.records)) {
          records = response.records;
        } else if (Array.isArray(response)) {
          records = response;
        } else if (response?.data?.records && Array.isArray(response.data.records)) {
          records = response.data.records;
        }
        
        setAttendanceRecords(records);
      } catch (error: any) {
        showToast(error.message || "Failed to load attendance records", "error");
      } finally {
        setLoadingRecords(false);
      }
    };

    loadRecords();
  }, [selectedEmployeeId]);

  const handleCreateNew = () => {
    const today = new Date().toISOString().split("T")[0];
    setFormData({
      date: today,
      clockInTime: "09:00",
      clockInPeriod: "AM",
      clockOutTime: "",
      clockOutPeriod: "PM",
      reason: "",
    });
    setIsCreateModalOpen(true);
  };

  const handleEdit = (record: AttendanceRecord) => {
    // Prefer the punch date if available (more reliable than any "record date" metadata)
    const derived = getClockInOutFromPunches(record);
    const baseDate =
      (record as any).clockIn ||
      (record as any).clockOut ||
      derived.clockIn?.toISOString?.() ||
      derived.clockOut?.toISOString?.() ||
      (record as any).date ||
      new Date().toISOString();
    const recordDate = new Date(baseDate).toISOString().split('T')[0];
    const clockInParts =
      (record as any).clockIn
        ? to12HourParts(new Date((record as any).clockIn))
        : derived.clockIn
          ? to12HourParts(derived.clockIn)
          : null;
    const clockOutParts =
      (record as any).clockOut
        ? to12HourParts(new Date((record as any).clockOut))
        : derived.clockOut
          ? to12HourParts(derived.clockOut)
          : null;
    
    setFormData({
      date: recordDate,
      clockInTime: clockInParts?.time || "",
      clockInPeriod: clockInParts?.period || "AM",
      clockOutTime: clockOutParts?.time || "",
      clockOutPeriod: clockOutParts?.period || "PM",
      reason: "",
    });
    setSelectedRecord(record);
    console.log("[Manual Attendance] Editing record:", {
      recordId: (record as any)?._id || (record as any)?.id,
      employeeId: (record as any)?.employeeId,
      record,
    });
    setIsEditModalOpen(true);
  };

  const handleSave = async () => {
    if (!selectedEmployeeId) {
      showToast("Please select a team member", "error");
      return;
    }

    if (!formData.clockInTime) {
      showToast("Form error: Clock-in time is required", "error");
      return;
    }
    if (!isValidTime12(formData.clockInTime)) {
      showToast("Form error: Clock-in time must be HH:MM (01-12)", "error");
      return;
    }
    if (formData.clockOutTime && !isValidTime12(formData.clockOutTime)) {
      showToast("Form error: Clock-out time must be HH:MM (01-12)", "error");
      return;
    }

    const clockInDate = toLocalDateFromDateAnd12h(
      formData.date,
      formData.clockInTime,
      formData.clockInPeriod,
    );
    const clockOutDate = formData.clockOutTime
      ? toLocalDateFromDateAnd12h(formData.date, formData.clockOutTime, formData.clockOutPeriod)
      : null;

    if (!clockInDate) {
      showToast("Clock-in time is invalid", "error");
      return;
    }

    if (clockOutDate && isNaN(clockOutDate.getTime())) {
      showToast("Clock-out time is invalid", "error");
      return;
    }

    if (clockOutDate && clockOutDate.getTime() <= clockInDate.getTime()) {
      showToast("Clock-out time must be after clock-in time", "error");
      return;
    }

    try {
      setSaving(true);
      
      const punches: Array<{ type: 'IN' | 'OUT'; time: Date }> = [];
      if (clockInDate) {
        punches.push({
          type: 'IN' as const,
          time: clockInDate,
        });
      }
      if (clockOutDate) {
        punches.push({
          type: 'OUT' as const,
          time: clockOutDate,
        });
      }

      // Calculate total work minutes
      let totalWorkMinutes = 0;
      if (clockInDate && clockOutDate) {
        totalWorkMinutes = Math.max(
          0,
          Math.round((clockOutDate.getTime() - clockInDate.getTime()) / (1000 * 60)),
        );
      }

      console.log("[Manual Attendance] Save payload preview:", {
        mode: selectedRecord ? "update" : "create",
        recordId: selectedRecord?._id || selectedRecord?.id,
        employeeId: selectedEmployeeId,
        date: formData.date,
        punches: punches.map((p) => ({ type: p.type, time: p.time.toISOString() })),
        totalWorkMinutes,
      });

      if (selectedRecord) {
        // Update existing record
        const recordId = selectedRecord._id || selectedRecord.id || "";
        const updateRes = await timeManagementApi.updateAttendanceRecord(recordId, {
          punches: punches,
          totalWorkMinutes: totalWorkMinutes,
          hasMissedPunch: punches.length % 2 !== 0,
          exceptionIds: (selectedRecord as any)?.exceptionIds || [],
          // If the record is complete after manual correction, allow it to be finalised for payroll.
          // (If it's incomplete, keep it not-finalised.)
          finalisedForPayroll: punches.length > 0 && punches.length % 2 === 0,
        });
        console.log("[Manual Attendance] Update response:", updateRes);
        const resPunches = Array.isArray((updateRes as any)?.punches) ? (updateRes as any).punches : [];
        showToast(
          `Attendance record updated (id=${recordId}). Saved punches=${resPunches.length}. Check this _id in Mongo.`,
          "success",
        );
      } else {
        // Create new record
        const createRes = await timeManagementApi.createAttendanceRecord({
          employeeId: selectedEmployeeId,
          punches: punches,
          totalWorkMinutes: totalWorkMinutes,
          hasMissedPunch: punches.length % 2 !== 0,
          exceptionIds: [],
          finalisedForPayroll: punches.length > 0 && punches.length % 2 === 0,
        });
        console.log("[Manual Attendance] Create response:", createRes);
        showToast("Attendance record created successfully", "success");
      }

      setIsCreateModalOpen(false);
      setIsEditModalOpen(false);
      setSelectedRecord(null);
      
      // Reload records
      if (selectedEmployeeId) {
        const response = await timeManagementApi.getAttendanceRecords(selectedEmployeeId);
        let records: AttendanceRecord[] = [];
        if (response?.records && Array.isArray(response.records)) {
          records = response.records;
        } else if (Array.isArray(response)) {
          records = response;
        } else if (response?.data?.records && Array.isArray(response.data.records)) {
          records = response.data.records;
        }
        setAttendanceRecords(records);
      }
    } catch (error: any) {
      const details =
        error?.responseData?.message ||
        error?.responseData?.error ||
        error?.message ||
        "Failed to save attendance record";
      showToast(`Server error: ${details}`, "error");
    } finally {
      setSaving(false);
    }
  };

  const selectedEmployee = teamMembers.find(
    (m: any) => (m.id || m._id) === selectedEmployeeId
  );

  return (
    <ProtectedRoute allowedRoles={[SystemRole.DEPARTMENT_HEAD]}>
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Manual Attendance Recording</h1>
            <p className="text-gray-600 mt-1">Record or correct attendance manually for team members</p>
          </div>
          <Link
            href="/dashboard/time-management"
            className="text-blue-600 hover:underline font-medium"
          >
            ← Back to Time Management
          </Link>
        </div>

        {/* Team Member Selection */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Select Team Member</CardTitle>
            <CardDescription>Choose a team member to record or correct their attendance</CardDescription>
          </CardHeader>
          <CardContent>
            <Select
              label="Team Member"
              value={selectedEmployeeId}
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
              options={[
                { value: "", label: "Select a team member..." },
                ...teamMembers.map((member) => ({
                  value: (member as any).id || (member as any)._id || "",
                  label: member.fullName || `${member.firstName || ""} ${member.lastName || ""}`.trim() || "Unknown",
                })),
              ]}
            />
          </CardContent>
        </Card>

        {/* Actions */}
        {selectedEmployeeId && (
          <div className="mb-6">
            <Button onClick={handleCreateNew} variant="primary">
              Record New Attendance
            </Button>
          </div>
        )}

        {/* Attendance Records */}
        {selectedEmployeeId && (
          <Card>
            <CardHeader>
              <CardTitle>
                Attendance Records for {selectedEmployee?.firstName} {selectedEmployee?.lastName}
              </CardTitle>
              <CardDescription>
                {loadingRecords ? "Loading..." : `${attendanceRecords.length} records found`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingRecords ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">Loading attendance records...</p>
                </div>
              ) : attendanceRecords.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No attendance records found</p>
                  <p className="text-gray-400 text-sm mt-2">Click "Record New Attendance" to create a record</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Clock In
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Clock Out
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Work Hours
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {attendanceRecords.map((record) => {
                        const derived = getClockInOutFromPunches(record);
                        const safeDate = (v: any) => {
                          if (!v) return undefined;
                          const d = v instanceof Date ? v : new Date(v);
                          return isNaN(d.getTime()) ? undefined : d;
                        };

                        const recordDateValue =
                          safeDate((record as any).date) ||
                          derived.clockIn ||
                          derived.clockOut;
                        const recordDate = recordDateValue
                          ? recordDateValue.toLocaleDateString()
                          : "N/A";

                        const clockInValue =
                          safeDate((record as any).clockIn) || derived.clockIn;
                        const clockOutValue =
                          safeDate((record as any).clockOut) || derived.clockOut;
                        const clockIn = clockInValue ? clockInValue.toLocaleString() : "N/A";
                        const clockOut = clockOutValue ? clockOutValue.toLocaleString() : "N/A";
                        
                        // Calculate duration: use totalWorkMinutes if available, otherwise calculate from times
                        let workMinutes = record.totalWorkMinutes;
                        if (!workMinutes || workMinutes <= 0) {
                          if (clockInValue && clockOutValue) {
                            const diffMs = clockOutValue.getTime() - clockInValue.getTime();
                            if (diffMs > 0) {
                              workMinutes = Math.floor(diffMs / (1000 * 60));
                            }
                          }
                        }
                        const hours = workMinutes ? (workMinutes / 60).toFixed(2) : "-";
                        
                        // Determine status: if clock out is missing, show "MISSED PUNCH"
                        let displayStatus: string = (record.status as string) || 'N/A';
                        if (!clockOutValue) {
                          displayStatus = 'MISSED PUNCH';
                        }
                        
                        return (
                          <tr key={record._id || record.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {recordDate}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {clockIn}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {clockOut}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {hours} {hours !== "-" ? "hrs" : ""}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 text-xs rounded-full ${
                                displayStatus === 'COMPLETE' 
                                  ? 'bg-green-100 text-green-800'
                                  : displayStatus === 'MISSED PUNCH'
                                  ? 'bg-red-100 text-red-800'
                                  : displayStatus === 'INCOMPLETE'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : displayStatus === 'CORRECTION_PENDING'
                                  ? 'bg-orange-100 text-orange-800'
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {displayStatus}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <Button
                                onClick={() => handleEdit(record)}
                                variant="outline"
                                size="sm"
                              >
                                Edit
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Create/Edit Modal */}
        {(isCreateModalOpen || isEditModalOpen) && (
          <Modal
            isOpen={true}
            onClose={() => {
              setIsCreateModalOpen(false);
              setIsEditModalOpen(false);
              setSelectedRecord(null);
            }}
            title={selectedRecord ? "Edit Attendance Record" : "Record New Attendance"}
          >
            <div className="space-y-4">
              {selectedRecord && (
                <p className="text-xs text-gray-500">
                  Editing record ID: <code>{selectedRecord._id || selectedRecord.id}</code>
                </p>
              )}
              <Input
                type="date"
                label="Date *"
                value={formData.date}
                onChange={(e) => {
                  const newDate = e.target.value;
                  setFormData((prev) => ({
                    ...prev,
                    date: newDate,
                  }));
                }}
              />
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  type="text"
                  label="Clock In Time * (HH:MM)"
                  value={formData.clockInTime}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, clockInTime: e.target.value }))
                  }
                  placeholder="09:30"
                />
                <Select
                  label="AM/PM"
                  value={formData.clockInPeriod}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, clockInPeriod: e.target.value as AmPm }))
                  }
                  options={[
                    { value: "AM", label: "AM" },
                    { value: "PM", label: "PM" },
                  ]}
                />
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  type="text"
                  label="Clock Out Time (HH:MM)"
                  value={formData.clockOutTime}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, clockOutTime: e.target.value }))
                  }
                  placeholder="05:30"
                />
                <Select
                  label="AM/PM"
                  value={formData.clockOutPeriod}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, clockOutPeriod: e.target.value as AmPm }))
                  }
                  options={[
                    { value: "AM", label: "AM" },
                    { value: "PM", label: "PM" },
                  ]}
                />
              </div>
              
              <Input
                type="text"
                label="Reason (Optional)"
                value={formData.reason}
                onChange={(e) => setFormData((prev) => ({ ...prev, reason: e.target.value }))}
                placeholder="Reason for manual recording/correction"
              />

              <div className="flex gap-3 pt-4">
                <Button
                  onClick={handleSave}
                  variant="primary"
                  // Keep clickable to show validation errors (some browsers can render
                  // datetime-local fields in a way that looks filled even when the underlying value is invalid).
                  disabled={saving}
                  className="flex-1"
                >
                  {saving ? "Saving..." : selectedRecord ? "Update Record" : "Create Record"}
                </Button>
                <Button
                  onClick={() => {
                    setIsCreateModalOpen(false);
                    setIsEditModalOpen(false);
                    setSelectedRecord(null);
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </Modal>
        )}

        <Toast message={toast.message} type={toast.type} isVisible={toast.isVisible} onClose={hideToast} />
      </div>
    </ProtectedRoute>
  );
}

