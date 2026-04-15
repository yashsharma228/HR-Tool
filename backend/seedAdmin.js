require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Admin = require('./models/Admin');

async function seedAdmin() {
  await mongoose.connect(process.env.MONGO_URI);
  
  const adminEmail = process.env.ADMIN_EMAIL || "admin@hrtool.com";
  
  const exists = await Admin.findOne({ email: adminEmail });
  if (exists) {
    console.log('Admin user already exists in Admin collection.');
    process.exit(0);
  }

  // Remove admin from User collection if it exists
  await User.deleteOne({ email: adminEmail, role: 'admin' });

  await Admin.create({
    name: process.env.ADMIN_NAME || "System Admin",
    email: adminEmail,
    password: process.env.ADMIN_PASSWORD || "Admin@123",
    role: 'admin',
    dateOfJoining: new Date(),
  });
  console.log('Admin user seeded successfully in Admin collection.');
  process.exit(0);
}

seedAdmin();
