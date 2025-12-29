"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/use-auth";
import { useRequireAuth } from "@/lib/hooks/use-auth";
import { SystemRole } from "@/types";
import { payslipsApi } from "@/lib/api/payroll-tracking/payroll-tracking";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/shared/ui/Card";
import { Button } from "@/components/shared/ui/Button";
import { Input } from "@/components/shared/ui/Input";
import { Modal } from "@/components/leaves/Modal";
import Link from "next/link";

interface Claim {
  _id: string;
  claimId: string;
  description: string;
  claimType: string;
  amount: number;
  approvedAmount?: number;
  status: string;
  rejectionReason?: string;
  resolutionComment?: string;
  createdAt?: string;
  updatedAt?: string;
}

export default function ApprovedClaimsPage() {
  useRequireAuth(SystemRole.FINANCE_STAFF);
  const { user } = useAuth();
  const router = useRouter();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Refund generation modal state
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  const [refundAmount, setRefundAmount] = useState<string>("");
  const [refundDescription, setRefundDescription] = useState<string>("");
  const [isGeneratingRefund, setIsGeneratingRefund] = useState(false);
  const [refundError, setRefundError] = useState<string | null>(null);
  const [refundSuccess, setRefundSuccess] = useState<string | null>(null);

  // Helper function to extract error message from API response
  const getErrorMessage = (err: any): string => {
    if (err.response?.data?.message) {
      return err.response.data.message;
    }
    if (err.message) {
      return err.message;
    }
    return "An error occurred. Please try again.";
  };

  useEffect(() => {
    const fetchClaims = async () => {
      try {
        const data = await payslipsApi.getApprovedClaimsForFinance();
        setClaims(data || []);
      } catch (err: any) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    };

    fetchClaims();
  }, []);

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateString;
    }
  };

  const formatCurrency = (amount?: number) => {
    if (amount === null || amount === undefined) return "N/A";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const openRefundModal = (claim: Claim) => {
    setSelectedClaim(claim);
    // Pre-fill with approved amount if available, otherwise use claimed amount
    const defaultAmount = claim.approvedAmount !== undefined && claim.approvedAmount !== null
      ? claim.approvedAmount
      : claim.amount;
    setRefundAmount(defaultAmount.toString());
    setRefundDescription("");
    setRefundError(null);
    setRefundSuccess(null);
    setIsRefundModalOpen(true);
  };

  const closeRefundModal = () => {
    setIsRefundModalOpen(false);
    setSelectedClaim(null);
    setRefundAmount("");
    setRefundDescription("");
    setRefundError(null);
    setRefundSuccess(null);
  };

  const handleGenerateRefund = async () => {
    if (!selectedClaim || (!user?.id && !user?.userId)) {
      setRefundError("Missing required information");
      return;
    }

    // Validation
    const amount = parseFloat(refundAmount);
    if (isNaN(amount) || amount <= 0) {
      setRefundError("Please enter a valid refund amount greater than 0");
      return;
    }

    if (!refundDescription || refundDescription.trim().length < 5) {
      setRefundError("Refund description must be at least 5 characters long");
      return;
    }

    setIsGeneratingRefund(true);
    setRefundError(null);
    setRefundSuccess(null);

    const financeStaffId = user.id || user.userId;

    try {
      await payslipsApi.generateRefundForClaim(selectedClaim.claimId, {
        financeStaffId: financeStaffId!,
        refundDetails: {
          description: refundDescription.trim(),
          amount: amount,
        },
      });

      setRefundSuccess("Refund generated successfully! It will be included in the next payroll cycle.");
      
      // Refresh claims list after a short delay
      setTimeout(async () => {
        try {
          const data = await payslipsApi.getApprovedClaimsForFinance();
          setClaims(data || []);
        } catch (err) {
          console.error("Failed to refresh claims:", err);
        }
        closeRefundModal();
      }, 2000);
    } catch (err: any) {
      // Extract specific backend error message
      const errorMessage = err.response?.data?.message || err.message;
      
      // Check if it's a duplicate refund error and show the specific message
      if (errorMessage && errorMessage.includes("refund already exists")) {
        setRefundError(errorMessage);
      } else {
        setRefundError(errorMessage || "Failed to generate refund. Please try again.");
      }
    } finally {
      setIsGeneratingRefund(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading approved claims...</p>
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
                <Button onClick={() => router.refresh()}>Retry</Button>
                <Button variant="outline" onClick={() => router.push("/dashboard/finance")}>
                  Back
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Approved Expense Claims</h1>
          <p className="text-gray-600 mt-1">
            As Finance staff, view and get notified with approved expense claims, so that adjustments can be done.
          </p>
        </div>
        <Button variant="outline" onClick={() => router.push("/dashboard/finance")}>
          Back to Finance Dashboard
        </Button>
      </div>

      {claims.length > 0 ? (
        <div className="space-y-4">
          {claims.map((claim) => (
            <Card key={claim._id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {claim.claimId}
                      </h3>
                      <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800 border border-green-300">
                        Approved
                      </span>
                      <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800 border border-gray-300">
                        {claim.claimType}
                      </span>
                    </div>
                    <p className="text-gray-700 mb-3">{claim.description}</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm text-gray-700">
                      <div>
                        <span className="font-medium text-gray-500">Claimed Amount:</span>{" "}
                        {formatCurrency(claim.amount)}
                      </div>
                      {claim.approvedAmount !== undefined && claim.approvedAmount !== null && (
                        <div>
                          <span className="font-medium text-gray-500">Approved Amount:</span>{" "}
                          <span className="text-green-700 font-semibold">
                            {formatCurrency(claim.approvedAmount)}
                          </span>
                        </div>
                      )}
                      <div>
                        <span className="font-medium text-gray-500">Approved On:</span>{" "}
                        {formatDate(claim.updatedAt || claim.createdAt)}
                      </div>
                    </div>
                    {claim.resolutionComment && (
                      <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded">
                        <p className="text-sm font-medium text-green-900 mb-1">Resolution Comment:</p>
                        <p className="text-sm text-green-800">{claim.resolutionComment}</p>
                      </div>
                    )}
                  </div>
                  <div className="ml-4 flex flex-col gap-2">
                    <Link href={`/dashboard/payroll-tracking/claims/${claim.claimId}`}>
                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
                    </Link>
                    <Button 
                      variant="primary" 
                      size="sm" 
                      onClick={() => openRefundModal(claim)}
                      title="Generate refund for this approved expense claim. Refund will have status 'Pending' until executed in payroll cycle."
                    >
                      Generate Refund
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => router.push("/dashboard/payroll-tracking/tracking")}
                    >
                      Track Refund
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <div className="text-4xl mb-3">✅</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Approved Claims</h3>
              <p className="text-sm text-gray-600 mb-4">
                There are no approved claims awaiting finance adjustments.
              </p>
              <Button variant="outline" onClick={() => router.push("/dashboard/finance")}>
                Back to Finance Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="mt-6 bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <span className="text-xl">ℹ️</span>
            <div>
              <p className="font-semibold text-blue-900 mb-1">View and Get Notified with Approved Expense Claims</p>
              <p className="text-sm text-blue-800 mb-2">
                You will receive notifications when expense claims are approved by the Payroll Manager. The notification system automatically alerts you when a claim status changes to "Approved" so you can process adjustments promptly.
              </p>
              <ul className="text-sm text-blue-800 list-disc list-inside space-y-1 mb-2">
                <li>
                  <strong>Automatic Notifications:</strong> When a Payroll Manager confirms a claim approval, you will receive a notification with the claim details, employee information, and approved amount.
                </li>
                <li>
                  <strong>View Approved Claims:</strong> All approved expense claims appear in this list, sorted by most recently approved.
                </li>
                <li>
                  <strong>Generate Refunds:</strong> As Finance staff, generate refunds for expense claims on approval. Refunds will have status "Pending" until executed in the payroll cycle.
                </li>
                <li>
                  <strong>Payroll Integration:</strong> Pending refunds are automatically included in the next payroll cycle calculation and added to the employee's net pay.
                </li>
              </ul>
              <p className="text-sm text-blue-800">
                <strong>Workflow:</strong> Payroll Manager confirms approval → You receive notification → View claim here → Generate refund for adjustments
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Generate Refund Modal */}
      <Modal
        isOpen={isRefundModalOpen}
        onClose={closeRefundModal}
        title={`Generate Refund for ${selectedClaim?.claimId || "Claim"}`}
        size="md"
        footer={
          <div className="flex gap-3">
            <Button variant="outline" onClick={closeRefundModal} disabled={isGeneratingRefund}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleGenerateRefund}
              disabled={isGeneratingRefund}
            >
              {isGeneratingRefund ? "Generating..." : "Generate Refund"}
            </Button>
          </div>
        }
      >
        {selectedClaim && (
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 mb-2">Claim Details:</p>
              <p className="text-sm font-medium text-gray-900">{selectedClaim.description}</p>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-gray-600">
                <div>
                  <span className="font-medium">Type:</span> {selectedClaim.claimType}
                </div>
                <div>
                  <span className="font-medium">Claimed:</span> {formatCurrency(selectedClaim.amount)}
                </div>
                {selectedClaim.approvedAmount !== undefined && selectedClaim.approvedAmount !== null && (
                  <div className="col-span-2">
                    <span className="font-medium">Approved Amount:</span>{" "}
                    <span className="text-green-700 font-semibold">
                      {formatCurrency(selectedClaim.approvedAmount)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {refundError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-800">{refundError}</p>
              </div>
            )}

            {refundSuccess && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-sm text-green-800">{refundSuccess}</p>
              </div>
            )}

            <div>
              <label htmlFor="refund-amount" className="block text-sm font-medium text-gray-700 mb-1">
                Refund Amount <span className="text-red-500">*</span>
              </label>
              <Input
                id="refund-amount"
                type="number"
                step="0.01"
                min="0.01"
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
                placeholder="0.00"
                disabled={isGeneratingRefund}
                className="w-full"
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter the refund amount that will be included in the next payroll cycle.
                {selectedClaim.approvedAmount !== undefined && selectedClaim.approvedAmount !== null && (
                  <span className="block mt-1">
                    Approved amount: <strong>{formatCurrency(selectedClaim.approvedAmount)}</strong>
                  </span>
                )}
              </p>
            </div>

            <div>
              <label htmlFor="refund-description" className="block text-sm font-medium text-gray-700 mb-1">
                Refund Description <span className="text-red-500">*</span>
              </label>
              <textarea
                id="refund-description"
                value={refundDescription}
                onChange={(e) => setRefundDescription(e.target.value)}
                placeholder="Describe the refund reason and details..."
                disabled={isGeneratingRefund}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
              <p className="text-xs text-gray-500 mt-1">
                Minimum 5 characters. This description will be included in the refund record.
              </p>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-xs text-yellow-800">
                <strong>Refund Status:</strong> The refund will be created with status "Pending" and will remain pending until it is executed in the payroll cycle. Once the payroll cycle is executed, the refund status will be updated to "Paid".
              </p>
              <p className="text-xs text-yellow-800 mt-2">
                <strong>Payroll Integration:</strong> Pending refunds are automatically included in the next payroll cycle calculation and will be added to the employee's net pay.
              </p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

