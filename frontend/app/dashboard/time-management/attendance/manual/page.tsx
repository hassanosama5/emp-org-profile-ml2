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

  // Form state for creating/editing attendance
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    clockIn: "",
    clockOut: "",
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
    setFormData({
      date: new Date().toISOString().split('T')[0],
      clockIn: "",
      clockOut: "",
      reason: "",
    });
    setIsCreateModalOpen(true);
  };

  const handleEdit = (record: AttendanceRecord) => {
    const recordDate = record.date ? new Date(record.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
    const clockIn = record.clockIn ? new Date(record.clockIn).toISOString().slice(0, 16) : "";
    const clockOut = record.clockOut ? new Date(record.clockOut).toISOString().slice(0, 16) : "";
    
    setFormData({
      date: recordDate,
      clockIn: clockIn,
      clockOut: clockOut,
      reason: "",
    });
    setSelectedRecord(record);
    setIsEditModalOpen(true);
  };

  const handleSave = async () => {
    if (!selectedEmployeeId) {
      showToast("Please select a team member", "error");
      return;
    }

    if (!formData.clockIn) {
      showToast("Clock-in time is required", "error");
      return;
    }

    try {
      setSaving(true);
      
      const punches: Array<{ type: 'IN' | 'OUT'; time: Date }> = [];
      if (formData.clockIn) {
        punches.push({
          type: 'IN' as const,
          time: new Date(formData.clockIn),
        });
      }
      if (formData.clockOut) {
        punches.push({
          type: 'OUT' as const,
          time: new Date(formData.clockOut),
        });
      }

      // Calculate total work minutes
      let totalWorkMinutes = 0;
      if (formData.clockIn && formData.clockOut) {
        const clockInTime = new Date(formData.clockIn).getTime();
        const clockOutTime = new Date(formData.clockOut).getTime();
        totalWorkMinutes = Math.max(0, Math.round((clockOutTime - clockInTime) / (1000 * 60)));
      }

      if (selectedRecord) {
        // Update existing record
        await timeManagementApi.updateAttendanceRecord(selectedRecord._id || selectedRecord.id || "", {
          punches: punches,
          totalWorkMinutes: totalWorkMinutes,
          hasMissedPunch: punches.length % 2 !== 0,
          exceptionIds: [],
          finalisedForPayroll: false,
        });
        showToast("Attendance record updated successfully", "success");
      } else {
        // Create new record
        await timeManagementApi.createAttendanceRecord({
          employeeId: selectedEmployeeId,
          punches: punches,
          totalWorkMinutes: totalWorkMinutes,
          hasMissedPunch: punches.length % 2 !== 0,
          exceptionIds: [],
          finalisedForPayroll: false,
        });
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
      showToast(error.message || "Failed to save attendance record", "error");
    } finally {
      setSaving(false);
    }
  };

  const selectedEmployee = teamMembers.find(m => m.id === selectedEmployeeId);

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
                  value: member.id || "",
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
                        const recordDate = record.date ? new Date(record.date).toLocaleDateString() : "N/A";
                        const clockIn = record.clockIn ? new Date(record.clockIn).toLocaleString() : "N/A";
                        const clockOut = record.clockOut ? new Date(record.clockOut).toLocaleString() : "N/A";
                        const hours = record.totalWorkMinutes ? (record.totalWorkMinutes / 60).toFixed(2) : "0.00";
                        
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
                              {hours} hrs
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 text-xs rounded-full ${
                                record.status === 'COMPLETE' 
                                  ? 'bg-green-100 text-green-800'
                                  : record.status === 'INCOMPLETE'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {record.status || 'N/A'}
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
              <Input
                type="date"
                label="Date *"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
              
              <Input
                type="datetime-local"
                label="Clock In Time *"
                value={formData.clockIn}
                onChange={(e) => setFormData({ ...formData, clockIn: e.target.value })}
              />
              
              <Input
                type="datetime-local"
                label="Clock Out Time"
                value={formData.clockOut}
                onChange={(e) => setFormData({ ...formData, clockOut: e.target.value })}
              />
              
              <Input
                type="text"
                label="Reason (Optional)"
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                placeholder="Reason for manual recording/correction"
              />

              <div className="flex gap-3 pt-4">
                <Button
                  onClick={handleSave}
                  variant="primary"
                  disabled={saving || !formData.clockIn}
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

