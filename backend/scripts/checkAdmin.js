require('dotenv').config();
const mongoose = require('mongoose');
const Admin = require('../models/Admin');

async function checkAdmin() {
  await mongoose.connect(process.env.MONGO_URI);
  const admin = await Admin.findOne({ email: process.env.ADMIN_EMAIL });
  if (admin) {
    console.log('Admin found:', admin.email);
  } else {
    console.log('Admin NOT found.');
  }
  process.exit(0);
}

checkAdmin();
