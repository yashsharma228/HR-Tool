const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const notificationCtrl = require('../controllers/notificationController');

router.get('/', auth, notificationCtrl.getMyNotifications);
router.delete('/', auth, notificationCtrl.clearMyNotifications);
router.patch('/read-all', auth, notificationCtrl.markAllNotificationsRead);
router.patch('/:id/read', auth, notificationCtrl.markNotificationRead);
router.delete('/:id', auth, notificationCtrl.deleteNotification);

module.exports = router;