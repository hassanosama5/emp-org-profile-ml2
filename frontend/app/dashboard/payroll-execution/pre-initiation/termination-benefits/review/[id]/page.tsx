"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useRequireAuth } from "@/lib/hooks/use-auth";
import { SystemRole } from "@/types";
import { Button } from "../../../../../../../components/shared/ui/Button";
import TerminationBenefitReviewForm from "../../../../../../../components/payroll-execution/TerminationBenefitReviewForm";
import { payrollExecutionApi } from "../../../../../../../lib/api/payroll-execution/payroll-execution";
import { EmployeeTerminationBenefit } from "../../../../../../../types/payroll-execution";
import {
  Card,
  CardContent,
} from "../../../../../../../components/shared/ui/Card";
import { RefreshCw, AlertCircle } from "lucide-react";

export default function TerminationBenefitReviewPage() {
  useRequireAuth(SystemRole.PAYROLL_SPECIALIST);
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [terminationBenefit, setTerminationBenefit] = useState<EmployeeTerminationBenefit | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    } catch (err: any) {
      setError(err.message || "Failed to fetch termination benefit");
    } finally {
      setLoading(false);
    }
  };

  const handleSuccess = () => {
    router.push("/dashboard/payroll-execution/pre-initiation/termination-benefits");
  };

  const handleCancel = () => {
    router.push("/dashboard/payroll-execution/pre-initiation/termination-benefits");
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
    return (
      <div className="container mx-auto px-6 py-8">
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-red-400 mb-4" />
            <p className="text-gray-600 text-lg mb-2">Termination benefit not found</p>
            <Link href="/dashboard/payroll-execution/pre-initiation/termination-benefits">
              <Button variant="outline" className="mt-4">Back to List</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Review Termination/Resignation Benefit</h1>
        <p className="text-gray-600 mt-1">
          Review and approve processed benefits upon resignation according to business rules and signed contracts
        </p>
      </div>

      <TerminationBenefitReviewForm
        terminationBenefit={terminationBenefit}
        onSuccess={handleSuccess}
        onCancel={handleCancel}
      />

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

