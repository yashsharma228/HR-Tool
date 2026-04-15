const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const role = require('../middleware/role');
const leaveCtrl = require('../controllers/leaveController');

// Employee
router.post('/', auth, role('employee'), leaveCtrl.applyLeave);
router.get('/my', auth, role('employee'), leaveCtrl.getMyLeaves);
router.put('/:id', auth, role('employee'), leaveCtrl.updateLeave);
router.delete('/:id', auth, role('employee'), leaveCtrl.deleteLeave);

// Admin
router.get('/', auth, role('admin'), leaveCtrl.getAllLeaves);
router.patch('/:id/status', auth, role('admin'), leaveCtrl.updateLeaveStatus);

module.exports = router;
