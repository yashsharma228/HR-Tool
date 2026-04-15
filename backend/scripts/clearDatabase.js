// scripts/clearDatabase.js
const mongoose = require('mongoose');
require('dotenv').config();

const Admin = require('../models/Admin');
const User = require('../models/User');
const Attendance = require('../models/Attendance');
const Leave = require('../models/Leave');

async function clearDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    await Promise.all([
      Admin.deleteMany({}),
      User.deleteMany({}),
      Attendance.deleteMany({}),
      Leave.deleteMany({})
    ]);
    console.log('All collections cleared!');
    process.exit(0);
  } catch (err) {
    console.error('Error clearing database:', err);
    process.exit(1);
  }
}

clearDB();
