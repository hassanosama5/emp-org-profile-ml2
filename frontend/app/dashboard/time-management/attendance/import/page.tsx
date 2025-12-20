"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/hooks/use-auth";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { SystemRole } from "@/types";
import { timeManagementApi } from "@/lib/api/time-management/time-management.api";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/shared/ui/Card";
import { Toast, useToast } from "@/components/leaves/Toast";
import Link from "next/link";

export default function AttendanceImportPage() {
  const { user, loading: authLoading } = useAuth();
  const { toast, showToast, hideToast } = useToast();

  const [csvText, setCsvText] = useState<string>("");
  const [excelData, setExcelData] = useState<string>(""); // base64 encoded Excel
  const [selectedFileType, setSelectedFileType] = useState<'csv' | 'excel' | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any | null>(null);

  // Debug: Check user roles
  useEffect(() => {
    if (!authLoading && user) {
      console.log("User roles:", user.roles);
      console.log("SystemRole.HR_ADMIN:", SystemRole.HR_ADMIN);
      console.log("Has HR_ADMIN:", user?.roles?.includes(SystemRole.HR_ADMIN));
      console.log("Has HR_MANAGER:", user?.roles?.includes(SystemRole.HR_MANAGER));
      console.log("Has SYSTEM_ADMIN:", user?.roles?.includes(SystemRole.SYSTEM_ADMIN));
    }
  }, [user, authLoading]);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setSelectedFileName(file.name);
    const fileExtension = file.name.split('.').pop()?.toLowerCase();

    if (fileExtension === 'csv') {
      // Handle CSV file
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        setCsvText(text || "");
        setExcelData("");
        setSelectedFileType('csv');
      };
      reader.readAsText(file);
    } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
      // Handle Excel file - read as base64
      const reader = new FileReader();
      reader.onload = (e) => {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        const base64 = btoa(
          new Uint8Array(arrayBuffer).reduce(
            (data, byte) => data + String.fromCharCode(byte),
            ''
          )
        );
        setExcelData(base64);
        setCsvText("");
        setSelectedFileType('excel');
      };
      reader.readAsArrayBuffer(file);
    } else {
      showToast("Please select a CSV or Excel file (.csv, .xlsx, .xls)", "error");
      setSelectedFileType(null);
      setSelectedFileName("");
    }
  };

  const handleImport = async () => {
    if (selectedFileType === 'csv') {
      if (!csvText.trim()) {
        showToast("Please select or paste a CSV file first.", "error");
        return;
      }
      try {
        setLoading(true);
        setResult(null);
        const response = await timeManagementApi.importAttendanceFromCsv(csvText);
        setResult(response);
        showToast("Attendance CSV imported successfully.", "success");
      } catch (error: any) {
        console.error("Failed to import attendance CSV:", error);
        showToast(error?.message || "Failed to import attendance CSV", "error");
      } finally {
        setLoading(false);
      }
    } else if (selectedFileType === 'excel') {
      if (!excelData) {
        showToast("Please select an Excel file first.", "error");
        return;
      }
      try {
        setLoading(true);
        setResult(null);
        const response = await timeManagementApi.importAttendanceFromExcel(excelData);
        setResult(response);
        showToast("Attendance Excel imported successfully.", "success");
      } catch (error: any) {
        console.error("Failed to import attendance Excel:", error);
        showToast(error?.message || "Failed to import attendance Excel", "error");
      } finally {
        setLoading(false);
      }
    } else if (csvText.trim()) {
      // Fallback: if user pasted text directly without selecting a file
      try {
        setLoading(true);
        setResult(null);
        const response = await timeManagementApi.importAttendanceFromCsv(csvText);
        setResult(response);
        showToast("Attendance data imported successfully.", "success");
      } catch (error: any) {
        console.error("Failed to import attendance:", error);
        showToast(error?.message || "Failed to import attendance", "error");
      } finally {
        setLoading(false);
      }
    } else {
      showToast("Please select a file or paste CSV content.", "error");
    }
  };

  const sampleCsv = [
    // Recommended punch-row format:
    "employeeId,punchType,time",
    "692b5a9ac70f3bc6a4753441,IN,2025-12-15T08:55:00Z",
    "692b5a9ac70f3bc6a4753441,OUT,2025-12-15T17:05:00Z",
    // Missed punch example (missing OUT) => will be flagged as missed punch:
    "692b5a9ac70f3bc6a4753441,IN,2025-12-16T09:02:00Z",
  ].join("\n");

  const canImport =
    user?.roles?.includes("HR Admin") ||
    user?.roles?.includes("HR Manager") ||
    user?.roles?.includes("System Admin") ||
    user?.roles?.includes("department employee") ||
    user?.roles?.includes(SystemRole.HR_ADMIN) ||
    user?.roles?.includes(SystemRole.HR_MANAGER) ||
    user?.roles?.includes(SystemRole.SYSTEM_ADMIN) ||
    user?.roles?.includes(SystemRole.DEPARTMENT_EMPLOYEE);

  return (
    <ProtectedRoute allowedRoles={[SystemRole.HR_ADMIN, SystemRole.HR_MANAGER, SystemRole.SYSTEM_ADMIN, SystemRole.DEPARTMENT_EMPLOYEE]}>
      <div className="container mx-auto px-6 py-8">
        <Toast
          message={toast.message}
          type={toast.type}
          isVisible={toast.isVisible}
          onClose={hideToast}
        />

        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Import Attendance</h1>
            <p className="text-gray-600 mt-1">
              Upload attendance data from CSV or Excel files (.csv, .xlsx, .xls)
            </p>
          </div>
          <Link
            href="/dashboard/time-management"
            className="text-blue-600 hover:underline font-medium"
          >
            ← Back to Time Management
          </Link>
        </div>

        {!canImport && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700">
              You do not have permission to import attendance data. Please contact HR if you need access.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Upload File</CardTitle>
              <CardDescription>Select a CSV or Excel file, or paste CSV content below.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select File (CSV or Excel)
                </label>
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                  onChange={handleFileChange}
                  className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer focus:outline-none"
                />
                {selectedFileName && (
                  <p className="mt-2 text-sm text-green-600">
                    ✓ Selected: {selectedFileName} ({selectedFileType === 'excel' ? 'Excel' : 'CSV'})
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Or paste CSV content
                </label>
                <textarea
                  value={csvText}
                  onChange={(e) => {
                    setCsvText(e.target.value);
                    if (e.target.value.trim()) {
                      setSelectedFileType('csv');
                      setSelectedFileName('');
                      setExcelData('');
                    }
                  }}
                  rows={10}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono"
                  placeholder={sampleCsv}
                />
                <p className="mt-1 text-xs text-gray-500">
                  Recommended columns: <code>employeeId</code>, <code>punchType</code> (IN/OUT),{" "}
                  <code>time</code>. (Legacy also supported: <code>employeeId</code>,{" "}
                  <code>clockInTime</code>, optional <code>clockOutTime</code>.)
                </p>
              </div>

              <button
                type="button"
                disabled={!canImport || loading}
                onClick={handleImport}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed text-sm font-medium"
              >
                {loading ? "Importing..." : "Import Attendance"}
              </button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Import Result</CardTitle>
              <CardDescription>
                Summary of processed rows and any missed punches detected.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!result ? (
                <div className="text-sm text-gray-500">
                  No import has been run yet. After importing, you will see a summary here including
                  how many rows were processed and how many missed punches were flagged.
                </div>
              ) : (
                <div className="space-y-4 text-sm">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Summary</h3>
                    <ul className="list-disc list-inside text-gray-700">
                      <li>Processed rows: {result.summary?.processed ?? 0}</li>
                      <li>Created records: {result.summary?.created ?? 0}</li>
                      <li>Updated records: {result.summary?.updated ?? 0}</li>
                      <li>Missed punches flagged: {result.summary?.missedPunches ?? 0}</li>
                      {(result.summary?.leaveConflicts ?? 0) > 0 && (
                        <li className="text-orange-600 font-semibold">
                          Leave conflicts detected: {result.summary.leaveConflicts}
                        </li>
                      )}
                      <li>Errors: {result.summary?.errorCount ?? 0}</li>
                    </ul>
                  </div>

                  {Array.isArray(result.errors) && result.errors.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-1">Errors</h3>
                      <div className="max-h-40 overflow-auto border border-gray-200 rounded-md p-2 bg-gray-50">
                        <ul className="space-y-1">
                          {result.errors.map((err: any, idx: number) => (
                            <li key={idx} className="text-xs text-red-700">
                              Line {err.line}: {err.error}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  );
}


