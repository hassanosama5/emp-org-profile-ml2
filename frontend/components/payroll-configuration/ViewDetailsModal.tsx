"use client";

import React from 'react';
import { Button } from '@/components/shared/ui/Button';
import { Card, CardContent } from '@/components/shared/ui/Card';

interface ViewDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  data: any;
  type: string;
}

export const ViewDetailsModal: React.FC<ViewDetailsModalProps> = ({
  isOpen,
  onClose,
  title,
  data,
  type,
}) => {
  if (!isOpen || !data) return null;

  const renderField = (label: string, value: any) => {
    if (value === undefined || value === null) return null;
    
    let displayValue = value;
    if (typeof value === 'object' && !Array.isArray(value)) {
      displayValue = JSON.stringify(value, null, 2);
    } else if (Array.isArray(value)) {
      displayValue = value.join(', ');
    } else if (typeof value === 'boolean') {
      displayValue = value ? 'Yes' : 'No';
    } else if (typeof value === 'string' && value.includes('T') && value.includes('Z')) {
      // ISO date string
      displayValue = new Date(value).toLocaleString();
    }

    return (
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-500 mb-1">
          {label}
        </label>
        <p className="text-sm text-gray-900">{String(displayValue)}</p>
      </div>
    );
  };

  const renderDetails = () => {
    // Filter out internal fields and render the rest
    const excludeFields = ['_id', '__v', 'createdBy', 'approvedBy', 'createdAt', 'updatedAt', 'approvedAt'];
    
    return Object.entries(data)
      .filter(([key]) => !excludeFields.includes(key))
      .map(([key, value]) => {
        // Format field name
        const formattedKey = key
          .replace(/([A-Z])/g, ' $1')
          .replace(/^./, (str) => str.toUpperCase())
          .trim();
        
        return renderField(formattedKey, value);
      });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-2xl max-h-[90vh] rounded-lg bg-white shadow-xl overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
            <Button variant="ghost" size="sm" onClick={onClose}>
              ✕
            </Button>
          </div>
        </div>
        
        <div className="px-6 py-4 overflow-y-auto flex-1">
          <Card>
            <CardContent className="pt-6">
              {renderDetails()}
              
              {/* Show metadata if available */}
              {(data.createdAt || data.createdBy) && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Metadata</h3>
                  {data.createdAt && renderField('Created At', data.createdAt)}
                  {data.createdBy && renderField('Created By', 
                    typeof data.createdBy === 'object' 
                      ? `${data.createdBy.firstName || ''} ${data.createdBy.lastName || ''}`.trim() || data.createdBy.email
                      : data.createdBy
                  )}
                  {data.approvedAt && renderField('Approved At', data.approvedAt)}
                  {data.approvedBy && renderField('Approved By',
                    typeof data.approvedBy === 'object'
                      ? `${data.approvedBy.firstName || ''} ${data.approvedBy.lastName || ''}`.trim() || data.approvedBy.email
                      : data.approvedBy
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
          <Button variant="primary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};

