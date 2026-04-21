const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const User = require('../models/User');
const Attendance = require('../models/Attendance');
const Leave = require('../models/Leave');

const reportRoutes = require('../routes/reportRoutes');

const app = express();
app.use(express.json());
app.use('/api/reports', reportRoutes);

function getCurrentWeekdays() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const day = today.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(today);
  monday.setDate(today.getDate() + diffToMonday);
  const tuesday = new Date(monday);
  tuesday.setDate(monday.getDate() + 1);
  return { monday, tuesday };
}

describe('Report Analytics', () => {
  let admin;
  let employeeOne;
  let employeeTwo;
  let adminToken;

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGO_URI);
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await Attendance.deleteMany({});
    await Leave.deleteMany({});

    admin = await User.create({
      name: 'Admin User',
      email: 'admin.report@example.com',
      password: await bcrypt.hash('password123', 10),
      role: 'admin',
      dateOfJoining: new Date(),
    });

    employeeOne = await User.create({
      name: 'Alice',
      email: 'alice@example.com',
      password: await bcrypt.hash('password123', 10),
      role: 'employee',
      dateOfJoining: new Date(),
      leaveBalance: 20,
    });

    employeeTwo = await User.create({
      name: 'Bob',
      email: 'bob@example.com',
      password: await bcrypt.hash('password123', 10),
      role: 'employee',
      dateOfJoining: new Date(),
      leaveBalance: 20,
    });

    adminToken = jwt.sign({ userId: admin._id, role: admin.role }, process.env.JWT_SECRET);

    const { monday, tuesday } = getCurrentWeekdays();

    await Attendance.create([
      {
        userId: employeeOne._id,
        date: monday,
        checkInTime: new Date(monday.getFullYear(), monday.getMonth(), monday.getDate(), 9, 55),
        checkOutTime: new Date(monday.getFullYear(), monday.getMonth(), monday.getDate(), 18, 5),
        status: 'Present',
        isLate: false,
        workingHours: 8.17,
        workHours: 8.17,
      },
      {
        userId: employeeOne._id,
        date: tuesday,
        checkInTime: new Date(tuesday.getFullYear(), tuesday.getMonth(), tuesday.getDate(), 10, 20),
        checkOutTime: new Date(tuesday.getFullYear(), tuesday.getMonth(), tuesday.getDate(), 18, 5),
        status: 'Present',
        isLate: true,
        workingHours: 7.75,
        workHours: 7.75,
      },
      {
        userId: employeeTwo._id,
        date: tuesday,
        checkInTime: new Date(tuesday.getFullYear(), tuesday.getMonth(), tuesday.getDate(), 10, 0),
        checkOutTime: new Date(tuesday.getFullYear(), tuesday.getMonth(), tuesday.getDate(), 17, 0),
        status: 'Half-day',
        isLate: false,
        workingHours: 7,
        workHours: 7,
      },
    ]);

    await Leave.create({
      userId: employeeTwo._id,
      leaveType: 'Casual',
      startDate: monday,
      endDate: monday,
      totalDays: 1,
      status: 'Approved',
      reason: 'Medical',
    });
  });

  it('computes weekly attendance and summary analytics with business rules', async () => {
    const attendanceRes = await request(app)
      .get('/api/reports/attendance/analytics?type=weekly')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(attendanceRes.status).toBe(200);
    expect(attendanceRes.body.summary.totalEmployees).toBe(2);

    const aliceRow = attendanceRes.body.employeeRows.find((row) => row.employee.name === 'Alice');
    const bobRow = attendanceRes.body.employeeRows.find((row) => row.employee.name === 'Bob');

    expect(aliceRow.presentDays).toBe(2);
    expect(aliceRow.lateCount).toBe(1);
    expect(bobRow.leaveDays).toBe(1);
    expect(bobRow.halfDays).toBe(1);

    const summaryRes = await request(app)
      .get('/api/reports/summary/analytics?type=weekly')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(summaryRes.status).toBe(200);
    expect(summaryRes.body.summary.bestAttendanceEmployee.employee.name).toBe('Alice');
    expect(summaryRes.body.summary.mostLeavesEmployee.employee.name).toBe('Bob');
    expect(summaryRes.body.summary.lowAttendanceEmployees.some((row) => row.employee.name === 'Bob')).toBe(true);

    const leaveRes = await request(app)
      .get('/api/reports/leaves/analytics?type=weekly')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(leaveRes.status).toBe(200);
    expect(leaveRes.body.summary.totalLeaves).toBe(1);
    expect(leaveRes.body.summary.approvedLeaves).toBe(1);
  });
});