require('dotenv').config();

process.env.JWT_SECRET = 'test_secret_key';
process.env.MONGO_URI = 'mongodb://localhost:27017/hrtool_test';

global.afterAll = async () => {
  const mongoose = require('mongoose');
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
};