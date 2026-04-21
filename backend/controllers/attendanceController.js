const Attendance = require('../models/Attendance');
const User = require('../models/User');
const { sendAdminAttendanceNotification } = require('../utils/emailService');
const { createNotification, notifyAdmins } = require('../utils/notificationService');

const OFFICE_START_HOUR = 10;
const OFFICE_START_MIN = 0;
const OFFICE_END_HOUR = 18;
const OFFICE_END_MIN = 0;

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

function deriveAttendanceState({ checkInTime, checkOutTime, hasApprovedLeave = false }) {
  if (hasApprovedLeave) {
    return { status: 'Leave', isLate: false, workingHours: 0 };
  }

  if (!checkInTime) {
    return { status: 'Absent', isLate: false, workingHours: 0 };
  }

  const officeStart = getOfficeBoundary(checkInTime, OFFICE_START_HOUR, OFFICE_START_MIN);
  const officeEnd = getOfficeBoundary(checkInTime, OFFICE_END_HOUR, OFFICE_END_MIN);
  const isLate = checkInTime > officeStart;
  const workingHours = checkOutTime
    ? Number(((checkOutTime - checkInTime) / (1000 * 60 * 60)).toFixed(2))
    : 0;

  if (checkOutTime && checkOutTime < officeEnd) {
    return { status: 'Half-day', isLate, workingHours };
  }

  return { status: 'Present', isLate, workingHours };
}

function applyAttendanceState(attendance) {
  const state = deriveAttendanceState({
    checkInTime: attendance.checkInTime,
    checkOutTime: attendance.checkOutTime,
  });

  attendance.status = state.status;
  attendance.isLate = state.isLate;
  attendance.workingHours = state.workingHours;
  attendance.workHours = state.workingHours;
}

exports.adminCheckIn = async (req, res) => {
  const { userId } = req.params;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let attendance = await Attendance.findOne({ userId, date: today });
  if (attendance && attendance.checkInTime) {
    return res.status(400).json({ message: 'Already checked in today' });
  }

  if (!attendance) {
    attendance = new Attendance({ userId, date: today });
  }

  attendance.checkInTime = new Date();
  attendance.isManualEntry = true;
  applyAttendanceState(attendance);
  await attendance.save();

  try {
    const employee = await User.findById(userId);
    if (employee) {
      createNotification({
        recipientId: employee._id,
        actorId: req.user.userId,
        type: 'attendance_checked_in_by_admin',
        title: 'Attendance updated by admin',
        message: 'An admin checked you in for today.',
        link: '/employee',
        metadata: { attendanceId: attendance._id, status: attendance.status },
      }).catch(() => {});
    }
  } catch {}

  res.json(attendance);
};

exports.adminCheckOut = async (req, res) => {
  const { userId } = req.params;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let attendance = await Attendance.findOne({ userId, date: today });
  if (!attendance || !attendance.checkInTime) {
    return res.status(400).json({ message: 'Check-in required first' });
  }
  if (attendance.checkOutTime) {
    return res.status(400).json({ message: 'Already checked out today' });
  }

  attendance.checkOutTime = new Date();
  attendance.isManualEntry = true;
  applyAttendanceState(attendance);
  await attendance.save();

  try {
    const employee = await User.findById(userId);
    if (employee) {
      createNotification({
        recipientId: employee._id,
        actorId: req.user.userId,
        type: 'attendance_checked_out_by_admin',
        title: 'Attendance updated by admin',
        message: 'An admin checked you out for today.',
        link: '/employee',
        metadata: { attendanceId: attendance._id, status: attendance.status },
      }).catch(() => {});
    }
  } catch {}

  res.json(attendance);
};

exports.checkIn = async (req, res) => {
  const userId = req.user.userId;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let attendance = await Attendance.findOne({ userId, date: today });
  if (attendance && attendance.checkInTime) {
    return res.status(400).json({ message: 'Already checked in today' });
  }

  if (!attendance) {
    attendance = new Attendance({ userId, date: today });
  }

  attendance.checkInTime = new Date();
  applyAttendanceState(attendance);
  await attendance.save();

  try {
    const user = await User.findById(userId);
    if (user) {
      await notifyAdmins({
        actorId: user._id,
        type: 'attendance_checked_in',
        title: 'Employee checked in',
        message: `${user.name} checked in for today.`,
        link: '/admin',
        metadata: { attendanceId: attendance._id, status: attendance.status },
      });

      sendAdminAttendanceNotification(user, attendance).catch(() => {});
    }
  } catch {}

  res.json(attendance);
};

exports.checkOut = async (req, res) => {
  const userId = req.user.userId;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let attendance = await Attendance.findOne({ userId, date: today });
  if (!attendance || !attendance.checkInTime) {
    return res.status(400).json({ message: 'Check-in required first' });
  }
  if (attendance.checkOutTime) {
    return res.status(400).json({ message: 'Already checked out today' });
  }

  attendance.checkOutTime = new Date();
  applyAttendanceState(attendance);
  await attendance.save();

  try {
    const user = await User.findById(userId);
    if (user) {
      await notifyAdmins({
        actorId: user._id,
        type: 'attendance_checked_out',
        title: 'Employee checked out',
        message: `${user.name} checked out for today.`,
        link: '/admin',
        metadata: { attendanceId: attendance._id, status: attendance.status },
      });

      sendAdminAttendanceNotification(user, attendance).catch(() => {});
    }
  } catch {}

  res.json(attendance);
};

exports.getMyAttendance = async (req, res) => {
  const records = await Attendance.find({ userId: req.user.userId }).sort({ date: -1 });
  res.json(records);
};

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
      .limit(parseInt(limit, 10));

    res.json({
      data: records,
      pagination: {
        total,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
