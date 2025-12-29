'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/hooks/use-auth';
import { useNotifications } from '@/lib/hooks/useNotifications';
import { NotificationType, Notification } from '@/types/notifications';
import { SystemRole } from '@/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/shared/ui/Card';
import { Button } from '@/components/shared/ui/Button';
import { Input } from '@/components/shared/ui/Input';
import { Toast, useToast } from '@/components/leaves/Toast';
import { checkExpiringShifts } from '@/lib/api/notifications';
import { ExpiringShiftAssignment, CheckExpiringShiftsResponse } from '@/types/time-management';
import ShiftManagementDialog from './ShiftManagementDialog';

export default function NotificationCenter() {
  const { user } = useAuth();
  const { notifications, unreadCount, isLoading, error, refetch, markAsRead, deleteNotif } = useNotifications();
  const { toast, showToast, hideToast } = useToast();
  const [selectedType, setSelectedType] = useState<NotificationType | 'ALL'>('ALL');
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  
  // Shift expiry state (for HR Admin)
  const isHRAdmin = user?.roles?.includes(SystemRole.HR_ADMIN);
  const [expiringAssignments, setExpiringAssignments] = useState<ExpiringShiftAssignment[]>([]);
  const [checkResult, setCheckResult] = useState<CheckExpiringShiftsResponse | null>(null);
  const [checking, setChecking] = useState(false);
  const [daysBeforeExpiry, setDaysBeforeExpiry] = useState<number>(7);
  
  // Shift management dialog state
  const [selectedShiftAssignment, setSelectedShiftAssignment] = useState<{
    assignmentId: string;
    employeeId: string;
    employeeName: string;
    endDate: Date;
    notificationId?: string; // To delete notification after managing
  } | null>(null);

  useEffect(() => {
    if (error) {
      showToast(error.message || 'Failed to load notifications', 'error');
    }
  }, [error, showToast]);

  // Get shift expiry notifications from the unified notifications list
  const shiftExpiryNotifications = notifications.filter((notif) => 
    notif.type === 'SHIFT_EXPIRY_ALERT' || notif.type === 'SHIFT_EXPIRY_BULK_ALERT'
  );

  // Filter notifications
  const filteredNotifications = notifications.filter((notif) => {
    if (selectedType !== 'ALL' && notif.type !== selectedType) return false;
    if (showUnreadOnly && notif.isRead) return false;
    return true;
  });

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await markAsRead(notificationId);
      showToast('Marked as read', 'success');
    } catch (error: any) {
      showToast(error.message || 'Failed to mark as read', 'error');
    }
  };

  const handleDelete = async (notificationId: string) => {
    try {
      await deleteNotif(notificationId);
      showToast('Notification deleted', 'success');
    } catch (error: any) {
      showToast(error.message || 'Failed to delete notification', 'error');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      for (const notif of filteredNotifications) {
        if (!notif.isRead) {
          await markAsRead(notif._id);
        }
      }
      showToast('All marked as read', 'success');
    } catch (error: any) {
      showToast(error.message || 'Failed to mark all as read', 'error');
    }
  };

  const handleDeleteAll = async () => {
    if (confirm('Are you sure you want to delete all notifications?')) {
      try {
        for (const notif of filteredNotifications) {
          await deleteNotif(notif._id);
        }
        showToast('All notifications deleted', 'success');
      } catch (error: any) {
        showToast(error.message || 'Failed to delete notifications', 'error');
      }
    }
  };

  const getTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      [NotificationType.LEAVE_APPROVED]: 'Leave Approved',
      [NotificationType.LEAVE_REJECTED]: 'Leave Rejected',
      [NotificationType.LEAVE_CREATED]: 'New Leave Request',
      [NotificationType.LEAVE_MODIFIED]: 'Leave Modified',
      [NotificationType.LEAVE_FINALIZED]: 'Leave Finalized',
      [NotificationType.LEAVE_RETURNED_FOR_CORRECTION]: 'Returned for Correction',
      [NotificationType.SHIFT_EXPIRY]: 'Shift Expiry',
      [NotificationType.MISSED_PUNCH]: 'Missed Punch',
      // Time management raw types
      'SHIFT_EXPIRY_ALERT': 'Shift Expiry Alert',
      'SHIFT_EXPIRY_BULK_ALERT': 'Shift Expiry Alert',
    };
    return labels[type] || type;
  };

  const getTypeColor = (type: string): string => {
    const colors: Record<string, string> = {
      [NotificationType.LEAVE_APPROVED]: 'bg-green-50 border-green-200 text-green-700',
      [NotificationType.LEAVE_REJECTED]: 'bg-red-50 border-red-200 text-red-700',
      [NotificationType.LEAVE_CREATED]: 'bg-blue-50 border-blue-200 text-blue-700',
      [NotificationType.LEAVE_MODIFIED]: 'bg-yellow-50 border-yellow-200 text-yellow-700',
      [NotificationType.LEAVE_FINALIZED]: 'bg-purple-50 border-purple-200 text-purple-700',
      [NotificationType.LEAVE_RETURNED_FOR_CORRECTION]: 'bg-orange-50 border-orange-200 text-orange-700',
      [NotificationType.SHIFT_EXPIRY]: 'bg-red-50 border-red-200 text-red-700',
      [NotificationType.MISSED_PUNCH]: 'bg-red-50 border-red-200 text-red-700',
      // Time management raw types
      'SHIFT_EXPIRY_ALERT': 'bg-red-50 border-red-200 text-red-700',
      'SHIFT_EXPIRY_BULK_ALERT': 'bg-red-50 border-red-200 text-red-700',
    };
    return colors[type] || 'bg-gray-50 border-gray-200 text-gray-700';
  };

  const handleCheckExpiringShifts = async () => {
    try {
      setChecking(true);
      console.log('[SHIFT EXPIRY CHECK] Starting check for shifts expiring within', daysBeforeExpiry, 'days');
      
      const result = await checkExpiringShifts(daysBeforeExpiry);
      console.log('[SHIFT EXPIRY CHECK] Result:', result);
      
      setCheckResult(result);
      setExpiringAssignments(result.assignments || []);
      
      // Create notifications for ALL HR Admins and System Admins
      if (result.count > 0 && result.assignments && result.assignments.length > 0) {
        try {
          console.log('[SHIFT EXPIRY CHECK] Creating notifications for', result.count, 'expiring assignments');
          
          // The backend endpoint will automatically notify all HR Admins and System Admins
          const { createShiftExpiryNotifications } = await import('@/lib/api/notifications');
          
          // Pass empty array - backend will automatically fetch all HR Admins and System Admins
          const notifResult = await createShiftExpiryNotifications([], result.assignments);
          console.log('[SHIFT EXPIRY CHECK] Notifications created:', notifResult);
          
          showToast(
            `Found ${result.count} expiring shift assignment(s). Notifications sent to all HR Admins and System Admins!`,
            'success'
          );
          
          // Refresh notifications to show the new ones
          console.log('[SHIFT EXPIRY CHECK] Refreshing notifications...');
          await refetch();
          console.log('[SHIFT EXPIRY CHECK] Notifications refreshed');
        } catch (notifError: any) {
          console.error('[SHIFT EXPIRY CHECK] Failed to create notifications:', notifError);
          console.error('[SHIFT EXPIRY CHECK] Error details:', {
            message: notifError.message,
            response: notifError.response,
            data: notifError.response?.data,
          });
          showToast(
            `Found ${result.count} expiring shift assignment(s), but failed to send notifications: ${notifError.message}`,
            'error'
          );
        }
      } else {
        console.log('[SHIFT EXPIRY CHECK] No expiring assignments found');
        showToast(
          `Found ${result.count} expiring shift assignment(s) within ${daysBeforeExpiry} days.`,
          result.count > 0 ? 'warning' : 'success'
        );
      }
    } catch (error: any) {
      console.error('[SHIFT EXPIRY CHECK] Failed:', error);
      showToast(error.message || 'Failed to check expiring shifts', 'error');
    } finally {
      setChecking(false);
    }
  };

  const formatDate = (date: Date | string | undefined) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString();
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'HIGH':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'MEDIUM':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'LOW':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="container mx-auto px-6 py-8">
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
      />

      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {isHRAdmin ? 'Shift Expiry Notifications' : 'Notifications'}
          </h1>
          <p className="mt-1 text-gray-600">
            {isHRAdmin 
              ? 'View notifications and check for shift assignments nearing expiry'
              : 'View and manage all your notifications'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={async () => {
              await refetch();
              showToast('Notifications refreshed', 'success');
            }}
            disabled={isLoading}
            variant="outline"
            size="sm"
          >
            {isLoading ? 'Loading...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Shift Expiry Section for HR Admin */}
      {isHRAdmin && (
        <>
          {/* Check Expiring Shifts Section */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Check Expiring Shifts</CardTitle>
              <CardDescription>
                Manually trigger a check for shift assignments that are expiring soon
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-4">
                <div className="flex-1">
                  <Input
                    type="number"
                    label="Days Before Expiry"
                    value={daysBeforeExpiry}
                    onChange={(e) => setDaysBeforeExpiry(parseInt(e.target.value) || 7)}
                    placeholder="7"
                    min={1}
                    max={30}
                  />
                </div>
                <Button onClick={handleCheckExpiringShifts} disabled={checking}>
                  {checking ? 'Checking...' : 'Check Expiring Shifts'}
                </Button>
              </div>

              {checkResult && (
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-2">Check Results</h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Total Found</p>
                      <p className="text-2xl font-bold text-gray-900">{checkResult.count}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">High Urgency</p>
                      <p className="text-2xl font-bold text-red-600">{checkResult.summary.highUrgency}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Medium Urgency</p>
                      <p className="text-2xl font-bold text-yellow-600">{checkResult.summary.mediumUrgency}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Low Urgency</p>
                      <p className="text-2xl font-bold text-blue-600">{checkResult.summary.lowUrgency}</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Expiring Assignments Table */}
          {expiringAssignments.length > 0 && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Expiring Shift Assignments</CardTitle>
                <CardDescription>
                  Shift assignments that will expire within the next {daysBeforeExpiry} days
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Employee</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Shift</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Department</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">End Date</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Days Remaining</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Urgency</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expiringAssignments.map((assignment) => (
                        <tr key={assignment.assignmentId} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-4">
                            <div>
                              <p className="font-medium">{assignment.employeeName}</p>
                              {assignment.employeeNumber && (
                                <p className="text-sm text-gray-500">{assignment.employeeNumber}</p>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div>
                              <p className="font-medium">{assignment.shiftName}</p>
                              {assignment.shiftTimes && (
                                <p className="text-sm text-gray-500">{assignment.shiftTimes}</p>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4">{assignment.departmentName || 'N/A'}</td>
                          <td className="py-3 px-4">{formatDate(assignment.endDate)}</td>
                          <td className="py-3 px-4">
                            <span className="font-semibold">{assignment.daysRemaining}</span> days
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-1 rounded text-xs font-medium border ${getUrgencyColor(
                                assignment.urgency
                              )}`}
                            >
                              {assignment.urgency}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <Button
                              onClick={() => setSelectedShiftAssignment({
                                assignmentId: assignment.assignmentId,
                                employeeId: assignment.employeeId || '',
                                employeeName: assignment.employeeName,
                                endDate: new Date(assignment.endDate),
                              })}
                              size="sm"
                              className="bg-blue-600 hover:bg-blue-700 text-white"
                            >
                              Manage
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Shift Expiry Notifications List */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Shift Expiry Notifications</CardTitle>
              <CardDescription>
                Recent notifications about shift assignments nearing expiry
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-12">
                  <p className="text-gray-500">Loading notifications...</p>
                </div>
              ) : shiftExpiryNotifications.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500 mb-4">No shift expiry notifications found.</p>
                  <p className="text-sm text-gray-400">
                    Click "Check Expiring Shifts" above to find assignments that need attention.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {shiftExpiryNotifications.map((notification) => {
                    // Log notification data to debug
                    console.log('[Shift Expiry Notification]', notification._id, {
                      type: notification.type,
                      hasData: !!notification.data,
                      data: notification.data,
                    });
                    
                    const hasAssignmentData = notification.data?.assignmentId && notification.data?.endDate;
                    
                    return (
                      <div
                        key={notification._id}
                        className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                                {notification.type === 'SHIFT_EXPIRY_ALERT'
                                  ? 'Alert'
                                  : 'Bulk Alert'}
                              </span>
                              <span className="text-sm text-gray-500">
                                {formatDate(notification.createdAt)}
                              </span>
                              {!hasAssignmentData && (
                                <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-600">
                                  Legacy
                                </span>
                              )}
                            </div>
                            <p className="text-gray-900">{notification.message}</p>
                          </div>
                          {/* Manage button - uses assignmentId and endDate from notification data */}
                          <Button
                            onClick={() => {
                              if (notification.data?.assignmentId && notification.data?.endDate) {
                                setSelectedShiftAssignment({
                                  assignmentId: notification.data.assignmentId,
                                  employeeId: notification.data.employeeId || '',
                                  employeeName: notification.data.employeeName || 'Unknown Employee',
                                  endDate: new Date(notification.data.endDate),
                                  notificationId: notification._id, // For deletion after managing
                                });
                              } else {
                                showToast('This is an older notification without assignment details. Please delete it and use "Check Expiring Shifts" to create a new notification with full details.', 'warning');
                              }
                            }}
                            size="sm"
                            className={hasAssignmentData 
                              ? "bg-blue-600 hover:bg-blue-700 text-white ml-4"
                              : "bg-gray-400 hover:bg-gray-500 text-white ml-4"
                            }
                          >
                            Manage
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Notifications List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Notifications</CardTitle>
              <CardDescription>
                {unreadCount > 0
                  ? `You have ${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}`
                  : 'No unread notifications'}
              </CardDescription>
            </div>
            {filteredNotifications.length > 0 && (
              <div className="flex gap-2">
                {unreadCount > 0 && (
                  <Button
                    onClick={handleMarkAllAsRead}
                    variant="outline"
                    size="sm"
                  >
                    Mark All as Read
                  </Button>
                )}
                <Button
                  onClick={handleDeleteAll}
                  variant="secondary"
                  size="sm"
                >
                  Delete All
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="h-20 animate-pulse rounded-lg bg-gray-200"
                ></div>
              ))}
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center text-center">
              <p className="text-lg font-medium text-gray-900">No notifications</p>
              <p className="mt-1 text-sm text-gray-600">You're all caught up!</p>
              {isHRAdmin && (
                <p className="mt-2 text-xs text-gray-500">
                  Use "Check Expiring Shifts" above to find shift assignments that need attention.
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredNotifications.map((notif: Notification) => {
                const isShiftExpiry = notif.type === 'SHIFT_EXPIRY_ALERT' || notif.type === 'SHIFT_EXPIRY_BULK_ALERT';
                const hasAssignmentData = isShiftExpiry && notif.data?.assignmentId && notif.data?.endDate;
                
                return (
                  <div
                    key={notif._id}
                    className={`border-l-4 border-l-transparent rounded-lg p-4 ${getTypeColor(notif.type)} flex items-start justify-between gap-4`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">
                          {getTypeLabel(notif.type)}
                        </h3>
                        {!notif.isRead && (
                          <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                            New
                          </span>
                        )}
                        {isShiftExpiry && !hasAssignmentData && (
                          <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                            Legacy
                          </span>
                        )}
                      </div>
                      <p className="mt-2 text-sm">{notif.message}</p>
                      <p className="mt-1 text-xs font-medium opacity-75">
                        {new Date(notif.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex flex-shrink-0 gap-2">
                      {/* Manage button for shift expiry notifications - uses data from notification */}
                      {isShiftExpiry && (
                        <Button
                          onClick={() => {
                            if (notif.data?.assignmentId && notif.data?.endDate) {
                              setSelectedShiftAssignment({
                                assignmentId: notif.data.assignmentId,
                                employeeId: notif.data.employeeId || '',
                                employeeName: notif.data.employeeName || 'Unknown Employee',
                                endDate: new Date(notif.data.endDate),
                                notificationId: notif._id, // For deletion after managing
                              });
                            } else {
                              showToast('This is an older notification without assignment details. Please delete it and use "Check Expiring Shifts" to create a new notification.', 'warning');
                            }
                          }}
                          size="sm"
                          className={hasAssignmentData 
                            ? "bg-blue-600 hover:bg-blue-700 text-white"
                            : "bg-gray-400 hover:bg-gray-500 text-white"
                          }
                        >
                          Manage
                        </Button>
                      )}
                      {!notif.isRead && (
                        <Button
                          onClick={() => handleMarkAsRead(notif._id)}
                          size="sm"
                          variant="outline"
                        >
                          Mark Read
                        </Button>
                      )}
                      <Button
                        onClick={() => handleDelete(notif._id)}
                        size="sm"
                        variant="secondary"
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Shift Management Dialog */}
      {selectedShiftAssignment && (
        <ShiftManagementDialog
          assignmentId={selectedShiftAssignment.assignmentId}
          employeeId={selectedShiftAssignment.employeeId}
          employeeName={selectedShiftAssignment.employeeName}
          endDate={selectedShiftAssignment.endDate}
          notificationId={selectedShiftAssignment.notificationId}
          onClose={() => setSelectedShiftAssignment(null)}
          onSuccess={() => {
            showToast('Shift assignment updated successfully', 'success');
            refetch();
          }}
        />
      )}
    </div>
  );
}
