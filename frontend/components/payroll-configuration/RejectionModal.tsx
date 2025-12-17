"use client";

import React, { useState } from 'react';
import { Button } from '@/components/shared/ui/Button';

interface RejectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReject: (reason: string) => void;
  title?: string;
  isLoading?: boolean;
}

export const RejectionModal: React.FC<RejectionModalProps> = ({
  isOpen,
  onClose,
  onReject,
  title = 'Reject Configuration',
  isLoading = false,
}) => {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleReject = () => {
    if (!reason.trim()) {
      setError('Rejection reason is required');
      return;
    }
    setError('');
    onReject(reason);
    setReason('');
  };

  const handleClose = () => {
    setReason('');
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-xl font-semibold text-gray-900">{title}</h2>
        <p className="mb-4 text-sm text-gray-600">
          Please provide a reason for rejecting this configuration.
        </p>

        <div className="mb-4">
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Rejection Reason <span className="text-red-500">*</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              setError('');
            }}
            className={`w-full rounded-md border ${
              error ? 'border-red-500' : 'border-gray-300'
            } px-3 py-2 text-sm placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
            rows={4}
            placeholder="Enter the reason for rejection..."
            required
          />
          {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
        </div>

        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleReject}
            isLoading={isLoading}
            className="bg-red-600 hover:bg-red-700"
          >
            Reject
          </Button>
        </div>
      </div>
    </div>
  );
};

