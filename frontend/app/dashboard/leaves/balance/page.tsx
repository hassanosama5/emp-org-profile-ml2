"use client";

import React, { useState, useEffect } from "react";
import { leavesApi } from "@/lib/api/leaves/leaves";
import { authApi } from "@/lib/api/auth/auth";
import { useAuthStore } from "@/lib/stores/auth.store";
import { useRequireAuth } from "@/lib/hooks/use-auth";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/shared/ui/Card";
import { Button } from "@/components/shared/ui/Button";

interface LeaveBalance {
  leaveTypeId: string;
  leaveTypeName?: string;
  yearlyEntitlement: number;
  accruedActual: number;
  carryForward: number;
  taken: number;
  pending: number;
  remaining: number;
  lastAccrualDate?: string;
}

export default function LeaveBalancePage() {
  const { user } = useAuthStore();
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  useRequireAuth();

  useEffect(() => {
    fetchLeaveBalance();
  }, [user]);

  const fetchLeaveBalance = async () => {
    try {
      setLoading(true);
      setError("");
      const employeeId = authApi.getUserId() || user?.id || user?.userId || "";
      
      if (!employeeId || !employeeId.trim()) {
        throw new Error("Employee ID is required. Please log in again.");
      }
      
      const result = await leavesApi.getEmployeeLeaveBalance(employeeId.trim());
      const balancesArray = Array.isArray(result) ? result : [result].filter(Boolean);
      
      // Deduplicate by leaveTypeId - keep the first occurrence of each leave type
      const uniqueBalances = balancesArray.reduce((acc: LeaveBalance[], current: LeaveBalance) => {
        const existing = acc.find(b => b.leaveTypeId === current.leaveTypeId);
        if (!existing) {
          acc.push(current);
        }
        return acc;
      }, []);
      
      setBalances(uniqueBalances);
    } catch (error: any) {
      console.error("Error fetching leave balance:", error);
      setError(error.message || "Failed to load leave balance");
      setBalances([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading leave balance...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-6 py-8">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-600">{error}</p>
            <Button onClick={fetchLeaveBalance} className="mt-4">
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">My Leave Balance</h1>
        <p className="text-gray-600 mt-1">View your current leave entitlements and balances</p>
      </div>

      {balances.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-gray-600">No leave entitlements found.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {balances.map((balance, index) => (
            <Card key={`${balance.leaveTypeId}-${index}`} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="text-xl">{balance.leaveTypeName || "Unknown Leave Type"}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Yearly Entitlement:</span>
                    <span className="font-semibold">{balance.yearlyEntitlement} days</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Accrued:</span>
                    <span className="font-semibold">{balance.accruedActual.toFixed(2)} days</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Carry Forward:</span>
                    <span className="font-semibold">{balance.carryForward} days</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Taken:</span>
                    <span className="font-semibold text-red-600">{balance.taken} days</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Pending:</span>
                    <span className="font-semibold text-yellow-600">{balance.pending} days</span>
                  </div>
                  <div className="border-t pt-3 mt-3">
                    <div className="flex justify-between">
                      <span className="text-lg font-semibold text-gray-900">Remaining:</span>
                      <span className={`text-2xl font-bold ${balance.remaining >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {balance.remaining.toFixed(2)} days
                      </span>
                    </div>
                  </div>
                  {balance.lastAccrualDate && (
                    <div className="text-sm text-gray-500 mt-2">
                      Last accrual: {new Date(balance.lastAccrualDate).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

