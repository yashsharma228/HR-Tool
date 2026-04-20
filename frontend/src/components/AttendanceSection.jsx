import { useEffect, useState } from "react";
import { checkIn, checkOut, getMyAttendance } from "../services/api";
import { showToast } from "../components/Toast";
import Loader from "../components/Loader";

export default function AttendanceSection() {
  const [attendanceToday, setAttendanceToday] = useState(null);
  const [loading, setLoading] = useState(false);
  const [attLoading, setAttLoading] = useState(false);

  // Fetch today's attendance (UTC)
  const fetchAttendanceToday = async () => {
    setLoading(true);
    try {
      const { data } = await getMyAttendance();
      const today = new Date();
      const todayUTCYear = today.getUTCFullYear();
      const todayUTCMonth = today.getUTCMonth();
      const todayUTCDate = today.getUTCDate();
      const todayRecord = data.find((rec) => {
        if (!rec.date) return false;
        const recDate = new Date(rec.date);
        return (
          recDate.getUTCFullYear() === todayUTCYear &&
          recDate.getUTCMonth() === todayUTCMonth &&
          recDate.getUTCDate() === todayUTCDate
        );
      });
      setAttendanceToday(todayRecord || null);
    } catch {
      showToast("Failed to load attendance", "error");
    } finally {
      setLoading(false);
    }
  };

  // Removed auto-fetch and auto-refresh logic to prevent automatic page reload or data refresh

  const handleCheckIn = async () => {
    setAttLoading(true);
    try {
      await checkIn();
      showToast("Checked in successfully");
      fetchAttendanceToday();
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to check in", "error");
      fetchAttendanceToday();
    } finally {
      setAttLoading(false);
    }
  };

  const handleCheckOut = async () => {
    setAttLoading(true);
    try {
      await checkOut();
      showToast("Checked out successfully");
      fetchAttendanceToday();
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to check out", "error");
      fetchAttendanceToday();
    } finally {
      setAttLoading(false);
    }
  };

  return (
    <div className="glass-card animated-rise rounded-2xl p-4">
      <h3 className="mb-3 text-lg font-semibold text-slate-800">Attendance</h3>
      {loading ? (
        <Loader />
      ) : (
        <>
          <div className="mb-4 flex flex-col gap-2 sm:flex-row">
            {!attendanceToday?.checkInTime ? (
              <button
                onClick={handleCheckIn}
                className="rounded-lg bg-linear-to-r from-emerald-500 to-teal-500 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:scale-105 disabled:opacity-50"
                disabled={attLoading}
              >
                {attLoading ? "Checking in..." : "Check In"}
              </button>
            ) : !attendanceToday?.checkOutTime ? (
              <button
                onClick={handleCheckOut}
                className="rounded-lg bg-linear-to-r from-indigo-500 to-blue-500 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:scale-105 disabled:opacity-50"
                disabled={attLoading}
              >
                {attLoading ? "Checking out..." : "Check Out"}
              </button>
            ) : (
              <span className="text-green-700 font-semibold">Attendance completed</span>
            )}
          </div>
          <div className="mb-2">
            <h4 className="mb-2 text-sm font-semibold text-slate-700">Today's Attendance</h4>
            {attendanceToday ? (
              <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm flex flex-col gap-1">
                <div>
                  <strong>Status:</strong>{" "}
                  <span className={`status-chip status-${attendanceToday.status?.toLowerCase()}`}>
                    {attendanceToday.status}
                  </span>
                </div>
                <div>
                  <strong>Check-in:</strong>{" "}
                  {attendanceToday.checkInTime
                    ? new Date(attendanceToday.checkInTime).toLocaleTimeString()
                    : "-"}
                </div>
                <div>
                  <strong>Check-out:</strong>{" "}
                  {attendanceToday.checkOutTime
                    ? new Date(attendanceToday.checkOutTime).toLocaleTimeString()
                    : "-"}
                </div>
                <div>
                  <strong>Work Hours:</strong> {attendanceToday.workHours || "-"}
                </div>
              </div>
            ) : (
              <span className="text-slate-500">No attendance yet today.</span>
            )}
          </div>
        </>
      )}
    </div>
  );
}
