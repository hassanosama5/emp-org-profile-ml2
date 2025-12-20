"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/lib/hooks/use-auth";
import { useRequireAuth } from "@/lib/hooks/use-auth";
import { SystemRole } from "@/types";
import { payrollExecutionApi } from "@/lib/api/payroll-execution/payroll-execution";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/shared/ui/Card";
import { Button } from "@/components/shared/ui/Button";
import { ArrowLeft, FileText, Download, Printer } from "lucide-react";
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

export default function PayslipDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  useRequireAuth(SystemRole.PAYROLL_SPECIALIST);

  const payslipId = params.payslipId as string;
  const [payslip, setPayslip] = useState<Payslip | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (payslipId) {
      fetchPayslip();
    }
  }, [payslipId]);

  const fetchPayslip = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await payrollExecutionApi.getPayslipById(payslipId);
      setPayslip(data);
    } catch (err: any) {
      setError(err.message || "Failed to load payslip");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const handlePrint = () => {
    window.print();
  };

  const generatePDFContent = (payslip: Payslip): string => {
    const employeeName = payslip.employeeId
      ? `${payslip.employeeId.firstName || ""} ${payslip.employeeId.lastName || ""}`
      : "N/A";
    const employeeId = payslip.employeeId?.employeeId || "N/A";
    const payrollRunId = payslip.payrollRunId?.runId || "N/A";
    const period = payslip.payrollRunId?.payrollPeriod
      ? formatDate(payslip.payrollRunId.payrollPeriod)
      : "N/A";

    let allowancesHtml = "";
    if (payslip.earningsDetails.allowances && payslip.earningsDetails.allowances.length > 0) {
      payslip.earningsDetails.allowances.forEach((allowance: any) => {
        allowancesHtml += `<tr><td style="padding: 8px; border-bottom: 1px solid #eee;">${allowance.name || "Allowance"}</td><td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${formatCurrency(allowance.amount || 0)}</td></tr>`;
      });
    }

    let bonusesHtml = "";
    if (payslip.earningsDetails.bonuses && payslip.earningsDetails.bonuses.length > 0) {
      payslip.earningsDetails.bonuses.forEach((bonus: any) => {
        bonusesHtml += `<tr><td style="padding: 8px; border-bottom: 1px solid #eee;">${bonus.name || "Bonus"}</td><td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${formatCurrency(bonus.amount || 0)}</td></tr>`;
      });
    }

    let taxesHtml = "";
    if (payslip.deductionsDetails.taxes && payslip.deductionsDetails.taxes.length > 0) {
      payslip.deductionsDetails.taxes.forEach((tax: any) => {
        const taxAmount = (payslip.earningsDetails.baseSalary * (tax.percentage || 0)) / 100;
        taxesHtml += `<tr><td style="padding: 8px; border-bottom: 1px solid #eee;">${tax.name || "Tax"} (${tax.percentage || 0}%)</td><td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${formatCurrency(taxAmount)}</td></tr>`;
      });
    }

    let insuranceHtml = "";
    if (payslip.deductionsDetails.insurances && payslip.deductionsDetails.insurances.length > 0) {
      payslip.deductionsDetails.insurances.forEach((insurance: any) => {
        const insuranceAmount = (payslip.earningsDetails.baseSalary * (insurance.percentage || 0)) / 100;
        insuranceHtml += `<tr><td style="padding: 8px; border-bottom: 1px solid #eee;">${insurance.name || "Insurance"} (${insurance.percentage || 0}%)</td><td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${formatCurrency(insuranceAmount)}</td></tr>`;
      });
    }

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Payslip - ${employeeName}</title>
          <style>
            @media print {
              @page {
                size: A4;
                margin: 20mm;
              }
              body {
                margin: 0;
                padding: 0;
              }
            }
            body {
              font-family: Arial, sans-serif;
              max-width: 800px;
              margin: 0 auto;
              padding: 20px;
              color: #333;
            }
            .header {
              text-align: center;
              border-bottom: 3px solid #2563eb;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            .header h1 {
              color: #2563eb;
              margin: 0;
              font-size: 28px;
            }
            .section {
              margin-bottom: 30px;
            }
            .section-title {
              font-size: 18px;
              font-weight: bold;
              color: #1f2937;
              margin-bottom: 15px;
              padding-bottom: 5px;
              border-bottom: 2px solid #e5e7eb;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
            }
            th {
              background-color: #f3f4f6;
              padding: 10px;
              text-align: left;
              font-weight: bold;
              border-bottom: 2px solid #d1d5db;
            }
            td {
              padding: 8px;
              border-bottom: 1px solid #e5e7eb;
            }
            .total-row {
              font-weight: bold;
              font-size: 16px;
              background-color: #f9fafb;
              border-top: 2px solid #d1d5db;
            }
            .net-pay {
              font-size: 24px;
              color: #059669;
              font-weight: bold;
            }
            .info-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 15px;
              margin-bottom: 20px;
            }
            .info-item {
              padding: 10px;
              background-color: #f9fafb;
              border-radius: 4px;
            }
            .info-label {
              font-size: 12px;
              color: #6b7280;
              margin-bottom: 5px;
            }
            .info-value {
              font-size: 14px;
              font-weight: bold;
              color: #1f2937;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>PAYSLIP</h1>
            <p style="margin: 5px 0; color: #6b7280;">Payroll Run: ${payrollRunId}</p>
            <p style="margin: 5px 0; color: #6b7280;">Period: ${period}</p>
          </div>

          <div class="section">
            <div class="section-title">Employee Information</div>
            <div class="info-grid">
              <div class="info-item">
                <div class="info-label">Employee Name</div>
                <div class="info-value">${employeeName}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Employee ID</div>
                <div class="info-value">${employeeId}</div>
              </div>
            </div>
          </div>

          <div class="section">
            <div class="section-title" style="color: #059669;">Earnings</div>
            <table>
              <tr>
                <th>Description</th>
                <th style="text-align: right;">Amount</th>
              </tr>
              <tr>
                <td>Base Salary</td>
                <td style="text-align: right;">${formatCurrency(payslip.earningsDetails.baseSalary)}</td>
              </tr>
              ${allowancesHtml}
              ${bonusesHtml}
              <tr class="total-row">
                <td>Total Gross Salary</td>
                <td style="text-align: right; color: #059669;">${formatCurrency(payslip.totalGrossSalary)}</td>
              </tr>
            </table>
          </div>

          <div class="section">
            <div class="section-title" style="color: #dc2626;">Deductions</div>
            <table>
              <tr>
                <th>Description</th>
                <th style="text-align: right;">Amount</th>
              </tr>
              ${taxesHtml}
              ${insuranceHtml}
              <tr class="total-row">
                <td>Total Deductions</td>
                <td style="text-align: right; color: #dc2626;">${formatCurrency(payslip.totaDeductions)}</td>
              </tr>
            </table>
          </div>

          <div class="section">
            <div class="section-title" style="color: #2563eb;">Net Pay Summary</div>
            <table>
              <tr>
                <td>Gross Salary</td>
                <td style="text-align: right;">${formatCurrency(payslip.totalGrossSalary)}</td>
              </tr>
              <tr>
                <td>Total Deductions</td>
                <td style="text-align: right; color: #dc2626;">-${formatCurrency(payslip.totaDeductions)}</td>
              </tr>
              <tr class="total-row">
                <td class="net-pay">Net Pay</td>
                <td class="net-pay" style="text-align: right;">${formatCurrency(payslip.netPay)}</td>
              </tr>
            </table>
          </div>

          <div style="margin-top: 40px; padding-top: 20px; border-top: 2px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 12px;">
            <p>Generated on ${formatDate(payslip.createdAt)}</p>
            <p>This is a system-generated payslip. For questions, please contact HR.</p>
          </div>
        </body>
      </html>
    `;
  };

  const handleDownloadPDF = async () => {
    if (!payslip) return;

    try {
      // Dynamically import jsPDF to avoid SSR issues
      const jsPDFModule = await import("jspdf") as any;
      const jsPDF = jsPDFModule.default;
      const doc = new jsPDF();

      const employeeName = payslip.employeeId
        ? `${payslip.employeeId.firstName || ""} ${payslip.employeeId.lastName || ""}`
        : "N/A";
      const employeeId = payslip.employeeId?.employeeId || "N/A";
      const payrollRunId = payslip.payrollRunId?.runId || "N/A";
      const period = payslip.payrollRunId?.payrollPeriod
        ? formatDate(payslip.payrollRunId.payrollPeriod)
        : "N/A";

      // Set font
      doc.setFont("helvetica");

      // Header
      doc.setFontSize(20);
      doc.setTextColor(37, 99, 235); // Blue color
      doc.text("PAYSLIP", 105, 20, { align: "center" });

      doc.setFontSize(10);
      doc.setTextColor(107, 114, 128); // Gray color
      doc.text(`Payroll Run: ${payrollRunId}`, 105, 28, { align: "center" });
      doc.text(`Period: ${period}`, 105, 33, { align: "center" });

      let yPos = 45;

      // Employee Information
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "bold");
      doc.text("Employee Information", 20, yPos);
      yPos += 8;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(`Employee Name: ${employeeName}`, 20, yPos);
      yPos += 6;
      doc.text(`Employee ID: ${employeeId}`, 20, yPos);
      yPos += 10;

      // Earnings Section
      doc.setFont("helvetica", "bold");
      doc.setTextColor(5, 150, 105); // Green color
      doc.text("Earnings", 20, yPos);
      yPos += 8;

      doc.setFont("helvetica", "normal");
      doc.setTextColor(0, 0, 0);
      doc.text(`Base Salary: ${formatCurrency(payslip.earningsDetails.baseSalary)}`, 20, yPos);
      yPos += 6;

      if (payslip.earningsDetails.allowances && payslip.earningsDetails.allowances.length > 0) {
        doc.text("Allowances:", 20, yPos);
        yPos += 6;
        payslip.earningsDetails.allowances.forEach((allowance: any) => {
          doc.text(`  ${allowance.name || "Allowance"}: ${formatCurrency(allowance.amount || 0)}`, 25, yPos);
          yPos += 6;
        });
      }

      if (payslip.earningsDetails.bonuses && payslip.earningsDetails.bonuses.length > 0) {
        payslip.earningsDetails.bonuses.forEach((bonus: any) => {
          doc.text(`  Bonus: ${formatCurrency(bonus.amount || 0)}`, 25, yPos);
          yPos += 6;
        });
      }

      doc.setFont("helvetica", "bold");
      doc.text(`Total Gross Salary: ${formatCurrency(payslip.totalGrossSalary)}`, 20, yPos);
      yPos += 10;

      // Deductions Section
      doc.setFont("helvetica", "bold");
      doc.setTextColor(220, 38, 38); // Red color
      doc.text("Deductions", 20, yPos);
      yPos += 8;

      doc.setFont("helvetica", "normal");
      doc.setTextColor(0, 0, 0);

      if (payslip.deductionsDetails.taxes && payslip.deductionsDetails.taxes.length > 0) {
        payslip.deductionsDetails.taxes.forEach((tax: any) => {
          const taxAmount = (payslip.earningsDetails.baseSalary * (tax.percentage || 0)) / 100;
          doc.text(`  ${tax.name || "Tax"} (${tax.percentage || 0}%): ${formatCurrency(taxAmount)}`, 25, yPos);
          yPos += 6;
        });
      }

      if (payslip.deductionsDetails.insurances && payslip.deductionsDetails.insurances.length > 0) {
        payslip.deductionsDetails.insurances.forEach((insurance: any) => {
          const insuranceAmount = (payslip.earningsDetails.baseSalary * (insurance.percentage || 0)) / 100;
          doc.text(`  ${insurance.name || "Insurance"} (${insurance.percentage || 0}%): ${formatCurrency(insuranceAmount)}`, 25, yPos);
          yPos += 6;
        });
      }

      if (payslip.deductionsDetails.penalties) {
        const penaltyAmount = (payslip.deductionsDetails.penalties as any).amount || 0;
        if (penaltyAmount > 0) {
          doc.text(`  Penalties: ${formatCurrency(penaltyAmount)}`, 25, yPos);
          yPos += 6;
        }
      }

      doc.setFont("helvetica", "bold");
      doc.text(`Total Deductions: ${formatCurrency(payslip.totaDeductions)}`, 20, yPos);
      yPos += 10;

      // Net Pay Summary
      doc.setFont("helvetica", "bold");
      doc.setTextColor(37, 99, 235); // Blue color
      doc.text("Net Pay Summary", 20, yPos);
      yPos += 8;

      doc.setFont("helvetica", "normal");
      doc.setTextColor(0, 0, 0);
      doc.text(`Gross Salary: ${formatCurrency(payslip.totalGrossSalary)}`, 20, yPos);
      yPos += 6;
      doc.text(`Total Deductions: -${formatCurrency(payslip.totaDeductions)}`, 20, yPos);
      yPos += 8;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(5, 150, 105); // Green color
      doc.text(`Net Pay: ${formatCurrency(payslip.netPay)}`, 20, yPos);
      yPos += 15;

      // Footer
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(107, 114, 128);
      doc.text(`Generated on ${formatDate(payslip.createdAt)}`, 105, yPos, { align: "center" });
      yPos += 5;
      doc.text("This is a system-generated payslip. For questions, please contact HR.", 105, yPos, { align: "center" });

      // Generate filename
      const filename = `Payslip_${employeeId}_${payrollRunId}_${new Date(payslip.createdAt).toISOString().split('T')[0]}.pdf`;

      // Save the PDF
      doc.save(filename);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Failed to generate PDF. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <p className="text-gray-500">Loading payslip details...</p>
        </div>
      </div>
    );
  }

  if (error || !payslip) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-4">
          <Link href="/dashboard/payroll-execution/payslips">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Payslips
            </Button>
          </Link>
        </div>
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-500">{error || "Payslip not found"}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link href="/dashboard/payroll-execution/payslips">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Payslips
          </Button>
        </Link>
      </div>

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Payslip Details</h1>
        <p className="text-gray-600">
          Detailed breakdown of employee payslip
        </p>
      </div>

      {/* Employee Information */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Employee Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Employee Name</p>
              <p className="font-semibold text-gray-900">
                {payslip.employeeId
                  ? `${payslip.employeeId.firstName || ""} ${payslip.employeeId.lastName || ""}`
                  : "N/A"}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Employee ID</p>
              <p className="font-semibold text-gray-900">
                {payslip.employeeId?.employeeId || "N/A"}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Email</p>
              <p className="font-semibold text-gray-900">
                {payslip.employeeId?.email || "N/A"}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Payment Status</p>
              <span
                className={`inline-block px-3 py-1 text-xs rounded-full ${
                  payslip.paymentStatus === "paid"
                    ? "bg-green-100 text-green-700"
                    : "bg-yellow-100 text-yellow-700"
                }`}
              >
                {payslip.paymentStatus || "pending"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payroll Run Information */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Payroll Run Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Payroll Run ID</p>
              <p className="font-semibold text-gray-900">
                {payslip.payrollRunId?.runId || "N/A"}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Payroll Period</p>
              <p className="font-semibold text-gray-900">
                {payslip.payrollRunId?.payrollPeriod
                  ? formatDate(payslip.payrollRunId.payrollPeriod)
                  : "N/A"}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Status</p>
              <p className="font-semibold text-gray-900">
                {payslip.payrollRunId?.status || "N/A"}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Generated Date</p>
              <p className="font-semibold text-gray-900">
                {formatDate(payslip.createdAt)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Earnings Details */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-green-600">Earnings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-gray-700">Base Salary</span>
              <span className="font-semibold text-gray-900">
                {formatCurrency(payslip.earningsDetails.baseSalary)}
              </span>
            </div>

            {payslip.earningsDetails.allowances &&
              payslip.earningsDetails.allowances.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    Allowances
                  </p>
                  {payslip.earningsDetails.allowances.map(
                    (allowance: any, index: number) => (
                      <div
                        key={index}
                        className="flex justify-between items-center py-1 pl-4"
                      >
                        <span className="text-gray-600">
                          {allowance.name || "Allowance"}
                        </span>
                        <span className="text-gray-900">
                          {formatCurrency(allowance.amount || 0)}
                        </span>
                      </div>
                    )
                  )}
                </div>
              )}

            {payslip.earningsDetails.bonuses &&
              payslip.earningsDetails.bonuses.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    Bonuses
                  </p>
                  {payslip.earningsDetails.bonuses.map(
                    (bonus: any, index: number) => (
                      <div
                        key={index}
                        className="flex justify-between items-center py-1 pl-4"
                      >
                        <span className="text-gray-600">
                          {bonus.name || "Bonus"}
                        </span>
                        <span className="text-gray-900">
                          {formatCurrency(bonus.amount || 0)}
                        </span>
                      </div>
                    )
                  )}
                </div>
              )}

            {payslip.earningsDetails.benefits &&
              payslip.earningsDetails.benefits.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    Benefits
                  </p>
                  {payslip.earningsDetails.benefits.map(
                    (benefit: any, index: number) => (
                      <div
                        key={index}
                        className="flex justify-between items-center py-1 pl-4"
                      >
                        <span className="text-gray-600">
                          {benefit.name || "Benefit"}
                        </span>
                        <span className="text-gray-900">
                          {formatCurrency(benefit.amount || 0)}
                        </span>
                      </div>
                    )
                  )}
                </div>
              )}

            {payslip.earningsDetails.refunds &&
              payslip.earningsDetails.refunds.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    Refunds
                  </p>
                  {payslip.earningsDetails.refunds.map(
                    (refund: any, index: number) => (
                      <div
                        key={index}
                        className="flex justify-between items-center py-1 pl-4"
                      >
                        <span className="text-gray-600">
                          {refund.description || "Refund"}
                        </span>
                        <span className="text-gray-900">
                          {formatCurrency(refund.amount || 0)}
                        </span>
                      </div>
                    )
                  )}
                </div>
              )}

            <div className="flex justify-between items-center py-2 border-t-2 border-gray-300 mt-4">
              <span className="text-lg font-semibold text-gray-900">
                Total Gross Salary
              </span>
              <span className="text-lg font-bold text-green-600">
                {formatCurrency(payslip.totalGrossSalary)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Deductions Details */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-red-600">Deductions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {payslip.deductionsDetails.taxes &&
              payslip.deductionsDetails.taxes.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    Taxes
                  </p>
                  {payslip.deductionsDetails.taxes.map(
                    (tax: any, index: number) => {
                      const taxAmount =
                        (payslip.earningsDetails.baseSalary *
                          (tax.percentage || 0)) /
                        100;
                      return (
                        <div
                          key={index}
                          className="flex justify-between items-center py-1 pl-4"
                        >
                          <span className="text-gray-600">
                            {tax.name || "Tax"} ({tax.percentage || 0}%)
                          </span>
                          <span className="text-gray-900">
                            {formatCurrency(taxAmount)}
                          </span>
                        </div>
                      );
                    }
                  )}
                </div>
              )}

            {payslip.deductionsDetails.insurances &&
              payslip.deductionsDetails.insurances.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    Insurance
                  </p>
                  {payslip.deductionsDetails.insurances.map(
                    (insurance: any, index: number) => {
                      const insuranceAmount =
                        (payslip.earningsDetails.baseSalary *
                          (insurance.percentage || 0)) /
                        100;
                      return (
                        <div
                          key={index}
                          className="flex justify-between items-center py-1 pl-4"
                        >
                          <span className="text-gray-600">
                            {insurance.name || "Insurance"} (
                            {insurance.percentage || 0}%)
                          </span>
                          <span className="text-gray-900">
                            {formatCurrency(insuranceAmount)}
                          </span>
                        </div>
                      );
                    }
                  )}
                </div>
              )}

            {payslip.deductionsDetails.penalties && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">
                  Penalties
                </p>
                <div className="flex justify-between items-center py-1 pl-4">
                  <span className="text-gray-600">
                    {(payslip.deductionsDetails.penalties as any).description ||
                      "Penalties"}
                  </span>
                  <span className="text-gray-900">
                    {formatCurrency(
                      (payslip.deductionsDetails.penalties as any).amount || 0
                    )}
                  </span>
                </div>
              </div>
            )}

            <div className="flex justify-between items-center py-2 border-t-2 border-gray-300 mt-4">
              <span className="text-lg font-semibold text-gray-900">
                Total Deductions
              </span>
              <span className="text-lg font-bold text-red-600">
                {formatCurrency(payslip.totaDeductions)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Net Pay Summary */}
      <Card className="mb-6 border-2 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-600">Net Pay Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-700">Gross Salary</span>
              <span className="text-gray-900">
                {formatCurrency(payslip.totalGrossSalary)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-700">Total Deductions</span>
              <span className="text-red-600">
                -{formatCurrency(payslip.totaDeductions)}
              </span>
            </div>
            <div className="flex justify-between items-center pt-3 border-t-2 border-gray-300">
              <span className="text-xl font-bold text-gray-900">Net Pay</span>
              <span className="text-2xl font-bold text-green-600">
                {formatCurrency(payslip.netPay)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-4">
        <Button
          variant="outline"
          onClick={handleDownloadPDF}
          disabled={!payslip}
        >
          <Download className="h-4 w-4 mr-2" />
          Download PDF
        </Button>
        <Button
          variant="outline"
          onClick={handlePrint}
          disabled={!payslip}
        >
          <Printer className="h-4 w-4 mr-2" />
          Print
        </Button>
      </div>
    </div>
  );
}

