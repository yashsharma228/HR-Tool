const Attendance = require('../models/Attendance');
const { sendEmail, sendAdminAttendanceNotification } = require('../utils/emailService');

// Employee: Mark attendance
exports.markAttendance = async (req, res) => {
  const { status, date } = req.body;
  if (!['Present', 'Absent'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status' });
  }

  const recordDate = date ? new Date(date) : new Date();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Prevent marking future attendance
  if (recordDate > today) {
    return res.status(400).json({ message: 'Cannot mark future attendance' });
  }

  // Only one attendance per day
  const existing = await Attendance.findOne({ userId: req.user.userId, date: recordDate });
  if (existing) return res.status(400).json({ message: 'Attendance already marked for selected date' });

  const attendance = await Attendance.create({
    userId: req.user.userId,
    date: recordDate,
    status,
  });

  // Send email notifications asynchronously to improve performance
  try {
    const User = require('../models/User');
    const user = await User.findById(req.user.userId);
    if (user) {
      // Notify Employee (Attendance Confirmation) (non-blocking)
      sendEmail({
        to: user.email,
        subject: `Attendance Confirmation - ${recordDate.toDateString()}`,
        text: `Dear ${user.name},\n\nYour attendance for ${recordDate.toDateString()} has been recorded as: ${status}.\n\nThank you,\nHR Tool Team`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; color: #1e293b;">
            <h2 style="color: #0ea5e9;">Attendance Recorded</h2>
            <p>Dear <strong>${user.name}</strong>,</p>
            <p>Your attendance for <strong>${recordDate.toDateString()}</strong> has been successfully recorded.</p>
            <div style="background-color: #f0f9ff; padding: 15px; border-radius: 8px; border-left: 4px solid #0ea5e9; text-align: center;">
              <p style="margin: 0; color: #64748b; font-size: 14px;">Status</p>
              <p style="margin: 5px 0; font-size: 20px; font-weight: bold; color: ${status === 'Present' ? '#10b981' : '#ef4444'};">${status}</p>
            </div>
            <p style="margin-top: 20px;">Best regards,<br/><strong>HR Team</strong></p>
          </div>
        `
      }).catch(err => console.error('Failed to send attendance confirmation email:', err.message));

      // Notify Admin (non-blocking)
      sendAdminAttendanceNotification(user, attendance).catch(err => 
        console.error('Failed to send admin attendance notification:', err.message)
      );
    }
  } catch (e) {
    console.error('Error initiating attendance emails:', e.message);
  }
  res.status(201).json(attendance);
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
