"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useRequireAuth } from "@/lib/hooks/use-auth";
import { SystemRole } from "@/types";
import { Button } from "../../../../../../../components/shared/ui/Button";
import SigningBonusReviewForm from "../../../../../../../components/payroll-execution/SigningBonusReviewForm";
import { payrollExecutionApi } from "../../../../../../../lib/api/payroll-execution/payroll-execution";
import { EmployeeSigningBonus } from "../../../../../../../types/payroll-execution";

export default function SigningBonusReviewPage() {
  const router = useRouter();
  const params = useParams();
  // Only Payroll Specialist can review and approve signing bonuses
  useRequireAuth(SystemRole.PAYROLL_SPECIALIST);
  const id = params.id as string;
  const [signingBonus, setSigningBonus] = useState<EmployeeSigningBonus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchSigningBonus();
    }
  }, [id]);

  const fetchSigningBonus = async () => {
    try {
      setLoading(true);
      const data = await payrollExecutionApi.getSigningBonusById(id);
      setSigningBonus(data);
    } catch (err: any) {
      setError(err.message || "Failed to fetch signing bonus");
    } finally {
      setLoading(false);
    }
  };

  const handleSuccess = () => {
    router.push("/dashboard/payroll-execution/pre-initiation/signing-bonuses");
  };

  const handleCancel = () => {
    router.push("/dashboard/payroll-execution/pre-initiation/signing-bonuses");
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
        <Link href="/dashboard/payroll-execution/pre-initiation/signing-bonuses">
          <Button className="bg-gray-500 hover:bg-gray-600">Back to List</Button>
        </Link>
      </div>
    );
  }

  if (!signingBonus) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Signing bonus not found</div>
        <Link href="/dashboard/payroll-execution/pre-initiation/signing-bonuses">
          <Button className="mt-4 bg-gray-500 hover:bg-gray-600">Back to List</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link href="/dashboard/payroll-execution/pre-initiation/signing-bonuses">
          <Button className="bg-gray-500 hover:bg-gray-600 mb-4">← Back to List</Button>
        </Link>
        <h1 className="text-3xl font-bold">Review Signing Bonus</h1>
      </div>

      <SigningBonusReviewForm
        signingBonus={signingBonus}
        onSuccess={handleSuccess}
        onCancel={handleCancel}
      />
    </div>
  );
}

