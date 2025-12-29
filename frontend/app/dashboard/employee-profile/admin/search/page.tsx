// app/dashboard/employee-profile/admin/search/page.tsx
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/lib/hooks/use-auth";
import { ProtectedRoute } from "@/components/auth/protected-route";
import {
  SystemRole,
  EmployeeProfile,
  ContractType,
  WorkType,
  EmployeeStatus,
  Gender,
  MaritalStatus,
} from "@/types";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/shared/ui/Card";
import { Button } from "@/components/shared/ui/Button";
import { Input } from "@/components/shared/ui/Input";
import { Toast, useToast } from "@/components/leaves/Toast";
import { employeeProfileApi } from "@/lib/api/employee-profile/employee-profile";
import { api } from "@/lib/api/client";
import Link from "next/link";
import {
  X,
  Edit,
  Save,
  RotateCcw,
  Download,
  Search,
  Shield,
  Building,
  Briefcase,
  DollarSign,
} from "lucide-react";

export default function EmployeeManagementPage() {
  const { user } = useAuth();
  const { toast, showToast, hideToast } = useToast();

  // Search State
  const [employees, setEmployees] = useState<EmployeeProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");

  // Edit State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [saving, setSaving] = useState(false);

  // Debounce timer ref
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Check authorization
  const isAuthorized = user?.roles?.some(
    (role) =>
      role === SystemRole.HR_ADMIN ||
      role === SystemRole.HR_MANAGER ||
      role === SystemRole.SYSTEM_ADMIN
  );

  // Add to your component state:
  const [departments, setDepartments] = useState<any[]>([]);
  const [positions, setPositions] = useState<any[]>([]);
  const [payGrades, setPayGrades] = useState<any[]>([]);
  const [loadingDropdowns, setLoadingDropdowns] = useState(false);

  // Fetch dropdown data (departments, positions, pay grades)
  useEffect(() => {
    const fetchDropdownData = async () => {
      if (!isAuthorized) {
        setLoadingDropdowns(false);
        return;
      }

      try {
        setLoadingDropdowns(true);

        // 1. Fetch departments
        const deptResponse = await api.get(
          "/organization-structure/departments?isActive=true"
        );

        let departmentsData = [];
        if (Array.isArray(deptResponse)) {
          departmentsData = deptResponse;
        } else if (deptResponse && typeof deptResponse === "object") {
          if (Array.isArray(deptResponse.data)) {
            departmentsData = deptResponse.data;
          } else if (
            deptResponse.data &&
            Array.isArray(deptResponse.data.data)
          ) {
            departmentsData = deptResponse.data.data;
          }
        }
        setDepartments(departmentsData);

        // 2. Fetch positions
        const posResponse = await api.get(
          "/organization-structure/positions?isActive=true"
        );

        let positionsData = [];
        if (Array.isArray(posResponse)) {
          positionsData = posResponse;
        } else if (posResponse && typeof posResponse === "object") {
          if (Array.isArray(posResponse.data)) {
            positionsData = posResponse.data;
          } else if (posResponse.data && Array.isArray(posResponse.data.data)) {
            positionsData = posResponse.data.data;
          }
        }
        setPositions(positionsData);

        // 3. Fetch pay grades - FIXED VERSION
        // API returns: { data: [...], pagination: {...} }
        // Fetch with high limit to get all pay grades
        try {
          const payGradesResponse = await api.get(
            "/payroll-configuration/pay-grades?limit=1000"
          );

          console.log("📊 Raw pay grades response:", payGradesResponse);

          let payGradesData = [];

          // Handle paginated response structure: { data: [...], pagination: {...} }
          if (Array.isArray(payGradesResponse)) {
            payGradesData = payGradesResponse;
          } else if (
            payGradesResponse &&
            typeof payGradesResponse === "object"
          ) {
            // The API returns { data: [...], pagination: {...} }
            if (Array.isArray(payGradesResponse.data)) {
              payGradesData = payGradesResponse.data;
            } else if (
              payGradesResponse.data &&
              typeof payGradesResponse.data === "object" &&
              Array.isArray(payGradesResponse.data.data)
            ) {
              payGradesData = payGradesResponse.data.data;
            }
          }

          // Normalize the data structure
          payGradesData = payGradesData
            .filter((grade: any) => grade) // Filter out null/undefined
            .map((grade: any) => ({
              id: grade.id || grade._id?.toString() || String(grade._id),
              name:
                grade.name ||
                grade.grade ||
                grade.gradeName ||
                `Grade ${grade.level || ""}`,
              level: grade.level,
              code: grade.code,
              minSalary: grade.minSalary,
              maxSalary: grade.maxSalary,
            }));

          console.log("📊 Processed pay grades data:", payGradesData);

          // Only set if we have valid data
          if (payGradesData && payGradesData.length > 0) {
            setPayGrades(payGradesData);
            console.log(
              "✅ Pay grades set successfully:",
              payGradesData.length,
              "grades"
            );
          } else {
            console.warn("⚠️ No pay grades returned from API");
            setPayGrades([]);
          }
        } catch (payGradeError: any) {
          console.error("❌ Error fetching pay grades:", payGradeError);
          console.error("Error details:", {
            message: payGradeError.message,
            response: payGradeError.response?.data,
            status: payGradeError.response?.status,
          });

          // Set empty array on error (don't use fallback)
          setPayGrades([]);
        }
      } catch (error: any) {
        console.error("❌ Error fetching dropdown data:", error);
        // Don't show toast for every error to avoid spam
      } finally {
        // Always reset loading state
        setLoadingDropdowns(false);
      }
    };

    fetchDropdownData();
  }, [isAuthorized]); // Removed showToast from dependencies to prevent re-renders
  // Load employees function - useCallback with stable dependencies
  // In the loadEmployees function
  const loadEmployees = useCallback(async () => {
    try {
      setLoading(true);

      const response = await employeeProfileApi.getAllEmployees({
        search: searchTerm || undefined,
        status: statusFilter || undefined,
        departmentId: departmentFilter || undefined,
        limit: 100,
      });

      console.log("📋 Employees response:", response);
      console.log("📋 First employee data:", response.data?.[0]);
      console.log("📋 Department info in first employee:", {
        hasPrimaryDepartment: !!response.data?.[0]?.primaryDepartment,
        primaryDepartment: response.data?.[0]?.primaryDepartment,
        hasDepartmentId: !!response.data?.[0]?.primaryDepartmentId,
        departmentId: response.data?.[0]?.primaryDepartmentId,
      });

      setEmployees(response.data || []);

      if (!response.data || response.data.length === 0) {
        showToast("No employees found", "info");
      }
    } catch (error: any) {
      console.error("❌ Error loading employees:", error);
      showToast(error.message || "Failed to load employees", "error");
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, statusFilter, departmentFilter]);
  
  // Initial load - runs once when component mounts
  useEffect(() => {
    if (isAuthorized) {
      loadEmployees();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthorized]); // Only depends on isAuthorized

  // Debounced search effect - FIXED VERSION
  useEffect(() => {
    // Don't run on initial mount (already handled by initial load)
    if (!isAuthorized) return;

    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set new timer
    debounceTimerRef.current = setTimeout(() => {
      loadEmployees();
    }, 500); // 500ms delay

    // Cleanup timer on unmount or when dependencies change
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, statusFilter, departmentFilter]);

  // Start editing an employee
  const startEdit = (employee: EmployeeProfile) => {
    setEditingId(employee.id || employee._id || "");

    // Initialize edit form with employee data
    setEditForm({
      // Personal Info
      firstName: employee.firstName || "",
      lastName: employee.lastName || "",
      middleName: employee.middleName || "",
      nationalId: employee.nationalId || "",
      gender: employee.gender || Gender.MALE,
      dateOfBirth: employee.dateOfBirth
        ? new Date(employee.dateOfBirth).toISOString().split("T")[0]
        : "",
      maritalStatus: employee.maritalStatus || MaritalStatus.SINGLE,

      // Contact
      workEmail: employee.workEmail || "",
      personalEmail: employee.personalEmail || "",
      mobilePhone: employee.mobilePhone || "",
      homePhone: employee.homePhone || "",

      // Employment
      employeeNumber: employee.employeeNumber || "",
      dateOfHire: employee.dateOfHire
        ? new Date(employee.dateOfHire).toISOString().split("T")[0]
        : "",
      contractType: employee.contractType || ContractType.FULL_TIME_CONTRACT,
      workType: employee.workType || WorkType.FULL_TIME,
      status: employee.status || EmployeeStatus.ACTIVE,

      // Organization
      primaryDepartmentId:
        typeof employee.primaryDepartmentId === "object"
          ? employee.primaryDepartmentId?._id || employee.primaryDepartmentId?.id || ""
          : employee.primaryDepartmentId || "",
      primaryPositionId:
        typeof employee.primaryPositionId === "object"
          ? employee.primaryPositionId?._id || employee.primaryPositionId?.id || ""
          : employee.primaryPositionId || "",
      supervisorPositionId:
        typeof employee.supervisorPositionId === "object"
          ? employee.supervisorPositionId?._id || employee.supervisorPositionId?.id || ""
          : employee.supervisorPositionId || "",
      payGradeId:
        typeof employee.payGradeId === "object"
          ? employee.payGradeId?._id?.toString() || employee.payGradeId?.id?.toString() || String(employee.payGradeId?._id || employee.payGradeId?.id || "")
          : employee.payGradeId?.toString() || "",

      // Address
      address: {
        streetAddress: employee.address?.streetAddress || "",
        city: employee.address?.city || "",
        country: employee.address?.country || "",
      },

      // Banking
      bankName: (employee as any).bankName || "",
      bankAccountNumber: (employee as any).bankAccountNumber || "",

      // Biography
      biography: employee.biography || "",
    });
  };

  // Cancel editing
  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  // Validation function
  const validateEditForm = (formData: any): string[] => {
    const errors: string[] = [];

    if (!formData.firstName?.trim()) errors.push("First name is required");
    if (!formData.lastName?.trim()) errors.push("Last name is required");

    if (formData.nationalId && !/^[0-9]{14}$/.test(formData.nationalId)) {
      errors.push("National ID must be 14 digits");
    }

    if (
      formData.workEmail &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.workEmail)
    ) {
      errors.push("Invalid work email format");
    }

    if (
      formData.employeeNumber &&
      !/^[A-Z0-9]{6,10}$/.test(formData.employeeNumber)
    ) {
      errors.push("Employee number must be 6-10 alphanumeric characters");
    }

    if (formData.dateOfHire) {
      const hireDate = new Date(formData.dateOfHire);
      if (hireDate > new Date()) {
        errors.push("Hire date cannot be in the future");
      }
    }

    if (
      formData.bankAccountNumber &&
      !/^[0-9]{10,20}$/.test(formData.bankAccountNumber)
    ) {
      errors.push("Bank account number must be 10-20 digits");
    }

    return errors;
  };

  // Save edited employee
  const saveEdit = async () => {
    if (!editingId) return;

    // Validate form
    const errors = validateEditForm(editForm);
    if (errors.length > 0) {
      showToast(`Validation errors: ${errors.join(", ")}`, "error");
      return;
    }

    try {
      setSaving(true);

      // Prepare update data - remove undefined/null/empty values
      const updateData: any = {};
      Object.keys(editForm).forEach((key) => {
        if (key === "address") {
          // Handle address object
          if (
            editForm[key] &&
            Object.values(editForm[key]).some((val) => val?.toString().trim())
          ) {
            updateData[key] = editForm[key];
          }
        } else if (
          editForm[key] !== "" &&
          editForm[key] !== null &&
          editForm[key] !== undefined
        ) {
          updateData[key] = editForm[key];
        }
      });

      console.log("💾 Saving employee update:", {
        id: editingId,
        data: updateData,
      });

      const response = await employeeProfileApi.updateEmployee(
        editingId,
        updateData
      );

      console.log("✅ Update response:", response);
      showToast("Employee updated successfully", "success");

      // Refresh the list
      loadEmployees();

      // Exit edit mode
      cancelEdit();
    } catch (error: any) {
      console.error("❌ Error saving employee:", error);
      showToast(error.message || "Failed to update employee", "error");
    } finally {
      setSaving(false);
    }
  };

  // Handle input change in edit form
  const handleEditChange = (field: string, value: any) => {
    setEditForm((prev: any) => {
      // Handle nested fields
      if (field.includes(".")) {
        const [parent, child] = field.split(".");
        return {
          ...prev,
          [parent]: {
            ...(prev[parent] || {}),
            [child]: value,
          },
        };
      }

      return {
        ...prev,
        [field]: value,
      };
    });
  };

  // Handle search form submit
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Clear any pending debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    // Search immediately
    loadEmployees();
  };

  // Handle reset filters
  const handleReset = () => {
    setSearchTerm("");
    setStatusFilter("");
    setDepartmentFilter("");
    // Reset will trigger the useEffect with empty values after debounce
  };

  // Quick status update
  const updateStatus = async (
    employeeId: string,
    newStatus: EmployeeStatus
  ) => {
    try {
      await employeeProfileApi.updateEmployee(employeeId, {
        status: newStatus,
      });
      showToast(`Status updated to ${newStatus}`, "success");
      loadEmployees(); // Refresh list
    } catch (error: any) {
      showToast(error.message || "Failed to update status", "error");
    }
  };

  // Export functions
  // In your search page component
  const handleExportExcel = async () => {
    try {
      // Validate and prepare params
      const params: any = {};

      if (searchTerm.trim()) {
        params.search = searchTerm;
      }

      // Validate status against enum
      if (
        statusFilter &&
        Object.values(EmployeeStatus).includes(statusFilter as EmployeeStatus)
      ) {
        params.status = statusFilter;
      } else if (statusFilter) {
        // If invalid status, don't send it
        console.warn(`Invalid status filter: ${statusFilter}`);
      }

      // Validate departmentId as MongoDB ID (24 hex chars)
      if (departmentFilter && /^[0-9a-fA-F]{24}$/.test(departmentFilter)) {
        params.departmentId = departmentFilter;
      } else if (departmentFilter) {
        // If invalid department ID, don't send it
        console.warn(`Invalid department ID format: ${departmentFilter}`);
      }

      console.log("📤 Exporting with params:", params);

      const response = await employeeProfileApi.exportToExcel(params);

      // The response should be { message: string, data: string (base64) }
      const base64Data = response.data || response;

      if (!base64Data || typeof base64Data !== "string") {
        throw new Error("Invalid export data received");
      }

      showToast("Excel export generated", "success");

      // Create download link
      const dataStr = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${base64Data}`;
      const link = document.createElement("a");
      link.href = dataStr;
      link.download = `employees_export_${
        new Date().toISOString().split("T")[0]
      }.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error: any) {
      console.error("❌ Excel export error:", error);
      showToast(error.message || "Failed to export Excel", "error");
    }
  };

  const handleExportPdf = async (employeeId: string) => {
    try {
      console.log("📤 Exporting PDF for employee:", employeeId);

      const base64Data = await employeeProfileApi.exportToPdf(employeeId);

      if (!base64Data || typeof base64Data !== "string") {
        throw new Error("Invalid PDF data received");
      }

      showToast("PDF generated for employee", "success");

      // Create download link
      const dataStr = `data:application/pdf;base64,${base64Data}`;
      const link = document.createElement("a");
      link.href = dataStr;
      link.download = `employee_${employeeId}_${
        new Date().toISOString().split("T")[0]
      }.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error: any) {
      console.error("❌ PDF export error:", error);
      showToast(error.message || "Failed to export PDF", "error");
    }
  };

  if (!isAuthorized) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">
            Access denied. Only HR Admin, HR Manager, and System Admin can access this page.
          </p>
          <Link href="/dashboard/employee-profile">
            <Button className="mt-3">Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute
      allowedRoles={[
        SystemRole.HR_ADMIN,
        SystemRole.HR_MANAGER,
        SystemRole.SYSTEM_ADMIN,
      ]}
    >
      <div className="container mx-auto px-6 py-8">
        <Toast
          message={toast.message}
          type={toast.type}
          isVisible={toast.isVisible}
          onClose={hideToast}
        />

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-white">
              Employee Management System
            </h1>
            <p className="text-gray-300 mt-1">
              HR Admin/Manager/System Admin - Search, edit employee profiles
              {user?.roles?.includes(SystemRole.HR_ADMIN) && (
                <span className="ml-2 px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded-full">
                  HR Admin
                </span>
              )}
              {user?.roles?.includes(SystemRole.HR_MANAGER) && (
                <span className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                  HR Manager
                </span>
              )}
              {user?.roles?.includes(SystemRole.SYSTEM_ADMIN) && (
                <span className="ml-2 px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                  System Admin
                </span>
              )}
            </p>
          </div>
          <div className="flex gap-3 mt-4 md:mt-0">
            <Button onClick={loadEmployees} variant="outline">
              <RotateCcw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Link href="/dashboard/employee-profile">
              <Button variant="outline">← Dashboard</Button>
            </Link>
          </div>
        </div>

        {/* Search Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Search Employees</CardTitle>
            <CardDescription>Find employees to manage</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearch} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Search
                  </label>
                  <Input
                    type="text"
                    placeholder="Name, Employee #, Email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-white text-gray-900 placeholder:text-gray-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={statusFilter} // ✅ CORRECT - using statusFilter state
                    onChange={(e) => setStatusFilter(e.target.value)} // ✅ CORRECT - using setStatusFilter
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option key="all-status" value="">
                      All Status
                    </option>
                    {Object.values(EmployeeStatus).map((status) => (
                      <option key={status} value={status}>
                        {status
                          .replace(/_/g, " ")
                          .toLowerCase()
                          .replace(/\b\w/g, (l) => l.toUpperCase())}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Department
                  </label>
                  <select
                    value={departmentFilter}
                    onChange={(e) => setDepartmentFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option
                      key="all-departments"
                      value=""
                      className="text-gray-600"
                    >
                      All Departments
                    </option>
                    {departments.map((dept) => (
                      <option
                        key={dept.id || dept._id}
                        value={dept.id || dept._id}
                        className="text-gray-900"
                      >
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-end gap-3">
                  <Button type="submit" className="w-full">
                    <Search className="h-4 w-4 mr-2" />
                    Search
                  </Button>
                  <Button type="button" variant="outline" onClick={handleReset}>
                    Reset
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Edit Form Modal (when editing) */}
        {/* Edit Form Modal (when editing) */}
        {editingId && (
          <Card className="mb-6 border border-gray-200 shadow-lg">
            <CardHeader className="bg-gray-50">
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2 text-gray-900">
                  <Edit className="h-5 w-5" />
                  Edit Employee Profile
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={cancelEdit}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <CardDescription className="text-gray-600">
                HR Administrator Access - Full profile modification with audit
                logging
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* SECTION 1: PERSONAL INFORMATION */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900 mb-2 text-sm uppercase tracking-wider">
                    Personal Information
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        First Name *
                      </label>
                      <Input
                        value={editForm.firstName || ""}
                        onChange={(e) =>
                          handleEditChange("firstName", e.target.value)
                        }
                        className="w-full text-gray-900"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Last Name *
                      </label>
                      <Input
                        value={editForm.lastName || ""}
                        onChange={(e) =>
                          handleEditChange("lastName", e.target.value)
                        }
                        className="w-full text-gray-900"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        National ID (14 digits) *
                      </label>
                      <Input
                        value={editForm.nationalId || ""}
                        onChange={(e) =>
                          handleEditChange("nationalId", e.target.value)
                        }
                        className="w-full text-gray-900"
                        pattern="[0-9]{14}"
                        maxLength={14}
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Date of Birth *
                      </label>
                      <Input
                        type="date"
                        value={editForm.dateOfBirth || ""}
                        onChange={(e) =>
                          handleEditChange("dateOfBirth", e.target.value)
                        }
                        className="w-full text-gray-900"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Gender
                      </label>
                      <select
                        value={editForm.gender || Gender.MALE}
                        onChange={(e) =>
                          handleEditChange("gender", e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900"
                      >
                        <option key={Gender.MALE} value={Gender.MALE}>
                          Male
                        </option>
                        <option key={Gender.FEMALE} value={Gender.FEMALE}>
                          Female
                        </option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Marital Status
                      </label>
                      <select
                        value={editForm.maritalStatus || MaritalStatus.SINGLE}
                        onChange={(e) =>
                          handleEditChange("maritalStatus", e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900"
                      >
                        {Object.values(MaritalStatus).map((status) => (
                          <option key={status} value={status}>
                            {status
                              .replace(/_/g, " ")
                              .toLowerCase()
                              .replace(/\b\w/g, (l) => l.toUpperCase())}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* SECTION 2: EMPLOYMENT DETAILS */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900 mb-2 text-sm uppercase tracking-wider">
                    Employment Details
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Employee Number *
                      </label>
                      <Input
                        value={editForm.employeeNumber || ""}
                        onChange={(e) =>
                          handleEditChange("employeeNumber", e.target.value)
                        }
                        className="w-full text-gray-900"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Hire Date *
                      </label>
                      <Input
                        type="date"
                        value={editForm.dateOfHire || ""}
                        onChange={(e) =>
                          handleEditChange("dateOfHire", e.target.value)
                        }
                        className="w-full text-gray-900"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Status *
                      </label>
                      <select
                        value={editForm.status || EmployeeStatus.ACTIVE}
                        onChange={(e) =>
                          handleEditChange("status", e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900"
                      >
                        {Object.values(EmployeeStatus).map((status) => (
                          <option key={status} value={status}>
                            {status
                              .replace(/_/g, " ")
                              .toLowerCase()
                              .replace(/\b\w/g, (l) => l.toUpperCase())}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Contract Type
                      </label>
                      <select
                        value={
                          editForm.contractType ||
                          ContractType.FULL_TIME_CONTRACT
                        }
                        onChange={(e) =>
                          handleEditChange("contractType", e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900"
                      >
                        {Object.entries(ContractType).map(([key, value]) => (
                          <option key={value} value={value}>
                            {key
                              .replace(/_/g, " ")
                              .toLowerCase()
                              .replace(/\b\w/g, (l) => l.toUpperCase())}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Work Type
                      </label>
                      <select
                        value={editForm.workType || WorkType.FULL_TIME}
                        onChange={(e) =>
                          handleEditChange("workType", e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900"
                      >
                        {Object.entries(WorkType).map(([key, value]) => (
                          <option key={value} value={value}>
                            {key
                              .replace(/_/g, " ")
                              .toLowerCase()
                              .replace(/\b\w/g, (l) => l.toUpperCase())}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* SECTION 3: ORGANIZATION & COMPENSATION */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900 mb-2 text-sm uppercase tracking-wider">
                    Organization & Compensation
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Department *
                      </label>
                      <select
                        value={editForm.primaryDepartmentId || ""}
                        onChange={(e) =>
                          handleEditChange(
                            "primaryDepartmentId",
                            e.target.value
                          )
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900"
                        required
                      >
                        <option key="select-dept" value="">
                          Select Department
                        </option>
                        {departments.map((dept) => (
                          <option
                            key={dept.id || dept._id}
                            value={dept.id || dept._id}
                          >
                            {dept.name || dept.departmentName}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Position *
                      </label>
                      <select
                        value={editForm.primaryPositionId || ""}
                        onChange={(e) =>
                          handleEditChange("primaryPositionId", e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900"
                        required
                      >
                        <option key="select-pos" value="">
                          Select Position
                        </option>
                        {positions.map((pos) => (
                          <option
                            key={pos.id || pos._id}
                            value={pos.id || pos._id}
                          >
                            {pos.title}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Pay Grade *
                      </label>
                      <select
                        value={editForm.payGradeId || ""}
                        onChange={(e) =>
                          handleEditChange("payGradeId", e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900"
                        required
                        disabled={loadingDropdowns}
                      >
                        <option key="select-grade" value="">
                          {loadingDropdowns
                            ? "Loading pay grades..."
                            : "Select Pay Grade"}
                        </option>
                        {payGrades.map((grade) => (
                          <option key={grade.id} value={grade.id}>
                            {grade.name}
                            {grade.level ? ` (Level ${grade.level})` : ""}
                            {grade.code ? ` - ${grade.code}` : ""}
                            {grade.minSalary && grade.maxSalary
                              ? ` [${grade.minSalary} - ${grade.maxSalary}]`
                              : ""}
                          </option>
                        ))}
                      </select>
                      {loadingDropdowns && (
                        <p className="text-xs text-gray-500 mt-1">
                          Loading pay grades from database...
                        </p>
                      )}
                      {!loadingDropdowns && payGrades.length === 0 && (
                        <p className="text-xs text-amber-600 mt-1">
                          No pay grades available. Please contact system
                          administrator.
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Supervisor Position
                      </label>
                      <select
                        value={editForm.supervisorPositionId || ""}
                        onChange={(e) =>
                          handleEditChange(
                            "supervisorPositionId",
                            e.target.value
                          )
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900"
                      >
                        <option key="no-supervisor" value="">
                          No Supervisor
                        </option>
                        {positions.map((pos) => (
                          <option
                            key={pos.id || pos._id}
                            value={pos.id || pos._id}
                          >
                            {pos.title}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* SECTION 4: CONTACT INFORMATION */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900 mb-2 text-sm uppercase tracking-wider">
                    Contact Information
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Work Email *
                      </label>
                      <Input
                        type="email"
                        value={editForm.workEmail || ""}
                        onChange={(e) =>
                          handleEditChange("workEmail", e.target.value)
                        }
                        className="w-full text-gray-900"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Personal Email
                      </label>
                      <Input
                        type="email"
                        value={editForm.personalEmail || ""}
                        onChange={(e) =>
                          handleEditChange("personalEmail", e.target.value)
                        }
                        className="w-full text-gray-900"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Mobile Phone *
                      </label>
                      <Input
                        value={editForm.mobilePhone || ""}
                        onChange={(e) =>
                          handleEditChange("mobilePhone", e.target.value)
                        }
                        className="w-full text-gray-900"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Home Phone
                      </label>
                      <Input
                        value={editForm.homePhone || ""}
                        onChange={(e) =>
                          handleEditChange("homePhone", e.target.value)
                        }
                        className="w-full text-gray-900"
                      />
                    </div>
                  </div>
                </div>

                {/* SECTION 5: BANKING INFORMATION */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900 mb-2 text-sm uppercase tracking-wider">
                    Banking Information
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Bank Name *
                      </label>
                      <Input
                        value={editForm.bankName || ""}
                        onChange={(e) =>
                          handleEditChange("bankName", e.target.value)
                        }
                        className="w-full text-gray-900"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Account Number *
                      </label>
                      <Input
                        value={editForm.bankAccountNumber || ""}
                        onChange={(e) =>
                          handleEditChange("bankAccountNumber", e.target.value)
                        }
                        className="w-full text-gray-900"
                        pattern="[0-9]{10,20}"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Base Salary
                      </label>
                      <Input
                        type="number"
                        value={editForm.baseSalary || ""}
                        onChange={(e) =>
                          handleEditChange("baseSalary", e.target.value)
                        }
                        className="w-full text-gray-900"
                        placeholder="Monthly salary"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Currency
                      </label>
                      <select
                        value={editForm.currency || "USD"}
                        onChange={(e) =>
                          handleEditChange("currency", e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900"
                      >
                        <option key="USD" value="USD">
                          USD
                        </option>
                        <option key="EUR" value="EUR">
                          EUR
                        </option>
                        <option key="GBP" value="GBP">
                          GBP
                        </option>
                        <option key="EGP" value="EGP">
                          EGP
                        </option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* SECTION 6: ADDRESS & BIOGRAPHY */}
                <div className="space-y-4 md:col-span-3">
                  <h3 className="font-semibold text-gray-900 mb-2 text-sm uppercase tracking-wider">
                    Address & Biography
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <h4 className="font-medium text-gray-700">
                        Address Details
                      </h4>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Street Address *
                        </label>
                        <Input
                          placeholder="Street Address"
                          value={editForm.address?.streetAddress || ""}
                          onChange={(e) =>
                            handleEditChange(
                              "address.streetAddress",
                              e.target.value
                            )
                          }
                          className="w-full text-gray-900"
                          required
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            City *
                          </label>
                          <Input
                            placeholder="City"
                            value={editForm.address?.city || ""}
                            onChange={(e) =>
                              handleEditChange("address.city", e.target.value)
                            }
                            className="w-full text-gray-900"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Country *
                          </label>
                          <Input
                            placeholder="Country"
                            value={editForm.address?.country || ""}
                            onChange={(e) =>
                              handleEditChange(
                                "address.country",
                                e.target.value
                              )
                            }
                            className="w-full text-gray-900"
                            required
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-700 mb-3">
                        Professional Biography
                      </h4>
                      <textarea
                        value={editForm.biography || ""}
                        onChange={(e) =>
                          handleEditChange("biography", e.target.value)
                        }
                        className="w-full h-32 px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter professional biography, skills, certifications..."
                      />
                      <p className="text-xs text-gray-500 mt-2">
                        This information will be visible to authorized personnel
                        only.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* ACTION BUTTONS */}
              <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-200">
                <div className="text-sm text-gray-600">
                  All changes are logged and audited
                </div>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={cancelEdit}
                    disabled={saving}
                    className="text-gray-700"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={saveEdit}
                    disabled={saving}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {saving ? (
                      <>
                        <RotateCcw className="h-4 w-4 animate-spin mr-2" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        {/* Employee Results */}
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <CardTitle>Employee List</CardTitle>
                <CardDescription>
                  {loading
                    ? "Loading..."
                    : `${employees.length} employees found`}
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={handleExportExcel}>
                  <Download className="h-4 w-4 mr-1" />
                  Export Excel
                </Button>
                {employees.length > 0 && (
                  <div className="text-sm text-gray-500">
                    Showing {employees.length} employees
                  </div>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-2 border-gray-300 border-t-blue-600 mb-4" />
                <p className="text-gray-600">Loading employees...</p>
              </div>
            ) : employees.length === 0 ? (
              <div className="text-center py-12">
                <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <Search className="h-8 w-8 text-gray-400" />
                </div>
                <p className="text-gray-600 text-lg">No employees found</p>
                <p className="text-gray-400 mt-2">
                  Try adjusting your search filters or add a new employee
                </p>
                <Button onClick={handleReset} className="mt-4">
                  Reset Filters
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wide text-gray-700">
                        Employee
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wide text-gray-700">
                        Employee #
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wide text-gray-700">
                        Department
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wide text-gray-700">
                        Status
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wide text-gray-700">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.map((employee) => (
                      <tr
                        key={employee.id || employee._id}
                        className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                          editingId === (employee.id || employee._id)
                            ? "bg-blue-50"
                            : ""
                        }`}
                      >
                        <td className="py-4 px-4">
                          <div>
                            <p className="text-xs font-medium text-green-700 hover:text-green-900 hover:underline">
                              {employee.fullName}
                            </p>
                            <p className="text-sm text-gray-600">
                              {employee.workEmail || "No email"}
                              {employee.primaryPosition?.title && (
                                <span className="ml-2 text-xs bg-gray-100 px-2 py-1 rounded">
                                  {employee.primaryPosition.title}
                                </span>
                              )}
                            </p>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <code className="font-mono text-sm bg-gray-200 text-gray-800 px-2 py-1 rounded">
                            {employee.employeeNumber || "N/A"}
                          </code>
                        </td>
                        <td className="py-4 px-4">
                          <div>
                            <p className="text-sm text-black">
                              {/* Simple fix: Check if primaryDepartmentId is an object with name */}
                              {employee.primaryDepartmentId &&
                              typeof employee.primaryDepartmentId === "object"
                                ? (employee.primaryDepartmentId as any).name ||
                                  "No department"
                                : employee.primaryDepartment?.name ||
                                  "No department"}
                            </p>
                            {employee.payGrade?.name && (
                              <p className="text-xs text-black-500">
                                Grade: {employee.payGrade.name}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex flex-col gap-1">
                            <span
                              className={`px-3 py-1 text-xs rounded-full w-fit font-medium ${
                                employee.status === EmployeeStatus.ACTIVE
                                  ? "bg-green-100 text-green-800"
                                  : employee.status === EmployeeStatus.ON_LEAVE
                                  ? "bg-blue-100 text-blue-800"
                                  : employee.status ===
                                    EmployeeStatus.TERMINATED
                                  ? "bg-red-100 text-red-800"
                                  : employee.status === EmployeeStatus.PROBATION
                                  ? "bg-yellow-100 text-yellow-800"
                                  : employee.status === EmployeeStatus.SUSPENDED
                                  ? "bg-orange-100 text-orange-800"
                                  : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {employee.status || "UNKNOWN"}
                            </span>
                            <div className="flex gap-2 mt-1 flex-wrap">
                              {employee.status !== EmployeeStatus.ACTIVE && (
                                <button
                                  key="active-btn"
                                  onClick={() =>
                                    updateStatus(
                                      employee.id || employee._id || "",
                                      EmployeeStatus.ACTIVE
                                    )
                                  }
                                  className="text-xs text-green-600 hover:text-green-800 hover:underline"
                                >
                                  Active
                                </button>
                              )}
                              {employee.status !== EmployeeStatus.ON_LEAVE && (
                                <button
                                  onClick={() =>
                                    updateStatus(
                                      employee.id || employee._id || "",
                                      EmployeeStatus.ON_LEAVE
                                    )
                                  }
                                  className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
                                >
                                  On Leave
                                </button>
                              )}
                              {employee.status !==
                                EmployeeStatus.TERMINATED && (
                                <button
                                  onClick={() =>
                                    updateStatus(
                                      employee.id || employee._id || "",
                                      EmployeeStatus.TERMINATED
                                    )
                                  }
                                  className="text-xs text-red-600 hover:text-red-800 hover:underline"
                                >
                                  Terminate
                                </button>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => startEdit(employee)}
                              className="flex items-center gap-1"
                              variant={
                                editingId === (employee.id || employee._id)
                                  ? "primary"
                                  : "outline"
                              }
                            >
                              <Edit className="h-3 w-3" />
                              {editingId === (employee.id || employee._id)
                                ? "Editing"
                                : "Edit"}
                            </Button>
                            <Link
                              href={`/dashboard/employee-profile/admin/manage/${
                                employee.id || employee._id
                              }`}
                            >
                              <Button size="sm" variant="ghost">
                                Details
                              </Button>
                            </Link>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                handleExportPdf(
                                  employee.id || employee._id || ""
                                )
                              }
                              title="Export PDF"
                            >
                              <Download className="h-3 w-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* HR Admin Notes */}
        <div className="mt-8 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
          <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
            <Shield className="h-5 w-5" />
            HR Admin/Manager Permissions & Features
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium text-blue-800 mb-2">
                Profile Management
              </h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li className="flex items-start">
                  <span className="text-blue-500 mr-2">•</span>
                  Edit any employee profile field (PII, Contact, Employment)
                </li>
                <li className="flex items-start">
                  <span className="text-blue-500 mr-2">•</span>
                  Update employee status (Active, Terminated, On Leave,
                  Probation)
                </li>
                <li className="flex items-start">
                  <span className="text-blue-500 mr-2">•</span>
                  Modify Department, Position, and Pay Grade assignments
                </li>
                <li className="flex items-start">
                  <span className="text-blue-500 mr-2">•</span>
                  Change hire dates and contract/work type details
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-blue-800 mb-2">
                System Features
              </h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li className="flex items-start">
                  <span className="text-blue-500 mr-2">•</span>
                  Update banking information and employee biography
                </li>
                <li className="flex items-start">
                  <span className="text-blue-500 mr-2">•</span>
                  Export employee data to Excel/PDF formats
                </li>
                <li className="flex items-start">
                  <span className="text-blue-500 mr-2">•</span>
                  Advanced search with 500ms debounce
                </li>
                <li className="flex items-start">
                  <span className="text-blue-500 mr-2">•</span>
                  All changes are logged for audit and compliance purposes
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-blue-200">
            <p className="text-xs text-blue-600">
              <strong>Note:</strong> This page is accessible only to HR Admin
              and HR Manager roles. All data modifications are tracked in the
              system audit logs.
            </p>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
