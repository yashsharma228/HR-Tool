const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { register, login, logout, me } = require('../controllers/authController');

// @route   POST /api/auth/register
router.post('/register', register);

// @route   POST /api/auth/login
router.post('/login', login);
router.post('/logout', logout);
router.get('/me', auth, me);

module.exports = router;
