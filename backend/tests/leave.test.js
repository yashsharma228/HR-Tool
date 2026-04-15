const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

jest.mock('../utils/emailService', () => ({
  sendWelcomeEmail: jest.fn().mockResolvedValue({ success: true }),
  sendLeaveApprovalEmail: jest.fn().mockResolvedValue({ success: true }),
  sendLeaveRejectionEmail: jest.fn().mockResolvedValue({ success: true })
}));

const User = require('../models/User');
const Leave = require('../models/Leave');
const leaveController = require('../controllers/leaveController');
const authMiddleware = require('../middleware/auth');

const app = express();
app.use(express.json());

const setupRoutes = () => {
  app.post('/api/leaves', authMiddleware, async (req, res) => {
    req.user = { userId: req.headers['x-user-id'], role: 'employee' };
    await leaveController.applyLeave(req, res);
  });
  app.get('/api/leaves/my', authMiddleware, async (req, res) => {
    req.user = { userId: req.headers['x-user-id'], role: 'employee' };
    await leaveController.getMyLeaves(req, res);
  });
  app.get('/api/leaves', authMiddleware, async (req, res) => {
    req.user = { userId: req.headers['x-user-id'], role: 'admin' };
    await leaveController.getAllLeaves(req, res);
  });
  app.patch('/api/leaves/:id/status', authMiddleware, async (req, res) => {
    req.user = { userId: req.headers['x-user-id'], role: 'admin' };
    await leaveController.updateLeaveStatus(req, res);
  });
};

describe('Leave Controller', () => {
  let user;
  let admin;
  let userToken;
  let adminToken;

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGO_URI);
    setupRoutes();
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await Leave.deleteMany({});

    user = await User.create({
      name: 'Employee',
      email: 'employee@example.com',
      password: await bcrypt.hash('password123', 10),
      role: 'employee',
      dateOfJoining: new Date(),
      leaveBalance: 20
    });

    admin = await User.create({
      name: 'Admin',
      email: 'admin@example.com',
      password: await bcrypt.hash('adminpass123', 10),
      role: 'admin',
      dateOfJoining: new Date(),
      leaveBalance: 20
    });

    userToken = jwt.sign({ userId: user._id, role: user.role }, process.env.JWT_SECRET);
    adminToken = jwt.sign({ userId: admin._id, role: admin.role }, process.env.JWT_SECRET);
  });

  describe('POST /api/leaves', () => {
    it('should apply for leave successfully', async () => {
      const res = await request(app)
        .post('/api/leaves')
        .set('Authorization', `Bearer ${userToken}`)
        .set('x-user-id', user._id.toString())
        .send({
          leaveType: 'Casual',
          startDate: '2024-01-15',
          endDate: '2024-01-17',
          reason: 'Family vacation'
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('leaveType', 'Casual');
      expect(res.body).toHaveProperty('totalDays', 3);
      expect(res.body).toHaveProperty('status', 'Pending');
    });

    it('should return 400 if leave balance is insufficient', async () => {
      user.leaveBalance = 1;
      await user.save();

      const res = await request(app)
        .post('/api/leaves')
        .set('Authorization', `Bearer ${userToken}`)
        .set('x-user-id', user._id.toString())
        .send({
          leaveType: 'Casual',
          startDate: '2024-01-15',
          endDate: '2024-01-20'
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Insufficient leave balance');
    });

    it('should return 400 if end date is before start date', async () => {
      const res = await request(app)
        .post('/api/leaves')
        .set('Authorization', `Bearer ${userToken}`)
        .set('x-user-id', user._id.toString())
        .send({
          leaveType: 'Casual',
          startDate: '2024-01-20',
          endDate: '2024-01-15'
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('End date cannot be before start date');
    });
  });

  describe('GET /api/leaves/my', () => {
    it('should return user own leaves', async () => {
      await Leave.create({
        userId: user._id,
        leaveType: 'Casual',
        startDate: new Date('2024-01-15'),
        endDate: new Date('2024-01-17'),
        totalDays: 3,
        status: 'Pending'
      });

      const res = await request(app)
        .get('/api/leaves/my')
        .set('Authorization', `Bearer ${userToken}`)
        .set('x-user-id', user._id.toString());

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0]).toHaveProperty('leaveType', 'Casual');
    });
  });

  describe('PATCH /api/leaves/:id/status', () => {
    let leave;

    beforeEach(async () => {
      leave = await Leave.create({
        userId: user._id,
        leaveType: 'Casual',
        startDate: new Date('2024-01-15'),
        endDate: new Date('2024-01-17'),
        totalDays: 3,
        status: 'Pending'
      });
    });

    it('should approve leave and reduce balance', async () => {
      const res = await request(app)
        .patch(`/api/leaves/${leave._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-user-id', admin._id.toString())
        .send({ status: 'Approved' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('status', 'Approved');

      await user.reload();
      expect(user.leaveBalance).toBe(17);
    });

    it('should reject leave without reducing balance', async () => {
      const res = await request(app)
        .patch(`/api/leaves/${leave._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-user-id', admin._id.toString())
        .send({ status: 'Rejected' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('status', 'Rejected');

      await user.reload();
      expect(user.leaveBalance).toBe(20);
    });

    it('should return 400 for invalid status', async () => {
      const res = await request(app)
        .patch(`/api/leaves/${leave._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-user-id', admin._id.toString())
        .send({ status: 'Invalid' });

      expect(res.status).toBe(400);
    });
  });
});