"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/hooks/use-auth";
import { useRequireAuth } from "@/lib/hooks/use-auth";
import { SystemRole } from "@/types";
import { timeManagementApi } from "@/lib/api/time-management/time-management.api";
import {
  OvertimeReportResponse,
  ExceptionReportResponse,
  ExportReportResponse,
} from "@/types/time-management";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/shared/ui/Card";
import { Button } from "@/components/shared/ui/Button";
import { Input } from "@/components/shared/ui/Input";
import { Toast, useToast } from "@/components/leaves/Toast";

export default function ReportsPage() {
  const { user } = useAuth();
  useRequireAuth(SystemRole.HR_ADMIN);
  const { toast, showToast, hideToast } = useToast();

  const [activeTab, setActiveTab] = useState<"overtime" | "exception">("overtime");
  const [loading, setLoading] = useState(false);

  // Overtime report
  const [overtimeFilters, setOvertimeFilters] = useState({
    employeeId: "",
    startDate: "",
    endDate: "",
  });
  const [overtimeReport, setOvertimeReport] = useState<OvertimeReportResponse | null>(null);

  // Exception report
  const [exceptionFilters, setExceptionFilters] = useState({
    employeeId: "",
    startDate: "",
    endDate: "",
  });
  const [exceptionReport, setExceptionReport] = useState<ExceptionReportResponse | null>(null);

  // Export loading states
  const [exporting, setExporting] = useState(false);

  // Helper function to download file
  const downloadFile = (content: string, filename: string, contentType: string) => {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Generate overtime report
  const handleGenerateOvertimeReport = async () => {
    try {
      setLoading(true);
      const request: any = {};
      if (overtimeFilters.employeeId) request.employeeId = overtimeFilters.employeeId;
      if (overtimeFilters.startDate) request.startDate = new Date(overtimeFilters.startDate).toISOString();
      if (overtimeFilters.endDate) request.endDate = new Date(overtimeFilters.endDate).toISOString();

      const report = await timeManagementApi.generateOvertimeReport(request);
      setOvertimeReport(report);
      showToast("Overtime report generated successfully!", "success");
    } catch (error: any) {
      showToast(error.message || "Failed to generate overtime report", "error");
    } finally {
      setLoading(false);
    }
  };

  // Generate exception report
  const handleGenerateExceptionReport = async () => {
    try {
      setLoading(true);
      const request: any = {};
      if (exceptionFilters.employeeId) request.employeeId = exceptionFilters.employeeId;
      if (exceptionFilters.startDate) request.startDate = new Date(exceptionFilters.startDate).toISOString();
      if (exceptionFilters.endDate) request.endDate = new Date(exceptionFilters.endDate).toISOString();

      const report = await timeManagementApi.generateExceptionReport(request);
      setExceptionReport(report);
      showToast("Exception report generated successfully!", "success");
    } catch (error: any) {
      showToast(error.message || "Failed to generate exception report", "error");
    } finally {
      setLoading(false);
    }
  };

  // Export report
  const handleExport = async (reportType: "overtime" | "exception", format: "excel" | "csv" | "text") => {
    try {
      setExporting(true);
      const filters = reportType === "overtime" ? overtimeFilters : exceptionFilters;
      
      const request: any = {
        reportType,
        format,
      };
      if (filters.employeeId) request.employeeId = filters.employeeId;
      if (filters.startDate) request.startDate = new Date(filters.startDate).toISOString();
      if (filters.endDate) request.endDate = new Date(filters.endDate).toISOString();

      const exportResult: ExportReportResponse = await timeManagementApi.exportReport(request);
      
      // Determine file extension and content type
      let extension = "";
      let contentType = "";
      if (format === "csv") {
        extension = "csv";
        contentType = "text/csv";
      } else if (format === "text") {
        extension = "txt";
        contentType = "text/plain";
      } else {
        extension = "json"; // Excel format returns JSON
        contentType = "application/json";
      }

      const filename = `${reportType}-report-${new Date().toISOString().split("T")[0]}.${extension}`;
      downloadFile(exportResult.data, filename, contentType);
      showToast(`Report exported successfully as ${format.toUpperCase()}!`, "success");
    } catch (error: any) {
      showToast(error.message || "Failed to export report", "error");
    } finally {
      setExporting(false);
    }
  };

  // Helper to format date
  const formatDate = (date: Date | string | undefined): string => {
    if (!date) return "N/A";
    const d = date instanceof Date ? date : new Date(date);
    return d.toLocaleDateString();
  };

  // Helper to get employee name from record
  const getEmployeeName = (record: any): string => {
    if (record.employeeId?.firstName && record.employeeId?.lastName) {
      return `${record.employeeId.firstName} ${record.employeeId.lastName}`;
    }
    if (record.employeeId?.name) {
      return record.employeeId.name;
    }
    if (record.employeeId?._id) {
      return record.employeeId._id;
    }
    return "Unknown";
  };

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Overtime & Exception Reports</h1>
        <p className="mt-2 text-gray-600">Generate and export overtime and exception attendance reports</p>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex space-x-4 border-b border-gray-200">
        <button
          onClick={() => setActiveTab("overtime")}
          className={`px-4 py-2 font-medium ${
            activeTab === "overtime"
              ? "border-b-2 border-indigo-600 text-indigo-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Overtime Reports
        </button>
        <button
          onClick={() => setActiveTab("exception")}
          className={`px-4 py-2 font-medium ${
            activeTab === "exception"
              ? "border-b-2 border-indigo-600 text-indigo-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Exception Reports
        </button>
      </div>

      {/* Overtime Report Section */}
      {activeTab === "overtime" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Generate Overtime Report</CardTitle>
              <CardDescription>Generate a report of all overtime requests within a date range</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <Input
                  label="Employee ID (Optional)"
                  placeholder="Enter employee ID"
                  value={overtimeFilters.employeeId}
                  onChange={(e) => setOvertimeFilters({ ...overtimeFilters, employeeId: e.target.value })}
                />
                <Input
                  label="Start Date"
                  type="date"
                  value={overtimeFilters.startDate}
                  onChange={(e) => setOvertimeFilters({ ...overtimeFilters, startDate: e.target.value })}
                />
                <Input
                  label="End Date"
                  type="date"
                  value={overtimeFilters.endDate}
                  onChange={(e) => setOvertimeFilters({ ...overtimeFilters, endDate: e.target.value })}
                />
              </div>
              <div className="mt-4 flex space-x-3">
                <Button onClick={handleGenerateOvertimeReport} disabled={loading}>
                  {loading ? "Generating..." : "Generate Report"}
                </Button>
                {overtimeReport && (
                  <>
                    <Button
                      onClick={() => handleExport("overtime", "excel")}
                      disabled={exporting}
                      variant="outline"
                    >
                      Export Excel
                    </Button>
                    <Button
                      onClick={() => handleExport("overtime", "csv")}
                      disabled={exporting}
                      variant="outline"
                    >
                      Export CSV
                    </Button>
                    <Button
                      onClick={() => handleExport("overtime", "text")}
                      disabled={exporting}
                      variant="outline"
                    >
                      Export Text
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Overtime Report Results */}
          {overtimeReport && (
            <Card>
              <CardHeader>
                <CardTitle>Overtime Report Results</CardTitle>
                <CardDescription>
                  Report Period: {formatDate(overtimeReport.startDate)} - {formatDate(overtimeReport.endDate)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="rounded-lg bg-gray-50 p-4">
                    <p className="text-sm text-gray-600">Total Records</p>
                    <p className="text-2xl font-bold text-gray-900">{overtimeReport.summary.totalRecords}</p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-4">
                    <p className="text-sm text-gray-600">Total Overtime Hours</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {overtimeReport.summary.totalOvertimeHours.toFixed(2)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-4">
                    <p className="text-sm text-gray-600">Total Overtime Minutes</p>
                    <p className="text-2xl font-bold text-gray-900">{overtimeReport.summary.totalOvertimeMinutes}</p>
                  </div>
                </div>

                {overtimeReport.records && overtimeReport.records.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                            Employee
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                            Date
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                            Overtime Hours
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 bg-white">
                        {overtimeReport.records.slice(0, 50).map((record: any, index: number) => {
                          const attendance = record.attendanceRecordId;
                          const workMinutes = attendance?.totalWorkMinutes || 0;
                          const overtimeMinutes = Math.max(0, workMinutes - 480);
                          const overtimeHours = (overtimeMinutes / 60).toFixed(2);

                          return (
                            <tr key={index}>
                              <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                                {getEmployeeName(record)}
                              </td>
                              <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                                {formatDate(record.createdAt)}
                              </td>
                              <td className="whitespace-nowrap px-6 py-4 text-sm">
                                <span
                                  className={`inline-flex rounded-full px-2 text-xs font-semibold ${
                                    record.status === "APPROVED"
                                      ? "bg-green-100 text-green-800"
                                      : record.status === "PENDING"
                                        ? "bg-yellow-100 text-yellow-800"
                                        : "bg-red-100 text-red-800"
                                  }`}
                                >
                                  {record.status}
                                </span>
                              </td>
                              <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">{overtimeHours}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    {overtimeReport.records.length > 50 && (
                      <p className="mt-4 text-sm text-gray-500">
                        Showing first 50 of {overtimeReport.records.length} records. Export the full report to see all
                        records.
                      </p>
                    )}
                  </div>
                )}

                {(!overtimeReport.records || overtimeReport.records.length === 0) && (
                  <p className="py-8 text-center text-gray-500">No overtime records found for the selected filters.</p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Exception Report Section */}
      {activeTab === "exception" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Generate Exception Report</CardTitle>
              <CardDescription>Generate a report of all time exceptions within a date range</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <Input
                  label="Employee ID (Optional)"
                  placeholder="Enter employee ID"
                  value={exceptionFilters.employeeId}
                  onChange={(e) => setExceptionFilters({ ...exceptionFilters, employeeId: e.target.value })}
                />
                <Input
                  label="Start Date"
                  type="date"
                  value={exceptionFilters.startDate}
                  onChange={(e) => setExceptionFilters({ ...exceptionFilters, startDate: e.target.value })}
                />
                <Input
                  label="End Date"
                  type="date"
                  value={exceptionFilters.endDate}
                  onChange={(e) => setExceptionFilters({ ...exceptionFilters, endDate: e.target.value })}
                />
              </div>
              <div className="mt-4 flex space-x-3">
                <Button onClick={handleGenerateExceptionReport} disabled={loading}>
                  {loading ? "Generating..." : "Generate Report"}
                </Button>
                {exceptionReport && (
                  <>
                    <Button
                      onClick={() => handleExport("exception", "excel")}
                      disabled={exporting}
                      variant="outline"
                    >
                      Export Excel
                    </Button>
                    <Button
                      onClick={() => handleExport("exception", "csv")}
                      disabled={exporting}
                      variant="outline"
                    >
                      Export CSV
                    </Button>
                    <Button
                      onClick={() => handleExport("exception", "text")}
                      disabled={exporting}
                      variant="outline"
                    >
                      Export Text
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Exception Report Results */}
          {exceptionReport && (
            <Card>
              <CardHeader>
                <CardTitle>Exception Report Results</CardTitle>
                <CardDescription>
                  Report Period: {formatDate(exceptionReport.startDate)} - {formatDate(exceptionReport.endDate)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="rounded-lg bg-gray-50 p-4">
                    <p className="text-sm text-gray-600">Total Records</p>
                    <p className="text-2xl font-bold text-gray-900">{exceptionReport.summary.totalRecords}</p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-4">
                    <p className="text-sm text-gray-600">Exception Types</p>
                    <p className="text-2xl font-bold text-gray-900">{exceptionReport.summary.byType.length}</p>
                  </div>
                </div>

                {/* Exception Types Summary */}
                {exceptionReport.summary.byType && exceptionReport.summary.byType.length > 0 && (
                  <div className="mb-6">
                    <h3 className="mb-3 text-lg font-semibold">Exception Types Summary</h3>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {exceptionReport.summary.byType.map((typeSummary: any, index: number) => (
                        <div key={index} className="rounded-lg bg-gray-50 p-4">
                          <p className="text-sm font-medium text-gray-900">{typeSummary.type}</p>
                          <p className="text-2xl font-bold text-gray-900">{typeSummary.count}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {exceptionReport.records && exceptionReport.records.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                            Employee
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                            Type
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                            Date
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                            Reason
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 bg-white">
                        {exceptionReport.records.slice(0, 50).map((record: any, index: number) => (
                          <tr key={index}>
                            <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                              {getEmployeeName(record)}
                            </td>
                            <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{record.type}</td>
                            <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                              {formatDate(record.createdAt)}
                            </td>
                            <td className="whitespace-nowrap px-6 py-4 text-sm">
                              <span
                                className={`inline-flex rounded-full px-2 text-xs font-semibold ${
                                  record.status === "APPROVED"
                                    ? "bg-green-100 text-green-800"
                                    : record.status === "PENDING" || record.status === "OPEN"
                                      ? "bg-yellow-100 text-yellow-800"
                                      : "bg-red-100 text-red-800"
                                }`}
                              >
                                {record.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500">
                              {record.reason || "N/A"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {exceptionReport.records.length > 50 && (
                      <p className="mt-4 text-sm text-gray-500">
                        Showing first 50 of {exceptionReport.records.length} records. Export the full report to see all
                        records.
                      </p>
                    )}
                  </div>
                )}

                {(!exceptionReport.records || exceptionReport.records.length === 0) && (
                  <p className="py-8 text-center text-gray-500">No exception records found for the selected filters.</p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <Toast message={toast.message} type={toast.type} isVisible={toast.isVisible} onClose={hideToast} />
    </div>
  );
}

