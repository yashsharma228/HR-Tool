const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const role = require('../middleware/role');
const reportCtrl = require('../controllers/reportController');

router.get('/attendance/monthly', auth, role('admin'), reportCtrl.getMonthlyReport);
router.get('/attendance/yearly', auth, role('admin'), reportCtrl.getYearlyReport);

module.exports = router;