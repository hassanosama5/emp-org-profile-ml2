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
    (role) => role === SystemRole.HR_ADMIN || role === SystemRole.HR_MANAGER
  );

  // Add to your component state:
  const [departments, setDepartments] = useState<any[]>([]);
  const [positions, setPositions] = useState<any[]>([]);
  const [payGrades, setPayGrades] = useState<any[]>([]);
  const [loadingDropdowns, setLoadingDropdowns] = useState(false);

  // Add this useEffect to fetch real data:
  useEffect(() => {
    const fetchDropdownData = async () => {
      if (!isAuthorized) return;

      try {
        setLoadingDropdowns(true);

        console.log(
          "🔍 Fetching departments from:",
          "/organization-structure/departments?isActive=true"
        );
        console.log(
          "🔍 Auth token available:",
          !!localStorage.getItem("token")
        );

        // 1. Fetch departments with debugging
        const deptResponse = await api.get(
          "/organization-structure/departments?isActive=true"
        );

        console.log("📥 Departments API response:", deptResponse);
        console.log("📥 Response type:", typeof deptResponse);
        console.log("📥 Response keys:", Object.keys(deptResponse));

        // Try different extraction patterns
        let departmentsData = [];

        if (Array.isArray(deptResponse)) {
          departmentsData = deptResponse;
        } else if (deptResponse && typeof deptResponse === "object") {
          if (Array.isArray(deptResponse.data)) {
            departmentsData = deptResponse.data;
            console.log("✅ Found data in response.data");
          } else if (
            deptResponse.data &&
            Array.isArray(deptResponse.data.data)
          ) {
            departmentsData = deptResponse.data.data;
            console.log("✅ Found data in response.data.data");
          } else if (Array.isArray((deptResponse as any).items)) {
            departmentsData = (deptResponse as any).items;
            console.log("✅ Found data in response.items");
          } else if (Array.isArray((deptResponse as any).content)) {
            departmentsData = (deptResponse as any).content;
            console.log("✅ Found data in response.content");
          }
        }

        console.log("📊 Extracted departments data:", departmentsData);
        console.log("📊 Departments count:", departmentsData.length);

        setDepartments(departmentsData);

        // 2. Fetch positions
        console.log("🔍 Fetching positions...");
        const posResponse = await api.get(
          "/organization-structure/positions?isActive=true"
        );

        console.log("📥 Positions API response:", posResponse);

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

        console.log("📊 Extracted positions data:", positionsData);
        setPositions(positionsData);

        // 3. Mock pay grades for now
        const mockPayGrades = [
          { id: "pg1", name: "Grade A", level: 1 },
          { id: "pg2", name: "Grade B", level: 2 },
          { id: "pg3", name: "Grade C", level: 3 },
        ];
        setPayGrades(mockPayGrades);
      } catch (error: any) {
        console.error("❌ Error fetching dropdown data:", error);
        console.error("❌ Error message:", error.message);
        console.error("❌ Error response:", error.response);
        console.error("❌ Error status:", error.response?.status);
        console.error("❌ Error data:", error.response?.data);

        showToast(
          error.response?.data?.message ||
            error.message ||
            "Failed to load dropdown options",
          "error"
        );
      } finally {
        setLoadingDropdowns(false);
      }
    };

    fetchDropdownData();
  }, [isAuthorized, showToast]);
  // Load employees function - useCallback with stable dependencies
  const loadEmployees = useCallback(async () => {
    try {
      setLoading(true);

      const response = await employeeProfileApi.getAllEmployees({
        search: searchTerm || undefined,
        status: statusFilter || undefined,
        departmentId: departmentFilter || undefined,
        limit: 100,
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
  }, [searchTerm, statusFilter, departmentFilter, showToast]);

  // Initial load - runs once when component mounts
  useEffect(() => {
    if (isAuthorized) {
      loadEmployees();
    }
  }, [isAuthorized]); // Only depends on isAuthorized

  // Debounced search effect - FIXED VERSION
  useEffect(() => {
    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Don't search on initial mount (already handled by initial load)
    const isInitialMount = !searchTerm && !statusFilter && !departmentFilter;
    if (isInitialMount) return;

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
  }, [searchTerm, statusFilter, departmentFilter, loadEmployees]);

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
      primaryDepartmentId: employee.primaryDepartmentId || "",
      primaryPositionId: employee.primaryPositionId || "",
      supervisorPositionId: employee.supervisorPositionId || "",
      payGradeId: employee.payGradeId || "",

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
            Access denied. Only HR Admin and HR Manager can access this page.
          </p>
          <Link href="/dashboard/employee-profile">
            <Button className="mt-3">Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute allowedRoles={[SystemRole.HR_ADMIN, SystemRole.HR_MANAGER]}>
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
              HR Admin/Manager - Search, edit employee profiles
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
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="" className="text-gray-600">
                      All Statuses
                    </option>
                    <option
                      value={EmployeeStatus.ACTIVE}
                      className="text-gray-900"
                    >
                      Active
                    </option>
                    <option
                      value={EmployeeStatus.ON_LEAVE}
                      className="text-gray-900"
                    >
                      On Leave
                    </option>
                    <option
                      value={EmployeeStatus.TERMINATED}
                      className="text-gray-900"
                    >
                      Terminated
                    </option>
                    <option
                      value={EmployeeStatus.SUSPENDED}
                      className="text-gray-900"
                    >
                      Suspended
                    </option>
                    <option
                      value={EmployeeStatus.PROBATION}
                      className="text-gray-900"
                    >
                      Probation
                    </option>
                    <option
                      value={EmployeeStatus.RETIRED}
                      className="text-gray-900"
                    >
                      Retired
                    </option>
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
                    <option value="" className="text-gray-600">
                      All Departments
                    </option>
                    {departments.map((dept) => (
                      <option
                        key={dept.id}
                        value={dept.id}
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
        {editingId && (
          <Card className="mb-6 border-2 border-blue-300 shadow-lg">
            <CardHeader className="bg-blue-50">
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2">
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
              <CardDescription>
                Edit employee profile data - All changes are logged for audit
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Personal Info */}
                <div className="border-r border-gray-100 pr-4">
                  <h3 className="font-semibold text-gray-700 mb-3 text-sm uppercase tracking-wider">
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
                        className="w-full"
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
                        className="w-full"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        National ID (14 digits)
                      </label>
                      <Input
                        value={editForm.nationalId || ""}
                        onChange={(e) =>
                          handleEditChange("nationalId", e.target.value)
                        }
                        className="w-full"
                        pattern="[0-9]{14}"
                        maxLength={14}
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      >
                        <option value={Gender.MALE}>Male</option>
                        <option value={Gender.FEMALE}>Female</option>
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      >
                        <option value={MaritalStatus.SINGLE}>Single</option>
                        <option value={MaritalStatus.MARRIED}>Married</option>
                        <option value={MaritalStatus.DIVORCED}>Divorced</option>
                        <option value={MaritalStatus.WIDOWED}>Widowed</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Date of Birth
                      </label>
                      <Input
                        type="date"
                        value={editForm.dateOfBirth || ""}
                        onChange={(e) =>
                          handleEditChange("dateOfBirth", e.target.value)
                        }
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>

                {/* Contact & Employment */}
                <div className="border-r border-gray-100 pr-4">
                  <h3 className="font-semibold text-gray-700 mb-3 text-sm uppercase tracking-wider">
                    Contact & Employment
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
                        className="w-full"
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
                        className="w-full"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Mobile Phone
                      </label>
                      <Input
                        value={editForm.mobilePhone || ""}
                        onChange={(e) =>
                          handleEditChange("mobilePhone", e.target.value)
                        }
                        className="w-full"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Employee Number *
                      </label>
                      <Input
                        value={editForm.employeeNumber || ""}
                        onChange={(e) =>
                          handleEditChange("employeeNumber", e.target.value)
                        }
                        className="w-full"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Date of Hire *
                      </label>
                      <Input
                        type="date"
                        value={editForm.dateOfHire || ""}
                        onChange={(e) =>
                          handleEditChange("dateOfHire", e.target.value)
                        }
                        className="w-full"
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      >
                        <option value={EmployeeStatus.ACTIVE}>Active</option>
                        <option value={EmployeeStatus.ON_LEAVE}>
                          On Leave
                        </option>
                        <option value={EmployeeStatus.TERMINATED}>
                          Terminated
                        </option>
                        <option value={EmployeeStatus.SUSPENDED}>
                          Suspended
                        </option>
                        <option value={EmployeeStatus.PROBATION}>
                          Probation
                        </option>
                        <option value={EmployeeStatus.RETIRED}>Retired</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Organization & Banking */}
                <div>
                  <h3 className="font-semibold text-gray-700 mb-3 text-sm uppercase tracking-wider">
                    Organization & Banking
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        <Building className="inline h-4 w-4 mr-1" />
                        Department
                      </label>
                      <select
                        value={editForm.primaryDepartmentId || ""}
                        onChange={(e) =>
                          handleEditChange(
                            "primaryDepartmentId",
                            e.target.value
                          )
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      >
                        <option value="">Select Department</option>
                        {departments.map((dept) => (
                          <option key={dept.id} value={dept.id}>
                            {dept.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        <Briefcase className="inline h-4 w-4 mr-1" />
                        Position
                      </label>
                      <select
                        value={editForm.primaryPositionId || ""}
                        onChange={(e) =>
                          handleEditChange("primaryPositionId", e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      >
                        <option value="">Select Position</option>
                        {positions.map((pos) => (
                          <option key={pos.id} value={pos.id}>
                            {pos.title}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        <DollarSign className="inline h-4 w-4 mr-1" />
                        Pay Grade
                      </label>
                      <select
                        value={editForm.payGradeId || ""}
                        onChange={(e) =>
                          handleEditChange("payGradeId", e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      >
                        <option value="">Select Pay Grade</option>
                        {payGrades.map((grade) => (
                          <option key={grade.id} value={grade.id}>
                            {grade.name} (Level {grade.level})
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      >
                        <option value={ContractType.FULL_TIME_CONTRACT}>
                          Full Time
                        </option>
                        <option value={ContractType.PART_TIME_CONTRACT}>
                          Part Time
                        </option>
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      >
                        <option value={WorkType.FULL_TIME}>Full Time</option>
                        <option value={WorkType.PART_TIME}>Part Time</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Bank Name
                      </label>
                      <Input
                        value={editForm.bankName || ""}
                        onChange={(e) =>
                          handleEditChange("bankName", e.target.value)
                        }
                        className="w-full"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Account Number
                      </label>
                      <Input
                        value={editForm.bankAccountNumber || ""}
                        onChange={(e) =>
                          handleEditChange("bankAccountNumber", e.target.value)
                        }
                        className="w-full"
                        pattern="[0-9]{10,20}"
                      />
                    </div>
                  </div>
                </div>

                {/* Address & Biography */}
                <div className="md:col-span-3">
                  <h3 className="font-semibold text-gray-700 mb-3 text-sm uppercase tracking-wider">
                    Address & Biography
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2">
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Street Address
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
                            className="w-full"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              City
                            </label>
                            <Input
                              placeholder="City"
                              value={editForm.address?.city || ""}
                              onChange={(e) =>
                                handleEditChange("address.city", e.target.value)
                              }
                              className="w-full"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Country
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
                              className="w-full"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Biography
                      </label>
                      <textarea
                        value={editForm.biography || ""}
                        onChange={(e) =>
                          handleEditChange("biography", e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        rows={4}
                        placeholder="Professional biography..."
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-200">
                <Button
                  variant="outline"
                  onClick={cancelEdit}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button
                  onClick={saveEdit}
                  disabled={saving}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
                >
                  {saving ? (
                    <>
                      <RotateCcw className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </Button>
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
                            <p className="text-sm">
                              {employee.primaryDepartment?.name ||
                                "No department"}
                            </p>
                            {employee.payGrade?.name && (
                              <p className="text-xs text-gray-500">
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
