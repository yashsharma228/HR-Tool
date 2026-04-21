// Professional admin dashboard stats endpoint
const DailyAttendanceSummary = require('../models/DailyAttendanceSummary');
const { calculateDailyAttendanceStats, getCutoffTime, getDayBounds } = require('../utils/attendanceSummary');

// GET /admin/dashboard-stats
exports.getDashboardStats = async (req, res) => {
  try {
    const now = new Date();
    const todayStats = await calculateDailyAttendanceStats(now);
    const cutoffTime = getCutoffTime(now);
    const { start } = getDayBounds(now);
    const finalizedSummary = await DailyAttendanceSummary.findOne({ date: start }).lean();
    const useFinalizedSummary = now >= cutoffTime && finalizedSummary;

    const totalEmployees = useFinalizedSummary ? finalizedSummary.totalEmployees : todayStats.totalEmployees;
    const presentToday = useFinalizedSummary ? finalizedSummary.present : todayStats.presentToday;
    const onLeave = useFinalizedSummary ? finalizedSummary.onLeave : todayStats.onLeave;
    const attendanceRecordsToday = useFinalizedSummary ? finalizedSummary.attendanceRecordsToday : todayStats.attendanceRecordsToday;
    const attendancePercent = useFinalizedSummary ? finalizedSummary.attendancePercent : todayStats.attendancePercent;
    const absentToday = useFinalizedSummary ? finalizedSummary.absent : todayStats.absentToday;
    const yetToCheckIn = useFinalizedSummary ? finalizedSummary.yetToCheckIn : todayStats.yetToCheckIn;
    const lateEmployees = useFinalizedSummary ? finalizedSummary.lateEmployees : todayStats.lateEmployees;
    const halfDay = useFinalizedSummary ? finalizedSummary.halfDay : todayStats.halfDay;

    res.json({
      totalEmployees,
      presentToday,
      absentToday,
      yetToCheckIn,
      onLeave,
      attendanceRecordsToday,
      presentMarked: presentToday,
      attendancePercent,
      lateEmployees,
      halfDay,
      isFinalized: Boolean(useFinalizedSummary),
      cutoffTime,
      date: todayStats.date,
      lastUpdated: useFinalizedSummary ? finalizedSummary.finalizedAt : todayStats.lastUpdated,
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch dashboard stats', error: err.message });
  }
};
