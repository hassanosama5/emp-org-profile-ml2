"use client";

import React, { useState, useEffect } from "react";
import { leavesApi } from "@/lib/api/leaves/leaves";
import { employeeProfileApi } from "@/lib/api/employee-profile/employee-profile";
import { useRequireAuth } from "@/lib/hooks/use-auth";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/shared/ui/Card";
import { Button } from "@/components/shared/ui/Button";
import { LeaveType } from "@/types/leaves";
import { EmployeeProfile } from "@/types";

export default function AccrualAdjustmentPage() {
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [employees, setEmployees] = useState<EmployeeProfile[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [successMessage, setSuccessMessage] = useState<string>("");
  
  const [formData, setFormData] = useState({
    employeeId: "",
    leaveTypeId: "",
    adjustmentType: "suspension",
    adjustmentAmount: "",
    fromDate: "",
    toDate: "",
    reason: "",
    notes: "",
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

  const handleAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError("");
      setSuccessMessage("");

      if (!formData.employeeId || !formData.leaveTypeId || !formData.adjustmentAmount || !formData.fromDate) {
        throw new Error("Please fill in all required fields");
      }

      await leavesApi.adjustAccrual(
        formData.employeeId,
        formData.leaveTypeId,
        formData.adjustmentType,
        parseFloat(formData.adjustmentAmount),
        formData.fromDate,
        formData.toDate || undefined,
        formData.reason || undefined,
        formData.notes || undefined
      );

      setSuccessMessage("Accrual adjustment applied successfully");
      setFormData({
        employeeId: "",
        leaveTypeId: "",
        adjustmentType: "suspension",
        adjustmentAmount: "",
        fromDate: "",
        toDate: "",
        reason: "",
        notes: "",
      });
    } catch (error: any) {
      console.error("Error adjusting accrual:", error);
      setError(error.message || "Failed to adjust accrual");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Accrual Adjustment & Suspension</h1>
        <p className="text-gray-600 mt-1">
          Adjust accruals during unpaid leave or long absence
        </p>
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

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Adjust Accrual</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAdjustment} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Employee *
              </label>
              <select
                value={formData.employeeId}
                onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                disabled={loadingEmployees}
              >
                <option value="">Select Employee</option>
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
                Adjustment Type *
              </label>
              <select
                value={formData.adjustmentType}
                onChange={(e) => setFormData({ ...formData, adjustmentType: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="suspension">Suspension (Reduce accrued)</option>
                <option value="reduction">Reduction (Reduce remaining)</option>
                <option value="adjustment">Adjustment (Increase remaining)</option>
                <option value="restoration">Restoration (Restore accrued)</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Suspension: Pause accrual during unpaid leave
                <br />
                Reduction: Reduce available balance
                <br />
                Adjustment: Increase available balance
                <br />
                Restoration: Restore previously suspended accrual
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Adjustment Amount *
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.adjustmentAmount}
                onChange={(e) => setFormData({ ...formData, adjustmentAmount: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                From Date *
              </label>
              <input
                type="date"
                value={formData.fromDate}
                onChange={(e) => setFormData({ ...formData, fromDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                To Date (Optional)
              </label>
              <input
                type="date"
                value={formData.toDate}
                onChange={(e) => setFormData({ ...formData, toDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reason (Optional)
              </label>
              <input
                type="text"
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Unpaid leave, Long absence"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes (Optional)
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
              />
            </div>
            <Button type="submit" disabled={loading}>
              {loading ? "Processing..." : "Apply Adjustment"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

