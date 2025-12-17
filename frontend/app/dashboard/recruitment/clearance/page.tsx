"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/hooks/use-auth";
import { useRequireAuth } from "@/lib/hooks/use-auth";
import { SystemRole } from "@/types";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/shared/ui/Card";
import { Button } from "@/components/shared/ui/Button";
import { recruitmentApi } from "@/lib/api/recruitment/recruitment";
import { ClearanceChecklist, ClearanceItem, UpdateClearanceItemStatusDto } from "@/types/recruitment";
import { StatusBadge } from "@/components/recruitment/StatusBadge";
import { Modal } from "@/components/leaves/Modal";
import { Toast, useToast } from "@/components/leaves/Toast";

export default function DepartmentHeadClearancePage() {
  const { user } = useAuth();
  useRequireAuth(SystemRole.DEPARTMENT_HEAD);
  const { toast, showToast, hideToast } = useToast();
  const [checklists, setChecklists] = useState<ClearanceChecklist[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChecklist, setSelectedChecklist] = useState<ClearanceChecklist | null>(null);
  const [selectedItemIndex, setSelectedItemIndex] = useState<number | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState<string>("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [status, setStatus] = useState<string>("pending");
  const [notes, setNotes] = useState<string>("");
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    loadChecklists();
  }, []);

  const loadChecklists = async () => {
    try {
      setLoading(true);
      // In a real implementation, you'd have an endpoint to get clearance checklists by department
      // For now, we'll show a message that checklists will appear here
      setChecklists([]);
    } catch (error: any) {
      showToast(error.message || "Failed to load clearance checklists", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenUpdate = (checklist: ClearanceChecklist, itemIndex: number) => {
    setSelectedChecklist(checklist);
    setSelectedItemIndex(itemIndex);
    const item = checklist.items[itemIndex];
    setSelectedDepartment(item.department || "");
    setStatus(item.status);
    setNotes(item.notes || (item as any).comments || "");
    setIsModalOpen(true);
  };

  const handleUpdateStatus = async () => {
    if (!selectedChecklist || !selectedDepartment) return;

    try {
      setUpdating(true);
      const updateData: UpdateClearanceItemStatusDto = {
        department: selectedDepartment,
        status: status,
        comments: notes.trim() || undefined,
      };

      await recruitmentApi.updateClearanceItemStatus(selectedChecklist._id, updateData);
      showToast("Clearance item updated successfully", "success");
      setIsModalOpen(false);
      setSelectedChecklist(null);
      setSelectedItemIndex(null);
      setSelectedDepartment("");
      setStatus("pending");
      setNotes("");
      loadChecklists();
    } catch (error: any) {
      showToast(error.message || "Failed to update clearance item", "error");
    } finally {
      setUpdating(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="container mx-auto px-6 py-8">
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
      />

      <div className="mb-8">
          <Link href="/dashboard/recruitment" className="text-blue-600 hover:underline mb-4 inline-block">
            ← Back to Recruitment
          </Link>
        <h1 className="text-3xl font-bold text-gray-900">Clearance Checklists</h1>
        <p className="text-gray-600 mt-1">Update clearance items for your department</p>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Loading clearance checklists...</p>
        </div>
      ) : checklists.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500 mb-4">No clearance checklists assigned to your department.</p>
            <p className="text-sm text-gray-400">
              Clearance checklists will appear here when employees from your department are being offboarded.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {checklists.map((checklist) => (
            <Card key={checklist._id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-xl">Clearance Checklist</CardTitle>
                    <p className="text-sm text-gray-600 mt-1">
                      Employee ID: {checklist.employeeId}
                    </p>
                  </div>
                  <StatusBadge status={checklist.status} type="application" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                    <div>
                      <span className="text-gray-500">Created:</span>
                      <span className="ml-2 text-gray-900">
                        {checklist.createdAt ? formatDate(checklist.createdAt) : "N/A"}
                      </span>
                    </div>
                    {checklist.completedAt && (
                      <div>
                        <span className="text-gray-500">Completed:</span>
                        <span className="ml-2 text-gray-900">
                          {formatDate(checklist.completedAt)}
                        </span>
                      </div>
                    )}
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Clearance Items</h3>
                    <div className="space-y-3">
                      {checklist.items.map((item, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <span className="font-medium text-gray-900">{item.item}</span>
                              <span className="text-xs text-gray-500">({item.department})</span>
                            </div>
                            {item.notes && (
                              <p className="text-sm text-gray-600 mt-1">{item.notes}</p>
                            )}
                            {item.completedAt && (
                              <p className="text-xs text-gray-500 mt-1">
                                Completed: {formatDate(item.completedAt)}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            <StatusBadge status={item.status} type="application" />
                            {item.status !== "approved" && (
                              <Button
                                size="sm"
                                onClick={() => handleOpenUpdate(checklist, index)}
                              >
                                Update
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Update Status Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedChecklist(null);
          setSelectedItemIndex(null);
          setStatus("pending");
          setNotes("");
        }}
        title="Update Clearance Item Status"
        size="md"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => {
                setIsModalOpen(false);
                setSelectedChecklist(null);
                setSelectedItemIndex(null);
                setStatus("pending");
                setNotes("");
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleUpdateStatus} disabled={updating}>
              {updating ? "Updating..." : "Update Status"}
            </Button>
          </>
        }
      >
        {selectedChecklist && selectedItemIndex !== null && (
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 mb-1">Item:</p>
              <p className="font-medium text-gray-900">
                {selectedChecklist.items[selectedItemIndex].item}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status *
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes (Optional)
              </label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes about this clearance item..."
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

