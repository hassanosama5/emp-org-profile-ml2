"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/use-auth";
import { useRequireAuth } from "@/lib/hooks/use-auth";
import { SystemRole } from "@/types";
import { payrollExecutionApi } from "@/lib/api/payroll-execution/payroll-execution";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/shared/ui/Card";
import { Button } from "@/components/shared/ui/Button";
import { Input } from "@/components/shared/ui/Input";
import { FileText, Search, Download, Eye, RefreshCw } from "lucide-react";
import Link from "next/link";

interface Payslip {
  _id: string;
  employeeId: any;
  payrollRunId: any;
  earningsDetails: {
    baseSalary: number;
    allowances?: any[];
    bonuses?: any[];
    benefits?: any[];
    refunds?: any[];
  };
  deductionsDetails: {
    taxes: any[];
    insurances?: any[];
    penalties?: any;
  };
  totalGrossSalary: number;
  totaDeductions: number;
  netPay: number;
  paymentStatus: string;
  createdAt: string;
  updatedAt: string;
}

export default function PayslipsPage() {
  const router = useRouter();
  const { user } = useAuth();
  useRequireAuth(SystemRole.PAYROLL_SPECIALIST);

  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    payrollRunId: "",
    employeeId: "",
    paymentStatus: "",
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
  });

  useEffect(() => {
    fetchPayslips();
  }, [pagination.page, filters]);

  const fetchPayslips = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('[Payslips Page] Fetching payslips with filters:', {
        ...filters,
        page: pagination.page,
        limit: pagination.limit,
      });
      
      const response = await payrollExecutionApi.getAllPayslips({
        ...filters,
        page: pagination.page,
        limit: pagination.limit,
      });
      
      console.log('[Payslips Page] API Response:', {
        dataCount: response.data?.length || 0,
        total: response.total || 0,
        page: response.page || 0,
        limit: response.limit || 0,
        firstPayslip: response.data?.[0] || null,
      });
      
      setPayslips(response.data || []);
      setPagination((prev) => ({
        ...prev,
        total: response.total || 0,
      }));
      
      if (response.data && response.data.length === 0 && response.total === 0) {
        console.warn('[Payslips Page] No payslips found in database. This could mean:');
        console.warn('1. Payslips were not saved successfully');
        console.warn('2. Payslips are in a different collection');
        console.warn('3. Database connection issue');
      }
    } catch (err: any) {
      console.error('[Payslips Page] Error fetching payslips:', err);
      setError(err.message || "Failed to load payslips");
    } finally {
      setLoading(false);
    }
  };

  const filteredPayslips = payslips.filter((payslip) => {
    const employeeName = payslip.employeeId
      ? `${payslip.employeeId.firstName || ""} ${payslip.employeeId.lastName || ""}`.toLowerCase()
      : "";
    const employeeId = payslip.employeeId?.employeeId?.toLowerCase() || "";
    const searchLower = searchTerm.toLowerCase();
    
    return (
      employeeName.includes(searchLower) ||
      employeeId.includes(searchLower) ||
      payslip._id.toLowerCase().includes(searchLower)
    );
  });

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Payslip Management
        </h1>
        <p className="text-gray-600">
          View and manage all generated employee payslips. Payslips are automatically generated and distributed after Finance approval (REQ-PY-15) and Payroll Manager lock (REQ-PY-7). Payment status is set to "Paid" since we don't handle bank system integration.
        </p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-800">{error}</p>
          <Button
            onClick={fetchPayslips}
            variant="outline"
            size="sm"
            className="mt-2"
          >
            Retry
          </Button>
        </div>
      )}

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Filter payslips by various criteria</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  type="text"
                  placeholder="Search by employee name or ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payroll Run ID
              </label>
              <Input
                type="text"
                placeholder="Filter by payroll run..."
                value={filters.payrollRunId}
                onChange={(e) =>
                  setFilters({ ...filters, payrollRunId: e.target.value })
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Employee ID
              </label>
              <Input
                type="text"
                placeholder="Filter by employee..."
                value={filters.employeeId}
                onChange={(e) =>
                  setFilters({ ...filters, employeeId: e.target.value })
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Status
              </label>
              <select
                value={filters.paymentStatus}
                onChange={(e) =>
                  setFilters({ ...filters, paymentStatus: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
              </select>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <Button onClick={fetchPayslips}>Apply Filters</Button>
            <Button
              variant="outline"
              onClick={() => {
                setFilters({ payrollRunId: "", employeeId: "", paymentStatus: "" });
                setSearchTerm("");
                fetchPayslips();
              }}
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Payslips List */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Generated Payslips</CardTitle>
              <CardDescription>
                {pagination.total} total payslips found
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={fetchPayslips}
                variant="outline"
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Link href="/dashboard/payroll-execution/payslips/generate">
                <Button>Generate New Payslips</Button>
              </Link>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Loading payslips...</p>
            </div>
          ) : filteredPayslips.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-500 mb-2">No payslips found</p>
              {payslips.length === 0 && pagination.total === 0 && (
                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md text-left max-w-2xl mx-auto">
                  <p className="text-sm font-semibold text-yellow-800 mb-2">Troubleshooting:</p>
                  <ul className="text-sm text-yellow-700 list-disc list-inside space-y-1 mb-2">
                    <li>Payslips are automatically generated after Finance approval and Payroll Manager lock</li>
                    <li>If you just generated payslips, wait a few seconds and click "Refresh"</li>
                    <li>Check the browser console for detailed debug information</li>
                    <li>Verify the payroll run status is "locked" and payment status is "paid"</li>
                    <li>Check backend logs for payslip generation errors</li>
                  </ul>
                  <p className="text-sm text-yellow-700 mt-2">
                    <strong>Note:</strong> If payslips were generated successfully but don't appear here, there may be a database query issue. Check the console logs for details.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">
                        Employee
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">
                        Payroll Run
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">
                        Gross Salary
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">
                        Deductions
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">
                        Net Pay
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">
                        Generated
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredPayslips.map((payslip) => (
                      <tr key={payslip._id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div>
                            <div className="font-medium text-gray-900">
                              {payslip.employeeId
                                ? `${payslip.employeeId.firstName || ""} ${payslip.employeeId.lastName || ""}`
                                : "N/A"}
                            </div>
                            <div className="text-xs text-gray-500">
                              {payslip.employeeId?.employeeId || "N/A"}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm text-gray-900">
                            {payslip.payrollRunId?.runId || "N/A"}
                          </div>
                          <div className="text-xs text-gray-500">
                            {payslip.payrollRunId?.payrollPeriod
                              ? formatDate(payslip.payrollRunId.payrollPeriod)
                              : "N/A"}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-900">
                          {formatCurrency(payslip.totalGrossSalary)}
                        </td>
                        <td className="px-4 py-3 text-gray-900">
                          {formatCurrency(payslip.totaDeductions)}
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-semibold text-green-600">
                            {formatCurrency(payslip.netPay)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-1 text-xs rounded-full ${
                              payslip.paymentStatus === "paid"
                                ? "bg-green-100 text-green-700"
                                : "bg-yellow-100 text-yellow-700"
                            }`}
                          >
                            {payslip.paymentStatus || "pending"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {formatDate(payslip.createdAt)}
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            href={`/dashboard/payroll-execution/payslips/${payslip._id}`}
                          >
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination.total > pagination.limit && (
                <div className="mt-4 flex justify-between items-center">
                  <div className="text-sm text-gray-500">
                    Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
                    {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
                    {pagination.total} payslips
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      disabled={pagination.page === 1}
                      onClick={() =>
                        setPagination({ ...pagination, page: pagination.page - 1 })
                      }
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      disabled={
                        pagination.page * pagination.limit >= pagination.total
                      }
                      onClick={() =>
                        setPagination({ ...pagination, page: pagination.page + 1 })
                      }
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

