"use client";

import React, { useState, useRef } from "react";
import { leavesApi } from "../../lib/api/leaves/leaves";

interface FileUploadProps {
  onUploadSuccess: (attachmentId: string) => void;
  onUploadError?: (error: string) => void;
  accept?: string;
  maxSizeMB?: number;
  label?: string;
  required?: boolean;
  allowManualEntry?: boolean;
  onManualEntry?: (attachmentId: string) => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  onUploadSuccess,
  onUploadError,
  accept = ".pdf,.doc,.docx,.jpg,.jpeg,.png",
  maxSizeMB = 5,
  label = "Upload Document",
  required = false,
  allowManualEntry = false, // NEW CODE: Disable manual entry - employees should upload files directly
  onManualEntry,
}) => {
  const [uploading, setUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [attachmentId, setAttachmentId] = useState<string | null>(null);
  const [error, setError] = useState<string>("");
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualAttachmentId, setManualAttachmentId] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);
  const dragCounterRef = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    // Check file size
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      return `File size exceeds ${maxSizeMB}MB limit`;
    }

    // Check file type
    const allowedExtensions = accept.split(",").map(ext => ext.trim().replace(".", ""));
    const fileExtension = file.name.split(".").pop()?.toLowerCase();
    
    if (!fileExtension || !allowedExtensions.includes(fileExtension)) {
      return `Invalid file type. Allowed types: ${accept}`;
    }

    return null;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
  };

  const handleRemove = () => {
    setUploadedFile(null);
    setAttachmentId(null);
    setError("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const processFile = async (file: File) => {
    setError("");
    setUploadedFile(null);
    setAttachmentId(null);

    // Validate file
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      if (onUploadError) {
        onUploadError(validationError);
      }
      return;
    }

    setUploading(true);
    setUploadedFile(file);

    try {
      const result = await leavesApi.uploadAttachment(file);
      setAttachmentId(result.attachmentId);
      onUploadSuccess(result.attachmentId);
      setError("");
    } catch (error: any) {
      const errorMessage = error.message || "Failed to upload file. Please try again.";
      setError(errorMessage);
      setUploadedFile(null);
      
      // Always show manual entry option when upload fails
      if (allowManualEntry && !showManualEntry) {
        setShowManualEntry(true);
      }
      
      // For required uploads, show helpful message
      if (required && onUploadError) {
        onUploadError("Upload failed. Please enter attachment ID manually below.");
      } else if (!required && onUploadError) {
        onUploadError(errorMessage);
      }
    } finally {
      setUploading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!uploading && e.dataTransfer.types.includes('Files')) {
      e.dataTransfer.dropEffect = 'copy';
      if (!isDragging) {
        setIsDragging(true);
      }
    }
  };

  const handleDragEnter = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!uploading && e.dataTransfer.types.includes('Files')) {
      dragCounterRef.current++;
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    dragCounterRef.current--;
    
    // Only clear dragging state when drag counter reaches 0 (actually left the drop zone)
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0;
      setIsDragging(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    dragCounterRef.current = 0;
    setIsDragging(false);

    if (uploading) {
      return;
    }

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      processFile(file);
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      
      {!uploadedFile ? (
        <div className="flex items-center gap-4">
          <label
            className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
              isDragging
                ? "border-blue-500 bg-blue-50"
                : "border-gray-300 bg-gray-50 hover:bg-gray-100"
            } ${uploading ? "opacity-50 cursor-not-allowed" : ""}`}
            onDragOver={handleDragOver}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <svg
                className={`w-10 h-10 mb-3 ${isDragging ? "text-blue-500" : "text-gray-400"}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              <p className={`mb-2 text-sm ${isDragging ? "text-blue-600 font-semibold" : "text-gray-500"}`}>
                {isDragging ? (
                  <span className="font-semibold">Drop file here</span>
                ) : (
                  <>
                    <span className="font-semibold">Click to upload</span> or drag and drop
                  </>
                )}
              </p>
              <p className="text-xs text-gray-500">
                {accept.toUpperCase()} (MAX. {maxSizeMB}MB)
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept={accept}
              onChange={handleFileChange}
              disabled={uploading}
            />
          </label>
        </div>
      ) : (
        <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-3">
            <svg
              className="w-8 h-8 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <p className="text-sm font-medium text-green-800">
                {uploadedFile.name}
              </p>
              <p className="text-xs text-green-600">
                {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                {attachmentId && " • Uploaded successfully"}
              </p>
            </div>
          </div>
          {!uploading && (
            <button
              type="button"
              onClick={handleRemove}
              className="text-red-600 hover:text-red-800 text-sm font-medium"
            >
              Remove
            </button>
          )}
        </div>
      )}

      {uploading && (
        <div className="flex items-center gap-2 text-sm text-blue-600">
          <svg
            className="animate-spin h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          Uploading...
        </div>
      )}

      {error && (
        <div className="space-y-2">
          <p className="text-sm text-red-600">{error}</p>
          {allowManualEntry && !showManualEntry && (
            <button
              type="button"
              onClick={() => setShowManualEntry(true)}
              className="text-sm text-blue-600 hover:text-blue-800 underline"
            >
              {required ? "Enter attachment ID manually instead" : "Or enter attachment ID manually"}
            </button>
          )}
        </div>
      )}

      {showManualEntry && allowManualEntry && (
        <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Enter Attachment ID
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={manualAttachmentId}
              onChange={(e) => setManualAttachmentId(e.target.value.trim().replace(/\s+/g, ''))}
              placeholder="Enter attachment ID (24-character MongoDB ObjectId)"
              className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              spellCheck={false}
              autoComplete="off"
            />
            <button
              type="button"
              onClick={() => {
                if (manualAttachmentId && manualAttachmentId.trim()) {
                  const trimmedId = manualAttachmentId.trim();
                  if (onManualEntry) {
                    onManualEntry(trimmedId);
                  }
                  setAttachmentId(trimmedId);
                  onUploadSuccess(trimmedId);
                  setError("");
                  setShowManualEntry(false);
                }
              }}
              disabled={!manualAttachmentId || !manualAttachmentId.trim()}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              Use ID
            </button>
            <button
              type="button"
              onClick={() => {
                setShowManualEntry(false);
                setManualAttachmentId("");
              }}
              className="px-4 py-2 bg-gray-200 text-gray-700 text-sm rounded-md hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {attachmentId && (
        <input type="hidden" name="attachmentId" value={attachmentId} />
      )}
    </div>
  );
};

