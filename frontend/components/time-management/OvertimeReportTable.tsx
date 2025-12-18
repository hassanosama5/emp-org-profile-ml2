"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/hooks/use-auth";
import { employeeProfileApi } from "@/lib/api/employee-profile/employee-profile";
import { timeManagementApi } from "@/lib/api/time-management/time-management.api";
import { GenerateOvertimeReportRequest, OvertimeReportResponse } from "@/types/time-management";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/shared/ui/Card";
import { Button } from "@/components/shared/ui/Button";
import { Toast, useToast } from "@/components/leaves/Toast";

interface OvertimeReportTableProps {
  employeeId?: string;
  departmentId?: string;
  showTeamOnly?: boolean;
}

export function OvertimeReportTable({
  employeeId,
  departmentId,
  showTeamOnly = false,
}: OvertimeReportTableProps) {
  const { user } = useAuth();
  const { toast, showToast, hideToast } = useToast();
  const [report, setReport] = useState<OvertimeReportResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [teamMemberIds, setTeamMemberIds] = useState<string[]>([]);

  // Load team members if showTeamOnly is true
  useEffect(() => {
    if (showTeamOnly && user?.id) {
      loadTeamMembers();
    }
  }, [showTeamOnly, user?.id]);

  const loadTeamMembers = async () => {
    try {
      const teamMembers = await employeeProfileApi.getMyTeam();
      const ids = teamMembers.map((member: any) => member.id || member._id).filter(Boolean);
      setTeamMemberIds(ids);
    } catch (error: any) {
      console.error("Failed to load team members:", error);
      setTeamMemberIds([]);
    }
  };

  const generateReport = async () => {
    if (!startDate || !endDate) {
      showToast("Please select both start and end dates", "error");
      return;
    }

    try {
      setLoading(true);
      const request: GenerateOvertimeReportRequest = {
        startDate,
        endDate,
        employeeId: showTeamOnly ? user?.id : employeeId,
      };

      const data = await timeManagementApi.generateOvertimeReport(request);
      
      // Filter by team members if showTeamOnly is true
      let filteredData = data;
      if (showTeamOnly && teamMemberIds.length > 0 && data.records) {
        filteredData = {
          ...data,
          records: data.records.filter((record: any) => {
            const recordEmployeeId = typeof record.employeeId === "string"
              ? record.employeeId
              : (record.employeeId as any)?._id || (record.employeeId as any)?.id;
            return teamMemberIds.includes(recordEmployeeId);
          }),
        };
        // Recalculate summary
        if (filteredData.summary) {
          const totalMinutes = filteredData.records.reduce((sum: number, r: any) => {
            return sum + (r.overtimeMinutes || 0);
          }, 0);
          filteredData.summary = {
            totalRecords: filteredData.records.length,
            totalOvertimeMinutes: totalMinutes,
            totalOvertimeHours: Math.round((totalMinutes / 60) * 100) / 100,
          };
        }
      }
      
      setReport(filteredData);
      showToast("Report generated successfully", "success");
    } catch (error: any) {
      console.error("Failed to generate overtime report:", error);
      showToast(error.message || "Failed to generate report", "error");
    } finally {
      setLoading(false);
    }
  };

  const exportReport = async () => {
    if (!report) {
      showToast("Please generate a report first", "error");
      return;
    }

    try {
      const exportData = await timeManagementApi.exportReport({
        reportType: "overtime",
        format: "excel",
        startDate,
        endDate,
        employeeId: showTeamOnly ? user?.id : employeeId,
      });

      // Create download link
      if ((exportData as any).downloadUrl) {
        window.open((exportData as any).downloadUrl, "_blank");
      } else if (exportData.data) {
        // Handle base64 data
        const link = document.createElement("a");
        link.href = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${exportData.data}`;
        link.download = `overtime_report_${startDate}_${endDate}.xlsx`;
        link.click();
      }
      showToast("Report exported successfully", "success");
    } catch (error: any) {
      showToast(error.message || "Failed to export report", "error");
    }
  };

  return (
    <div>
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
      />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Generate Overtime Report</CardTitle>
          <CardDescription>
            {showTeamOnly
              ? "Generate overtime report for your team"
              : "Generate overtime and exception reports"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Date *
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Date *
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={generateReport}
              disabled={loading || !startDate || !endDate}
              variant="primary"
            >
              {loading ? "Generating..." : "Generate Report"}
            </Button>
            {report && (
              <Button onClick={exportReport} variant="outline">
                Export Report
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {report && (
        <Card>
          <CardHeader>
            <CardTitle>Overtime Report</CardTitle>
            <CardDescription>
              Period: {new Date(startDate).toLocaleDateString()} -{" "}
              {new Date(endDate).toLocaleDateString()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {report.summary && (
              <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Total Overtime Hours</p>
                  <p className="text-2xl font-bold text-green-900">
                    {report.summary.totalOvertimeHours?.toFixed(2) || 0}
                  </p>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Total Exceptions</p>
                  <p className="text-2xl font-bold text-orange-900">
                    {report.summary.totalRecords || 0}
                  </p>
                </div>
              </div>
            )}

            {report.records && report.records.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Employee</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Date</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Overtime Hours</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Type</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.records.map((record: any, index: number) => (
                      <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4">
                          {record.employeeName || record.employeeId || "N/A"}
                        </td>
                        <td className="py-3 px-4">
                          {record.date
                            ? new Date(record.date).toLocaleDateString()
                            : "N/A"}
                        </td>
                        <td className="py-3 px-4">
                          {record.overtimeHours?.toFixed(2) || 0}
                        </td>
                        <td className="py-3 px-4">{record.type || "N/A"}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              record.status === "APPROVED"
                                ? "bg-green-100 text-green-800"
                                : record.status === "PENDING"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {record.status || "N/A"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">No overtime records found for this period</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

