const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

jest.mock('../utils/emailService', () => ({
  sendAdminAttendanceNotification: jest.fn().mockResolvedValue({ success: true }),
  sendEmail: jest.fn().mockResolvedValue({ success: true }),
}));

const User = require('../models/User');
const Admin = require('../models/Admin');
const Attendance = require('../models/Attendance');
const Notification = require('../models/Notification');
const attendanceController = require('../controllers/attendanceController');
const authMiddleware = require('../middleware/auth');

const app = express();
app.use(express.json());

app.post('/api/attendance/check-in', authMiddleware, async (req, res) => {
  req.user = { userId: req.headers['x-user-id'], role: 'employee' };
  await attendanceController.checkIn(req, res);
});

describe('Attendance Controller', () => {
  let employee;
  let admin;
  let userToken;

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGO_URI);
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await Admin.deleteMany({});
    await Attendance.deleteMany({});
    await Notification.deleteMany({});

    employee = await User.create({
      name: 'Employee',
      email: 'employee@example.com',
      password: await bcrypt.hash('password123', 10),
      role: 'employee',
      dateOfJoining: new Date(),
      leaveBalance: 20,
    });

    admin = await Admin.create({
      name: 'Admin',
      email: 'admin@example.com',
      password: await bcrypt.hash('adminpass123', 10),
      role: 'admin',
      dateOfJoining: new Date(),
    });

    userToken = jwt.sign({ userId: employee._id, role: employee.role }, process.env.JWT_SECRET);
  });

  it('creates an admin notification when an employee checks in', async () => {
    const res = await request(app)
      .post('/api/attendance/check-in')
      .set('Authorization', `Bearer ${userToken}`)
      .set('x-user-id', employee._id.toString());

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status');

    const adminNotification = await Notification.findOne({
      recipient: admin._id,
      type: 'attendance_checked_in',
    });

    expect(adminNotification).not.toBeNull();
    expect(adminNotification.title).toBe('Employee checked in');
    expect(adminNotification.message).toContain(employee.name);
  });
});