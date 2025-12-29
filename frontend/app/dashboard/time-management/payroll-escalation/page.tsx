'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/hooks/use-auth';
import { timeManagementApi } from '@/lib/api/time-management/time-management.api';
import { Button } from '@/components/shared/ui/Button';
import { SystemRole } from '@/types';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { Toast, ToastType } from '@/components/leaves/Toast';

interface PayrollReadinessStatus {
  payrollCutoffDate: string;
  daysUntilCutoff: number;
  status: 'READY' | 'WARNING' | 'CRITICAL';
  pendingExceptions: number;
  pendingCorrections: number;
  pendingLeaves: number;
  escalatedExceptions: number;
  escalatedCorrections: number;
}

interface EscalationResult {
  success: boolean;
  message: string;
  payrollCutoffDate: string;
  daysUntilCutoff: number;
  escalatedExceptions: number;
  escalatedCorrections: number;
  notificationsSent: number;
}

function PayrollEscalationPage() {
  const { user } = useAuth();
  const [status, setStatus] = useState<PayrollReadinessStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [escalating, setEscalating] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: ToastType;
    isVisible: boolean;
  }>({ message: '', type: 'info', isVisible: false });

  const showToast = (message: string, type: ToastType) => {
    setToast({ message, type, isVisible: true });
  };

  const hideToast = () => {
    setToast((prev) => ({ ...prev, isVisible: false }));
  };

  const fetchStatus = useCallback(async () => {
    try {
      setLoading(true);
      const result = await timeManagementApi.getPayrollReadinessStatus();
      setStatus(result);
    } catch (error: any) {
      console.error('Error fetching payroll status:', error);
      showToast(error.message || 'Failed to fetch payroll status', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleTriggerEscalation = async () => {
    try {
      setEscalating(true);
      const result: EscalationResult = await timeManagementApi.triggerPayrollEscalation();
      
      if (result.success) {
        showToast(
          `Successfully escalated ${result.escalatedExceptions + result.escalatedCorrections} requests. ${result.notificationsSent} notifications sent.`,
          'success'
        );
        // Refresh status
        await fetchStatus();
      } else {
        showToast(result.message, 'info');
      }
    } catch (error: any) {
      console.error('Error triggering escalation:', error);
      showToast(error.message || 'Failed to trigger escalation', 'error');
    } finally {
      setEscalating(false);
    }
  };

  const handleResetToPending = async () => {
    try {
      setResetting(true);
      const result = await timeManagementApi.resetEscalatedToPending();
      
      if (result.success) {
        showToast(result.message, 'success');
        // Refresh status
        await fetchStatus();
      }
    } catch (error: any) {
      console.error('Error resetting to pending:', error);
      showToast(error.message || 'Failed to reset', 'error');
    } finally {
      setResetting(false);
    }
  };

  const getStatusColor = (statusValue: string) => {
    switch (statusValue) {
      case 'READY':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'WARNING':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'CRITICAL':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (statusValue: string) => {
    switch (statusValue) {
      case 'READY':
        return '✅';
      case 'WARNING':
        return '⚠️';
      case 'CRITICAL':
        return '🚨';
      default:
        return '❓';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-slate-200 rounded w-1/3 mb-6"></div>
            <div className="h-48 bg-slate-200 rounded mb-6"></div>
            <div className="h-32 bg-slate-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-800 mb-2">
            📅 Payroll Cut-off Escalation
          </h1>
          <p className="text-slate-600">
            Monitor and manage pending time requests before the monthly payroll cut-off date.
            Unreviewed requests are automatically escalated when the cut-off approaches.
          </p>
        </div>

        {/* Status Card */}
        {status && (
          <div
            className={`rounded-xl border-2 p-6 mb-6 ${getStatusColor(status.status)}`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{getStatusIcon(status.status)}</span>
                <div>
                  <h2 className="text-xl font-semibold">
                    Payroll Readiness: {status.status}
                  </h2>
                  <p className="text-sm opacity-80">
                    Cut-off Date: {formatDate(status.payrollCutoffDate)}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-4xl font-bold">{status.daysUntilCutoff}</div>
                <div className="text-sm">days remaining</div>
              </div>
            </div>

            {status.status === 'CRITICAL' && (
              <div className="bg-red-200 rounded-lg p-3 text-red-800 text-sm">
                ⚠️ <strong>Immediate action required!</strong> Pending requests must be
                reviewed before payroll processing begins.
              </div>
            )}
            {status.status === 'WARNING' && (
              <div className="bg-yellow-200 rounded-lg p-3 text-yellow-800 text-sm">
                ⏰ <strong>Approaching cut-off!</strong> Review pending requests soon to
                avoid delays.
              </div>
            )}
            {status.status === 'READY' && (
              <div className="bg-green-200 rounded-lg p-3 text-green-800 text-sm">
                ✅ <strong>All clear!</strong> No pending requests requiring attention
                before payroll.
              </div>
            )}
          </div>
        )}

        {/* Stats Grid */}
        {status && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
            <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
              <div className="text-sm text-slate-500 mb-1">Pending Time Exceptions</div>
              <div className="text-2xl font-bold text-orange-600">
                {status.pendingExceptions}
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
              <div className="text-sm text-slate-500 mb-1">Pending Corrections</div>
              <div className="text-2xl font-bold text-orange-600">
                {status.pendingCorrections}
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 border-l-4 border-l-purple-500">
              <div className="text-sm text-slate-500 mb-1">Pending Leave Requests</div>
              <div className="text-2xl font-bold text-purple-600">
                {status.pendingLeaves}
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
              <div className="text-sm text-slate-500 mb-1">Escalated Exceptions</div>
              <div className="text-2xl font-bold text-red-600">
                {status.escalatedExceptions}
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
              <div className="text-sm text-slate-500 mb-1">Escalated Corrections</div>
              <div className="text-2xl font-bold text-red-600">
                {status.escalatedCorrections}
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 mb-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Actions</h3>
          <div className="flex flex-wrap gap-4">
            <Button
              onClick={handleTriggerEscalation}
              disabled={escalating}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {escalating ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Escalating...
                </>
              ) : (
                '🚀 Trigger Escalation Now'
              )}
            </Button>
            <Button
              onClick={fetchStatus}
              variant="outline"
              className="border-slate-300"
            >
              🔄 Refresh Status
            </Button>
            <Button
              onClick={handleResetToPending}
              disabled={resetting}
              variant="outline"
              className="border-orange-300 text-orange-600 hover:bg-orange-50"
            >
              {resetting ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Resetting...
                </>
              ) : (
                '🔙 Reset to Pending (Test)'
              )}
            </Button>
          </div>
          <p className="text-sm text-slate-500 mt-3">
            Clicking "Trigger Escalation Now" will immediately escalate all pending time
            exceptions and correction requests, sending notifications to HR administrators.
          </p>
          <p className="text-sm text-orange-500 mt-2">
            ⚠️ "Reset to Pending" is for testing only - it reverts escalated items back to pending status.
          </p>
        </div>

        {/* Info Section */}
        <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
          <h3 className="text-lg font-semibold text-blue-800 mb-3">
            ℹ️ How Payroll Cut-off Escalation Works
          </h3>
          <ul className="space-y-2 text-sm text-blue-700">
            <li>
              • <strong>Cut-off Date:</strong> Calculated from the <em>Pay Date</em> configured
              in the Payroll Configuration module (Company Settings → Pay Date), minus 5 days
              for processing time.
            </li>
            <li>
              • <strong>Automatic Check:</strong> The system checks for pending requests
              daily at 8:00 AM.
            </li>
            <li>
              • <strong>Escalation Window:</strong> Requests are auto-escalated 3 days
              before the cut-off date.
            </li>
            <li>
              • <strong>Notifications:</strong> HR admins receive notifications when
              requests are escalated.
            </li>
            <li>
              • <strong>Time Requests:</strong> Time exceptions and correction requests
              are auto-escalated to ESCALATED status.
            </li>
            <li>
              • <strong>Leave Requests:</strong> Pending leave requests are included in
              notifications to HR, but their status is not modified (read-only from Leaves subsystem).
            </li>
            <li>
              • <strong>Manual Override:</strong> Use the "Trigger Escalation Now" button
              to manually escalate at any time.
            </li>
          </ul>
        </div>
      </div>

      {/* Toast */}
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
      />
    </div>
  );
}

export default function PayrollEscalationPageWrapper() {
  return (
    <ProtectedRoute
      allowedRoles={[SystemRole.HR_ADMIN, SystemRole.HR_MANAGER, SystemRole.SYSTEM_ADMIN]}
    >
      <PayrollEscalationPage />
    </ProtectedRoute>
  );
}

