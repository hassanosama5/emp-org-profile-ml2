"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/hooks/use-auth";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { SystemRole } from "@/types";
import { OvertimeRequestForm } from "@/components/time-management/OvertimeRequestForm";
import { OvertimeRequestList } from "@/components/time-management/OvertimeRequestList";
import { timeManagementApi } from "@/lib/api/time-management/time-management.api";
import { AttendanceRecord, TimeException, TimeExceptionType, TimeExceptionStatus } from "@/types/time-management";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/shared/ui/Card";
import { Button } from "@/components/shared/ui/Button";
import { Input } from "@/components/shared/ui/Input";
import { Modal } from "@/components/leaves/Modal";
import { Toast, useToast } from "@/components/leaves/Toast";

export default function TimeRequestsPage() {
  const { user } = useAuth();
  const { toast, showToast, hideToast } = useToast();
  
  const [activeTab, setActiveTab] = useState<"overtime" | "permission" | "exception">("overtime");
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(true);
  const [showOvertimeForm, setShowOvertimeForm] = useState(false);
  const [showPermissionForm, setShowPermissionForm] = useState(false);
  const [showExceptionForm, setShowExceptionForm] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  
  // Lists for permission and exception requests
  const [permissionRequests, setPermissionRequests] = useState<TimeException[]>([]);
  const [exceptionRequests, setExceptionRequests] = useState<TimeException[]>([]);
  const [loadingPermission, setLoadingPermission] = useState(false);
  const [loadingException, setLoadingException] = useState(false);

  // Permission form state
  const [permissionForm, setPermissionForm] = useState({
    permissionType: "",
    reason: "",
    startDate: "",
    endDate: "",
    durationMinutes: "",
  });

  // Exception form state
  const [exceptionForm, setExceptionForm] = useState({
    type: TimeExceptionType.MISSED_PUNCH,
    attendanceRecordId: "",
    reason: "",
    date: "",
    time: "",
  });

  useEffect(() => {
    if (!user?.id) return;

    const fetchRecords = async () => {
      try {
        setLoadingRecords(true);
        const response = await timeManagementApi.getAttendanceRecords(user.id);

        let records: any[] = [];

        if (response?.records && Array.isArray(response.records)) {
          records = response.records;
        } else if (Array.isArray(response)) {
          records = response;
        } else if (response?.data?.records && Array.isArray(response.data.records)) {
          records = response.data.records;
        }

        setAttendanceRecords(records);
      } catch (err) {
        console.error("Failed to fetch attendance records:", err);
      } finally {
        setLoadingRecords(false);
      }
    };

    fetchRecords();
  }, [user?.id, refreshKey]);

  // Fetch permission requests (MANUAL_ADJUSTMENT type with PERMISSION REQUEST in reason)
  useEffect(() => {
    if (!user?.id || activeTab !== "permission") return;
    
    const fetchPermissionRequests = async () => {
      try {
        setLoadingPermission(true);
        const allExceptions = await timeManagementApi.getAllTimeExceptions({
          employeeId: user.id,
          type: TimeExceptionType.MANUAL_ADJUSTMENT,
        });
        // Filter for permission requests (those with "PERMISSION REQUEST" in reason)
        const permissions = allExceptions.filter((ex: TimeException) => 
          ex.reason?.includes("PERMISSION REQUEST")
        );
        setPermissionRequests(permissions);
      } catch (error: any) {
        console.error("Failed to fetch permission requests:", error);
        setPermissionRequests([]);
      } finally {
        setLoadingPermission(false);
      }
    };

    fetchPermissionRequests();
  }, [user?.id, activeTab, refreshKey]);

  // Fetch time exception requests (excluding OVERTIME_REQUEST and permission requests)
  useEffect(() => {
    if (!user?.id || activeTab !== "exception") return;
    
    const fetchExceptionRequests = async () => {
      try {
        setLoadingException(true);
        const allExceptions = await timeManagementApi.getAllTimeExceptions({
          employeeId: user.id,
        });
        // Filter out overtime requests and permission requests
        const exceptions = allExceptions.filter((ex: TimeException) => 
          ex.type !== TimeExceptionType.OVERTIME_REQUEST &&
          !ex.reason?.includes("PERMISSION REQUEST")
        );
        setExceptionRequests(exceptions);
      } catch (error: any) {
        console.error("Failed to fetch exception requests:", error);
        setExceptionRequests([]);
      } finally {
        setLoadingException(false);
      }
    };

    fetchExceptionRequests();
  }, [user?.id, activeTab, refreshKey]);

  const handleOvertimeSuccess = () => {
    setShowOvertimeForm(false);
    setRefreshKey(prev => prev + 1);
  };

  const handlePermissionSubmit = async () => {
    if (!user?.id || !permissionForm.permissionType || !permissionForm.reason) {
      showToast("Please fill in all required fields", "error");
      return;
    }

    try {
      // Create permission request as a time exception
      // Permission requests are stored as MANUAL_ADJUSTMENT type with permission details in the reason
      // The assignedTo will be auto-assigned to the employee's department head/manager
      const exceptionData = {
        employeeId: user.id,
        type: TimeExceptionType.MANUAL_ADJUSTMENT,
        attendanceRecordId: attendanceRecords[0]?._id || "", // Use first available record or empty
        assignedTo: user.id, // Will be auto-assigned to manager by backend
        status: TimeExceptionStatus.PENDING,
        reason: `PERMISSION REQUEST | Type: ${permissionForm.permissionType} | Duration: ${permissionForm.durationMinutes} minutes | Start: ${permissionForm.startDate || 'N/A'} | End: ${permissionForm.endDate || 'N/A'} | Reason: ${permissionForm.reason}`,
      };

      await timeManagementApi.createTimeException(exceptionData);
      showToast("Permission request submitted successfully", "success");
      setShowPermissionForm(false);
      setPermissionForm({
        permissionType: "",
        reason: "",
        startDate: "",
        endDate: "",
        durationMinutes: "",
      });
      setRefreshKey(prev => prev + 1);
    } catch (error: any) {
      showToast(error.message || "Failed to submit permission request", "error");
    }
  };

  const handleExceptionSubmit = async () => {
    if (!user?.id || !exceptionForm.type || !exceptionForm.reason) {
      showToast("Please fill in all required fields", "error");
      return;
    }

    try {
      const exceptionData = {
        employeeId: user.id,
        type: exceptionForm.type,
        attendanceRecordId: exceptionForm.attendanceRecordId || attendanceRecords[0]?._id || "",
        assignedTo: user.id, // Will be auto-assigned to manager
        status: TimeExceptionStatus.PENDING,
        reason: exceptionForm.reason,
      };

      await timeManagementApi.createTimeException(exceptionData);
      showToast("Time exception request submitted successfully", "success");
      setShowExceptionForm(false);
      setExceptionForm({
        type: TimeExceptionType.MISSED_PUNCH,
        attendanceRecordId: "",
        reason: "",
        date: "",
        time: "",
      });
      setRefreshKey(prev => prev + 1);
    } catch (error: any) {
      showToast(error.message || "Failed to submit time exception request", "error");
    }
  };

  return (
    <ProtectedRoute
      allowedRoles={[
        SystemRole.DEPARTMENT_EMPLOYEE,
        SystemRole.DEPARTMENT_HEAD,
        SystemRole.HR_ADMIN,
        SystemRole.HR_MANAGER,
        SystemRole.SYSTEM_ADMIN,
      ]}
    >
      <div className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Time Requests</h1>
          <p className="text-gray-600 mt-1">
            Submit and track your overtime, permission, and time exception requests
          </p>
        </div>

        {/* Tabs */}
        <Card className="mb-6">
          <CardContent className="p-0">
            <div className="flex border-b border-gray-200 overflow-x-auto">
              <button
                onClick={() => setActiveTab("overtime")}
                className={`px-6 py-4 font-medium whitespace-nowrap ${
                  activeTab === "overtime"
                    ? "border-b-2 border-blue-600 text-blue-600"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Overtime Requests
              </button>
              <button
                onClick={() => setActiveTab("permission")}
                className={`px-6 py-4 font-medium whitespace-nowrap ${
                  activeTab === "permission"
                    ? "border-b-2 border-blue-600 text-blue-600"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Permission Requests
              </button>
              <button
                onClick={() => setActiveTab("exception")}
                className={`px-6 py-4 font-medium whitespace-nowrap ${
                  activeTab === "exception"
                    ? "border-b-2 border-blue-600 text-blue-600"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Time Exception Requests
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Tab Content */}
        {activeTab === "overtime" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  {!showOvertimeForm ? (
                    <Button
                      onClick={() => setShowOvertimeForm(true)}
                      variant="primary"
                      className="w-full"
                      disabled={loadingRecords || attendanceRecords.length === 0}
                    >
                      + Request Overtime
                    </Button>
                  ) : (
                    <Button
                      onClick={() => setShowOvertimeForm(false)}
                      variant="outline"
                      className="w-full"
                    >
                      Cancel Request
                    </Button>
                  )}
                </CardContent>
              </Card>
            </div>
            <div className="lg:col-span-2 space-y-6">
              {showOvertimeForm && (
                <OvertimeRequestForm
                  attendanceRecords={attendanceRecords}
                  onSuccess={handleOvertimeSuccess}
                  onCancel={() => setShowOvertimeForm(false)}
                />
              )}
              {!showOvertimeForm && <OvertimeRequestList key={refreshKey} />}
            </div>
          </div>
        )}

        {activeTab === "permission" && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Permission Requests</CardTitle>
                  {!showPermissionForm && (
                    <Button
                      onClick={() => setShowPermissionForm(true)}
                      variant="primary"
                    >
                      + Request Permission
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {showPermissionForm ? (
                  <div className="space-y-4">
                    <Input
                      label="Permission Type *"
                      value={permissionForm.permissionType}
                      onChange={(e) => setPermissionForm(prev => ({ ...prev, permissionType: e.target.value }))}
                      placeholder="e.g., Early In, Late Out, Out of Hours"
                    />
                    <Input
                      label="Duration (minutes) *"
                      type="number"
                      value={permissionForm.durationMinutes}
                      onChange={(e) => setPermissionForm(prev => ({ ...prev, durationMinutes: e.target.value }))}
                      placeholder="e.g., 60"
                    />
                    <Input
                      label="Start Date"
                      type="date"
                      value={permissionForm.startDate}
                      onChange={(e) => setPermissionForm(prev => ({ ...prev, startDate: e.target.value }))}
                    />
                    <Input
                      label="End Date"
                      type="date"
                      value={permissionForm.endDate}
                      onChange={(e) => setPermissionForm(prev => ({ ...prev, endDate: e.target.value }))}
                    />
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Reason *</label>
                      <textarea
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        rows={4}
                        value={permissionForm.reason}
                        onChange={(e) => setPermissionForm(prev => ({ ...prev, reason: e.target.value }))}
                        placeholder="Explain why you need this permission"
                      />
                    </div>
                    <div className="flex gap-3">
                      <Button
                        onClick={handlePermissionSubmit}
                        variant="primary"
                        className="flex-1"
                      >
                        Submit Request
                      </Button>
                      <Button
                        onClick={() => {
                          setShowPermissionForm(false);
                          setPermissionForm({
                            permissionType: "",
                            reason: "",
                            startDate: "",
                            endDate: "",
                            durationMinutes: "",
                          });
                        }}
                        variant="outline"
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div>
                    {loadingPermission ? (
                      <div className="text-center py-12">
                        <p className="text-gray-500">Loading permission requests...</p>
                      </div>
                    ) : permissionRequests.length === 0 ? (
                      <div className="text-center py-12">
                        <p className="text-gray-500">No permission requests yet. Click the button above to create one.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <h3 className="font-semibold text-gray-900">Your Permission Requests</h3>
                        <div className="overflow-x-auto">
                          <table className="w-full border-collapse">
                            <thead>
                              <tr className="border-b border-gray-200">
                                <th className="text-left py-3 px-4 font-semibold text-gray-700">Type</th>
                                <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                                <th className="text-left py-3 px-4 font-semibold text-gray-700">Reason</th>
                                <th className="text-left py-3 px-4 font-semibold text-gray-700">Created</th>
                              </tr>
                            </thead>
                            <tbody>
                              {permissionRequests.map((request) => {
                                const reasonParts = request.reason?.split("|") || [];
                                const typePart = reasonParts.find(p => p.includes("Type:"))?.replace("Type:", "").trim() || "N/A";
                                return (
                                  <tr key={request._id || request.id} className="border-b border-gray-100 hover:bg-gray-50">
                                    <td className="py-3 px-4">{typePart}</td>
                                    <td className="py-3 px-4">
                                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                                        request.status === TimeExceptionStatus.APPROVED ? "bg-green-100 text-green-800" :
                                        request.status === TimeExceptionStatus.REJECTED ? "bg-red-100 text-red-800" :
                                        request.status === TimeExceptionStatus.PENDING ? "bg-blue-100 text-blue-800" :
                                        "bg-gray-100 text-gray-800"
                                      }`}>
                                        {request.status}
                                      </span>
                                    </td>
                                    <td className="py-3 px-4">
                                      <div className="max-w-xs truncate" title={request.reason || ""}>
                                        {reasonParts.find(p => p.includes("Reason:"))?.replace("Reason:", "").trim() || request.reason || "N/A"}
                                      </div>
                                    </td>
                                    <td className="py-3 px-4">
                                      {request.createdAt ? new Date(request.createdAt).toLocaleDateString() : "N/A"}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "exception" && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Time Exception Requests</CardTitle>
                  {!showExceptionForm && (
                    <Button
                      onClick={() => setShowExceptionForm(true)}
                      variant="primary"
                    >
                      + Request Exception
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {showExceptionForm ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Exception Type *</label>
                      <select
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={exceptionForm.type}
                        onChange={(e) => setExceptionForm(prev => ({ ...prev, type: e.target.value as TimeExceptionType }))}
                      >
                        <option value={TimeExceptionType.MISSED_PUNCH}>Missed Punch</option>
                        <option value={TimeExceptionType.LATE}>Late Arrival</option>
                        <option value={TimeExceptionType.EARLY_LEAVE}>Early Leave</option>
                        <option value={TimeExceptionType.SHORT_TIME}>Short Time</option>
                        <option value={TimeExceptionType.MANUAL_ADJUSTMENT}>Manual Adjustment</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Attendance Record</label>
                      <select
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={exceptionForm.attendanceRecordId}
                        onChange={(e) => setExceptionForm(prev => ({ ...prev, attendanceRecordId: e.target.value }))}
                      >
                        <option value="">Select attendance record</option>
                        {attendanceRecords.map((record: any) => (
                          <option key={record._id || record.id} value={record._id || record.id}>
                            {new Date(record.date || record.createdAt).toLocaleDateString()}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Reason *</label>
                      <textarea
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        rows={4}
                        value={exceptionForm.reason}
                        onChange={(e) => setExceptionForm(prev => ({ ...prev, reason: e.target.value }))}
                        placeholder="Explain the time exception"
                      />
                    </div>
                    <div className="flex gap-3">
                      <Button
                        onClick={handleExceptionSubmit}
                        variant="primary"
                        className="flex-1"
                      >
                        Submit Request
                      </Button>
                      <Button
                        onClick={() => {
                          setShowExceptionForm(false);
                          setExceptionForm({
                            type: TimeExceptionType.MISSED_PUNCH,
                            attendanceRecordId: "",
                            reason: "",
                            date: "",
                            time: "",
                          });
                        }}
                        variant="outline"
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div>
                    {loadingException ? (
                      <div className="text-center py-12">
                        <p className="text-gray-500">Loading time exception requests...</p>
                      </div>
                    ) : exceptionRequests.length === 0 ? (
                      <div className="text-center py-12">
                        <p className="text-gray-500">No time exception requests yet. Click the button above to create one.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <h3 className="font-semibold text-gray-900">Your Time Exception Requests</h3>
                        <div className="overflow-x-auto">
                          <table className="w-full border-collapse">
                            <thead>
                              <tr className="border-b border-gray-200">
                                <th className="text-left py-3 px-4 font-semibold text-gray-700">Type</th>
                                <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                                <th className="text-left py-3 px-4 font-semibold text-gray-700">Reason</th>
                                <th className="text-left py-3 px-4 font-semibold text-gray-700">Created</th>
                              </tr>
                            </thead>
                            <tbody>
                              {exceptionRequests.map((request) => (
                                <tr key={request._id || request.id} className="border-b border-gray-100 hover:bg-gray-50">
                                  <td className="py-3 px-4">
                                    {request.type.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase())}
                                  </td>
                                  <td className="py-3 px-4">
                                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                                      request.status === TimeExceptionStatus.APPROVED ? "bg-green-100 text-green-800" :
                                      request.status === TimeExceptionStatus.REJECTED ? "bg-red-100 text-red-800" :
                                      request.status === TimeExceptionStatus.PENDING ? "bg-blue-100 text-blue-800" :
                                      request.status === TimeExceptionStatus.ESCALATED ? "bg-orange-100 text-orange-800" :
                                      "bg-gray-100 text-gray-800"
                                    }`}>
                                      {request.status}
                                    </span>
                                  </td>
                                  <td className="py-3 px-4">
                                    <div className="max-w-xs truncate" title={request.reason || ""}>
                                      {request.reason || "N/A"}
                                    </div>
                                  </td>
                                  <td className="py-3 px-4">
                                    {request.createdAt ? new Date(request.createdAt).toLocaleDateString() : "N/A"}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        <Toast message={toast.message} type={toast.type} isVisible={toast.isVisible} onClose={hideToast} />
      </div>
    </ProtectedRoute>
  );
}
