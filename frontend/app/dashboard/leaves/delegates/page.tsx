"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/use-auth";
import { SystemRole } from "@/types";
import { leavesApi } from "@/lib/api/leaves/leaves";
import { employeeProfileApi } from "@/lib/api/employee-profile/employee-profile";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/shared/ui/Card";
import { Button } from "@/components/shared/ui/Button";
import { Select } from "@/components/leaves/Select";

interface Delegation {
  delegateId: string;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  delegateName?: string;
  delegateEmployeeId?: string;
}

export default function DelegateManagementPage() {
  const { user, isAuthenticated, loading } = useAuth();
  const router = useRouter();
  
  const [delegations, setDelegations] = useState<Delegation[]>([]);
  const [loadingDelegations, setLoadingDelegations] = useState(false);
  const [employees, setEmployees] = useState<Array<{ _id: string; employeeId: string; firstName: string; lastName: string }>>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Form state
  const [selectedDelegateId, setSelectedDelegateId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Role-based access control
  useEffect(() => {
    if (!loading && isAuthenticated && user) {
      const roles = user.roles || [];
      const canManageDelegates = 
        roles.includes(SystemRole.DEPARTMENT_HEAD) ||
        roles.includes(SystemRole.HR_MANAGER) ||
        roles.includes(SystemRole.PAYROLL_MANAGER) ||
        roles.includes(SystemRole.HR_ADMIN);
      
      if (!canManageDelegates) {
        router.replace("/dashboard");
      }
    }
  }, [loading, isAuthenticated, user, router]);

  // Load delegations and employees
  useEffect(() => {
    if (isAuthenticated && user) {
      loadDelegations();
      loadEmployees();
    }
  }, [isAuthenticated, user]);

  const loadDelegations = async () => {
    setLoadingDelegations(true);
    setError(null);
    try {
      const data = await leavesApi.getDelegations();
      // Convert date strings to Date objects
      const formattedData = data.map((del: any) => ({
        ...del,
        startDate: new Date(del.startDate),
        endDate: new Date(del.endDate),
      }));
      setDelegations(formattedData);
    } catch (err: any) {
      console.error("Error loading delegations:", err);
      setError(err.response?.data?.message || "Failed to load delegations");
    } finally {
      setLoadingDelegations(false);
    }
  };

  const loadEmployees = async () => {
    setLoadingEmployees(true);
    try {
      const response = await employeeProfileApi.getAllEmployees({ limit: 1000 });
      const employeesList = Array.isArray(response.data) ? response.data : [];
      const currentUserId = (user as any)?._id || user?.userId || (user as any)?.id;
      
      // Filter out current user and only show managers/eligible delegates
      const filtered = employeesList
        .filter((emp: any) => {
          const empId = emp._id || emp.employeeId;
          return empId !== currentUserId;
        })
        .map((emp: any) => ({
          _id: emp._id,
          employeeId: emp.employeeId || emp._id,
          firstName: emp.firstName || '',
          lastName: emp.lastName || '',
        }));
      
      setEmployees(filtered);
    } catch (err: any) {
      console.error("Error loading employees:", err);
    } finally {
      setLoadingEmployees(false);
    }
  };

  const handleCreateDelegation = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedDelegateId || !startDate || !endDate) {
      setError("Please fill in all fields");
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start >= end) {
      setError("End date must be after start date");
      return;
    }

    if (end < new Date()) {
      setError("End date must be in the future");
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await leavesApi.delegateApprovalAuthority(selectedDelegateId, start, end);
      setSuccessMessage("Delegation created successfully!");
      setSelectedDelegateId("");
      setStartDate("");
      setEndDate("");
      await loadDelegations();
    } catch (err: any) {
      console.error("Error creating delegation:", err);
      setError(err.response?.data?.message || "Failed to create delegation");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevokeDelegation = async (delegation: Delegation) => {
    if (!confirm(`Are you sure you want to revoke delegation for ${delegation.delegateName || delegation.delegateId}?`)) {
      return;
    }

    try {
      await leavesApi.revokeDelegation(
        delegation.delegateId,
        delegation.startDate,
        delegation.endDate
      );
      setSuccessMessage("Delegation revoked successfully!");
      await loadDelegations();
    } catch (err: any) {
      console.error("Error revoking delegation:", err);
      setError(err.response?.data?.message || "Failed to revoke delegation");
    }
  };

  // Auto-dismiss messages
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  if (loading) {
    return <div className="container mx-auto px-6 py-8">Loading...</div>;
  }

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Manage Delegates</h1>
        <p className="text-gray-600 mt-2">
          Assign delegates to approve leave requests on your behalf during specific date ranges.
        </p>
      </div>

      {/* Messages */}
      {successMessage && (
        <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-blue-100 border-2 border-blue-300 rounded-xl shadow-sm">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <p className="text-blue-800 text-sm font-semibold">{successMessage}</p>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-gradient-to-r from-red-50 to-red-100 border-2 border-red-300 rounded-xl shadow-sm">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <p className="text-red-800 text-sm font-semibold">{error}</p>
          </div>
        </div>
      )}

      {/* Create Delegation Form */}
      <Card className="mb-8 shadow-md border-gray-200">
        <CardHeader>
          <CardTitle>Assign New Delegate</CardTitle>
          <CardDescription>
            Select an employee to delegate approval authority for a specific date range.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateDelegation} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Select
                  label="Delegate Employee *"
                  value={selectedDelegateId}
                  onChange={(e) => setSelectedDelegateId(e.target.value)}
                  options={
                    employees.length > 0
                      ? employees.map((emp) => ({
                          value: emp._id,
                          label: `${emp.firstName} ${emp.lastName} (${emp.employeeId})`,
                        }))
                      : [{ value: "", label: loadingEmployees ? "Loading employees..." : "No employees available" }]
                  }
                  placeholder="Select an employee"
                  disabled={loadingEmployees || submitting}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date *
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  disabled={submitting}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date *
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  disabled={submitting}
                  min={startDate || new Date().toISOString().split('T')[0]}
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                type="submit"
                variant="primary"
                disabled={submitting || !selectedDelegateId || !startDate || !endDate}
              >
                {submitting ? "Creating..." : "Create Delegation"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Existing Delegations */}
      <Card className="shadow-md border-gray-200">
        <CardHeader>
          <CardTitle>Active Delegations</CardTitle>
          <CardDescription>
            Manage your current delegations. Delegates can approve leave requests on your behalf during the specified date ranges.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingDelegations ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading delegations...</p>
            </div>
          ) : delegations.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No delegations found. Create a new delegation above.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {delegations.map((delegation, index) => {
                const isActive = delegation.isActive && 
                  new Date() >= delegation.startDate && 
                  new Date() <= delegation.endDate;
                const isPast = new Date() > delegation.endDate;
                
                return (
                  <div
                    key={index}
                    className={`p-4 rounded-lg border-2 ${
                      isActive
                        ? "bg-green-50 border-green-200"
                        : isPast
                        ? "bg-gray-50 border-gray-200"
                        : "bg-yellow-50 border-yellow-200"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-gray-900">
                            {delegation.delegateName || delegation.delegateId}
                          </h3>
                          {delegation.delegateEmployeeId && (
                            <span className="text-sm text-gray-600">
                              ({delegation.delegateEmployeeId})
                            </span>
                          )}
                          <span
                            className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
                              isActive
                                ? "bg-green-100 text-green-800"
                                : isPast
                                ? "bg-gray-100 text-gray-800"
                                : "bg-yellow-100 text-yellow-800"
                            }`}
                          >
                            {isActive ? "Active" : isPast ? "Expired" : "Scheduled"}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600 space-y-1">
                          <p>
                            <span className="font-medium">Start:</span>{" "}
                            {delegation.startDate.toLocaleDateString()}
                          </p>
                          <p>
                            <span className="font-medium">End:</span>{" "}
                            {delegation.endDate.toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      {delegation.isActive && !isPast && (
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleRevokeDelegation(delegation)}
                        >
                          Revoke
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

