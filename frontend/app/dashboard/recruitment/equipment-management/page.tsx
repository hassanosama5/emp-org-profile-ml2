"use client";

// CHANGED - ONB-012: Equipment Management Page
// HR Employee can reserve and track equipment, desk, and access cards for new hires

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/hooks/use-auth";
import { SystemRole } from "@/types";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { recruitmentApi } from "@/lib/api/recruitment/recruitment";
import { Onboarding } from "@/types/recruitment";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/shared/ui/Card";
import { Button } from "@/components/shared/ui/Button";
import { Input } from "@/components/shared/ui/Input";
import { Textarea } from "@/components/leaves/Textarea";
import { Select } from "@/components/leaves/Select";
import { Modal } from "@/components/leaves/Modal";
import { Toast, useToast } from "@/components/leaves/Toast";
import { AlertCircle, CheckCircle, Clock, User } from "lucide-react";

// CHANGED - Interface for pending Admin tasks
interface PendingAdminTask {
  onboardingId: string;
  taskIndex: number;
  taskName: string;
  taskStatus: string;
  deadline?: string;
  employeeId: string;
  employeeName: string;
  employeeNumber: string;
}

// CHANGED - Equipment types for HR Employee (ONB-012)
// Removed duplicates: "desk" merged with "workspace" → now single "workspace" option
// These are the 4 main equipment types HR Employee reserves
const EQUIPMENT_TYPES = [
  { value: "laptop", label: "💻 Laptop", icon: "💻", description: "Allocate laptop for the new hire", taskMatch: "laptop" },
  { value: "workspace", label: "🪑 Desk/Workspace", icon: "🪑", description: "Reserve a desk or workspace for the new hire", taskMatch: "workspace|desk" },
  { value: "access_card", label: "🎫 Access Card", icon: "🎫", description: "Issue building access card", taskMatch: "access" },
  { value: "badge", label: "🪪 ID Badge", icon: "🪪", description: "Issue employee ID badge", taskMatch: "badge|id badge" },
];

export default function EquipmentManagementPage() {
  const { user } = useAuth();
  const { toast, showToast, hideToast } = useToast();
  const [onboardings, setOnboardings] = useState<Onboarding[]>([]);
  const [loading, setLoading] = useState(true);
  const [isReserveModalOpen, setIsReserveModalOpen] = useState(false);
  const [selectedOnboarding, setSelectedOnboarding] = useState<Onboarding | null>(null);
  
  // CHANGED - Equipment form state
  const [equipmentForm, setEquipmentForm] = useState({
    equipmentType: "",
    serialNumber: "",
    model: "",
    location: "",
    notes: "",
  });
  // CHANGED - Add state for pending Admin tasks
  const [pendingAdminTasks, setPendingAdminTasks] = useState<PendingAdminTask[]>([]);
  const [loadingPendingTasks, setLoadingPendingTasks] = useState(true);
  const [processingTask, setProcessingTask] = useState(false);

  useEffect(() => {
    loadOnboardings();
    loadAllPendingAdminTasks();
  }, []);

  const loadOnboardings = async () => {
    try {
      setLoading(true);
      const data = await recruitmentApi.getAllOnboardings();
      // Filter to show only active (non-completed) onboardings
      const activeOnboardings = data.filter((o: Onboarding) => 
        o.status !== "completed" && !o.completionDate
      );
      setOnboardings(activeOnboardings);
    } catch (error: any) {
      showToast(error.message || "Failed to load onboardings", "error");
    } finally {
      setLoading(false);
    }
  };

  // CHANGED - Load all pending Admin tasks from all onboardings (ONB-012)
  const loadAllPendingAdminTasks = async () => {
    try {
      setLoadingPendingTasks(true);
      const data = await recruitmentApi.getAllOnboardings();
      const allPendingTasks: PendingAdminTask[] = [];

      for (const onboarding of data) {
        // FIXED - Use 'employee' field which contains the populated data from backend
        const employee = onboarding.employee;
        const employeeName = employee?.fullName || 
          `${employee?.firstName || ''} ${employee?.lastName || ''}`.trim() || 
          'Unknown Employee';
        const employeeNumber = employee?.employeeNumber || 'N/A';
        // employeeId is now a string from the backend transformation
        const employeeId = onboarding.employeeId || employee?._id;

        // Find equipment tasks that are not completed (ONB-012)
        // HR Employee handles: laptop, equipment, workspace, desk, badge, access card
        // Check by task NAME, not department (department might vary in old data)
        onboarding.tasks?.forEach((task: any, index: number) => {
          const nameLower = task.name?.toLowerCase() || '';
          const isEquipmentTask = nameLower.includes('laptop') || 
            nameLower.includes('equipment') ||
            nameLower.includes('workspace') ||
            nameLower.includes('desk') ||
            nameLower.includes('badge') ||
            nameLower.includes('access card');
          
          if (isEquipmentTask && task.status !== 'COMPLETED' && task.status !== 'completed') {
            allPendingTasks.push({
              onboardingId: onboarding._id,
              taskIndex: index,
              taskName: task.name,
              taskStatus: task.status,
              deadline: task.deadline,
              employeeId: employeeId,
              employeeName: employeeName,
              employeeNumber: employeeNumber,
            });
          }
        });
      }

      setPendingAdminTasks(allPendingTasks);
    } catch (error: any) {
      console.error("Failed to load pending Admin tasks:", error);
    } finally {
      setLoadingPendingTasks(false);
    }
  };

  // CHANGED - Complete an Admin task directly from the pending list
  const handleCompleteAdminTask = async (task: PendingAdminTask) => {
    try {
      setProcessingTask(true);
      // Use lowercase 'completed' to match backend enum
      await recruitmentApi.updateOnboardingTaskStatus(
        task.onboardingId,
        task.taskIndex,
        'completed'
      );
      showToast(`Task "${task.taskName}" completed for ${task.employeeName}`, "success");
      // Reload both lists
      await Promise.all([loadAllPendingAdminTasks(), loadOnboardings()]);
    } catch (error: any) {
      showToast(error.message || "Failed to complete task", "error");
    } finally {
      setProcessingTask(false);
    }
  };

  // CHANGED - Open reserve modal
  const handleOpenReserve = (onboarding: Onboarding) => {
    setSelectedOnboarding(onboarding);
    setEquipmentForm({
      equipmentType: "",
      serialNumber: "",
      model: "",
      location: "",
      notes: "",
    });
    setIsReserveModalOpen(true);
  };

  // CHANGED - Reserve equipment AND mark the corresponding onboarding task as completed
  const handleReserveEquipment = async () => {
    if (!selectedOnboarding || !equipmentForm.equipmentType) {
      showToast("Please select an equipment type", "error");
      return;
    }

    try {
      const equipmentDetails = {
        serialNumber: equipmentForm.serialNumber || undefined,
        model: equipmentForm.model || undefined,
        location: equipmentForm.location || undefined,
        notes: equipmentForm.notes || undefined,
        reservedBy: user?.fullName || user?.username || "HR",
        reservedAt: new Date().toISOString(),
      };

      // 1. Reserve the equipment
      await recruitmentApi.reserveEquipment(
        selectedOnboarding.employeeId,
        equipmentForm.equipmentType,
        equipmentDetails
      );

      // 2. Find and mark the corresponding onboarding task as completed
      const selectedType = EQUIPMENT_TYPES.find(t => t.value === equipmentForm.equipmentType);
      if (selectedType && selectedOnboarding.tasks) {
        const matchPattern = new RegExp(selectedType.taskMatch, 'i');
        const taskIndex = selectedOnboarding.tasks.findIndex((task: any) => 
          matchPattern.test(task.name?.toLowerCase() || '') &&
          task.status !== 'COMPLETED' && task.status !== 'completed'
        );
        
        if (taskIndex !== -1) {
          try {
            await recruitmentApi.updateOnboardingTaskStatus(
              selectedOnboarding._id,
              taskIndex,
              'completed'
            );
            console.log(`✅ Auto-completed task: ${selectedOnboarding.tasks[taskIndex].name}`);
          } catch (taskError) {
            console.warn('Could not auto-complete task:', taskError);
          }
        }
      }

      showToast("Equipment reserved and task completed!", "success");
      setIsReserveModalOpen(false);
      // Reload both lists to reflect changes
      await Promise.all([loadOnboardings(), loadAllPendingAdminTasks()]);
    } catch (error: any) {
      showToast(error.message || "Failed to reserve equipment", "error");
    }
  };
  
  // CHANGED - Get equipment types that are NOT yet completed for this employee
  const getAvailableEquipmentTypes = (onboarding: Onboarding) => {
    if (!onboarding?.tasks) return EQUIPMENT_TYPES;
    
    // Find which equipment types already have completed tasks
    const completedTypes: string[] = [];
    
    onboarding.tasks.forEach((task: any) => {
      if (task.status === 'COMPLETED' || task.status === 'completed') {
        const taskName = task.name?.toLowerCase() || '';
        EQUIPMENT_TYPES.forEach(eqType => {
          const matchPattern = new RegExp(eqType.taskMatch, 'i');
          if (matchPattern.test(taskName)) {
            completedTypes.push(eqType.value);
          }
        });
      }
    });
    
    // Return only equipment types that are NOT completed
    return EQUIPMENT_TYPES.filter(type => !completedTypes.includes(type.value));
  };

  // CHANGED - Get equipment icon
  const getEquipmentIcon = (type: string): string => {
    const found = EQUIPMENT_TYPES.find(e => e.value === type);
    return found?.icon || "📦";
  };

  // CHANGED - Get task status color
  const getTaskStatusColor = (status: string): string => {
    switch (status?.toLowerCase()) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "in_progress":
        return "bg-yellow-100 text-yellow-800";
      case "pending":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // CHANGED - Get equipment tasks from onboarding (ONB-012)
  // HR Employee handles: laptop, equipment, workspace, desk, badge, access card
  // System Admin handles: email, SSO, system access (IT department)
  // Check by task NAME, not department
  const getEquipmentTasks = (onboarding: Onboarding) => {
    if (!onboarding.tasks) return [];
    return onboarding.tasks.filter((task) => {
      const nameLower = task.name?.toLowerCase() || '';
      // IT tasks (System Admin)
      if (task.department === "IT") return true;
      // Equipment tasks (HR Employee) - check by name
      const isEquipmentTask = nameLower.includes('laptop') || 
        nameLower.includes('equipment') ||
        nameLower.includes('workspace') ||
        nameLower.includes('desk') ||
        nameLower.includes('badge') ||
        nameLower.includes('access card');
      if (isEquipmentTask) return true;
      return false;
    });
  };

  // CHANGED - Calculate equipment progress
  const getEquipmentProgress = (onboarding: Onboarding): number => {
    const equipmentTasks = getEquipmentTasks(onboarding);
    if (equipmentTasks.length === 0) return 0;
    const completed = equipmentTasks.filter(
      (task) => task.status === "completed"
    ).length;
    return Math.round((completed / equipmentTasks.length) * 100);
  };

  return (
    <ProtectedRoute allowedRoles={[SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.SYSTEM_ADMIN]}>
      <div className="container mx-auto px-6 py-8">
        <Toast
          message={toast.message}
          type={toast.type}
          isVisible={toast.isVisible}
          onClose={hideToast}
        />

        <div className="mb-8">
          <Link
            href="/dashboard/recruitment"
            className="text-blue-600 hover:underline mb-4 inline-block"
          >
            ← Back to Recruitment
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">
            Equipment Management
          </h1>
          <p className="text-gray-600 mt-1">
            Reserve and track equipment, desk, and access cards for new hires (ONB-012)
          </p>
        </div>

        {/* CHANGED - Pending Admin Tasks Section (ONB-012) */}
        <Card className="mb-8 border-2 border-purple-200 bg-purple-50">
          <CardHeader>
            <CardTitle className="text-purple-800 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              My Pending Tasks ({pendingAdminTasks.length})
            </CardTitle>
            <CardDescription className="text-purple-700">
              Equipment & access tasks that need your attention (ONB-012)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingPendingTasks ? (
              <p className="text-gray-500 text-center py-4">Loading pending tasks...</p>
            ) : pendingAdminTasks.length === 0 ? (
              <div className="text-center py-6">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
                <p className="text-green-700 font-medium">All Admin tasks are completed!</p>
                <p className="text-gray-500 text-sm">No pending equipment or access card tasks</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {pendingAdminTasks.map((task) => (
                  <div
                    key={`${task.onboardingId}-${task.taskIndex}`}
                    className="flex items-center justify-between p-4 bg-white rounded-lg border border-purple-200 shadow-sm"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-500" />
                        <span className="font-medium text-gray-900">{task.employeeName}</span>
                        <span className="text-sm text-gray-500">#{task.employeeNumber}</span>
                      </div>
                      <div className="mt-1">
                        <span className="font-medium text-purple-800">{task.taskName}</span>
                        <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
                          task.taskStatus === 'PENDING' || task.taskStatus === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {task.taskStatus}
                        </span>
                      </div>
                      {task.deadline && (
                        <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Deadline: {new Date(task.deadline).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleCompleteAdminTask(task)}
                      disabled={processingTask}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      {processingTask ? "..." : "Complete"}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* CHANGED - Equipment Types Legend */}
        <Card className="mb-8 bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-blue-900">Available Resource Types</CardTitle>
            <CardDescription className="text-blue-700">
              Reserve and track the following resources for new hires
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {EQUIPMENT_TYPES.map((type) => (
                <div
                  key={type.value}
                  className="flex items-start gap-3 bg-white p-3 rounded-lg border"
                >
                  <span className="text-2xl">{type.icon}</span>
                  <div>
                    <p className="font-medium text-gray-900">{type.label}</p>
                    <p className="text-sm text-gray-600">{type.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-500">Loading onboardings...</p>
          </div>
        ) : onboardings.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <div className="text-6xl mb-4">📦</div>
              <p className="text-gray-600 text-lg mb-2">No Active Onboardings</p>
              <p className="text-gray-500">
                There are no new hires currently being onboarded. Equipment reservations
                will appear here when new employees join.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {onboardings.map((onboarding) => (
              <Card key={onboarding._id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-xl text-gray-900">
                        {onboarding.employee?.fullName || `Employee ID: ${onboarding.employeeId}`}
                      </CardTitle>
                      <CardDescription>
                        {onboarding.employee?.department && `${onboarding.employee.department} • `}
                        {onboarding.employee?.jobTitle || "New Hire"}
                      </CardDescription>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                        {getEquipmentProgress(onboarding)}% Ready
                      </span>
                      <Button size="sm" onClick={() => handleOpenReserve(onboarding)}>
                        + Reserve Equipment
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Progress Bar */}
                  <div className="mb-6">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">Equipment Setup Progress</span>
                      <span className="font-semibold text-gray-900">
                        {getEquipmentProgress(onboarding)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className="bg-blue-600 h-3 rounded-full transition-all"
                        style={{ width: `${getEquipmentProgress(onboarding)}%` }}
                      />
                    </div>
                  </div>

                  {/* Equipment Tasks */}
                  <div className="space-y-3">
                    <h3 className="font-semibold text-gray-900 mb-3">
                      Equipment & Access Tasks
                    </h3>
                    {getEquipmentTasks(onboarding).length === 0 ? (
                      <p className="text-gray-500 text-sm">No equipment tasks found.</p>
                    ) : (
                      getEquipmentTasks(onboarding).map((task, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">
                              {task.name?.includes("Laptop") || task.name?.includes("Equipment")
                                ? "💻"
                                : task.name?.includes("Workspace") || task.name?.includes("Desk")
                                ? "🪑"
                                : task.name?.includes("ID") || task.name?.includes("Badge") || task.name?.includes("Access")
                                ? "🎫"
                                : task.name?.includes("Email")
                                ? "📧"
                                : task.name?.includes("SSO") || task.name?.includes("System")
                                ? "🔐"
                                : "📋"}
                            </span>
                            <div>
                              <p className="font-medium text-gray-900">{task.name}</p>
                              <p className="text-sm text-gray-500">
                                {task.department}
                                {task.deadline && ` • Due: ${new Date(task.deadline).toLocaleDateString()}`}
                              </p>
                              {task.notes && (
                                <p className="text-xs text-gray-400 mt-1 line-clamp-1">
                                  {task.notes}
                                </p>
                              )}
                            </div>
                          </div>
                          <span
                            className={`px-3 py-1 text-xs rounded-full ${getTaskStatusColor(
                              task.status
                            )}`}
                          >
                            {task.status?.replace("_", " ") || "pending"}
                          </span>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Quick Actions */}
                  <div className="mt-6 pt-4 border-t flex gap-3">
                    <Link href={`/dashboard/recruitment/hr-onboarding`}>
                      <Button variant="outline" size="sm">
                        View Full Onboarding
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* CHANGED - Reserve Equipment Modal */}
        <Modal
          isOpen={isReserveModalOpen}
          onClose={() => setIsReserveModalOpen(false)}
          title="Reserve Equipment"
          size="md"
        >
          <div className="space-y-4">
            <div className="bg-blue-50 p-3 rounded-lg mb-4">
              <p className="text-sm text-blue-800">
                Reserving equipment for:{" "}
                <strong>
                  {selectedOnboarding?.employee?.fullName || selectedOnboarding?.employeeId}
                </strong>
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Equipment Type *
              </label>
              {/* Only show equipment types that are NOT yet reserved/completed */}
              {selectedOnboarding && getAvailableEquipmentTypes(selectedOnboarding).length === 0 ? (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-green-800 text-sm">
                    ✅ All equipment has been reserved for this employee!
                  </p>
                </div>
              ) : (
                <Select
                  value={equipmentForm.equipmentType}
                  onChange={(e) =>
                    setEquipmentForm({ ...equipmentForm, equipmentType: e.target.value })
                  }
                  options={[
                    { value: "", label: "Select equipment type" },
                    ...(selectedOnboarding ? getAvailableEquipmentTypes(selectedOnboarding) : EQUIPMENT_TYPES).map((type) => ({
                      value: type.value,
                      label: type.label,
                    })),
                  ]}
                />
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Model/Description
              </label>
              <Input
                value={equipmentForm.model}
                onChange={(e) =>
                  setEquipmentForm({ ...equipmentForm, model: e.target.value })
                }
                placeholder="e.g., Dell XPS 15, MacBook Pro 14"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Serial Number / Asset ID
              </label>
              <Input
                value={equipmentForm.serialNumber}
                onChange={(e) =>
                  setEquipmentForm({ ...equipmentForm, serialNumber: e.target.value })
                }
                placeholder="e.g., SN-12345, ASSET-001"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Location / Desk Number
              </label>
              <Input
                value={equipmentForm.location}
                onChange={(e) =>
                  setEquipmentForm({ ...equipmentForm, location: e.target.value })
                }
                placeholder="e.g., Floor 3, Desk 42"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Additional Notes
              </label>
              <Textarea
                value={equipmentForm.notes}
                onChange={(e) =>
                  setEquipmentForm({ ...equipmentForm, notes: e.target.value })
                }
                placeholder="Any additional details..."
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setIsReserveModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleReserveEquipment}
                disabled={!equipmentForm.equipmentType}
              >
                Reserve Equipment
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </ProtectedRoute>
  );
}

