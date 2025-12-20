"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/hooks/use-auth";
import { useRequireAuth } from "@/lib/hooks/use-auth";
import { SystemRole } from "@/types";
import { payrollExecutionApi } from "@/lib/api/payroll-execution/payroll-execution";
import { employeeProfileApi } from "@/lib/api/employee-profile/employee-profile";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/shared/ui/Card";
import { Button } from "@/components/shared/ui/Button";
import { Label } from "@/components/shared/ui/Label";
import {
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Calendar,
  Building2,
  DollarSign,
  User,
} from "lucide-react";

const CURRENCIES = ["USD", "EUR", "GBP", "JPY", "CAD", "AUD", "CHF", "CNY"];
const APPROVED_PERIOD_KEY = "approved_payroll_period";

interface ApprovedPeriod {
  period: string;
  approvedAt: string;
  approvedBy: string;
}

export default function ProcessInitiationPage() {
  const router = useRouter();
  const { user } = useAuth();
  useRequireAuth(SystemRole.PAYROLL_SPECIALIST);

  const [payrollPeriod, setPayrollPeriod] = useState("");
  const [entity, setEntity] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [payrollManagerId, setPayrollManagerId] = useState("");
  const [payrollManagers, setPayrollManagers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingManagers, setLoadingManagers] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [approvedPeriod, setApprovedPeriod] = useState<ApprovedPeriod | null>(null);

  useEffect(() => {
    // Check for approved period in localStorage
    const stored = localStorage.getItem(APPROVED_PERIOD_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setApprovedPeriod(parsed);
        setPayrollPeriod(parsed.period);
      } catch (e) {
        console.error("Error parsing stored period:", e);
        // Set default if parsing fails
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        setPayrollPeriod(firstDayOfMonth.toISOString().split("T")[0]);
      }
    } else {
      // Set default payroll period to first day of current month
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      setPayrollPeriod(firstDayOfMonth.toISOString().split("T")[0]);
    }

    fetchPayrollManagers();
  }, []);

  const fetchPayrollManagers = async () => {
    setLoadingManagers(true);
    try {
      const employeesResponse = await employeeProfileApi.getAllEmployees({
        limit: 1000,
      });
      const allEmployees = employeesResponse?.data || [];

      // Filter for payroll managers
      const managers = allEmployees.filter(
        (emp: any) =>
          emp.roles?.includes(SystemRole.PAYROLL_MANAGER) ||
          emp.systemRoles?.some(
            (r: any) => r.role === SystemRole.PAYROLL_MANAGER
          )
      );

      setPayrollManagers(managers);
    } catch (err: any) {
      // Handle 403 Forbidden errors silently - user may not have permission to view all employees
      // This is fine since payroll manager selection is optional
      if (err.response?.status === 403 || err.response?.status === 401) {
        // Silently fail - payroll manager field is optional
        setPayrollManagers([]);
      } else {
        // Only log non-permission errors
        console.error("Error fetching payroll managers:", err);
      }
      // Don't set error state - payroll manager is optional
    } finally {
      setLoadingManagers(false);
    }
  };

  const handleProcess = async () => {
    if (!payrollPeriod) {
      setError("Please select a payroll period");
      return;
    }

    if (!entity.trim()) {
      setError("Please enter an entity name");
      return;
    }

    // Get user ID - check both id and userId fields
    const userId = user?.id || user?.userId;
    
    if (!userId) {
      setError("User information not available. Please refresh the page or log in again.");
      return;
    }

    // Automatically adjust to first day of the selected month (backend requirement)
    // Backend validation requires payroll period to be the first day of the month
    // Parse the date string as local date (YYYY-MM-DD format)
    const [year, month, day] = payrollPeriod.split('-').map(Number);
    
    // Calculate first day of the selected month
    const firstDayOfMonth = new Date(year, month - 1, 1);
    
    // Format as YYYY-MM-DD string for the first day
    const formatDate = (date: Date): string => {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    };
    
    const periodToUse = formatDate(firstDayOfMonth);
    
    // Track if adjustment was made for later message
    const wasAdjusted = day !== 1;
    const selectedDate = new Date(year, month - 1, day);
    const monthName = wasAdjusted 
      ? selectedDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })
      : null;

    setProcessing(true);
    setError(null);
    setSuccess(null);

    try {
      // Create ISO string at midnight UTC for the first day of month
      // This ensures the backend receives the correct date regardless of timezone
      const periodDateISO = `${periodToUse}T00:00:00.000Z`;
      
      console.log('Date adjustment:', {
        original: payrollPeriod,
        adjusted: periodToUse,
        iso: periodDateISO,
        wasAdjusted
      });
      
      const result = await payrollExecutionApi.processPayrollInitiation({
        payrollPeriod: periodDateISO,
        entity: entity.trim(),
        payrollSpecialistId: userId,
        currency: currency || undefined,
        payrollManagerId: payrollManagerId || undefined,
      });

      // Show success message, including adjustment info if applicable
      let successMessage = `Payroll initiation processed successfully! Run ID: ${result.runId || result._id}`;
      if (wasAdjusted && monthName) {
        successMessage += `\n\nNote: Payroll period was automatically adjusted to the first day of ${monthName} (${periodToUse}) as required by business rules.`;
      }
      setSuccess(successMessage);

      // Clear approved period from localStorage after successful creation
      localStorage.removeItem(APPROVED_PERIOD_KEY);
      setApprovedPeriod(null);

      // Clear form
      setEntity("");
      setPayrollManagerId("");

      // Redirect to review page after 2 seconds
      setTimeout(() => {
        router.push("/dashboard/payroll-execution/review-initiation");
      }, 2000);
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        "Failed to process payroll initiation";
      setError(errorMessage);
      console.error("Error processing initiation:", err);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Process Payroll Initiation
        </h1>
        <p className="text-gray-600 mt-1">
          As a Payroll Specialist, automatically process payroll initiation. The system will create a new payroll run in DRAFT status that requires review.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-red-500" />
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-500" />
          <p className="text-green-700">{success}</p>
        </div>
      )}

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Payroll Initiation Details</CardTitle>
          <CardDescription>
            Enter the details for the payroll initiation. The system will automatically process the initiation and create a payroll run in DRAFT status that requires review before draft generation.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label htmlFor="payrollPeriod">
              Payroll Period <span className="text-red-500">*</span>
            </Label>
            <div className="mt-1 relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                id="payrollPeriod"
                type="date"
                value={payrollPeriod}
                onChange={(e) => setPayrollPeriod(e.target.value)}
                className="w-full pl-10 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            {approvedPeriod ? (
              <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-md">
                <p className="text-sm text-green-800">
                  <CheckCircle className="h-4 w-4 inline mr-1" />
                  <strong>Period Approved:</strong> An approved period is available. You can use it or select a different period.
                </p>
              </div>
            ) : (
              <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <p className="text-sm text-yellow-800">
                  <AlertCircle className="h-4 w-4 inline mr-1" />
                  <strong>Period Not Approved:</strong> You can still proceed, but it's recommended to approve the period first at{" "}
                  <Link href="/dashboard/payroll-execution/pre-initiation/payroll-period" className="underline font-medium">
                    Pre-Initiation → Payroll Period
                  </Link>
                  .
                </p>
              </div>
            )}
            <p className="text-xs text-gray-500 mt-1">
              Select any date in the target month. The system will automatically use the first day of that month as the payroll period (required by business rules).
            </p>
          </div>

          <div>
            <Label htmlFor="entity">
              Entity Name <span className="text-red-500">*</span>
            </Label>
            <div className="mt-1 relative">
              <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                id="entity"
                type="text"
                value={entity}
                onChange={(e) => setEntity(e.target.value)}
                placeholder="e.g., Company Name"
                className="w-full pl-10 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Enter the entity or company name for this payroll run
            </p>
          </div>

          <div>
            <Label htmlFor="currency">Currency</Label>
            <div className="mt-1 relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <select
                id="currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full pl-10 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {CURRENCIES.map((curr) => (
                  <option key={curr} value={curr}>
                    {curr}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Select the currency for this payroll run (optional)
            </p>
          </div>

          <div>
            <Label htmlFor="payrollManagerId">Payroll Manager (Optional)</Label>
            <div className="mt-1 relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <select
                id="payrollManagerId"
                value={payrollManagerId}
                onChange={(e) => setPayrollManagerId(e.target.value)}
                className="w-full pl-10 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loadingManagers}
              >
                <option value="">Select a Payroll Manager (optional)</option>
                {payrollManagers.map((manager) => (
                  <option key={manager._id} value={manager._id}>
                    {manager.firstName} {manager.lastName}
                    {manager.employeeId ? ` (${manager.employeeId})` : ""}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              If not selected, the system will automatically assign a default
              payroll manager
            </p>
          </div>

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> After processing, the payroll run will be
              created in DRAFT status. You will need to review and approve it
              before draft generation can begin.
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              onClick={() => router.push("/dashboard/payroll-execution")}
              variant="outline"
              className="flex-1"
              disabled={processing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleProcess}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              disabled={processing || !payrollPeriod || !entity.trim()}
            >
              {processing ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Create Payroll Run
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

