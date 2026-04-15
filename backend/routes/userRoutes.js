const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const role = require('../middleware/role');
const userCtrl = require('../controllers/userController');

router.get('/me', auth, userCtrl.getMyProfile);

// Admin
router.get('/', auth, role('admin'), userCtrl.getAllUsers);

module.exports = router;
