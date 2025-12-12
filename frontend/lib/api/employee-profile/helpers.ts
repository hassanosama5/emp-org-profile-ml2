// lib/api/employee-profile/helpers.ts
export function extractApiData<T>(response: any): T | null {
  // If response is already the data
  if (response && typeof response === "object") {
    // Check for common API response structures
    if ("data" in response) {
      return response.data as T;
    }
    // If it's the data directly
    return response as T;
  }
  return null;
}

export function extractApiArray<T>(response: any): T[] {
  const data = extractApiData<T[]>(response);
  return Array.isArray(data) ? data : [];
}
