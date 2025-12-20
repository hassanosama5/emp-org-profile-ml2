"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/hooks/use-auth";
import { useRequireAuth } from "@/lib/hooks/use-auth";
import { SystemRole } from "@/types";
import { payslipsApi } from "@/lib/api/payroll-tracking/payroll-tracking";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/shared/ui/Card";
import { Button } from "@/components/shared/ui/Button";
import { useRouter } from "next/navigation";
// Dynamic import for PDF generation to avoid SSR issues

interface PayslipSummary {
  payslipId: string;
  payrollPeriod?: {
    _id: string;
    runId: string;
    payrollPeriod: string;
  };
  grossSalary: number;
  deductions: number;
  netPay: number;
}

interface AnnualStatement {
  totalGrossSalary: number;
  totalDeductions: number;
  totalNetPay: number;
  totalTaxes: number;
  payslips: PayslipSummary[];
}

interface TaxDocumentsData {
  employeeId: string;
  year: number;
  annualStatement: AnnualStatement;
}

export default function TaxDocumentsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [taxDocumentsData, setTaxDocumentsData] = useState<TaxDocumentsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  // Allow employees, payroll specialists, payroll managers, finance staff, and system admins
  // All authenticated users can view their own tax documents (all roles are employees)
  // No need for restrictive useRequireAuth

  useEffect(() => {
    const fetchTaxDocuments = async () => {
      // For staff roles (Payroll Specialist, Payroll Manager, Finance Staff), they might not have an employee ID
      const isStaff = user?.roles?.some(
        (role) =>
          role === SystemRole.PAYROLL_SPECIALIST ||
          role === SystemRole.PAYROLL_MANAGER ||
          role === SystemRole.FINANCE_STAFF ||
          role === SystemRole.SYSTEM_ADMIN
      );

      if (!user?.id && !user?.userId) {
        if (isStaff) {
          // Staff members might not have employee profiles - show empty state
          setTaxDocumentsData(null);
          setLoading(false);
          return;
        }
        setError("User ID not found");
        setLoading(false);
        return;
      }

      try {
        const employeeId = user.id || user.userId;
        const data = await payslipsApi.getTaxDocuments(employeeId!, selectedYear);
        setTaxDocumentsData(data);
      } catch (err: any) {
        // If error is 403 and user is staff, show empty state instead of error
        if (isStaff && err.message?.includes('403')) {
          setTaxDocumentsData(null);
        } else {
          setError(err.message || "Failed to load tax documents");
        }
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchTaxDocuments();
    }
  }, [user, selectedYear]);

  const formatCurrency = (amount?: number) => {
    if (amount === null || amount === undefined) return "N/A";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  const formatMonthYear = (dateString?: string) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
      });
    } catch {
      return dateString;
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    if (!taxDocumentsData) return;

    try {
      // Dynamically import jsPDF
      const jsPDFModule = await import("jspdf") as any;
      const jsPDF = jsPDFModule.default;
      const doc = new jsPDF();
      const { annualStatement, year } = taxDocumentsData;
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    let yPos = margin;

    // Helper function to format currency
    const formatCurrencyForPDF = (amount: number) => {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(amount);
    };

    // Helper function to format month/year
    const formatMonthYearForPDF = (dateString?: string) => {
      if (!dateString) return "N/A";
      try {
        const date = new Date(dateString);
        return date.toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
        });
      } catch {
        return dateString;
      }
    };

    // Title
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("Annual Tax Statement", pageWidth / 2, yPos, { align: "center" });
    yPos += 10;

    // Tax Year
    doc.setFontSize(14);
    doc.setFont("helvetica", "normal");
    doc.text(`Tax Year ${year}`, pageWidth / 2, yPos, { align: "center" });
    yPos += 8;

    // Generated Date
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(
      `Generated on ${new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })}`,
      pageWidth / 2,
      yPos,
      { align: "center" }
    );
    yPos += 15;
    doc.setTextColor(0, 0, 0);

    // Annual Summary Section
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Annual Summary", margin, yPos);
    yPos += 10;

    // Summary boxes
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const boxWidth = (pageWidth - 2 * margin - 10) / 2;
    const boxHeight = 25;

    // Top row
    doc.rect(margin, yPos, boxWidth, boxHeight);
    doc.text("Total Gross Salary", margin + 5, yPos + 7);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(formatCurrencyForPDF(annualStatement.totalGrossSalary), margin + 5, yPos + 15);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.rect(margin + boxWidth + 10, yPos, boxWidth, boxHeight);
    doc.text("Total Taxes Paid", margin + boxWidth + 15, yPos + 7);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(220, 38, 38);
    doc.text(formatCurrencyForPDF(annualStatement.totalTaxes), margin + boxWidth + 15, yPos + 15);
    doc.setTextColor(0, 0, 0);

    yPos += boxHeight + 10;

    // Bottom row
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.rect(margin, yPos, boxWidth, boxHeight);
    doc.text("Total Deductions", margin + 5, yPos + 7);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(220, 38, 38);
    doc.text(formatCurrencyForPDF(annualStatement.totalDeductions), margin + 5, yPos + 15);
    doc.setTextColor(0, 0, 0);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.rect(margin + boxWidth + 10, yPos, boxWidth, boxHeight);
    doc.text("Total Net Pay", margin + boxWidth + 15, yPos + 7);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(34, 197, 94);
    doc.text(formatCurrencyForPDF(annualStatement.totalNetPay), margin + boxWidth + 15, yPos + 15);
    doc.setTextColor(0, 0, 0);

    yPos += boxHeight + 15;

    // Monthly Breakdown Section
    if (annualStatement.payslips.length > 0) {
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Monthly Breakdown", margin, yPos);
      yPos += 10;

      // Table configuration
      const colWidths = [60, 40, 40, 40];
      const colXPositions = [
        margin,
        margin + colWidths[0],
        margin + colWidths[0] + colWidths[1],
        margin + colWidths[0] + colWidths[1] + colWidths[2],
      ];
      const rowHeight = 8;
      const headerY = yPos;

      // Draw table header
      doc.setFillColor(100, 100, 100);
      doc.rect(margin, headerY, pageWidth - 2 * margin, rowHeight, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("Period", colXPositions[0] + 2, headerY + 5);
      doc.text("Gross Salary", colXPositions[1] + 2, headerY + 5, { align: "right" });
      doc.text("Deductions", colXPositions[2] + 2, headerY + 5, { align: "right" });
      doc.text("Net Pay", colXPositions[3] + 2, headerY + 5, { align: "right" });

      // Draw table rows
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "normal");
      let currentY = headerY + rowHeight;

      annualStatement.payslips.forEach((payslip, index) => {
        // Alternate row background
        if (index % 2 === 0) {
          doc.setFillColor(245, 245, 245);
          doc.rect(margin, currentY, pageWidth - 2 * margin, rowHeight, "F");
        }

        // Draw cell borders
        doc.setDrawColor(200, 200, 200);
        doc.line(margin, currentY, pageWidth - margin, currentY);
        doc.line(colXPositions[1], currentY, colXPositions[1], currentY + rowHeight);
        doc.line(colXPositions[2], currentY, colXPositions[2], currentY + rowHeight);
        doc.line(colXPositions[3], currentY, colXPositions[3], currentY + rowHeight);

        // Draw cell content
        doc.setFontSize(9);
        const period = payslip.payrollPeriod?.payrollPeriod
          ? formatMonthYearForPDF(payslip.payrollPeriod.payrollPeriod)
          : "N/A";
        doc.text(period, colXPositions[0] + 2, currentY + 5);
        doc.text(formatCurrencyForPDF(payslip.grossSalary), colXPositions[1] + 2, currentY + 5, {
          align: "right",
        });
        doc.setTextColor(220, 38, 38);
        doc.text(formatCurrencyForPDF(payslip.deductions), colXPositions[2] + 2, currentY + 5, {
          align: "right",
        });
        doc.setTextColor(34, 197, 94);
        doc.text(formatCurrencyForPDF(payslip.netPay), colXPositions[3] + 2, currentY + 5, {
          align: "right",
        });
        doc.setTextColor(0, 0, 0);

        currentY += rowHeight;
      });

      // Draw total row
      const totalY = currentY;
      doc.setFillColor(240, 240, 240);
      doc.rect(margin, totalY, pageWidth - 2 * margin, rowHeight, "F");
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, totalY, pageWidth - margin, totalY);
      doc.line(colXPositions[1], totalY, colXPositions[1], totalY + rowHeight);
      doc.line(colXPositions[2], totalY, colXPositions[2], totalY + rowHeight);
      doc.line(colXPositions[3], totalY, colXPositions[3], totalY + rowHeight);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0);
      doc.text("Total", colXPositions[0] + 2, totalY + 5);
      doc.text(formatCurrencyForPDF(annualStatement.totalGrossSalary), colXPositions[1] + 2, totalY + 5, {
        align: "right",
      });
      doc.setTextColor(220, 38, 38);
      doc.text(formatCurrencyForPDF(annualStatement.totalDeductions), colXPositions[2] + 2, totalY + 5, {
        align: "right",
      });
      doc.setTextColor(34, 197, 94);
      doc.text(formatCurrencyForPDF(annualStatement.totalNetPay), colXPositions[3] + 2, totalY + 5, {
        align: "right",
      });
      doc.setTextColor(0, 0, 0);
    }

    // Footer note
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(100, 100, 100);
    doc.text(
      "This document is generated for tax purposes. Please retain this document for your records.",
      pageWidth / 2,
      pageHeight - 20,
      { align: "center", maxWidth: pageWidth - 2 * margin }
    );
    doc.text(
      "If you have any questions, please contact your HR department or payroll specialist.",
      pageWidth / 2,
      pageHeight - 15,
      { align: "center", maxWidth: pageWidth - 2 * margin }
    );

      // Save the PDF
      doc.save(`Annual_Tax_Statement_${year}.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Failed to generate PDF. Please try again or use the Print button.");
    }
  };

  // Generate available years (current year and past 5 years)
  const currentYear = new Date().getFullYear();
  const availableYears = Array.from({ length: 6 }, (_, i) => currentYear - i);

  if (loading) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading tax documents...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-6 py-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-red-600 mb-4">{error}</p>
              <div className="flex gap-2 justify-center">
                <Button onClick={() => window.location.reload()}>Retry</Button>
                <Button variant="outline" onClick={() => router.push("/dashboard/payroll-tracking")}>
                  Back to Payroll
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!taxDocumentsData) {
    return (
      <div className="container mx-auto px-6 py-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-gray-500 mb-4">No tax documents available</p>
              <Button onClick={() => router.push("/dashboard/payroll-tracking")}>
                Back to Payroll
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { annualStatement } = taxDocumentsData;

  return (
    <div className="container mx-auto px-6 py-8">
      {/* Header with year selector and actions - hidden when printing */}
      <div className="mb-6 flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Tax Documents</h1>
          <p className="text-gray-600 mt-1">
            As an Employee, download tax documents (e.g., annual tax statement) so you can use them for official purposes.
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {availableYears.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
          <Button onClick={handleDownloadPDF} variant="outline">
            Download PDF
          </Button>
          <Button onClick={handlePrint} variant="outline">
            Print
          </Button>
          <Button variant="outline" onClick={() => router.push("/dashboard/payroll-tracking")}>
            Back
          </Button>
        </div>
      </div>

      {/* Tax Document - Printable Format */}
      <div className="bg-white print:shadow-none">
        <Card className="mb-6 print:border-none print:shadow-none">
          <CardHeader className="print:pb-4">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Annual Tax Statement
              </h2>
              <p className="text-lg text-gray-600">Tax Year {taxDocumentsData.year}</p>
              <p className="text-sm text-gray-500 mt-2">
                Generated on {new Date().toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
          </CardHeader>
          <CardContent>
            {/* Annual Summary */}
            <div className="mb-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-4 border-b pb-2">
                Annual Summary
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 border border-gray-200 rounded">
                  <p className="text-sm text-gray-500 mb-1">Total Gross Salary</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(annualStatement.totalGrossSalary)}
                  </p>
                </div>
                <div className="p-4 bg-gray-50 border border-gray-200 rounded">
                  <p className="text-sm text-gray-500 mb-1">Total Taxes Paid</p>
                  <p className="text-2xl font-bold text-red-600">
                    {formatCurrency(annualStatement.totalTaxes)}
                  </p>
                </div>
                <div className="p-4 bg-gray-50 border border-gray-200 rounded">
                  <p className="text-sm text-gray-500 mb-1">Total Deductions</p>
                  <p className="text-2xl font-bold text-red-600">
                    {formatCurrency(annualStatement.totalDeductions)}
                  </p>
                </div>
                <div className="p-4 bg-gray-50 border border-gray-200 rounded">
                  <p className="text-sm text-gray-500 mb-1">Total Net Pay</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(annualStatement.totalNetPay)}
                  </p>
                </div>
              </div>
            </div>

            {/* Monthly Breakdown */}
            {annualStatement.payslips.length > 0 && (
              <div className="mb-8">
                <h3 className="text-xl font-semibold text-gray-900 mb-4 border-b pb-2">
                  Monthly Breakdown
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-700">
                          Period
                        </th>
                        <th className="border border-gray-300 px-4 py-3 text-right text-sm font-semibold text-gray-700">
                          Gross Salary
                        </th>
                        <th className="border border-gray-300 px-4 py-3 text-right text-sm font-semibold text-gray-700">
                          Deductions
                        </th>
                        <th className="border border-gray-300 px-4 py-3 text-right text-sm font-semibold text-gray-700">
                          Net Pay
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {annualStatement.payslips.map((payslip, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="border border-gray-300 px-4 py-3 text-sm text-gray-900">
                            {payslip.payrollPeriod?.payrollPeriod
                              ? formatMonthYear(payslip.payrollPeriod.payrollPeriod)
                              : "N/A"}
                          </td>
                          <td className="border border-gray-300 px-4 py-3 text-sm text-right font-medium text-gray-900">
                            {formatCurrency(payslip.grossSalary)}
                          </td>
                          <td className="border border-gray-300 px-4 py-3 text-sm text-right font-medium text-red-600">
                            {formatCurrency(payslip.deductions)}
                          </td>
                          <td className="border border-gray-300 px-4 py-3 text-sm text-right font-bold text-green-600">
                            {formatCurrency(payslip.netPay)}
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-gray-100 font-bold">
                        <td className="border border-gray-300 px-4 py-3 text-sm text-gray-900">
                          Total
                        </td>
                        <td className="border border-gray-300 px-4 py-3 text-sm text-right text-gray-900">
                          {formatCurrency(annualStatement.totalGrossSalary)}
                        </td>
                        <td className="border border-gray-300 px-4 py-3 text-sm text-right text-red-600">
                          {formatCurrency(annualStatement.totalDeductions)}
                        </td>
                        <td className="border border-gray-300 px-4 py-3 text-sm text-right text-green-600">
                          {formatCurrency(annualStatement.totalNetPay)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Footer Note */}
            <div className="mt-8 pt-6 border-t border-gray-300">
              <p className="text-xs text-gray-500 text-center">
                This document is generated for tax purposes. Please retain this document for your records.
                If you have any questions, please contact your HR department or payroll specialist.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Information Card - hidden when printing */}
      <Card className="mt-6 bg-blue-50 border-blue-200 print:hidden">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <span className="text-xl">ℹ️</span>
            <div>
              <p className="font-semibold text-blue-900 mb-1">Using Tax Documents for Official Purposes</p>
              <p className="text-sm text-blue-800 mb-3">
                Your annual tax statement is an official document that can be used for tax filing and other official purposes. It includes:
              </p>
              <ul className="text-sm text-blue-800 list-disc list-inside space-y-1 mb-3">
                <li>
                  <strong>Total Gross Salary:</strong> Your total earnings before any deductions - required for tax filing.
                </li>
                <li>
                  <strong>Total Taxes Paid:</strong> All tax deductions for the year (income tax, social security, etc.) - needed for tax returns.
                </li>
                <li>
                  <strong>Total Deductions:</strong> All deductions including taxes, insurance, penalties, etc. - for complete tax documentation.
                </li>
                <li>
                  <strong>Total Net Pay:</strong> Your take-home pay after all deductions - for income verification.
                </li>
                <li>
                  <strong>Monthly Breakdown:</strong> Detailed breakdown by payroll period - provides month-by-month documentation.
                </li>
              </ul>
              <p className="text-sm text-blue-800">
                <strong>Download & Print:</strong> You can download this document as a PDF using the "Download PDF" button, 
                or print it directly using the "Print" button. The downloaded PDF is formatted for official use and can be 
                submitted to tax authorities, used for loan applications, or other official purposes. The document includes 
                all necessary information for tax filing and official verification.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body {
            background: white;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:border-none {
            border: none !important;
          }
          .print\\:shadow-none {
            box-shadow: none !important;
          }
          .print\\:pb-4 {
            padding-bottom: 1rem !important;
          }
        }
      `}</style>
    </div>
  );
}

