import { Link, useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import { useState, useRef, useEffect } from "react";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

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
