// Professional admin dashboard stats endpoint
const User = require('../models/User');
const Attendance = require('../models/Attendance');
const Leave = require('../models/Leave');

// GET /admin/dashboard-stats
exports.getDashboardStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    // 1. Total Employees
    const totalEmployees = await User.countDocuments({ role: 'employee' });

    // Count employees who are present in any working state.
    const presentStatuses = ['Present', 'Late', 'Half-day'];

    // 2. Present Today
    const presentToday = await Attendance.countDocuments({
      date: { $gte: today, $lt: tomorrow },
      status: { $in: presentStatuses },
    });

    // 3. On Leave (approved leave for today)
    const onLeave = await Leave.countDocuments({
      status: 'Approved',
      startDate: { $lte: today },
      endDate: { $gte: today },
    });

    // 4. Attendance Records (Today)
    const attendanceRecordsToday = await Attendance.countDocuments({
      date: { $gte: today, $lt: tomorrow },
    });

    // 5. Present Marked
    const presentMarked = presentToday;

    // 6. Attendance %
    const attendancePercent = totalEmployees > 0
      ? ((presentToday / totalEmployees) * 100).toFixed(1)
      : 0;

    // 7. Absent Today
    const absentToday = Math.max(totalEmployees - presentToday - onLeave, 0);

    // 8. Late Employees (checkInTime > 10:00 AM)
    const lateEmployees = await Attendance.countDocuments({
      date: { $gte: today, $lt: tomorrow },
      checkInTime: { $gt: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 10, 0, 0, 0) }
    });

    // 9. Half Day (checkOutTime < 6:00 PM)
    const halfDay = await Attendance.countDocuments({
      date: { $gte: today, $lt: tomorrow },
      checkOutTime: { $lt: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 18, 0, 0, 0), $ne: null }
    });

    res.json({
      totalEmployees,
      presentToday,
      absentToday,
      onLeave,
      attendanceRecordsToday,
      presentMarked,
      attendancePercent,
      lateEmployees,
      halfDay,
      date: today,
      lastUpdated: new Date(),
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch dashboard stats', error: err.message });
  }
};
