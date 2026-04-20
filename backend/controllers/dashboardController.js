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

    // 1. Total Employees (all employees)
    const totalEmployees = await User.countDocuments({ role: 'employee' });

    // 2. Present Today (strictly status === Present for today)
    const presentToday = await Attendance.countDocuments({
      date: { $gte: today, $lt: tomorrow },
      status: 'Present',
    });

    // 4. On Leave (approved leave for today)
    const onLeave = await Leave.countDocuments({
      status: 'Approved',
      startDate: { $lte: today },
      endDate: { $gte: today },
    });

    // 5. Attendance Records Today (all attendance entries for today)
    const attendanceRecordsToday = await Attendance.countDocuments({
      date: { $gte: today, $lt: tomorrow },
    });

    // Keep this value aligned with Present Today to avoid dashboard mismatches.
    const presentMarked = presentToday;

    // 3. Absent Today (Total Employees - Present Today - On Leave)
    const absentToday = Math.max(totalEmployees - presentToday - onLeave, 0);

    // Attendance %
    const attendancePercent = totalEmployees > 0
      ? Math.round((presentToday / totalEmployees) * 100)
      : 0;

    res.json({
      totalEmployees,
      presentToday,
      absentToday,
      onLeave,
      attendanceRecordsToday,
      presentMarked,
      attendancePercent,
      date: today,
      lastUpdated: new Date(),
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch dashboard stats', error: err.message });
  }
};
