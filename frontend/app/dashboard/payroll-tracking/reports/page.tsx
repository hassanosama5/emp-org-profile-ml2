"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useRequireAuth } from "@/lib/hooks/use-auth";
import { SystemRole } from "@/types";
import { payslipsApi } from "@/lib/api/payroll-tracking/payroll-tracking";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/shared/ui/Card";
import { Button } from "@/components/shared/ui/Button";

type ReportType = "taxes" | "insurance" | "benefits";
type SummaryType = "month" | "year";

export default function FinanceReportsPage() {
  useRequireAuth(SystemRole.FINANCE_STAFF);
  const router = useRouter();

  const [reportType, setReportType] = useState<ReportType>("taxes");
  const [period, setPeriod] = useState("2025");
  const [range, setRange] = useState({ from: "", to: "" });
  const [summaryType, setSummaryType] = useState<SummaryType>("month");
  const [month, setMonth] = useState("02"); // default February for example
  const [reportData, setReportData] = useState<any>(null);
  const [summaryData, setSummaryData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exportFormat, setExportFormat] = useState<"csv" | "pdf">("csv");

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setReportData(null);
    
    try {
      // Convert report type to match backend expectations
      // Backend expects: taxes, insurance, or benefits
      const periodType: "month" | "year" = range.from && range.to ? "month" : "year";
      const date = range.from && range.to ? range.from : `${period}-01-01`;
      
      const data = await payslipsApi.getTaxInsuranceBenefitsReport(periodType, date);
      setReportData(data);
    } catch (err: any) {
      setError(err.message || "Failed to generate report");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!reportData) {
      setError("Please generate a report first before downloading");
      return;
    }

    setDownloading(true);
    setError(null);

    try {
      const periodType: "month" | "year" = range.from && range.to ? "month" : "year";
      const date = range.from && range.to ? range.from : `${period}-01-01`;
      
      let blob: Blob;
      let filename: string;
      
      if (exportFormat === "csv") {
        blob = await payslipsApi.exportTaxInsuranceBenefitsReportAsCSV(periodType, date);
        filename = `tax-insurance-benefits-report-${periodType}-${date}.csv`;
      } else {
        blob = await payslipsApi.exportTaxInsuranceBenefitsReportAsPDF(periodType, date);
        filename = `tax-insurance-benefits-report-${periodType}-${date}.pdf`;
      }

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      setError(err.message || "Failed to download report");
    } finally {
      setDownloading(false);
    }
  };

  const handleGenerateSummary = async () => {
    setLoading(true);
    setError(null);
    setSummaryData(null);
    
    try {
      const periodType: "month" | "year" = summaryType;
      const date = summaryType === "month" 
        ? `${period}-${month}-01`
        : `${period}-01-01`;
      
      const data = await payslipsApi.getPayrollSummary(periodType, date);
      setSummaryData(data);
    } catch (err: any) {
      setError(err.message || "Failed to generate summary");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadSummary = async () => {
    if (!summaryData) {
      setError("Please generate a summary first before downloading");
      return;
    }

    setDownloading(true);
    setError(null);

    try {
      const periodType: "month" | "year" = summaryType;
      const date = summaryType === "month" 
        ? `${period}-${month}-01`
        : `${period}-01-01`;
      
      let blob: Blob;
      let filename: string;
      
      if (exportFormat === "csv") {
        blob = await payslipsApi.exportPayrollSummaryAsCSV(periodType, date);
        filename = `payroll-summary-${periodType}-${date}.csv`;
      } else {
        blob = await payslipsApi.exportPayrollSummaryAsPDF(periodType, date);
        filename = `payroll-summary-${periodType}-${date}.pdf`;
      }

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      setError(err.message || "Failed to download summary");
    } finally {
      setDownloading(false);
    }
  };

  const formatCurrency = (amount: number | undefined | null): string => {
    if (amount === null || amount === undefined) return "$0.00";
    return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateString: string | Date | undefined): string => {
    if (!dateString) return "N/A";
    try {
      const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return "N/A";
    }
  };

  const renderDescription = () => {
    switch (reportType) {
      case "taxes":
        return "Summaries of income tax, social contributions, and withholding for compliance.";
      case "insurance":
        return "Employee/employer insurance contributions and brackets for the selected period.";
      case "benefits":
        return "Allowances and benefits paid (transportation, bonuses, encashment) for audit and accounting.";
      default:
        return "";
    }
  };

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Finance Reports</h1>
          <p className="text-gray-600 mt-1">
            As Finance Staff, generate reports about taxes, insurance contributions, and benefits, so that accounting books are compliant. Also generate month-end and year-end payroll summaries, so that audits and reporting are simplified.
          </p>
        </div>
        <Button variant="outline" onClick={() => router.push("/dashboard/finance")}>
          Back to Finance Dashboard
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Report Type</CardTitle>
            <CardDescription>Select which section to focus on in the comprehensive report</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-xs text-gray-600 mb-2">
              The report includes taxes, insurance contributions, and benefits. Select a type to focus on specific sections.
            </p>
            <div className="flex flex-col gap-2">
              <Button
                variant={reportType === "taxes" ? "primary" : "outline"}
                onClick={() => setReportType("taxes")}
                className="justify-start"
              >
                📊 Taxes & Withholding
              </Button>
              <Button
                variant={reportType === "insurance" ? "primary" : "outline"}
                onClick={() => setReportType("insurance")}
                className="justify-start"
              >
                🛡️ Insurance Contributions
              </Button>
              <Button
                variant={reportType === "benefits" ? "primary" : "outline"}
                onClick={() => setReportType("benefits")}
                className="justify-start"
              >
                🎁 Benefits & Allowances
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Period</CardTitle>
            <CardDescription>Select year or payroll period</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {["2025", "2024", "2023"].map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">From (optional)</label>
                <input
                  type="date"
                  value={range.from}
                  onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">To (optional)</label>
                <input
                  type="date"
                  value={range.to}
                  onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <p className="text-xs text-gray-500">
              If no dates are selected, the full year report for the selected year will be generated.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
            <CardDescription>Generate or download the report</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-gray-600 mb-2">{renderDescription()}</p>
            <p className="text-xs text-gray-500">
              <strong>Note:</strong> The generated report includes all three sections (taxes, insurance contributions, and benefits) to ensure accounting books are compliant.
            </p>
            <div className="space-y-2">
              <div className="flex gap-2">
                <Button onClick={handleGenerate} className="flex-1" disabled={loading}>
                  {loading ? "Generating..." : "Generate"}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleDownload} 
                  className="flex-1" 
                  disabled={!reportData || downloading}
                >
                  {downloading ? "Downloading..." : "Download"}
                </Button>
              </div>
              {reportData && (
                <div className="flex gap-2 items-center">
                  <label className="text-xs text-gray-600">Format:</label>
                  <select
                    value={exportFormat}
                    onChange={(e) => setExportFormat(e.target.value as "csv" | "pdf")}
                    className="text-xs px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="csv">CSV</option>
                    <option value="pdf">PDF</option>
                  </select>
                </div>
              )}
            </div>
            {error && (
              <p className="text-xs text-red-600 mt-2">{error}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Payroll Summaries (Month-end / Year-end) */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Payroll Summaries</CardTitle>
          <CardDescription>
            As Finance Staff, generate month-end and year-end payroll summaries, so that audits and reporting are simplified.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-3">
            <p className="text-sm font-medium text-gray-700">Summary Type</p>
            <div className="flex flex-col gap-2">
              <Button
                variant={summaryType === "month" ? "primary" : "outline"}
                className="justify-start"
                onClick={() => setSummaryType("month")}
              >
                📅 Month-end Summary
              </Button>
              <Button
                variant={summaryType === "year" ? "primary" : "outline"}
                className="justify-start"
                onClick={() => setSummaryType("year")}
              >
                🗓️ Year-end Summary
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium text-gray-700">Period</p>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Year</label>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {["2025", "2024", "2023"].map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            {summaryType === "month" && (
              <div>
                <label className="block text-sm text-gray-600 mb-1">Month</label>
                <select
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {[
                    ["01", "January"],
                    ["02", "February"],
                    ["03", "March"],
                    ["04", "April"],
                    ["05", "May"],
                    ["06", "June"],
                    ["07", "July"],
                    ["08", "August"],
                    ["09", "September"],
                    ["10", "October"],
                    ["11", "November"],
                    ["12", "December"],
                  ].map(([val, label]) => (
                    <option key={val} value={val}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium text-gray-700">Actions</p>
            <p className="text-sm text-gray-600">
              Summaries of payroll totals, taxes, deductions, contributions, and benefits for audits.
            </p>
            <div className="space-y-2">
              <div className="flex gap-2">
                <Button className="flex-1" onClick={handleGenerateSummary} disabled={loading}>
                  {loading ? "Generating..." : "Generate Summary"}
                </Button>
                <Button 
                  variant="outline" 
                  className="flex-1" 
                  onClick={handleDownloadSummary} 
                  disabled={!summaryData || downloading}
                >
                  {downloading ? "Downloading..." : "Download"}
                </Button>
              </div>
              {summaryData && (
                <div className="flex gap-2 items-center">
                  <label className="text-xs text-gray-600">Format:</label>
                  <select
                    value={exportFormat}
                    onChange={(e) => setExportFormat(e.target.value as "csv" | "pdf")}
                    className="text-xs px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="csv">CSV</option>
                    <option value="pdf">PDF</option>
                  </select>
                </div>
              )}
            </div>
            {error && (
              <p className="text-xs text-red-600 mt-2">{error}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Report Results */}
      {reportData && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Tax, Insurance & Benefits Report</CardTitle>
            <CardDescription>
              Comprehensive report including taxes, insurance contributions, and benefits for accounting compliance. 
              Period: {reportData.period === "month" ? "Month" : "Year"} | 
              {reportData.startDate && ` From: ${formatDate(reportData.startDate)}`}
              {reportData.endDate && ` To: ${formatDate(reportData.endDate)}`}
              {reportData.department && ` | Department: ${reportData.department.name}`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Summary */}
            {reportData.summary && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Summary</h3>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-300">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="border border-gray-300 px-4 py-2 text-left">Metric</th>
                        <th className="border border-gray-300 px-4 py-2 text-right">Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-gray-300 px-4 py-2">Total Employees</td>
                        <td className="border border-gray-300 px-4 py-2 text-right font-semibold">
                          {reportData.summary.totalEmployees || 0}
                        </td>
                      </tr>
                      <tr>
                        <td className="border border-gray-300 px-4 py-2">Total Payslips</td>
                        <td className="border border-gray-300 px-4 py-2 text-right font-semibold">
                          {reportData.summary.totalPayslips || 0}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Tax Breakdown */}
            {reportData.taxes && reportData.taxes.breakdown && Object.keys(reportData.taxes.breakdown).length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Tax Breakdown</h3>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-300">
                    <thead className="bg-red-50">
                      <tr>
                        <th className="border border-gray-300 px-4 py-2 text-left">Tax Name</th>
                        <th className="border border-gray-300 px-4 py-2 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(reportData.taxes.breakdown).map(([taxName, amount]: [string, any]) => (
                        <tr key={taxName}>
                          <td className="border border-gray-300 px-4 py-2">{taxName}</td>
                          <td className="border border-gray-300 px-4 py-2 text-right">
                            {formatCurrency(amount)}
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-red-100 font-semibold">
                        <td className="border border-gray-300 px-4 py-2">Total Taxes</td>
                          <td className="border border-gray-300 px-4 py-2 text-right">
                            {formatCurrency(reportData.taxes.total)}
                          </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Insurance Breakdown */}
            {reportData.insurance && reportData.insurance.breakdown && Object.keys(reportData.insurance.breakdown).length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Insurance Breakdown</h3>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-300">
                    <thead className="bg-blue-50">
                      <tr>
                        <th className="border border-gray-300 px-4 py-2 text-left">Insurance Type</th>
                        <th className="border border-gray-300 px-4 py-2 text-right">Employee Contribution</th>
                        <th className="border border-gray-300 px-4 py-2 text-right">Employer Contribution</th>
                        <th className="border border-gray-300 px-4 py-2 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(reportData.insurance.breakdown).map(([insuranceName, details]: [string, any]) => {
                        const employee = details.employee || 0;
                        const employer = details.employer || 0;
                        const total = employee + employer;
                        return (
                          <tr key={insuranceName}>
                            <td className="border border-gray-300 px-4 py-2">{insuranceName}</td>
                            <td className="border border-gray-300 px-4 py-2 text-right">
                              {formatCurrency(employee)}
                            </td>
                            <td className="border border-gray-300 px-4 py-2 text-right">
                              {formatCurrency(employer)}
                            </td>
                            <td className="border border-gray-300 px-4 py-2 text-right">
                              {formatCurrency(total)}
                            </td>
                          </tr>
                        );
                      })}
                      <tr className="bg-blue-100 font-semibold">
                        <td className="border border-gray-300 px-4 py-2" colSpan={3}>Total Employee Contributions</td>
                        <td className="border border-gray-300 px-4 py-2 text-right">
                          {formatCurrency(reportData.insurance.totalEmployeeContributions)}
                        </td>
                      </tr>
                      <tr className="bg-blue-100 font-semibold">
                        <td className="border border-gray-300 px-4 py-2" colSpan={3}>Total Employer Contributions</td>
                        <td className="border border-gray-300 px-4 py-2 text-right">
                          {formatCurrency(reportData.insurance.totalEmployerContributions)}
                        </td>
                      </tr>
                      <tr className="bg-blue-200 font-bold">
                        <td className="border border-gray-300 px-4 py-2" colSpan={3}>Total Insurance</td>
                        <td className="border border-gray-300 px-4 py-2 text-right">
                          {formatCurrency(reportData.insurance.total)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Benefits */}
            {reportData.benefits && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Benefits</h3>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-300">
                    <thead className="bg-green-50">
                      <tr>
                        <th className="border border-gray-300 px-4 py-2 text-left">Category</th>
                        <th className="border border-gray-300 px-4 py-2 text-right">Total Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-gray-300 px-4 py-2">Total Benefits</td>
                        <td className="border border-gray-300 px-4 py-2 text-right font-semibold">
                          {formatCurrency(reportData.benefits.total)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Department Breakdown */}
            {reportData.departmentBreakdown && reportData.departmentBreakdown.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Department Breakdown</h3>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-300">
                    <thead className="bg-purple-50">
                      <tr>
                        <th className="border border-gray-300 px-4 py-2 text-left">Department</th>
                        <th className="border border-gray-300 px-4 py-2 text-right">Employees</th>
                        <th className="border border-gray-300 px-4 py-2 text-right">Total Taxes</th>
                        <th className="border border-gray-300 px-4 py-2 text-right">Total Insurance</th>
                        <th className="border border-gray-300 px-4 py-2 text-right">Total Benefits</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.departmentBreakdown.map((dept: any, idx: number) => (
                        <tr key={idx}>
                          <td className="border border-gray-300 px-4 py-2">{dept.department?.name || 'Unassigned'}</td>
                          <td className="border border-gray-300 px-4 py-2 text-right">{dept.employeeCount || 0}</td>
                          <td className="border border-gray-300 px-4 py-2 text-right">
                            {formatCurrency(dept.taxes?.total)}
                          </td>
                          <td className="border border-gray-300 px-4 py-2 text-right">
                            {formatCurrency(dept.insurance?.total)}
                          </td>
                          <td className="border border-gray-300 px-4 py-2 text-right">
                            {formatCurrency(dept.benefits?.total)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Summary Results */}
      {summaryData && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{summaryType === "month" ? "Month-End" : "Year-End"} Payroll Summary</CardTitle>
            <CardDescription>
              Period: {summaryData.period === "month" ? "Month" : "Year"} | 
              {summaryData.startDate && ` From: ${formatDate(summaryData.startDate)}`}
              {summaryData.endDate && ` To: ${formatDate(summaryData.endDate)}`}
              {summaryData.department && ` | Department: ${summaryData.department.name}`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Summary Statistics */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Summary Statistics</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <p className="text-sm text-gray-600 mb-1">Total Payroll Runs</p>
                  <p className="text-2xl font-bold text-blue-700">{summaryData.totalPayrollRuns || 0}</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <p className="text-sm text-gray-600 mb-1">Total Employees</p>
                  <p className="text-2xl font-bold text-green-700">{summaryData.totalEmployees || 0}</p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                  <p className="text-sm text-gray-600 mb-1">Total Gross Salary</p>
                  <p className="text-xl font-bold text-purple-700">
                    {formatCurrency(summaryData.totalGrossSalary)}
                  </p>
                </div>
                <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                  <p className="text-sm text-gray-600 mb-1">Total Deductions</p>
                  <p className="text-xl font-bold text-red-700">
                    {formatCurrency(summaryData.totalDeductions)}
                  </p>
                </div>
              </div>
              <div className="mt-4 bg-indigo-50 p-4 rounded-lg border border-indigo-200">
                <p className="text-sm text-gray-600 mb-1">Total Net Pay</p>
                <p className="text-3xl font-bold text-indigo-700">
                  {formatCurrency(summaryData.totalNetPay)}
                </p>
              </div>
            </div>

            {/* Department Breakdown */}
            {summaryData.departmentBreakdown && summaryData.departmentBreakdown.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Department Breakdown</h3>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-300">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="border border-gray-300 px-4 py-2 text-left">Department</th>
                        <th className="border border-gray-300 px-4 py-2 text-right">Employees</th>
                        <th className="border border-gray-300 px-4 py-2 text-right">Total Gross Salary</th>
                        <th className="border border-gray-300 px-4 py-2 text-right">Total Deductions</th>
                        <th className="border border-gray-300 px-4 py-2 text-right">Total Net Pay</th>
                        <th className="border border-gray-300 px-4 py-2 text-right">Avg. Gross Salary</th>
                        <th className="border border-gray-300 px-4 py-2 text-right">Avg. Net Pay</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summaryData.departmentBreakdown.map((dept: any, idx: number) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="border border-gray-300 px-4 py-2 font-medium">
                            {dept.department?.name || 'Unassigned'}
                          </td>
                          <td className="border border-gray-300 px-4 py-2 text-right">
                            {dept.employeeCount || 0}
                          </td>
                          <td className="border border-gray-300 px-4 py-2 text-right">
                            {formatCurrency(dept.totalGrossSalary)}
                          </td>
                          <td className="border border-gray-300 px-4 py-2 text-right">
                            {formatCurrency(dept.totalDeductions)}
                          </td>
                          <td className="border border-gray-300 px-4 py-2 text-right font-semibold">
                            {formatCurrency(dept.totalNetPay)}
                          </td>
                          <td className="border border-gray-300 px-4 py-2 text-right text-sm text-gray-600">
                            {formatCurrency(dept.averageGrossSalary)}
                          </td>
                          <td className="border border-gray-300 px-4 py-2 text-right text-sm text-gray-600">
                            {formatCurrency(dept.averageNetPay)}
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-gray-100 font-bold">
                        <td className="border border-gray-300 px-4 py-2">TOTAL</td>
                        <td className="border border-gray-300 px-4 py-2 text-right">
                          {summaryData.departmentBreakdown.reduce((sum: number, dept: any) => sum + (dept.employeeCount || 0), 0)}
                        </td>
                        <td className="border border-gray-300 px-4 py-2 text-right">
                          {formatCurrency(summaryData.totalGrossSalary)}
                        </td>
                        <td className="border border-gray-300 px-4 py-2 text-right">
                          {formatCurrency(summaryData.totalDeductions)}
                        </td>
                        <td className="border border-gray-300 px-4 py-2 text-right">
                          {formatCurrency(summaryData.totalNetPay)}
                        </td>
                        <td className="border border-gray-300 px-4 py-2 text-right" colSpan={2}>-</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Payroll Runs */}
            {summaryData.payrollRuns && summaryData.payrollRuns.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Payroll Runs</h3>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-300">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="border border-gray-300 px-4 py-2 text-left">Run ID</th>
                        <th className="border border-gray-300 px-4 py-2 text-left">Payroll Period</th>
                        <th className="border border-gray-300 px-4 py-2 text-right">Employees</th>
                        <th className="border border-gray-300 px-4 py-2 text-right">Total Net Pay</th>
                        <th className="border border-gray-300 px-4 py-2 text-center">Status</th>
                        <th className="border border-gray-300 px-4 py-2 text-center">Payment Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summaryData.payrollRuns.map((run: any, idx: number) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="border border-gray-300 px-4 py-2 font-mono text-sm">{run.runId || 'N/A'}</td>
                          <td className="border border-gray-300 px-4 py-2">
                            {run.payrollPeriod ? new Date(run.payrollPeriod).toLocaleDateString() : 'N/A'}
                          </td>
                          <td className="border border-gray-300 px-4 py-2 text-right">{run.employees || 0}</td>
                          <td className="border border-gray-300 px-4 py-2 text-right">
                            {formatCurrency(run.totalNetPay)}
                          </td>
                          <td className="border border-gray-300 px-4 py-2 text-center">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              run.status === 'FINALIZED' ? 'bg-green-100 text-green-800' :
                              run.status === 'APPROVED' ? 'bg-blue-100 text-blue-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {run.status || 'N/A'}
                            </span>
                          </td>
                          <td className="border border-gray-300 px-4 py-2 text-center">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              run.paymentStatus === 'PAID' ? 'bg-green-100 text-green-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {run.paymentStatus || 'N/A'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Report Preview</CardTitle>
          <CardDescription>Key fields expected in the generated report</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes (optional)
            </label>
            <textarea
              placeholder="Add any specific instructions or clarifications for this report..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              rows={3}
            />
          </div>
          <table className="w-full text-sm border border-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-3 py-2 border-b border-gray-200">Field</th>
                <th className="text-left px-3 py-2 border-b border-gray-200">Description</th>
              </tr>
            </thead>
            <tbody>
              {reportType === "taxes" && (
                <>
                  <tr>
                    <td className="px-3 py-2 border-b border-gray-100">Employee</td>
                    <td className="px-3 py-2 border-b border-gray-100">Name, number, department</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 border-b border-gray-100">Period</td>
                    <td className="px-3 py-2 border-b border-gray-100">Payroll period or date range</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 border-b border-gray-100">Tax Rules</td>
                    <td className="px-3 py-2 border-b border-gray-100">Tax name, rate, basis, law/reference</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 border-b border-gray-100">Amounts</td>
                    <td className="px-3 py-2 border-b border-gray-100">Taxable income, withheld, total taxes</td>
                  </tr>
                </>
              )}
              {reportType === "insurance" && (
                <>
                  <tr>
                    <td className="px-3 py-2 border-b border-gray-100">Employee</td>
                    <td className="px-3 py-2 border-b border-gray-100">Name, number, department</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 border-b border-gray-100">Insurance</td>
                    <td className="px-3 py-2 border-b border-gray-100">Plan/Bracket, coverage type</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 border-b border-gray-100">Contributions</td>
                    <td className="px-3 py-2 border-b border-gray-100">Employee vs Employer amounts</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 border-b border-gray-100">Totals</td>
                    <td className="px-3 py-2 border-b border-gray-100">Aggregate contributions per period</td>
                  </tr>
                </>
              )}
              {reportType === "benefits" && (
                <>
                  <tr>
                    <td className="px-3 py-2 border-b border-gray-100">Employee</td>
                    <td className="px-3 py-2 border-b border-gray-100">Name, number, department</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 border-b border-gray-100">Benefit Type</td>
                    <td className="px-3 py-2 border-b border-gray-100">Transportation, allowances, bonuses, encashment</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 border-b border-gray-100">Amounts</td>
                    <td className="px-3 py-2 border-b border-gray-100">Benefit amount and totals per period</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 border-b border-gray-100">Notes</td>
                    <td className="px-3 py-2 border-b border-gray-100">Approvals and references</td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

