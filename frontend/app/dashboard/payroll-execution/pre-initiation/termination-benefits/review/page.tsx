"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useRequireAuth } from "@/lib/hooks/use-auth";
import { SystemRole } from "@/types";

export default function TerminationBenefitReviewRedirectPage() {
  const router = useRouter();
  // Only Payroll Specialist can review and approve termination benefits
  useRequireAuth(SystemRole.PAYROLL_SPECIALIST);

  useEffect(() => {
    // Redirect to the list page since no ID was provided
    router.push("/dashboard/payroll-execution/pre-initiation/termination-benefits");
  }, [router]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center">
        <p className="text-gray-600 mb-4">Redirecting to termination benefits list...</p>
        <p className="text-sm text-gray-500">
          Please select a termination benefit from the list to review.
        </p>
      </div>
    </div>
  );
}

