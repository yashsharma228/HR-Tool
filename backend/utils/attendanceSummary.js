const User = require('../models/User');
const Attendance = require('../models/Attendance');
const Leave = require('../models/Leave');
const DailyAttendanceSummary = require('../models/DailyAttendanceSummary');

const PRESENT_STATUSES = ['Present', 'Late', 'Half-day'];

const getDayBounds = (baseDate = new Date()) => {
  const start = new Date(baseDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
};

const getCutoffTime = (baseDate = new Date()) => {
  const cutoff = new Date(baseDate);
  cutoff.setHours(18, 0, 0, 0);
  return cutoff;
};

const calculateDailyAttendanceStats = async (baseDate = new Date()) => {
  const { start, end } = getDayBounds(baseDate);
  const cutoff = getCutoffTime(baseDate);

  const [
    totalEmployees,
    presentToday,
    onLeave,
    attendanceRecordsToday,
    lateEmployees,
    halfDay,
  ] = await Promise.all([
    User.countDocuments({ role: 'employee' }),
    Attendance.countDocuments({
      date: { $gte: start, $lt: end },
      status: { $in: PRESENT_STATUSES },
    }),
    Leave.countDocuments({
      status: 'Approved',
      startDate: { $lte: start },
      endDate: { $gte: start },
    }),
    Attendance.countDocuments({
      date: { $gte: start, $lt: end },
    }),
    Attendance.countDocuments({
      date: { $gte: start, $lt: end },
      checkInTime: { $gt: new Date(start.getFullYear(), start.getMonth(), start.getDate(), 10, 0, 0, 0) },
    }),
    Attendance.countDocuments({
      date: { $gte: start, $lt: end },
      checkOutTime: { $lt: cutoff, $ne: null },
    }),
  ]);

  const yetToCheckIn = Math.max(totalEmployees - presentToday - onLeave, 0);
  const attendancePercent = totalEmployees > 0
    ? Number(((presentToday / totalEmployees) * 100).toFixed(1))
    : 0;

  return {
    date: start,
    totalEmployees,
    presentToday,
    absentToday: yetToCheckIn,
    yetToCheckIn,
    onLeave,
    attendanceRecordsToday,
    presentMarked: presentToday,
    attendancePercent,
    lateEmployees,
    halfDay,
    cutoffTime: cutoff,
    lastUpdated: new Date(),
  };
};

const upsertDailyAttendanceSummary = async (baseDate = new Date()) => {
  const stats = await calculateDailyAttendanceStats(baseDate);
  const finalizedAt = new Date();

  const summary = await DailyAttendanceSummary.findOneAndUpdate(
    { date: stats.date },
    {
      date: stats.date,
      totalEmployees: stats.totalEmployees,
      present: stats.presentToday,
      absent: stats.absentToday,
      onLeave: stats.onLeave,
      yetToCheckIn: stats.yetToCheckIn,
      attendancePercent: stats.attendancePercent,
      attendanceRecordsToday: stats.attendanceRecordsToday,
      lateEmployees: stats.lateEmployees,
      halfDay: stats.halfDay,
      finalizedAt,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return { stats, summary };
};

module.exports = {
  PRESENT_STATUSES,
  getDayBounds,
  getCutoffTime,
  calculateDailyAttendanceStats,
  upsertDailyAttendanceSummary,
};