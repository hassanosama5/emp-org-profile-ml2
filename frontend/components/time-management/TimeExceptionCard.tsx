"use client";

import { TimeException, TimeExceptionType, TimeExceptionStatus } from "@/types/time-management";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/shared/ui/Card";
import { Button } from "@/components/shared/ui/Button";

interface TimeExceptionCardProps {
  exception: TimeException;
  onApprove?: (id: string, notes?: string) => void;
  onReject?: (id: string, reason: string) => void;
  onViewDetails?: (id: string) => void;
  showActions?: boolean;
}

export function TimeExceptionCard({
  exception,
  onApprove,
  onReject,
  onViewDetails,
  showActions = true,
}: TimeExceptionCardProps) {
  const exceptionId = exception._id || exception.id || "";
  
  const getTypeLabel = (type: TimeExceptionType) => {
    switch (type) {
      case TimeExceptionType.MISSED_PUNCH:
        return "Missed Punch";
      case TimeExceptionType.LATE:
        return "Late Arrival";
      case TimeExceptionType.EARLY_LEAVE:
        return "Early Leave";
      case TimeExceptionType.SHORT_TIME:
        return "Short Time";
      case TimeExceptionType.OVERTIME_REQUEST:
        return "Overtime Request";
      case TimeExceptionType.MANUAL_ADJUSTMENT:
        return "Manual Adjustment";
      default:
        return type;
    }
  };

  const getStatusColor = (status: TimeExceptionStatus) => {
    switch (status) {
      case TimeExceptionStatus.APPROVED:
        return "bg-green-100 text-green-800 border-green-200";
      case TimeExceptionStatus.REJECTED:
        return "bg-red-100 text-red-800 border-red-200";
      case TimeExceptionStatus.PENDING:
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case TimeExceptionStatus.ESCALATED:
        return "bg-orange-100 text-orange-800 border-orange-200";
      case TimeExceptionStatus.OPEN:
        return "bg-blue-100 text-blue-800 border-blue-200";
      case TimeExceptionStatus.RESOLVED:
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getEmployeeName = (employeeId: any): string => {
    if (typeof employeeId === "string") return employeeId;
    if (employeeId && typeof employeeId === "object") {
      if (employeeId.firstName && employeeId.lastName) {
        return `${employeeId.firstName} ${employeeId.lastName}`;
      }
      if (employeeId.employeeNumber) {
        return employeeId.employeeNumber;
      }
    }
    return "Unknown Employee";
  };

  const canApproveOrReject =
    showActions &&
    (exception.status === TimeExceptionStatus.OPEN ||
      exception.status === TimeExceptionStatus.PENDING);

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">{getTypeLabel(exception.type)}</CardTitle>
            <p className="text-sm text-gray-600 mt-1">
              Employee: {getEmployeeName(exception.employeeId)}
            </p>
          </div>
          <span
            className={`px-2 py-1 rounded text-xs font-medium border ${getStatusColor(
              exception.status
            )}`}
          >
            {exception.status}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        {exception.reason && (
          <div className="mb-4">
            <p className="text-sm font-medium text-gray-700 mb-1">Reason:</p>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">{exception.reason}</p>
          </div>
        )}

        {exception.createdAt && (
          <div className="mb-4">
            <p className="text-xs text-gray-500">
              Created: {new Date(exception.createdAt).toLocaleString()}
            </p>
          </div>
        )}

        <div className="flex gap-2 mt-4">
          {onViewDetails && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onViewDetails(exceptionId)}
            >
              View Details
            </Button>
          )}
          {canApproveOrReject && (
            <>
              {onApprove && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    const notes = prompt("Approval notes (optional):");
                    if (notes !== null) {
                      onApprove(exceptionId, notes || undefined);
                    }
                  }}
                >
                  Approve
                </Button>
              )}
              {onReject && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    const reason = prompt("Rejection reason (optional):");
                    if (reason !== null) {
                      onReject(exceptionId, reason?.trim() || "");
                    }
                  }}
                >
                  Reject
                </Button>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

