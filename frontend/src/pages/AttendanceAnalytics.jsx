import { useEffect, useState } from "react";
import { getMonthlyReport, getYearlyReport, getAllUsers } from "../services/api";
import useAuth from "../hooks/useAuth";
import Loader from "../components/Loader";

export default function AttendanceAnalytics() {
  const { user } = useAuth();
  const [reportType, setReportType] = useState("monthly");
  const [monthlyData, setMonthlyData] = useState(null);
  const [yearlyData, setYearlyData] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    userId: ""
  });

  useEffect(() => {
    getAllUsers({ role: "employee", limit: 100 }).then(res => {
      setEmployees(res.data.data || []);
    }).catch(() => {});
  }, []);

  // Polling: auto-refresh reports every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (user.role === "admin") {
        if (reportType === "monthly") {
          fetchMonthlyReport();
        } else if (reportType === "yearly") {
          fetchYearlyReport();
        }
      }
    }, 10000); // 10 seconds
    return () => clearInterval(interval);
  }, [user.role, reportType, filters.year, filters.month, filters.userId]);

  useEffect(() => {
    if (user.role === "admin") {
      fetchMonthlyReport();
    }
  }, [filters.year, filters.month, filters.userId]);

  useEffect(() => {
    if (user.role === "admin" && reportType === "yearly") {
      fetchYearlyReport();
    }
  }, [filters.year, reportType]);

  const fetchMonthlyReport = async () => {
    setLoading(true);
    try {
      const params = { year: filters.year, month: filters.month };
      if (filters.userId) params.userId = filters.userId;
      const { data } = await getMonthlyReport(params);
      setMonthlyData(data);
    } catch {
      setMonthlyData(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchYearlyReport = async () => {
    setLoading(true);
    try {
      const { data } = await getYearlyReport({ year: filters.year });
      setYearlyData(data);
    } catch {
      setYearlyData(null);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (percentage) => {
    if (percentage >= 80) return "text-emerald-600 bg-emerald-100";
    if (percentage >= 60) return "text-amber-600 bg-amber-100";
    return "text-rose-600 bg-rose-100";
  };

  return (
    <div className="max-w-6xl mx-auto mt-10 p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-6">Attendance Reports</h2>

      {user.role === "admin" && (
        <>
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="flex gap-2 bg-slate-100 p-1 rounded-lg">
              <button
                onClick={() => setReportType("monthly")}
                className={`px-4 py-2 rounded-md font-medium transition ${reportType === "monthly" ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-200"}`}
              >
                Monthly Report
              </button>
              <button
                onClick={() => setReportType("yearly")}
                className={`px-4 py-2 rounded-md font-medium transition ${reportType === "yearly" ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-200"}`}
              >
                Yearly Report
              </button>
            </div>

            <select
              value={filters.year}
              onChange={(e) => setFilters({ ...filters, year: parseInt(e.target.value) })}
              className="px-4 py-2 border rounded-lg"
            >
              {[2024, 2025, 2026].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>

            {reportType === "monthly" && (
              <select
                value={filters.month}
                onChange={(e) => setFilters({ ...filters, month: parseInt(e.target.value) })}
                className="px-4 py-2 border rounded-lg"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                  <option key={m} value={m}>
                    {new Date(2000, m - 1).toLocaleString("default", { month: "long" })}
                  </option>
                ))}
              </select>
            )}

            <select
              value={filters.userId}
              onChange={(e) => setFilters({ ...filters, userId: e.target.value })}
              className="px-4 py-2 border rounded-lg"
            >
              <option value="">All Employees</option>
              {employees.map(emp => (
                <option key={emp._id} value={emp._id}>{emp.name}</option>
              ))}
            </select>
          </div>

          {loading ? (
            <Loader />
          ) : (
            <>
              {reportType === "monthly" && monthlyData && (
                <div>
                  <div className="mb-6 p-4 bg-linear-to-r from-indigo-500 to-violet-500 rounded-lg text-white">
                    <h3 className="text-lg font-semibold">
                      {new Date(filters.year, filters.month - 1).toLocaleString("default", { month: "long" })} {filters.year}
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                      <div className="bg-white/20 rounded-lg p-3">
                        <div className="text-2xl font-bold">{monthlyData.summary.totalEmployees}</div>
                        <div className="text-sm">Employees</div>
                      </div>
                      <div className="bg-white/20 rounded-lg p-3">
                        <div className="text-2xl font-bold">{monthlyData.summary.totalPresent}</div>
                        <div className="text-sm">Total Present</div>
                      </div>
                      <div className="bg-white/20 rounded-lg p-3">
                        <div className="text-2xl font-bold">{monthlyData.summary.totalAbsent}</div>
                        <div className="text-sm">Total Absent</div>
                      </div>
                      <div className="bg-white/20 rounded-lg p-3">
                        <div className="text-2xl font-bold">{Math.round(monthlyData.summary.overallPresentPercentage)}%</div>
                        <div className="text-sm">Avg Attendance</div>
                      </div>
                    </div>
                  </div>

                  <div className="overflow-x-auto mt-8">
                    <table className="w-full border text-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="p-3 text-left">Employee</th>
                          <th className="p-3 text-center">Present</th>
                          <th className="p-3 text-center">Absent</th>
                          <th className="p-3 text-center">Total</th>
                          <th className="p-3 text-center">Attendance %</th>
                          <th className="p-3 text-center">Daily Records</th>
                        </tr>
                      </thead>
                      <tbody>
                        {monthlyData.employees.map((emp) => (
                          <tr key={emp.employee.id} className="border-t hover:bg-slate-50">
                            <td className="p-3">
                              <div className="font-medium">{emp.employee.name}</div>
                              <div className="text-xs text-slate-500">{emp.employee.email}</div>
                            </td>
                            <td className="p-3 text-center text-emerald-600 font-semibold">{emp.statistics.presentDays}</td>
                            <td className="p-3 text-center text-rose-600 font-semibold">{emp.statistics.absentDays}</td>
                            <td className="p-3 text-center">{emp.statistics.totalDays}</td>
                            <td className="p-3 text-center">
                              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(emp.statistics.presentPercentage)}`}>
                                {emp.statistics.presentPercentage}%
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              <details>
                                <summary className="cursor-pointer text-indigo-600 underline text-xs">View</summary>
                                <div className="mt-2 max-h-48 overflow-y-auto bg-slate-50 rounded p-2 border border-slate-200">
                                  <table className="w-full text-xs">
                                    <thead>
                                      <tr>
                                        <th>Date</th>
                                        <th>Status</th>
                                        <th>Check-in</th>
                                        <th>Check-out</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {emp.records.map((rec, idx) => (
                                        <tr key={idx}>
                                          <td>{new Date(rec.date).toLocaleDateString()}</td>
                                          <td>{rec.status}</td>
                                          <td>{rec.checkInTime ? new Date(rec.checkInTime).toLocaleTimeString() : '-'}</td>
                                          <td>{rec.checkOutTime ? new Date(rec.checkOutTime).toLocaleTimeString() : '-'}</td>
                                        </tr>
                                      ))}
                                      {emp.records.length === 0 && (
                                        <tr><td colSpan={4} className="text-center text-slate-400">No records</td></tr>
                                      )}
                                    </tbody>
                                  </table>
                                </div>
                              </details>
                            </td>
                          </tr>
                        ))}
                        {monthlyData.employees.length === 0 && (
                          <tr>
                            <td colSpan={6} className="p-6 text-center text-slate-500">No data for this period</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {reportType === "yearly" && yearlyData && (
                <div>
                  <div className="mb-6 p-4 bg-linear-to-r from-emerald-500 to-teal-500 rounded-lg text-white">
                    <h3 className="text-lg font-semibold">Yearly Summary - {yearlyData.year}</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                      <div className="bg-white/20 rounded-lg p-3">
                        <div className="text-2xl font-bold">{yearlyData.summary.totalDays}</div>
                        <div className="text-sm">Total Days</div>
                      </div>
                      <div className="bg-white/20 rounded-lg p-3">
                        <div className="text-2xl font-bold">{yearlyData.summary.totalPresent}</div>
                        <div className="text-sm">Total Present</div>
                      </div>
                      <div className="bg-white/20 rounded-lg p-3">
                        <div className="text-2xl font-bold">{yearlyData.summary.totalAbsent}</div>
                        <div className="text-sm">Total Absent</div>
                      </div>
                      <div className="bg-white/20 rounded-lg p-3">
                        <div className="text-2xl font-bold">{yearlyData.summary.avgPresentPercentage}%</div>
                        <div className="text-sm">Avg Attendance</div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {yearlyData.months.map((month) => (
                      <div key={month.month} className="border rounded-lg p-4 hover:shadow-md transition">
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="font-semibold text-slate-700">{month.monthName}</h4>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(month.statistics.presentPercentage)}`}>
                            {month.statistics.presentPercentage}%
                          </span>
                        </div>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-slate-500">Present:</span>
                            <span className="text-emerald-600 font-medium">{month.statistics.presentDays}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Absent:</span>
                            <span className="text-rose-600 font-medium">{month.statistics.absentDays}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Total:</span>
                            <span className="font-medium">{month.statistics.totalDays}</span>
                          </div>
                        </div>
                        <div className="mt-3 h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-linear-to-r from-emerald-400 to-teal-500 transition-all"
                            style={{ width: `${month.statistics.presentPercentage}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}

      {user.role === "employee" && (
        <div className="text-center text-slate-500">
          <p>Attendance reports are available for administrators only.</p>
        </div>
      )}
    </div>
  );
}