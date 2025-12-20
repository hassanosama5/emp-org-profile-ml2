"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/hooks/use-auth";
import { useRequireAuth } from "@/lib/hooks/use-auth";
import { SystemRole } from "@/types";
import { leavesApi } from "@/lib/api/leaves/leaves";
import { employeeProfileApi } from "@/lib/api/employee-profile/employee-profile";
import { LeaveEntitlement, CreateLeaveEntitlementDto, UpdateLeaveEntitlementDto, LeavePolicy } from "@/types/leaves";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/shared/ui/Card";
import { Button } from "@/components/shared/ui/Button";
import { Input } from "@/components/shared/ui/Input";
import { Select } from "@/components/leaves/Select";
import { Modal } from "@/components/leaves/Modal";
import { Toast, useToast } from "@/components/leaves/Toast";

export default function LeaveEntitlementsPage() {
  const { user } = useAuth();
  useRequireAuth(SystemRole.HR_ADMIN);
  const { toast, showToast, hideToast } = useToast();

  const [entitlements, setEntitlements] = useState<LeaveEntitlement[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<any[]>([]);
  const [policies, setPolicies] = useState<LeavePolicy[]>([]);
  const [employees, setEmployees] = useState<Array<{ _id: string; employeeId: string; firstName: string; lastName: string; contractType?: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [selectedContractType, setSelectedContractType] = useState("");
  const [searchLeaveTypeId, setSearchLeaveTypeId] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPersonalizedModalOpen, setIsPersonalizedModalOpen] = useState(false);
  const [isBulkEditModalOpen, setIsBulkEditModalOpen] = useState(false);
  const [editingEntitlement, setEditingEntitlement] = useState<LeaveEntitlement | null>(null);
  const [bulkEditFormData, setBulkEditFormData] = useState<{
    yearlyEntitlement?: number;
    accruedActual?: number;
    carryForward?: number;
    taken?: number;
    pending?: number;
    remaining?: number;
  }>({});
  const [formData, setFormData] = useState<CreateLeaveEntitlementDto>({
    employeeId: "",
    leaveTypeId: "",
    yearlyEntitlement: 0,
    accruedActual: 0,
    accruedRounded: 0,
    carryForward: 0,
    taken: 0,
    pending: 0,
    remaining: 0,
  });
  const [createContractType, setCreateContractType] = useState("");
  const [personalizedData, setPersonalizedData] = useState({
    employeeId: "",
    leaveTypeId: "",
    personalizedEntitlement: 0,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    // Load leave types, policies, and employees for dropdowns
    loadLeaveTypes();
    loadPolicies();
    loadEmployees();
  }, []);

  const loadPolicies = async () => {
    try {
      const policiesList = await leavesApi.getLeavePolicies();
      setPolicies(policiesList);
    } catch (error: any) {
      console.warn("Failed to load leave policies:", error);
    }
  };

  // Load employees for dropdown
  const loadEmployees = async () => {
    try {
      setLoadingEmployees(true);
      const response = await employeeProfileApi.getAllEmployees({ limit: 1000 });
      const employeesList = Array.isArray(response.data) ? response.data : [];
      setEmployees(employeesList.map((emp: any) => ({
        _id: emp._id,
        employeeId: emp.employeeId || emp._id,
        firstName: emp.firstName || '',
        lastName: emp.lastName || '',
        contractType: emp.contractType || '',
      })));
    } catch (error: any) {
      console.error("Failed to load employees:", error);
    } finally {
      setLoadingEmployees(false);
    }
  };

  const loadLeaveTypes = async () => {
    try {
      const types = await leavesApi.getLeaveTypes();
      setLeaveTypes(types);
    } catch (error: any) {
      console.warn("Failed to load leave types:", error);
    }
  };

  // Get contract types from employees AND from leave policies
  // This ensures all contract types defined in policies are available, even if no employees have them yet
  const getContractTypes = (): string[] => {
    const contractTypes = new Set<string>();
    
    // Add contract types from employees
    employees.forEach(emp => {
      if (emp.contractType) {
        contractTypes.add(emp.contractType);
      }
    });
    
    // Add contract types from leave policies' eligibility rules
    policies.forEach(policy => {
      if (policy.eligibility?.contractTypesAllowed && Array.isArray(policy.eligibility.contractTypesAllowed)) {
        policy.eligibility.contractTypesAllowed.forEach((ct: string) => {
          if (ct) {
            contractTypes.add(ct);
          }
        });
      }
    });
    
    return Array.from(contractTypes).sort();
  };

  // Get eligible contract types for selected leave type based on policy
  const getEligibleContractTypes = (): string[] => {
    if (!searchLeaveTypeId) return getContractTypes();
    
    const policy = policies.find(p => p.leaveTypeId === searchLeaveTypeId);
    if (policy?.eligibility?.contractTypesAllowed && Array.isArray(policy.eligibility.contractTypesAllowed)) {
      return policy.eligibility.contractTypesAllowed;
    }
    return getContractTypes();
  };

  // Get employees filtered by contract type
  // If no contract type is selected, show all employees
  // If a contract type is selected, show employees with that type OR employees without a contract type (to help identify missing data)
  const getFilteredEmployees = () => {
    if (!selectedContractType) return employees;
    // Show employees with matching contract type OR employees without a contract type set
    return employees.filter(emp => 
      emp.contractType === selectedContractType || 
      !emp.contractType || 
      emp.contractType === '' ||
      emp.contractType === null ||
      emp.contractType === undefined
    );
  };

  // Load entitlements for all employees with selected contract type and leave type
  const loadEntitlementsByContractType = async () => {
    if (!selectedContractType || !searchLeaveTypeId) {
      setEntitlements([]);
      showToast("Please select both Contract Type and Leave Type", "error");
      return;
    }

    try {
      setLoading(true);
      const filteredEmployees = getFilteredEmployees();
      const entitlementsList: LeaveEntitlement[] = [];
      
      // Load entitlement for each employee with the selected contract type
      for (const emp of filteredEmployees) {
        try {
          const entitlement = await leavesApi.getLeaveEntitlement(emp._id, searchLeaveTypeId);
          entitlementsList.push(entitlement);
        } catch (error: any) {
          // Skip employees without entitlements - they might need to be created
          // Only log if it's not a 404 (not found) error, as those are expected
          if (error.response?.status !== 404) {
            console.warn(`Error loading entitlement for employee ${emp._id}:`, error.message);
          }
        }
      }
      
      setEntitlements(entitlementsList);
      if (entitlementsList.length === 0) {
        showToast(`No entitlements found. ${filteredEmployees.length} employee(s) with this contract type may need entitlements created.`, "info");
      } else {
        showToast(`Loaded ${entitlementsList.length} entitlement(s) for ${selectedContractType.replace(/_/g, ' ')}`, "success");
      }
    } catch (error: any) {
      showToast(error.message || "Failed to load leave entitlements", "error");
      setEntitlements([]);
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (editingEntitlement) {
      // When editing, employee ID is required
      if (!formData.employeeId) newErrors.employeeId = "Employee is required";
    } else {
      // When creating, contract type is required
      if (!createContractType) newErrors.contractType = "Contract type is required";
    }
    if (!formData.leaveTypeId) newErrors.leaveTypeId = "Leave type is required";
    if (formData.yearlyEntitlement < 0) newErrors.yearlyEntitlement = "Must be >= 0";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      if (editingEntitlement) {
        // Editing: Update single entitlement
        // Only send fields allowed by UpdateLeaveEntitlementDto (exclude employeeId and leaveTypeId)
        // Note: accruedRounded will be automatically calculated by backend based on rounding rule
        const updateData: UpdateLeaveEntitlementDto = {
          yearlyEntitlement: Number(formData.yearlyEntitlement),
          accruedActual: Number(formData.accruedActual),
          // Don't send accruedRounded - backend will calculate it from accruedActual
          carryForward: Number(formData.carryForward),
          taken: Number(formData.taken),
          pending: Number(formData.pending),
          remaining: Number(formData.remaining),
        };
        await leavesApi.updateLeaveEntitlement(editingEntitlement._id, updateData);
        showToast("Leave entitlement updated successfully", "success");
      } else {
        // Creating: Create entitlements for all employees with the selected contract type
        const employeesToCreate = employees.filter(emp => emp.contractType === createContractType);
        
        if (employeesToCreate.length === 0) {
          showToast("No employees found with the selected contract type", "error");
          return;
        }

        let successCount = 0;
        let failCount = 0;

        for (const emp of employeesToCreate) {
          try {
            await leavesApi.createLeaveEntitlement({
              ...formData,
              employeeId: emp._id,
            });
            successCount++;
          } catch (error: any) {
            console.error(`Failed to create entitlement for ${emp.firstName} ${emp.lastName}:`, error);
            failCount++;
          }
        }

        if (successCount > 0) {
          showToast(
            `Created ${successCount} entitlement(s)${failCount > 0 ? `, ${failCount} failed` : ''}`,
            successCount === employeesToCreate.length ? "success" : "warning"
          );
        } else {
          showToast("Failed to create entitlements", "error");
          return;
        }
      }
      setIsModalOpen(false);
      setFormData({
        employeeId: "",
        leaveTypeId: "",
        yearlyEntitlement: 0,
        accruedActual: 0,
        accruedRounded: 0,
        carryForward: 0,
        taken: 0,
        pending: 0,
        remaining: 0,
      });
      
      // After creating, automatically set filters and reload if we have the data
      if (!editingEntitlement && createContractType && formData.leaveTypeId) {
        setSelectedContractType(createContractType);
        setSearchLeaveTypeId(formData.leaveTypeId);
        // Small delay to ensure state is updated before reloading
        setTimeout(() => {
          loadEntitlementsByContractType();
        }, 100);
      } else if (editingEntitlement) {
        // After updating, reload if filters are already set
        if (selectedContractType && searchLeaveTypeId) {
          loadEntitlementsByContractType();
        } else {
          // Try to reload based on the edited entitlement
          const editedEmployee = employees.find(emp => emp._id === editingEntitlement.employeeId);
          if (editedEmployee?.contractType && editingEntitlement.leaveTypeId) {
            setSelectedContractType(editedEmployee.contractType);
            setSearchLeaveTypeId(editingEntitlement.leaveTypeId);
            setTimeout(() => {
              loadEntitlementsByContractType();
            }, 100);
          }
        }
      }
      
      setCreateContractType("");
      setEditingEntitlement(null);
    } catch (error: any) {
      showToast(error.message || "Failed to save leave entitlement", "error");
    }
  };

  const handlePersonalizedSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!personalizedData.employeeId || !personalizedData.leaveTypeId) {
      showToast("Employee ID and Leave Type are required", "error");
      return;
    }

    try {
      await leavesApi.assignPersonalizedEntitlement(
        personalizedData.employeeId,
        personalizedData.leaveTypeId,
        personalizedData.personalizedEntitlement
      );
      showToast("Personalized entitlement assigned successfully", "success");
      setIsPersonalizedModalOpen(false);
      setPersonalizedData({
        employeeId: "",
        leaveTypeId: "",
        personalizedEntitlement: 0,
      });
    } catch (error: any) {
      showToast(error.message || "Failed to assign personalized entitlement", "error");
    }
  };

  const handleBulkEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (entitlements.length === 0) {
      showToast("No entitlements to update", "error");
      return;
    }

    try {
      setLoading(true);
      let successCount = 0;
      let failCount = 0;

      // Build update data - only include fields that have values
      const updateData: UpdateLeaveEntitlementDto = {};
      if (bulkEditFormData.yearlyEntitlement !== undefined) {
        updateData.yearlyEntitlement = Number(bulkEditFormData.yearlyEntitlement);
      }
      if (bulkEditFormData.accruedActual !== undefined) {
        updateData.accruedActual = Number(bulkEditFormData.accruedActual);
      }
      if (bulkEditFormData.carryForward !== undefined) {
        updateData.carryForward = Number(bulkEditFormData.carryForward);
      }
      if (bulkEditFormData.taken !== undefined) {
        updateData.taken = Number(bulkEditFormData.taken);
      }
      if (bulkEditFormData.pending !== undefined) {
        updateData.pending = Number(bulkEditFormData.pending);
      }
      if (bulkEditFormData.remaining !== undefined) {
        updateData.remaining = Number(bulkEditFormData.remaining);
      }

      // Check if at least one field is provided
      if (Object.keys(updateData).length === 0) {
        showToast("Please provide at least one field to update", "error");
        setLoading(false);
        return;
      }

      // Update all entitlements
      for (const ent of entitlements) {
        try {
          await leavesApi.updateLeaveEntitlement(ent._id, updateData);
          successCount++;
        } catch (error: any) {
          console.error(`Failed to update entitlement ${ent._id}:`, error);
          failCount++;
        }
      }

      if (successCount > 0) {
        showToast(
          `Updated ${successCount} entitlement(s)${failCount > 0 ? `, ${failCount} failed` : ''}`,
          successCount === entitlements.length ? "success" : "warning"
        );
        setIsBulkEditModalOpen(false);
        setBulkEditFormData({});
        // Reload entitlements to show updated values
        if (selectedContractType && searchLeaveTypeId) {
          await loadEntitlementsByContractType();
        }
      } else {
        showToast("Failed to update entitlements", "error");
      }
    } catch (error: any) {
      showToast(error.message || "Failed to update entitlements", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-6 py-8">
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
      />

      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">Leave Entitlements</h1>
            <p className="text-gray-600 mt-1">
              Assign and manage employee leave entitlements
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-4">
          <Button 
            variant="outline"
            onClick={() => setIsPersonalizedModalOpen(true)}
            className="inline-flex items-center gap-2 px-6 py-3 border-2 border-emerald-300 text-emerald-700 font-semibold rounded-lg hover:bg-gradient-to-r hover:from-emerald-50 hover:to-teal-50 hover:border-emerald-400 transition-all duration-200"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Assign Personalized
          </Button>
          <Button 
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold rounded-lg hover:from-emerald-600 hover:to-teal-700 transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Entitlement
          </Button>
        </div>
      </div>

      <Card className="mb-6 border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50">
        <CardHeader className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <CardTitle className="text-white text-xl">View Leave Entitlements by Contract Type</CardTitle>
              <CardDescription className="text-emerald-100">
                Select Contract Type and Leave Type to view entitlements for all employees with that contract type
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <Select
              label="Contract Type *"
              value={selectedContractType}
              onChange={(e) => {
                setSelectedContractType(e.target.value);
                setEntitlements([]);
              }}
              options={
                getContractTypes().length > 0
                  ? getContractTypes().map((ct) => ({ value: ct, label: ct.replace(/_/g, ' ') }))
                  : [{ value: "", label: "No contract types available" }]
              }
              placeholder="Select contract type"
            />
            <Select
              label="Leave Type *"
              value={searchLeaveTypeId}
              onChange={(e) => {
                setSearchLeaveTypeId(e.target.value);
                setEntitlements([]);
              }}
              options={
                leaveTypes.length > 0
                  ? leaveTypes.map((t) => ({ value: t._id, label: t.name }))
                  : [{ value: "", label: "No leave types available" }]
              }
              placeholder="Select a leave type"
            />
          </div>
          {searchLeaveTypeId && (
            <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg">
              <div className="flex items-start gap-2">
                <div className="p-1.5 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-lg mt-0.5">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-blue-900 mb-1">
                    Eligible Contract Types for this Leave Type:
                  </p>
                  <p className="text-sm text-blue-800">
                    {getEligibleContractTypes().length > 0
                      ? getEligibleContractTypes().map(ct => ct.replace(/_/g, ' ')).join(', ')
                      : 'All contract types'}
                  </p>
                  {selectedContractType && !getEligibleContractTypes().includes(selectedContractType) && (
                    <div className="mt-2 p-2 bg-gradient-to-r from-orange-100 to-amber-100 border border-orange-300 rounded-md">
                      <p className="text-sm text-orange-800 flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        Warning: Selected contract type may not be eligible for this leave type according to policy.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          {selectedContractType && (
            <div className="mb-4 p-4 bg-gradient-to-r from-gray-50 to-slate-50 border-2 border-gray-200 rounded-lg">
              <div className="flex items-start gap-2">
                <div className="p-1.5 bg-gradient-to-br from-gray-400 to-slate-500 rounded-lg mt-0.5">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900">
                    Employees with <span className="text-emerald-700">{selectedContractType.replace(/_/g, ' ')}</span>: <span className="text-emerald-600 font-bold">{getFilteredEmployees().length}</span> employee(s)
                    {getFilteredEmployees().length < employees.length && (
                      <span className="inline-flex items-center gap-1 ml-2 px-2 py-0.5 rounded-full bg-gradient-to-r from-orange-100 to-amber-100 text-orange-800 text-xs font-semibold">
                        ({employees.length - getFilteredEmployees().length} employee(s) without contract type - they will also be shown)
                      </span>
                    )}
                  </p>
                  {employees.filter(emp => !emp.contractType || emp.contractType === '').length > 0 && (
                    <div className="mt-2 p-2 bg-gradient-to-r from-orange-100 to-amber-100 border border-orange-300 rounded-md">
                      <p className="text-xs text-orange-800 flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        {employees.filter(emp => !emp.contractType || emp.contractType === '').length} employee(s) don't have a contract type set. Use "Add All Employees to Entitlements" to set them all to Full-Time.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          <div className="flex gap-3">
            <Button 
              onClick={loadEntitlementsByContractType} 
              disabled={!selectedContractType || !searchLeaveTypeId || loading}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold rounded-lg hover:from-emerald-600 hover:to-teal-700 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Loading...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  Load Entitlements
                </>
              )}
            </Button>
            {entitlements.length > 0 && (
              <Button 
                variant="outline"
                onClick={async () => {
                  // Reload all entitlements to trigger rounding recalculation
                  showToast("Recalculating rounding for all entitlements...", "info");
                  await loadEntitlementsByContractType();
                  showToast("Rounding recalculated! Check the values now.", "success");
                }}
                disabled={loading}
                className="inline-flex items-center gap-2 px-6 py-3 border-2 border-blue-300 text-blue-700 font-semibold rounded-lg hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 hover:border-blue-400 transition-all duration-200"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Recalculate Rounding
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Display entitlements by contract type */}
      {loading ? (
        <Card className="border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50">
          <CardContent className="py-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full mb-4 animate-pulse">
              <svg className="w-8 h-8 text-white animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <p className="text-emerald-700 font-semibold text-lg">Loading entitlements...</p>
          </CardContent>
        </Card>
      ) : entitlements.length > 0 ? (
        <Card className="mb-6 border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50">
          <CardHeader className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <CardTitle className="text-white text-xl">
                    Entitlements for {selectedContractType.replace(/_/g, ' ')} - {leaveTypes.find(t => t._id === searchLeaveTypeId)?.name}
                  </CardTitle>
                  <CardDescription className="text-emerald-100">
                    Showing {entitlements.length} of {getFilteredEmployees().length} employee(s) with entitlements
                  </CardDescription>
                </div>
              </div>
              <Button
                variant="primary"
                onClick={() => {
                  // Pre-fill with current values from first entitlement (optional)
                  setBulkEditFormData({});
                  setIsBulkEditModalOpen(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white font-semibold rounded-lg transition-all duration-200 border-2 border-white/30"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit All
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              {entitlements.map((ent, index) => {
                const emp = employees.find(e => e._id === ent.employeeId.toString());
                const isEven = index % 2 === 0;
                return (
                  <div 
                    key={ent._id} 
                    className={`p-5 border-2 rounded-xl transition-all duration-200 ${
                      isEven 
                        ? 'bg-white border-emerald-200 hover:bg-gradient-to-r hover:from-emerald-50 hover:to-teal-50 hover:border-emerald-300 hover:shadow-lg' 
                        : 'bg-gradient-to-r from-emerald-50/50 to-teal-50/50 border-emerald-200 hover:bg-gradient-to-r hover:from-emerald-100 hover:to-teal-100 hover:border-emerald-300 hover:shadow-lg'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-lg">
                          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                        <div>
                          <p className="font-bold text-lg text-gray-900">{emp?.firstName} {emp?.lastName}</p>
                          <p className="text-sm text-gray-600 flex items-center gap-1">
                            <span className="font-medium">Employee ID:</span> {emp?.employeeId || ent.employeeId}
                          </p>
                          <p className="text-sm text-gray-500 flex items-center gap-1">
                            <span className="font-medium">Contract Type:</span> 
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800">
                              {emp?.contractType?.replace(/_/g, ' ') || 'N/A'}
                            </span>
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingEntitlement(ent);
                          setFormData({
                            employeeId: ent.employeeId.toString(),
                            leaveTypeId: ent.leaveTypeId.toString(),
                            yearlyEntitlement: ent.yearlyEntitlement,
                            accruedActual: ent.accruedActual || 0,
                            accruedRounded: ent.accruedRounded || 0,
                            carryForward: ent.carryForward || 0,
                            taken: ent.taken || 0,
                            pending: ent.pending || 0,
                            remaining: ent.remaining || 0,
                          });
                          setIsModalOpen(true);
                        }}
                        className="border-emerald-300 text-emerald-700 hover:bg-gradient-to-r hover:from-emerald-50 hover:to-teal-50 hover:border-emerald-400 transition-all duration-200"
                      >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Edit
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="p-3 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                        <p className="text-xs font-semibold text-blue-700 mb-1">Yearly Entitlement</p>
                        <p className="font-bold text-xl text-blue-900">{ent.yearlyEntitlement} <span className="text-sm text-blue-600">days</span></p>
                      </div>
                      <div className="p-3 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg border border-purple-200">
                        <p className="text-xs font-semibold text-purple-700 mb-1">Accrued Rounded</p>
                        <p className="font-bold text-xl text-purple-900">
                          {ent.accruedRounded} <span className="text-sm text-purple-600">days</span>
                          {ent.accruedActual !== undefined && ent.accruedActual !== ent.accruedRounded && (
                            <span className="text-xs text-gray-500 ml-2 block mt-1">
                              (from {ent.accruedActual})
                            </span>
                          )}
                        </p>
                      </div>
                      {ent.accruedActual !== undefined && (
                        <div className="p-3 bg-gradient-to-br from-gray-50 to-slate-50 rounded-lg border border-gray-200">
                          <p className="text-xs font-semibold text-gray-700 mb-1">Accrued Actual</p>
                          <p className="font-medium text-sm text-gray-600">{ent.accruedActual} <span className="text-xs">days</span></p>
                        </div>
                      )}
                      <div className="p-3 bg-gradient-to-br from-orange-50 to-amber-50 rounded-lg border border-orange-200">
                        <p className="text-xs font-semibold text-orange-700 mb-1">Taken</p>
                        <p className="font-bold text-xl text-orange-900">{ent.taken} <span className="text-sm text-orange-600">days</span></p>
                      </div>
                      <div className="p-3 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border border-green-200">
                        <p className="text-xs font-semibold text-green-700 mb-1">Remaining</p>
                        <p className="font-bold text-xl text-green-700">{ent.remaining} <span className="text-sm text-green-600">days</span></p>
                      </div>
                      <div className="p-3 bg-gradient-to-br from-yellow-50 to-amber-50 rounded-lg border border-yellow-200">
                        <p className="text-xs font-semibold text-yellow-700 mb-1">Pending</p>
                        <p className="font-bold text-lg text-yellow-900">{ent.pending} <span className="text-sm text-yellow-600">days</span></p>
                      </div>
                      <div className="p-3 bg-gradient-to-br from-cyan-50 to-blue-50 rounded-lg border border-cyan-200">
                        <p className="text-xs font-semibold text-cyan-700 mb-1">Carry Forward</p>
                        <p className="font-bold text-lg text-cyan-900">{ent.carryForward} <span className="text-sm text-cyan-600">days</span></p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ) : selectedContractType && searchLeaveTypeId ? (
        <Card className="border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50">
          <CardContent className="py-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-gray-700 font-medium text-lg mb-2">
              No entitlements found
            </p>
            <p className="text-gray-600 mb-2">
              No entitlements found for <span className="font-semibold text-emerald-700">{selectedContractType.replace(/_/g, ' ')}</span> with <span className="font-semibold text-emerald-700">{leaveTypes.find(t => t._id === searchLeaveTypeId)?.name}</span>
            </p>
            <p className="text-sm text-gray-500 mb-6">
              {getFilteredEmployees().length} employee(s) with this contract type may need entitlements created.
            </p>
            <Button 
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold rounded-lg hover:from-emerald-600 hover:to-teal-700 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Entitlements
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50">
          <CardContent className="py-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-gray-700 font-medium text-lg">
              Select Contract Type and Leave Type to view entitlements.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Entitlement Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingEntitlement(null);
          setCreateContractType("");
        }}
        title={editingEntitlement ? "Edit Leave Entitlement" : "Create Leave Entitlement"}
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => {
              setIsModalOpen(false);
              setEditingEntitlement(null);
              setCreateContractType("");
            }}>
              Cancel
            </Button>
            <Button type="submit" form="entitlement-form">
              {editingEntitlement ? "Update" : "Create"}
            </Button>
          </>
        }
      >
        <form id="entitlement-form" onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {editingEntitlement ? (
              // When editing, show employee (read-only or selectable)
              <Select
                label="Employee *"
                value={formData.employeeId}
                onChange={(e) =>
                  setFormData({ ...formData, employeeId: e.target.value })
                }
                error={errors.employeeId}
                options={
                  employees.length > 0
                    ? employees.map((emp) => ({
                        value: emp._id,
                        label: `${emp.firstName} ${emp.lastName} (${emp.contractType ? emp.contractType.replace(/_/g, ' ') : 'No contract type'})`,
                      }))
                    : [{ value: "", label: loadingEmployees ? "Loading employees..." : "No employees available" }]
                }
                placeholder="Select employee"
              />
            ) : (
              // When creating, show contract type
              <Select
                label="Contract Type *"
                value={createContractType}
                onChange={(e) => setCreateContractType(e.target.value)}
                error={errors.contractType}
                options={
                  getContractTypes().length > 0
                    ? getContractTypes().map((ct) => ({ value: ct, label: ct.replace(/_/g, ' ') }))
                    : [{ value: "", label: "No contract types available" }]
                }
                placeholder="Select contract type"
              />
            )}
            <Select
              label="Leave Type *"
              value={formData.leaveTypeId}
              onChange={(e) =>
                setFormData({ ...formData, leaveTypeId: e.target.value })
              }
              error={errors.leaveTypeId}
              options={
                leaveTypes.length > 0
                  ? leaveTypes.map((t) => ({ value: t._id, label: t.name }))
                  : [{ value: "", label: "No leave types available" }]
              }
              placeholder="Select a leave type"
            />
          </div>
          {!editingEntitlement && createContractType && (
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> This will create entitlements for all {employees.filter(emp => emp.contractType === createContractType).length} employee(s) with contract type "{createContractType.replace(/_/g, ' ')}"
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Yearly Entitlement *"
              type="number"
              step="0.01"
              value={formData.yearlyEntitlement}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  yearlyEntitlement: parseFloat(e.target.value) || 0,
                })
              }
              error={errors.yearlyEntitlement}
            />
            <Input
              label="Accrued Actual *"
              type="number"
              step="0.01"
              value={formData.accruedActual}
              onChange={(e) => {
                const newAccruedActual = parseFloat(e.target.value) || 0;
                setFormData({
                  ...formData,
                  accruedActual: newAccruedActual,
                  // Note: accruedRounded will be automatically calculated by backend based on rounding rule
                  // Don't set it here - let the backend handle it
                });
              }}
              placeholder="e.g., 10.5 (will be rounded automatically)"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Accrued Rounded (Auto-calculated)"
              type="number"
              step="0.01"
              value={formData.accruedRounded}
              disabled={true}
              className="bg-gray-100"
              title="This value is automatically calculated from Accrued Actual based on the leave policy's rounding rule"
            />
            <Input
              label="Carry Forward"
              type="number"
              step="0.01"
              value={formData.carryForward}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  carryForward: parseFloat(e.target.value) || 0,
                })
              }
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Input
              label="Taken"
              type="number"
              step="0.01"
              value={formData.taken}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  taken: parseFloat(e.target.value) || 0,
                })
              }
            />
            <Input
              label="Pending"
              type="number"
              step="0.01"
              value={formData.pending}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  pending: parseFloat(e.target.value) || 0,
                })
              }
            />
            <Input
              label="Remaining"
              type="number"
              step="0.01"
              value={formData.remaining}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  remaining: parseFloat(e.target.value) || 0,
                })
              }
            />
          </div>
        </form>
      </Modal>

      {/* Bulk Edit Modal */}
      <Modal
        isOpen={isBulkEditModalOpen}
        onClose={() => {
          setIsBulkEditModalOpen(false);
          setBulkEditFormData({});
        }}
        title={`Bulk Edit Entitlements (${entitlements.length} employee(s))`}
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => {
              setIsBulkEditModalOpen(false);
              setBulkEditFormData({});
            }}>
              Cancel
            </Button>
            <Button type="submit" form="bulk-edit-form" disabled={loading}>
              {loading ? "Updating..." : "Update All"}
            </Button>
          </>
        }
      >
        <form id="bulk-edit-form" onSubmit={handleBulkEditSubmit} className="space-y-4">
          <div className="p-3 bg-blue-50 rounded-lg mb-4">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> Leave fields empty to keep their current values. Only filled fields will be updated for all {entitlements.length} entitlement(s).
            </p>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Yearly Entitlement"
              type="number"
              step="0.01"
              value={bulkEditFormData.yearlyEntitlement ?? ''}
              onChange={(e) =>
                setBulkEditFormData({
                  ...bulkEditFormData,
                  yearlyEntitlement: e.target.value ? parseFloat(e.target.value) : undefined,
                })
              }
              placeholder="Leave empty to keep current"
            />
            <Input
              label="Accrued Actual"
              type="number"
              step="0.01"
              value={bulkEditFormData.accruedActual ?? ''}
              onChange={(e) =>
                setBulkEditFormData({
                  ...bulkEditFormData,
                  accruedActual: e.target.value ? parseFloat(e.target.value) : undefined,
                })
              }
              placeholder="Leave empty to keep current"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Carry Forward"
              type="number"
              step="0.01"
              value={bulkEditFormData.carryForward ?? ''}
              onChange={(e) =>
                setBulkEditFormData({
                  ...bulkEditFormData,
                  carryForward: e.target.value ? parseFloat(e.target.value) : undefined,
                })
              }
              placeholder="Leave empty to keep current"
            />
            <Input
              label="Taken"
              type="number"
              step="0.01"
              value={bulkEditFormData.taken ?? ''}
              onChange={(e) =>
                setBulkEditFormData({
                  ...bulkEditFormData,
                  taken: e.target.value ? parseFloat(e.target.value) : undefined,
                })
              }
              placeholder="Leave empty to keep current"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Pending"
              type="number"
              step="0.01"
              value={bulkEditFormData.pending ?? ''}
              onChange={(e) =>
                setBulkEditFormData({
                  ...bulkEditFormData,
                  pending: e.target.value ? parseFloat(e.target.value) : undefined,
                })
              }
              placeholder="Leave empty to keep current"
            />
            <Input
              label="Remaining"
              type="number"
              step="0.01"
              value={bulkEditFormData.remaining ?? ''}
              onChange={(e) =>
                setBulkEditFormData({
                  ...bulkEditFormData,
                  remaining: e.target.value ? parseFloat(e.target.value) : undefined,
                })
              }
              placeholder="Leave empty to keep current"
            />
          </div>
        </form>
      </Modal>

      {/* Personalized Entitlement Modal */}
      <Modal
        isOpen={isPersonalizedModalOpen}
        onClose={() => setIsPersonalizedModalOpen(false)}
        title="Assign Personalized Entitlement"
        footer={
          <>
            <Button variant="outline" onClick={() => setIsPersonalizedModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handlePersonalizedSubmit}>Assign</Button>
          </>
        }
      >
        <form onSubmit={handlePersonalizedSubmit} className="space-y-4">
          <Select
            label="Employee *"
            value={personalizedData.employeeId}
            onChange={(e) =>
              setPersonalizedData({
                ...personalizedData,
                employeeId: e.target.value,
              })
            }
            options={
              (selectedContractType ? getFilteredEmployees() : employees).length > 0
                ? (selectedContractType ? getFilteredEmployees() : employees).map((emp) => ({
                    value: emp._id,
                    label: `${emp.firstName} ${emp.lastName} (${emp.contractType ? emp.contractType.replace(/_/g, ' ') : 'No contract type'})`,
                  }))
                : [{ value: "", label: loadingEmployees ? "Loading employees..." : selectedContractType ? "No employees with this contract type" : "No employees available" }]
            }
            placeholder={selectedContractType ? "Select employee (filtered by contract type)" : "Select employee"}
          />
          <Select
            label="Leave Type *"
            value={personalizedData.leaveTypeId}
            onChange={(e) =>
              setPersonalizedData({
                ...personalizedData,
                leaveTypeId: e.target.value,
              })
            }
            options={
              leaveTypes.length > 0
                ? leaveTypes.map((t) => ({ value: t._id, label: t.name }))
                : [{ value: "", label: "No leave types available" }]
            }
            placeholder="Select leave type"
          />
          <Input
            label="Personalized Entitlement *"
            type="number"
            step="0.01"
            value={personalizedData.personalizedEntitlement}
            onChange={(e) =>
              setPersonalizedData({
                ...personalizedData,
                personalizedEntitlement: parseFloat(e.target.value) || 0,
              })
            }
            placeholder="Additional entitlement days"
          />
        </form>
      </Modal>
    </div>
  );
}

