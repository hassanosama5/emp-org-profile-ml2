"use client";

import { useState } from "react";
import { useAuth } from "@/lib/hooks/use-auth";
import { useRequireAuth } from "@/lib/hooks/use-auth";
import { SystemRole } from "@/types";
import { payslipsApi } from "@/lib/api/payroll-tracking/payroll-tracking";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/shared/ui/Card";
import { Button } from "@/components/shared/ui/Button";
import { useRouter } from "next/navigation";

const CLAIM_TYPES = [
  "Travel",
  "Meals",
  "Accommodation",
  "Transportation",
  "Office Supplies",
  "Training",
  "Medical",
  "Communication",
  "Other",
];

export default function NewClaimPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [claimType, setClaimType] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // All authenticated users can create claims (all roles are employees)
  // No need for restrictive useRequireAuth

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!claimType) {
      setError("Please select a claim type");
      return;
    }

    if (!description.trim()) {
      setError("Please provide a description");
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      setError("Please enter a valid amount greater than 0");
      return;
    }

    if (parseFloat(amount) > 10000000) {
      setError("Amount exceeds maximum allowed limit");
      return;
    }

    if (!user?.id && !user?.userId) {
      setError("User ID not found");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const employeeId = user.id || user.userId;
      await payslipsApi.createClaim({
        employeeId: employeeId!,
        claimType: claimType,
        description: description.trim(),
        amount: parseFloat(amount),
      });
      
      router.push("/dashboard/payroll-tracking/claims");
    } catch (err: any) {
      setError(err.message || "Failed to create claim");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto px-6 py-8 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Submit Expense Claim</h1>
        <p className="text-gray-600 mt-1">
          As an Employee, submit expense reimbursement claims, so that you can recover money you spent on business purposes.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Claim Details</CardTitle>
          <CardDescription>
            Provide information about your expense reimbursement claim
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Claim Type */}
            <div>
              <label htmlFor="claimType" className="block text-sm font-medium text-gray-700 mb-2">
                Claim Type <span className="text-red-500">*</span>
              </label>
              <select
                id="claimType"
                value={claimType}
                onChange={(e) => setClaimType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">-- Select claim type --</option>
                {CLAIM_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            {/* Amount */}
            <div>
              <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-2">
                Amount (USD) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                id="amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                step="0.01"
                min="0.01"
                max="10000000"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
                required
              />
              <p className="mt-2 text-sm text-gray-500">
                Enter the total amount you spent on this expense
              </p>
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Provide a detailed description of the expense. Include: what was purchased, when, where, and why it was necessary for business purposes."
                required
              />
              <p className="mt-2 text-sm text-gray-500">
                Be as detailed as possible to help with the review process
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button type="submit" disabled={submitting}>
                {submitting ? "Submitting..." : "Submit Claim"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/dashboard/payroll-tracking/claims")}
                disabled={submitting}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Information Card */}
      <Card className="mt-6 bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <span className="text-xl">ℹ️</span>
            <div>
              <p className="font-semibold text-blue-900 mb-1">Submitting Expense Reimbursement Claims</p>
              <p className="text-sm text-blue-800 mb-3">
                Submit expense reimbursement claims to recover money you spent on business purposes. You can submit claims for:
              </p>
              <ul className="text-sm text-blue-800 list-disc list-inside space-y-1 mb-3">
                <li>
                  <strong>Travel:</strong> Business trips, flights, hotels, car rentals, and other travel expenses incurred for business purposes.
                </li>
                <li>
                  <strong>Meals:</strong> Business meals and client entertainment expenses that are necessary for business operations.
                </li>
                <li>
                  <strong>Accommodation:</strong> Hotel stays and other accommodation expenses for business travel.
                </li>
                <li>
                  <strong>Transportation:</strong> Taxis, parking, public transport, and other transportation costs for business purposes.
                </li>
                <li>
                  <strong>Office Supplies:</strong> Equipment, supplies, and materials needed for work and business operations.
                </li>
                <li>
                  <strong>Training:</strong> Professional development courses, certifications, and training expenses that benefit the business.
                </li>
                <li>
                  <strong>Medical:</strong> Business-related medical expenses (if applicable to your company policy).
                </li>
                <li>
                  <strong>Communication:</strong> Phone bills, internet, and other communication expenses for business use.
                </li>
                <li>
                  <strong>Other:</strong> Any other legitimate business expenses that you need to be reimbursed for.
                </li>
              </ul>
              <p className="text-sm text-blue-800">
                <strong>Important:</strong> Only expenses incurred for business purposes are eligible for reimbursement. 
                Your claim will be reviewed by the payroll team, and you'll be notified of the status and any approved amount. 
                Keep receipts and documentation for your records to support your claim.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

