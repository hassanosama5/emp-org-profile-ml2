'use client';

import { ReactNode } from 'react';

interface FormField {
  name: string;
  label: string;
  type: 'text' | 'number' | 'email' | 'password' | 'date' | 'select' | 'textarea' | 'checkbox';
  placeholder?: string;
  required?: boolean;
  options?: { value: string; label: string }[];
  rows?: number;
}

interface ConfigurationFormProps {
  title: string;
  subtitle?: string;
  fields: FormField[];
  initialValues?: Record<string, any>;
  onSubmit: (values: Record<string, any>) => void;
  onCancel: () => void;
  isLoading?: boolean;
  submitLabel?: string;
  cancelLabel?: string;
  children?: ReactNode;
}

export default function ConfigurationForm({
  title,
  subtitle,
  fields,
  initialValues = {},
  onSubmit,
  onCancel,
  isLoading = false,
  submitLabel = 'Save',
  cancelLabel = 'Cancel',
  children
}: ConfigurationFormProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const values: Record<string, any> = {};
    
    fields.forEach(field => {
      if (field.type === 'checkbox') {
        values[field.name] = (formData.get(field.name) === 'on');
      } else {
        values[field.name] = formData.get(field.name);
      }
    });
    
    onSubmit(values);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="md:flex md:items-center md:justify-between mb-8">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
            {title}
          </h2>
          {subtitle && (
            <p className="mt-2 text-sm text-gray-500">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
              {fields.map((field) => (
                <div key={field.name} className={`sm:col-span-${field.type === 'textarea' ? '6' : '3'}`}>
                  <label htmlFor={field.name} className="block text-sm font-medium text-gray-700">
                    {field.label}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  
                  {field.type === 'select' ? (
                    <select
                      id={field.name}
                      name={field.name}
                      defaultValue={initialValues[field.name] || ''}
                      required={field.required}
                      className="mt-1 block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 rounded-md"
                    >
                      <option value="">Select an option</option>
                      {field.options?.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  ) : field.type === 'textarea' ? (
                    <textarea
                      id={field.name}
                      name={field.name}
                      rows={field.rows || 4}
                      defaultValue={initialValues[field.name] || ''}
                      required={field.required}
                      placeholder={field.placeholder}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                  ) : field.type === 'checkbox' ? (
                    <div className="mt-2">
                      <input
                        type="checkbox"
                        id={field.name}
                        name={field.name}
                        defaultChecked={initialValues[field.name] || false}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                    </div>
                  ) : (
                    <input
                      type={field.type}
                      id={field.name}
                      name={field.name}
                      defaultValue={initialValues[field.name] || ''}
                      required={field.required}
                      placeholder={field.placeholder}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                  )}
                </div>
              ))}
              
              {/* Additional custom fields */}
              {children}
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            disabled={isLoading}
          >
            {cancelLabel}
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </span>
            ) : (
              submitLabel
            )}
          </button>
        </div>
      </form>
    </div>
  );
}