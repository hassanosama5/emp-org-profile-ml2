"use client";

import { useState } from "react";
import { Button } from "../shared/ui/Button";
import { Label } from "../shared/ui/Label";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "../shared/ui/Card";
import {
  TerminationBenefitReviewDto,
  BenefitStatus,
  EmployeeTerminationBenefit,
} from "../../types/payroll-execution";
import { payrollExecutionApi } from "../../lib/api/payroll-execution/payroll-execution";
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  User,
  DollarSign,
  FileText,
  Shield,
} from "lucide-react";

interface TerminationBenefitReviewFormProps {
  terminationBenefit: EmployeeTerminationBenefit;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function TerminationBenefitReviewForm({
  terminationBenefit,
  onSuccess,
  onCancel,
}: TerminationBenefitReviewFormProps) {
  const [status, setStatus] = useState<BenefitStatus>(
    terminationBenefit.status || BenefitStatus.PENDING
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Only allow reviewing pending termination benefits
  const canReview = terminationBenefit.status === BenefitStatus.PENDING;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    
    // Validate that the termination benefit is still pending
    if (terminationBenefit.status !== BenefitStatus.PENDING) {
      setError(`This termination benefit cannot be reviewed. Current status: ${terminationBenefit.status}. Only pending termination benefits can be reviewed.`);
      return;
    }

    setIsSubmitting(true);

    try {
      const reviewDto: TerminationBenefitReviewDto = {
        employeeTerminationResignationId: terminationBenefit._id,
        status,
      };

      await payrollExecutionApi.reviewTerminationBenefit(reviewDto);
      setSuccess(
        `Termination benefit has been ${status === BenefitStatus.APPROVED ? "approved" : "rejected"} successfully!`
      );

      // Call onSuccess after a short delay to show success message
      setTimeout(() => {
        onSuccess();
      }, 1500);
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        "Failed to review termination benefit";
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
    if (terminationBenefit.terminationId && typeof terminationBenefit.terminationId === "object" && terminationBenefit.terminationId !== null) {
      return terminationBenefit.terminationId.type;
    }
    return "Unknown";
  };

  const getTerminationReason = () => {
    if (terminationBenefit.terminationId && typeof terminationBenefit.terminationId === "object" && terminationBenefit.terminationId !== null) {
      return terminationBenefit.terminationId.reason;
    }
    return "N/A";
  };

  const getBenefitName = () => {
    if (terminationBenefit.benefitId && typeof terminationBenefit.benefitId === "object" && terminationBenefit.benefitId !== null) {
      return terminationBenefit.benefitId.name;
    }
    return "Unknown";
  };

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

  // If termination benefit is not pending, show message
  if (!canReview) {
    return (
      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-blue-600" />
            Review Termination/Resignation Benefit
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded mb-4">
            <p className="font-medium">This termination benefit cannot be reviewed.</p>
            <p className="text-sm mt-1">
              Only pending termination benefits can be reviewed and approved/rejected. 
              Current status: <strong>{terminationBenefit.status}</strong>
            </p>
          </div>
          <Button
            type="button"
            onClick={onCancel}
            className="bg-gray-500 hover:bg-gray-600"
          >
            Back to List
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-3xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-blue-600" />
          Review Termination/Resignation Benefit
        </CardTitle>
        <CardDescription>
          Review and approve or reject the processed termination/resignation benefit. Only pending termination benefits can be reviewed.
        </CardDescription>
      </CardHeader>
      <CardContent>
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
                <p className="text-sm text-gray-600">Given Amount</p>
                <p className="font-semibold text-gray-900">
                  {formatCurrency(terminationBenefit.givenAmount || 0)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-600">Termination Reason</p>
                <p className="font-semibold text-gray-900">{getTerminationReason()}</p>
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="status">Review Decision *</Label>
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
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="font-medium text-green-700">Approve</span>
                </div>
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
                <div className="flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-red-600" />
                  <span className="font-medium text-red-700">Reject</span>
                </div>
              </label>
            </div>
          </div>


          <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> Approved termination/resignation benefits will be included in payroll runs and added to the employee's net pay.
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              variant="outline"
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className={`flex-1 ${
                status === BenefitStatus.APPROVED
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-red-600 hover:bg-red-700"
              } text-white`}
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : status === BenefitStatus.APPROVED ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve Benefit
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject Benefit
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

