'use client';

import { useState, useRef, useEffect } from 'react';
import { useNotifications } from '@/lib/hooks/useNotifications';
import Link from 'next/link';
import { Notification } from '@/types/notifications';

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { notifications, unreadCount, markAsRead, deleteNotif } = useNotifications();

  // Get latest 5 notifications
  const recentNotifications = notifications.slice(0, 5);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAsRead = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await markAsRead(id);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await deleteNotif(id);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative inline-flex items-center justify-center rounded-full p-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
        title="Notifications"
        aria-label="Notifications"
      >
        <svg
          className="h-6 w-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>

        {/* Badge */}
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 rounded-lg border border-gray-200 bg-white shadow-lg z-50">
          {/* Header */}
          <div className="border-b border-gray-200 px-4 py-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">
                Notifications
              </h3>
              {unreadCount > 0 && (
                <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                  {unreadCount} new
                </span>
              )}
            </div>
          </div>

          {/* Notification List */}
          <div className="max-h-96 overflow-y-auto">
            {recentNotifications.length > 0 ? (
              <div className="divide-y divide-gray-200">
                {recentNotifications.map((notif: Notification) => (
                  <div
                    key={notif._id}
                    className="p-3 hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {notif.message}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(notif.createdAt).toLocaleString()}
                        </p>
                      </div>
                      {!notif.isRead && (
                        <div className="flex-shrink-0">
                          <button
                            onClick={(e) => handleMarkAsRead(e, notif._id)}
                            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                          >
                            Mark Read
                          </button>
                        </div>
                      )}
                      <button
                        onClick={(e) => handleDelete(e, notif._id)}
                        className="ml-1 text-gray-400 hover:text-red-600 transition-colors"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-4 py-8 text-center">
                <p className="text-sm text-gray-500 mb-2">No notifications</p>
                <Link
                  href="/dashboard/notifications"
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                >
                  View All Notifications →
                </Link>
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="border-t border-gray-200 px-4 py-2">
              <Link
                href="/dashboard/notifications"
                className="inline-block text-sm font-medium text-blue-600 hover:text-blue-800"
              >
                View All →
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
