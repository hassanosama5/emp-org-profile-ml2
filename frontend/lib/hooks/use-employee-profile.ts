// lib/hooks/use-employee-profile.ts
"use client";

import { useState, useEffect, useCallback } from "react";
import { employeeProfileApi } from "@/lib/api/employee-profile/employee-profile";
import type {
  EmployeeProfile,
  ProfileChangeRequest,
  UpdateProfileDto,
  TeamMember,
} from "@/types";

export function useEmployeeProfile(employeeId?: string) {
  const [profile, setProfile] = useState<EmployeeProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      let response;

      if (employeeId) {
        response = await employeeProfileApi.getEmployeeById(employeeId);
      } else {
        response = await employeeProfileApi.getMyProfile();
      }

      // Since axios interceptor returns response.data directly,
      // and your API returns { message, data }
      // So response is { message, data }
      // We need to extract the data property
      const data =
        response && typeof response === "object" && "data" in (response as any)
          ? (response as any).data
          : response;
      setProfile(data as EmployeeProfile | null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load profile");
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const updateProfile = useCallback(
    async (data: UpdateProfileDto) => {
      try {
        let response;
        if (employeeId) {
          response = await employeeProfileApi.updateEmployee(employeeId, data);
        } else {
          response = await employeeProfileApi.updateMyProfile(data);
        }

        // Same logic: extract data from response
        const payload =
          response &&
          typeof response === "object" &&
          "data" in (response as any)
            ? (response as any).data
            : response;
        setProfile(payload as EmployeeProfile | null);
        return payload as EmployeeProfile;
      } catch (err) {
        throw err instanceof Error ? err : new Error("Update failed");
      }
    },
    [employeeId]
  );

  return {
    profile,
    loading,
    error,
    refresh: loadProfile,
    updateProfile,
  };
}

export function useChangeRequests() {
  const [requests, setRequests] = useState<ProfileChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRequests = useCallback(async () => {
    try {
      setLoading(true);
      const response = await employeeProfileApi.getMyChangeRequests();

      // Extract data from response
      const data =
        response && typeof response === "object" && "data" in (response as any)
          ? (response as any).data
          : response;
      setRequests((data as ProfileChangeRequest[]) || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load requests");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const submitRequest = useCallback(
    async (input: { requestDescription: string; reason?: string }) => {
      try {
        const response = await employeeProfileApi.submitChangeRequest(input);
        await loadRequests(); // Refresh the list

        // Extract data from response
        const payload =
          response &&
          typeof response === "object" &&
          "data" in (response as any)
            ? (response as any).data
            : response;
        return payload as ProfileChangeRequest;
      } catch (err) {
        throw err instanceof Error ? err : new Error("Submission failed");
      }
    },
    [loadRequests]
  );

  const cancelRequest = useCallback(
    async (id: string) => {
      try {
        const response = await employeeProfileApi.cancelChangeRequest(id);
        await loadRequests(); // Refresh the list

        // Extract data from response
        const data =
          response &&
          typeof response === "object" &&
          "data" in (response as any)
            ? (response as any).data
            : response;
        return data as ProfileChangeRequest;
      } catch (err) {
        throw err instanceof Error ? err : new Error("Cancellation failed");
      }
    },
    [loadRequests]
  );

  return {
    requests,
    loading,
    error,
    refresh: loadRequests,
    submitRequest,
    cancelRequest,
  };
}

export function useTeamMembers() {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTeam = useCallback(async () => {
    try {
      setLoading(true);
      const response = await employeeProfileApi.getMyTeam();

      const payload =
        response && typeof response === "object" && "data" in (response as any)
          ? (response as any).data
          : response;
      setTeamMembers((payload as TeamMember[]) || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load team");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTeam();
  }, [loadTeam]);

  return {
    teamMembers,
    loading,
    error,
    refresh: loadTeam,
  };
}
