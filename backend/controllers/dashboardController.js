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

    // 2. Present Today (status = 'Present')
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

    // 5. Attendance Records (all attendance entries for today)
    const attendanceRecords = await Attendance.countDocuments({
      date: { $gte: today, $lt: tomorrow },
    });

    // 6. Present Marked (anyone who checked in today)
    const presentMarked = await Attendance.countDocuments({
      date: { $gte: today, $lt: tomorrow },
      checkInTime: { $ne: null },
    });

    // 3. Absent Today (Total Employees - Present Today - On Leave)
    const absentToday = totalEmployees - presentToday - onLeave;

    // Attendance %
    const attendancePercent = totalEmployees > 0 ? ((presentToday / totalEmployees) * 100).toFixed(1) : 0;

    res.json({
      totalEmployees,
      presentToday,
      absentToday,
      onLeave,
      attendanceRecords,
      presentMarked,
      attendancePercent,
      date: today,
      lastUpdated: new Date(),
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch dashboard stats', error: err.message });
  }
};
