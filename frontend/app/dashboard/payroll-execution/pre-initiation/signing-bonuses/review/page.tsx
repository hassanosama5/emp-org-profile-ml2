"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useRequireAuth } from "@/lib/hooks/use-auth";
import { SystemRole } from "@/types";

export default function SigningBonusReviewRedirectPage() {
  const router = useRouter();
  // Only Payroll Specialist can review and approve signing bonuses
  useRequireAuth(SystemRole.PAYROLL_SPECIALIST);

  useEffect(() => {
    // Redirect to the list page since no ID was provided
    router.push("/dashboard/payroll-execution/pre-initiation/signing-bonuses");
  }, [router]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center">
        <p className="text-gray-600 mb-4">Redirecting to signing bonuses list...</p>
        <p className="text-sm text-gray-500">
          Please select a signing bonus from the list to review.
        </p>
      </div>
    </div>
  );
}

