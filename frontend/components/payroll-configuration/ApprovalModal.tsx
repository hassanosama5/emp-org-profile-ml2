"use client";

import React, { useState } from 'react';
import { Button } from '@/components/shared/ui/Button';

interface ApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApprove: (comment?: string) => void;
  title?: string;
  isLoading?: boolean;
}

export const ApprovalModal: React.FC<ApprovalModalProps> = ({
  isOpen,
  onClose,
  onApprove,
  title = 'Approve Configuration',
  isLoading = false,
}) => {
  const [comment, setComment] = useState('');

  if (!isOpen) return null;

  const handleApprove = () => {
    onApprove(comment || undefined);
    setComment('');
  };

  const handleClose = () => {
    setComment('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-xl font-semibold text-gray-900">{title}</h2>
        <p className="mb-4 text-sm text-gray-600">
          Are you sure you want to approve this configuration?
        </p>

        <div className="mb-4">
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Approval Comment (Optional)
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            rows={3}
            placeholder="Add any comments about this approval..."
          />
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
            onClick={handleApprove}
            isLoading={isLoading}
          >
            Approve
          </Button>
        </div>
      </div>
    </div>
  );
};

