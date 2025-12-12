"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRequireAuth } from "@/lib/hooks/use-auth";
import { SystemRole } from "@/types";
import { ProtectedRoute } from "@/components/auth/protected-route";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/shared/ui/Card";
import { Toast, useToast } from "@/components/leaves/Toast";
import { employeeProfileApi } from "@/lib/api/employee-profile/profile";
import type { ProfileChangeRequest } from "@/types";

export default function ChangeRequestsPage() {
  useRequireAuth(SystemRole.DEPARTMENT_EMPLOYEE);
  const { toast, showToast, hideToast } = useToast();
  const [requests, setRequests] = useState<ProfileChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await employeeProfileApi.getMyChangeRequests();
        const data =
          res && typeof res === "object" && "data" in res
            ? (res as any).data
            : res;
        setRequests(Array.isArray(data) ? data : []);
      } catch (error: any) {
        showToast(error.message || "Failed to load requests", "error");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <ProtectedRoute requiredUserType="employee">
      <div className="container mx-auto px-6 py-8">
        <Toast
          message={toast.message}
          type={toast.type}
          isVisible={toast.isVisible}
          onClose={hideToast}
        />
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Change Requests</h1>
          <Link
            href="/dashboard/employee-profile/change-requests/new"
            className="text-blue-600 hover:underline"
          >
            New Request
          </Link>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>My Requests</CardTitle>
            <CardDescription>View submitted requests</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-gray-500">Loading...</p>
            ) : requests.length === 0 ? (
              <p className="text-gray-600">No requests yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 px-3">Request ID</th>
                      <th className="text-left py-2 px-3">Description</th>
                      <th className="text-left py-2 px-3">Status</th>
                      <th className="text-left py-2 px-3">Submitted</th>
                    </tr>
                  </thead>
                  <tbody>
                    {requests.map((r) => (
                      <tr key={r.id} className="border-b border-gray-100">
                        <td className="py-2 px-3 font-mono">
                          {r.requestId || r.id}
                        </td>
                        <td className="py-2 px-3">{r.requestDescription}</td>
                        <td className="py-2 px-3">
                          <span
                            className={`inline-block px-2 py-1 text-xs rounded-full ${
                              r.status === "APPROVED"
                                ? "bg-green-100 text-green-800"
                                : r.status === "REJECTED"
                                ? "bg-red-100 text-red-800"
                                : r.status === "CANCELED"
                                ? "bg-gray-100 text-gray-600"
                                : "bg-yellow-100 text-yellow-800"
                            }`}
                          >
                            {r.status}
                          </span>
                        </td>
                        <td className="py-2 px-3">
                          {r.submittedAt
                            ? new Date(r.submittedAt).toLocaleString()
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  );
}
