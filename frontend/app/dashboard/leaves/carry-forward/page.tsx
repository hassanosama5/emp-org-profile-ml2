"use client";

import React, { useState, useEffect } from "react";
import { leavesApi } from "@/lib/api/leaves/leaves";
import { employeeProfileApi } from "@/lib/api/employee-profile/employee-profile";
import { useRequireAuth } from "@/lib/hooks/use-auth";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/shared/ui/Card";
import { Button } from "@/components/shared/ui/Button";
import { LeaveType } from "@/types/leaves";
import { EmployeeProfile } from "@/types";

export default function CarryForwardPage() {
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [employees, setEmployees] = useState<EmployeeProfile[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [successMessage, setSuccessMessage] = useState<string>("");
  const [result, setResult] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    leaveTypeId: "",
    employeeId: "",
    asOfDate: "",
    departmentId: "",
  });

  useRequireAuth();

  useEffect(() => {
    fetchLeaveTypes();
    fetchEmployees();
  }, []);

  const fetchLeaveTypes = async () => {
    try {
      const types = await leavesApi.getLeaveTypes();
      setLeaveTypes(types || []);
    } catch (error) {
      console.warn("Failed to fetch leave types:", error);
      setLeaveTypes([]);
    }
  };

  const fetchEmployees = async () => {
    try {
      setLoadingEmployees(true);
      const response = await employeeProfileApi.getAllEmployees({ limit: 1000 });
      const employeesList = Array.isArray(response) ? response : (response.data || []);
      setEmployees(employeesList);
    } catch (error) {
      console.warn("Failed to fetch employees:", error);
      setEmployees([]);
    } finally {
      setLoadingEmployees(false);
    }
  };

  const handleCarryForward = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("[Frontend] handleCarryForward called");
    console.log("[Frontend] Form data:", formData);
    
    try {
      setLoading(true);
      setError("");
      setSuccessMessage("");
      setResult(null);

      if (!formData.leaveTypeId) {
        console.error("[Frontend] Validation failed: Leave Type is required");
        throw new Error("Leave Type is required");
      }

      console.log("[Frontend] Calling runCarryForward with:", {
        leaveTypeId: formData.leaveTypeId,
        employeeId: formData.employeeId,
        asOfDate: formData.asOfDate,
        departmentId: formData.departmentId,
      });

      const result = await leavesApi.runCarryForward(
        formData.leaveTypeId,
        formData.employeeId || undefined,
        formData.asOfDate || undefined,
        formData.departmentId || undefined
      );

      console.log("[Frontend] Carry-forward result:", result);

      setResult(result);
      setSuccessMessage(
        `Carry-forward completed. Successful: ${result.successful}, Failed: ${result.failed}, Total: ${result.total}`
      );
    } catch (error: any) {
      console.error("[Frontend] Error running carry-forward:", error);
      console.error("[Frontend] Error details:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      setError(error.message || "Failed to run carry-forward");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Carry-Forward Management</h1>
        <p className="text-gray-600 mt-1">Run year-end/period carry-forward to move unused days</p>
      </div>

      {successMessage && (
        <div className="mb-6 rounded-md bg-green-50 p-4 border border-green-200">
          <p className="text-sm text-green-800">{successMessage}</p>
        </div>
      )}

      {error && (
        <div className="mb-6 rounded-md bg-red-50 p-4 border border-red-200">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Run Carry-Forward</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCarryForward} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Leave Type *
                </label>
                <select
                  value={formData.leaveTypeId}
                  onChange={(e) => setFormData({ ...formData, leaveTypeId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select Leave Type</option>
                  {leaveTypes.map((type) => (
                    <option key={type._id} value={type._id}>
                      {type.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Employee (Optional)
                </label>
                <select
                  value={formData.employeeId}
                  onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={loadingEmployees}
                >
                  <option value="">All Employees</option>
                  {employees.map((employee) => {
                    const employeeName = employee.fullName || 
                      (employee.firstName && employee.lastName 
                        ? `${employee.firstName}${employee.middleName ? ' ' + employee.middleName : ''} ${employee.lastName}`.trim()
                        : employee.employeeNumber || 'Unknown');
                    return (
                      <option key={employee._id} value={employee._id}>
                        {employeeName} {employee.employeeNumber ? `(${employee.employeeNumber})` : ''}
                      </option>
                    );
                  })}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  As Of Date (Optional)
                </label>
                <input
                  type="date"
                  value={formData.asOfDate}
                  onChange={(e) => setFormData({ ...formData, asOfDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Department ID (Optional)
                </label>
                <input
                  type="text"
                  value={formData.departmentId}
                  onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Leave empty for all departments"
                />
              </div>
              <Button type="submit" disabled={loading}>
                {loading ? "Processing..." : "Run Carry-Forward"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {result && (
          <Card>
            <CardHeader>
              <CardTitle>Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Processed Date:</span>
                  <span className="font-semibold">
                    {new Date(result.processedDate).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Processed:</span>
                  <span className="font-semibold">{result.total}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Successful:</span>
                  <span className="font-semibold text-green-600">{result.successful}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Failed:</span>
                  <span className="font-semibold text-red-600">{result.failed}</span>
                </div>
                {result.details && result.details.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-semibold mb-2">Details:</h4>
                    <div className="max-h-64 overflow-y-auto space-y-1">
                      {result.details.slice(0, 10).map((detail: any, index: number) => (
                        <div key={index} className="text-sm border-b pb-1">
                          <div className="flex justify-between">
                            <span>Employee: {detail.employeeId}</span>
                            <span className={
                              detail.status === 'success' ? 'text-green-600' : 
                              detail.status === 'failed' ? 'text-red-600' : 
                              'text-gray-600'
                            }>
                              {detail.status}
                            </span>
                          </div>
                          {detail.carryForwardAmount !== undefined && (
                            <div className="text-gray-600">
                              Carry Forward: {detail.carryForwardAmount} days
                            </div>
                          )}
                          {detail.error && (
                            <div className="text-red-600 text-xs mt-1">
                              Error: {detail.error}
                            </div>
                          )}
                          {detail.reason && (
                            <div className="text-gray-500 text-xs mt-1">
                              Reason: {detail.reason}
                            </div>
                          )}
                          {detail.details && (
                            <div className="text-xs text-gray-400 mt-1">
                              Accrued: {detail.details.accruedRounded}, Taken: {detail.details.taken}, Pending: {detail.details.pending}
                            </div>
                          )}
                        </div>
                      ))}
                      {result.details.length > 10 && (
                        <div className="text-xs text-gray-500">
                          ... and {result.details.length - 10} more
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

