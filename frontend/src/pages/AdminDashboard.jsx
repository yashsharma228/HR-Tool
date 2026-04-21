import { useEffect, useMemo, useState } from "react";
import {
  getAllLeaves,
  getAllUsers,
  getAllAttendance,
  getAdminDashboardStats,
} from "../services/api";
import { showToast } from "../components/Toast";
import Loader from "../components/Loader";
import "./DashboardModern.css";

export default function AdminDashboard() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const [leaves, setLeaves] = useState([]);
  const [users, setUsers] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dashboardStats, setDashboardStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);

  const fetchDashboardStats = async () => {
    setStatsLoading(true);
    try {
      const { data } = await getAdminDashboardStats();
      setDashboardStats(data);
    } catch {
      setDashboardStats(null);
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [leavesRes, usersRes, attendanceRes] = await Promise.all([
          getAllLeaves({ page: 1, limit: 10 }),
          getAllUsers({ page: 1, limit: 10 }),
          getAllAttendance({ page: 1, limit: 10 }),
        ]);
        setLeaves(leavesRes.data.data || []);
        setUsers(usersRes.data.data || []);
        setAttendance(attendanceRes.data.data || []);
      } catch {
        showToast("Failed to load dashboard data", "error");
      } finally {
        setLoading(false);
      }
    };
    load();
    fetchDashboardStats();
  }, []);

  const formatLongDate = (value) =>
    new Date(value).toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "2-digit",
      year: "numeric",
    });
  const formatTime = (value) =>
    new Date(value).toLocaleTimeString("en-GB", { hour12: false });

  const attendanceRatio = dashboardStats?.totalEmployees
    ? `${dashboardStats.presentToday} / ${dashboardStats.totalEmployees}`
    : "0 / 0";
  const presentPct = Number(dashboardStats?.attendancePercent || 0);
  const recentAttendance = useMemo(() => attendance.slice(0, 3), [attendance]);
  const recentLeaves = useMemo(() => leaves.slice(0, 2), [leaves]);

  return (
    <div className="pro-shell">
      <aside className="pro-sidebar">
        <div className="pro-brand"><span>HR</span> HR Tool</div>
        <div className="pro-search">Search</div>
        <nav className="pro-nav">
          <button className="active">Dashboard</button>
          <button>Reports</button>
          <button>System Admin</button>
        </nav>
      </aside>

      <main className="pro-main">
        <header className="pro-topbar">
          <div className="pro-toplinks">
            <span className="active">Dashboard</span>
            <span>Reports</span>
            <span>System Admin</span>
          </div>
          <div className="pro-right">
            <div className="pro-datetime">
              <span>{formatLongDate(now)}</span>
              <strong>{formatTime(now)}</strong>
            </div>
            <button className="pro-btn">+ Add Employee</button>
          </div>
        </header>

        <section className="pro-greeting">
          <h1>Good Morning, Yash 👋</h1>
          <p>Here&apos;s your team overview for today</p>
        </section>

        {(loading || statsLoading) ? <Loader /> : (
          <>
            <section className="pro-stat-grid">
              <div className="pro-stat-card"><h4>Active Workforce</h4><p>{dashboardStats?.totalEmployees || users.length}</p><span>Total employees</span></div>
              <div className="pro-stat-card"><h4>Present Today</h4><p>{dashboardStats?.presentToday || 0}</p><span>Clocked in</span></div>
              <div className="pro-stat-card"><h4>Absent Today</h4><p>{dashboardStats?.absentToday || 0}</p><span>Not present</span></div>
              <div className="pro-stat-card"><h4>On Leave</h4><p>{dashboardStats?.onLeave || 0}</p><span>Approved leave</span></div>
            </section>

            <section className="pro-two-col">
              <div className="pro-panel">
                <h3>Attendance Overview</h3>
                <div className="pro-overview-row">
                  <div className="pro-ring">{presentPct}%</div>
                  <div>
                    <div className="pro-overview-main">{attendanceRatio} <span>Present</span></div>
                    <div className="pro-overview-sub">
                      <span>{dashboardStats?.presentToday || 0} employees present</span>
                      <span>{dashboardStats?.absentToday || 0} employees absent</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pro-panel">
                <h3>Activity Summary</h3>
                <div className="pro-mini-grid">
                  <div><strong>{dashboardStats?.onLeave || 0}</strong><span>Leave Requests</span></div>
                  <div><strong>{dashboardStats?.attendanceRecordsToday || 0}</strong><span>Attendance Records</span></div>
                </div>
              </div>
            </section>

            <section className="pro-two-col">
              <div className="pro-panel">
                <h3>Recent Today</h3>
                {recentAttendance.map((item) => (
                  <div className="pro-list-row" key={item._id}>
                    <div className="avatar">{(item.userId?.name || "U")[0]}</div>
                    <div>
                      <strong>{item.userId?.name || "Employee"}</strong>
                      <p>{item.status} at {new Date(item.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
                    </div>
                  </div>
                ))}
                {recentAttendance.length === 0 && <p className="muted">No recent attendance records.</p>}
              </div>

              <div className="pro-panel">
                <h3>Recent Activity</h3>
                {recentLeaves.map((leave) => (
                  <div className="pro-list-row" key={leave._id}>
                    <div className="avatar">{(leave.userId?.name || "U")[0]}</div>
                    <div>
                      <strong>{leave.userId?.name || "Employee"}</strong>
                      <p>{leave.leaveType} leave ({leave.status})</p>
                    </div>
                  </div>
                ))}
                {recentLeaves.length === 0 && <p className="muted">No leave activity today.</p>}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
