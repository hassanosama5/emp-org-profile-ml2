'use client';

import { useState } from 'react';
import { Button } from '@/components/shared/ui/Button';
import { Input } from '@/components/shared/ui/Input';
import { timeManagementApi } from '@/lib/api/time-management/time-management.api';
import { deleteNotification } from '@/lib/api/notifications';

interface ShiftManagementDialogProps {
  assignmentId: string;
  employeeId: string;
  employeeName: string;
  endDate: Date;
  notificationId?: string; // Optional: delete notification after successful action
  onClose: () => void;
  onSuccess: () => void;
}

export default function ShiftManagementDialog({
  assignmentId,
  employeeId,
  employeeName,
  endDate,
  notificationId,
  onClose,
  onSuccess,
}: ShiftManagementDialogProps) {
  const [action, setAction] = useState<'renew' | 'reassign' | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Renewal state
  const [newEndDate, setNewEndDate] = useState<string>('');
  const [renewalNote, setRenewalNote] = useState<string>('');
  
  // Reassignment state
  const [newEmployeeId, setNewEmployeeId] = useState<string>('');
  const [reassignReason, setReassignReason] = useState<string>('');

  const handleRenew = async () => {
    setLoading(true);
    setError(null);
    
    try {
      await timeManagementApi.renewShiftAssignment({
        assignmentId,
        newEndDate: newEndDate || undefined,
        note: renewalNote || undefined,
      });
      
      // Delete the notification after successful renewal
      if (notificationId) {
        try {
          await deleteNotification(notificationId);
        } catch (deleteErr) {
          console.error('Failed to delete notification:', deleteErr);
          // Don't fail the whole operation if notification delete fails
        }
      }
      
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to renew shift assignment');
    } finally {
      setLoading(false);
    }
  };

  const handleReassign = async () => {
    if (!newEmployeeId) {
      setError('Please enter a new employee ID');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      await timeManagementApi.reassignShiftAssignment({
        assignmentId,
        newEmployeeId,
        reason: reassignReason || undefined,
      });
      
      // Delete the notification after successful reassignment
      if (notificationId) {
        try {
          await deleteNotification(notificationId);
        } catch (deleteErr) {
          console.error('Failed to delete notification:', deleteErr);
          // Don't fail the whole operation if notification delete fails
        }
      }
      
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to reassign shift assignment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-xl font-bold text-gray-900">Manage Shift Assignment</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={loading}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mb-4 p-3 bg-gray-50 rounded">
          <p className="text-sm text-gray-600">
            <strong>Employee:</strong> {employeeName}
          </p>
          <p className="text-sm text-gray-600">
            <strong>Current End Date:</strong> {new Date(endDate).toLocaleDateString()}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {!action && (
          <div className="space-y-3">
            <Button
              onClick={() => setAction('renew')}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              disabled={loading}
            >
              Renew Assignment
            </Button>
            <Button
              onClick={() => setAction('reassign')}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white"
              disabled={loading}
            >
              Reassign to Different Employee
            </Button>
          </div>
        )}

        {action === 'renew' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                New End Date (optional)
              </label>
              <Input
                type="date"
                value={newEndDate}
                onChange={(e) => setNewEndDate(e.target.value)}
                className="w-full"
                disabled={loading}
              />
              <p className="text-xs text-gray-500 mt-1">
                Leave empty to extend by 1 month automatically
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Note (optional)
              </label>
              <textarea
                value={renewalNote}
                onChange={(e) => setRenewalNote(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                disabled={loading}
                placeholder="Add any notes about this renewal..."
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleRenew}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                disabled={loading}
              >
                {loading ? 'Renewing...' : 'Confirm Renewal'}
              </Button>
              <Button
                onClick={() => setAction(null)}
                className="flex-1 bg-gray-500 hover:bg-gray-600 text-white"
                disabled={loading}
              >
                Back
              </Button>
            </div>
          </div>
        )}

        {action === 'reassign' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                New Employee ID *
              </label>
              <Input
                type="text"
                value={newEmployeeId}
                onChange={(e) => setNewEmployeeId(e.target.value)}
                className="w-full"
                disabled={loading}
                placeholder="Enter employee ID"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reason (optional)
              </label>
              <textarea
                value={reassignReason}
                onChange={(e) => setReassignReason(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                rows={3}
                disabled={loading}
                placeholder="Reason for reassignment..."
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleReassign}
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
                disabled={loading}
              >
                {loading ? 'Reassigning...' : 'Confirm Reassignment'}
              </Button>
              <Button
                onClick={() => setAction(null)}
                className="flex-1 bg-gray-500 hover:bg-gray-600 text-white"
                disabled={loading}
              >
                Back
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
