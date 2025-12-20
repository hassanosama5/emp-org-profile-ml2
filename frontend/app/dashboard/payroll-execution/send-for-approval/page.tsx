"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/use-auth";
import { useRequireAuth } from "@/lib/hooks/use-auth";
import { SystemRole } from "@/types";
import { payrollExecutionApi } from "@/lib/api/payroll-execution/payroll-execution";
import { employeeProfileApi } from "@/lib/api/employee-profile/employee-profile";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/shared/ui/Card";
import { Button } from "@/components/shared/ui/Button";
import { Label } from "@/components/shared/ui/Label";
import {
  Send,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  FileText,
} from "lucide-react";

interface PayrollRun {
  _id: string;
  runId: string;
  payrollPeriod: string;
  status: string;
  entity: string;
  employees: number;
  paymentStatus?: string;
}

interface Employee {
  _id: string;
  firstName: string;
  lastName: string;
  email?: string;
  employeeId?: string;
  roles?: string[];
  systemRoles?: Array<{ role: string }>;
}

export default function SendForApprovalPage() {
  const router = useRouter();
  const { user } = useAuth();
  useRequireAuth(SystemRole.PAYROLL_SPECIALIST);

  const [payrollRuns, setPayrollRuns] = useState<PayrollRun[]>([]);
  const [selectedPayrollRunId, setSelectedPayrollRunId] = useState<string>("");
  const [payrollManagers, setPayrollManagers] = useState<Employee[]>([]);
  const [financeStaff, setFinanceStaff] = useState<Employee[]>([]);
  const [selectedManagerId, setSelectedManagerId] = useState<string>("");
  const [selectedFinanceStaffId, setSelectedFinanceStaffId] =
    useState<string>("");
  const [loading, setLoading] = useState(false);
  const [loadingManagers, setLoadingManagers] = useState(false);
  const [loadingFinance, setLoadingFinance] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const fetchPayrollRuns = async () => {
      setLoading(true);
      try {
        const runsResponse = await payrollExecutionApi.getAllPayrollRuns({
          limit: 1000,
        });
        let runsData: any[] = [];

        if (Array.isArray(runsResponse)) {
          runsData = runsResponse;
        } else if (Array.isArray((runsResponse as any)?.data)) {
          runsData = (runsResponse as any).data;
        } else if (Array.isArray((runsResponse as any)?.data?.items)) {
          runsData = (runsResponse as any).data.items;
        }

        const draftRuns = runsData.filter(
          (run: any) => run.status?.toLowerCase() === "draft"
        );
        setPayrollRuns(draftRuns);
      } catch (err: any) {
        setError(err.message || "Failed to load payroll runs");
      } finally {
        setLoading(false);
      }
    };

    fetchPayrollRuns();
  }, []);

  // FIXED HOOK: robust employee fetching and role extraction
  useEffect(() => {
    const fetchManagersAndFinance = async () => {
      setLoadingManagers(true);
      setLoadingFinance(true);
      try {
        const employeesResponse = await employeeProfileApi.getAllEmployees({
          limit: 1000,
        });

        // Handle different possible shapes of the API response
        let allEmployees: any[] = [];

        if (Array.isArray(employeesResponse)) {
          allEmployees = employeesResponse;
        } else if (Array.isArray((employeesResponse as any)?.data)) {
          allEmployees = (employeesResponse as any).data;
        } else if (Array.isArray((employeesResponse as any)?.data?.employees)) {
          allEmployees = (employeesResponse as any).data.employees;
        } else if (Array.isArray((employeesResponse as any)?.employees)) {
          allEmployees = (employeesResponse as any).employees;
        }

        console.log("🔍 Raw employeesResponse:", employeesResponse);
        console.log("🔍 Parsed employees count:", allEmployees.length);

        const managers: Employee[] = [];
        const finance: Employee[] = [];

        for (const emp of allEmployees) {
          let roles: string[] = [];

          // 1) Direct roles field (array of strings like ['Payroll Manager'])
          if (Array.isArray((emp as any).roles)) {
            roles.push(...(emp as any).roles.filter(Boolean));
          }

          // 2) systemRoles: [{ role: 'Payroll Manager' }, ...] or array of strings
          if (Array.isArray((emp as any).systemRoles)) {
            (emp as any).systemRoles.forEach((r: any) => {
              if (typeof r === 'string') {
                roles.push(r);
              } else if (r && typeof r === 'object' && r.role) {
                roles.push(r.role);
              }
            });
          }

          // 3) accessProfileId populated on the list item (fallback)
          const accessProfile = (emp as any).accessProfileId;
          if (accessProfile && typeof accessProfile === "object") {
            if (Array.isArray(accessProfile.roles)) {
              roles.push(...accessProfile.roles.filter(Boolean));
            }
            if (Array.isArray(accessProfile.systemRoles)) {
              accessProfile.systemRoles.forEach((r: any) => {
                if (typeof r === 'string') {
                  roles.push(r);
                } else if (r && typeof r === 'object' && r.role) {
                  roles.push(r.role);
                }
              });
                }
              }

          // Remove duplicates
          roles = [...new Set(roles)];

          // Log raw roles for debugging
          if (roles.length > 0) {
            console.log(
              `🔍 Employee ${(emp as any).firstName} ${(emp as any).lastName} - Roles:`,
              roles
            );
          }

          // Check for Payroll Manager role
          // SystemRole.PAYROLL_MANAGER = 'Payroll Manager'
          const hasPayrollManager = roles.some((r) => {
            const normalized = String(r).toLowerCase().trim();
            return (
              normalized === SystemRole.PAYROLL_MANAGER.toLowerCase() ||
              normalized === 'payroll_manager' ||
              normalized === 'payrollmanager' ||
              (normalized.includes('payroll') && normalized.includes('manager'))
            );
          });

          // Check for Finance Staff role
          // SystemRole.FINANCE_STAFF = 'Finance Staff'
          const hasFinanceStaff = roles.some((r) => {
            const normalized = String(r).toLowerCase().trim();
            return (
              normalized === SystemRole.FINANCE_STAFF.toLowerCase() ||
              normalized === 'finance_staff' ||
              normalized === 'financestaff' ||
              (normalized.includes('finance') && normalized.includes('staff'))
            );
          });

          if (hasPayrollManager) {
            managers.push(emp as Employee);
            console.log(
              `✅ Added Payroll Manager: ${(emp as any).firstName} ${
                (emp as any).lastName
              }`,
              { roles }
            );
          }

          if (hasFinanceStaff) {
            finance.push(emp as Employee);
            console.log(
              `✅ Added Finance Staff: ${(emp as any).firstName} ${
                (emp as any).lastName
              }`,
              { roles }
            );
          }
        }

        console.log(
          `✅ Final counts → Managers: ${managers.length}, Finance: ${finance.length}`
        );

        setPayrollManagers(managers);
        setFinanceStaff(finance);
      } catch (err: any) {
        console.error("Error fetching managers and finance staff:", err);
        setError("Failed to load managers and finance staff");
      } finally {
        setLoadingManagers(false);
        setLoadingFinance(false);
      }
    };

    fetchManagersAndFinance();
  }, []);

  const handleSendForApproval = async () => {
    if (!selectedPayrollRunId) {
      setError("Please select a payroll run");
      return;
    }

    if (!selectedManagerId) {
      setError("Please select a Payroll Manager");
      return;
    }

    if (!selectedFinanceStaffId) {
      setError("Please select a Finance Staff member");
      return;
    }

    setSending(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await payrollExecutionApi.sendForApproval({
        payrollRunId: selectedPayrollRunId,
        managerId: selectedManagerId,
        financeStaffId: selectedFinanceStaffId,
      });

      setSuccess(
        `Payroll run ${
          (response as any)?.runId || selectedPayrollRunId
        } has been sent for approval successfully!`
      );

      setTimeout(() => {
        setSelectedPayrollRunId("");
        setSelectedManagerId("");
        setSelectedFinanceStaffId("");
        setSuccess(null);
        router.push("/dashboard/payroll-execution");
      }, 2000);
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        "Failed to send payroll run for approval";
      setError(errorMessage);
      console.error("Error sending for approval:", err);
    } finally {
      setSending(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const selectedPayrollRun = payrollRuns.find(
    (run) => run._id === selectedPayrollRunId
  );

  const selectedManager = payrollManagers.find(
    (mgr) => mgr._id === selectedManagerId
  );

  const selectedFinance = financeStaff.find(
    (fin) => fin._id === selectedFinanceStaffId
  );

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Send Payroll Run for Approval
        </h1>
        <p className="text-gray-600 mt-1">
          Send payroll runs to Payroll Manager and Finance Staff for validation
          before finalization
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-red-500" />
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-500" />
          <p className="text-green-700">{success}</p>
        </div>
      )}

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Select Payroll Run & Approvers</CardTitle>
          <CardDescription>
            Choose a draft payroll run and assign Payroll Manager and Finance
            Staff for approval
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Payroll Run Selection */}
            <div>
              <Label htmlFor="payrollRun">Payroll Run *</Label>
              <select
                id="payrollRun"
                value={selectedPayrollRunId}
                onChange={(e) => setSelectedPayrollRunId(e.target.value)}
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={sending || loading}
              >
                <option value="">Select a payroll run</option>
                {payrollRuns.map((run) => (
                  <option key={run._id} value={run._id}>
                    {run.runId} - {formatDate(run.payrollPeriod)} -{" "}
                    {run.status} ({run.employees} employees)
                  </option>
                ))}
              </select>
              {payrollRuns.length === 0 && !loading && (
                <p className="text-sm text-gray-500 mt-2">
                  No draft payroll runs available. Payroll runs must be in{" "}
                  <strong>DRAFT</strong> status to send for approval.
                </p>
              )}
            </div>

            {selectedPayrollRun && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-5 w-5 text-blue-600" />
                  <p className="font-semibold text-gray-900">
                    Selected Payroll Run Details
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-600">Run ID:</span>
                    <span className="ml-2 font-medium">
                      {selectedPayrollRun.runId}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Period:</span>
                    <span className="ml-2 font-medium">
                      {formatDate(selectedPayrollRun.payrollPeriod)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Status:</span>
                    <span className="ml-2 font-medium">
                      {selectedPayrollRun.status}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Employees:</span>
                    <span className="ml-2 font-medium">
                      {selectedPayrollRun.employees}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Payroll Manager Selection */}
            <div>
              <Label htmlFor="manager">Payroll Manager *</Label>
              <select
                id="manager"
                value={selectedManagerId}
                onChange={(e) => setSelectedManagerId(e.target.value)}
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={sending || loadingManagers}
              >
                <option value="">Select a Payroll Manager</option>
                {payrollManagers.map((manager) => (
                  <option key={manager._id} value={manager._id}>
                    {manager.firstName} {manager.lastName}
                    {manager.email ? ` (${manager.email})` : ""}
                    {manager.employeeId ? ` - ${manager.employeeId}` : ""}
                  </option>
                ))}
              </select>
              {payrollManagers.length === 0 && !loadingManagers && (
                <p className="text-sm text-gray-500 mt-2">
                  No Payroll Managers found. Please ensure there are users with
                  the <strong>Payroll Manager</strong> role.
                </p>
              )}
              {selectedManager && (
                <div className="mt-2 p-2 bg-gray-50 rounded-md text-sm">
                  <p className="text-gray-700">
                    <strong>Selected:</strong> {selectedManager.firstName}{" "}
                    {selectedManager.lastName}
                    {selectedManager.email && ` (${selectedManager.email})`}
                  </p>
                </div>
              )}
            </div>

            {/* Finance Staff Selection */}
            <div>
              <Label htmlFor="financeStaff">Finance Staff *</Label>
              <select
                id="financeStaff"
                value={selectedFinanceStaffId}
                onChange={(e) => setSelectedFinanceStaffId(e.target.value)}
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={sending || loadingFinance}
              >
                <option value="">Select a Finance Staff member</option>
                {financeStaff.map((staff) => (
                  <option key={staff._id} value={staff._id}>
                    {staff.firstName} {staff.lastName}
                    {staff.email ? ` (${staff.email})` : ""}
                    {staff.employeeId ? ` - ${staff.employeeId}` : ""}
                  </option>
                ))}
              </select>
              {financeStaff.length === 0 && !loadingFinance && (
                <p className="text-sm text-gray-500 mt-2">
                  No Finance Staff found. Please ensure there are users with the{" "}
                  <strong>Finance Staff</strong> role.
                </p>
              )}
              {selectedFinance && (
                <div className="mt-2 p-2 bg-gray-50 rounded-md text-sm">
                  <p className="text-gray-700">
                    <strong>Selected:</strong> {selectedFinance.firstName}{" "}
                    {selectedFinance.lastName}
                    {selectedFinance.email && ` (${selectedFinance.email})`}
                  </p>
                </div>
              )}
            </div>

            <Button
              onClick={handleSendForApproval}
              disabled={
                !selectedPayrollRunId ||
                !selectedManagerId ||
                !selectedFinanceStaffId ||
                sending
              }
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3"
            >
              {sending ? (
                <>
                  <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                  Sending for Approval...
                </>
              ) : (
                <>
                  <Send className="h-5 w-5 mr-2" />
                  Send for Approval
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6 border-2 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-blue-600" />
            Important Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-gray-700">
            <li>
              • Only payroll runs with <strong>DRAFT</strong> status can be
              sent for approval
            </li>
            <li>
              • After sending for approval, the payroll run status will change
              to <strong>UNDER_REVIEW</strong>
            </li>
            <li>
              • The selected Payroll Manager will be able to review and
              approve/reject the payroll run
            </li>
            <li>
              • The selected Finance Staff will be able to review and
              approve/reject the payroll disbursement
            </li>
            <li>
              • Payments cannot be made until both Manager and Finance have
              approved the payroll run
            </li>
            <li>
              • This ensures proper validation and prevents unauthorized
              payments
            </li>
          </ul>
        </CardContent>
      </Card>

      <div className="mt-8">
        <Button
          onClick={() => router.push("/dashboard/payroll-execution")}
          className="bg-gray-600 hover:bg-gray-700 text-white"
        >
          ← Back to Payroll Execution
        </Button>
      </div>
    </div>
  );
}
