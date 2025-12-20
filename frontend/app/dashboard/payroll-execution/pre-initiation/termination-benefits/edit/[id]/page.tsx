"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useRequireAuth } from "@/lib/hooks/use-auth";
import { SystemRole } from "@/types";
import { Button } from "../../../../../../../components/shared/ui/Button";
import { Input } from "../../../../../../../components/shared/ui/Input";
import { Label } from "../../../../../../../components/shared/ui/Label";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "../../../../../../../components/shared/ui/Card";
import { payrollExecutionApi } from "../../../../../../../lib/api/payroll-execution/payroll-execution";
import { EmployeeTerminationBenefit, TerminationBenefitEditDto, BenefitStatus } from "../../../../../../../types/payroll-execution";
import {
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Save,
  User,
  DollarSign,
  FileText,
  Shield,
} from "lucide-react";

export default function EditTerminationBenefitPage() {
  useRequireAuth(SystemRole.PAYROLL_SPECIALIST);
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [terminationBenefit, setTerminationBenefit] = useState<EmployeeTerminationBenefit | null>(null);
  const [givenAmount, setGivenAmount] = useState<number>(0);
  const [status, setStatus] = useState<BenefitStatus>(BenefitStatus.PENDING);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchTerminationBenefit();
    }
  }, [id]);

  const fetchTerminationBenefit = async () => {
    try {
      setLoading(true);
      const data = await payrollExecutionApi.getTerminationBenefitById(id);
      setTerminationBenefit(data);
      setGivenAmount(data.givenAmount);
      setStatus(data.status || BenefitStatus.PENDING);
    } catch (err: any) {
      setError(err.message || "Failed to fetch termination benefit");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    try {
      if (givenAmount < 0) {
        setError("Given amount cannot be negative");
        setIsSubmitting(false);
        return;
      }

      const editDto: TerminationBenefitEditDto = {
        employeeTerminationResignationId: id,
        givenAmount,
        status,
      };

      await payrollExecutionApi.editTerminationBenefit(editDto);
      setSuccess("Termination benefit updated successfully!");

      // Redirect after 2 seconds
      setTimeout(() => {
        router.push("/dashboard/payroll-execution/pre-initiation/termination-benefits");
      }, 2000);
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        "Failed to edit termination benefit";
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount || 0);
  };

  const getTerminationType = () => {
    if (terminationBenefit?.terminationId && typeof terminationBenefit.terminationId === "object" && terminationBenefit.terminationId !== null) {
      return terminationBenefit.terminationId.type || "N/A";
    }
    return "N/A";
  };

  const getBenefitName = () => {
    if (terminationBenefit?.benefitId && typeof terminationBenefit.benefitId === "object" && terminationBenefit.benefitId !== null) {
      return terminationBenefit.benefitId.name || "N/A";
    }
    return "N/A";
  };

  if (loading) {
    return (
      <div className="container mx-auto px-6 py-8">
        <Card>
          <CardContent className="py-12 text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">Loading termination benefit details...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error && !terminationBenefit) {
    return (
      <div className="container mx-auto px-6 py-8">
        <Card>
          <CardContent className="py-12">
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              {error}
            </div>
            <Link href="/dashboard/payroll-execution/pre-initiation/termination-benefits">
              <Button variant="outline">Back to List</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!terminationBenefit) {
    return null;
  }

  const employeeName =
    terminationBenefit.employeeId && typeof terminationBenefit.employeeId === "object" && terminationBenefit.employeeId !== null
      ? `${terminationBenefit.employeeId.firstName || ""} ${terminationBenefit.employeeId.lastName || ""}`.trim() || "N/A"
      : "N/A";

  const employeeId =
    terminationBenefit.employeeId && typeof terminationBenefit.employeeId === "object" && terminationBenefit.employeeId !== null
      ? terminationBenefit.employeeId.employeeNumber || (terminationBenefit.employeeId._id ? String(terminationBenefit.employeeId._id) : "N/A")
      : typeof terminationBenefit.employeeId === "string"
      ? terminationBenefit.employeeId
      : "N/A";

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Edit Termination/Resignation Benefit</h1>
        <p className="text-gray-600 mt-1">
          Manually edit termination/resignation benefit details when needed
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
            Termination/Resignation Benefit Details
          </CardTitle>
          <CardDescription>
            Edit the benefit amount and status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600">Employee Name</p>
                  <p className="font-semibold text-gray-900">{employeeName}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600">Employee ID</p>
                  <p className="font-semibold text-gray-900">{employeeId}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600">Termination Type</p>
                  <p className="font-semibold text-gray-900">{getTerminationType()}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600">Benefit Name</p>
                  <p className="font-semibold text-gray-900">{getBenefitName()}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600">Current Amount</p>
                  <p className="font-semibold text-gray-900">
                    {formatCurrency(terminationBenefit.givenAmount || 0)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600">Current Status</p>
                  <p className="font-semibold text-gray-900">{terminationBenefit.status || "N/A"}</p>
                </div>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="status">Status *</Label>
              <div className="mt-2 space-y-2">
                <label className="flex items-center p-3 border border-gray-300 rounded-md hover:bg-gray-50 cursor-pointer">
                  <input
                    type="radio"
                    name="status"
                    value={BenefitStatus.APPROVED}
                    checked={status === BenefitStatus.APPROVED}
                    onChange={(e) => setStatus(e.target.value as BenefitStatus)}
                    className="mr-3"
                  />
                  <span className="font-medium text-green-700">Approved</span>
                </label>
                <label className="flex items-center p-3 border border-gray-300 rounded-md hover:bg-gray-50 cursor-pointer">
                  <input
                    type="radio"
                    name="status"
                    value={BenefitStatus.REJECTED}
                    checked={status === BenefitStatus.REJECTED}
                    onChange={(e) => setStatus(e.target.value as BenefitStatus)}
                    className="mr-3"
                  />
                  <span className="font-medium text-red-700">Rejected</span>
                </label>
                <label className="flex items-center p-3 border border-gray-300 rounded-md hover:bg-gray-50 cursor-pointer">
                  <input
                    type="radio"
                    name="status"
                    value={BenefitStatus.PENDING}
                    checked={status === BenefitStatus.PENDING}
                    onChange={(e) => setStatus(e.target.value as BenefitStatus)}
                    className="mr-3"
                  />
                  <span className="font-medium text-yellow-700">Pending</span>
                </label>
                <label className="flex items-center p-3 border border-gray-300 rounded-md hover:bg-gray-50 cursor-pointer">
                  <input
                    type="radio"
                    name="status"
                    value={BenefitStatus.PAID}
                    checked={status === BenefitStatus.PAID}
                    onChange={(e) => setStatus(e.target.value as BenefitStatus)}
                    className="mr-3"
                  />
                  <span className="font-medium text-blue-700">Paid</span>
                </label>
              </div>
            </div>

            <div>
              <Label htmlFor="givenAmount">
                Given Amount <span className="text-red-500">*</span>
              </Label>
              <div className="mt-1 relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  id="givenAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={givenAmount}
                  onChange={(e) => setGivenAmount(parseFloat(e.target.value) || 0)}
                  className="pl-10"
                  required
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Enter the termination/resignation benefit amount to be given to the employee
              </p>
            </div>

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> You cannot edit termination/resignation benefits that are part of locked payroll runs. 
                If you need to make changes to a benefit in a locked payroll, please unlock the payroll run first.
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <Link href="/dashboard/payroll-execution/pre-initiation/termination-benefits" className="flex-1">
                <Button
                  type="button"
                  disabled={isSubmitting}
                  variant="outline"
                  className="w-full"
                >
                  Cancel
                </Button>
              </Link>
              <Button
                type="submit"
                disabled={isSubmitting || givenAmount < 0}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="mt-8">
        <Link href="/dashboard/payroll-execution/pre-initiation/termination-benefits">
          <Button variant="outline">
            ← Back to Termination Benefits List
          </Button>
        </Link>
      </div>
    </div>
  );
}

