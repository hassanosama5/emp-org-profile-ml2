"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { SystemRole } from "@/types";
import { Button } from "@/components/shared/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/shared/ui/Card";
import { Input } from "@/components/shared/ui/Input";

export default function PositionHierarchyIndexPage() {
  const router = useRouter();
  const [positionId, setPositionId] = useState("");

  return (
    <ProtectedRoute
      allowedRoles={[SystemRole.SYSTEM_ADMIN, SystemRole.HR_ADMIN, SystemRole.HR_MANAGER]}
    >
      <div className="container mx-auto px-6 py-8 max-w-3xl">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Position Hierarchy</h1>
            <p className="text-gray-600 mt-1">
              View reporting lines for a specific position.
            </p>
          </div>
          <Link
            href="/dashboard/organization-structure/positions"
            className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
          >
            ← Back to Positions
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Open a hierarchy</CardTitle>
            <CardDescription>Enter a Position ID (MongoDB ObjectId).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="Position ID"
              placeholder="e.g. 64f1c2... (ObjectId)"
              value={positionId}
              onChange={(e) => setPositionId(e.target.value)}
            />
            <div className="flex gap-3">
              <Button
                variant="primary"
                disabled={!positionId.trim()}
                onClick={() =>
                  router.push(
                    `/dashboard/organization-structure/positions/${positionId.trim()}/hierarchy`
                  )
                }
              >
                View Hierarchy
              </Button>
              <Button variant="outline" onClick={() => setPositionId("")} disabled={!positionId}>
                Clear
              </Button>
            </div>

            <div className="pt-4 border-t border-gray-200">
              <Link
                href="/dashboard/organization-structure/hierarchy"
                className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
              >
                Or view the full organization chart →
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  );
}


