import { useEffect, useMemo, useState } from "react";
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
import NotificationBell from "../components/NotificationBell";
import "./DashboardModern.css";

export default function EmployeeDashboard() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

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
  const [loading, setLoading] = useState(false);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");

  const approvedLeaves = leaves.filter((leave) => leave.status === "Approved").length;
  const presentDays = attendance.filter((record) => record.status === "Present").length;

  const getStatusChipClass = (status) => {
    if (status === "Pending") return "status-chip status-pending";
    if (status === "Approved") return "status-chip status-approved";
    if (status === "Present") return "status-chip status-present";
    return "status-chip status-rejected";
  };

  const fetchAttendanceData = () => {
    setLoading(true);
    Promise.all([getMyLeaves(), getMyAttendance()])
      .then(([leavesRes, attRes]) => {
        setLeaves(leavesRes.data);
        setAttendance(attRes.data);
        refreshProfile();
      })
      .catch(() => {
        showToast("Failed to load data", "error");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchAttendanceData();
  }, []);

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

  const formatLongDate = (value) =>
    new Date(value).toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "2-digit",
      year: "numeric",
    });
  const formatTime = (value) =>
    new Date(value).toLocaleTimeString("en-GB", { hour12: false });
  const recentAttendance = useMemo(() => attendance.slice(0, 3), [attendance]);
  const recentLeaves = useMemo(() => leaves.slice(0, 3), [leaves]);
  const leavePct = leaves.length ? Math.round((approvedLeaves / leaves.length) * 100) : 0;
  const todayAttendance = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return attendance.find((record) => {
      const recordDate = new Date(record.date);
      recordDate.setHours(0, 0, 0, 0);
      return recordDate.getTime() === today.getTime();
    }) || null;
  }, [attendance]);

  const handleCheckIn = async () => {
    setAttendanceLoading(true);
    try {
      const { data } = await checkIn();
      setAttendance((current) => [data, ...current.filter((item) => item._id !== data._id)]);
      showToast("Checked in successfully");
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to check in", "error");
    } finally {
      setAttendanceLoading(false);
    }
  };

  const handleCheckOut = async () => {
    setAttendanceLoading(true);
    try {
      const { data } = await checkOut();
      setAttendance((current) => [data, ...current.filter((item) => item._id !== data._id)]);
      showToast("Checked out successfully");
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to check out", "error");
    } finally {
      setAttendanceLoading(false);
    }
  };

  const renderDashboardTab = () => (
    <>
      <section className="pro-stat-grid pro-animate-in">
        <div className="pro-stat-card"><h4>Leave Balance</h4><p>{user.leaveBalance}</p><span>Remaining leaves</span></div>
        <div className="pro-stat-card"><h4>Total Requests</h4><p>{leaves.length}</p><span>All leave requests</span></div>
        <div className="pro-stat-card"><h4>Approved</h4><p>{approvedLeaves}</p><span>Approved leaves</span></div>
        <div className="pro-stat-card"><h4>Present Days</h4><p>{presentDays}</p><span>Attendance marked</span></div>
      </section>

      <section className="pro-two-col pro-animate-in">
        <div className="pro-panel">
          <h3>Attendance Overview</h3>
          <div className="pro-overview-row">
            <div className="pro-ring">{leavePct}%</div>
            <div>
              <div className="pro-overview-main">{approvedLeaves} / {leaves.length || 0} <span>Approved</span></div>
              <div className="pro-overview-sub">
                <span>{presentDays} days present</span>
                <span>{Math.max(leaves.length - approvedLeaves, 0)} pending/rejected</span>
              </div>
            </div>
          </div>
        </div>

        <div className="pro-panel">
          <h3>Recent Leave Activity</h3>
          {recentLeaves.map((leave) => (
            <div className="pro-list-row" key={leave._id}>
              <div className="avatar">{leave.leaveType[0]}</div>
              <div>
                <strong>{leave.leaveType} Leave</strong>
                <p>{leave.status} • {leave.totalDays} day(s)</p>
              </div>
            </div>
          ))}
          {recentLeaves.length === 0 && <p className="muted">No leave records yet.</p>}
        </div>
      </section>

      <section className="pro-two-col pro-animate-in">
        <div className="pro-panel">
          <h3>Recent Attendance</h3>
          {recentAttendance.map((item) => (
            <div className="pro-list-row" key={item._id}>
              <div className="avatar">{user.name[0]}</div>
              <div>
                <strong>{user.name}</strong>
                <p>{item.status} at {new Date(item.date).toLocaleDateString()}</p>
              </div>
            </div>
          ))}
          {recentAttendance.length === 0 && <p className="muted">No attendance records yet.</p>}
        </div>

        <div className="pro-panel">
          <h3>Recent Activity</h3>
          {recentLeaves.map((leave) => (
            <div className="pro-list-row" key={leave._id}>
              <div className="avatar">{leave.leaveType[0]}</div>
              <div>
                <strong>{leave.leaveType} Leave</strong>
                <p>{leave.status} • {new Date(leave.startDate).toLocaleDateString()}</p>
              </div>
            </div>
          ))}
          {recentLeaves.length === 0 && <p className="muted">No recent activity yet.</p>}
        </div>
      </section>
    </>
  );

  const renderLeaveHistoryTab = () => (
    <section className="pro-content-stack pro-animate-in">
      <div className="pro-panel">
        <h3>Apply / Edit Leave</h3>
        <form onSubmit={handleLeaveSubmit} className="pro-form">
          <select name="leaveType" value={leaveForm.leaveType} onChange={handleLeaveChange}>
            <option value="Casual">Casual</option>
            <option value="Sick">Sick</option>
            <option value="Paid">Paid</option>
          </select>
          <div className="pro-form-row">
            <input type="date" name="startDate" value={leaveForm.startDate} onChange={handleLeaveChange} required />
            <input type="date" name="endDate" value={leaveForm.endDate} onChange={handleLeaveChange} required />
          </div>
          <textarea name="reason" value={leaveForm.reason} onChange={handleLeaveChange} placeholder="Reason (optional)" rows={3} />
          <div className="pro-form-actions">
            <button type="submit">{editingLeaveId ? "Update Leave" : "Apply Leave"}</button>
            {editingLeaveId && <button type="button" className="ghost" onClick={handleCancelEdit}>Cancel</button>}
          </div>
        </form>
      </div>

      <div className="pro-panel">
        <h3>Leave History</h3>
        {leaves.map((leave) => (
          <div className="pro-list-row" key={leave._id}>
            <div className="avatar">{leave.leaveType[0]}</div>
            <div>
              <strong>{leave.leaveType} Leave</strong>
              <p>{leave.status} • {leave.totalDays} day(s) • {new Date(leave.startDate).toLocaleDateString()}</p>
            </div>
            {leave.status === "Pending" && (
              <div className="inline-actions">
                <button onClick={() => handleEditLeave(leave)}>Edit</button>
                <button className="danger" onClick={() => handleDeleteLeave(leave._id)}>Delete</button>
              </div>
            )}
          </div>
        ))}
        {leaves.length === 0 && <p className="muted">No leave records yet.</p>}
      </div>
    </section>
  );

  const renderAttendanceTab = () => (
    <section className="pro-content-stack pro-animate-in">
      <div className="pro-two-col">
        <div className="pro-panel">
          <h3>Apply Attendance</h3>
          <div className="pro-attendance-card">
            <div className="pro-attendance-status">
              <span>Today&apos;s status</span>
              <strong>{todayAttendance?.status || "Not marked"}</strong>
            </div>
            <div className="pro-attendance-meta">
              <span>Check-in: {todayAttendance?.checkInTime ? new Date(todayAttendance.checkInTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Not yet"}</span>
              <span>Check-out: {todayAttendance?.checkOutTime ? new Date(todayAttendance.checkOutTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Not yet"}</span>
            </div>
            <div className="pro-form-actions">
              <button type="button" onClick={handleCheckIn} disabled={attendanceLoading || !!todayAttendance?.checkInTime}>Check In</button>
              <button type="button" className="ghost" onClick={handleCheckOut} disabled={attendanceLoading || !todayAttendance?.checkInTime || !!todayAttendance?.checkOutTime}>Check Out</button>
            </div>
          </div>
        </div>

        <div className="pro-panel">
          <h3>Attendance Summary</h3>
          <div className="pro-mini-grid">
            <div><strong>{presentDays}</strong><span>Present days</span></div>
            <div><strong>{attendance.length}</strong><span>Total records</span></div>
          </div>
        </div>
      </div>

      <div className="pro-panel">
        <h3>Attendance History</h3>
        {attendance.map((item) => (
          <div className="pro-list-row" key={item._id}>
            <div className="avatar">{user.name[0]}</div>
            <div>
              <strong>{new Date(item.date).toLocaleDateString()}</strong>
              <p>{item.status} • Check-in {item.checkInTime ? new Date(item.checkInTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "--"} • Check-out {item.checkOutTime ? new Date(item.checkOutTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "--"}</p>
            </div>
          </div>
        ))}
        {attendance.length === 0 && <p className="muted">No attendance records yet.</p>}
      </div>
    </section>
  );

  return (
    <div className="pro-shell">
      <aside className="pro-sidebar">
        <div className="pro-brand"><span>HR</span> HR Tool</div>
        <div className="pro-search">Search</div>
        <nav className="pro-nav">
          <button className={activeTab === "dashboard" ? "active" : ""} onClick={() => setActiveTab("dashboard")}>Dashboard</button>
          <button className={activeTab === "leave-history" ? "active" : ""} onClick={() => setActiveTab("leave-history")}>Leave History</button>
          <button className={activeTab === "attendance" ? "active" : ""} onClick={() => setActiveTab("attendance")}>Attendance</button>
        </nav>
      </aside>

      <main className="pro-main">
        <header className="pro-topbar">
          <section className="pro-greeting">
            <h1>Good Morning, {user.name} 👋</h1>
            <p>Here&apos;s your personal HR overview for today</p>
          </section>
          <div className="pro-right">
            <NotificationBell />
            <div className="pro-datetime">
              <span>{formatLongDate(now)}</span>
              <strong>{formatTime(now)}</strong>
            </div>
          </div>
        </header>

        {loading ? <Loader /> : (
          activeTab === "dashboard"
            ? renderDashboardTab()
            : activeTab === "leave-history"
              ? renderLeaveHistoryTab()
              : renderAttendanceTab()
        )}
      </main>
    </div>
  );
}
