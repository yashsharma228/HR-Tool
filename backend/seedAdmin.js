require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Admin = require('./models/Admin');
const { sendWelcomeEmail } = require('./utils/emailService');

async function seedAdmin() {
  await mongoose.connect(process.env.MONGO_URI);
  
  const adminEmail = (process.env.ADMIN_EMAIL || "admin@hrtool.com").toLowerCase().trim();
  
  let admin = await Admin.findOne({ email: adminEmail });
  if (admin) {
    console.log('Admin user already exists in Admin collection.');
  } else {
    // Remove admin from User collection if it exists
    await User.deleteOne({ email: adminEmail, role: 'admin' });

    admin = await Admin.create({
      name: process.env.ADMIN_NAME || "System Admin",
      email: adminEmail,
      password: process.env.ADMIN_PASSWORD || "Admin@123",
      role: 'admin',
      dateOfJoining: new Date(),
    });
    console.log('Admin user seeded successfully in Admin collection.');
  }

  // Always send welcome email
  console.log(`Sending welcome email to admin: ${admin.email}...`);
  await sendWelcomeEmail({
    _id: admin._id,
    name: admin.name,
    email: admin.email,
    role: admin.role,
    dateOfJoining: admin.dateOfJoining,
    leaveBalance: 0
  });

  process.exit(0);
}

seedAdmin();
