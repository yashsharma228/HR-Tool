const mongoose = require('mongoose');


const attendanceSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, required: true },
  checkInTime: { type: Date },
  checkOutTime: { type: Date },
  workingHours: { type: Number, default: 0 },
  workHours: { type: Number }, // in hours
  status: { type: String, enum: ['Present', 'Absent', 'Late', 'Half-day', 'On Leave', 'Leave'], default: 'Absent' },
  isLate: { type: Boolean, default: false },
  isManualEntry: { type: Boolean, default: false },
  notes: { type: String },
}, { timestamps: true });

attendanceSchema.index({ userId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
