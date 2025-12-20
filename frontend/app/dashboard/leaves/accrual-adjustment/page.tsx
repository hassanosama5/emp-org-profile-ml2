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
        <div className="flex items-center gap-3 mb-2">
          <div className="p-3 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">Accrual Adjustment & Suspension</h1>
            <p className="text-gray-600 mt-1">
              Adjust accruals during unpaid leave or long absence
            </p>
          </div>
        </div>
      </div>

      {successMessage && (
        <div className="mb-6 rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 p-4 border-2 border-green-300">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-gradient-to-br from-green-400 to-emerald-500 rounded-lg">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-green-800">{successMessage}</p>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-6 rounded-xl bg-gradient-to-r from-red-50 to-rose-50 p-4 border-2 border-red-300">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-gradient-to-br from-red-400 to-rose-500 rounded-lg">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-red-800">{error}</p>
          </div>
        </div>
      )}

      <Card className="max-w-2xl border-2 border-cyan-200 bg-gradient-to-br from-cyan-50 to-blue-50">
        <CardHeader className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
            </div>
            <CardTitle className="text-white text-xl">Adjust Accrual</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleAdjustment} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Employee *
              </label>
              <select
                value={formData.employeeId}
                onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                className="w-full px-3 py-2 border-2 border-cyan-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-400 disabled:opacity-50"
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
                className="w-full px-3 py-2 border-2 border-cyan-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-400"
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
                className="w-full px-3 py-2 border-2 border-cyan-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-400"
                required
              >
                <option value="suspension">Suspension (Reduce accrued)</option>
                <option value="reduction">Reduction (Reduce remaining)</option>
                <option value="adjustment">Adjustment (Increase remaining)</option>
                <option value="restoration">Restoration (Restore accrued)</option>
              </select>
              <div className="mt-3 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1 bg-gradient-to-br from-orange-400 to-amber-500 rounded">
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                      </svg>
                    </div>
                    <p className="text-xs font-semibold text-blue-900">Suspension: Pause accrual during unpaid leave</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="p-1 bg-gradient-to-br from-red-400 to-rose-500 rounded">
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                      </svg>
                    </div>
                    <p className="text-xs font-semibold text-blue-900">Reduction: Reduce available balance</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="p-1 bg-gradient-to-br from-green-400 to-emerald-500 rounded">
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </div>
                    <p className="text-xs font-semibold text-blue-900">Adjustment: Increase available balance</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="p-1 bg-gradient-to-br from-purple-400 to-pink-500 rounded">
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </div>
                    <p className="text-xs font-semibold text-blue-900">Restoration: Restore previously suspended accrual</p>
                  </div>
                </div>
              </div>
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
                className="w-full px-3 py-2 border-2 border-cyan-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-400"
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
                className="w-full px-3 py-2 border-2 border-cyan-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-400"
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
                className="w-full px-3 py-2 border-2 border-cyan-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-400"
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
                className="w-full px-3 py-2 border-2 border-cyan-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-400"
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
                className="w-full px-3 py-2 border-2 border-cyan-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-400"
                rows={3}
              />
            </div>
            <Button 
              type="submit" 
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold rounded-lg hover:from-cyan-600 hover:to-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Processing...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Apply Adjustment
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

