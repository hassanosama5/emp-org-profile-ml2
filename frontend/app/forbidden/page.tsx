"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/use-auth";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/shared/ui/Card";
import { Button } from "@/components/shared/ui/Button";

export default function ForbiddenPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch by only rendering user-specific content after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-2xl w-full">
          <CardHeader>
            <div className="text-center mb-4">
              <div className="text-6xl mb-4">🚫</div>
              <CardTitle className="text-3xl text-red-600">Access Forbidden</CardTitle>
              <CardDescription className="text-lg mt-2">
                You don't have permission to access this resource
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800 text-sm">
                  <strong>403 Forbidden Error</strong>
                </p>
                <p className="text-red-700 text-sm mt-2">
                  Your account {mounted && !loading && user ? `(${user.fullName || user.firstName || (user as any)?.email || "User"})` : ""} does not have the required permissions 
                  to access this resource. This could be due to:
                </p>
                <ul className="list-disc list-inside text-red-700 text-sm mt-2 space-y-1">
                  <li>Your role doesn't have access to this feature</li>
                  <li>The resource requires additional permissions</li>
                  <li>The endpoint is restricted to specific user types</li>
                </ul>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-blue-800 text-sm font-semibold mb-2">What you can do:</p>
                <ul className="list-disc list-inside text-blue-700 text-sm space-y-1">
                  <li>Contact your administrator if you believe you should have access</li>
                  <li>Check if you need to request additional permissions</li>
                  <li>Return to the dashboard and use features available to your role</li>
                </ul>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => router.back()}
                >
                  Go Back
                </Button>
                <Button 
                  onClick={() => router.push("/auth/login")}
                >
                  Login
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

