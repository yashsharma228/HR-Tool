const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const role = require('../middleware/role');
const reportCtrl = require('../controllers/reportController');

router.get('/attendance/analytics', auth, reportCtrl.getAttendanceAnalytics);
router.get('/attendance/monthly', auth, reportCtrl.getMonthlyReport);
router.get('/attendance/yearly', auth, reportCtrl.getYearlyReport);
router.get('/leaves/analytics', auth, role('admin'), reportCtrl.getLeaveReport);
router.get('/summary/analytics', auth, role('admin'), reportCtrl.getSummaryAnalytics);

module.exports = router;