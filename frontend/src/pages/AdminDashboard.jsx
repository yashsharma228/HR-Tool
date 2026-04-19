import { useEffect, useState } from "react";
import {
  getAllLeaves,
  updateLeaveStatus,
  getAllUsers,
  getAllAttendance,
} from "../services/api";
import { showToast } from "../components/Toast";
import Loader from "../components/Loader";

export default function AdminDashboard() {
  const [leaves, setLeaves] = useState([]);
  const [users, setUsers] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState({ userId: "", startDate: "", endDate: "" });
  const [leaveFilter, setLeaveFilter] = useState({ status: "", startDate: "", endDate: "" });
  const [userFilter, setUserFilter] = useState({ role: "", search: "" });
  const [leavePagination, setLeavePagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [attPagination, setAttPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [userPagination, setUserPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [activeTab, setActiveTab] = useState("leaves");

  const pendingLeaves = leaves.filter((leave) => leave.status === "Pending").length;
  const presentCount = attendance.filter((record) => record.status === "Present").length;

  const getStatusChipClass = (status) => {
    if (status === "Pending") return "status-chip status-pending";
    if (status === "Approved") return "status-chip status-approved";
    if (status === "Present") return "status-chip status-present";
    return "status-chip status-rejected";
  };

  const fetchLeaves = async (page = 1, filters = leaveFilter) => {
    setLoading(true);
    try {
      const params = { page, limit: 5, ...filters };
      const { data } = await getAllLeaves(params);
      setLeaves(data.data);
      setLeavePagination(data.pagination);
    } catch {
      showToast("Failed to load leaves", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async (page = 1, filters = userFilter) => {
    setLoading(true);
    try {
      const params = { page, limit: 5, ...filters };
      const { data } = await getAllUsers(params);
      setUsers(data.data);
      setUserPagination(data.pagination);
    } catch {
      showToast("Failed to load users", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendance = async (page = 1, filters = filter) => {
    setLoading(true);
    try {
      const params = { page, limit: 5, ...filters };
      const { data } = await getAllAttendance(params);
      setAttendance(data.data);
      setAttPagination(data.pagination);
    } catch {
      showToast("Failed to load attendance", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaves();
    fetchUsers();
    fetchAttendance();
  }, []);


  useEffect(() => {
    fetchUsers(1, userFilter);
  }, [userFilter]);

  useEffect(() => {
    fetchAttendance(1, filter);
  }, [filter]);

  useEffect(() => {
    fetchLeaves(1, leaveFilter);
  }, [leaveFilter]);

  const handleLeaveAction = async (id, status) => {
    setLoading(true);
    try {
      const { data } = await updateLeaveStatus(id, status);
      setLeaves(leaves.map((l) => (l._id === id ? data : l)));
      showToast(`Leave ${status.toLowerCase()}`);
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to update leave", "error");
    } finally {
      setLoading(false);
    }
  };

  const PaginationControls = ({ pagination, onPageChange }) => (
    <div className="mt-4 flex items-center justify-between">
      <p className="text-sm text-slate-500">
        Page {pagination.page} of {pagination.totalPages} (Total: {pagination.total})
      </p>
      <div className="flex gap-2">
        <button
          onClick={() => onPageChange(pagination.page - 1)}
          disabled={pagination.page <= 1}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-50 hover:bg-slate-50"
        >
          Prev
        </button>
        <button
          onClick={() => onPageChange(pagination.page + 1)}
          disabled={pagination.page >= pagination.totalPages}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-50 hover:bg-slate-50"
        >
          Next
        </button>
      </div>
    </div>
  );

  return (
    <div className="mx-auto mt-6 w-full max-w-7xl px-4 pb-8 sm:px-6 lg:px-8">
      <div className="animated-rise mb-6 rounded-2xl bg-linear-to-r from-indigo-600 via-violet-600 to-fuchsia-600 p-6 text-white shadow-xl">
        <h2 className="text-2xl font-bold sm:text-3xl">Admin Control Center</h2>
        <p className="mt-2 text-sm text-indigo-100 sm:text-base">
          Manage leave approvals, employee records, and attendance trends in one place.
        </p>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="glass-card animated-fade rounded-2xl p-4 transition hover:-translate-y-1 hover:shadow-xl">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total Employees</p>
          <p className="mt-2 text-3xl font-bold text-slate-800">{userPagination.total}</p>
        </div>
        <div className="glass-card animated-fade rounded-2xl p-4 transition hover:-translate-y-1 hover:shadow-xl">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Pending Leaves</p>
          <p className="mt-2 text-3xl font-bold text-amber-600">{pendingLeaves}</p>
        </div>
        <div className="glass-card animated-fade rounded-2xl p-4 transition hover:-translate-y-1 hover:shadow-xl">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Attendance Records</p>
          <p className="mt-2 text-3xl font-bold text-slate-800">{attPagination.total}</p>
        </div>
        <div className="glass-card animated-fade rounded-2xl p-4 transition hover:-translate-y-1 hover:shadow-xl">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Present Marked</p>
          <p className="mt-2 text-3xl font-bold text-emerald-600">{presentCount}</p>
        </div>
      </div>

      <div className="mb-4 flex gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab("leaves")}
          className={`rounded-lg px-4 py-2 text-sm font-semibold ${activeTab === "leaves" ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-700"}`}
        >
          Leave Requests
        </button>
        <button
          onClick={() => setActiveTab("users")}
          className={`rounded-lg px-4 py-2 text-sm font-semibold ${activeTab === "users" ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-700"}`}
        >
          Employees
        </button>
        <button
          onClick={() => setActiveTab("attendance")}
          className={`rounded-lg px-4 py-2 text-sm font-semibold ${activeTab === "attendance" ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-700"}`}
        >
          Attendance
        </button>
      </div>

      {activeTab === "leaves" && (
        <div className="glass-card animated-rise rounded-2xl p-4">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold text-slate-800">Leave Requests</h3>
            <div className="ml-auto flex flex-wrap gap-2">
              <select
                value={leaveFilter.status}
                onChange={(e) => setLeaveFilter({ ...leaveFilter, status: e.target.value })}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                <option value="">All Status</option>
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
              </select>
              <input
                type="date"
                placeholder="From"
                value={leaveFilter.startDate}
                onChange={(e) => setLeaveFilter({ ...leaveFilter, startDate: e.target.value })}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              />
              <input
                type="date"
                placeholder="To"
                value={leaveFilter.endDate}
                onChange={(e) => setLeaveFilter({ ...leaveFilter, endDate: e.target.value })}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              />
            </div>
          </div>
          {loading ? <Loader /> : (
            <div className="overflow-x-auto rounded-xl border border-slate-200/80">
              <table className="min-w-190 w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-700">
                  <tr>
                    <th className="px-3 py-3">Employee</th>
                    <th className="px-3 py-3">Type</th>
                    <th className="px-3 py-3">Period</th>
                    <th className="px-3 py-3">Days</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {leaves.map((leave) => (
                    <tr key={leave._id} className="border-t border-slate-100 transition hover:bg-indigo-50/40">
                      <td className="px-3 py-3 font-medium text-slate-700">{leave.userId?.name}</td>
                      <td className="px-3 py-3 text-slate-600">{leave.leaveType}</td>
                      <td className="px-3 py-3 text-slate-600">
                        {new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}
                      </td>
                      <td className="px-3 py-3 text-slate-600">{leave.totalDays}</td>
                      <td className="px-3 py-3">
                        <span className={getStatusChipClass(leave.status)}>{leave.status}</span>
                      </td>
                      <td className="px-3 py-3">
                        {leave.status === "Pending" ? (
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => handleLeaveAction(leave._id, "Approved")}
                              className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:scale-105"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleLeaveAction(leave._id, "Rejected")}
                              className="rounded-lg bg-rose-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:scale-105"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-500">Processed</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {leaves.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-3 py-6 text-center text-slate-500">
                        No leave requests found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
          <PaginationControls pagination={leavePagination} onPageChange={(page) => fetchLeaves(page, leaveFilter)} />
        </div>
      )}

      {activeTab === "users" && (
        <div className="glass-card animated-rise rounded-2xl p-4">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold text-slate-800">Employee Directory</h3>
            <div className="ml-auto flex flex-wrap gap-2">
              <input
                type="text"
                placeholder="Search name/email..."
                value={userFilter.search}
                onChange={(e) => setUserFilter({ ...userFilter, search: e.target.value })}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              />
              <select
                value={userFilter.role}
                onChange={(e) => setUserFilter({ ...userFilter, role: e.target.value })}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                <option value="">All Roles</option>
                <option value="employee">Employee</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
          {loading ? <Loader /> : (
            <div className="overflow-x-auto rounded-xl border border-slate-200/80">
              <table className="min-w-130 w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-700">
                  <tr>
                    <th className="px-3 py-3">Name</th>
                    <th className="px-3 py-3">Email</th>
                    <th className="px-3 py-3">Role</th>
                    <th className="px-3 py-3">Leave Balance</th>
                    <th className="px-3 py-3">Date of Joining</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user._id} className="border-t border-slate-100 transition hover:bg-indigo-50/40">
                      <td className="px-3 py-3 font-medium text-slate-700">{user.name}</td>
                      <td className="px-3 py-3 text-slate-600">{user.email}</td>
                      <td className="px-3 py-3 capitalize text-slate-600">{user.role}</td>
                      <td className="px-3 py-3 font-semibold text-slate-700">{user.leaveBalance}</td>
                      <td className="px-3 py-3 text-slate-600">{new Date(user.dateOfJoining).toLocaleDateString()}</td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-3 py-6 text-center text-slate-500">
                        No employees found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
          <PaginationControls pagination={userPagination} onPageChange={(page) => fetchUsers(page, userFilter)} />
        </div>
      )}

      {activeTab === "attendance" && (
        <div className="glass-card animated-rise rounded-2xl p-4">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold text-slate-800">Attendance Overview</h3>
            <div className="ml-auto flex flex-wrap gap-2">
              <select
                value={filter.userId}
                onChange={(e) => setFilter({ ...filter, userId: e.target.value })}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                <option value="">All Employees</option>
                {users.map((user) => (
                  <option key={user._id} value={user._id}>{user.name}</option>
                ))}
              </select>
              <input
                type="date"
                placeholder="From"
                value={filter.startDate}
                onChange={(e) => setFilter({ ...filter, startDate: e.target.value })}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              />
              <input
                type="date"
                placeholder="To"
                value={filter.endDate}
                onChange={(e) => setFilter({ ...filter, endDate: e.target.value })}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              />
            </div>
          </div>
          {loading ? <Loader /> : (
            <div className="overflow-x-auto rounded-xl border border-slate-200/80">
              <table className="min-w-130 w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-700">
                  <tr>
                    <th className="px-3 py-3">Date</th>
                    <th className="px-3 py-3">Employee</th>
                    <th className="px-3 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {attendance.map((record) => (
                    <tr key={record._id} className="border-t border-slate-100 transition hover:bg-indigo-50/40">
                      <td className="px-3 py-3 text-slate-600">{new Date(record.date).toLocaleDateString()}</td>
                      <td className="px-3 py-3 font-medium text-slate-700">{record.userId?.name}</td>
                      <td className="px-3 py-3">
                        <span className={getStatusChipClass(record.status)}>{record.status}</span>
                      </td>
                    </tr>
                  ))}
                  {attendance.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-3 py-6 text-center text-slate-500">
                        No attendance records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
          <PaginationControls pagination={attPagination} onPageChange={(page) => fetchAttendance(page, filter)} />
        </div>
      )}
    </div>
  );
}
