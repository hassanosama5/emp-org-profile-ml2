"use client";

import React from 'react';
import { StatusBadge, ConfigStatus } from './StatusBadge';
import { Button } from '@/components/shared/ui/Button';

export interface ConfigurationItem {
  _id?: string;
  id?: string;
  status: ConfigStatus;
  [key: string]: any;
}

interface ConfigurationTableProps<T extends ConfigurationItem> {
  data: T[];
  columns: {
    key: string;
    label: string;
    render?: (item: T) => React.ReactNode;
    className?: string;
  }[];
  onEdit?: (item: T) => void;
  onDelete?: (item: T) => void;
  onApprove?: (item: T) => void;
  onReject?: (item: T) => void;
  onView?: (item: T) => void;
  showStatus?: boolean;
  canEdit?: (item: T) => boolean;
  canDelete?: (item: T) => boolean;
  canApprove?: (item: T) => boolean;
  canReject?: (item: T) => boolean;
  isLoading?: boolean;
  emptyMessage?: string;
}

export function ConfigurationTable<T extends ConfigurationItem>({
  data,
  columns,
  onEdit,
  onDelete,
  onApprove,
  onReject,
  onView,
  showStatus = true,
  canEdit = (item) => item.status === 'draft',
  canDelete = (item) => item.status === 'draft',
  canApprove = () => false,
  canReject = () => false,
  isLoading = false,
  emptyMessage = 'No configurations found',
}: ConfigurationTableProps<T>) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
        <div className="text-gray-400 mb-2">
          <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
          </svg>
        </div>
        <p className="text-gray-500 text-lg">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border-2 border-gray-200 bg-white shadow-lg">
      <table className="w-full">
        <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className={`px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-700 border-b-2 border-gray-200 ${column.className || ''}`}
              >
                {column.label}
              </th>
            ))}
            {showStatus && (
              <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-700 border-b-2 border-gray-200">
                Status
              </th>
            )}
            <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-gray-700 border-b-2 border-gray-200">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {data.map((item, index) => {
            const itemId = item._id || item.id || '';
            return (
              <tr 
                key={itemId} 
                className={`hover:bg-gradient-to-r hover:from-cyan-50 hover:to-blue-50 transition-all duration-200 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
              >
                {columns.map((column) => (
                  <td key={column.key} className={`px-6 py-4 text-sm text-gray-900 ${column.className || ''}`}>
                    {column.render ? column.render(item) : (item[column.key] as string) || '-'}
                  </td>
                ))}
                {showStatus && (
                  <td className="px-6 py-4 text-sm">
                    <StatusBadge status={item.status} size="sm" />
                  </td>
                )}
                <td className="px-6 py-4 text-right text-sm font-medium">
                  <div className="flex justify-end gap-2 flex-wrap">
                    {onView && (
                      <button
                        onClick={() => onView(item)}
                        className="px-3 py-1.5 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all duration-200 hover:shadow-md"
                      >
                        View
                      </button>
                    )}
                    {onEdit && canEdit(item) && (
                      <button
                        onClick={() => onEdit(item)}
                        className="px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-100 hover:bg-blue-200 rounded-lg transition-all duration-200 hover:shadow-md"
                      >
                        Edit
                      </button>
                    )}
                    {onApprove && canApprove(item) && (
                      <button
                        onClick={() => onApprove(item)}
                        className="px-3 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 rounded-lg transition-all duration-200 hover:shadow-md transform hover:scale-105"
                      >
                        Approve
                      </button>
                    )}
                    {onReject && canReject(item) && (
                      <button
                        onClick={() => onReject(item)}
                        className="px-3 py-1.5 text-xs font-semibold text-red-700 bg-red-100 hover:bg-red-200 border-2 border-red-300 rounded-lg transition-all duration-200 hover:shadow-md"
                      >
                        Reject
                      </button>
                    )}
                    {onDelete && canDelete(item) && (
                      <button
                        onClick={() => onDelete(item)}
                        className="px-3 py-1.5 text-xs font-semibold text-red-700 bg-red-100 hover:bg-red-200 border-2 border-red-300 rounded-lg transition-all duration-200 hover:shadow-md"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default ConfigurationTable;
