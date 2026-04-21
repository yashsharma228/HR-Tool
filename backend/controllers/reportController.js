const Attendance = require('../models/Attendance');
const Leave = require('../models/Leave');
const User = require('../models/User');
const { calculateDailyAttendanceStats, getCutoffTime } = require('../utils/attendanceSummary');

const OFFICE_START_HOUR = 10;
const OFFICE_START_MIN = 0;
const OFFICE_END_HOUR = 18;
const OFFICE_END_MIN = 0;

function startOfDay(date) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function endOfDay(date) {
  const value = new Date(date);
  value.setHours(23, 59, 59, 999);
  return value;
}

function isWeekend(date) {
  const day = new Date(date).getDay();
  return day === 0 || day === 6;
}

function getDateKey(date) {
  return startOfDay(date).toISOString();
}

function getOfficeBoundary(referenceDate, hour, minute) {
  return new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate(),
    hour,
    minute,
    0,
    0
  );
}

function getRangeFromQuery(type, year, month) {
  const now = new Date();

  if (type === 'weekly') {
    const current = startOfDay(now);
    const day = current.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const start = new Date(current);
    start.setDate(current.getDate() + diffToMonday);
    const end = endOfDay(new Date(start));
    end.setDate(start.getDate() + 6);
    return { start, end, label: `${start.toLocaleDateString()} - ${end.toLocaleDateString()}` };
  }

  if (type === 'yearly') {
    const parsedYear = parseInt(year, 10);
    return {
      start: new Date(parsedYear, 0, 1, 0, 0, 0, 0),
      end: new Date(parsedYear, 11, 31, 23, 59, 59, 999),
      label: `Year ${parsedYear}`,
    };
  }

  const parsedYear = parseInt(year, 10);
  const parsedMonth = parseInt(month, 10);
  return {
    start: new Date(parsedYear, parsedMonth - 1, 1, 0, 0, 0, 0),
    end: new Date(parsedYear, parsedMonth, 0, 23, 59, 59, 999),
    label: `${new Date(parsedYear, parsedMonth - 1, 1).toLocaleString('default', { month: 'long' })} ${parsedYear}`,
  };
}

function getWorkingDates(rangeStart, rangeEnd) {
  const dates = [];
  const cursor = new Date(rangeStart);
  while (cursor <= rangeEnd) {
    if (!isWeekend(cursor)) {
      dates.push(new Date(cursor));
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

function resolveAttendanceStatus(record, leaveForDay) {
  if (leaveForDay) {
    return {
      status: 'Leave',
      isLate: false,
      workingHours: 0,
      productive: false,
      leaveType: leaveForDay.leaveType,
    };
  }

  if (!record) {
    return {
      status: 'Absent',
      isLate: false,
      workingHours: 0,
      productive: false,
      leaveType: null,
    };
  }

  if (!record.checkInTime) {
    const rawStatus = record.status || 'Absent';
    const normalizedStatus = rawStatus === 'On Leave' ? 'Leave' : rawStatus === 'Half-day' ? 'Half Day' : rawStatus;
    const isLate = typeof record.isLate === 'boolean' ? record.isLate : normalizedStatus === 'Late';
    const workingHours = Number(record.workingHours ?? record.workHours ?? 0);

    return {
      status: normalizedStatus,
      isLate,
      workingHours,
      productive: workingHours >= 8,
      leaveType: normalizedStatus === 'Leave' ? record.leaveType || null : null,
    };
  }

  const checkInTime = new Date(record.checkInTime);
  const checkOutTime = record.checkOutTime ? new Date(record.checkOutTime) : null;
  const officeStart = getOfficeBoundary(checkInTime, OFFICE_START_HOUR, OFFICE_START_MIN);
  const officeEnd = getOfficeBoundary(checkInTime, OFFICE_END_HOUR, OFFICE_END_MIN);
  const isLate = typeof record.isLate === 'boolean' ? record.isLate : checkInTime > officeStart;
  const workingHours = Number(record.workingHours ?? record.workHours ?? (checkOutTime ? ((checkOutTime - checkInTime) / (1000 * 60 * 60)).toFixed(2) : 0));

  if (checkOutTime && checkOutTime < officeEnd) {
    return {
      status: 'Half Day',
      isLate,
      workingHours,
      productive: workingHours >= 8,
      leaveType: null,
    };
  }

  return {
    status: 'Present',
    isLate,
    workingHours,
    productive: workingHours >= 8,
    leaveType: null,
  };
}

function buildAttendanceLookup(records) {
  return records.reduce((lookup, record) => {
    const employeeId = String(record.userId?._id || record.userId);
    if (!lookup.has(employeeId)) {
      lookup.set(employeeId, new Map());
    }
    lookup.get(employeeId).set(getDateKey(record.date), record);
    return lookup;
  }, new Map());
}

function buildLeaveLookup(leaves) {
  const lookup = new Map();

  leaves.forEach((leave) => {
    const employeeId = String(leave.userId?._id || leave.userId);
    if (!lookup.has(employeeId)) {
      lookup.set(employeeId, new Map());
    }

    const leaveStart = startOfDay(leave.startDate);
    const leaveEnd = endOfDay(leave.endDate);
    const cursor = new Date(leaveStart);
    while (cursor <= leaveEnd) {
      if (!isWeekend(cursor)) {
        lookup.get(employeeId).set(getDateKey(cursor), leave);
      }
      cursor.setDate(cursor.getDate() + 1);
    }
  });

  return lookup;
}

async function getScopedEmployees(req, requestedUserId) {
  if (req.user.role === 'employee') {
    return User.find({ _id: req.user.userId, role: 'employee' }).select('_id name email');
  }

  const filter = requestedUserId ? { _id: requestedUserId, role: 'employee' } : { role: 'employee' };
  return User.find(filter).select('_id name email');
}

async function buildAttendanceAnalyticsPayload({ type, range, employees, attendanceRecords, approvedLeaves }) {
  const workingDates = getWorkingDates(range.start, range.end);
  const now = new Date();
  const trendReferenceDate = startOfDay(range.end < now ? range.end : now);
  const rangeIncludesToday = trendReferenceDate >= startOfDay(range.start) && trendReferenceDate <= endOfDay(range.end);
  const liveTodayStats = rangeIncludesToday ? await calculateDailyAttendanceStats(trendReferenceDate) : null;
  const liveTodayCutoff = liveTodayStats ? getCutoffTime(trendReferenceDate) : null;
  const useFinalizedTodayAbsent = liveTodayStats ? now >= liveTodayCutoff : false;
  const attendanceLookup = buildAttendanceLookup(attendanceRecords);
  const leaveLookup = buildLeaveLookup(approvedLeaves);
  const employeeRows = employees.map((employee) => {
    const employeeId = String(employee._id);
    const dailyRecords = workingDates.map((date) => {
      const key = getDateKey(date);
      const attendanceRecord = attendanceLookup.get(employeeId)?.get(key);
      const leaveForDay = leaveLookup.get(employeeId)?.get(key);
      const resolved = resolveAttendanceStatus(attendanceRecord, leaveForDay);

      return {
        date,
        checkInTime: attendanceRecord?.checkInTime || null,
        checkOutTime: attendanceRecord?.checkOutTime || null,
        workingHours: resolved.workingHours,
        status: resolved.status,
        isLate: resolved.isLate,
        leaveType: resolved.leaveType,
        productive: resolved.productive,
      };
    });

    const presentDays = dailyRecords.filter((record) => record.status === 'Present').length;
    const absentDays = dailyRecords.filter((record) => record.status === 'Absent').length;
    const leaveDays = dailyRecords.filter((record) => record.status === 'Leave').length;
    const halfDays = dailyRecords.filter((record) => record.status === 'Half Day').length;
    const lateCount = dailyRecords.filter((record) => record.status === 'Late' || record.isLate).length;
    const totalWorkingDays = workingDates.length;
    const workingHoursTotal = Number(dailyRecords.reduce((sum, record) => sum + record.workingHours, 0).toFixed(2));
    const attendancePercentage = totalWorkingDays ? Number(((presentDays / totalWorkingDays) * 100).toFixed(1)) : 0;
    const score = attendancePercentage;
    const productiveDays = dailyRecords.filter((record) => record.productive).length;

    return {
      employee: {
        id: employee._id,
        name: employee.name,
        email: employee.email,
      },
      presentDays,
      absentDays,
      leaveDays,
      halfDays,
      lateCount,
      totalWorkingDays,
      attendancePercentage,
      score,
      workingHoursTotal,
      productiveDays,
      records: dailyRecords,
    };
  }).sort((left, right) => right.attendancePercentage - left.attendancePercentage || left.employee.name.localeCompare(right.employee.name));

  const rankedRows = employeeRows.map((row, index) => ({ ...row, rank: index + 1 }));
  const totalEmployees = rankedRows.length;
  const totalPresentDays = rankedRows.reduce((sum, row) => sum + row.presentDays, 0);
  const lateCount = rankedRows.reduce((sum, row) => sum + row.lateCount, 0);
  const avgAttendance = totalEmployees
    ? Number((rankedRows.reduce((sum, row) => sum + row.attendancePercentage, 0) / totalEmployees).toFixed(1))
    : 0;
  const bestAttendanceEmployee = rankedRows[0] || null;
  const lowAttendanceEmployees = rankedRows.filter((row) => row.attendancePercentage < 75);
  const breakdown = rankedRows.reduce(
    (accumulator, row) => ({
      present: accumulator.present + row.presentDays,
      absent: accumulator.absent + row.absentDays,
      leave: accumulator.leave + row.leaveDays,
    }),
    { present: 0, absent: 0, leave: 0 }
  );

  const todayKey = getDateKey(trendReferenceDate);
  const todayRows = rankedRows.map((row) => row.records.find((record) => getDateKey(record.date) === todayKey)).filter(Boolean);
  const savedPresentToday = todayRows.filter((row) => row.status === 'Present').length;
  const savedOnLeaveToday = todayRows.filter((row) => row.status === 'Leave').length;
  const savedAbsentToday = Math.max(totalEmployees - savedPresentToday - savedOnLeaveToday, 0);
  const savedAttendancePercentageToday = totalEmployees ? Number(((savedPresentToday / totalEmployees) * 100).toFixed(1)) : 0;
  const presentToday = liveTodayStats ? liveTodayStats.presentToday : savedPresentToday;
  const onLeaveToday = liveTodayStats ? liveTodayStats.onLeave : savedOnLeaveToday;
  const absentToday = liveTodayStats
    ? (useFinalizedTodayAbsent ? liveTodayStats.absentToday : liveTodayStats.yetToCheckIn)
    : savedAbsentToday;
  const attendancePercentageToday = liveTodayStats ? liveTodayStats.attendancePercent : savedAttendancePercentageToday;
  const currentDayTrend = {
    label: trendReferenceDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    date: trendReferenceDate,
    present: presentToday,
    total: liveTodayStats ? liveTodayStats.totalEmployees : totalEmployees,
    attendancePercentage: attendancePercentageToday,
  };

  let dailyTrend;
  if (type === 'yearly') {
    dailyTrend = Array.from({ length: 12 }, (_, index) => {
      const monthRecords = rankedRows.flatMap((row) => row.records).filter((record) => new Date(record.date).getMonth() === index);
      const uniqueDays = new Set(monthRecords.map((record) => getDateKey(record.date))).size || 1;
      const totalSlots = totalEmployees * uniqueDays;
      const presentCount = monthRecords.filter((record) => record.status === 'Present').length;
      return {
        label: new Date(range.start.getFullYear(), index, 1).toLocaleString('default', { month: 'short' }),
        present: presentCount,
        total: totalSlots,
        attendancePercentage: totalSlots ? Number(((presentCount / totalSlots) * 100).toFixed(1)) : 0,
      };
    });
  } else {
    dailyTrend = workingDates.map((date) => {
      const key = getDateKey(date);
      const dayRecords = rankedRows.map((row) => row.records.find((record) => getDateKey(record.date) === key)).filter(Boolean);
      const isCurrentWorkingDay = liveTodayStats && getDateKey(date) === getDateKey(trendReferenceDate);
      const present = isCurrentWorkingDay
        ? liveTodayStats.presentToday
        : dayRecords.filter((record) => record.status === 'Present').length;
      const absent = isCurrentWorkingDay
        ? (useFinalizedTodayAbsent ? liveTodayStats.absentToday : liveTodayStats.yetToCheckIn)
        : dayRecords.filter((record) => record.status === 'Absent').length;
      const leave = isCurrentWorkingDay
        ? liveTodayStats.onLeave
        : dayRecords.filter((record) => record.status === 'Leave').length;
      const total = isCurrentWorkingDay ? liveTodayStats.totalEmployees : totalEmployees;
      return {
        label: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        date,
        present,
        absent,
        leave,
        total,
        attendancePercentage: total ? Number(((present / total) * 100).toFixed(1)) : 0,
      };
    });
  }

  return {
    period: {
      type,
      start: range.start,
      end: range.end,
      label: range.label,
      totalWorkingDays: workingDates.length,
      weekendDays: Math.max(Math.ceil((range.end - range.start) / (1000 * 60 * 60 * 24)) + 1 - workingDates.length, 0),
      holidayDays: 0,
    },
    summary: {
      totalEmployees,
      presentToday,
      absentToday,
      onLeaveToday,
      attendancePercentageToday,
      avgAttendance,
      totalPresentDays,
      lateCount,
      bestAttendanceEmployee,
      lowAttendanceEmployees,
    },
    breakdown,
    currentDayTrend,
    ranking: rankedRows,
    dailyTrend,
    employeeRows: rankedRows,
  };
}

function buildLeavePayload({ range, leaves }) {
  const rows = leaves
    .sort((left, right) => new Date(right.appliedAt || right.createdAt) - new Date(left.appliedAt || left.createdAt))
    .map((leave) => ({
      id: leave._id,
      employee: {
        id: leave.userId?._id,
        name: leave.userId?.name || 'Employee',
        email: leave.userId?.email || '',
      },
      leaveType: leave.leaveType,
      fromDate: leave.startDate,
      toDate: leave.endDate,
      totalDays: leave.totalDays,
      status: leave.status,
      appliedAt: leave.appliedAt || leave.createdAt,
    }));

  const summary = {
    totalLeaves: rows.length,
    approvedLeaves: rows.filter((leave) => leave.status === 'Approved').length,
    pendingLeaves: rows.filter((leave) => leave.status === 'Pending').length,
    rejectedLeaves: rows.filter((leave) => leave.status === 'Rejected').length,
  };

  const ranking = Object.values(rows.reduce((accumulator, leave) => {
    const employeeId = String(leave.employee.id);
    if (!accumulator[employeeId]) {
      accumulator[employeeId] = {
        employee: leave.employee,
        totalLeaves: 0,
        approvedLeaves: 0,
        pendingLeaves: 0,
        rejectedLeaves: 0,
      };
    }
    accumulator[employeeId].totalLeaves += 1;
    if (leave.status === 'Approved') accumulator[employeeId].approvedLeaves += 1;
    if (leave.status === 'Pending') accumulator[employeeId].pendingLeaves += 1;
    if (leave.status === 'Rejected') accumulator[employeeId].rejectedLeaves += 1;
    return accumulator;
  }, {})).sort((left, right) => right.totalLeaves - left.totalLeaves || left.employee.name.localeCompare(right.employee.name));

  return {
    period: {
      start: range.start,
      end: range.end,
      label: range.label,
    },
    summary: {
      ...summary,
      mostLeavesEmployee: ranking[0] || null,
    },
    ranking,
    rows,
  };
}

async function getReportData(req) {
  const type = req.query.type || 'monthly';
  const requestedUserId = req.query.userId;

  if ((type === 'monthly' || type === 'yearly') && !req.query.year) {
    throw new Error('Year is required');
  }
  if (type === 'monthly' && !req.query.month) {
    throw new Error('Month is required');
  }

  const range = getRangeFromQuery(type, req.query.year || new Date().getFullYear(), req.query.month || new Date().getMonth() + 1);
  const employees = await getScopedEmployees(req, requestedUserId);
  const employeeIds = employees.map((employee) => employee._id);

  const [attendanceRecords, approvedLeaves, allLeaves] = await Promise.all([
    Attendance.find({ userId: { $in: employeeIds }, date: { $gte: range.start, $lte: range.end } })
      .populate('userId', 'name email')
      .sort({ date: 1 }),
    Leave.find({ userId: { $in: employeeIds }, status: 'Approved', startDate: { $lte: range.end }, endDate: { $gte: range.start } })
      .populate('userId', 'name email'),
    Leave.find({ userId: { $in: employeeIds }, startDate: { $lte: range.end }, endDate: { $gte: range.start } })
      .populate('userId', 'name email')
      .sort({ appliedAt: -1 }),
  ]);

  return {
    type,
    range,
    employees,
    attendanceRecords,
    approvedLeaves,
    allLeaves,
  };
}

exports.getAttendanceAnalytics = async (req, res) => {
  try {
    const reportData = await getReportData(req);
    const attendancePayload = await buildAttendanceAnalyticsPayload({
      type: reportData.type,
      range: reportData.range,
      employees: reportData.employees,
      attendanceRecords: reportData.attendanceRecords,
      approvedLeaves: reportData.approvedLeaves,
    });

    res.json(attendancePayload);
  } catch (error) {
    const status = error.message.includes('required') ? 400 : 500;
    res.status(status).json({ message: error.message || 'Server error', error: error.message });
  }
};

exports.getLeaveReport = async (req, res) => {
  try {
    const reportData = await getReportData(req);
    res.json(buildLeavePayload({ range: reportData.range, leaves: reportData.allLeaves }));
  } catch (error) {
    const status = error.message.includes('required') ? 400 : 500;
    res.status(status).json({ message: error.message || 'Server error', error: error.message });
  }
};

exports.getSummaryAnalytics = async (req, res) => {
  try {
    const reportData = await getReportData(req);
    const attendancePayload = await buildAttendanceAnalyticsPayload({
      type: reportData.type,
      range: reportData.range,
      employees: reportData.employees,
      attendanceRecords: reportData.attendanceRecords,
      approvedLeaves: reportData.approvedLeaves,
    });
    const leavePayload = buildLeavePayload({ range: reportData.range, leaves: reportData.allLeaves });

    res.json({
      period: attendancePayload.period,
      summary: {
        totalEmployees: attendancePayload.summary.totalEmployees,
        avgAttendance: attendancePayload.summary.avgAttendance,
        totalPresentDays: attendancePayload.summary.totalPresentDays,
        lateCount: attendancePayload.summary.lateCount,
        bestAttendanceEmployee: attendancePayload.summary.bestAttendanceEmployee,
        lowAttendanceEmployees: attendancePayload.summary.lowAttendanceEmployees,
        mostLeavesEmployee: leavePayload.summary.mostLeavesEmployee,
        presentAbsentLeaveBreakdown: attendancePayload.breakdown,
      },
      ranking: attendancePayload.ranking,
      trend: attendancePayload.dailyTrend,
    });
  } catch (error) {
    const status = error.message.includes('required') ? 400 : 500;
    res.status(status).json({ message: error.message || 'Server error', error: error.message });
  }
};

exports.getMonthlyReport = async (req, res) => {
  req.query.type = 'monthly';
  return exports.getAttendanceAnalytics(req, res);
};

exports.getYearlyReport = async (req, res) => {
  req.query.type = 'yearly';
  return exports.getAttendanceAnalytics(req, res);
};