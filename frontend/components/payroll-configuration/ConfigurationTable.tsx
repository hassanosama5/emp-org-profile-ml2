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
      <div className="rounded-lg border border-white/20 backdrop-blur-xl bg-white/10 p-12 text-center">
        <div className="text-white/40 mb-2">
          <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
          </svg>
        </div>
        <p className="text-white/70 text-lg">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border-2 border-white/20 backdrop-blur-xl bg-gradient-to-br from-white/10 via-white/5 to-white/10 shadow-2xl">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gradient-to-r from-white/15 via-white/10 to-white/15 border-b-2 border-white/20">
            {columns.map((column) => (
              <th
                key={column.key}
                className={`px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-white/90 ${column.className || ''}`}
              >
                {column.label}
              </th>
            ))}
            {showStatus && (
              <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-white/90">
                Status
              </th>
            )}
            <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-white/90">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/10">
          {data.map((item, index) => {
            const itemId = item._id || item.id || '';
            return (
              <tr 
                key={itemId} 
                className={`hover:bg-gradient-to-r hover:from-white/15 hover:via-white/10 hover:to-white/15 transition-all duration-300 ${index % 2 === 0 ? 'bg-white/5' : 'bg-white/8'}`}
              >
                {columns.map((column) => (
                  <td key={column.key} className={`px-6 py-4 text-sm text-white align-top ${column.className || ''}`}>
                    {column.render ? column.render(item) : (item[column.key] as string) || '-'}
                  </td>
                ))}
                {showStatus && (
                  <td className="px-6 py-4 text-sm align-top">
                    <StatusBadge status={item.status} size="sm" />
                  </td>
                )}
                <td className="px-6 py-4 text-right text-sm font-medium align-top">
                  <div className="flex justify-end gap-2 flex-wrap">
                    {onView && (
                      <button
                        onClick={() => onView(item)}
                        className="px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-slate-600/80 to-slate-700/80 hover:from-slate-500 hover:to-slate-600 rounded-lg transition-all duration-200 hover:shadow-lg backdrop-blur-md border border-white/20 hover:border-white/40 transform hover:scale-105"
                      >
                        View
                      </button>
                    )}
                    {onEdit && canEdit(item) && (
                      <button
                        onClick={() => onEdit(item)}
                        className="px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 rounded-lg transition-all duration-200 hover:shadow-lg backdrop-blur-md transform hover:scale-105 shadow-md shadow-blue-500/30"
                      >
                        Edit
                      </button>
                    )}
                    {onApprove && canApprove(item) && (
                      <button
                        onClick={() => onApprove(item)}
                        className="px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 rounded-lg transition-all duration-200 hover:shadow-lg transform hover:scale-105 shadow-md shadow-green-500/30"
                      >
                        Approve
                      </button>
                    )}
                    {onReject && canReject(item) && (
                      <button
                        onClick={() => onReject(item)}
                        className="px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 rounded-lg transition-all duration-200 hover:shadow-lg backdrop-blur-md border border-red-400/30 hover:border-red-400/50 transform hover:scale-105 shadow-md shadow-red-500/30"
                      >
                        Reject
                      </button>
                    )}
                    {onDelete && canDelete(item) && (
                      <button
                        onClick={() => onDelete(item)}
                        className="px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 rounded-lg transition-all duration-200 hover:shadow-lg backdrop-blur-md border border-red-400/30 hover:border-red-400/50 transform hover:scale-105 shadow-md shadow-red-500/30"
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
