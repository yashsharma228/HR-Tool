const User = require('../models/User');
const Admin = require('../models/Admin');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sendWelcomeEmail } = require('../utils/emailService');

const getToken = (user, role) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not defined');
  }
  return jwt.sign(
    { userId: user._id.toString(), role: role || user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

const sanitizeUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  dateOfJoining: user.dateOfJoining,
  leaveBalance: user.leaveBalance || 0,
});

// Public registration only creates employees.
exports.register = async (req, res) => {
  try {
    let { name, email, password, dateOfJoining } = req.body;
    console.log('Register attempt for:', email);
    if (!name || !email || !password || !dateOfJoining) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Ensure email is lowercased for searching
    email = email.toLowerCase().trim();

    // Check both collections for existing email
    const existingEmployee = await User.findOne({ email });
    const existingAdmin = await Admin.findOne({ email });

    if (existingAdmin || (existingEmployee && existingEmployee.role === 'employee')) {
      console.log('User already exists:', email);
      return res.status(400).json({ message: 'Email already registered' });
    }

    let user;

    if (existingEmployee) {
      // If user exists but is "broken" (no role), fix them
      console.log('Fixing incomplete user record for:', email);
      existingEmployee.name = name;
      existingEmployee.password = password; // Model will hash this on save
      existingEmployee.role = 'employee';
      existingEmployee.dateOfJoining = dateOfJoining;
      user = await existingEmployee.save();
    } else {
      // Create new user
      user = new User({
        name,
        email,
        password: password, // Model will hash this on save
        role: 'employee',
        dateOfJoining,
      });
      await user.save();
    }
    console.log('User saved successfully:', email);

    await sendWelcomeEmail(sanitizeUser(user));

    const token = getToken(user);
    console.log('Registration successful for:', email);
    res.status(201).json({ token, user: sanitizeUser(user) });
  } catch (error) {
    console.error('Registration error details:', {
      message: error.message,
      name: error.name,
      stack: error.stack
    });
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: 'Validation error', errors: error.errors });
    }
    
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    res.status(500).json({ message: 'Server error during registration', error: error.message });
  }
};

// Login
exports.login = async (req, res) => {
  try {
    let { email, password } = req.body;
    console.log(`[LOGIN ATTEMPT] Raw Email: ${email}`);
    
    if (!email || !password) {
      console.log('[LOGIN FAILED] Missing fields');
      return res.status(400).json({ message: 'All fields are required' });
    }
    
    // Ensure email is lowercased for searching
    email = email.toLowerCase().trim();
    console.log(`[LOGIN ATTEMPT] Normalized Email: ${email}`);
    
    // Check Admin collection first
    let user = await Admin.findOne({ email });
    let role = 'admin';

    if (!user) {
      console.log(`[LOGIN] User not found in Admin collection for ${email}, checking User collection...`);
      // Then check User collection
      user = await User.findOne({ email });
      role = user ? user.role : 'employee';
    } else {
      console.log(`[LOGIN] User found in Admin collection for ${email}`);
    }

    if (!user) {
      console.log(`[LOGIN FAILED] User not found in any collection: ${email}`);
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log(`[LOGIN FAILED] Password mismatch for: ${email}`);
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = getToken(user, role);
    console.log(`[LOGIN SUCCESS] User: ${email}, Role: ${role}`);
    res.json({ token, user: { ...sanitizeUser(user), role } });
  } catch (error) {
    console.error('[LOGIN ERROR] Full details:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
