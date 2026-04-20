const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const role = require('../middleware/role');
const attendanceCtrl = require('../controllers/attendanceController');

// Employee
router.post('/check-in', auth, role('employee'), attendanceCtrl.checkIn);
router.post('/check-out', auth, role('employee'), attendanceCtrl.checkOut);
router.get('/my', auth, role('employee'), attendanceCtrl.getMyAttendance);

// Admin manual check-in/out for any employee
router.post('/admin/check-in/:userId', auth, role('admin'), attendanceCtrl.adminCheckIn);
router.post('/admin/check-out/:userId', auth, role('admin'), attendanceCtrl.adminCheckOut);

// Admin
router.get('/', auth, role('admin'), attendanceCtrl.getAllAttendance);

module.exports = router;
