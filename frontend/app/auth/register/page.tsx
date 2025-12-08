"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../lib/hooks/use-auth";
import { RegisterRequest } from "../../../types";

const inputClass =
  "w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500";

export default function RegisterPage() {
  const router = useRouter();
  const { register, loading, error } = useAuth();

  const [form, setForm] = useState<Partial<RegisterRequest>>({});

  const update = (
    key: keyof RegisterRequest,
    value: RegisterRequest[keyof RegisterRequest]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await register(form as RegisterRequest);
    router.push("/auth/dashboard-redirect");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-xl rounded-xl bg-white p-8 shadow-lg"
      >
        <h2 className="mb-2 text-center text-2xl font-semibold text-gray-900">
          Create Account
        </h2>
        <p className="text-center text-sm text-gray-600 mb-4">
          Choose account type and fill required fields
        </p>

        {error && (
          <p className="mb-4 rounded bg-red-50 p-2 text-sm text-red-600">
            {error}
          </p>
        )}

        <div className="grid grid-cols-2 gap-4">
          <input
            className={inputClass}
            placeholder="First Name"
            onChange={(e) => update("firstName", e.target.value)}
          />
          <input
            className={inputClass}
            placeholder="Middle Name"
            onChange={(e) => update("middleName", e.target.value)}
          />
          <input
            className={inputClass}
            placeholder="Last Name"
            onChange={(e) => update("lastName", e.target.value)}
          />
          <input
            className={inputClass}
            placeholder="National ID"
            onChange={(e) => update("nationalId", e.target.value)}
          />
        </div>

        <input
          className={`${inputClass} mt-4`}
          type="email"
          placeholder="Personal Email"
          onChange={(e) => update("personalEmail", e.target.value)}
        />

        <input
          className={`${inputClass} mt-4`}
          type="password"
          placeholder="Password"
          onChange={(e) => update("password", e.target.value)}
        />

        <div className="grid grid-cols-2 gap-4 mt-4">
          <select
            className={inputClass}
            defaultValue=""
            onChange={(e) => update("gender", e.target.value)}
          >
            <option value="" disabled>
              Select Gender
            </option>
            <option value="MALE">MALE</option>
            <option value="FEMALE">FEMALE</option>
          </select>

          <select
            className={inputClass}
            defaultValue=""
            onChange={(e) => update("maritalStatus", e.target.value)}
          >
            <option value="" disabled>
              Marital Status
            </option>
            <option value="SINGLE">SINGLE</option>
            <option value="MARRIED">MARRIED</option>
            <option value="DIVORCED">DIVORCED</option>
            <option value="WIDOWED">WIDOWED</option>
          </select>
        </div>

        <input
          type="date"
          className={`${inputClass} mt-4`}
          onChange={(e) => update("dateOfBirth", e.target.value)}
        />

        <div className="grid grid-cols-2 gap-4 mt-4">
          <input
            className={inputClass}
            placeholder="Mobile Phone (optional)"
            onChange={(e) => update("mobilePhone", e.target.value)}
          />
          <input
            className={inputClass}
            placeholder="Home Phone (optional)"
            onChange={(e) => update("homePhone", e.target.value)}
          />
        </div>

        <div className="grid grid-cols-3 gap-4 mt-4">
          <input
            className={inputClass}
            placeholder="Street Address"
            onChange={(e) =>
              update("address", {
                ...form.address,
                streetAddress: e.target.value,
              } as any)
            }
          />
          <input
            className={inputClass}
            placeholder="City"
            onChange={(e) =>
              update("address", {
                ...form.address,
                city: e.target.value,
              } as any)
            }
          />
          <input
            className={inputClass}
            placeholder="Country"
            onChange={(e) =>
              update("address", {
                ...form.address,
                country: e.target.value,
              } as any)
            }
          />
        </div>

        <div className="grid grid-cols-2 gap-4 mt-4">
          <input
            className={inputClass}
            placeholder="Department ID (optional)"
            onChange={(e) => update("departmentId", e.target.value)}
          />
          <input
            className={inputClass}
            placeholder="Position ID (optional)"
            onChange={(e) => update("positionId", e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-4 mt-4">
          <input
            className={inputClass}
            placeholder="Resume URL (optional)"
            onChange={(e) => update("resumeUrl", e.target.value)}
          />
          <input
            className={inputClass}
            placeholder="Notes (optional)"
            onChange={(e) => update("notes", e.target.value)}
          />
        </div>

        <button
          disabled={loading}
          className="mt-6 w-full rounded-md bg-indigo-600 py-2.5 font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {loading ? "Creating account..." : "Register"}
        </button>
      </form>
    </div>
  );
}
