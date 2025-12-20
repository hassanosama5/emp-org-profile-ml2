"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth, useRequireAuth } from "@/lib/hooks/use-auth";
import { SystemRole } from "@/types";
import { timeManagementApi } from "@/lib/api/time-management/time-management.api";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/shared/ui/Card";
import { Button } from "@/components/shared/ui/Button";
import { Toast, useToast } from "@/components/leaves/Toast";
import { employeeProfileApi } from "@/lib/api/employee-profile/employee-profile";

interface LatenessFlag {
  id: string;
  employeeId: string;
  status: string;
  reason: string;
  createdAt: string;
}

interface Employee {
  _id?: string;
  firstName?: string;
  lastName?: string;
  employeeNumber?: string;
}

export default function RepeatedLatenessPage() {
  const { user, loading: authLoading } = useAuth();
  useRequireAuth(SystemRole.HR_ADMIN);
  const { toast, showToast, hideToast } = useToast();

  const [flags, setFlags] = useState<LatenessFlag[]>([]);
  const [employees, setEmployees] = useState<Record<string, Employee>>({});
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [scanning, setScanning] = useState(false);

  const loadFlags = useCallback(async () => {
    try {
      setLoading(true);
      const data = await timeManagementApi.getLatenesDisciplinaryFlags({});
      setFlags(data.flags || []);

      // Load employee info for each unique employeeId
      const employeeIds = [...new Set(data.flags?.map((f: LatenessFlag) => f.employeeId) || [])];
      const employeeMap: Record<string, Employee> = {};
      
      for (const id of employeeIds) {
        try {
          const emp = await employeeProfileApi.getEmployeeById(id as string) as any;
          if (emp) {
            employeeMap[id as string] = {
              _id: emp._id,
              firstName: emp.firstName,
              lastName: emp.lastName,
              employeeNumber: emp.employeeNumber,
            };
          }
        } catch (err) {
          console.error(`Failed to load employee ${id}:`, err);
        }
      }
      setEmployees(employeeMap);
    } catch (error: any) {
      showToast(error.message || "Failed to load lateness flags", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadFlags();
  }, [loadFlags]);

  const handleCheckNow = async () => {
    try {
      setChecking(true);
      await timeManagementApi.manuallyCheckRepeatedLateness();
      showToast("Lateness check completed!", "success");
      await loadFlags(); // Refresh the list
    } catch (error: any) {
      showToast(error.message || "Failed to run lateness check", "error");
    } finally {
      setChecking(false);
    }
  };

  const handleScanExisting = async () => {
    try {
      setScanning(true);
      showToast("Scanning attendance records... This may take a minute.", "info");
      const result = await timeManagementApi.scanExistingForLateness({ days: 30 });
      showToast(`Scan complete! Created ${result.flaggedCount || 0} new LATE exceptions. Now checking for repeat offenders...`, "success");
      
      // After scanning, run the check to flag repeated lateness
      try {
        await timeManagementApi.manuallyCheckRepeatedLateness();
        showToast("Lateness check completed!", "success");
      } catch (checkError: any) {
        showToast("Scan complete, but failed to run check. Click 'Check Now' separately.", "warning");
      }
      
      await loadFlags(); // Refresh the list
    } catch (error: any) {
      showToast(error.message || "Failed to scan existing records", "error");
    } finally {
      setScanning(false);
    }
  };

  const parseOccurrencesFromReason = (reason: string): number => {
    const match = reason?.match(/(\d+) late/);
    return match ? parseInt(match[1], 10) : 0;
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      PENDING: "bg-yellow-100 text-yellow-800",
      RESOLVED: "bg-green-100 text-green-800",
      OPEN: "bg-red-100 text-red-800",
    };
    return styles[status] || "bg-gray-100 text-gray-800";
  };

  if (authLoading) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="text-center py-12">
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8">
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Repeated Lateness Tracking</h1>
          <p className="text-gray-600 mt-1">
            Employees flagged for repeated lateness (3+ late arrivals)
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="secondary" 
            onClick={handleScanExisting}
            disabled={scanning || checking}
          >
            {scanning ? "Scanning..." : "Scan Existing Records"}
          </Button>
          <Button 
            variant="primary" 
            onClick={handleCheckNow}
            disabled={checking || scanning}
          >
            {checking ? "Checking..." : "Check Now"}
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="text-3xl font-bold text-red-600">{flags.length}</div>
            <div className="text-sm text-gray-500">Flagged Employees</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-3xl font-bold text-yellow-600">
              {flags.filter(f => f.status === "PENDING" || f.status === "OPEN").length}
            </div>
            <div className="text-sm text-gray-500">Pending Review</div>
          </CardContent>
        </Card>
      </div>

      {/* Flagged Employees List */}
      <Card>
        <CardHeader>
          <CardTitle>Flagged Employees</CardTitle>
          <CardDescription>
            These employees have been automatically flagged for repeated late arrivals
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Loading flagged employees...</p>
            </div>
          ) : flags.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-green-500 mb-4">
                <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Flagged Employees</h3>
              <p className="text-gray-500">
                No employees have been flagged for repeated lateness.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Employee
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Late Arrivals
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Flagged Date
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {flags.map((flag) => {
                    const employee = employees[flag.employeeId];
                    const occurrences = parseOccurrencesFromReason(flag.reason);
                    
                    return (
                      <tr key={flag.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">
                            {employee 
                              ? `${employee.firstName} ${employee.lastName}` 
                              : "Unknown Employee"
                            }
                          </div>
                          <div className="text-xs text-gray-500">
                            {employee?.employeeNumber || flag.employeeId}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-bold text-red-600">
                            {occurrences} times
                          </div>
                          <div className="text-xs text-gray-500">total late arrivals</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(flag.status)}`}>
                            {flag.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(flag.createdAt).toLocaleDateString()}
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

      {/* Info Card */}
      <Card className="mt-6 bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h4 className="font-medium text-blue-900">How it works</h4>
              <p className="text-sm text-blue-700 mt-1">
                The system automatically checks for repeated lateness every day at 5:30 AM. 
                Employees with 3 or more late arrivals are flagged and 
                appear on this list for disciplinary tracking.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
