const mongoose = require('mongoose');

const dailyAttendanceSummarySchema = new mongoose.Schema({
  date: { type: Date, required: true, unique: true },
  totalEmployees: { type: Number, required: true },
  present: { type: Number, required: true },
  absent: { type: Number, required: true },
  onLeave: { type: Number, required: true },
  yetToCheckIn: { type: Number, required: true },
  attendancePercent: { type: Number, required: true },
  attendanceRecordsToday: { type: Number, required: true },
  lateEmployees: { type: Number, required: true },
  halfDay: { type: Number, required: true },
  finalizedAt: { type: Date, required: true },
}, { timestamps: true });

module.exports = mongoose.model('DailyAttendanceSummary', dailyAttendanceSummarySchema);