"use client";

// CHANGED - Offboarding Checklists page with detailed sub-items per department
// Implements OFF-006, OFF-010: Multi-department clearance sign-offs
// Sub-items displayed in frontend (like onboarding tasks), department marked complete when all checked

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/hooks/use-auth";
import { SystemRole } from "@/types";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { recruitmentApi } from "@/lib/api/recruitment/recruitment";
import {
  TerminationRequest,
  ClearanceChecklist,
  UpdateClearanceItemStatusDto,
} from "@/types/recruitment";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/shared/ui/Card";
import { Button } from "@/components/shared/ui/Button";
import { Textarea } from "@/components/leaves/Textarea";
import { Modal } from "@/components/leaves/Modal";
import { Toast, useToast } from "@/components/leaves/Toast";

// ============================================================================
// DEPARTMENT CLEARANCE ITEMS - Aligned with User Stories OFF-006, OFF-007, OFF-010
// ============================================================================
// OFF-006: HR Manager uses offboarding checklist (IT assets, ID cards, equipment)
// OFF-007: System Admin revokes system and account access
// OFF-010: Multi-department exit clearance sign-offs
// BR 13(a,b,c): Clearance checklist required across departments
// ============================================================================
// CHANGED: Merged FACILITIES and ADMIN into HR_EMPLOYEE
// Note: Items should dynamically match what was assigned during onboarding
// ============================================================================
const DEPARTMENT_ITEMS: { [key: string]: string[] } = {
  // LINE_MANAGER (Department Head) - Work transition & handover
  LINE_MANAGER: [
    "Work handover completed",
    "Projects transferred to team members",
    "Knowledge transfer documentation done",
    "Pending tasks reassigned",
    "Team notified of departure",
  ],
  
  // IT (System Admin) - OFF-007: System access revocation
  IT: [
    "Email account disabled",
    "VPN/Remote access revoked",
    "System login credentials deactivated",
    "Software licenses recovered",
    "Shared drive access removed",
    "Company laptop collected (if issued)",
    "Mobile phone/device collected (if issued)",
  ],
  
  // FINANCE (Finance Staff/Payroll) - Financial clearance
  FINANCE: [
    "Expense reports submitted and cleared",
    "Company credit card returned (if issued)",
    "Outstanding loans/advances settled",
    "Petty cash accounted for",
    "Travel advances cleared",
    "Final salary calculation prepared",
  ],
  
  // HR_EMPLOYEE - Combined FACILITIES + ADMIN items
  // Physical workspace, ID, and access items (all handled by HR Employee)
  HR_EMPLOYEE: [
    "Desk/Workspace cleared and cleaned",
    "Parking pass/permit returned (if issued)",
    "Building access card deactivated",
    "Office keys returned (if issued)",
    "Employee ID badge returned",
    "Access cards/Key fobs returned (if issued)",
    "Locker cleared and key returned (if assigned)",
    "Company uniform returned (if applicable)",
    "Business cards collected",
  ],
  
  // HR (HR Manager) - Exit formalities & documentation
  HR: [
    "Exit interview completed",
    "Final paperwork signed",
    "Benefits termination processed",
    "Reference letter request noted",
    "Non-compete/NDA acknowledgment",
    "Exit survey completed",
  ],
};

interface EmployeeChecklist {
  termination: TerminationRequest;
  checklist: ClearanceChecklist | null;
  expanded: boolean;
  // Local state for sub-item checkboxes (not saved to DB)
  checkedItems: { [dept: string]: boolean[] };
}

export default function OffboardingChecklistsPage() {
  const { user } = useAuth();
  const { toast, showToast, hideToast } = useToast();

  // State
  const [employeeChecklists, setEmployeeChecklists] = useState<EmployeeChecklist[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeChecklist | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState<string>("");
  const [comments, setComments] = useState("");

  // User roles
  const userRoles = user?.roles || [];
  const isHRManager = userRoles.includes(SystemRole.HR_MANAGER);
  const isSystemAdmin = userRoles.includes(SystemRole.SYSTEM_ADMIN);
  const isHREmployee = userRoles.includes(SystemRole.HR_EMPLOYEE);
  const isDepartmentHead = userRoles.includes(SystemRole.DEPARTMENT_HEAD);
  const isFinanceStaff = userRoles.includes(SystemRole.FINANCE_STAFF) || 
                         userRoles.includes(SystemRole.PAYROLL_MANAGER) ||
                         userRoles.includes(SystemRole.PAYROLL_SPECIALIST);

  // Department permissions - who can UPDATE which department
  // CHANGED: Merged FACILITIES + ADMIN into HR_EMPLOYEE
  const canUpdateDepartment = (department: string): boolean => {
    switch (department.toUpperCase()) {
      case 'HR': return isHRManager;
      case 'IT': return isSystemAdmin;
      case 'FINANCE': return isFinanceStaff;
      case 'HR_EMPLOYEE': return isHREmployee;
      case 'LINE_MANAGER': return isDepartmentHead;
      default: return false;
    }
  };

  // Get departments visible to current user
  // HR Manager sees ALL departments, others see only their own
  // CHANGED: Merged FACILITIES + ADMIN into HR_EMPLOYEE
  const getVisibleDepartments = (): string[] => {
    if (isHRManager) {
      return Object.keys(DEPARTMENT_ITEMS); // HR Manager sees all
    }
    
    // Other roles only see their departments
    const visible: string[] = [];
    if (isSystemAdmin) visible.push('IT');
    if (isDepartmentHead) visible.push('LINE_MANAGER');
    if (isFinanceStaff) visible.push('FINANCE');
    if (isHREmployee) visible.push('HR_EMPLOYEE');
    return visible;
  };

  const visibleDepartments = getVisibleDepartments();

  useEffect(() => {
    loadData();
  }, [isHRManager]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Different data loading based on role:
      // - HR Manager: Load terminations and create checklists
      // - Other roles: Load checklists directly (no termination details access)
      
      if (isHRManager) {
        // HR Manager flow - can see terminations and create checklists
        const allTerminations = await recruitmentApi.getAllTerminationRequests();
        const approvedTerminations = (Array.isArray(allTerminations) ? allTerminations : [])
          .filter(t => t.status?.toLowerCase() === 'approved');

        const checklistPromises = approvedTerminations.map(async (term) => {
          let checklist: ClearanceChecklist | null = null;
          if (term.employee?.employeeNumber) {
            try {
              checklist = await recruitmentApi.getClearanceChecklistByEmployee(
                term.employee.employeeNumber
              );
            } catch (e) {
              // No checklist yet
            }
          }
          
          // Initialize checked items state for each department
          const checkedItems: { [dept: string]: boolean[] } = {};
          Object.keys(DEPARTMENT_ITEMS).forEach(dept => {
            checkedItems[dept] = DEPARTMENT_ITEMS[dept].map(() => false);
          });
          
          return {
            termination: term,
            checklist,
            expanded: false,
            checkedItems,
          };
        });

        const results = await Promise.all(checklistPromises);
        setEmployeeChecklists(results);
      } else {
        // Non-HR roles - load clearance checklists directly (OFF-010)
        const allChecklists = await recruitmentApi.getAllClearanceChecklists();
        
        const results = (Array.isArray(allChecklists) ? allChecklists : []).map((checklist: any) => {
          // Initialize checked items state for each department
          const checkedItems: { [dept: string]: boolean[] } = {};
          Object.keys(DEPARTMENT_ITEMS).forEach(dept => {
            checkedItems[dept] = DEPARTMENT_ITEMS[dept].map(() => false);
          });
          
          // Create a "fake" termination object from checklist data for UI consistency
          const pseudoTermination: TerminationRequest = {
            _id: checklist.terminationId || '',
            employeeId: checklist.employee?._id || '',
            status: 'approved', // Only approved ones have checklists
            terminationDate: checklist.terminationDate,
            initiator: checklist.terminationType === 'Resignation' ? 'employee' : 'hr',
            reason: '',
            employee: {
              _id: checklist.employee?._id || '',
              firstName: checklist.employee?.fullName?.split(' ')[0] || 'Unknown',
              lastName: checklist.employee?.fullName?.split(' ').slice(1).join(' ') || '',
              fullName: checklist.employee?.fullName || 'Unknown Employee',
              employeeNumber: checklist.employee?.employeeNumber || 'N/A',
              workEmail: checklist.employee?.workEmail || 'N/A',
            },
          } as TerminationRequest;
          
          return {
            termination: pseudoTermination,
            checklist: checklist as ClearanceChecklist,
            expanded: false,
            checkedItems,
          };
        });
        
        setEmployeeChecklists(results);
      }
    } catch (error: any) {
      console.log("Error loading data:", error.message);
      setEmployeeChecklists([]);
    } finally {
      setLoading(false);
    }
  };

  // Toggle checklist visibility
  const toggleExpanded = (index: number) => {
    setEmployeeChecklists(prev => 
      prev.map((item, i) => 
        i === index ? { ...item, expanded: !item.expanded } : item
      )
    );
  };

  // Toggle sub-item checkbox
  const toggleSubItem = (empIndex: number, dept: string, itemIndex: number) => {
    setEmployeeChecklists(prev => 
      prev.map((emp, i) => {
        if (i !== empIndex) return emp;
        const newCheckedItems = { ...emp.checkedItems };
        newCheckedItems[dept] = [...newCheckedItems[dept]];
        newCheckedItems[dept][itemIndex] = !newCheckedItems[dept][itemIndex];
        return { ...emp, checkedItems: newCheckedItems };
      })
    );
  };

  // Check if all sub-items for a department are checked
  const allSubItemsChecked = (emp: EmployeeChecklist, dept: string): boolean => {
    return emp.checkedItems[dept]?.every(checked => checked) ?? false;
  };

  // Create checklist
  const handleCreateChecklist = async (terminationId: string) => {
    try {
      await recruitmentApi.createClearanceChecklist(terminationId);
      showToast("Clearance checklist created successfully!", "success");
      loadData();
    } catch (error: any) {
      showToast(error.message || "Failed to create checklist", "error");
    }
  };

  // Open modal to mark department as complete
  const handleOpenComplete = (emp: EmployeeChecklist, dept: string) => {
    setSelectedEmployee(emp);
    setSelectedDepartment(dept);
    setComments("");
    setIsUpdateModalOpen(true);
  };

  // Mark department as complete (approved)
  const handleMarkComplete = async () => {
    if (!selectedEmployee?.checklist || !selectedDepartment) return;

    try {
      const updateData: UpdateClearanceItemStatusDto = {
        department: selectedDepartment,
        status: "approved",
        comments: comments || `All ${selectedDepartment} clearance items completed`,
      };

      await recruitmentApi.updateClearanceItemStatus(
        selectedEmployee.checklist._id,
        updateData
      );
      
      showToast(`${selectedDepartment} clearance marked as complete!`, "success");
      setIsUpdateModalOpen(false);
      loadData();
    } catch (error: any) {
      showToast(error.message || "Failed to update clearance", "error");
    }
  };

  // Get department status from checklist
  const getDeptStatus = (checklist: ClearanceChecklist | null, dept: string): string => {
    if (!checklist) return 'pending';
    const item = checklist.items?.find((i: any) => i.department === dept);
    return item?.status || 'pending';
  };

  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "pending": return "bg-yellow-100 text-yellow-800";
      case "approved": return "bg-green-100 text-green-800";
      case "rejected": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  // Get department icon
  // CHANGED: Merged FACILITIES + ADMIN into HR_EMPLOYEE
  const getDepartmentIcon = (department: string) => {
    switch (department?.toUpperCase()) {
      case "IT": return "💻";
      case "HR": return "👤";
      case "FINANCE": return "💰";
      case "HR_EMPLOYEE": return "🏢";
      case "LINE_MANAGER": return "👔";
      default: return "📁";
    }
  };

  // Calculate overall progress
  const getProgress = (checklist: ClearanceChecklist | null): number => {
    if (!checklist?.items?.length) return 0;
    const approved = checklist.items.filter((i: any) => i.status?.toLowerCase() === "approved").length;
    return Math.round((approved / checklist.items.length) * 100);
  };

  return (
    <ProtectedRoute allowedRoles={[
      SystemRole.HR_MANAGER, 
      SystemRole.SYSTEM_ADMIN,
      SystemRole.HR_EMPLOYEE,
      SystemRole.DEPARTMENT_HEAD,
      SystemRole.FINANCE_STAFF,
      SystemRole.PAYROLL_MANAGER,
      SystemRole.PAYROLL_SPECIALIST,
    ]}>
      <div className="container mx-auto px-6 py-8">
        <Toast
          message={toast.message}
          type={toast.type}
          isVisible={toast.isVisible}
          onClose={hideToast}
        />

        <div className="mb-8">
          <Link href="/dashboard/recruitment" className="text-blue-600 hover:underline mb-4 inline-block">
            ← Back to Recruitment
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">
            {isHRManager ? 'Offboarding Checklists' : 'My Clearance Tasks'}
          </h1>
          <p className="text-gray-600 mt-1">
            {isHRManager 
              ? 'Manage clearance sign-offs for departing employees (OFF-006, OFF-010)'
              : 'Complete clearance items for your department (OFF-010)'
            }
          </p>
        </div>

        {/* Permission Legend - Show only relevant departments */}
        <Card className="mb-6 bg-blue-50 border-blue-200">
          <CardContent className="py-4">
            <h3 className="font-semibold text-blue-900 mb-2">
              {isHRManager ? 'All Department Clearance Overview' : 'Your Clearance Responsibilities'}
            </h3>
            <div className="flex flex-wrap gap-2">
              {visibleDepartments.map(dept => (
                <span
                  key={dept}
                  className={`px-3 py-1 rounded-full text-sm ${
                    canUpdateDepartment(dept)
                      ? 'bg-green-100 text-green-800 font-medium'
                      : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {getDepartmentIcon(dept)} {dept}: {canUpdateDepartment(dept) ? '✅ Your Tasks' : '👁️ View Only'}
                </span>
              ))}
            </div>
            {!isHRManager && (
              <p className="text-xs text-blue-700 mt-2">
                ℹ️ You can only see and update your department's clearance items.
              </p>
            )}
          </CardContent>
        </Card>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading offboarding checklists...</p>
          </div>
        ) : employeeChecklists.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-500 mb-4">No approved separations requiring clearance.</p>
              <p className="text-sm text-gray-400">
                Clearance checklists will appear here when resignations/terminations are approved.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {employeeChecklists.map((empChecklist, empIndex) => {
              const { termination, checklist, expanded } = empChecklist;
              const progress = getProgress(checklist);
              const isComplete = progress === 100;
              const hasChecklist = !!checklist;
              
              return (
                <Card 
                  key={termination._id} 
                  className={`transition-all ${
                    isComplete 
                      ? 'border-green-200 bg-green-50' 
                      : hasChecklist 
                        ? 'border-blue-200' 
                        : 'border-orange-200 bg-orange-50'
                  }`}
                >
                  {/* Employee Header */}
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl ${
                          isComplete ? 'bg-green-200' : 'bg-blue-200'
                        }`}>
                          {termination.initiator === 'employee' ? '📝' : '⚠️'}
                        </div>
                        <div>
                          <CardTitle className="text-lg">
                            {termination.employee?.fullName || 
                             termination.employee?.employeeNumber || 
                             'Unknown Employee'}
                          </CardTitle>
                          <CardDescription>
                            {termination.employee?.department || 'N/A'} • {termination.employee?.position || 'N/A'}
                          </CardDescription>
                          <p className="text-xs text-gray-500 mt-1">
                            {termination.initiator === 'employee' ? 'Resignation' : 'Termination'} • 
                            {termination.terminationDate 
                              ? ` Last Day: ${new Date(termination.terminationDate).toLocaleDateString()}`
                              : ' Effective date TBD'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {hasChecklist ? (
                          <>
                            <div className="text-right">
                              <span className={`px-3 py-1 text-sm rounded-full ${
                                isComplete ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                              }`}>
                                {isComplete ? '✅ All Clear' : `${progress}% Complete`}
                              </span>
                              {!isComplete && (
                                <div className="w-24 bg-gray-200 rounded-full h-2 mt-2">
                                  <div
                                    className="bg-blue-600 h-2 rounded-full transition-all"
                                    style={{ width: `${progress}%` }}
                                  />
                                </div>
                              )}
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => toggleExpanded(empIndex)}
                            >
                              {expanded ? '▲ Hide' : '▼ Show Details'}
                            </Button>
                          </>
                        ) : (
                          // Only HR Manager can create checklists (OFF-006)
                          isHRManager ? (
                            <Button
                              size="sm"
                              onClick={() => handleCreateChecklist(termination._id)}
                            >
                              📋 Create Checklist
                            </Button>
                          ) : (
                            <span className="text-sm text-gray-500 italic">
                              ⏳ Waiting for HR to create checklist
                            </span>
                          )
                        )}
                      </div>
                    </div>
                  </CardHeader>

                  {/* Expanded Checklist with Sub-Items */}
                  {expanded && checklist && (
                    <CardContent className="pt-0">
                      <div className="border-t border-gray-200 pt-4 mt-2">
                        <h4 className="font-semibold text-gray-900 mb-4">
                          Clearance Checklist Items
                        </h4>
                        
                        <div className="space-y-4">
                          {/* Show only departments relevant to current user */}
                          {visibleDepartments.map(dept => {
                            const deptStatus = getDeptStatus(checklist, dept);
                            const isApproved = deptStatus === 'approved';
                            const canUpdate = canUpdateDepartment(dept);
                            const allChecked = allSubItemsChecked(empChecklist, dept);
                            const subItems = DEPARTMENT_ITEMS[dept];
                            
                            return (
                              <div key={dept} className={`rounded-lg border ${
                                isApproved 
                                  ? 'border-green-300 bg-green-50' 
                                  : canUpdate 
                                    ? 'border-blue-300' 
                                    : 'border-gray-200'
                              }`}>
                                {/* Department Header */}
                                <div className={`flex items-center justify-between p-3 ${
                                  isApproved ? 'bg-green-100' : canUpdate ? 'bg-blue-50' : 'bg-gray-50'
                                } rounded-t-lg`}>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xl">{getDepartmentIcon(dept)}</span>
                                    <span className="font-semibold">{dept}</span>
                                    <span className={`px-2 py-0.5 text-xs rounded-full ${getStatusColor(deptStatus)}`}>
                                      {deptStatus}
                                    </span>
                                  </div>
                                  
                                  {canUpdate && !isApproved && (
                                    <Button
                                      size="sm"
                                      disabled={!allChecked}
                                      onClick={() => handleOpenComplete(empChecklist, dept)}
                                      className={allChecked ? 'bg-green-600 hover:bg-green-700' : ''}
                                    >
                                      {allChecked ? '✓ Mark Complete' : 'Check all items first'}
                                    </Button>
                                  )}
                                  
                                  {!canUpdate && !isApproved && (
                                    <span className="text-xs text-gray-500 italic">
                                      Awaiting {dept} sign-off
                                    </span>
                                  )}
                                </div>
                                
                                {/* Sub-Items Checklist */}
                                <div className="p-3 space-y-2">
                                  {subItems.map((item, idx) => (
                                    <label
                                      key={idx}
                                      className={`flex items-center gap-3 p-2 rounded ${
                                        isApproved || empChecklist.checkedItems[dept][idx]
                                          ? 'bg-green-50'
                                          : 'hover:bg-gray-50'
                                      } ${canUpdate && !isApproved ? 'cursor-pointer' : ''}`}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={isApproved || empChecklist.checkedItems[dept][idx]}
                                        disabled={isApproved || !canUpdate}
                                        onChange={() => toggleSubItem(empIndex, dept, idx)}
                                        className="w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-green-500"
                                      />
                                      <span className={`${
                                        isApproved || empChecklist.checkedItems[dept][idx]
                                          ? 'text-green-700 line-through'
                                          : 'text-gray-700'
                                      }`}>
                                        {item}
                                      </span>
                                    </label>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Final Settlement - Only when all departments approved */}
                        {isComplete && isHRManager && (
                          <div className="mt-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                            <div className="flex items-center justify-between">
                              <div>
                                <h5 className="font-semibold text-purple-900">
                                  💰 Final Settlement (OFF-013)
                                </h5>
                                <p className="text-sm text-purple-700">
                                  All clearances approved. Ready to process final settlement.
                                </p>
                              </div>
                              <Button
                                className="bg-purple-600 hover:bg-purple-700"
                                onClick={() => {
                                  recruitmentApi.triggerFinalSettlement(
                                    termination.employee?._id || termination.employeeId,
                                    termination._id
                                  ).then(() => {
                                    showToast("Final settlement triggered!", "success");
                                  }).catch((err: any) => {
                                    showToast(err.message || "Failed", "error");
                                  });
                                }}
                              >
                                Trigger Settlement
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        )}

        {/* Mark Complete Modal */}
        <Modal
          isOpen={isUpdateModalOpen}
          onClose={() => setIsUpdateModalOpen(false)}
          title={`Mark ${selectedDepartment} Clearance Complete`}
          size="md"
        >
          <div className="space-y-4">
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <p className="text-green-800">
                ✅ All {selectedDepartment} items have been checked. 
                Marking this department as <strong>APPROVED</strong> will finalize their clearance.
              </p>
            </div>

            {selectedEmployee && (
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm text-gray-600">
                  Employee: <strong>{selectedEmployee.termination.employee?.fullName || 'Unknown'}</strong>
                </p>
                <p className="text-sm text-gray-600">
                  Department: <strong>{getDepartmentIcon(selectedDepartment)} {selectedDepartment}</strong>
                </p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Comments (Optional)
              </label>
              <Textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Add any notes about this clearance..."
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={() => setIsUpdateModalOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleMarkComplete}
                className="bg-green-600 hover:bg-green-700"
              >
                ✓ Mark as Complete
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </ProtectedRoute>
  );
}
