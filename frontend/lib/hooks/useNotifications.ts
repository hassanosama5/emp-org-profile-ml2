'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  getNotifications,
  markNotificationAsRead,
  deleteNotification,
} from '@/lib/api/notifications';
import { Notification, NotificationType } from '@/types/notifications';

interface UseNotificationsReturn {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  deleteNotif: (notificationId: string) => Promise<void>;
  filterByType: (type: NotificationType) => Notification[];
  filterUnread: () => Notification[];
}

/**
 * Custom hook to manage notifications
 */
export function useNotifications(): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const refetch = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getNotifications();
      // Handle null/undefined
      setNotifications(Array.isArray(data) ? data : []);
    } catch (err: any) {
      // Don't log timeout errors - notifications are optional and timeouts are expected if backend is slow
      if (!err.message?.includes('timeout') && err.code !== 'ECONNABORTED') {
        console.error('Error fetching notifications:', err);
      }
      // Don't set error for empty results, just use empty array
      setNotifications([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const markAsRead = useCallback(
    async (notificationId: string) => {
      try {
        await markNotificationAsRead(notificationId);
        // Update local state
        setNotifications((prev) =>
          prev.map((notif) =>
            notif._id === notificationId ? { ...notif, isRead: true } : notif
          )
        );
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to mark as read'));
      }
    },
    []
  );

  const deleteNotif = useCallback(async (notificationId: string) => {
    try {
      await deleteNotification(notificationId);
      // Update local state
      setNotifications((prev) =>
        prev.filter((notif) => notif._id !== notificationId)
      );
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to delete notification'));
    }
  }, []);

  const filterByType = useCallback(
    (type: NotificationType) => {
      return notifications.filter((notif) => notif.type === type);
    },
    [notifications]
  );

  const filterUnread = useCallback(() => {
    return notifications.filter((notif) => !notif.isRead);
  }, [notifications]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  // Fetch notifications on mount
  useEffect(() => {
    refetch();
  }, [refetch]);

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    refetch,
    markAsRead,
    deleteNotif,
    filterByType,
    filterUnread,
  };
}
