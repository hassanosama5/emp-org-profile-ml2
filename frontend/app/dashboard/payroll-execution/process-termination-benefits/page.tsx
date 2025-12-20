"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/use-auth";
import { useRequireAuth } from "@/lib/hooks/use-auth";
import { SystemRole } from "@/types";
import { payrollExecutionApi } from "@/lib/api/payroll-execution/payroll-execution";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/shared/ui/Card";
import { Button } from "@/components/shared/ui/Button";
import {
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Shield,
  Users,
  DollarSign,
  ArrowRight,
  FileText,
} from "lucide-react";

export default function ProcessTerminationBenefitsPage() {
  const router = useRouter();
  const { user } = useAuth();
  useRequireAuth(SystemRole.PAYROLL_SPECIALIST);

  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [result, setResult] = useState<any[] | null>(null);

  const handleProcess = async () => {
    setProcessing(true);
    setError(null);
    setSuccess(null);
    setResult(null);

    try {
      const benefits = await payrollExecutionApi.processTerminationBenefits();
      
      setResult(Array.isArray(benefits) ? benefits : []);
      setSuccess(
        `Successfully processed ${Array.isArray(benefits) ? benefits.length : 0} termination/resignation benefit(s)!`
      );
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        "Failed to process termination benefits";
      setError(errorMessage);
      console.error("Error processing termination benefits:", err);
    } finally {
      setProcessing(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount || 0);
  };

  const getTerminationType = (benefit: any) => {
    if (benefit.terminationId && typeof benefit.terminationId === "object") {
      return benefit.terminationId.type || "N/A";
    }
    return "N/A";
  };

  const getBenefitName = (benefit: any) => {
    if (benefit.benefitId && typeof benefit.benefitId === "object") {
      return benefit.benefitId.name || "N/A";
    }
    return "N/A";
  };

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Process Termination/Resignation Benefits
        </h1>
        <p className="text-gray-600 mt-1">
          As a Payroll Specialist, automatically process benefits upon resignation according to business rules and signed contracts. The system automatically detects resignations and terminations and processes benefits accordingly.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-red-500" />
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-500" />
          <p className="text-green-700">{success}</p>
        </div>
      )}

      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-blue-600" />
            Automatic Termination/Resignation Benefit Processing
          </CardTitle>
          <CardDescription>
            As a Payroll Specialist, the system automatically processes benefits upon termination according to business rules & signed contracts. When you trigger processing, the system will:
          </CardDescription>
          <div className="mt-3">
            <p className="text-sm text-gray-600 mb-2">Automatic processing steps:</p>
            <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
              <li><strong>Detect resignations/terminations:</strong> Find all employees with approved termination or resignation requests</li>
              <li><strong>Match configurations:</strong> Match them with approved termination/resignation benefit configurations</li>
              <li><strong>Validate contracts:</strong> Check employee contract start date, end date, and validity</li>
              <li><strong>Check business rules:</strong> Verify eligibility according to business rules (minimum tenure, termination type, etc.)</li>
              <li><strong>Calculate amounts:</strong> Calculate benefit amounts based on tenure, salary, or fixed amounts as per business rules</li>
              <li><strong>Create records:</strong> Automatically create employee termination benefit records with PENDING status for eligible employees</li>
            </ul>
            <p className="text-sm text-gray-600 mt-3">
              <strong>Business Rules Validation:</strong> The system checks minimum tenure requirements, termination type (resignation vs termination), and calculates benefits based on contract terms and business rules stored in the benefit configuration.
            </p>
            <p className="text-sm text-gray-600 mt-2">
              <strong>Note:</strong> Termination/resignation benefits are also automatically processed during payroll draft generation.
            </p>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-blue-800 mb-2">
              <strong>Automatic Processing:</strong> The system automatically processes benefits upon resignation and termination. When you click "Process Termination/Resignation Benefits", the system will:
            </p>
            <ul className="text-sm text-blue-800 list-disc list-inside space-y-1 mb-2">
              <li>Automatically detect all employees with approved termination or resignation requests</li>
              <li>Match them with approved termination/resignation benefit configurations</li>
              <li>Check business rules to determine eligibility</li>
              <li>Verify eligibility according to signed employment contracts</li>
              <li>Create termination benefit records with PENDING status for review</li>
            </ul>
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> After processing, termination/resignation benefits will be created in PENDING status. You will need to review and approve them before they can be included in payroll runs.
            </p>
          </div>

          <Button
            onClick={handleProcess}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 text-lg"
            disabled={processing}
          >
            {processing ? (
              <>
                <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                Processing Termination Benefits...
              </>
            ) : (
              <>
                <Shield className="h-5 w-5 mr-2" />
                Process Termination/Resignation Benefits
              </>
            )}
          </Button>

          {result && result.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Users className="h-5 w-5 text-gray-600" />
                Processed Termination/Resignation Benefits ({result.length})
              </h3>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {result.map((benefit: any, index: number) => (
                  <Card key={benefit._id || index} className="border border-gray-200">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">
                            {benefit.employeeId && typeof benefit.employeeId === "object"
                              ? `${benefit.employeeId.firstName || ""} ${benefit.employeeId.lastName || ""}`.trim() || "Unknown Employee"
                              : `Employee ID: ${benefit.employeeId || "N/A"}`}
                          </p>
                          <div className="mt-2 space-y-1">
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">Type:</span> {getTerminationType(benefit)}
                            </p>
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">Benefit:</span> {getBenefitName(benefit)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="font-semibold text-gray-900 flex items-center gap-1">
                              <DollarSign className="h-4 w-4" />
                              {formatCurrency(benefit.givenAmount || 0)}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              Status: <span className="font-semibold text-yellow-600">{benefit.status || "PENDING"}</span>
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {result && result.length === 0 && (
            <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-md text-center">
              <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600">
                No termination/resignation benefits were processed. This could mean:
              </p>
              <ul className="list-disc list-inside mt-2 text-sm text-gray-600 space-y-1">
                <li><strong>No approved requests:</strong> No employees have approved termination or resignation requests</li>
                <li><strong>No configurations:</strong> No matching termination/resignation benefit configurations exist or are approved</li>
                <li><strong>Business rules:</strong> Employees are not eligible according to business rules</li>
                <li><strong>Contract terms:</strong> Employees do not meet eligibility requirements in their signed contracts</li>
                <li><strong>Already processed:</strong> Benefits have already been processed for existing termination/resignation requests</li>
              </ul>
            </div>
          )}

          {result && (
            <div className="pt-4 border-t">
              <Button
                onClick={() => router.push("/dashboard/payroll-execution/pre-initiation/termination-benefits")}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                Review Termination Benefits
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mt-8">
        <Button
          onClick={() => router.push("/dashboard/payroll-execution/pre-initiation")}
          variant="outline"
        >
          ← Back to Pre-Initiation
        </Button>
      </div>
    </div>
  );
}

