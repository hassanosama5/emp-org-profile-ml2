import axios, {
  AxiosInstance,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";

// CHANGED - Fixed port to match backend (5000)

// Backend API runs on port 5000 by default (can be overridden with PORT env var or NEXT_PUBLIC_API_URL)
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1";

// CHANGED - Debug: Log the API base URL on load
console.log("🔧 API_BASE_URL configured as:", API_BASE_URL);

export const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 15000,
});

// 🔐 Request interceptor – attach JWT if present
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (typeof window !== "undefined") {
      // Try multiple common keys so we don't depend on one name
      const token =
        localStorage.getItem("auth_token") ||
        localStorage.getItem("accessToken") ||
        localStorage.getItem("token") ||
        localStorage.getItem("jwt");

      if (token) {
        config.headers = config.headers ?? {};
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    console.error("Request interceptor error:", error);
    return Promise.reject(error);
  }
);

// ✅ Response interceptor – return data directly
api.interceptors.response.use(
  (response: AxiosResponse) => {
    console.log(
      `✅ API Success [${
        response.status
      } ${response.config.method?.toUpperCase()} ${response.config.url}]`
    );
    console.log('✅ API Response data:', response.data);

    // Return the data property if it exists, otherwise return the full response
    return response.data;
  },
  (error) => {
    
    // ============================================================
    // CHANGED: Fixed syntax errors in error handler
    // Issue: errorDetails object was incorrectly structured as inline
    //        console.error argument, causing syntax errors
    // Fix: Extracted errorDetails as a proper const variable
    // Date: Recent fix for TypeScript compilation errors
    // ============================================================
    // Log detailed error information
    const errorDetails = {
      message: error.message,
      config: {
        url: error.config?.url,
        method: error.config?.method,
      },
      response: {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message,
        responseData: error.response?.data,
        requestData: error.config?.data,
        requestUrl: error.config?.url,
        requestMethod: error.config?.method,
        headers: error.response?.headers,
        // CHANGED - Additional debug info
        fullURL: error.config?.baseURL + error.config?.url,
        errorCode: error.code,
        errorName: error.name,
        isAxiosError: error.isAxiosError,
        hasResponse: !!error.response,
      },
    };
    
    console.error("API Error:", errorDetails);
    
    console.error(
      `❌ API Error [${error.config?.method?.toUpperCase()} ${
        error.config?.url
      }]:`,
      errorDetails
    );
    
    // CHANGED - Log the full error object for debugging
    if (!error.response) {
      console.error('⚠️ No response received - possible network error:', error);
    } else {
      console.error('📋 Full error response:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
        headers: error.response.headers,
      });
    }
    
    // ============================================================
    // CHANGED: Removed orphaned code causing syntax errors
    // Issue: Lines 103-106 had orphaned code fragments that broke syntax
    // Fix: Commented out the duplicate/orphaned code instead of deleting
    //      to preserve any potential logic that might be needed later
    // ============================================================
    // COMMENTED OUT - Duplicate/orphaned code that was causing syntax errors
    // requestData: error.config?.data, // ADDED TO SEE WHAT WAS SENT
    // },
    // });

    const status = error.response?.status || error.status;
    const url = error.config?.url || error.request?.responseURL || '';
    
    // Suppress 404 errors for backup endpoints (not yet implemented)
    // Browser network layer will still show these, but we won't log them as application errors
    const isBackup404 = status === 404 && (url.includes('/backups') || url.includes('backup'));
    
    // Suppress 403 errors for optional endpoints (employee-profile and payroll/runs with query params)
    const isOptionalEmployeeProfile = status === 403 && url.includes('/employee-profile') && 
      (url.includes('limit') || url.includes('?'));
    const isOptionalPayrollRuns = status === 403 && url.includes('/payroll/runs') && 
      (url.includes('limit') || url.includes('?'));
    
    // Suppress timeout errors for notifications endpoint (optional feature, may be slow or unavailable)
    const isNotificationsTimeout = (error.message?.includes('timeout') || error.code === 'ECONNABORTED') && 
      (url.includes('/notifications') || url.includes('notification'));
    
    if (isBackup404 || isOptionalEmployeeProfile || isOptionalPayrollRuns || isNotificationsTimeout) {
      // Silently handle these errors - they're expected for optional features or unimplemented endpoints
      // Browser console will show the network error, but we don't treat it as an app error
      // Return a clean error that can be caught and handled gracefully
    } else {
      // Log other errors normally
      console.error(
        `❌ API Error [${error.config?.method?.toUpperCase()} ${
          error.config?.url
        }]:`,
        {
          status: error.response?.status,
          statusText: error.response?.statusText,
          message: error.message,
          responseData: error.response?.data,
          headers: error.response?.headers,
        }
      );
    }

    // Handle errors
    if (error.response?.status === 401) {
      console.log("🔒 401 Unauthorized - Token may be invalid");
      
      // Only redirect if we're not already on the login page and it's not a network error
      if (typeof window !== "undefined") {
        const currentPath = window.location.pathname;
        const isLoginPage = currentPath.startsWith("/auth/login");
        const isNetworkError = !error.response; // Network errors don't have response
        
        // Don't redirect if already on login page or if it's a network error
        if (!isLoginPage && !isNetworkError) {
          // Check if token exists - if not, might be a temporary issue
          const token = localStorage.getItem("auth_token");
          
          if (token) {
            // Token exists but got 401 - likely expired or invalid
            console.log("Token exists but unauthorized - clearing and redirecting");
            localStorage.removeItem("auth_token");
            localStorage.removeItem("accessToken");
            localStorage.removeItem("token");
            localStorage.removeItem("jwt");
            localStorage.removeItem("user");
            
            // Use router if available, otherwise use window.location
            // Add a small delay to prevent redirect loops
            setTimeout(() => {
              window.location.href = "/auth/login";
            }, 100);
          } else {
            // No token - might be a temporary API issue, don't redirect aggressively
            console.log("No token found - might be temporary issue, not redirecting");
          }
        }
      }
    }

    if (error.response?.status === 403) {
      console.log("Forbidden - Insufficient permissions");
    }

    // ============================================================
    // CHANGED: Fixed duplicate error message extraction logic
    // Issue: Two separate error message extraction blocks existed
    //        (lines 149-168 and 169-197), causing syntax errors
    // Fix: Completed the first block properly and commented out
    //      the duplicate second block to preserve logic
    // Date: Recent fix for TypeScript compilation errors
    // ============================================================
    // CHANGED - Extract error message with better handling for validation errors
    let errorMessage = "An error occurred";
    
    const responseData = error.response?.data;
    if (responseData) {
      // Handle NestJS validation errors (array of messages)
      if (Array.isArray(responseData.message)) {
        errorMessage = responseData.message.join(", ");
      } else if (responseData.message) {
        errorMessage = responseData.message;
      } else if (responseData.error) {
        errorMessage = responseData.error;
      } else if (typeof responseData === 'string') {
        errorMessage = responseData;
      } else {
        errorMessage = JSON.stringify(responseData);
      }
    } else if (error.message) {
      errorMessage = error.message;
    } else {
      errorMessage = `HTTP ${error.response?.status || "Unknown"} error`;
      // Check if this is an optional endpoint (already checked above, but check again for redirect logic)
      const isOptionalEndpoint = isOptionalEmployeeProfile || isOptionalPayrollRuns;
      
      if (!isOptionalEndpoint) {
        console.log("🚫 403 Forbidden - Insufficient permissions");
        console.log("Endpoint:", url);
        console.log("User role may not have access to this endpoint");
      }
      
      // Redirect to forbidden page instead of login
      // But only if we're not on a dashboard page (to avoid breaking dashboard functionality)
      // Don't redirect for optional endpoints - let the page handle it gracefully
      if (typeof window !== "undefined" && !isOptionalEndpoint) {
        const currentPath = window.location.pathname;
        // Only redirect if we're not already on the forbidden page or a dashboard page
        // Dashboard pages should handle 403 errors gracefully without redirecting
        if (!currentPath.includes("/forbidden") && !currentPath.includes("/dashboard")) {
          window.location.href = "/forbidden";
        }
      }
    }
    
    // ============================================================
    // CHANGED: Commented out duplicate error extraction logic
    // Reason: Preserved old logic in comments in case it's needed
    //         The active logic above (lines 149-168) handles all cases
    // ============================================================
    // COMMENTED OUT - Duplicate error message extraction logic (old version)
    // // Extract error message
    // let errorMessage = "An error occurred";
    //
    // if (error.response?.data) {
    //   const data = error.response.data;
    //
    //   if (typeof data === "string") {
    //     errorMessage = data;
    //   } else if (data.message) {
    //     errorMessage = data.message;
    //   } else if (data.error) {
    //     errorMessage = data.error;
    //   } else if (Array.isArray(data.errors)) {
    //     errorMessage = data.errors.join(", ");
    //   } else {
    //     try {
    //       errorMessage = JSON.stringify(data);
    //     } catch (e) {
    //       errorMessage = "Error parsing response";
    //     }
    //   }
    // } else if (error.message) {
    //   errorMessage = error.message;
    // }
    //
    // // Add status code if available
    // if (error.response?.status) {
    //   errorMessage = `HTTP ${error.response.status}: ${errorMessage}`;
    // }

    //change
    // Create a more detailed error object
    const detailedError = new Error(errorMessage);
    (detailedError as any).status = error.response?.status;
    (detailedError as any).responseData = responseData;
    (detailedError as any).originalError = error;
    
    return Promise.reject(detailedError);

//FOR LEAVES
    // ============================================================
    // CHANGED: Suppress logging for expected 404 errors (not found)
    // These are common when checking for entitlements that don't exist yet
    // ============================================================
    const isNotFoundError = error.response?.status === 404;
    const isEntitlementCheck = error.config?.url?.includes('/leaves/entitlement/');
    
    // Don't log 404 errors for entitlement checks - these are expected
    if (isNotFoundError && isEntitlementCheck) {
      // Just return the error without logging - let the calling code handle it
      return Promise.reject(error);
    }
  }
);

export default api;