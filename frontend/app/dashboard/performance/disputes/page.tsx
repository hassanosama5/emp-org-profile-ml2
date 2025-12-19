"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/lib/hooks/use-auth";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { SystemRole } from "@/types";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/shared/ui/Card";
import { Button } from "@/components/shared/ui/Button";
import {
  fetchDisputes,
  fetchDisputeById,
  resolveDisputeApi,
} from "@/lib/api/performance/Api/performanceDisputesApi";
import {
  AppraisalDispute,
  ResolveDisputeInput,
  APPRAISAL_DISPUTE_STATUSES,
} from "@/components/Performance/performanceDisputes";
import {
  fetchAppraisalById,
} from "@/lib/api/performance/Api/performanceAppraisalsApi";

function getId(value: any): string | undefined {
  if (!value) return undefined;
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    // Handle ObjectId objects (MongoDB)
    if (value._id) {
      // If _id is an object with toString method (MongoDB ObjectId)
      if (typeof value._id === "object" && value._id.toString) {
        return value._id.toString();
      }
      // If _id is already a string
      if (typeof value._id === "string") {
        return value._id;
      }
    }
    // Try id field
    if (value.id) {
      if (typeof value.id === "object" && value.id.toString) {
        return value.id.toString();
      }
      if (typeof value.id === "string") {
        return value.id;
      }
    }
    // Try toString method
    if (value.toString && typeof value.toString === "function") {
      const str = value.toString();
      if (str && str !== "[object Object]") {
        return str;
      }
    }
  }
  return undefined;
}

function formatDate(value?: string | Date): string {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString();
}

function formatDisputeStatus(status?: string): string {
  if (!status) return "Unknown";
  switch (status) {
    case "OPEN":
      return "Open";
    case "UNDER_REVIEW":
      return "Under Review";
    case "ADJUSTED":
      return "Adjusted";
    case "REJECTED":
      return "Rejected";
    default:
      return status;
  }
}

function getStatusColor(status?: string): string {
  switch (status) {
    case "OPEN":
      return "bg-yellow-100 text-yellow-800";
    case "UNDER_REVIEW":
      return "bg-blue-100 text-blue-800";
    case "ADJUSTED":
      return "bg-green-100 text-green-800";
    case "REJECTED":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

export default function DisputesPage() {
  const { user } = useAuth();
  const [disputes, setDisputes] = useState<AppraisalDispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDispute, setSelectedDispute] = useState<AppraisalDispute | null>(null);
  const [appraisalDetails, setAppraisalDetails] = useState<any>(null);
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [cycleId, setCycleId] = useState<string>("");
  
  // Resolution form state
  const [resolving, setResolving] = useState(false);
  const [resolutionStatus, setResolutionStatus] = useState<"ADJUSTED" | "REJECTED">("REJECTED");
  const [resolutionComment, setResolutionComment] = useState("");
  const [resolutionError, setResolutionError] = useState<string | null>(null);

  useEffect(() => {
    loadDisputes();
  }, [filterStatus, cycleId]);

  const loadDisputes = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params: { status?: string; cycleId?: string } = {};
      if (filterStatus) params.status = filterStatus;
      if (cycleId) params.cycleId = cycleId;
      
      const data = await fetchDisputes(params);
      setDisputes(data || []);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Failed to load disputes");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectDispute = async (dispute: AppraisalDispute) => {
    setSelectedDispute(dispute);
    setResolutionError(null);
    setResolutionComment("");
    setResolutionStatus("REJECTED");
    
    // Debug: Log dispute structure
    const disputeId = getId(dispute);
    console.log("Selected dispute:", {
      dispute,
      disputeId,
      hasId: !!dispute.id,
      has_id: !!dispute._id,
      idValue: dispute.id,
      _idValue: dispute._id,
    });
    
    // Load appraisal details
    try {
      const appraisalId = getId(dispute.appraisalId);
      if (appraisalId) {
        const appraisal = await fetchAppraisalById(appraisalId);
        setAppraisalDetails(appraisal);
      }
    } catch (err) {
      console.error("Failed to load appraisal details:", err);
    }
  };

  const handleResolveDispute = async () => {
    if (!selectedDispute) return;
    
    const employeeProfileId = user?.id || user?.userId || (user as any)?.employeeProfileId;
    if (!employeeProfileId) {
      setResolutionError("Could not determine your employee profile ID");
      return;
    }

    if (!resolutionComment.trim()) {
      setResolutionError("Please provide a resolution comment");
      return;
    }

    try {
      setResolving(true);
      setResolutionError(null);

      // Extract dispute ID - try multiple possible fields
      let disputeId: string | undefined = undefined;
      
      // Try _id first (MongoDB standard)
      if (selectedDispute._id) {
        if (typeof selectedDispute._id === "string") {
          disputeId = selectedDispute._id;
        } else if (typeof selectedDispute._id === "object" && (selectedDispute._id as any).toString) {
          disputeId = (selectedDispute._id as any).toString();
        }
      }
      
      // Fallback to id field
      if (!disputeId && selectedDispute.id) {
        if (typeof selectedDispute.id === "string") {
          disputeId = selectedDispute.id;
        } else if (typeof selectedDispute.id === "object" && (selectedDispute.id as any).toString) {
          disputeId = (selectedDispute.id as any).toString();
        }
      }
      
      // Last resort: use getId helper
      if (!disputeId) {
        disputeId = getId(selectedDispute);
      }
      
      if (!disputeId) {
        setResolutionError("Could not determine dispute ID. Please refresh and try again.");
        setResolving(false);
        return;
      }

      // Ensure disputeId is a valid MongoDB ObjectId format (24 hex characters)
      if (!/^[a-fA-F0-9]{24}$/.test(disputeId)) {
        setResolutionError(`Invalid dispute ID format: ${disputeId}. Please refresh and try again.`);
        setResolving(false);
        return;
      }

      // Verify dispute still exists in our list
      const disputeInList = disputes.find(d => {
        const dId = getId(d);
        return dId === disputeId;
      });
      
      if (!disputeInList) {
        setResolutionError("Dispute no longer exists in the list. Please refresh the page and try again.");
        setResolving(false);
        return;
      }

      const input: ResolveDisputeInput = {
        status: resolutionStatus,
        resolutionSummary: resolutionComment.trim(),
      };

      const resolved = await resolveDisputeApi(disputeId, employeeProfileId, input);
      
      // Update disputes list
      setDisputes(prev => prev.map(d => {
        const id = getId(d);
        return id === disputeId ? resolved : d;
      }));
      
      setSelectedDispute(resolved);
      setResolutionComment("");
      setResolutionStatus("REJECTED");
      
      // Reload disputes to get updated list
      await loadDisputes();
    } catch (err: any) {
      console.error("Error resolving dispute:", err);
      const errorMessage = err?.response?.data?.message || err?.message || "Failed to resolve dispute";
      
      // Provide more specific error messages
      if (errorMessage.includes("not found") || errorMessage.includes("Dispute not found")) {
        setResolutionError(
          `Dispute not found. The dispute may have been deleted or the ID is incorrect. Please refresh the page and try again. (ID: ${selectedDispute._id || selectedDispute.id || 'unknown'})`
        );
      } else {
        setResolutionError(errorMessage);
      }
    } finally {
      setResolving(false);
    }
  };

  const canResolve = (dispute: AppraisalDispute): boolean => {
    const status = dispute.status;
    return status === "OPEN" || status === "UNDER_REVIEW";
  };

  return (
    <ProtectedRoute
      allowedRoles={[SystemRole.HR_MANAGER, SystemRole.HR_ADMIN]}
    >
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Appraisal Disputes
          </h1>
          <p className="text-gray-600 mt-1">
            Review and resolve employee concerns about appraisal ratings. Select a dispute to view details and provide a resolution.
          </p>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">Filters</CardTitle>
            <CardDescription>
              Filter disputes by status or cycle ID
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Filter by Status
                </label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="">All Statuses</option>
                  {APPRAISAL_DISPUTE_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {formatDisputeStatus(status)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Filter by Cycle ID
                </label>
                <input
                  type="text"
                  value={cycleId}
                  onChange={(e) => setCycleId(e.target.value)}
                  placeholder="Enter cycle ID..."
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="flex items-end">
                <Button
                  onClick={loadDisputes}
                  variant="outline"
                  className="w-full"
                >
                  Refresh
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {error && (
          <Card className="border-red-200 bg-red-50 mb-4">
            <CardContent className="pt-6">
              <p className="text-sm text-red-800">{error}</p>
            </CardContent>
          </Card>
        )}

        {loading ? (
          <Card>
            <CardContent className="pt-6">
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-gray-600">Loading disputes…</span>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-6">
            {/* Left: Disputes List */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Disputes ({disputes.length})
                </CardTitle>
                <CardDescription>
                  Select a dispute to review and resolve
                </CardDescription>
              </CardHeader>
              <CardContent>
                {disputes.length === 0 ? (
                  <p className="text-sm text-gray-600">
                    No disputes found
                  </p>
                ) : (
                  <ul className="divide-y divide-gray-200">
                    {disputes.map((dispute, index) => {
                      const id = getId(dispute) || `${index}`;
                      const isSelected = selectedDispute && getId(selectedDispute) === id;
                      
                      return (
                        <li key={id}>
                          <button
                            type="button"
                            onClick={() => handleSelectDispute(dispute)}
                            className={`w-full text-left px-3 py-3 text-sm ${
                              isSelected
                                ? "bg-blue-50 border-l-4 border-blue-500"
                                : "hover:bg-gray-50"
                            }`}
                          >
                            <div className="flex justify-between items-start gap-2">
                              <div className="flex-1">
                                <p className="font-medium text-gray-900">
                                  Employee ID: {dispute.employeeProfileId?.slice(-8) || "N/A"}
                                </p>
                                <p className="text-xs text-gray-500 mt-0.5">
                                  {formatDate(dispute.createdAt)}
                                </p>
                                <p className="text-xs text-gray-700 mt-1 line-clamp-2">
                                  {dispute.reason || "No reason provided"}
                                </p>
                              </div>
                              <span
                                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${getStatusColor(
                                  dispute.status
                                )}`}
                              >
                                {formatDisputeStatus(dispute.status)}
                              </span>
                            </div>
                            {canResolve(dispute) && (
                              <span className="inline-flex items-center mt-1 text-[10px] text-blue-600">
                                ⚠ Needs Resolution
                              </span>
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </CardContent>
            </Card>

            {/* Right: Dispute Details & Resolution */}
            <div className="space-y-4">
              {!selectedDispute ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      Select a Dispute
                    </CardTitle>
                    <CardDescription>
                      Choose a dispute from the list to view details and resolve it.
                    </CardDescription>
                  </CardHeader>
                </Card>
              ) : (
                <>
                  {/* Dispute Details */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">
                        Dispute Details
                      </CardTitle>
                      <CardDescription>
                        Review the employee's concern and appraisal details
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
                          Status
                        </p>
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${getStatusColor(
                            selectedDispute.status
                          )}`}
                        >
                          {formatDisputeStatus(selectedDispute.status)}
                        </span>
                      </div>

                      <div>
                        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
                          Submitted On
                        </p>
                        <p className="text-sm text-gray-800">
                          {formatDate(selectedDispute.createdAt)}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
                          Employee Concern
                        </p>
                        <p className="text-sm text-gray-800 whitespace-pre-line">
                          {selectedDispute.reason || "No reason provided"}
                        </p>
                      </div>

                      {selectedDispute.details && (
                        <div>
                          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
                            Additional Details
                          </p>
                          <p className="text-sm text-gray-800 whitespace-pre-line">
                            {selectedDispute.details}
                          </p>
                        </div>
                      )}

                      {appraisalDetails && (
                        <div className="border-t border-gray-200 pt-4">
                          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                            Appraisal Details
                          </p>
                          <div className="space-y-1 text-sm">
                            <p>
                              <span className="text-gray-600">Total Score:</span>{" "}
                              <span className="font-semibold">
                                {appraisalDetails.totalScore ?? "-"}
                              </span>
                            </p>
                            <p>
                              <span className="text-gray-600">Overall Rating:</span>{" "}
                              <span className="font-semibold">
                                {appraisalDetails.overallRatingLabel ?? "-"}
                              </span>
                            </p>
                            {appraisalDetails.managerSummary && (
                              <div>
                                <p className="text-gray-600 mb-1">Manager Summary:</p>
                                <p className="text-gray-800 whitespace-pre-line">
                                  {appraisalDetails.managerSummary}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {selectedDispute.resolutionSummary && (
                        <div className="border-t border-gray-200 pt-4">
                          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
                            Previous Resolution
                          </p>
                          <p className="text-sm text-gray-800 whitespace-pre-line">
                            {selectedDispute.resolutionSummary}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Resolution Form */}
                  {canResolve(selectedDispute) && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">
                          Resolve Dispute
                        </CardTitle>
                        <CardDescription>
                          Make a decision on this dispute
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {resolutionError && (
                          <div className="bg-red-50 border border-red-200 rounded-md p-3">
                            <p className="text-sm text-red-800">{resolutionError}</p>
                          </div>
                        )}

                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-2">
                            Resolution Decision
                          </label>
                          <div className="space-y-2">
                            <label className="flex items-center">
                              <input
                                type="radio"
                                value="ADJUSTED"
                                checked={resolutionStatus === "ADJUSTED"}
                                onChange={(e) => setResolutionStatus(e.target.value as "ADJUSTED")}
                                className="mr-2"
                              />
                              <span className="text-sm text-gray-800">
                                Adjust Rating - The employee's concern is valid, adjust the appraisal rating
                              </span>
                            </label>
                            <label className="flex items-center">
                              <input
                                type="radio"
                                value="REJECTED"
                                checked={resolutionStatus === "REJECTED"}
                                onChange={(e) => setResolutionStatus(e.target.value as "REJECTED")}
                                className="mr-2"
                              />
                              <span className="text-sm text-gray-800">
                                Reject - The original rating stands, no changes needed
                              </span>
                            </label>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-2">
                            Resolution Comment <span className="text-red-500">*</span>
                          </label>
                          <textarea
                            rows={4}
                            value={resolutionComment}
                            onChange={(e) => setResolutionComment(e.target.value)}
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                            placeholder="Explain your decision and any actions taken..."
                            required
                          />
                        </div>

                        <div className="flex gap-2 justify-end">
                          <Button
                            onClick={handleResolveDispute}
                            disabled={resolving || !resolutionComment.trim()}
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            {resolving ? "Resolving..." : "Submit Resolution"}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
