"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/hooks/use-auth";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/shared/ui/Card";
import { Button } from "@/components/shared/ui/Button";
import { Toast, useToast } from "@/components/leaves/Toast";

interface LatenessRecord {
  employeeId: string;
  employeeName: string;
  date: Date | string;
  expectedTime: string;
  actualTime: string;
  lateByMinutes: number;
  shiftName?: string;
}

interface RepeatedLatenessAlert {
  employeeId: string;
  employeeName: string;
  departmentName?: string;
  occurrenceCount: number;
  period: string;
  lastOccurrence: Date | string;
  severity: "LOW" | "MEDIUM" | "HIGH";
}

export function LatenessReport() {
  const { user } = useAuth();
  const { toast, showToast, hideToast } = useToast();
  const [latenessRecords, setLatenessRecords] = useState<LatenessRecord[]>([]);
  const [repeatedAlerts, setRepeatedAlerts] = useState<RepeatedLatenessAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    loadLatenessData();
  }, [startDate, endDate, user?.id]);

  const loadLatenessData = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      // Note: These endpoints need to be implemented in the backend
      // For now, using mock data structure
      // const records = await timeManagementApi.getLatenessRecords({ startDate, endDate });
      // const alerts = await timeManagementApi.getRepeatedLateness();
      
      // Mock data structure - replace with actual API calls
      setLatenessRecords([]);
      setRepeatedAlerts([]);
    } catch (error: any) {
      console.error("Failed to load lateness data:", error);
      showToast(error.message || "Failed to load lateness data", "error");
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "HIGH":
        return "bg-red-100 text-red-800 border-red-200";
      case "MEDIUM":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "LOW":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
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
          <CardTitle>Date Range Filter</CardTitle>
          <CardDescription>Filter lateness records by date range</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>
          <div className="mt-4">
            <Button onClick={loadLatenessData} variant="outline">
              Apply Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Repeated Lateness Alerts */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Repeated Lateness Alerts</CardTitle>
          <CardDescription>
            Employees with multiple lateness occurrences requiring attention
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Loading alerts...</p>
            </div>
          ) : repeatedAlerts.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No repeated lateness alerts</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Employee</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Occurrences</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Period</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Last Occurrence</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Severity</th>
                  </tr>
                </thead>
                <tbody>
                  {repeatedAlerts.map((alert, index) => (
                    <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">{alert.employeeName}</td>
                      <td className="py-3 px-4">{alert.occurrenceCount}</td>
                      <td className="py-3 px-4">{alert.period}</td>
                      <td className="py-3 px-4">
                        {new Date(alert.lastOccurrence).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium border ${getSeverityColor(
                            alert.severity
                          )}`}
                        >
                          {alert.severity}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lateness Records */}
      <Card>
        <CardHeader>
          <CardTitle>Lateness Logs</CardTitle>
          <CardDescription>Detailed lateness records</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Loading records...</p>
            </div>
          ) : latenessRecords.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No lateness records found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Employee</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Date</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Expected</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Actual</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Late By</th>
                  </tr>
                </thead>
                <tbody>
                  {latenessRecords.map((record, index) => (
                    <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">{record.employeeName}</td>
                      <td className="py-3 px-4">
                        {new Date(record.date).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">{record.expectedTime}</td>
                      <td className="py-3 px-4">{record.actualTime}</td>
                      <td className="py-3 px-4">{record.lateByMinutes} minutes</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

