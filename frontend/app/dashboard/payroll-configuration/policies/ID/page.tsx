'use client';

import { useParams, useRouter } from 'next/navigation';
import StatusBadge from '@/components/payroll-configuration/StatusBadge';

export default function PolicyDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const policyId = params.id as string;

  // Mock data
  const policy = {
    id: policyId,
    name: 'Overtime Policy',
    description: 'Defines overtime calculation rules for employees working beyond regular hours. This policy applies to all full-time employees.',
    status: 'draft' as const,
    policyType: 'overtime',
    effectiveDate: '2024-03-01',
    rules: {
      overtimeRate: 1.5,
      maxOvertimeHours: 20,
      approvalRequired: true,
      approver: 'Department Manager',
      calculationMethod: 'hourly_rate × 1.5 × overtime_hours'
    },
    department: 'All Departments',
    location: 'All Locations',
    createdBy: 'john.doe@company.com',
    createdAt: '2024-01-15T10:30:00Z',
    updatedAt: '2024-01-20T14:45:00Z',
    version: 2,
    comments: 'Pending review by HR department'
  };

  const handleEdit = () => {
    if (policy.status === 'draft') {
      router.push(`/dashboard/payroll-configuration/policies/${policyId}/edit`);
    }
  };

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => router.push('/dashboard/payroll-configuration/policies')}
            className="p-2 rounded-md hover:bg-gray-100"
          >
            ← Back
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{policy.name}</h1>
            <div className="flex items-center space-x-2 mt-1">
              <StatusBadge status={policy.status} />
              <span className="text-sm text-gray-500">ID: {policy.id}</span>
              <span className="text-sm text-gray-500">• Version: {policy.version}</span>
            </div>
          </div>
        </div>
        
        {policy.status === 'draft' && (
          <button
            onClick={handleEdit}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700"
          >
            Edit Policy
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Details Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description Card */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Policy Description</h2>
            <p className="text-gray-700 whitespace-pre-line">{policy.description}</p>
          </div>

          {/* Rules Card */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Policy Rules</h2>
            <div className="space-y-4">
              {Object.entries(policy.rules).map(([key, value]) => (
                <div key={key} className="flex justify-between items-center py-3 border-b border-gray-100 last:border-0">
                  <span className="text-sm font-medium text-gray-700 capitalize">
                    {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                  </span>
                  <span className="text-sm text-gray-900 font-medium">
                    {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar Column */}
        <div className="space-y-6">
          {/* Details Card */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Policy Details</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Policy Type</label>
                <p className="mt-1 text-sm text-gray-900 capitalize">{policy.policyType}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Effective Date</label>
                <p className="mt-1 text-sm text-gray-900">
                  {new Date(policy.effectiveDate).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Department</label>
                <p className="mt-1 text-sm text-gray-900">{policy.department}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Location</label>
                <p className="mt-1 text-sm text-gray-900">{policy.location}</p>
              </div>
            </div>
          </div>

          {/* Metadata Card */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Audit Information</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Created By</label>
                <p className="mt-1 text-sm text-gray-900">{policy.createdBy}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Created At</label>
                <p className="mt-1 text-sm text-gray-900">
                  {new Date(policy.createdAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Last Updated</label>
                <p className="mt-1 text-sm text-gray-900">
                  {new Date(policy.updatedAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            </div>
          </div>

          {/* Comments Card */}
          {policy.comments && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <h2 className="text-lg font-medium text-yellow-800 mb-2">Comments</h2>
              <p className="text-sm text-yellow-700">{policy.comments}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}