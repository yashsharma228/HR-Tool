const express = require('express');
const router = express.Router();
const dashboardCtrl = require('../controllers/dashboardController');

// GET /dashboard-stats (no auth for now)
router.get('/dashboard-stats', dashboardCtrl.getDashboardStats);

module.exports = router;
