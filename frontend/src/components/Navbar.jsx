import { Link, useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import { useState, useRef, useEffect } from "react";
import {
  getMyNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "../services/api";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifLoading, setNotifLoading] = useState(false);
  const notifRef = useRef();

  const loadNotifications = async () => {
    if (!user) return;

    setNotifLoading(true);
    try {
      const { data } = await getMyNotifications();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch {
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setNotifLoading(false);
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

    setNotifOpen(false);
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
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setNotifOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <nav className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/80 backdrop-blur-lg">
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="bg-linear-to-r from-indigo-600 to-fuchsia-600 bg-clip-text text-lg font-extrabold text-transparent">
          HR Tool
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm sm:gap-3">
        {user ? (
          <>
            {user.role === "employee" && (
              <>
                <Link to="/employee" className="rounded-lg px-3 py-2 font-medium text-slate-600 transition hover:bg-indigo-50 hover:text-indigo-700">
                  Dashboard
                </Link>
                <Link to="/attendance-calendar" className="rounded-lg px-3 py-2 font-medium text-slate-600 transition hover:bg-indigo-50 hover:text-indigo-700">
                  Attendance Calendar
                </Link>
              </>
            )}
            {user.role === "admin" && (
              <>
                <Link to="/admin" className="rounded-lg px-3 py-2 font-medium text-slate-600 transition hover:bg-indigo-50 hover:text-indigo-700">
                  Dashboard
                </Link>
                <Link to="/attendance-analytics" className="rounded-lg px-3 py-2 font-medium text-slate-600 transition hover:bg-indigo-50 hover:text-indigo-700">
                  Reports
                </Link>
              </>
            )}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => {
                  setNotifOpen((open) => !open);
                  if (!notifOpen) {
                    loadNotifications();
                  }
                }}
                className="relative flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-indigo-200 hover:text-indigo-700"
                aria-label="Notifications"
              >
                <BellIcon />
                {unreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-rose-500 px-1.5 py-0.5 text-center text-[11px] font-bold leading-none text-white">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 mt-3 w-86 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl z-50">
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
                    {notifLoading ? (
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
            <ProfileDropdown user={user} onLogout={handleLogout} />
          </>
        ) : (
          <>
            <Link to="/login" className="rounded-lg px-3 py-2 font-medium text-slate-600 transition hover:bg-indigo-50 hover:text-indigo-700">
              Login
            </Link>
            <Link to="/signup" className="rounded-lg bg-linear-to-r from-indigo-600 to-fuchsia-600 px-4 py-2 font-semibold text-white shadow-md transition hover:scale-105">
              Signup
            </Link>
          </>
        )}
        </div>
      </div>
    </nav>
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

function ProfileDropdown({ user, onLogout }) {
  const [open, setOpen] = useState(false);
  const ref = useRef();

  useEffect(() => {
    function handleClickOutside(event) {
      if (ref.current && !ref.current.contains(event.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="rounded-full bg-slate-100 px-3 py-1 text-slate-700 font-medium focus:outline-none"
      >
        {user.name}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-64 rounded-lg bg-white shadow-lg border border-slate-200 z-50 p-4 text-sm">
          <div className="mb-2 font-bold text-base text-indigo-700">Profile</div>
          <div className="mb-1"><span className="font-semibold">Full Name:</span> {user.name}</div>
          <div className="mb-1"><span className="font-semibold">Email:</span> {user.email}</div>
          <div className="mb-1"><span className="font-semibold">Role:</span> {user.role.charAt(0).toUpperCase() + user.role.slice(1)}</div>
          <div className="mb-3"><span className="font-semibold">Date of Joining:</span> {user.dateOfJoining ? user.dateOfJoining.slice(0,10) : "-"}</div>
          <button
            onClick={onLogout}
            className="w-full rounded bg-linear-to-r from-indigo-600 to-fuchsia-600 px-4 py-2 font-semibold text-white shadow-md transition hover:scale-105"
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
}
