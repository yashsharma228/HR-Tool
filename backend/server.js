require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const connectDB = require('./config/db');
const { startDailyAttendanceSummaryJob } = require('./jobs/dailyAttendanceSummaryJob');

console.log('JWT_SECRET loaded:', process.env.JWT_SECRET ? 'YES' : 'NO');

const app = express();

const allowedOrigins = [
  'https://hr-tool-seven-lake.vercel.app',
  'https://hr-tool-seven-lake.vercel.app/login',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
].map((origin) => origin.replace(/\/$/, ''));

const corsOptions = {
  origin(origin, callback) {
    if (!origin) {
      return callback(null, true);
    }

    const normalizedOrigin = origin.replace(/\/$/, '');
    if (allowedOrigins.includes(normalizedOrigin)) {
      return callback(null, true);
    }

    return callback(new Error(`Origin ${origin} not allowed by CORS`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

// Middleware
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(cookieParser());
app.use(express.json());

// Connect Database
connectDB();
startDailyAttendanceSummaryJob();



// Root route for deployment check
app.get('/', (req, res) => {
  res.send('Backend deployed successfully! HR Tool API is running.');
});

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/leaves', require('./routes/leaveRoutes'));
app.use('/api/attendance', require('./routes/attendanceRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));

app.use('/api/reports', require('./routes/reportRoutes'));
app.use('/api/admin', require('./routes/dashboardRoutes'));

app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(err.status || 500).json({ message: err.message || 'Internal server error', stack: err.stack });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
