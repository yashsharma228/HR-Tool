require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

console.log('JWT_SECRET loaded:', process.env.JWT_SECRET ? 'YES' : 'NO');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Connect Database
connectDB();



// Root route for deployment check
app.get('/', (req, res) => {
  res.send('Backend deployed successfully! HR Tool API is running.');
});

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/leaves', require('./routes/leaveRoutes'));
app.use('/api/attendance', require('./routes/attendanceRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/reports', require('./routes/reportRoutes'));

app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(err.status || 500).json({ message: err.message || 'Internal server error', stack: err.stack });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
