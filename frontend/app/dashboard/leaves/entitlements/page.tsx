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
  const [editingEntitlement, setEditingEntitlement] = useState<LeaveEntitlement | null>(null);
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
  const getFilteredEmployees = () => {
    if (!selectedContractType) return employees;
    return employees.filter(emp => emp.contractType === selectedContractType);
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
          console.warn(`No entitlement for employee ${emp._id}:`, error.message);
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
        const updateData: UpdateLeaveEntitlementDto = {
          yearlyEntitlement: Number(formData.yearlyEntitlement),
          accruedActual: Number(formData.accruedActual),
          accruedRounded: Number(formData.accruedRounded),
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
      setCreateContractType("");
      setEditingEntitlement(null);
      // Reload entitlements if contract type and leave type are selected
      if (selectedContractType && searchLeaveTypeId) {
        loadEntitlementsByContractType();
      }
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

  return (
    <div className="container mx-auto px-6 py-8">
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
      />

      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Leave Entitlements</h1>
          <p className="text-gray-600 mt-1">
            Assign and manage employee leave entitlements
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setIsPersonalizedModalOpen(true)}>
            Assign Personalized
          </Button>
          <Button onClick={() => setIsModalOpen(true)}>Create Entitlement</Button>
        </div>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>View Leave Entitlements by Contract Type</CardTitle>
          <CardDescription>
            Select Contract Type and Leave Type to view entitlements for all employees with that contract type
          </CardDescription>
        </CardHeader>
        <CardContent>
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
            <div className="mb-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Eligible Contract Types for this Leave Type:</strong> {
                  getEligibleContractTypes().length > 0
                    ? getEligibleContractTypes().map(ct => ct.replace(/_/g, ' ')).join(', ')
                    : 'All contract types'
                }
              </p>
              {selectedContractType && !getEligibleContractTypes().includes(selectedContractType) && (
                <p className="text-sm text-orange-800 mt-2">
                  ⚠️ Warning: Selected contract type may not be eligible for this leave type according to policy.
                </p>
              )}
            </div>
          )}
          {selectedContractType && (
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-700">
                <strong>Employees with {selectedContractType.replace(/_/g, ' ')}:</strong> {getFilteredEmployees().length} employee(s)
              </p>
            </div>
          )}
          <div className="flex gap-3">
            <Button 
              onClick={loadEntitlementsByContractType} 
              disabled={!selectedContractType || !searchLeaveTypeId}
            >
              Load Entitlements
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Display entitlements by contract type */}
      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Loading entitlements...</p>
        </div>
      ) : entitlements.length > 0 ? (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>
              Entitlements for {selectedContractType.replace(/_/g, ' ')} - {leaveTypes.find(t => t._id === searchLeaveTypeId)?.name}
            </CardTitle>
            <CardDescription>
              Showing {entitlements.length} of {getFilteredEmployees().length} employee(s) with entitlements
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {entitlements.map((ent) => {
                const emp = employees.find(e => e._id === ent.employeeId.toString());
                return (
                  <div key={ent._id} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="font-semibold text-lg">{emp?.firstName} {emp?.lastName}</p>
                        <p className="text-sm text-gray-600">Employee ID: {emp?.employeeId || ent.employeeId}</p>
                        <p className="text-sm text-gray-500">Contract Type: {emp?.contractType?.replace(/_/g, ' ') || 'N/A'}</p>
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
                            accruedActual: ent.accruedActual,
                            accruedRounded: ent.accruedRounded,
                            carryForward: ent.carryForward,
                            taken: ent.taken,
                            pending: ent.pending,
                            remaining: ent.remaining,
                          });
                          setIsModalOpen(true);
                        }}
                      >
                        Edit
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Yearly Entitlement</p>
                        <p className="font-medium text-lg">{ent.yearlyEntitlement} days</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Accrued Rounded</p>
                        <p className="font-medium text-lg">{ent.accruedRounded} days</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Taken</p>
                        <p className="font-medium text-lg">{ent.taken} days</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Remaining</p>
                        <p className="font-medium text-lg text-green-600">{ent.remaining} days</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Pending</p>
                        <p className="font-medium">{ent.pending} days</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Carry Forward</p>
                        <p className="font-medium">{ent.carryForward} days</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ) : selectedContractType && searchLeaveTypeId ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500 mb-4">
              No entitlements found for {selectedContractType.replace(/_/g, ' ')} with {leaveTypes.find(t => t._id === searchLeaveTypeId)?.name}
            </p>
            <p className="text-sm text-gray-400 mb-4">
              {getFilteredEmployees().length} employee(s) with this contract type may need entitlements created.
            </p>
            <Button onClick={() => setIsModalOpen(true)}>
              Create Entitlements
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500">
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
              label="Accrued Actual"
              type="number"
              step="0.01"
              value={formData.accruedActual}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  accruedActual: parseFloat(e.target.value) || 0,
                })
              }
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Accrued Rounded"
              type="number"
              step="0.01"
              value={formData.accruedRounded}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  accruedRounded: parseFloat(e.target.value) || 0,
                })
              }
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

