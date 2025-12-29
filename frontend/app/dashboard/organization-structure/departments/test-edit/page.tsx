"use client";

import { useState } from "react";
import { useOrganizationStructure } from "@/lib/hooks/use-organization-structure";

export default function TestEditPage() {
  const { updateDepartment } = useOrganizationStructure();
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<any>(null);

  const testUpdate = async () => {
    try {
      const testData = {
        name: "Test Department Updated",
        description: "This is a test update",
      };
      
      console.log("Sending:", testData);
      const response = await updateDepartment("693c78498a00ba12753f884d", testData);
      setResult(response);
      setError(null);
    } catch (err) {
      setError(err);
      setResult(null);
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Test Department Update</h1>
      
      <button
        onClick={testUpdate}
        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 mb-4"
      >
        Test Update Department
      </button>

      {result && (
        <div className="p-4 bg-green-50 border border-green-200 rounded mb-4">
          <h3 className="font-bold text-green-800">Success!</h3>
          <pre className="text-sm mt-2">{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded">
          <h3 className="font-bold text-red-800">Error</h3>
          <pre className="text-sm mt-2">{JSON.stringify(error, null, 2)}</pre>
          <div className="mt-2">
            <p className="font-medium">Error details:</p>
            <p>Message: {error.message}</p>
            <p>Stack: {error.stack}</p>
          </div>
        </div>
      )}
    </div>
  );
}
