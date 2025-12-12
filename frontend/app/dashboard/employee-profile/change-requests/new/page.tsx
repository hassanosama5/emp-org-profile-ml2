"use client";

import { ProtectedRoute } from "@/components/auth/protected-route";
import { useRequireAuth } from "@/lib/hooks/use-auth";
import { SystemRole } from "@/types";
import { Input } from "@/components/shared/ui/Input";
import { Textarea } from "@/components/leaves/Textarea";
import { Select } from "@/components/leaves/Select";
import { Button } from "@/components/shared/ui/Button";
import { useState } from "react";
import { Toast, useToast } from "@/components/leaves/Toast";
import { employeeProfileApi } from "@/lib/api/employee-profile/profile";

export default function NewChangeRequestPage() {
  useRequireAuth(SystemRole.DEPARTMENT_EMPLOYEE);
  const [subject, setSubject] = useState("");
  const [details, setDetails] = useState("");
  const [changeType, setChangeType] = useState<string>("");
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [positionId, setPositionId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [maritalStatus, setMaritalStatus] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const { toast, showToast, hideToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const desc = details.trim();

      if (!changeType) {
        showToast("Select a change type", "error");
        setSaving(false);
        return;
      }

      let changes: Record<string, any> = {};
      if (changeType === "LEGAL_NAME") {
        if (!firstName.trim() && !lastName.trim()) {
          showToast("Provide first or last name", "error");
          setSaving(false);
          return;
        }
        if (firstName.trim()) changes.firstName = firstName.trim();
        if (middleName.trim()) changes.middleName = middleName.trim();
        if (lastName.trim()) changes.lastName = lastName.trim();
      } else if (changeType === "NATIONAL_ID") {
        if (!nationalId.trim()) {
          showToast("Provide national ID", "error");
          setSaving(false);
          return;
        }
        changes.nationalId = nationalId.trim();
      } else if (changeType === "POSITION") {
        if (!positionId.trim()) {
          showToast("Provide position ID", "error");
          setSaving(false);
          return;
        }
        changes.primaryPositionId = positionId.trim();
        if (departmentId.trim())
          changes.primaryDepartmentId = departmentId.trim();
      } else if (changeType === "MARITAL_STATUS") {
        if (!maritalStatus) {
          showToast("Select marital status", "error");
          setSaving(false);
          return;
        }
        changes.maritalStatus = maritalStatus;
      }

      const payload = JSON.stringify({ type: changeType, changes });
      // Auto-subject based on type if not provided
      const autoSubjectMap: Record<string, string> = {
        LEGAL_NAME: "Legal Name Change Request",
        NATIONAL_ID: "National ID Change Request",
        POSITION: "Position/Department Change Request",
        MARITAL_STATUS: "Marital Status Change Request",
      };
      const finalSubject =
        (subject && subject.trim()) ||
        autoSubjectMap[changeType] ||
        "Profile Change Request";

      await employeeProfileApi.submitChangeRequest({
        requestDescription: payload,
        reason: finalSubject,
      });
      showToast("Request submitted", "success");
      setSubject("");
      setDetails("");
      setChangeType("");
      setFirstName("");
      setMiddleName("");
      setLastName("");
      setNationalId("");
      setPositionId("");
      setDepartmentId("");
      setMaritalStatus("");
    } catch (error: any) {
      showToast(error.message || "Failed to submit request", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ProtectedRoute requiredUserType="employee">
      <div className="container mx-auto px-6 py-8">
        <Toast
          message={toast.message}
          type={toast.type}
          isVisible={toast.isVisible}
          onClose={hideToast}
        />
        <h1 className="text-3xl font-bold text-gray-900">New Change Request</h1>
        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <Select
            label="Change Type"
            value={changeType}
            onChange={(e) => {
              const val = e.target.value;
              setChangeType(val);
              const autoSubjectMap: Record<string, string> = {
                LEGAL_NAME: "Legal Name Change Request",
                NATIONAL_ID: "National ID Change Request",
                POSITION: "Position/Department Change Request",
                MARITAL_STATUS: "Marital Status Change Request",
              };
              setSubject(autoSubjectMap[val] || "Profile Change Request");
            }}
            options={[
              { value: "LEGAL_NAME", label: "Legal Name" },
              { value: "NATIONAL_ID", label: "National ID" },
              { value: "POSITION", label: "Position / Department" },
              { value: "MARITAL_STATUS", label: "Marital Status" },
            ]}
            placeholder="Select type"
          />

          {changeType === "LEGAL_NAME" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Input
                label="First Name"
                placeholder="First name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
              <Input
                label="Middle Name"
                placeholder="Middle name"
                value={middleName}
                onChange={(e) => setMiddleName(e.target.value)}
              />
              <Input
                label="Last Name"
                placeholder="Last name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
          )}

          {changeType === "NATIONAL_ID" && (
            <Input
              label="National ID"
              placeholder="14-digit ID"
              value={nationalId}
              onChange={(e) => setNationalId(e.target.value)}
            />
          )}

          {changeType === "POSITION" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input
                label="Position ID"
                placeholder="Position ObjectId"
                value={positionId}
                onChange={(e) => setPositionId(e.target.value)}
              />
              <Input
                label="Department ID (optional)"
                placeholder="Department ObjectId"
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
              />
            </div>
          )}

          {changeType === "MARITAL_STATUS" && (
            <Select
              label="Marital Status"
              value={maritalStatus}
              onChange={(e) => setMaritalStatus(e.target.value)}
              options={[
                { value: "SINGLE", label: "Single" },
                { value: "MARRIED", label: "Married" },
                { value: "DIVORCED", label: "Divorced" },
                { value: "WIDOWED", label: "Widowed" },
              ]}
              placeholder="Select status"
            />
          )}

          <Input
            label="Subject"
            placeholder="Request subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
          <Textarea
            label="Details"
            rows={4}
            placeholder="Describe your request"
            value={details}
            onChange={(e) => setDetails(e.target.value)}
          />
          <Button type="submit" isLoading={saving}>
            Submit Request
          </Button>
        </form>
      </div>
    </ProtectedRoute>
  );
}
