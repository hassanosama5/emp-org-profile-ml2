// components/employee-profile/ProfilePhotoUpload.tsx
"use client";
import { useAuth } from "@/lib/hooks/use-auth";

import { useState } from "react";
import { Button } from "@/components/shared/ui/Button";
import { Toast, useToast } from "@/components/leaves/Toast";
import { employeeProfileApi } from "@/lib/api/employee-profile/employee-profile";
import { User, Upload, X } from "lucide-react";

interface ProfilePhotoUploadProps {
  currentPhotoUrl?: string;
  onPhotoUpdated?: (newUrl: string) => void;
}

export default function ProfilePhotoUpload({
  currentPhotoUrl,
  onPhotoUpdated,
}: ProfilePhotoUploadProps) {
  const { toast, showToast, hideToast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file
    if (!file.type.startsWith("image/")) {
      showToast("Please select an image file", "error");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      // 5MB limit
      showToast("Image must be less than 5MB", "error");
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Upload
    await uploadPhoto(file);
  };

  const { updateUser } = useAuth(); // Get updateUser method

  const uploadPhoto = async (file: File) => {
    try {
      setUploading(true);

      const formData = new FormData();
      formData.append("photo", file);

      const response = await employeeProfileApi.uploadProfilePicture(formData);
      const profilePictureUrl = response.profilePictureUrl;

      showToast("Profile photo updated successfully", "success");

      // 1. Update auth store FIRST (HEADER WILL UPDATE IMMEDIATELY)
      // Add cache-busting timestamp to force browser refresh
      const urlWithTimestamp = `${profilePictureUrl}?t=${Date.now()}`;
      updateUser({ profilePictureUrl: urlWithTimestamp });

      // 2. Update parent component if needed
      if (onPhotoUpdated) {
        onPhotoUpdated(profilePictureUrl);
      }

      // 3. Clear preview and force image refresh by updating the display URL
      setPreviewUrl(null);
      
      // Force a re-render by updating the current photo URL with timestamp
      // This ensures the image refreshes immediately
      setTimeout(() => {
        // Trigger a state update to force image reload
        window.dispatchEvent(new Event('profilePictureUpdated'));
      }, 100);
    } catch (error: any) {
      showToast(error.message || "Failed to upload photo", "error");
      setPreviewUrl(null);
    } finally {
      setUploading(false);
    }
  };
  const clearPreview = () => {
    setPreviewUrl(null);
  };

  const displayUrl = previewUrl || currentPhotoUrl;

  return (
    <div className="space-y-4">
      <Toast {...toast} onClose={hideToast} />

      <div className="flex flex-col items-center">
        {/* Photo Display */}
        <div className="relative">
          {displayUrl ? (
            <div className="relative">
              <img
                src={displayUrl}
                alt="Profile"
                className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-lg"
                key={displayUrl}
                onError={(e) => {
                  // Hide image if it fails to load
                  e.currentTarget.style.display = 'none';
                }}
              />
              {previewUrl && (
                <button
                  onClick={clearPreview}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                  title="Cancel upload"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          ) : (
            <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center border-4 border-white shadow-lg">
              <User className="h-16 w-16 text-gray-400" />
            </div>
          )}
        </div>

        {/* Upload Button */}
        <div className="mt-4 space-y-2">
          <input
            type="file"
            id="profile-photo-upload"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
            disabled={uploading}
          />

          {/* Replace the label/button section: */}
          <div className="mt-4 space-y-2">
            <input
              type="file"
              id="profile-photo-upload"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
              disabled={uploading}
            />

            <Button
              variant="outline"
              disabled={uploading}
              onClick={() =>
                document.getElementById("profile-photo-upload")?.click()
              }
              className="cursor-pointer"
            >
              {uploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  {currentPhotoUrl ? "Change Photo" : "Upload Photo"}
                </>
              )}
            </Button>

            <p className="text-xs text-gray-500 text-center">
              JPG, PNG up to 5MB. Recommended: 400×400px
            </p>
          </div>

          <p className="text-xs text-gray-500 text-center">
            JPG, PNG up to 5MB. Recommended: 400×400px
          </p>
        </div>
      </div>

      {/* Instructions */}
      <div className="text-sm text-gray-600 p-3 bg-blue-50 rounded-lg">
        <p className="font-medium mb-1">Photo Guidelines:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Clear, professional headshot</li>
          <li>Well-lit with neutral background</li>
          <li>Face clearly visible</li>
          <li>No filters or heavy editing</li>
        </ul>
      </div>
    </div>
  );
}
