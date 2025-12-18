"use client";

// ============================================================================
// RECRUITMENT SYSTEM - Login Page
// ============================================================================
// This login page handles authentication for both employees and candidates.
// 
// RECRUITMENT/OFFBOARDING INTEGRATION (OFF-007):
// - When an employee is offboarded and their system access is revoked,
//   their status is set to 'INACTIVE' in the database.
// - The backend auth service checks this status and returns an error message
//   if the employee tries to login after access revocation.
// - The error message persists on screen until the user tries to login again,
//   allowing them to read the full deactivation message.
//
// Related User Story: OFF-007 - "As a System Admin, I want to revoke system
// and account access upon termination, so security is maintained."
// ============================================================================

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../lib/hooks/use-auth";

const inputClass =
  "w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500";

export default function LoginPage() {
  const router = useRouter();
  const { login, loading, error } = useAuth();

  const [employeeNumber, setEmployeeNumber] = useState("");
  const [password, setPassword] = useState("");
  // RECRUITMENT SYSTEM: Local error state to persist error messages
  // This ensures error messages (like account deactivation) stay visible
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    
    try {
      await login({ employeeNumber, password });
      // Only redirect if login was successful (no error thrown)
      router.push("/auth/dashboard-redirect");
    } catch (err: any) {
      // RECRUITMENT SYSTEM (OFF-007): Error handling for deactivated accounts
      // When an employee's access is revoked during offboarding, they receive
      // a clear error message explaining their account has been deactivated.
      // The error persists until the next login attempt so users can read it.
      setLocalError(err?.message || "Login failed. Please try again.");
    }
  };

  const displayError = localError || error;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-xl bg-white p-8 shadow-lg"
      >
        <h2 className="mb-6 text-center text-2xl font-semibold text-gray-900">
          Login
        </h2>

        {/* RECRUITMENT SYSTEM (OFF-007): Error display for login failures
            This shows clear error messages including account deactivation notices
            when employees try to login after their access has been revoked */}
        {displayError && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-4">
            <div className="flex items-start">
              <span className="text-red-500 mr-2">❌</span>
              <div>
                <p className="text-sm font-medium text-red-800">Login Failed</p>
                <p className="text-sm text-red-600 mt-1">{displayError}</p>
              </div>
            </div>
          </div>
        )}

        <input
          className={inputClass}
          placeholder="Employee Number"
          value={employeeNumber}
          onChange={(e) => setEmployeeNumber(e.target.value)}
          required
        />

        <input
          type="password"
          className={`${inputClass} mt-4`}
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button
          disabled={loading}
          className="mt-6 w-full rounded-md bg-indigo-600 py-2.5 font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>
    </div>
  );
}
