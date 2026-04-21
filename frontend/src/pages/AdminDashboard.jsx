import { useEffect, useMemo, useState } from "react";
import {
  getAllLeaves,
  getAllUsers,
  getAllAttendance,
  getAdminDashboardStats,
  updateLeaveStatus,
} from "../services/api";
import { showToast } from "../components/Toast";
import Loader from "../components/Loader";
import NotificationBell from "../components/NotificationBell";
import "./DashboardModern.css";

const PRESENT_STATUSES = ["Present", "Late", "Half-day"];

export default function AdminDashboard() {
  const [now, setNow] = useState(new Date());
  const [leaves, setLeaves] = useState([]);
  const [users, setUsers] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dashboardStats, setDashboardStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [reportSection, setReportSection] = useState("attendance");
  const [reportType, setReportType] = useState("monthly");
  const [reportEmployeeId, setReportEmployeeId] = useState("");
  const [reportMonth, setReportMonth] = useState(new Date().getMonth() + 1);
  const [reportYear, setReportYear] = useState(new Date().getFullYear());
  const [processingLeaveId, setProcessingLeaveId] = useState(null);

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

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
          getAllLeaves({ page: 1, limit: 1000 }),
          getAllUsers({ page: 1, limit: 1000 }),
          getAllAttendance({ page: 1, limit: 1000 }),
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
  const pendingLeaves = useMemo(
    () => leaves.filter((leave) => leave.status === "Pending"),
    [leaves]
  );
  const latestUsers = useMemo(
    () => users.filter((user) => user.role === "employee").slice(0, 5),
    [users]
  );
  const todayAttendance = useMemo(() => {
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    return attendance
      .filter((record) => {
        const recordDate = new Date(record.date);
        return recordDate >= startOfDay && recordDate < endOfDay;
      })
      .sort((left, right) => {
        const leftTime = new Date(left.checkInTime || left.updatedAt || left.createdAt || left.date).getTime();
        const rightTime = new Date(right.checkInTime || right.updatedAt || right.createdAt || right.date).getTime();
        return rightTime - leftTime;
      });
  }, [attendance, now]);
  const recentActivity = useMemo(() => {
    const attendanceActivity = attendance.map((record) => ({
      id: `attendance-${record._id}`,
      kind: "attendance",
      occurredAt: new Date(record.updatedAt || record.checkOutTime || record.checkInTime || record.createdAt || record.date),
      title: record.userId?.name || "Employee",
      description: buildAttendanceActivityText(record),
      avatar: (record.userId?.name || "U")[0],
    }));

    const leaveActivity = leaves.map((leave) => ({
      id: `leave-${leave._id}`,
      kind: "leave",
      occurredAt: new Date(leave.updatedAt || leave.appliedAt || leave.createdAt || leave.startDate),
      title: leave.userId?.name || "Employee",
      description: `${leave.leaveType} leave ${leave.status.toLowerCase()} (${leave.totalDays} day${leave.totalDays > 1 ? "s" : ""})`,
      avatar: (leave.userId?.name || "U")[0],
    }));

    return [...attendanceActivity, ...leaveActivity]
      .sort((left, right) => right.occurredAt - left.occurredAt)
      .slice(0, 8);
  }, [attendance, leaves]);

  const reportRange = useMemo(
    () => getReportRange(reportType, reportYear, reportMonth, now),
    [reportType, reportYear, reportMonth, now]
  );

  const filteredAttendance = useMemo(
    () =>
      attendance.filter((record) => {
        const recordDate = new Date(record.date);
        const matchesEmployee = !reportEmployeeId || record.userId?._id === reportEmployeeId;
        return matchesEmployee && recordDate >= reportRange.start && recordDate <= reportRange.end;
      }),
    [attendance, reportEmployeeId, reportRange]
  );

  const filteredLeaves = useMemo(
    () =>
      leaves.filter((leave) => {
        const matchesEmployee = !reportEmployeeId || leave.userId?._id === reportEmployeeId;
        const leaveStart = new Date(leave.startDate);
        const leaveEnd = new Date(leave.endDate);
        return matchesEmployee && leaveStart <= reportRange.end && leaveEnd >= reportRange.start;
      }),
    [leaves, reportEmployeeId, reportRange]
  );

  const reportUsers = useMemo(() => {
    const employees = users.filter((user) => user.role === "employee");
    return reportEmployeeId ? employees.filter((user) => user._id === reportEmployeeId) : employees;
  }, [users, reportEmployeeId]);

  const attendanceRows = useMemo(
    () =>
      reportUsers.map((employee) => {
        const employeeAttendance = filteredAttendance.filter((record) => record.userId?._id === employee._id);
        const employeeLeaves = filteredLeaves.filter(
          (leave) => leave.userId?._id === employee._id && leave.status === "Approved"
        );
        const present = employeeAttendance.filter((record) => PRESENT_STATUSES.includes(record.status)).length;
        const absent = employeeAttendance.filter((record) => record.status === "Absent").length;
        const late = employeeAttendance.filter((record) => record.status === "Late").length;
        const leaveCount = employeeLeaves.length;
        const totalTracked = employeeAttendance.length;
        const attendancePercent = totalTracked ? Math.round((present / totalTracked) * 100) : 0;

        return {
          employee,
          present,
          absent,
          leave: leaveCount,
          late,
          attendancePercent,
        };
      }),
    [reportUsers, filteredAttendance, filteredLeaves]
  );

  const attendanceStats = useMemo(() => {
    const totalEmployees = attendanceRows.length;
    const totalPresent = attendanceRows.reduce((sum, row) => sum + row.present, 0);
    const totalAbsent = attendanceRows.reduce((sum, row) => sum + row.absent, 0);
    const totalLate = attendanceRows.reduce((sum, row) => sum + row.late, 0);
    const totalLeave = attendanceRows.reduce((sum, row) => sum + row.leave, 0);
    const avgAttendance = totalEmployees
      ? Math.round(attendanceRows.reduce((sum, row) => sum + row.attendancePercent, 0) / totalEmployees)
      : 0;

    return { totalEmployees, totalPresent, totalAbsent, totalLate, totalLeave, avgAttendance };
  }, [attendanceRows]);

  const leaveStats = useMemo(
    () => ({
      total: filteredLeaves.length,
      approved: filteredLeaves.filter((leave) => leave.status === "Approved").length,
      pending: filteredLeaves.filter((leave) => leave.status === "Pending").length,
      rejected: filteredLeaves.filter((leave) => leave.status === "Rejected").length,
    }),
    [filteredLeaves]
  );

  const trendData = useMemo(
    () => buildTrendData(filteredAttendance, reportRange, reportType),
    [filteredAttendance, reportRange, reportType]
  );

  const bestAttendanceEmployee = useMemo(
    () => [...attendanceRows].sort((left, right) => right.attendancePercent - left.attendancePercent)[0] || null,
    [attendanceRows]
  );

  const mostLeavesEmployee = useMemo(
    () => [...attendanceRows].sort((left, right) => right.leave - left.leave)[0] || null,
    [attendanceRows]
  );

  const lowAttendanceEmployees = useMemo(
    () => attendanceRows.filter((row) => row.attendancePercent > 0 && row.attendancePercent < 50),
    [attendanceRows]
  );

  const pendingLeaveCount = pendingLeaves.length;
  const totalLeaveCount = leaves.length;

  const handleLeaveDecision = async (leaveId, status) => {
    setProcessingLeaveId(leaveId);
    try {
      const { data } = await updateLeaveStatus(leaveId, status);
      setLeaves((current) =>
        current.map((leave) =>
          leave._id === leaveId
            ? { ...leave, ...data, userId: leave.userId }
            : leave
        )
      );
      await fetchDashboardStats();
      showToast(`Leave ${status.toLowerCase()} successfully`);
    } catch (error) {
      showToast(error.response?.data?.message || `Failed to ${status.toLowerCase()} leave`, "error");
    } finally {
      setProcessingLeaveId(null);
    }
  };

  const renderDashboardTab = () => (
    <>
      <section className="pro-stat-grid pro-animate-in">
        <div className="pro-stat-card"><h4>Active Workforce</h4><p>{dashboardStats?.totalEmployees || users.length}</p><span>Total employees</span></div>
        <div className="pro-stat-card"><h4>Present Today</h4><p>{dashboardStats?.presentToday || 0}</p><span>Clocked in</span></div>
        <div className="pro-stat-card"><h4>Absent Today</h4><p>{dashboardStats?.absentToday || 0}</p><span>Not present</span></div>
        <div className="pro-stat-card"><h4>On Leave</h4><p>{dashboardStats?.onLeave || 0}</p><span>Approved leave</span></div>
      </section>

      <section className="pro-two-col pro-animate-in">
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
            <div><strong>{pendingLeaveCount}</strong><span>Pending Leave Requests</span></div>
            <div><strong>{dashboardStats?.attendanceRecordsToday || 0}</strong><span>Attendance Records</span></div>
          </div>
          <div className="pro-overview-sub">
            <span>{totalLeaveCount} total leave request(s)</span>
            <span>{leaveStats.approved} approved</span>
          </div>
        </div>
      </section>

      <section className="pro-two-col pro-animate-in">
        <div className="pro-panel">
          <h3>Recent Today</h3>
          {todayAttendance.map((item) => (
            <div className="pro-list-row" key={item._id}>
              <div className="avatar">{(item.userId?.name || "U")[0]}</div>
              <div>
                <strong>{item.userId?.name || "Employee"}</strong>
                <p>{formatAttendanceTimeline(item)}</p>
              </div>
            </div>
          ))}
          {todayAttendance.length === 0 && <p className="muted">No attendance marked today.</p>}
        </div>

        <div className="pro-panel">
          <h3>Recent Activity</h3>
          {recentActivity.map((activity) => (
            <div className="pro-list-row" key={activity.id}>
              <div className="avatar">{activity.avatar}</div>
              <div>
                <strong>{activity.title}</strong>
                <p>{activity.description}</p>
              </div>
              <span className="text-xs text-slate-400">{formatActivityTime(activity.occurredAt)}</span>
            </div>
          ))}
          {recentActivity.length === 0 && <p className="muted">No recent activity yet.</p>}
        </div>
      </section>
    </>
  );

  const renderReportsTab = () => (
    <section className="pro-content-stack pro-animate-in">
      <div className="pro-panel pro-report-toolbar">
        <div className="pro-report-filters">
          <div className="pro-filter-group">
            <label>Report Type</label>
            <select value={reportType} onChange={(event) => setReportType(event.target.value)}>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
          <div className="pro-filter-group">
            <label>Employee</label>
            <select value={reportEmployeeId} onChange={(event) => setReportEmployeeId(event.target.value)}>
              <option value="">All employees</option>
              {users.filter((user) => user.role === "employee").map((employee) => (
                <option key={employee._id} value={employee._id}>{employee.name}</option>
              ))}
            </select>
          </div>
          {reportType !== "weekly" && (
            <div className="pro-filter-group">
              <label>Year</label>
              <select value={reportYear} onChange={(event) => setReportYear(Number(event.target.value))}>
                {buildYearOptions(now.getFullYear()).map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
          )}
          {reportType === "monthly" && (
            <div className="pro-filter-group">
              <label>Month</label>
              <select value={reportMonth} onChange={(event) => setReportMonth(Number(event.target.value))}>
                {Array.from({ length: 12 }, (_, index) => index + 1).map((month) => (
                  <option key={month} value={month}>{new Date(2026, month - 1).toLocaleString("default", { month: "long" })}</option>
                ))}
              </select>
            </div>
          )}
        </div>
        <div className="pro-report-range">{reportRange.label}</div>
      </div>

      <div className="pro-report-tabs">
        <button className={reportSection === "attendance" ? "active" : ""} onClick={() => setReportSection("attendance")}>Attendance Reports</button>
        <button className={reportSection === "leave" ? "active" : ""} onClick={() => setReportSection("leave")}>Leave Reports</button>
        <button className={reportSection === "summary" ? "active" : ""} onClick={() => setReportSection("summary")}>Summary Analytics</button>
      </div>

      {reportSection === "attendance" && (
        <>
          <section className="pro-stat-grid">
            <div className="pro-stat-card"><h4>Total Employees</h4><p>{attendanceStats.totalEmployees}</p><span>Included in report</span></div>
            <div className="pro-stat-card"><h4>Avg Attendance %</h4><p>{attendanceStats.avgAttendance}</p><span>Average attendance</span></div>
            <div className="pro-stat-card"><h4>Total Present Days</h4><p>{attendanceStats.totalPresent}</p><span>Present-like records</span></div>
            <div className="pro-stat-card"><h4>Late Count</h4><p>{attendanceStats.totalLate}</p><span>Late arrivals</span></div>
          </section>

          <section className="pro-two-col">
            <div className="pro-panel">
              <div className="pro-panel-actions">
                <h3>Attendance Trend</h3>
              </div>
              <div className="pro-chart-bars">
                {trendData.map((item) => (
                  <div key={item.label} className="pro-chart-bar-group">
                    <span>{item.label}</span>
                    <div className="pro-chart-bar-track">
                      <div className="pro-chart-bar-fill" style={{ width: `${item.total ? (item.present / item.total) * 100 : 0}%` }} />
                    </div>
                    <strong>{item.present}/{item.total || 0}</strong>
                  </div>
                ))}
              </div>
            </div>

            <div className="pro-panel">
              <h3>Present vs Absent vs Leave</h3>
              <div className="pro-breakdown-list">
                <div className="pro-breakdown-row"><span>Present</span><strong>{attendanceStats.totalPresent}</strong></div>
                <div className="pro-breakdown-row"><span>Absent</span><strong>{attendanceStats.totalAbsent}</strong></div>
                <div className="pro-breakdown-row"><span>Leave</span><strong>{attendanceStats.totalLeave}</strong></div>
              </div>
            </div>
          </section>

          <section className="pro-panel">
            <div className="pro-panel-actions">
              <h3>Attendance Report Table</h3>
              <button
                className="pro-btn pro-btn-sm"
                onClick={() => downloadCsv(`attendance-${reportType}.csv`, attendanceRows.map((row) => ({
                  Employee: row.employee.name,
                  Present: row.present,
                  Absent: row.absent,
                  Leave: row.leave,
                  Late: row.late,
                  AttendancePercent: `${row.attendancePercent}%`,
                })))}
              >
                Export CSV
              </button>
            </div>
            <div className="pro-simple-table">
              <div className="pro-table-row pro-table-row-head pro-table-row-wide">
                <span>Employee</span>
                <span>Present</span>
                <span>Absent</span>
                <span>Leave</span>
                <span>Late</span>
                <span>Attendance %</span>
              </div>
              {attendanceRows.map((row) => (
                <div className={`pro-table-row pro-table-row-wide ${row.attendancePercent > 0 && row.attendancePercent < 50 ? "low" : ""}`} key={row.employee._id}>
                  <span>{row.employee.name}</span>
                  <span>{row.present}</span>
                  <span>{row.absent}</span>
                  <span>{row.leave}</span>
                  <span>{row.late}</span>
                  <span>{row.attendancePercent}%</span>
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      {reportSection === "leave" && (
        <>
          <section className="pro-stat-grid">
            <div className="pro-stat-card"><h4>Total Leaves</h4><p>{leaveStats.total}</p><span>In selected period</span></div>
            <div className="pro-stat-card"><h4>Approved Leaves</h4><p>{leaveStats.approved}</p><span>Approved requests</span></div>
            <div className="pro-stat-card"><h4>Pending Requests</h4><p>{leaveStats.pending}</p><span>Awaiting review</span></div>
            <div className="pro-stat-card"><h4>Rejected Leaves</h4><p>{leaveStats.rejected}</p><span>Declined requests</span></div>
          </section>

          <section className="pro-panel">
            <div className="pro-panel-actions">
              <h3>Leave Report Table</h3>
              <button
                className="pro-btn pro-btn-sm"
                onClick={() => downloadCsv(`leave-${reportType}.csv`, filteredLeaves.map((leave) => ({
                  Employee: leave.userId?.name || "Employee",
                  LeaveType: leave.leaveType,
                  From: new Date(leave.startDate).toLocaleDateString(),
                  To: new Date(leave.endDate).toLocaleDateString(),
                  Days: leave.totalDays,
                  Status: leave.status,
                })))}
              >
                Export CSV
              </button>
            </div>
            <div className="pro-simple-table">
              <div className="pro-table-row pro-table-row-head pro-table-row-leaves">
                <span>Employee</span>
                <span>Leave Type</span>
                <span>From</span>
                <span>To</span>
                <span>Days</span>
                <span>Status</span>
              </div>
              {filteredLeaves.map((leave) => (
                <div className="pro-table-row pro-table-row-leaves" key={leave._id}>
                  <span>{leave.userId?.name || "Employee"}</span>
                  <span>{leave.leaveType}</span>
                  <span>{new Date(leave.startDate).toLocaleDateString()}</span>
                  <span>{new Date(leave.endDate).toLocaleDateString()}</span>
                  <span>{leave.totalDays}</span>
                  <span>{leave.status}</span>
                </div>
              ))}
              {!filteredLeaves.length && <p className="muted">No leave records found for this period.</p>}
            </div>
          </section>
        </>
      )}

      {reportSection === "summary" && (
        <section className="pro-content-stack">
          <div className="pro-two-col">
            <div className="pro-panel">
              <h3>Best Attendance Employee</h3>
              {bestAttendanceEmployee ? (
                <div className="pro-highlight-box">
                  <strong>{bestAttendanceEmployee.employee.name}</strong>
                  <p>{bestAttendanceEmployee.attendancePercent}% attendance rate</p>
                </div>
              ) : <p className="muted">No attendance data available.</p>}
            </div>

            <div className="pro-panel">
              <h3>Most Leaves Taken</h3>
              {mostLeavesEmployee ? (
                <div className="pro-highlight-box warn">
                  <strong>{mostLeavesEmployee.employee.name}</strong>
                  <p>{mostLeavesEmployee.leave} approved leave entries</p>
                </div>
              ) : <p className="muted">No leave data available.</p>}
            </div>
          </div>

          <div className="pro-two-col">
            <div className="pro-panel">
              <h3>Low Attendance Employees</h3>
              {lowAttendanceEmployees.length ? lowAttendanceEmployees.map((row) => (
                <div className="pro-list-row" key={row.employee._id}>
                  <div className="avatar">{row.employee.name[0]}</div>
                  <div>
                    <strong>{row.employee.name}</strong>
                    <p>{row.attendancePercent}% attendance</p>
                  </div>
                </div>
              )) : <p className="muted">No low attendance employees in this period.</p>}
            </div>

            <div className="pro-panel">
              <h3>Monthly Trend Graph</h3>
              <div className="pro-chart-bars">
                {trendData.map((item) => (
                  <div key={item.label} className="pro-chart-bar-group compact">
                    <span>{item.label}</span>
                    <div className="pro-chart-bar-track">
                      <div className="pro-chart-bar-fill alt" style={{ width: `${item.total ? (item.present / item.total) * 100 : 0}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}
    </section>
  );

  const renderSystemAdminTab = () => (
    <section className="pro-content-stack pro-animate-in">
      <div className="pro-two-col">
        <div className="pro-panel">
          <div className="pro-panel-actions">
            <h3>All Leave Requests</h3>
            <span className="text-sm text-slate-500">Approve or reject pending requests</span>
          </div>
          {leaves.map((leave) => (
            <div className="pro-list-row" key={leave._id}>
              <div className="avatar">{(leave.userId?.name || "U")[0]}</div>
              <div className="min-w-0 flex-1">
                <strong>{leave.userId?.name || "Employee"}</strong>
                <p>
                  {leave.leaveType} leave for {leave.totalDays} day(s) • {new Date(leave.startDate).toLocaleDateString()} to {new Date(leave.endDate).toLocaleDateString()}
                </p>
                <p className="muted">Status: {leave.status}</p>
              </div>
              {leave.status === "Pending" ? (
                <div className="flex gap-2">
                  <button
                    className="pro-btn pro-btn-sm"
                    disabled={processingLeaveId === leave._id}
                    onClick={() => handleLeaveDecision(leave._id, "Approved")}
                  >
                    Approve
                  </button>
                  <button
                    className="pro-btn pro-btn-sm ghost"
                    disabled={processingLeaveId === leave._id}
                    onClick={() => handleLeaveDecision(leave._id, "Rejected")}
                  >
                    Reject
                  </button>
                </div>
              ) : (
                <span className="text-sm font-semibold text-slate-500">{leave.status}</span>
              )}
            </div>
          ))}
          {leaves.length === 0 && <p className="muted">No leave requests found.</p>}
        </div>

        <div className="pro-panel">
          <h3>Team Directory</h3>
          {latestUsers.map((employee) => (
            <div className="pro-list-row" key={employee._id}>
              <div className="avatar">{employee.name[0]}</div>
              <div>
                <strong>{employee.name}</strong>
                <p>{employee.email}</p>
              </div>
            </div>
          ))}
          {latestUsers.length === 0 && <p className="muted">No employees found.</p>}
        </div>
      </div>

      <div className="pro-panel">
        <h3>Attendance Audit</h3>
        <div className="pro-simple-table">
          {todayAttendance.map((item) => (
            <div className="pro-table-row" key={item._id}>
              <span>{new Date(item.date).toLocaleDateString()}</span>
              <span>{item.userId?.name || "Employee"}</span>
              <span>{formatAttendanceTimeline(item)}</span>
            </div>
          ))}
          {todayAttendance.length === 0 && <p className="muted">No attendance audit entries for today.</p>}
        </div>
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
          <button className={activeTab === "reports" ? "active" : ""} onClick={() => setActiveTab("reports")}>Reports</button>
          <button className={activeTab === "system-admin" ? "active" : ""} onClick={() => setActiveTab("system-admin")}>System Admin</button>
        </nav>
      </aside>

      <main className="pro-main">
        <header className="pro-topbar">
          <section className="pro-greeting">
            <h1>Good Morning, Yash 👋</h1>
            <p>Here&apos;s your team overview for today</p>
          </section>
          <div className="pro-right">
            <NotificationBell />
            <div className="pro-datetime">
              <span>{formatLongDate(now)}</span>
              <strong>{formatTime(now)}</strong>
            </div>
            <button className="pro-btn">+ Add Employee</button>
          </div>
        </header>

        {(loading || statsLoading)
          ? <Loader />
          : activeTab === "dashboard"
            ? renderDashboardTab()
            : activeTab === "reports"
              ? renderReportsTab()
              : renderSystemAdminTab()}
      </main>
    </div>
  );
}

function getReportRange(type, year, month, now) {
  if (type === "weekly") {
    const current = new Date(now);
    const day = current.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const start = new Date(current);
    start.setDate(current.getDate() + diffToMonday);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return { start, end, label: `${start.toLocaleDateString()} - ${end.toLocaleDateString()}` };
  }

  if (type === "yearly") {
    return {
      start: new Date(year, 0, 1, 0, 0, 0, 0),
      end: new Date(year, 11, 31, 23, 59, 59, 999),
      label: `Year ${year}`,
    };
  }

  return {
    start: new Date(year, month - 1, 1, 0, 0, 0, 0),
    end: new Date(year, month, 0, 23, 59, 59, 999),
    label: `${new Date(year, month - 1, 1).toLocaleString("default", { month: "long" })} ${year}`,
  };
}

function buildTrendData(records, range, type) {
  if (type === "yearly") {
    return Array.from({ length: 12 }, (_, index) => {
      const monthRecords = records.filter((record) => new Date(record.date).getMonth() === index);
      return {
        label: new Date(range.start.getFullYear(), index, 1).toLocaleString("default", { month: "short" }),
        present: monthRecords.filter((record) => PRESENT_STATUSES.includes(record.status)).length,
        total: monthRecords.length,
      };
    });
  }

  const cursor = new Date(range.start);
  const output = [];
  while (cursor <= range.end) {
    const dayKey = cursor.toDateString();
    const dayRecords = records.filter((record) => new Date(record.date).toDateString() === dayKey);
    output.push({
      label: cursor.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      present: dayRecords.filter((record) => PRESENT_STATUSES.includes(record.status)).length,
      total: dayRecords.length,
    });
    cursor.setDate(cursor.getDate() + 1);
  }
  return output;
}

function buildYearOptions(currentYear) {
  return Array.from({ length: 5 }, (_, index) => currentYear - index);
}

function formatAttendanceTimeline(record) {
  const parts = [];

  if (record.checkInTime) {
    parts.push(`Came at ${new Date(record.checkInTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`);
  }

  if (record.checkOutTime) {
    parts.push(`Went at ${new Date(record.checkOutTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`);
  }

  if (!parts.length) {
    parts.push(record.status || "Attendance updated");
  }

  return `${parts.join(" • ")} • ${record.status}`;
}

function buildAttendanceActivityText(record) {
  if (record.checkOutTime) {
    return `Checked out at ${new Date(record.checkOutTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} (${record.status})`;
  }

  if (record.checkInTime) {
    return `Checked in at ${new Date(record.checkInTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} (${record.status})`;
  }

  return `Attendance updated (${record.status})`;
}

function formatActivityTime(value) {
  return new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function downloadCsv(fileName, rows) {
  if (!rows.length) {
    return;
  }

  const headers = Object.keys(rows[0]);
  const content = [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => JSON.stringify(row[header] ?? "")).join(",")),
  ].join("\n");

  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
