"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/hooks/use-auth";
import { SystemRole } from "@/types";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { employeeProfileApi } from "@/lib/api/employee-profile/employee-profile";
import { recruitmentApi } from "@/lib/api/recruitment/recruitment";
import { organizationStructureApi } from "@/lib/api/organization-structure/organization-structure";
import { Candidate } from "@/types";
import { Application } from "@/types/recruitment";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/shared/ui/Card";
import { Button } from "@/components/shared/ui/Button";
import { Input } from "@/components/shared/ui/Input";
import { Select } from "@/components/leaves/Select";
import { Modal } from "@/components/leaves/Modal";
import { Toast, useToast } from "@/components/leaves/Toast";
import { StatusBadge } from "@/components/recruitment/StatusBadge";

export default function TalentPoolPage() {
  const { user } = useAuth();
  const { toast, showToast, hideToast } = useToast();
  
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [filteredCandidates, setFilteredCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingApplications, setLoadingApplications] = useState<Record<string, boolean>>({});
  
  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [positionFilter, setPositionFilter] = useState("");
  
  // Dropdown data
  const [departments, setDepartments] = useState<any[]>([]);
  const [positions, setPositions] = useState<any[]>([]);
  
  // Modals
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isApplicationsModalOpen, setIsApplicationsModalOpen] = useState(false);
  const [candidateApplications, setCandidateApplications] = useState<Application[]>([]);
  const [viewingResume, setViewingResume] = useState<string | null>(null);

  // Candidate status options
  const candidateStatusOptions = [
    { value: "", label: "All Statuses" },
    { value: "APPLIED", label: "Applied" },
    { value: "SCREENING", label: "Screening" },
    { value: "INTERVIEW", label: "Interview" },
    { value: "OFFER_SENT", label: "Offer Sent" },
    { value: "OFFER_ACCEPTED", label: "Offer Accepted" },
    { value: "HIRED", label: "Hired" },
    { value: "REJECTED", label: "Rejected" },
    { value: "WITHDRAWN", label: "Withdrawn" },
  ];

  // Load dropdown data
  useEffect(() => {
    const loadDropdownData = async () => {
      try {
        const [deptsData, posData] = await Promise.all([
          organizationStructureApi.departments.getAllDepartments({ isActive: true }),
          organizationStructureApi.positions.getAllPositions({ isActive: true }),
        ]);
        
        // Handle different response formats
        const depts = Array.isArray(deptsData) ? deptsData : (deptsData as any)?.data || [];
        const pos = Array.isArray(posData) ? posData : (posData as any)?.data || [];
        
        setDepartments(depts);
        setPositions(pos);
      } catch (error: any) {
        console.error("Error loading dropdown data:", error);
      }
    };
    
    loadDropdownData();
  }, []);

  // Load candidates
  const loadCandidates = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = {};
      
      if (statusFilter) params.status = statusFilter;
      if (departmentFilter) params.departmentId = departmentFilter;
      if (positionFilter) params.positionId = positionFilter;
      if (searchTerm) params.search = searchTerm;
      
      console.log("🔍 Talent Pool: Loading candidates with params:", params);
      const data = await employeeProfileApi.getAllCandidates(params);
      console.log("✅ Talent Pool: Received candidates:", data);
      console.log("✅ Talent Pool: Number of candidates:", data.length);
      
      setCandidates(data);
      setFilteredCandidates(data);
      
      if (data.length === 0) {
        console.warn("⚠️ Talent Pool: No candidates found. This could mean:");
        console.warn("  1. No candidates exist in the database");
        console.warn("  2. API endpoint is not returning data correctly");
        console.warn("  3. Response format is different than expected");
      }
    } catch (error: any) {
      console.error("❌ Talent Pool: Error loading candidates:", error);
      
      // Provide more specific error messages
      const status = error?.status || error?.response?.status;
      let errorMessage = "Failed to load candidates";
      
      if (status === 401) {
        errorMessage = "Authentication failed. Please log in again.";
      } else if (status === 403) {
        errorMessage = "Permission denied. You need HR Employee, HR Manager, System Admin, or Recruiter role.";
      } else if (status === 404) {
        errorMessage = "Endpoint not found. Please check if the backend is running.";
      } else if (status === 500) {
        errorMessage = "Server error. Please check backend logs.";
      } else if (!status) {
        errorMessage = "Network error. Please check if the backend is running.";
      } else {
        errorMessage = error?.message || `HTTP ${status} error`;
      }
      
      showToast(errorMessage, "error");
      setCandidates([]);
      setFilteredCandidates([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, departmentFilter, positionFilter, searchTerm, showToast]);

  // Initial load
  useEffect(() => {
    loadCandidates();
  }, [loadCandidates]);

  // Filter candidates locally (for search term)
  useEffect(() => {
    if (!searchTerm && !statusFilter && !departmentFilter && !positionFilter) {
      setFilteredCandidates(candidates);
      return;
    }

    let filtered = [...candidates];

    // Search filter (if not using API search)
    if (searchTerm && !searchTerm.includes("@")) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter((candidate) => {
        const fullName = `${candidate.firstName || ""} ${candidate.lastName || ""}`.toLowerCase();
        const email = (candidate.personalEmail || "").toLowerCase();
        const candidateNumber = (candidate.candidateNumber || "").toLowerCase();
        
        return (
          fullName.includes(searchLower) ||
          email.includes(searchLower) ||
          candidateNumber.includes(searchLower)
        );
      });
    }

    // Status filter
    if (statusFilter) {
      filtered = filtered.filter((candidate) => candidate.status === statusFilter);
    }

    // Department filter
    if (departmentFilter) {
      filtered = filtered.filter((candidate) => {
        const deptId = typeof candidate.departmentId === "string" 
          ? candidate.departmentId 
          : candidate.departmentId?._id || candidate.department?._id;
        return deptId === departmentFilter;
      });
    }

    // Position filter
    if (positionFilter) {
      filtered = filtered.filter((candidate) => {
        const posId = typeof candidate.positionId === "string" 
          ? candidate.positionId 
          : candidate.positionId?._id || candidate.position?._id;
        return posId === positionFilter;
      });
    }

    setFilteredCandidates(filtered);
  }, [candidates, searchTerm, statusFilter, departmentFilter, positionFilter]);

  // Load applications for a candidate
  const loadCandidateApplications = async (candidateId: string) => {
    try {
      setLoadingApplications((prev) => ({ ...prev, [candidateId]: true }));
      const allApplications = await recruitmentApi.getApplications();
      const candidateApps = allApplications.filter((app) => {
        const appCandidateId = typeof app.candidateId === "string" 
          ? app.candidateId 
          : app.candidateId?._id;
        return appCandidateId === candidateId;
      });
      setCandidateApplications(candidateApps);
    } catch (error: any) {
      showToast(error.message || "Failed to load applications", "error");
    } finally {
      setLoadingApplications((prev) => ({ ...prev, [candidateId]: false }));
    }
  };

  // View candidate profile
  const handleViewProfile = (candidate: Candidate) => {
    setSelectedCandidate(candidate);
    setIsProfileModalOpen(true);
  };

  // View candidate applications
  const handleViewApplications = async (candidate: Candidate) => {
    setSelectedCandidate(candidate);
    setIsApplicationsModalOpen(true);
    await loadCandidateApplications(candidate._id);
  };

  // View resume - opens in new tab (handles URLs, file paths, and document IDs)
  // BR 12: Support viewing resumes from the talent pool
  const handleViewResume = async (candidate: Candidate) => {
    if (!candidate.resumeUrl) {
      showToast("No resume available for this candidate", "error");
      return;
    }

    try {
      setViewingResume(candidate._id);
      
      const resumeUrl = candidate.resumeUrl.trim();
      
      // Case 1: Full URL (http:// or https://) - open directly in new tab
      if (resumeUrl.startsWith("http://") || resumeUrl.startsWith("https://")) {
        const newWindow = window.open(resumeUrl, '_blank');
        if (!newWindow) {
          showToast("Popup blocked. Please allow popups to view the resume.", "error");
          setViewingResume(null);
          return;
        }
        showToast("Opening resume in new tab...", "success");
        setViewingResume(null);
        return;
      }
      
      // Case 2: File path (starts with / or contains uploads) - fetch with auth and open
      if (resumeUrl.startsWith("/") || resumeUrl.includes("uploads")) {
        const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1";
        const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') || '' : '';
        
        // Construct full URL
        const baseUrl = API_BASE_URL.replace('/api/v1', '');
        const fullUrl = `${baseUrl}${resumeUrl.startsWith('/') ? resumeUrl : '/' + resumeUrl}`;
        
        const response = await fetch(fullUrl, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch resume: ${response.statusText}`);
        }
        
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        
        const newWindow = window.open(blobUrl, '_blank');
        if (!newWindow) {
          window.URL.revokeObjectURL(blobUrl);
          showToast("Popup blocked. Please allow popups to view the resume.", "error");
          setViewingResume(null);
          return;
        }
        
        setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000);
        showToast("Opening resume in new tab...", "success");
        setViewingResume(null);
        return;
      }
      
      // Case 3: Document ID (MongoDB ObjectId format - 24 hex characters) - use document API
      if (/^[0-9a-fA-F]{24}$/.test(resumeUrl)) {
        try {
          const blob = await recruitmentApi.downloadDocument(resumeUrl);
          const blobUrl = window.URL.createObjectURL(blob);
          
          const newWindow = window.open(blobUrl, '_blank');
          if (!newWindow) {
            window.URL.revokeObjectURL(blobUrl);
            showToast("Popup blocked. Please allow popups to view the resume.", "error");
            setViewingResume(null);
            return;
          }
          
          setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000);
          showToast("Opening resume in new tab...", "success");
          setViewingResume(null);
          return;
        } catch (docError: any) {
          console.error("Error fetching document:", docError);
          throw new Error("Failed to retrieve document. It may have been deleted or is inaccessible.");
        }
      }
      
      // If we get here, the format is unrecognized
      throw new Error("Unrecognized resume URL format. Please contact support.");
      
    } catch (error: any) {
      console.error("Error viewing resume:", error);
      showToast(error.message || "Failed to view resume", "error");
      setViewingResume(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "HIRED":
        return "bg-green-100 text-green-800";
      case "OFFER_ACCEPTED":
        return "bg-blue-100 text-blue-800";
      case "OFFER_SENT":
        return "bg-purple-100 text-purple-800";
      case "INTERVIEW":
        return "bg-yellow-100 text-yellow-800";
      case "SCREENING":
        return "bg-orange-100 text-orange-800";
      case "REJECTED":
        return "bg-red-100 text-red-800";
      case "WITHDRAWN":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <ProtectedRoute
      allowedRoles={[SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.SYSTEM_ADMIN, SystemRole.RECRUITER]}
    >
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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Talent Pool</h1>
              <p className="text-gray-600 mt-1">
                Browse and manage all candidates in the organization's talent pool
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="lg:col-span-2">
                <Input
                  placeholder="Search by name, email, or candidate number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full"
                />
              </div>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                options={candidateStatusOptions}
                className="w-full"
              />
              <Select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                options={[
                  { value: "", label: "All Departments" },
                  ...departments.map((dept) => ({
                    value: dept._id || dept.id,
                    label: dept.name || dept.title,
                  })),
                ]}
                className="w-full"
              />
              <Select
                value={positionFilter}
                onChange={(e) => setPositionFilter(e.target.value)}
                options={[
                  { value: "", label: "All Positions" },
                  ...positions.map((pos) => ({
                    value: pos._id || pos.id,
                    label: pos.title || pos.name,
                  })),
                ]}
                className="w-full"
              />
            </div>
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Showing {filteredCandidates.length} of {candidates.length} candidates
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("");
                  setDepartmentFilter("");
                  setPositionFilter("");
                }}
              >
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Candidates Grid */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading candidates...</p>
          </div>
        ) : filteredCandidates.length === 0 && candidates.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-500 mb-2">No candidates found in the talent pool.</p>
              <p className="text-sm text-gray-400 mb-4">
                This could mean there are no candidates registered in the system yet.
              </p>
              <div className="text-xs text-gray-400 space-y-1">
                <p>• Check the browser console for API response details</p>
                <p>• Verify candidates exist in the database</p>
                <p>• Ensure you have the correct permissions (HR Employee, HR Manager, System Admin, or Recruiter)</p>
              </div>
            </CardContent>
          </Card>
        ) : filteredCandidates.length === 0 && candidates.length > 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-500 mb-2">No candidates match your current filters.</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("");
                  setDepartmentFilter("");
                  setPositionFilter("");
                }}
              >
                Clear Filters
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCandidates.map((candidate) => {
              const department = typeof candidate.department === "object" 
                ? candidate.department?.name 
                : typeof candidate.departmentId === "object"
                ? candidate.departmentId?.name
                : "N/A";
              
              const position = typeof candidate.position === "object" 
                ? candidate.position?.title 
                : typeof candidate.positionId === "object"
                ? candidate.positionId?.title
                : "N/A";

              return (
                <Card key={candidate._id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">
                          {candidate.firstName} {candidate.lastName}
                        </h3>
                        <p className="text-sm text-gray-600 mb-2">
                          {candidate.candidateNumber}
                        </p>
                        <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(candidate.status)}`}>
                          {candidate.status.replace(/_/g, " ")}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase">Contact</p>
                        <p className="text-sm text-gray-900">{candidate.personalEmail || "N/A"}</p>
                        {candidate.mobilePhone && (
                          <p className="text-sm text-gray-600">{candidate.mobilePhone}</p>
                        )}
                      </div>
                      
                      {(department !== "N/A" || position !== "N/A") && (
                        <div>
                          <p className="text-xs font-medium text-gray-500 uppercase">Interests</p>
                          {department !== "N/A" && (
                            <p className="text-sm text-gray-900">Dept: {department}</p>
                          )}
                          {position !== "N/A" && (
                            <p className="text-sm text-gray-600">Position: {position}</p>
                          )}
                        </div>
                      )}

                      {candidate.applicationDate && (
                        <div>
                          <p className="text-xs font-medium text-gray-500 uppercase">Application Date</p>
                          <p className="text-sm text-gray-600">
                            {new Date(candidate.applicationDate).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 pt-4 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewProfile(candidate)}
                        className="flex-1"
                      >
                        View Profile
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewApplications(candidate)}
                        disabled={loadingApplications[candidate._id]}
                        className="flex-1"
                      >
                        {loadingApplications[candidate._id] ? "Loading..." : "Applications"}
                      </Button>
                      {candidate.resumeUrl && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewResume(candidate)}
                          disabled={viewingResume === candidate._id}
                          title="View Resume"
                        >
                          {viewingResume === candidate._id ? "..." : "📄"}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Candidate Profile Modal */}
        <Modal
          isOpen={isProfileModalOpen}
          onClose={() => {
            setIsProfileModalOpen(false);
            setSelectedCandidate(null);
          }}
          title={`Candidate Profile: ${selectedCandidate?.firstName} ${selectedCandidate?.lastName}`}
        >
          {selectedCandidate && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Candidate Number</p>
                  <p className="text-sm text-gray-900">{selectedCandidate.candidateNumber}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Status</p>
                  <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedCandidate.status)}`}>
                    {selectedCandidate.status.replace(/_/g, " ")}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Email</p>
                  <p className="text-sm text-gray-900">{selectedCandidate.personalEmail || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Phone</p>
                  <p className="text-sm text-gray-900">{selectedCandidate.mobilePhone || "N/A"}</p>
                </div>
                {selectedCandidate.nationalId && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">National ID</p>
                    <p className="text-sm text-gray-900">{selectedCandidate.nationalId}</p>
                  </div>
                )}
                {selectedCandidate.dateOfBirth && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">Date of Birth</p>
                    <p className="text-sm text-gray-900">
                      {new Date(selectedCandidate.dateOfBirth).toLocaleDateString()}
                    </p>
                  </div>
                )}
                {selectedCandidate.gender && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">Gender</p>
                    <p className="text-sm text-gray-900">{selectedCandidate.gender}</p>
                  </div>
                )}
                {selectedCandidate.applicationDate && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">Application Date</p>
                    <p className="text-sm text-gray-900">
                      {new Date(selectedCandidate.applicationDate).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>

              {selectedCandidate.address && (
                <div>
                  <p className="text-sm font-medium text-gray-500">Address</p>
                  <p className="text-sm text-gray-900">
                    {[
                      selectedCandidate.address.streetAddress,
                      selectedCandidate.address.city,
                      selectedCandidate.address.country,
                    ]
                      .filter(Boolean)
                      .join(", ") || "N/A"}
                  </p>
                </div>
              )}

              {selectedCandidate.department && (
                <div>
                  <p className="text-sm font-medium text-gray-500">Preferred Department</p>
                  <p className="text-sm text-gray-900">
                    {typeof selectedCandidate.department === "object"
                      ? selectedCandidate.department?.name
                      : "N/A"}
                  </p>
                </div>
              )}

              {selectedCandidate.position && (
                <div>
                  <p className="text-sm font-medium text-gray-500">Preferred Position</p>
                  <p className="text-sm text-gray-900">
                    {typeof selectedCandidate.position === "object"
                      ? selectedCandidate.position?.title
                      : "N/A"}
                  </p>
                </div>
              )}

              {selectedCandidate.notes && (
                <div>
                  <p className="text-sm font-medium text-gray-500">Notes</p>
                  <p className="text-sm text-gray-900 whitespace-pre-wrap">{selectedCandidate.notes}</p>
                </div>
              )}

              {selectedCandidate.resumeUrl && (
                <div className="pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => handleViewResume(selectedCandidate)}
                    disabled={viewingResume === selectedCandidate._id}
                    className="w-full"
                  >
                    {viewingResume === selectedCandidate._id
                      ? "Opening..."
                      : "📄 View Resume"}
                  </Button>
                </div>
              )}
            </div>
          )}
        </Modal>

        {/* Applications History Modal */}
        <Modal
          isOpen={isApplicationsModalOpen}
          onClose={() => {
            setIsApplicationsModalOpen(false);
            setSelectedCandidate(null);
            setCandidateApplications([]);
          }}
          title={`Application History: ${selectedCandidate?.firstName} ${selectedCandidate?.lastName}`}
        >
          {loadingApplications[selectedCandidate?._id || ""] ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Loading applications...</p>
            </div>
          ) : candidateApplications.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No applications found for this candidate.</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {candidateApplications.map((app) => (
                <Card key={app._id}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-semibold text-gray-900">
                          {typeof app.requisition === "object" && app.requisition?.template
                            ? typeof app.requisition.template === "object"
                              ? app.requisition.template.title
                              : "Job Opening"
                            : "Job Opening"}
                        </h4>
                        <p className="text-sm text-gray-600">
                          {typeof app.requisition === "object" && app.requisition?.template
                            ? typeof app.requisition.template === "object"
                              ? app.requisition.template.department
                              : "N/A"
                            : "N/A"}
                        </p>
                      </div>
                      <StatusBadge status={app.status} type="application" />
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-500 mt-2">
                      {app.createdAt && (
                        <span>
                          Applied: {new Date(app.createdAt).toLocaleDateString()}
                        </span>
                      )}
                      {(app.stage || app.currentStage) && (
                        <span>
                          Stage: {(app.stage || app.currentStage || "").replace(/_/g, " ")}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </Modal>
      </div>
    </ProtectedRoute>
  );
}

