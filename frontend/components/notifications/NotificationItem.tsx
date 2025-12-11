'use client';

import { Notification, NotificationType } from '@/types/notifications';

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const notificationTypeConfig: Record<
  string,
  { label: string; bgColor: string; textColor: string; icon: string }
> = {
  [NotificationType.LEAVE_APPROVED]: {
    label: 'Leave Approved',
    bgColor: 'bg-green-100',
    textColor: 'text-green-800',
    icon: '✓',
  },
  [NotificationType.LEAVE_REJECTED]: {
    label: 'Leave Rejected',
    bgColor: 'bg-red-100',
    textColor: 'text-red-800',
    icon: '✕',
  },
  [NotificationType.LEAVE_CREATED]: {
    label: 'New Leave Request',
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-800',
    icon: '📋',
  },
  [NotificationType.LEAVE_MODIFIED]: {
    label: 'Leave Modified',
    bgColor: 'bg-yellow-100',
    textColor: 'text-yellow-800',
    icon: '✎',
  },
  [NotificationType.LEAVE_FINALIZED]: {
    label: 'Leave Finalized',
    bgColor: 'bg-purple-100',
    textColor: 'text-purple-800',
    icon: '✔',
  },
  [NotificationType.LEAVE_RETURNED_FOR_CORRECTION]: {
    label: 'Returned for Correction',
    bgColor: 'bg-orange-100',
    textColor: 'text-orange-800',
    icon: '↩',
  },
  [NotificationType.SHIFT_EXPIRY]: {
    label: 'Shift Expiry Alert',
    bgColor: 'bg-red-100',
    textColor: 'text-red-800',
    icon: '⏰',
  },
  [NotificationType.SHIFT_EXPIRY_ALERT]: {
    label: 'Shift Expiry Alert',
    bgColor: 'bg-red-100',
    textColor: 'text-red-800',
    icon: '⏰',
  },
  [NotificationType.SHIFT_EXPIRY_BULK_ALERT]: {
    label: 'Shift Expiry Alert',
    bgColor: 'bg-red-100',
    textColor: 'text-red-800',
    icon: '⏰',
  },
  [NotificationType.MISSED_PUNCH]: {
    label: 'Missed Punch',
    bgColor: 'bg-red-100',
    textColor: 'text-red-800',
    icon: '⚠',
  },
};

// Helper function to format time
function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - new Date(date).getTime()) / 1000);

  if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  return `${Math.floor(diffInSeconds / 86400)}d ago`;
}

export default function NotificationItem({
  notification,
  onMarkAsRead,
  onDelete,
}: NotificationItemProps) {
  const config = notificationTypeConfig[notification.type];
  const isRead = notification.isRead ?? false;
  const timeAgo = formatTimeAgo(notification.createdAt);

  const handleMarkAsRead = async () => {
    if (!isRead) {
      await onMarkAsRead(notification._id);
    }
  };

  const handleDelete = async () => {
    await onDelete(notification._id);
  };

  return (
    <div
      className={`flex items-start gap-4 rounded-lg border-l-4 border-l-transparent p-4 transition-all ${
        isRead
          ? 'border-l-gray-300 bg-gray-50'
          : 'border-l-blue-500 bg-blue-50'
      } hover:shadow-md`}
    >
      {/* Icon */}
      <div className={`flex-shrink-0 ${config.bgColor} rounded-full p-2 text-sm`}>
        {config.icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className={`text-sm font-semibold ${config.textColor}`}>
              {config.label}
            </p>
            <p className="mt-1 text-sm text-gray-700">{notification.message}</p>
            <p className="mt-2 text-xs text-gray-500">{timeAgo}</p>
          </div>

          {/* Status Indicator */}
          <div className="flex-shrink-0">
            {isRead ? (
              <span className="text-gray-400">✓</span>
            ) : (
              <span className="h-2 w-2 rounded-full bg-blue-500 mt-1 inline-block"></span>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-shrink-0 gap-2">
        {!isRead && (
          <button
            onClick={handleMarkAsRead}
            className="inline-flex items-center gap-1 rounded-md bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-200 transition-colors"
            title="Mark as read"
          >
            Mark Read
          </button>
        )}
        <button
          onClick={handleDelete}
          className="inline-flex items-center justify-center rounded-md p-1 text-gray-500 hover:bg-gray-200 hover:text-red-600 transition-colors"
          title="Delete notification"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
