"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/hooks/use-auth";
import { useRequireAuth } from "@/lib/hooks/use-auth";
import { SystemRole } from "@/types";
import { payrollExecutionApi } from "@/lib/api/payroll-execution/payroll-execution";
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
  Users,
  DollarSign,
  Save,
} from "lucide-react";

const CURRENCIES = ["USD", "EUR", "GBP", "JPY", "CAD", "AUD", "CHF", "CNY"];

function EditInitiationPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  useRequireAuth(SystemRole.PAYROLL_SPECIALIST);

  const runId = searchParams.get("runId");

  const [payrollPeriod, setPayrollPeriod] = useState("");
  const [entity, setEntity] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [payrollRun, setPayrollRun] = useState<any>(null);

  useEffect(() => {
    if (runId) {
      fetchPayrollRun();
    } else {
      setError("No payroll run ID provided");
    }
  }, [runId]);

  const fetchPayrollRun = async () => {
    if (!runId) return;

    setLoading(true);
    setError(null);
    try {
      const runsResponse = await payrollExecutionApi.getAllPayrollRuns({
        limit: 1000,
      });

      let runsData: any[] = [];
      if (Array.isArray(runsResponse)) {
        runsData = runsResponse;
      } else if (Array.isArray((runsResponse as any)?.data)) {
        runsData = (runsResponse as any).data;
      } else if (Array.isArray((runsResponse as any)?.data?.items)) {
        runsData = (runsResponse as any).data.items;
      }

      const run = runsData.find((r: any) => r.runId === runId);
      if (!run) {
        setError("Payroll run not found");
        return;
      }

      // Check if run can be edited
      const status = run.status?.toLowerCase();
      if (status === "locked") {
        setError("Cannot edit locked payroll run. Please unlock it first.");
        return;
      }
      if (
        status === "under review" ||
        status === "under_review" ||
        status === "pending finance approval" ||
        status === "pending_finance_approval" ||
        status === "approved"
      ) {
        setError(
          `Cannot edit payroll run in ${run.status} status. Please reject it first if you need to make changes.`
        );
        return;
      }

      setPayrollRun(run);

      // Extract entity and currency
      const entityParts = run.entity?.split("|") || [run.entity || ""];
      const entityName = entityParts[0] || "";
      const currencyCode = entityParts[1] || "USD";

      // Set form values
      const periodDate = new Date(run.payrollPeriod);
      setPayrollPeriod(periodDate.toISOString().split("T")[0]);
      setEntity(entityName);
      setCurrency(currencyCode);
    } catch (err: any) {
      setError(err.message || "Failed to load payroll run");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!runId) {
      setError("No payroll run ID provided");
      return;
    }

    if (!payrollPeriod) {
      setError("Please select a payroll period");
      return;
    }

    if (!entity.trim()) {
      setError("Please enter an entity name");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      // Format entity with currency
      const entityWithCurrency = `${entity.trim()}|${currency}`;

      // Automatically adjust to first day of the selected month (backend requirement)
      const [year, month, day] = payrollPeriod.split('-').map(Number);
      const firstDayOfMonth = new Date(year, month - 1, 1);
      const formatDate = (date: Date): string => {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
      };
      const periodToUse = formatDate(firstDayOfMonth);
      const periodDateISO = `${periodToUse}T00:00:00.000Z`;

      await payrollExecutionApi.editPayrollInitiation({
        runId: runId,
        payrollPeriod: periodDateISO,
        entity: entityWithCurrency,
      });

      setSuccess("Payroll initiation updated successfully!");

      // Redirect to review page after 2 seconds
      setTimeout(() => {
        router.push("/dashboard/payroll-execution/review-initiation");
      }, 2000);
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        "Failed to update payroll initiation";
      setError(errorMessage);
      console.error("Error updating initiation:", err);
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="container mx-auto px-6 py-8">
        <Card>
          <CardContent className="py-12 text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">Loading payroll run...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!payrollRun) {
    return (
      <div className="container mx-auto px-6 py-8">
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-red-400 mb-4" />
            <p className="text-gray-600 text-lg mb-2">
              Payroll run not found or cannot be edited
            </p>
            {error && <p className="text-red-600">{error}</p>}
            <Button
              onClick={() => router.push("/dashboard/payroll-execution/review-initiation")}
              className="mt-4"
              variant="outline"
            >
              Back to Review Initiation
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Edit Payroll Initiation
        </h1>
        <p className="text-gray-600 mt-1">
          As a Payroll Specialist, manually edit payroll initiation when needed. Rejected payroll runs will be changed back to DRAFT status after editing.
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
          <CardTitle>Payroll Run: {payrollRun.runId}</CardTitle>
          <CardDescription>
            Current Status: {payrollRun.status}
            {payrollRun.rejectionReason && (
              <span className="block mt-2 text-red-600">
                Rejection Reason: {payrollRun.rejectionReason}
              </span>
            )}
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
              Select the currency for this payroll run
            </p>
          </div>

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> After saving, if this payroll run was
              REJECTED, it will be changed back to DRAFT status so it can be
              re-reviewed.
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              onClick={() => router.push("/dashboard/payroll-execution/review-initiation")}
              variant="outline"
              className="flex-1"
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              disabled={saving || !payrollPeriod || !entity.trim()}
            >
              {saving ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
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
        </CardContent>
      </Card>
    </div>
  );
}

export default function EditInitiationPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      </div>
    }>
      <EditInitiationPageContent />
    </Suspense>
  );
}

