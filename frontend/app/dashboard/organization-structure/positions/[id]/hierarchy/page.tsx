"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { SystemRole } from "@/types";
import { Button } from "@/components/shared/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/shared/ui/Card";
import { useOrganizationStructure } from "@/lib/hooks/use-organization-structure";

type Node = {
  position?: any;
  subordinates?: Node[];
};

const label = (p: any) => {
  if (!p) return "—";
  const title = p.title || p.name || "Position";
  const code = p.code ? ` (${p.code})` : "";
  return `${title}${code}`;
};

const HierNode = ({
  node,
  depth = 0,
  onOpenPosition,
}: {
  node: Node;
  depth?: number;
  onOpenPosition: (id: string) => void;
}) => {
  const p: any = node.position;
  const id = p?._id || p?.id || (p?.toString ? p.toString() : "");
  return (
    <div className="space-y-2">
      <div
        className="flex items-center justify-between gap-3 p-3 border border-gray-200 rounded-md"
        style={{ marginLeft: depth * 16 }}
      >
        <div className="min-w-0">
          <div className="font-medium text-gray-900 truncate">{label(p)}</div>
          {id && (
            <div className="text-xs text-gray-500 font-mono truncate">{id}</div>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => id && onOpenPosition(String(id))}
          disabled={!id}
        >
          Open
        </Button>
      </div>

      {(node.subordinates || []).map((child, idx) => (
        <HierNode
          key={`${depth}-${idx}`}
          node={child}
          depth={depth + 1}
          onOpenPosition={onOpenPosition}
        />
      ))}
    </div>
  );
};

export default function PositionHierarchyPage() {
  const params = useParams();
  const router = useRouter();
  const { getPositionHierarchy, loading, error, clearError } =
    useOrganizationStructure();
  const [tree, setTree] = useState<Node | null>(null);
  const id = params.id as string;

  const fetchTree = async () => {
    try {
      const data = await getPositionHierarchy(id);
      setTree(data as any);
    } catch (e) {
      console.error("Failed to fetch position hierarchy:", e);
    }
  };

  useEffect(() => {
    fetchTree();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return (
    <ProtectedRoute
      allowedRoles={[SystemRole.SYSTEM_ADMIN, SystemRole.HR_ADMIN, SystemRole.HR_MANAGER]}
    >
      <div className="container mx-auto px-6 py-8">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Reporting Hierarchy</h1>
            <p className="text-gray-600 mt-1">
              Root position ID: <span className="font-mono">{params.id}</span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={fetchTree} disabled={loading}>
              Refresh
            </Button>
            <Link
              href={`/dashboard/organization-structure/positions/${params.id}`}
              className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
            >
              ← Back to Position
            </Link>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-start justify-between gap-4">
              <p className="text-red-700">{error}</p>
              <Button variant="ghost" onClick={clearError}>
                Clear
              </Button>
            </div>
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Hierarchy</CardTitle>
            <CardDescription>
              Click “Open” to navigate to a position detail page.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading && !tree ? (
              <div className="flex justify-center py-10">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
              </div>
            ) : !tree ? (
              <div className="py-10 text-center text-gray-600">
                No hierarchy data available.
              </div>
            ) : (
              <HierNode
                node={tree}
                onOpenPosition={(id) =>
                  router.push(`/dashboard/organization-structure/positions/${id}`)
                }
              />
            )}
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  );
}


