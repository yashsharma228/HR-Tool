const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const notificationCtrl = require('../controllers/notificationController');

router.get('/', auth, notificationCtrl.getMyNotifications);
router.patch('/read-all', auth, notificationCtrl.markAllNotificationsRead);
router.patch('/:id/read', auth, notificationCtrl.markNotificationRead);

module.exports = router;