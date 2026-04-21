import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import {
  getMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../services/api";

export default function NotificationBell({ className = "" }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);

  const loadNotifications = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data } = await getMyNotifications();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch {
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationClick = async (notification) => {
    try {
      if (!notification.read) {
        await markNotificationRead(notification._id);
        setNotifications((current) =>
          current.map((item) =>
            item._id === notification._id ? { ...item, read: true } : item
          )
        );
        setUnreadCount((current) => Math.max(current - 1, 0));
      }
    } catch {}

    setOpen(false);
    if (notification.link) {
      navigate(notification.link);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setNotifications((current) => current.map((item) => ({ ...item, read: true })));
      setUnreadCount(0);
    } catch {}
  };

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    loadNotifications();
    const interval = setInterval(loadNotifications, 15000);
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (ref.current && !ref.current.contains(event.target)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!user) return null;

  return (
    <div className={`relative ${className}`.trim()} ref={ref}>
      <button
        onClick={() => {
          setOpen((current) => !current);
          if (!open) {
            loadNotifications();
          }
        }}
        className="relative flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-indigo-200 hover:text-indigo-700"
        aria-label="Notifications"
      >
        <BellIcon />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-rose-500 px-1.5 py-0.5 text-center text-[11px] font-bold leading-none text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-3 w-86 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-slate-800">Notifications</p>
              <p className="text-xs text-slate-500">{unreadCount} unread</p>
            </div>
            <button
              onClick={handleMarkAllRead}
              className="text-xs font-semibold text-indigo-600 transition hover:text-indigo-800"
              disabled={!unreadCount}
            >
              Mark all read
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto bg-slate-50/60">
            {loading ? (
              <div className="px-4 py-6 text-sm text-slate-500">Loading notifications...</div>
            ) : notifications.length === 0 ? (
              <div className="px-4 py-6 text-sm text-slate-500">No notifications yet.</div>
            ) : (
              notifications.map((notification) => (
                <button
                  key={notification._id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`flex w-full items-start gap-3 border-b border-slate-100 px-4 py-3 text-left transition hover:bg-white ${notification.read ? "bg-slate-50/40" : "bg-indigo-50/60"}`}
                >
                  <span className={`mt-1 h-2.5 w-2.5 rounded-full ${notification.read ? "bg-slate-300" : "bg-indigo-500"}`} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-slate-800">{notification.title}</span>
                    <span className="mt-1 block text-sm text-slate-600">{notification.message}</span>
                    <span className="mt-1 block text-xs text-slate-400">
                      {formatNotificationTime(notification.createdAt)}
                    </span>
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 1-5.714 0M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.5 20a2.5 2.5 0 0 0 5 0" />
    </svg>
  );
}

function formatNotificationTime(value) {
  const createdAt = new Date(value);
  const diffInMinutes = Math.round((Date.now() - createdAt.getTime()) / 60000);

  if (diffInMinutes < 1) return "Just now";
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

  const diffInHours = Math.round(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;

  const diffInDays = Math.round(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}d ago`;

  return createdAt.toLocaleString();
}