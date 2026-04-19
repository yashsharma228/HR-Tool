import { useEffect, useState } from "react";
import {
  getMyLeaves,
  applyLeave,
  updateLeave,
  deleteLeave,
  checkIn,
  checkOut,
  getMyAttendance,
} from "../services/api";
import useAuth from "../hooks/useAuth";
import { showToast } from "../components/Toast";
import Loader from "../components/Loader";
import AttendanceCalendar from "../components/AttendanceCalendar";

export default function EmployeeDashboard() {
  const { user, refreshProfile } = useAuth();
  const [leaves, setLeaves] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [leaveForm, setLeaveForm] = useState({
    leaveType: "Casual",
    startDate: "",
    endDate: "",
    reason: "",
  });
  const [editingLeaveId, setEditingLeaveId] = useState(null);
  const [attendanceToday, setAttendanceToday] = useState(null);
  const [loading, setLoading] = useState(false);
  // const [attLoading, setAttLoading] = useState(false); // Removed duplicate declaration
  const approvedLeaves = leaves.filter((leave) => leave.status === "Approved").length;
  const presentDays = attendance.filter((record) => record.status === "Present").length;

  const getStatusChipClass = (status) => {
    if (status === "Pending") return "status-chip status-pending";
    if (status === "Approved") return "status-chip status-approved";
    if (status === "Present") return "status-chip status-present";
    return "status-chip status-rejected";
  };

  // Fetch leaves and attendance
  useEffect(() => {
    setLoading(true);
    Promise.all([getMyLeaves(), getMyAttendance()])
      .then(([leavesRes, attRes]) => {
        setLeaves(leavesRes.data);
        setAttendance(attRes.data);
        refreshProfile();
        // Set today's attendance
        const todayStr = new Date().toISOString().slice(0, 10);
        const todayRecord = attRes.data.find(
          (rec) => rec.date && rec.date.slice(0, 10) === todayStr
        );
        setAttendanceToday(todayRecord || null);
      })
      .catch(() => showToast("Failed to load data", "error"))
      .finally(() => setLoading(false));
  }, []);


  // Leave form handlers
  const handleLeaveChange = (e) => setLeaveForm({ ...leaveForm, [e.target.name]: e.target.value });

  const handleLeaveSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingLeaveId) {
        const { data } = await updateLeave(editingLeaveId, leaveForm);
        setLeaves(leaves.map((item) => (item._id === editingLeaveId ? data : item)));
        showToast("Leave updated");
      } else {
        const { data } = await applyLeave(leaveForm);
        setLeaves([data, ...leaves]);
        showToast("Leave applied");
      }
      setLeaveForm({ leaveType: "Casual", startDate: "", endDate: "", reason: "" });
      setEditingLeaveId(null);
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to save leave", "error");
    } finally {
      setLoading(false);
    }
  };

  // Attendance
  const [attLoading, setAttLoading] = useState(false);
  const handleCheckIn = async () => {
    setAttLoading(true);
    try {
      const { data } = await checkIn();
      setAttendance([data, ...attendance]);
      setAttendanceToday(data);
      showToast("Checked in successfully");
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to check in", "error");
    } finally {
      setAttLoading(false);
    }
  };
  const handleCheckOut = async () => {
    setAttLoading(true);
    try {
      const { data } = await checkOut();
      setAttendance([data, ...attendance.filter(a => a._id !== data._id)]);
      setAttendanceToday(data);
      showToast("Checked out successfully");
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to check out", "error");
    } finally {
      setAttLoading(false);
    }
  };

  // Edit/Delete leave (only pending)
  const handleDeleteLeave = async (id) => {
    if (!window.confirm("Delete this leave request?")) return;
    setLoading(true);
    try {
      await deleteLeave(id);
      setLeaves(leaves.filter((l) => l._id !== id));
      showToast("Leave deleted");
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to delete leave", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleEditLeave = (leave) => {
    setEditingLeaveId(leave._id);
    setLeaveForm({
      leaveType: leave.leaveType,
      startDate: leave.startDate.slice(0, 10),
      endDate: leave.endDate.slice(0, 10),
      reason: leave.reason || "",
    });
  };

  const handleCancelEdit = () => {
    setEditingLeaveId(null);
    setLeaveForm({ leaveType: "Casual", startDate: "", endDate: "", reason: "" });
  };

  return (
    <div className="mx-auto mt-6 w-full max-w-7xl px-4 pb-8 sm:px-6 lg:px-8">
      <div className="animated-rise mb-6 rounded-2xl bg-linear-to-r from-cyan-600 via-indigo-600 to-violet-600 p-6 text-white shadow-xl">
        <h2 className="text-2xl font-bold sm:text-3xl">Welcome back, {user.name}</h2>
        <p className="mt-2 text-sm text-cyan-100 sm:text-base">
          Track leave and attendance in real time from your personal HR dashboard.
        </p>
        <h3 className="mt-4 text-lg font-semibold">Office Hours: 10:00 AM – 6:00 PM</h3>
      </div>
  {/* Attendance Calendar */}
  <AttendanceCalendar attendanceData={attendance} />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="glass-card animated-fade rounded-2xl p-4 transition hover:-translate-y-1 hover:shadow-xl">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Leave Balance</p>
          <p className="mt-2 text-3xl font-bold text-indigo-700">{user.leaveBalance}</p>
        </div>
        <div className="glass-card animated-fade rounded-2xl p-4 transition hover:-translate-y-1 hover:shadow-xl">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total Leave Requests</p>
          <p className="mt-2 text-3xl font-bold text-slate-800">{leaves.length}</p>
        </div>
        <div className="glass-card animated-fade rounded-2xl p-4 transition hover:-translate-y-1 hover:shadow-xl">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Approved Leaves</p>
          <p className="mt-2 text-3xl font-bold text-emerald-600">{approvedLeaves}</p>
        </div>
        <div className="glass-card animated-fade rounded-2xl p-4 transition hover:-translate-y-1 hover:shadow-xl">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Present Days</p>
          <p className="mt-2 text-3xl font-bold text-cyan-700">{presentDays}</p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="glass-card animated-rise rounded-2xl p-4">
          <h3 className="mb-3 text-lg font-semibold text-slate-800">
            {editingLeaveId ? "Edit Leave Request" : "Apply for Leave"}
          </h3>
          <form onSubmit={handleLeaveSubmit} className="space-y-3">
            <select
              name="leaveType"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              value={leaveForm.leaveType}
              onChange={handleLeaveChange}
            >
              <option value="Casual">Casual</option>
              <option value="Sick">Sick</option>
              <option value="Paid">Paid</option>
            </select>
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                type="date"
                name="startDate"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                value={leaveForm.startDate}
                onChange={handleLeaveChange}
                required
              />
              <input
                type="date"
                name="endDate"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                value={leaveForm.endDate}
                onChange={handleLeaveChange}
                required
              />
            </div>
            <textarea
              name="reason"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              placeholder="Reason (optional)"
              value={leaveForm.reason}
              onChange={handleLeaveChange}
              rows={3}
            />
            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                className="rounded-lg bg-linear-to-r from-indigo-600 to-fuchsia-600 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:scale-105 disabled:opacity-50"
                disabled={loading}
              >
              {loading ? "Saving..." : editingLeaveId ? "Update Leave" : "Apply"}
              </button>
              {editingLeaveId && (
                <button
                  type="button"
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  onClick={handleCancelEdit}
                >
                  Cancel Edit
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="glass-card animated-rise rounded-2xl p-4">
          <h3 className="mb-3 text-lg font-semibold text-slate-800">Attendance</h3>
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
            <h4 className="mb-2 text-sm font-semibold text-slate-700">Today&#39;s Attendance</h4>
            {attendanceToday ? (
              <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm flex flex-col gap-1">
                <div><strong>Status:</strong> <span className={getStatusChipClass(attendanceToday.status)}>{attendanceToday.status}</span></div>
                <div><strong>Check-in:</strong> {attendanceToday.checkInTime ? new Date(attendanceToday.checkInTime).toLocaleTimeString() : '-'}</div>
                <div><strong>Check-out:</strong> {attendanceToday.checkOutTime ? new Date(attendanceToday.checkOutTime).toLocaleTimeString() : '-'}</div>
                <div><strong>Work Hours:</strong> {attendanceToday.workHours || '-'}</div>
              </div>
            ) : <span className="text-slate-500">No attendance yet today.</span>}
          </div>
          <div>
            <h4 className="mb-2 text-sm font-semibold text-slate-700">Recent Attendance</h4>
            <div className="max-h-56 overflow-y-auto rounded-xl border border-slate-200/80 bg-white/70 p-2">
              {attendanceToday ? (
                <div className="mb-2 flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm transition hover:bg-indigo-50/60">
                  <span className="font-medium text-slate-700">{new Date().toLocaleDateString()}</span>
                  <span className={getStatusChipClass(attendanceToday.status)}>{attendanceToday.status}</span>
                </div>
              ) : (
                <p className="p-3 text-center text-sm text-slate-500">No attendance yet today.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="glass-card animated-rise mt-6 rounded-2xl p-4">
        <h3 className="mb-3 text-lg font-semibold text-slate-800">Leave History</h3>
        {loading ? <Loader /> : (
          <div className="overflow-x-auto rounded-xl border border-slate-200/80">
            <table className="min-w-175 w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-700">
                <tr>
                  <th className="px-3 py-3">Type</th>
                  <th className="px-3 py-3">Period</th>
                  <th className="px-3 py-3">Days</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">Reason</th>
                  <th className="px-3 py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {leaves.map((leave) => (
                  <tr key={leave._id} className="border-t border-slate-100 transition hover:bg-indigo-50/40">
                    <td className="px-3 py-3 font-medium text-slate-700">{leave.leaveType}</td>
                    <td className="px-3 py-3 text-slate-600">
                      {new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-3 text-slate-600">{leave.totalDays}</td>
                    <td className="px-3 py-3">
                      <span className={getStatusChipClass(leave.status)}>{leave.status}</span>
                    </td>
                    <td className="px-3 py-3 text-slate-600">{leave.reason || "-"}</td>
                    <td className="px-3 py-3">
                      {leave.status === "Pending" && (
                        <>
                          <button
                            onClick={() => handleEditLeave(leave)}
                            className="mr-2 rounded-md bg-indigo-100 px-2.5 py-1 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-200"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteLeave(leave._id)}
                            className="rounded-md bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-700 transition hover:bg-rose-200"
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
                {leaves.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-3 py-6 text-center text-slate-500">
                      No leave records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
