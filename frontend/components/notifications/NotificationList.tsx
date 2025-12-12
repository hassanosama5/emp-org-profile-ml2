'use client';

import { Notification } from '@/types/notifications';
import NotificationItem from './NotificationItem';

interface NotificationListProps {
  notifications: Notification[];
  isLoading: boolean;
  onMarkAsRead: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export default function NotificationList({
  notifications,
  isLoading,
  onMarkAsRead,
  onDelete,
}: NotificationListProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-lg bg-gray-200"
          ></div>
        ))}
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="flex min-h-64 flex-col items-center justify-center rounded-lg bg-gray-50 py-12">
        <p className="text-lg font-medium text-gray-900">No notifications</p>
        <p className="mt-1 text-sm text-gray-600">
          You're all caught up!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {notifications.map((notification) => (
        <NotificationItem
          key={notification._id}
          notification={notification}
          onMarkAsRead={onMarkAsRead}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
