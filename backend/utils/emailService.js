const nodemailer = require('nodemailer');
const Admin = require('../models/Admin');

console.log('Initializing Email Service...');
console.log('EMAIL_USER:', process.env.EMAIL_USER ? 'SET' : 'MISSING');
console.log('EMAIL_PASS:', process.env.EMAIL_PASS ? 'SET' : 'MISSING');

const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false
  }
});

// Verify connection configuration
transporter.verify((error, success) => {
  if (error) {
    console.error('Email transporter verification failed:', error);
  } else {
    console.log('Email server is ready to take our messages');
  }
});

const sendEmail = async ({ to, subject, text, html }) => {
  try {
    console.log(`Attempting to send email to: ${to}`);
    
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.warn('Email not configured. Missing EMAIL_USER or EMAIL_PASS. Skipping email to:', to);
      return { success: false, message: 'Email not configured' };
    }

    const info = await transporter.sendMail({
      from: `"HR Tool" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
      html,
    });

    console.log('Email sent successfully to:', to);
    console.log('Message ID:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Email sending failed for:', to);
    console.error('Error Details:', error);
    return { success: false, error: error.message };
  }
};

exports.sendLeaveApprovalEmail = async (user, leave) => {
  const subject = `Leave Request Approved ✓ - ${leave.leaveType}`;
  const text = `Dear ${user.name},\n\nYour leave request for ${leave.totalDays} day(s) (${leave.leaveType}) from ${new Date(leave.startDate).toLocaleDateString()} to ${new Date(leave.endDate).toLocaleDateString()} has been approved.\n\nBest regards,\nHR Team`;
  const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; background-color: #ffffff;">
      <div style="background-color: #10b981; padding: 32px 24px; text-align: center; color: white;">
        <h2 style="margin: 0; font-size: 24px;">Leave Request Approved ✓</h2>
      </div>
      <div style="padding: 32px 24px; color: #1e293b;">
        <p style="font-size: 16px;">Dear <strong>${user.name}</strong>,</p>
        <p style="font-size: 16px; line-height: 1.6;">We are pleased to inform you that your leave request has been <strong style="color: #10b981;">approved</strong>.</p>
        
        <div style="background-color: #f0fdf4; padding: 20px; border-radius: 12px; border: 1px solid #dcfce7; margin: 24px 0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 10px 0; color: #64748b;">Leave Type</td>
              <td style="padding: 10px 0; font-weight: 600; text-align: right;">${leave.leaveType}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; color: #64748b;">Period</td>
              <td style="padding: 10px 0; font-weight: 600; text-align: right;">${new Date(leave.startDate).toLocaleDateString()} - ${new Date(leave.endDate).toLocaleDateString()}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; color: #64748b;">Total Days</td>
              <td style="padding: 10px 0; font-weight: 600; text-align: right;">${leave.totalDays} Day(s)</td>
            </tr>
          </table>
        </div>
        
        <p style="font-size: 14px; color: #64748b;">Your leave balance has been updated accordingly.</p>
        <p style="margin-top: 32px; border-top: 1px solid #e2e8f0; padding-top: 16px;">Best regards,<br><strong>HR Team</strong></p>
      </div>
    </div>
  `;

  return sendEmail({ to: user.email, subject, text, html });
};

exports.sendAdminLeaveNotification = async (user, leave) => {
  const admins = await Admin.find({ role: 'admin' }).select('email');
  const adminEmails = admins.length > 0 
    ? admins.map(a => a.email) 
    : [process.env.ADMIN_EMAIL || process.env.EMAIL_USER];

  const subject = `New Leave Application - ${user.name}`;
  const dashboardUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/admin`;
  const approveUrl = `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/leave/${leave._id}/status?status=Approved`;
  const rejectUrl = `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/leave/${leave._id}/status?status=Rejected`;

  const text = `Dear Admin,\n\nA new leave request has been submitted by ${user.name}.\n\nEmployee Details:\nName: ${user.name}\nEmail: ${user.email}\n\nLeave Details:\nType: ${leave.leaveType}\nPeriod: ${new Date(leave.startDate).toLocaleDateString()} to ${new Date(leave.endDate).toLocaleDateString()}\nTotal Days: ${leave.totalDays}\nReason: ${leave.reason || 'N/A'}\n\nPlease log in to the admin dashboard to take action.\n\nBest regards,\nHR Tool System`;
  const html = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; color: #1e293b; background-color: #ffffff; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
      <div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 32px 24px; text-align: center; color: white;">
        <h2 style="margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.025em;">New Leave Application</h2>
        <p style="margin: 8px 0 0 0; opacity: 0.9; font-size: 16px;">Action Required: Pending Review</p>
      </div>
      
      <div style="padding: 32px 24px;">
        <p style="font-size: 16px; line-height: 1.6; margin-bottom: 24px;">Dear Admin, a new leave request has been submitted and requires your immediate attention.</p>
        
        <div style="background-color: #f8fafc; padding: 20px; border-radius: 12px; margin-bottom: 24px; border: 1px solid #f1f5f9;">
          <h3 style="margin-top: 0; color: #475569; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px; margin-bottom: 15px;">Employee Profile</h3>
          <div style="display: flex; margin-bottom: 8px;">
            <span style="color: #64748b; width: 80px; font-size: 14px;">Name:</span>
            <span style="font-weight: 600; color: #1e293b;">${user.name}</span>
          </div>
          <div style="display: flex;">
            <span style="color: #64748b; width: 80px; font-size: 14px;">Email:</span>
            <span style="font-weight: 600; color: #1e293b;">${user.email}</span>
          </div>
        </div>

        <div style="background-color: #ffffff; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0; margin-bottom: 32px;">
          <h3 style="margin-top: 0; color: #475569; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px; margin-bottom: 15px;">Leave Details</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 10px 0; color: #64748b; font-size: 14px;">Type</td>
              <td style="padding: 10px 0; font-weight: 700; color: #4f46e5; text-align: right;">${leave.leaveType}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; color: #64748b; font-size: 14px;">Duration</td>
              <td style="padding: 10px 0; font-weight: 600; color: #1e293b; text-align: right;">${new Date(leave.startDate).toLocaleDateString()} - ${new Date(leave.endDate).toLocaleDateString()}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; color: #64748b; font-size: 14px;">Total Days</td>
              <td style="padding: 10px 0; font-weight: 600; color: #1e293b; text-align: right;">${leave.totalDays} Days</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; color: #64748b; font-size: 14px;">Reason</td>
              <td style="padding: 10px 0; font-weight: 500; color: #475569; text-align: right; font-style: italic;">"${leave.reason || 'No reason provided'}"</td>
            </tr>
          </table>
        </div>

        <div style="text-align: center; margin-bottom: 24px;">
          <p style="font-size: 14px; color: #64748b; margin-bottom: 16px;">Quick Actions:</p>
          <div style="display: flex; justify-content: center; gap: 12px;">
            <a href="${dashboardUrl}" style="background-color: #4f46e5; color: white; padding: 14px 28px; text-decoration: none; border-radius: 10px; font-weight: 700; display: inline-block; font-size: 15px; box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.2);">Review in Dashboard</a>
          </div>
          <p style="font-size: 12px; color: #94a3b8; margin-top: 16px;">Clicking the button will take you to the Admin Panel.</p>
        </div>
      </div>
      
      <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
        <p style="margin: 0; color: #94a3b8; font-size: 12px;">This is an automated system notification from your <strong>HR Management Tool</strong>.</p>
        <p style="margin: 4px 0 0 0; color: #cbd5e1; font-size: 11px;">&copy; 2026 HR Tool. All rights reserved.</p>
      </div>
    </div>
  `;

  return Promise.all(adminEmails.map(email => sendEmail({ to: email, subject, text, html })));
};

exports.sendAdminAttendanceNotification = async (user, attendance) => {
  const admins = await Admin.find({ role: 'admin' }).select('email');
  const adminEmails = admins.length > 0 
    ? admins.map(a => a.email) 
    : [process.env.ADMIN_EMAIL || process.env.EMAIL_USER];

  const subject = `Attendance Marked - ${user.name}`;
  const statusColor = attendance.status === 'Present' ? '#10b981' : '#ef4444';
  
  const text = `Dear Admin,\n\n${user.name} has marked their attendance for ${new Date(attendance.date).toDateString()}.\n\nEmployee Details:\nName: ${user.name}\nEmail: ${user.email}\n\nAttendance Status: ${attendance.status}\n\nBest regards,\nHR Tool System`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; color: #1e293b;">
      <div style="background: linear-gradient(to right, #0ea5e9, #2563eb); padding: 24px; text-align: center; color: white;">
        <h2 style="margin: 0; font-size: 24px;">Attendance Marked</h2>
      </div>
      <div style="padding: 24px;">
        <p>Dear Admin,</p>
        <p>An employee has just marked their daily attendance.</p>
        
        <div style="background-color: #f8fafc; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
          <h3 style="margin-top: 0; color: #475569; font-size: 16px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">Employee Information</h3>
          <p style="margin: 8px 0;"><strong>Name:</strong> ${user.name}</p>
          <p style="margin: 8px 0;"><strong>Email:</strong> ${user.email}</p>
        </div>

        <div style="background-color: #f8fafc; padding: 16px; border-radius: 8px; text-align: center;">
          <p style="margin: 0; color: #64748b; font-size: 14px;">Date</p>
          <p style="margin: 4px 0 16px 0; font-size: 18px; font-weight: bold;">${new Date(attendance.date).toDateString()}</p>
          
          <div style="display: inline-block; padding: 8px 24px; border-radius: 20px; background-color: ${statusColor}20; color: ${statusColor}; font-weight: bold; font-size: 16px;">
            ${attendance.status}
          </div>
        </div>

        <div style="margin-top: 24px; text-align: center;">
          <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/admin" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">View Attendance Records</a>
        </div>
      </div>
      <div style="background-color: #f1f5f9; padding: 16px; text-align: center; color: #94a3b8; font-size: 12px;">
        This is an automated notification from your HR Tool.
      </div>
    </div>
  `;

  // Send to all admins
  return Promise.all(adminEmails.map(email => sendEmail({ to: email, subject, text, html })));
};

exports.sendLeaveRejectionEmail = async (user, leave) => {
  const subject = `Leave Request Update - ${leave.leaveType}`;
  const text = `Dear ${user.name},\n\nYour leave request for ${leave.totalDays} day(s) (${leave.leaveType}) from ${new Date(leave.startDate).toLocaleDateString()} to ${new Date(leave.endDate).toLocaleDateString()} has been rejected.\n\nBest regards,\nHR Team`;
  const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; background-color: #ffffff;">
      <div style="background-color: #ef4444; padding: 32px 24px; text-align: center; color: white;">
        <h2 style="margin: 0; font-size: 24px;">Leave Request Rejected ✗</h2>
      </div>
      <div style="padding: 32px 24px; color: #1e293b;">
        <p style="font-size: 16px;">Dear <strong>${user.name}</strong>,</p>
        <p style="font-size: 16px; line-height: 1.6;">We regret to inform you that your leave request has been <strong style="color: #ef4444;">rejected</strong>.</p>
        
        <div style="background-color: #fef2f2; padding: 20px; border-radius: 12px; border: 1px solid #fee2e2; margin: 24px 0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 10px 0; color: #64748b;">Leave Type</td>
              <td style="padding: 10px 0; font-weight: 600; text-align: right;">${leave.leaveType}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; color: #64748b;">Period</td>
              <td style="padding: 10px 0; font-weight: 600; text-align: right;">${new Date(leave.startDate).toLocaleDateString()} - ${new Date(leave.endDate).toLocaleDateString()}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; color: #64748b;">Total Days</td>
              <td style="padding: 10px 0; font-weight: 600; text-align: right;">${leave.totalDays} Day(s)</td>
            </tr>
          </table>
        </div>
        
        <p style="font-size: 14px; color: #64748b;">If you have any questions, please contact the HR department.</p>
        <p style="margin-top: 32px; border-top: 1px solid #e2e8f0; padding-top: 16px;">Best regards,<br><strong>HR Team</strong></p>
      </div>
    </div>
  `;

  return sendEmail({ to: user.email, subject, text, html });
};

exports.sendWelcomeEmail = async (user) => {
  const subject = 'Welcome to HR Tool';
  const text = `Dear ${user.name},\n\nWelcome to our HR Tool system. Your account has been created successfully.\n\nYour login credentials:\nEmail: ${user.email}\nRole: ${user.role}\n\nBest regards,\nHR Team`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #6366f1;">Welcome to HR Tool! 🎉</h2>
      <p>Dear <strong>${user.name}</strong>,</p>
      <p>Welcome to our HR Tool system. Your account has been created successfully.</p>
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;"><strong>Email</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd;">${user.email}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;"><strong>Role</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd;">${user.role}</td>
        </tr>
      </table>
      <p>Best regards,<br><strong>HR Team</strong></p>
    </div>
  `;

  return sendEmail({ to: user.email, subject, text, html });
};