"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/hooks/use-auth";
import { SystemRole } from "@/types";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { recruitmentApi } from "@/lib/api/recruitment/recruitment";
import { employeeProfileApi } from "@/lib/api/employee-profile/employee-profile";
import { JobRequisition, JobTemplate, CreateJobRequisitionDto } from "@/types/recruitment";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/shared/ui/Card";
import { Button } from "@/components/shared/ui/Button";
import { Input } from "@/components/shared/ui/Input";
import { Select } from "@/components/leaves/Select";
import { Modal } from "@/components/leaves/Modal";
import { Toast, useToast } from "@/components/leaves/Toast";

export default function JobRequisitionsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { toast, showToast, hideToast } = useToast();
  const [jobRequisitions, setJobRequisitions] = useState<JobRequisition[]>([]);
  const [jobTemplates, setJobTemplates] = useState<JobTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentUserEmployeeNumber, setCurrentUserEmployeeNumber] = useState<string>("");
  const [loadingEmployeeNumber, setLoadingEmployeeNumber] = useState(true);
  
  const [formData, setFormData] = useState<CreateJobRequisitionDto>({
    templateId: "",
    openings: 1,
    location: "",
    hiringManagerId: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Only HR Manager and System Admin can create jobs
  const canCreateJobs = user?.roles?.some(
    (role) => String(role).toLowerCase() === "hr manager" || String(role).toLowerCase() === "system admin"
  );

  // Only HR Employee can publish jobs (NOT HR Manager)
  const canPublishJobs = user?.roles?.some(
    (role) => String(role).toLowerCase() === "hr employee"
  );

  // Fetch current user's employee number - CRITICAL for job requisition creation
  useEffect(() => {
    const fetchEmployeeNumber = async () => {
      if (!user) {
        console.log('👤 No user object available yet');
        setLoadingEmployeeNumber(false);
        return;
      }
      
      console.log('👤 User object:', { 
        id: user.id, 
        employeeNumber: (user as any)?.employeeNumber,
        roles: user.roles 
      });
      
      // First, try to get from user object
      const employeeNumberFromUser = (user as any)?.employeeNumber;
      if (employeeNumberFromUser && employeeNumberFromUser.trim()) {
        console.log('✅ Found employee number in user object:', employeeNumberFromUser);
        setCurrentUserEmployeeNumber(employeeNumberFromUser.trim());
        setLoadingEmployeeNumber(false);
        return;
      }

      // If not in user object, fetch from employee profile API
      try {
        console.log('🔍 Employee number not in user object, fetching from profile API...');
        setLoadingEmployeeNumber(true);
        const profile = await employeeProfileApi.getMyProfile();
        console.log('📋 Profile response:', profile);
        
        // Try multiple possible field names
        const employeeNumber = (profile as any)?.employeeNumber || 
                              (profile as any)?.data?.employeeNumber ||
                              (profile as any)?.employee?.employeeNumber;
        
        if (employeeNumber && employeeNumber.trim()) {
          console.log('✅ Found employee number in profile:', employeeNumber);
          setCurrentUserEmployeeNumber(employeeNumber.trim());
        } else {
          console.warn("⚠️ Employee number not found in user object or profile");
          showToast("Unable to load your employee number. Please refresh the page.", "error");
        }
      } catch (error: any) {
        console.error("❌ Error fetching employee profile:", error);
        showToast("Failed to load your employee information. Please try again.", "error");
      } finally {
        setLoadingEmployeeNumber(false);
      }
    };

    fetchEmployeeNumber();
  }, [user]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [jobs, templates] = await Promise.all([
        recruitmentApi.getJobRequisitions(),
        recruitmentApi.getJobTemplates(),
      ]);
      setJobRequisitions(jobs);
      setJobTemplates(templates);
    } catch (error: any) {
      showToast(error.message || "Failed to load data", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    console.log('🔘 Create button clicked', {
      currentUserEmployeeNumber,
      loadingEmployeeNumber,
      user,
      canCreateJobs,
    });
    
    // Check if employee number is loaded
    if (loadingEmployeeNumber) {
      showToast("Loading your employee information...", "info");
      return;
    }
    
    if (!currentUserEmployeeNumber || !currentUserEmployeeNumber.trim()) {
      showToast("Unable to identify your employee number. Please refresh the page or contact support.", "error");
      return;
    }

    // Reset form with current user's employee number
    setFormData({
      templateId: "",
      openings: 1,
      location: "",
      hiringManagerId: currentUserEmployeeNumber.trim(), // Always use the loaded employee number
    });
    setErrors({});
    setIsModalOpen(true);
    console.log('✅ Modal opened with employee number:', currentUserEmployeeNumber);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.templateId || !formData.templateId.trim()) {
      newErrors.templateId = "Job template is required";
    }
    
    if (!formData.openings || formData.openings < 1) {
      newErrors.openings = "Openings must be at least 1";
    }
    
    // Backend requires hiringManagerId - must be a valid employee number
    const hiringManagerId = formData.hiringManagerId?.trim() || currentUserEmployeeNumber?.trim();
    if (!hiringManagerId) {
      newErrors.hiringManagerId = "Hiring Manager ID is required";
    } else if (hiringManagerId.length < 3) {
      newErrors.hiringManagerId = "Invalid employee number format";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('📝 Form submitted', { 
      formData, 
      currentUserEmployeeNumber,
      loadingEmployeeNumber 
    });
    
    // CRITICAL: Ensure we have a valid employee number before submission
    if (loadingEmployeeNumber) {
      showToast("Please wait for your employee information to load.", "info");
      return;
    }
    
    if (!currentUserEmployeeNumber || !currentUserEmployeeNumber.trim()) {
      showToast("Unable to identify your employee number. Please refresh the page.", "error");
      return;
    }
    
    // Validate form
    if (!validateForm() || submitting) {
      console.log('❌ Form validation failed or already submitting');
      return;
    }

    try {
      setSubmitting(true);
      
      // ALWAYS use currentUserEmployeeNumber - this is the source of truth
      // The form field might be empty or outdated, so we always use the loaded value
      const finalHiringManagerId = currentUserEmployeeNumber.trim();
      
      if (!finalHiringManagerId || finalHiringManagerId.length < 3) {
        setErrors({ 
          hiringManagerId: "Invalid employee number. Please refresh the page." 
        });
        setSubmitting(false);
        return;
      }
      
      // Validate templateId
      if (!formData.templateId || !formData.templateId.trim()) {
        setErrors({ templateId: "Please select a job template" });
        setSubmitting(false);
        return;
      }

      // Validate openings is a valid positive integer
      const openingsNum = parseInt(String(formData.openings), 10);
      if (isNaN(openingsNum) || openingsNum < 1) {
        setErrors({ openings: "Openings must be a positive integer" });
        setSubmitting(false);
        return;
      }

      // SECURITY: Ensure HR Managers can only use their own employee number
      // (Backend also validates this, but we check on frontend too)
      const isSystemAdmin = user?.roles?.some(
        (role) => String(role).toLowerCase() === "system admin"
      );
      
      if (!isSystemAdmin && formData.hiringManagerId && formData.hiringManagerId.trim() !== finalHiringManagerId) {
        setErrors({ 
          hiringManagerId: "Security violation: You can only create requisitions for yourself" 
        });
        setSubmitting(false);
        return;
      }

      // Prepare data for submission - ensure all fields are properly formatted
      // CRITICAL: hiringManagerId is now REQUIRED by backend DTO
      const submitData: CreateJobRequisitionDto = {
        templateId: formData.templateId.trim(),
        openings: openingsNum,
        hiringManagerId: finalHiringManagerId.trim(), // REQUIRED - Always use the loaded employee number
      };

      // Only include optional fields if they have values
      const trimmedLocation = formData.location?.trim();
      if (trimmedLocation && trimmedLocation.length > 0) {
        submitData.location = trimmedLocation;
      }

      // Final validation before sending
      if (!submitData.hiringManagerId || submitData.hiringManagerId.length === 0) {
        console.error('❌ CRITICAL: hiringManagerId is empty before sending!', {
          finalHiringManagerId,
          currentUserEmployeeNumber,
          formData,
        });
        setErrors({ 
          hiringManagerId: "Hiring Manager ID is required. Please refresh the page." 
        });
        setSubmitting(false);
        return;
      }

      console.log('📤 Submitting job requisition:', JSON.stringify(submitData, null, 2));
      console.log('📤 Data validation:', {
        templateId: submitData.templateId,
        templateIdLength: submitData.templateId.length,
        openings: submitData.openings,
        openingsType: typeof submitData.openings,
        hiringManagerId: submitData.hiringManagerId,
        hiringManagerIdLength: submitData.hiringManagerId.length,
        hiringManagerIdType: typeof submitData.hiringManagerId,
        location: submitData.location,
      });
      
      const result = await recruitmentApi.createJobRequisition(submitData);
      console.log('✅ Job requisition created:', result);
      
      showToast("Job requisition created successfully", "success");
      setIsModalOpen(false);
      
      // Reset form
      setFormData({
        templateId: "",
        openings: 1,
        location: "",
        hiringManagerId: currentUserEmployeeNumber.trim(),
      });
      setErrors({});
      
      // Reload data
      await loadData();
    } catch (error: any) {
      console.error('❌ Error creating job requisition:', error);
      console.error('❌ Error details:', {
        message: error?.message,
        response: error?.response,
        responseData: error?.response?.data,
        responseStatus: error?.response?.status,
      });
      
      // Extract error message with better handling
      let errorMessage = "Failed to create job requisition";
      
      if (error?.response?.data) {
        const responseData = error.response.data;
        // Handle NestJS validation errors (array of messages)
        if (Array.isArray(responseData.message)) {
          errorMessage = responseData.message.join(", ");
        } else if (responseData.message) {
          errorMessage = responseData.message;
        } else if (responseData.error) {
          errorMessage = responseData.error;
        } else if (typeof responseData === 'string') {
          errorMessage = responseData;
        }
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      showToast(errorMessage, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePreview = async (id: string) => {
    try {
      // Navigate to preview page in the same tab (keeps auth context)
      router.push(`/dashboard/recruitment/jobs/${id}`);
    } catch (error: any) {
      showToast(error.message || "Failed to preview job requisition", "error");
    }
  };

  const handlePublish = async (id: string) => {
    try {
      await recruitmentApi.publishJobRequisition(id);
      showToast("Job requisition published successfully", "success");
      loadData();
    } catch (error: any) {
      showToast(error.message || "Failed to publish job requisition", "error");
    }
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      await recruitmentApi.updateJobRequisitionStatus(id, status);
      showToast("Status updated successfully", "success");
      loadData();
    } catch (error: any) {
      showToast(error.message || "Failed to update status", "error");
    }
  };

  return (
    <ProtectedRoute allowedRoles={[SystemRole.HR_MANAGER, SystemRole.HR_EMPLOYEE, SystemRole.SYSTEM_ADMIN]}>
      <div className="container mx-auto px-6 py-8">
        <Toast
          message={toast.message}
          type={toast.type}
          isVisible={toast.isVisible}
          onClose={hideToast}
        />

        <div className="mb-8 flex items-center justify-between">
          <div>
            <Link href="/dashboard/recruitment" className="text-blue-600 hover:underline mb-4 inline-block">
              ← Back to Recruitment
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">Job Requisitions</h1>
            <p className="text-gray-600 mt-1">Create and manage job postings</p>
          </div>
          {canCreateJobs && (
            <Button 
              onClick={handleOpenCreate}
              disabled={loadingEmployeeNumber || !currentUserEmployeeNumber}
              type="button"
            >
              {loadingEmployeeNumber ? "Loading..." : "Create Job Requisition"}
            </Button>
          )}
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading...</p>
          </div>
        ) : jobRequisitions.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-500 mb-4">No job requisitions found.</p>
              {canCreateJobs && (
                <Button 
                  onClick={handleOpenCreate}
                  disabled={loadingEmployeeNumber || !currentUserEmployeeNumber}
                  type="button"
                >
                  {loadingEmployeeNumber ? "Loading..." : "Create Job Requisition"}
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {jobRequisitions.map((job) => (
              <Card key={job._id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-xl">
                        {job.template?.title || "Job Opening"}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {job.template?.department || "Department"} • {job.location || "Location TBD"}
                      </CardDescription>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      job.publishStatus === 'published' 
                        ? "bg-green-100 text-green-800" 
                        : job.publishStatus === 'closed' 
                        ? "bg-red-100 text-red-800" 
                        : "bg-gray-100 text-gray-800"
                    }`}>
                      {job.publishStatus === 'published' ? 'Published' : job.publishStatus === 'closed' ? 'Closed' : 'Draft'}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                    {job.template?.description || "No description available"}
                  </p>
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Openings:</span>
                      <span className="font-medium text-gray-900">{job.openings}</span>
                    </div>
                    {job.statistics && (
                      <>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500">Available Positions:</span>
                          <span className="font-medium text-blue-600">{job.statistics.availablePositions || job.openings}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500">Total Applications:</span>
                          <span className="font-medium text-gray-900">{job.statistics.totalApplications || 0}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500">Hired:</span>
                          <span className="font-medium text-green-600">{job.statistics.hired || 0}</span>
                        </div>
                        {job.statistics.progress !== undefined && (
                          <div className="mt-2">
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="text-gray-500">Progress:</span>
                              <span className="font-medium">{job.statistics.progress}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-600 h-2 rounded-full transition-all"
                                style={{ width: `${job.statistics.progress}%` }}
                              ></div>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                    <div className="flex items-center justify-between text-sm pt-2 border-t">
                      <span className="text-gray-500">Status:</span>
                      <span className={job.publishStatus === 'published' ? "text-green-600 font-medium" : job.publishStatus === 'closed' ? "text-red-600 font-medium" : "text-gray-400 font-medium"}>
                        {job.publishStatus === 'published' ? "Published" : job.publishStatus === 'closed' ? "Closed" : "Draft"}
                      </span>
                    </div>
                    {job.requisitionId && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-400">Requisition ID:</span>
                        <span className="font-mono text-gray-500">{job.requisitionId}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Link href={`/dashboard/recruitment/jobs/${job._id}`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full">View Details</Button>
                    </Link>
                    {canPublishJobs && (
                      <>
                        {job.publishStatus === 'draft' && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handlePreview(job._id)}
                            >
                              Preview
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handlePublish(job._id)}
                            >
                              Publish
                            </Button>
                          </>
                        )}
                        {job.publishStatus === 'published' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePreview(job._id)}
                          >
                            View Published
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Create Modal */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => {
            console.log('🚪 Closing modal');
            setIsModalOpen(false);
          }}
          title="Create Job Requisition"
        >
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Job Template *
                </label>
                <Select
                  value={formData.templateId}
                  onChange={(e) => setFormData({ ...formData, templateId: e.target.value })}
                  placeholder="Select a template"
                  options={[
                    { value: "", label: "Select a template" },
                    ...jobTemplates.map((template) => ({
                      value: template._id,
                      label: `${template.title} - ${template.department}`,
                    })),
                  ]}
                />
                {errors.templateId && (
                  <p className="text-red-500 text-xs mt-1">{errors.templateId}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Number of Openings *
                </label>
                <Input
                  type="number"
                  min="1"
                  value={formData.openings}
                  onChange={(e) => setFormData({ ...formData, openings: parseInt(e.target.value) || 1 })}
                />
                {errors.openings && (
                  <p className="text-red-500 text-xs mt-1">{errors.openings}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location
                </label>
                <Input
                  value={formData.location || ""}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="e.g., New York, Remote"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hiring Manager *
                </label>
                <Input
                  value={currentUserEmployeeNumber || "Loading..."}
                  disabled
                  className="bg-gray-100 cursor-not-allowed"
                  readOnly
                />
                <p className="text-xs text-gray-500 mt-1">
                  Your employee ID: <span className="font-medium">{currentUserEmployeeNumber || "Loading..."}</span>
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  🔒 Security: You can only create requisitions for yourself
                </p>
                {errors.hiringManagerId && (
                  <p className="text-red-500 text-xs mt-1">{errors.hiringManagerId}</p>
                )}
                {loadingEmployeeNumber && (
                  <p className="text-xs text-yellow-600 mt-1">⏳ Loading your employee information...</p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={submitting || loadingEmployeeNumber || !currentUserEmployeeNumber}
              >
                {submitting ? "Creating..." : loadingEmployeeNumber ? "Loading..." : "Create"}
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </ProtectedRoute>
  );
}
