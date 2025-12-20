"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/hooks/use-auth";
import { timeManagementApi } from "@/lib/api/time-management/time-management.api";
import { employeeProfileApi } from "@/lib/api/employee-profile/profile";
import { employeeProfileApi as employeeProfileApiFull } from "@/lib/api/employee-profile/employee-profile";
import { SystemRole } from "@/types";
import { AttendanceRecord } from "@/types/time-management";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/shared/ui/Card";
import { Button } from "@/components/shared/ui/Button";
import { Input } from "@/components/shared/ui/Input";
import { Select } from "@/components/leaves/Select";
import { Toast, useToast } from "@/components/leaves/Toast";

interface OvertimeRequestFormProps {
  attendanceRecords: AttendanceRecord[];
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function OvertimeRequestForm({
  attendanceRecords,
  onSuccess,
  onCancel,
}: OvertimeRequestFormProps) {
  const { user } = useAuth();
  const { toast, showToast, hideToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [managers, setManagers] = useState<Array<{ id: string; name: string }>>([]);
  const [loadingManagers, setLoadingManagers] = useState(false);

  const [formData, setFormData] = useState({
    attendanceRecordId: "",
    requestedHours: "",
    requestedMinutes: "",
    reason: "",
    assignedTo: "",
  });

  // Load department head automatically
  useEffect(() => {
    const loadDepartmentHead = async () => {
      if (!user?.id) return;
      
      try {
        setLoadingManagers(true);
        
        // Step 1: Get employee's profile
        const employeeProfile = await employeeProfileApi.getMyProfile();
        console.log("Employee profile:", employeeProfile);
        
        // Method 1: Find manager via supervisorPositionId
        // The manager is the employee who has supervisorPositionId as their primaryPositionId
        const supervisorPositionId = (employeeProfile as any).supervisorPositionId?._id || 
                                     (employeeProfile as any).supervisorPositionId;
        
        console.log("🔍 Employee profile data:", {
          employeeId: user.id,
          supervisorPositionId: supervisorPositionId?.toString(),
          primaryDepartmentId: (employeeProfile as any).primaryDepartmentId?._id || (employeeProfile as any).primaryDepartmentId,
        });
        
        // Helper function to normalize ID for comparison (handles both ObjectId and string)
        const normalizeId = (id: any): string | null => {
          if (!id) return null;
          if (typeof id === 'string') return id;
          if (id._id) return id._id.toString();
          if (id.toString) return id.toString();
          return String(id);
        };
        
        if (supervisorPositionId) {
          const supervisorPosStr = supervisorPositionId.toString();
          console.log("🔍 Searching for manager with primaryPositionId:", supervisorPosStr);
          
          // Strategy: Search department first (no permissions needed), then broader search if needed
          const departmentId = (employeeProfile as any).primaryDepartmentId?._id || 
                              (employeeProfile as any).primaryDepartmentId || 
                              (employeeProfile as any).primaryDepartmentId?.toString();
          
          // Step 1: Search in department first (most likely to work for regular employees)
          if (departmentId) {
            try {
              const departmentEmployees = await employeeProfileApiFull.getDepartmentEmployees(departmentId.toString());
              console.log(`📋 Searching ${departmentEmployees.length} employees in department`);
              
              for (const emp of departmentEmployees) {
                const empPrimaryPos = (emp as any).primaryPositionId?._id || 
                                    (emp as any).primaryPositionId;
                const empId = (emp as any)._id || (emp as any).id;
                
                if (!empId || empId.toString() === user.id) continue;
                
                const empPrimaryPosStr = normalizeId(empPrimaryPos);
                const supervisorPosNormalized = normalizeId(supervisorPositionId);
                
                if (empPrimaryPosStr && supervisorPosNormalized && empPrimaryPosStr === supervisorPosNormalized) {
                  const managerName = (emp as any).fullName || 
                                     `${(emp as any).firstName} ${(emp as any).lastName}`.trim() || 
                                     "Manager";
                  
                  console.log("✅ Found manager in department:", empId, managerName);
                  setFormData(prev => ({ ...prev, assignedTo: empId.toString() }));
                  setManagers([{
                    id: empId.toString(),
                    name: managerName,
                  }]);
                  return;
                }
              }
            } catch (deptErr: any) {
              // Don't show error toast for expected permission errors
              const errorMessage = deptErr?.message || deptErr?.response?.data?.message || String(deptErr);
              if (errorMessage.includes('Access denied') || errorMessage.includes('permission')) {
                console.warn("⚠️ Permission denied for getDepartmentEmployees (expected for some employees):", errorMessage);
              } else {
                console.warn("Could not get department employees:", errorMessage);
              }
            }
          }
          
          // Step 2: Fallback - Try broader search (may require permissions, but catch gracefully)
          try {
            const allEmployeesResponse = await employeeProfileApiFull.getAllEmployees({ limit: 1000 });
            const allEmployees = allEmployeesResponse?.data || [];
            console.log(`🔍 Searching ${allEmployees.length} employees for manager (broader search)...`);
            
            for (const emp of allEmployees) {
              const empPrimaryPos = (emp as any).primaryPositionId?._id || 
                                  (emp as any).primaryPositionId;
              const empId = (emp as any)._id || (emp as any).id;
              
              if (!empId || empId.toString() === user.id) continue;
              
              const empPrimaryPosStr = normalizeId(empPrimaryPos);
              const supervisorPosNormalized = normalizeId(supervisorPositionId);
              
              if (empPrimaryPosStr && supervisorPosNormalized && empPrimaryPosStr === supervisorPosNormalized) {
                const managerName = (emp as any).fullName || 
                                   `${(emp as any).firstName} ${(emp as any).lastName}`.trim() || 
                                   "Manager";
                
                console.log("✅ Found manager via supervisorPositionId (broader search):", empId, managerName);
                setFormData(prev => ({ ...prev, assignedTo: empId.toString() }));
                setManagers([{
                  id: empId.toString(),
                  name: managerName,
                }]);
                return;
              }
            }
          } catch (err: any) {
            // Permission denied or other error - this is expected for regular employees
            // Don't show error toast for expected permission errors
            const errorMessage = err?.message || err?.response?.data?.message || String(err);
            if (errorMessage.includes('Access denied') || errorMessage.includes('permission')) {
              console.warn("⚠️ Permission denied for getAllEmployees (expected for regular employees):", errorMessage);
            } else {
              console.warn("Could not search all employees:", errorMessage);
            }
          }
        } else {
          console.warn("⚠️ Employee does not have supervisorPositionId set");
        }
        
        // Method 2: Find DEPARTMENT_HEAD role in department (no permissions needed)
        const departmentId = (employeeProfile as any).primaryDepartmentId?._id || 
                            (employeeProfile as any).primaryDepartmentId || 
                            (employeeProfile as any).primaryDepartmentId?.toString();
        
        if (departmentId) {
          try {
            console.log("🔍 Method 2: Searching department for DEPARTMENT_HEAD role...");
            const departmentEmployees = await employeeProfileApiFull.getDepartmentEmployees(departmentId.toString());
            
            for (const emp of departmentEmployees) {
              const empId = (emp as any)._id || (emp as any).id;
              if (!empId || empId.toString() === user.id) continue;
              
              try {
                const roles = await employeeProfileApiFull.getEmployeeRoles(empId.toString());
                
                if (roles.roles && Array.isArray(roles.roles)) {
                  const hasDepartmentHeadRole = roles.roles.some(
                    (role: string) => role === SystemRole.DEPARTMENT_HEAD || 
                                    role?.toLowerCase() === 'department head' ||
                                    role?.toLowerCase() === 'department_head' ||
                                    (role?.toLowerCase().includes('department') && role?.toLowerCase().includes('head'))
                  );
                  
                  if (hasDepartmentHeadRole) {
                    const managerName = (emp as any).fullName || 
                                       `${(emp as any).firstName} ${(emp as any).lastName}`.trim() || 
                                       "Department Head";
                    
                    console.log("✅ Found department head in department:", empId, managerName);
                    setFormData(prev => ({ ...prev, assignedTo: empId.toString() }));
                    setManagers([{
                      id: empId.toString(),
                      name: managerName,
                    }]);
                    return;
                  }
                }
              } catch (err) {
                // Skip if we can't check roles
                continue;
              }
            }
          } catch (err: any) {
            // Don't show error toast for expected permission errors
            const errorMessage = err?.message || err?.response?.data?.message || String(err);
            if (errorMessage.includes('Access denied') || errorMessage.includes('permission')) {
              console.warn("⚠️ Permission denied for getDepartmentEmployees (expected for some employees):", errorMessage);
            } else {
              console.warn("Could not search department for DEPARTMENT_HEAD:", errorMessage);
            }
          }
        }
        
        // Method 3: Fallback - Try broader search for DEPARTMENT_HEAD (may require permissions)
        try {
          console.log("🔍 Method 3: Searching all employees for DEPARTMENT_HEAD role (broader search)...");
          const allEmployeesResponse = await employeeProfileApiFull.getAllEmployees({ limit: 1000 });
          const allEmployees = allEmployeesResponse?.data || [];
          
          const employeeSupervisorPos = normalizeId(supervisorPositionId);
          
          for (const emp of allEmployees) {
            const empId = (emp as any)._id || (emp as any).id;
            if (!empId || empId.toString() === user.id) continue;
            
            try {
              const roles = await employeeProfileApiFull.getEmployeeRoles(empId.toString());
              
              if (roles.roles && Array.isArray(roles.roles)) {
                const hasDepartmentHeadRole = roles.roles.some(
                  (role: string) => role === SystemRole.DEPARTMENT_HEAD || 
                                  role?.toLowerCase() === 'department head' ||
                                  role?.toLowerCase() === 'department_head' ||
                                  (role?.toLowerCase().includes('department') && role?.toLowerCase().includes('head'))
                );
                
                if (hasDepartmentHeadRole) {
                  // Verify: Check if this manager's primaryPositionId matches employee's supervisorPositionId
                  const managerPrimaryPos = normalizeId((emp as any).primaryPositionId?._id || (emp as any).primaryPositionId);
                  
                  // If supervisorPositionId matches, or if we don't have supervisorPositionId, use this manager
                  if (!employeeSupervisorPos || (managerPrimaryPos && employeeSupervisorPos === managerPrimaryPos)) {
                    const managerName = (emp as any).fullName || 
                                       `${(emp as any).firstName} ${(emp as any).lastName}`.trim() || 
                                       "Department Head";
                    
                    console.log("✅ Found department head via role (broader search):", empId, managerName);
                    setFormData(prev => ({ ...prev, assignedTo: empId.toString() }));
                    setManagers([{
                      id: empId.toString(),
                      name: managerName,
                    }]);
                    return;
                  }
                }
              }
            } catch (err) {
              // Skip if we can't check roles
              continue;
            }
          }
        } catch (err: any) {
          // Permission denied or other error - this is expected for regular employees
          // Don't show error toast for expected permission errors
          const errorMessage = err?.message || err?.response?.data?.message || String(err);
          if (errorMessage.includes('Access denied') || errorMessage.includes('permission')) {
            console.warn("⚠️ Permission denied for getAllEmployees (expected for regular employees):", errorMessage);
          } else {
            console.warn("Could not search all employees for DEPARTMENT_HEAD:", errorMessage);
          }
        }
        
        
        // Fallback: use current user's ID
        console.warn("No manager found - using fallback");
        setFormData(prev => ({ ...prev, assignedTo: user.id }));
        setManagers([{
          id: user.id,
          name: "Manager not found - please contact HR",
        }]);
        
      } catch (error) {
        console.error("Failed to load department head:", error);
        // Fallback: use current user's ID
        setFormData(prev => ({ ...prev, assignedTo: user?.id || "" }));
        setManagers([{
          id: user?.id || "",
          name: "Manager not found - please contact HR",
        }]);
      } finally {
        setLoadingManagers(false);
      }
    };

    loadDepartmentHead();
  }, [user?.id]);

  // Auto-select first attendance record if available
  useEffect(() => {
    if (attendanceRecords.length > 0 && !formData.attendanceRecordId) {
      const firstRecord = attendanceRecords[0];
      setFormData(prev => ({
        ...prev,
        attendanceRecordId: (firstRecord as any)._id || (firstRecord as any).id || "",
      }));
    }
  }, [attendanceRecords, formData.attendanceRecordId]);

  const formatRecordLabel = (record: AttendanceRecord) => {
    const date = record.date
      ? new Date(record.date).toLocaleDateString([], {
          weekday: "short",
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : "Unknown Date";
    
    // Extract clock in/out from punches if available
    let clockIn = "N/A";
    let clockOut = "N/A";
    
    if (record.punches && Array.isArray(record.punches) && record.punches.length > 0) {
      const inPunch = record.punches.find((p: any) => p.type === "IN");
      const outPunch = record.punches.find((p: any) => p.type === "OUT");
      
      if (inPunch?.time) {
        clockIn = new Date(inPunch.time).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });
      }
      if (outPunch?.time) {
        clockOut = new Date(outPunch.time).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });
      }
    } else {
      // Fallback to clockIn/clockOut if punches not available
      if (record.clockIn) {
        clockIn = new Date(record.clockIn).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });
      }
      if (record.clockOut) {
        clockOut = new Date(record.clockOut).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });
      }
    }
    
    const totalMinutes = record.totalWorkMinutes || 0;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    
    return `${date} - In: ${clockIn}, Out: ${clockOut} (${hours}h ${minutes}m)`;
  };

  const calculateTotalMinutes = () => {
    const hours = parseInt(formData.requestedHours) || 0;
    const minutes = parseInt(formData.requestedMinutes) || 0;
    return hours * 60 + minutes;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user?.id) {
      showToast("User not authenticated", "error");
      return;
    }

    if (!formData.attendanceRecordId) {
      showToast("Please select an attendance record", "error");
      return;
    }

    const totalMinutes = calculateTotalMinutes();
    if (totalMinutes <= 0) {
      showToast("Please enter valid overtime hours/minutes", "error");
      return;
    }

    if (!formData.reason.trim()) {
      showToast("Please provide a reason for the overtime request", "error");
      return;
    }

    if (!formData.assignedTo) {
      showToast("Please select a manager to assign this request to", "error");
      return;
    }

    try {
      setLoading(true);
      await timeManagementApi.requestOvertimeApproval({
        employeeId: user.id,
        attendanceRecordId: formData.attendanceRecordId,
        requestedMinutes: totalMinutes,
        reason: formData.reason.trim(),
        assignedTo: formData.assignedTo,
      });

      showToast("Overtime request submitted successfully", "success");
      
      // Reset form
      setFormData({
        attendanceRecordId: "",
        requestedHours: "",
        requestedMinutes: "",
        reason: "",
        assignedTo: managers[0]?.id || user.id,
      });

      if (onSuccess) {
        setTimeout(() => {
          onSuccess();
        }, 1500);
      }
    } catch (error: any) {
      console.error("Failed to submit overtime request:", error);
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to submit overtime request";
      showToast(errorMessage, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
      />
      
      <CardHeader>
        <CardTitle>Request Overtime Approval</CardTitle>
        <CardDescription>
          Submit a request for overtime approval based on your attendance record
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Attendance Record <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.attendanceRecordId}
              onChange={(e) =>
                setFormData({ ...formData, attendanceRecordId: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="">-- Select an attendance record --</option>
              {attendanceRecords.map((record) => (
                <option
                  key={(record as any)._id || record.id}
                  value={(record as any)._id || record.id}
                >
                  {formatRecordLabel(record)}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Choose the attendance record for which you're requesting overtime
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Overtime Hours <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                min="0"
                max="24"
                value={formData.requestedHours}
                onChange={(e) =>
                  setFormData({ ...formData, requestedHours: e.target.value })
                }
                placeholder="0"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Overtime Minutes <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                min="0"
                max="59"
                value={formData.requestedMinutes}
                onChange={(e) =>
                  setFormData({ ...formData, requestedMinutes: e.target.value })
                }
                placeholder="0"
                required
              />
            </div>
          </div>
          <p className="text-xs text-gray-500 -mt-2">
            Total: {calculateTotalMinutes()} minutes ({Math.floor(calculateTotalMinutes() / 60)}h {calculateTotalMinutes() % 60}m)
          </p>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Assign To (Manager) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={managers.find(m => m.id === formData.assignedTo)?.name || "Loading..."}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 cursor-not-allowed"
              disabled
              readOnly
            />
            <p className="mt-1 text-xs text-gray-500">
              Automatically assigned to your department head
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reason for Overtime <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.reason}
              onChange={(e) =>
                setFormData({ ...formData, reason: e.target.value })
              }
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              placeholder="Please explain why you need overtime approval..."
              required
            />
            <p className="mt-1 text-xs text-gray-500">
              Provide a clear explanation for your manager to review
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="submit"
              variant="primary"
              disabled={
                loading ||
                !formData.attendanceRecordId ||
                calculateTotalMinutes() <= 0 ||
                !formData.reason.trim() ||
                !formData.assignedTo
              }
            >
              {loading ? "Submitting..." : "Submit Request"}
            </Button>
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={loading}
              >
                Cancel
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
