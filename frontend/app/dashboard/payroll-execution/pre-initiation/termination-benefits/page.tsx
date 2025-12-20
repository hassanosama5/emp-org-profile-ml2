"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useRequireAuth } from "@/lib/hooks/use-auth";
import { SystemRole } from "@/types";
import { Card } from "../../../../../components/shared/ui/Card";
import { Button } from "../../../../../components/shared/ui/Button";
import { Input } from "../../../../../components/shared/ui/Input";
import { payrollExecutionApi } from "../../../../../lib/api/payroll-execution/payroll-execution";
import { EmployeeTerminationBenefit, BenefitStatus, TerminationBenefitReviewDto, TerminationBenefitEditDto } from "../../../../../types/payroll-execution";
import Link from "next/link";
import { Modal } from "../../../../../components/leaves/Modal";
import { Toast, useToast } from "../../../../../components/leaves/Toast";
import { CheckCircle, XCircle, Edit2, DollarSign, Shield } from "lucide-react";

export default function TerminationBenefitsPage() {
  const router = useRouter();
  // Only Payroll Specialist can review and approve termination benefits
  useRequireAuth(SystemRole.PAYROLL_SPECIALIST);
  const [benefits, setBenefits] = useState<EmployeeTerminationBenefit[]>([]);
  const [filteredBenefits, setFilteredBenefits] = useState<EmployeeTerminationBenefit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<BenefitStatus | "ALL">("ALL");
  
  // Modal states
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedBenefit, setSelectedBenefit] = useState<EmployeeTerminationBenefit | null>(null);
  const [reviewStatus, setReviewStatus] = useState<BenefitStatus>(BenefitStatus.PENDING);
  const [editAmount, setEditAmount] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  
  // Confirmation dialog states
  const [showConfirmEdit, setShowConfirmEdit] = useState(false);
  const [showConfirmReview, setShowConfirmReview] = useState(false);
  
  // Toast notification
  const { toast, showToast, hideToast } = useToast();

  useEffect(() => {
    fetchTerminationBenefits();
  }, []);

  useEffect(() => {
    filterBenefits();
  }, [benefits, searchTerm, statusFilter]);

  const fetchTerminationBenefits = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await payrollExecutionApi.getTerminationBenefits();
      const benefitsArray = Array.isArray(data) ? data : [];
      
      // Debug: Log the first benefit to see the structure
      if (benefitsArray.length > 0) {
        console.log("Sample termination benefit:", benefitsArray[0]);
        console.log("terminationId structure:", benefitsArray[0].terminationId);
      }
      
      setBenefits(benefitsArray);
    } catch (err: any) {
      console.error("Error fetching termination benefits:", err);
      setError(err.message || "Failed to fetch termination benefits");
      setBenefits([]);
    } finally {
      setLoading(false);
    }
  };

  const filterBenefits = () => {
    let filtered = [...benefits];

    // Filter by status
    if (statusFilter !== "ALL") {
      filtered = filtered.filter((benefit) => benefit.status === statusFilter);
    }

    // Filter by search term
    if (searchTerm && searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim();
      filtered = filtered.filter((benefit) => {
        try {
          // Safely extract employee information
          let employeeName = "";
          let employeeId = "";
          
          if (benefit && benefit.employeeId) {
            if (typeof benefit.employeeId === "object" && benefit.employeeId !== null) {
              // Populated employee object
              const firstName = (benefit.employeeId as any).firstName || "";
              const lastName = (benefit.employeeId as any).lastName || "";
              employeeName = `${firstName} ${lastName}`.trim().toLowerCase();
              
              // Check employeeNumber (HR/Payroll number)
              const empNumber = (benefit.employeeId as any).employeeNumber || "";
              // Check employee _id (ObjectId)
              const empId = (benefit.employeeId as any)._id ? String((benefit.employeeId as any)._id).toLowerCase() : "";
              // Combine both for search
              employeeId = empNumber ? String(empNumber).toLowerCase() : empId;
            } else if (typeof benefit.employeeId === "string") {
              // Just an ID string - search by ObjectId
              employeeId = benefit.employeeId.toLowerCase();
            }
          }
          
          // Also check the benefit ID itself
          const benefitId = benefit._id ? String(benefit._id).toLowerCase() : "";
          
          return (
            (employeeName && employeeName.includes(searchLower)) ||
            (employeeId && employeeId.includes(searchLower)) ||
            (benefitId && benefitId.includes(searchLower))
          );
        } catch (error) {
          // If there's any error filtering, exclude this item from results
          console.warn("Error filtering benefit:", error, benefit);
          return false;
        }
      });
    }

    setFilteredBenefits(filtered);
  };

  const getStatusBadgeColor = (status: BenefitStatus) => {
    switch (status) {
      case BenefitStatus.APPROVED:
        return "bg-green-100 text-green-800";
      case BenefitStatus.REJECTED:
        return "bg-red-100 text-red-800";
      case BenefitStatus.PAID:
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-yellow-100 text-yellow-800";
    }
  };

  const getBenefitType = (benefit: EmployeeTerminationBenefit) => {
    // Debug: Log the terminationId to see what we're working with
    console.log('Benefit terminationId:', benefit.terminationId);
    
    if (benefit.terminationId && typeof benefit.terminationId === "object" && benefit.terminationId !== null) {
      const termination = benefit.terminationId as any;
      
      // Derive type from initiator field
      // If initiator is 'employee', it's a RESIGNATION
      // If initiator is 'hr' or 'manager', it's a TERMINATION
      const initiator = termination.initiator;
      
      console.log('Initiator value:', initiator);
      
      if (initiator) {
        const initiatorLower = String(initiator).toLowerCase();
        if (initiatorLower === 'employee') {
          return 'RESIGNATION';
        } else if (initiatorLower === 'hr' || initiatorLower === 'manager') {
          return 'TERMINATION';
        }
      }
      
      // If type field exists (for backward compatibility)
      if (termination.type) {
        return termination.type;
      }
    } else if (benefit.terminationId && typeof benefit.terminationId === "string") {
      // If terminationId is just a string (not populated), we can't determine the type
      console.warn('terminationId is not populated, cannot determine benefit type');
    }
    
    return "Unknown";
  };

  // Open review modal
  const handleOpenReview = (benefit: EmployeeTerminationBenefit) => {
    setSelectedBenefit(benefit);
    setReviewStatus(BenefitStatus.PENDING);
    setModalError(null);
    setReviewModalOpen(true);
  };

  // Open edit modal
  const handleOpenEdit = (benefit: EmployeeTerminationBenefit) => {
    setSelectedBenefit(benefit);
    setEditAmount(benefit.givenAmount);
    setModalError(null);
    setEditModalOpen(true);
  };

  // Close modals
  const handleCloseModals = () => {
    setReviewModalOpen(false);
    setEditModalOpen(false);
    setSelectedBenefit(null);
    setModalError(null);
  };

  // Handle review submission - show confirmation first
  const handleReviewSubmitClick = () => {
    if (!selectedBenefit) return;

    if (selectedBenefit.status !== BenefitStatus.PENDING) {
      setModalError("Only pending termination benefits can be reviewed.");
      return;
    }

    // Show confirmation dialog
    setShowConfirmReview(true);
  };

  // Actual review submission after confirmation
  const handleReviewSubmit = async () => {
    if (!selectedBenefit) return;

    setShowConfirmReview(false);
    setIsSubmitting(true);
    setModalError(null);

    try {
      const reviewDto: TerminationBenefitReviewDto = {
        employeeTerminationResignationId: selectedBenefit._id,
        status: reviewStatus,
      };

      await payrollExecutionApi.reviewTerminationBenefit(reviewDto);
      await fetchTerminationBenefits(); // Refresh the list
      handleCloseModals();
      
      // Show success toast
      const actionText = reviewStatus === BenefitStatus.APPROVED ? "approved" : "rejected";
      showToast(`Termination benefit ${actionText} successfully!`, "success");
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || "Failed to review termination benefit";
      setModalError(errorMessage);
      showToast(errorMessage, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle edit submission - show confirmation first
  const handleEditSubmitClick = () => {
    if (!selectedBenefit) return;

    if (editAmount < 0) {
      setModalError("Given amount cannot be negative.");
      return;
    }

    // Show confirmation dialog
    setShowConfirmEdit(true);
  };

  // Actual edit submission after confirmation
  const handleEditSubmit = async () => {
    if (!selectedBenefit) return;

    setShowConfirmEdit(false);
    setIsSubmitting(true);
    setModalError(null);

    try {
      const editDto: TerminationBenefitEditDto = {
        employeeTerminationResignationId: selectedBenefit._id,
        givenAmount: editAmount,
      };

      await payrollExecutionApi.editTerminationBenefit(editDto);
      await fetchTerminationBenefits(); // Refresh the list
      handleCloseModals();
      
      // Show success toast
      showToast(`Termination benefit amount updated to $${editAmount.toFixed(2)} successfully!`, "success");
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || "Failed to edit termination benefit";
      setModalError(errorMessage);
      showToast(errorMessage, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Toast Notification */}
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
      />
      
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Termination Benefits Review</h1>
            <p className="text-gray-600">
              As a Payroll Specialist, review and approve processed benefits upon resignation. Approve or reject termination/resignation benefits based on eligibility and compliance.
            </p>
          </div>
          <Link href="/dashboard/payroll-execution/pre-initiation">
            <Button className="bg-gray-500 hover:bg-gray-600">Back</Button>
          </Link>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Filters */}
      <Card className="p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Search</label>
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="Search by employee name or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    filterBenefits();
                  }
                }}
                className="flex-1"
              />
              <Button
                onClick={filterBenefits}
                className="bg-blue-600 hover:bg-blue-700 whitespace-nowrap"
              >
                Search
              </Button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Status Filter</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as BenefitStatus | "ALL")}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Statuses</option>
              <option value={BenefitStatus.PENDING}>Pending</option>
              <option value={BenefitStatus.APPROVED}>Approved</option>
              <option value={BenefitStatus.REJECTED}>Rejected</option>
              <option value={BenefitStatus.PAID}>Paid</option>
            </select>
          </div>
          <div className="flex items-end">
            <Button
              onClick={() => {
                setSearchTerm("");
                setStatusFilter("ALL");
              }}
              className="w-full bg-gray-500 hover:bg-gray-600"
            >
              Clear Filters
            </Button>
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card className="p-6">
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> Only termination/resignation benefits with <span className="font-semibold">PENDING</span> status can be reviewed and approved/rejected. 
            Approved, rejected, or paid benefits are read-only.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Employee Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Employee ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Benefit Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Given Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredBenefits.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    No termination benefits found
                  </td>
                </tr>
              ) : (
                filteredBenefits.map((benefit) => (
                  <tr key={benefit._id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {benefit.employeeId && typeof benefit.employeeId === "object" && benefit.employeeId !== null
                        ? `${benefit.employeeId.firstName || ""} ${benefit.employeeId.lastName || ""}`.trim() || "N/A"
                        : typeof benefit.employeeId === "string"
                        ? `Employee ID: ${benefit.employeeId}`
                        : "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {benefit.employeeId && typeof benefit.employeeId === "object" && benefit.employeeId !== null
                        ? benefit.employeeId.employeeNumber || (benefit.employeeId._id ? String(benefit.employeeId._id) : "N/A")
                        : typeof benefit.employeeId === "string"
                        ? benefit.employeeId
                        : "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getBenefitType(benefit)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      ${benefit.givenAmount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeColor(
                          benefit.status
                        )}`}
                      >
                        {benefit.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex gap-2 flex-wrap">
                        {benefit.status === BenefitStatus.PENDING ? (
                          <>
                            <Button
                              onClick={() => handleOpenReview(benefit)}
                              className="bg-blue-600 hover:bg-blue-700 text-sm flex items-center gap-1"
                            >
                              <CheckCircle className="h-3 w-3" />
                              Review
                            </Button>
                            <Button
                              onClick={() => handleOpenEdit(benefit)}
                              className="bg-yellow-600 hover:bg-yellow-700 text-sm flex items-center gap-1"
                            >
                              <Edit2 className="h-3 w-3" />
                              Edit Amount
                            </Button>
                          </>
                        ) : (
                          <>
                            <span className="text-gray-500 text-xs flex items-center">
                              {benefit.status === BenefitStatus.APPROVED ? (
                                <>
                                  <CheckCircle className="h-3 w-3 mr-1 text-green-600" />
                                  Approved
                                </>
                              ) : benefit.status === BenefitStatus.REJECTED ? (
                                <>
                                  <XCircle className="h-3 w-3 mr-1 text-red-600" />
                                  Rejected
                                </>
                              ) : benefit.status === BenefitStatus.PAID ? (
                                <>
                                  <DollarSign className="h-3 w-3 mr-1 text-blue-600" />
                                  Paid
                                </>
                              ) : (
                                'N/A'
                              )}
                            </span>
                            {/* Allow editing amount even for approved/rejected items */}
                            <Button
                              onClick={() => handleOpenEdit(benefit)}
                              className="bg-gray-500 hover:bg-gray-600 text-sm flex items-center gap-1"
                              variant="outline"
                            >
                              <Edit2 className="h-3 w-3" />
                              Edit Amount
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Review Modal */}
      <Modal
        isOpen={reviewModalOpen}
        onClose={handleCloseModals}
        title="Review & Approve/Reject Termination Benefit"
        size="md"
        footer={
          <>
            <Button
              onClick={handleCloseModals}
              disabled={isSubmitting}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              onClick={handleReviewSubmitClick}
              disabled={isSubmitting || !selectedBenefit || selectedBenefit.status !== BenefitStatus.PENDING}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isSubmitting ? "Submitting..." : "Submit Review"}
            </Button>
          </>
        }
      >
        {selectedBenefit && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Employee Name
                </label>
                <p className="text-gray-900">
                  {selectedBenefit.employeeId && typeof selectedBenefit.employeeId === "object" && selectedBenefit.employeeId !== null
                    ? `${selectedBenefit.employeeId.firstName || ""} ${selectedBenefit.employeeId.lastName || ""}`.trim() || "N/A"
                    : "N/A"}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Employee ID
                </label>
                <p className="text-gray-900">
                  {selectedBenefit.employeeId && typeof selectedBenefit.employeeId === "object" && selectedBenefit.employeeId !== null
                    ? selectedBenefit.employeeId.employeeNumber || "N/A"
                    : "N/A"}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Benefit Type
                </label>
                <p className="text-gray-900">
                  {getBenefitType(selectedBenefit)}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Current Amount
                </label>
                <p className="text-gray-900 font-semibold">
                  ${selectedBenefit.givenAmount.toFixed(2)}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Current Status
                </label>
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeColor(selectedBenefit.status)}`}>
                  {selectedBenefit.status}
                </span>
              </div>
            </div>

            {modalError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {modalError}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Review Decision <span className="text-red-500">*</span>
              </label>
              <div className="space-y-2">
                <label className="flex items-center p-3 border border-gray-300 rounded-md hover:bg-gray-50 cursor-pointer">
                  <input
                    type="radio"
                    name="reviewStatus"
                    value={BenefitStatus.APPROVED}
                    checked={reviewStatus === BenefitStatus.APPROVED}
                    onChange={(e) => setReviewStatus(e.target.value as BenefitStatus)}
                    className="mr-3"
                  />
                  <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                  <span className="font-medium text-green-700">Approve</span>
                </label>
                <label className="flex items-center p-3 border border-gray-300 rounded-md hover:bg-gray-50 cursor-pointer">
                  <input
                    type="radio"
                    name="reviewStatus"
                    value={BenefitStatus.REJECTED}
                    checked={reviewStatus === BenefitStatus.REJECTED}
                    onChange={(e) => setReviewStatus(e.target.value as BenefitStatus)}
                    className="mr-3"
                  />
                  <XCircle className="h-4 w-4 mr-2 text-red-600" />
                  <span className="font-medium text-red-700">Reject</span>
                </label>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Edit Amount Modal */}
      <Modal
        isOpen={editModalOpen}
        onClose={handleCloseModals}
        title="Edit Given Amount"
        size="sm"
        footer={
          <>
            <Button
              onClick={handleCloseModals}
              disabled={isSubmitting}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              onClick={handleEditSubmitClick}
              disabled={isSubmitting || editAmount < 0}
              className="bg-yellow-600 hover:bg-yellow-700"
            >
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </>
        }
      >
        {selectedBenefit && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Employee Name
              </label>
              <p className="text-gray-900">
                {selectedBenefit.employeeId && typeof selectedBenefit.employeeId === "object" && selectedBenefit.employeeId !== null
                  ? `${selectedBenefit.employeeId.firstName || ""} ${selectedBenefit.employeeId.lastName || ""}`.trim() || "N/A"
                  : "N/A"}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Benefit Type
              </label>
              <p className="text-gray-900">
                {getBenefitType(selectedBenefit)}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Given Amount <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editAmount}
                  onChange={(e) => setEditAmount(parseFloat(e.target.value) || 0)}
                  className="pl-10"
                  required
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Current amount: ${selectedBenefit.givenAmount.toFixed(2)}
              </p>
            </div>

            {modalError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
                {modalError}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Confirmation Modal for Edit Amount */}
      <Modal
        isOpen={showConfirmEdit}
        onClose={() => setShowConfirmEdit(false)}
        title="Confirm Amount Change"
        size="sm"
        footer={
          <>
            <Button
              onClick={() => setShowConfirmEdit(false)}
              disabled={isSubmitting}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              onClick={handleEditSubmit}
              disabled={isSubmitting}
              className="bg-yellow-600 hover:bg-yellow-700"
            >
              {isSubmitting ? "Saving..." : "Confirm Change"}
            </Button>
          </>
        }
      >
        {selectedBenefit && (
          <div className="space-y-4">
            <p className="text-gray-700">
              Are you sure you want to change the termination benefit amount?
            </p>
            <div className="bg-gray-50 p-4 rounded-md space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Current Amount:</span>
                <span className="font-semibold text-gray-900">
                  ${selectedBenefit.givenAmount.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">New Amount:</span>
                <span className="font-semibold text-yellow-600">
                  ${editAmount.toFixed(2)}
                </span>
              </div>
              <div className="border-t pt-2 mt-2 flex justify-between">
                <span className="text-sm font-medium text-gray-700">Difference:</span>
                <span className={`font-semibold ${editAmount - selectedBenefit.givenAmount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ${(editAmount - selectedBenefit.givenAmount).toFixed(2)}
                </span>
              </div>
            </div>
            <p className="text-xs text-gray-500">
              This action will update the termination benefit amount for this employee.
            </p>
          </div>
        )}
      </Modal>

      {/* Confirmation Modal for Review (Approve/Reject) */}
      <Modal
        isOpen={showConfirmReview}
        onClose={() => setShowConfirmReview(false)}
        title={`Confirm ${reviewStatus === BenefitStatus.APPROVED ? 'Approval' : 'Rejection'}`}
        size="sm"
        footer={
          <>
            <Button
              onClick={() => setShowConfirmReview(false)}
              disabled={isSubmitting}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              onClick={handleReviewSubmit}
              disabled={isSubmitting}
              className={reviewStatus === BenefitStatus.APPROVED 
                ? "bg-green-600 hover:bg-green-700" 
                : "bg-red-600 hover:bg-red-700"}
            >
              {isSubmitting 
                ? "Processing..." 
                : reviewStatus === BenefitStatus.APPROVED 
                  ? "Confirm Approval" 
                  : "Confirm Rejection"}
            </Button>
          </>
        }
      >
        {selectedBenefit && (
          <div className="space-y-4">
            <p className="text-gray-700">
              Are you sure you want to <strong>{reviewStatus === BenefitStatus.APPROVED ? 'approve' : 'reject'}</strong> this termination benefit?
            </p>
            <div className="bg-gray-50 p-4 rounded-md space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Employee:</span>
                <span className="font-semibold text-gray-900">
                  {selectedBenefit.employeeId && typeof selectedBenefit.employeeId === "object" && selectedBenefit.employeeId !== null
                    ? `${selectedBenefit.employeeId.firstName || ""} ${selectedBenefit.employeeId.lastName || ""}`.trim() || "N/A"
                    : "N/A"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Benefit Type:</span>
                <span className="font-semibold text-gray-900">
                  {getBenefitType(selectedBenefit)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Amount:</span>
                <span className="font-semibold text-gray-900">
                  ${selectedBenefit.givenAmount.toFixed(2)}
                </span>
              </div>
            </div>
            {reviewStatus === BenefitStatus.REJECTED && (
              <p className="text-xs text-red-600 font-medium">
                ⚠️ This action cannot be easily undone. Please ensure this is the correct decision.
              </p>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

