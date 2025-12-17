'use client';

import React from 'react';

export type ConfigStatus = 'draft' | 'approved' | 'rejected';

interface StatusBadgeProps {
  status: ConfigStatus;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  className = '',
  size = 'md',
}) => {
  const statusConfig = {
    draft: {
      label: 'Draft',
      className: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    },
    approved: {
      label: 'Approved',
      className: 'bg-green-100 text-green-800 border-green-300',
    },
    rejected: {
      label: 'Rejected',
      className: 'bg-red-100 text-red-800 border-red-300',
    },
  };

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base'
  };

  const config = statusConfig[status] || statusConfig.draft;

  return (
    <span
      className={`inline-flex items-center rounded-full border font-medium ${config.className} ${sizeClasses[size]} ${className}`}
    >
      {config.label}
    </span>
  );
};

export default StatusBadge;
