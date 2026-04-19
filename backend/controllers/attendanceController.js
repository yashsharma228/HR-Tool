const Attendance = require('../models/Attendance');
const { sendEmail, sendAdminAttendanceNotification } = require('../utils/emailService');

// Office hours config
const OFFICE_START_HOUR = 10;
const OFFICE_START_MIN = 0;
const OFFICE_END_HOUR = 18;
const OFFICE_END_MIN = 0;

// Employee: Check-in
exports.checkIn = async (req, res) => {
  const userId = req.user.userId;
  const today = new Date();
  today.setHours(0,0,0,0);

  // Prevent double check-in
  let attendance = await Attendance.findOne({ userId, date: today });
  if (attendance && attendance.checkInTime) {
    return res.status(400).json({ message: 'Already checked in today' });
  }

  if (!attendance) {
    attendance = new Attendance({ userId, date: today });
  }
  attendance.checkInTime = new Date();

  // Office start time
  const officeStart = new Date();
  officeStart.setHours(OFFICE_START_HOUR, OFFICE_START_MIN, 0, 0);

  // Status logic
  if (attendance.checkInTime > officeStart) {
    attendance.status = "Late";
  } else {
    attendance.status = "Present";
  }

  await attendance.save();

  // Send admin notification on check-in
  try {
    const User = require('../models/User');
    const user = await User.findById(userId);
    if (user) {
      const { sendAdminAttendanceNotification } = require('../utils/emailService');
      sendAdminAttendanceNotification(user, attendance).catch(() => {});
    }
  } catch {}

  res.json(attendance);
};

// Employee: Check-out
exports.checkOut = async (req, res) => {
  const userId = req.user.userId;
  const today = new Date();
  today.setHours(0,0,0,0);

  let attendance = await Attendance.findOne({ userId, date: today });
  if (!attendance || !attendance.checkInTime) {
    return res.status(400).json({ message: 'Check-in required first' });
  }
  if (attendance.checkOutTime) {
    return res.status(400).json({ message: 'Already checked out today' });
  }

  attendance.checkOutTime = new Date();

  // Office end time
  const officeEnd = new Date();
  officeEnd.setHours(OFFICE_END_HOUR, OFFICE_END_MIN, 0, 0);

  // Status priority: Half Day > Late > Present
  if (attendance.checkOutTime < officeEnd) {
    attendance.status = "Half Day";
  } else if (attendance.checkInTime > new Date().setHours(OFFICE_START_HOUR, OFFICE_START_MIN, 0, 0)) {
    attendance.status = "Late";
  } else {
    attendance.status = "Present";
  }

  // Work hours
  attendance.workHours = ((attendance.checkOutTime - attendance.checkInTime) / (1000 * 60 * 60)).toFixed(2);

  await attendance.save();

  // Send admin notification on check-out
  try {
    const User = require('../models/User');
    const user = await User.findById(userId);
    if (user) {
      const { sendAdminAttendanceNotification } = require('../utils/emailService');
      sendAdminAttendanceNotification(user, attendance).catch(() => {});
    }
  } catch {}

  res.json(attendance);
};

// Employee: View own attendance
exports.getMyAttendance = async (req, res) => {
  const records = await Attendance.find({ userId: req.user.userId }).sort({ date: -1 });
  res.json(records);
};

// Admin: View all attendance (with pagination & filters)
exports.getAllAttendance = async (req, res) => {
  try {
    const { page = 1, limit = 10, userId, startDate, endDate } = req.query;
    const filter = {};

    if (userId) filter.userId = userId;
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    const total = await Attendance.countDocuments(filter);
    const records = await Attendance.find(filter)
      .populate('userId', 'name email role')
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({
      data: records,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
