const Leave = require('../models/Leave');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { sendEmail, sendLeaveApprovalEmail, sendLeaveRejectionEmail, sendWelcomeEmail, sendAdminLeaveNotification } = require('../utils/emailService');
const { createNotification, notifyAdmins } = require('../utils/notificationService');

// Employee: Apply leave
exports.applyLeave = async (req, res) => {
  const { leaveType, startDate, endDate, reason } = req.body;
  if (!leaveType || !startDate || !endDate) {
    return res.status(400).json({ message: 'Leave type, start date and end date are required' });
  }
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (end < start) return res.status(400).json({ message: 'End date cannot be before start date' });

  const currentUser = await User.findById(req.user.userId);
  if (!currentUser) {
    return res.status(404).json({ message: 'User not found' });
  }

  const totalDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
  if (totalDays > currentUser.leaveBalance) {
    return res.status(400).json({ message: 'Insufficient leave balance' });
  }

  const leave = await Leave.create({
    userId: req.user.userId,
    leaveType,
    startDate: start,
    endDate: end,
    totalDays,
    reason: reason || '',
  });

  // Send email notifications asynchronously to improve performance
  try {
    await notifyAdmins({
      actorId: currentUser._id,
      type: 'leave_applied',
      title: 'New leave request',
      message: `${currentUser.name} applied for ${leaveType} leave from ${startDate} to ${endDate}.`,
      link: '/admin',
      metadata: { leaveId: leave._id, leaveType, startDate, endDate },
    });

    // Notify HR/Admin BEFORE approval (non-blocking)
    sendAdminLeaveNotification(currentUser, leave).catch(e => 
      console.error('Failed to send admin leave notification:', e.message)
    );

    // Notify Employee (Application Confirmation) (non-blocking)
    sendEmail({
      to: currentUser.email,
      subject: 'Leave Application Received',
      text: `Dear ${currentUser.name},\n\nYour leave request for ${leaveType} from ${startDate} to ${endDate} (${totalDays} days) has been received and is currently under review by HR.\n\nReason: ${reason || 'N/A'}\n\nBest regards,\nHR Team`,
      html: `
        <div style=\"font-family: Arial, sans-serif; max-width: 600px; color: #1e293b;\">
          <h2 style=\"color: #4f46e5;\">Leave Application Received</h2>
          <p>Dear <strong>${currentUser.name}</strong>,</p>
          <p>Your leave request has been successfully submitted and is now pending review by HR.</p>
          <div style=\"background-color: #f8fafc; padding: 15px; border-radius: 8px; border-left: 4px solid #4f46e5;\">
            <p style=\"margin: 5px 0;\"><strong>Type:</strong> ${leaveType}</p>
            <p style=\"margin: 5px 0;\"><strong>Duration:</strong> ${startDate} to ${endDate}</p>
            <p style=\"margin: 5px 0;\"><strong>Total Days:</strong> ${totalDays}</p>
            <p style=\"margin: 5px 0;\"><strong>Status:</strong> Pending Review</p>
          </div>
          <p>You will receive another notification once your request has been processed.</p>
          <p>Best regards,<br/><strong>HR Team</strong></p>
        </div>
      `
    }).catch(e => console.error('Failed to send leave confirmation email:', e.message));
  } catch (e) {
    console.error('Error initiating leave notifications:', e.message);
  }
  res.status(201).json(leave);
};

// Employee: View own leaves
exports.getMyLeaves = async (req, res) => {
  const leaves = await Leave.find({ userId: req.user.userId }).sort({ appliedAt: -1 });
  res.json(leaves);
};

// Employee: Edit pending leave
exports.updateLeave = async (req, res) => {
  const leave = await Leave.findOne({ _id: req.params.id, userId: req.user.userId });
  if (!leave) return res.status(404).json({ message: 'Leave not found' });
  if (leave.status !== 'Pending') return res.status(400).json({ message: 'Cannot edit approved/rejected leave' });

  const { leaveType, startDate, endDate, reason } = req.body;
  if (leaveType) leave.leaveType = leaveType;
  if (startDate) leave.startDate = new Date(startDate);
  if (endDate) leave.endDate = new Date(endDate);
  if (reason !== undefined) leave.reason = reason;
  if (leave.endDate < leave.startDate) {
    return res.status(400).json({ message: 'End date cannot be before start date' });
  }
  leave.totalDays = Math.ceil((leave.endDate - leave.startDate) / (1000 * 60 * 60 * 24)) + 1;

  const currentUser = await User.findById(req.user.userId);
  if (!currentUser) {
    return res.status(404).json({ message: 'User not found' });
  }
  if (leave.totalDays > currentUser.leaveBalance) {
    return res.status(400).json({ message: 'Insufficient leave balance for updated request' });
  }

  await leave.save();
  res.json(leave);
};

// Employee: Delete pending leave
exports.deleteLeave = async (req, res) => {
  const leave = await Leave.findOne({ _id: req.params.id, userId: req.user.userId });
  if (!leave) return res.status(404).json({ message: 'Leave not found' });
  if (leave.status !== 'Pending') return res.status(400).json({ message: 'Cannot delete approved/rejected leave' });

  await leave.deleteOne();
  res.json({ message: 'Leave deleted' });
};

// Admin: View all leave requests (with pagination & filters)
exports.getAllLeaves = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, userId, startDate, endDate } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (userId) filter.userId = userId;
    if (startDate || endDate) {
      filter.startDate = {};
      if (startDate) filter.startDate.$gte = new Date(startDate);
      if (endDate) filter.startDate.$lte = new Date(endDate);
    }

    const total = await Leave.countDocuments(filter);
    const leaves = await Leave.find(filter)
      .populate('userId', 'name email role')
      .sort({ appliedAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({
      data: leaves,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Admin: Approve/Reject leave
exports.updateLeaveStatus = async (req, res) => {
  const { status } = req.body;
  if (!['Approved', 'Rejected'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status' });
  }
  const leave = await Leave.findById(req.params.id);
  if (!leave) return res.status(404).json({ message: 'Leave not found' });
  if (leave.status !== 'Pending') return res.status(400).json({ message: 'Leave already processed' });

  const user = await User.findById(leave.userId);

  leave.status = status;
  await leave.save();

  await Notification.deleteMany({
    type: 'leave_applied',
    'metadata.leaveId': leave._id,
  });

  // On approval, reduce leave balance
  if (status === 'Approved') {
    user.leaveBalance -= leave.totalDays;
    await user.save();
    createNotification({
      recipientId: user._id,
      actorId: req.user.userId,
      type: 'leave_approved',
      title: 'Leave request approved',
      message: `Your ${leave.leaveType} leave request has been approved.`,
      link: '/leave-history',
      metadata: { leaveId: leave._id, status },
    }).catch((err) => console.error('Failed to create leave approval notification:', err.message));
    // Notify Employee AFTER approval asynchronously
    sendLeaveApprovalEmail(user, leave).catch(err => 
      console.error('Failed to send leave approval email:', err.message)
    );
  } else {
    createNotification({
      recipientId: user._id,
      actorId: req.user.userId,
      type: 'leave_rejected',
      title: 'Leave request rejected',
      message: `Your ${leave.leaveType} leave request has been rejected.`,
      link: '/leave-history',
      metadata: { leaveId: leave._id, status },
    }).catch((err) => console.error('Failed to create leave rejection notification:', err.message));
    // Notify Employee if rejected asynchronously
    sendLeaveRejectionEmail(user, leave).catch(err => 
      console.error('Failed to send leave rejection email:', err.message)
    );
  }

  res.json(leave);
};
