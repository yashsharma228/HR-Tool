<<<<<<< HEAD
# Employee Leave & Attendance Management System (Mini HR Tool)

---

**For HR/Reviewer:**

To access and test this project easily:

1. **Download & Unzip:**
  - Download the attached ZIP or use the provided download link.
  - Unzip to your local machine.

2. **Admin Login Credentials:**
  - Email: `yashsharma4841@gmail.com`
  - Password: `Admin@123`
  - (These are seeded by default. If you want to change, edit `backend/.env` before running the seed command.)

3. **How to Run:**
  - Open two terminals:
    - In the `backend` folder:
     - Run: `npm install` then `npm run dev`
    - In the `frontend` folder:
     - Run: `npm install` then `npm run dev`
  - Open [http://localhost:5173](http://localhost:5173) in your browser.
  - (If using Docker: `docker-compose up --build` from the root folder, then open [http://localhost:3000](http://localhost:3000))

4. **Need Help?**
  - Contact the developer if you have any issues running or accessing the app.

---

## Project Overview
This project is a full-stack HR MVP for managing employee accounts, leave requests, attendance records, and admin approvals. It includes bonus features like email notifications, attendance reports, unit tests, and Docker deployment support.

### Employee capabilities
- Register and login securely.
- View profile and leave balance.
- Apply for leave (Casual, Sick, Paid).
- Edit or cancel pending leave requests.
- Mark attendance once per day as Present or Absent.
- View leave and attendance history.

### Admin capabilities
- Login with seeded admin credentials.
- View all employees with pagination and search.
- View and process leave requests (approve/reject) with filters.
- View all attendance records with pagination and date filters.
- **NEW**: Monthly & yearly attendance reports with statistics.
- **NEW**: Visual attendance percentage charts.

### Bonus Features (Assignment Requirements)
- ✅ Monthly Attendance Reports (Admin only)
- ✅ Pagination & Filters for all admin tables
- ✅ Email Notifications (Leave approval/rejection, Welcome emails)
- ✅ Unit Testing (Jest with Supertest)
- ✅ Docker Setup (Dockerfile, docker-compose.yml)

## Tech Stack and Justification
- Frontend: React + Vite
  - Fast local development and simple deployment.
- Styling: Tailwind CSS
  - Rapid UI building with responsive utility classes.
- Backend: Node.js + Express
  - Lightweight REST API structure and clear middleware flow.
- Database: MongoDB + Mongoose
  - Flexible schema evolution for MVP and strong querying support.
- Authentication: JWT + bcryptjs
  - Stateless auth and secure password hashing.
- Email: Nodemailer
  - SMTP-based email notifications.
- Testing: Jest + Supertest
  - Comprehensive API endpoint testing.
- Deployment: Docker + Docker Compose
  - Containerized deployment for easy setup.

## Project Structure
```text
root
├── backend
│   ├── config
│   │   └── db.js
│   ├── controllers
│   │   ├── attendanceController.js
│   │   ├── authController.js
│   │   ├── leaveController.js
│   │   ├── reportController.js      # NEW: Reports
│   │   └── userController.js
│   ├── middleware
│   │   ├── auth.js
│   │   ├── errorHandler.js
│   │   └── role.js
│   ├── models
│   │   ├── Attendance.js
│   │   ├── Leave.js
│   │   └── User.js
│   ├── routes
│   │   ├── attendanceRoutes.js
│   │   ├── authRoutes.js
│   │   ├── leaveRoutes.js
│   │   ├── reportRoutes.js          # NEW: Reports
│   │   └── userRoutes.js
│   ├── tests                        # NEW: Unit tests
│   │   ├── auth.test.js
│   │   ├── leave.test.js
│   │   └── setup.js
│   ├── utils
│   │   └── emailService.js         # NEW: Email notifications
│   ├── Dockerfile                   # NEW: Docker
│   ├── docker-compose.yml           # NEW: Docker Compose
│   └── jest.config.js              # NEW: Jest config
├── frontend
│   ├── src
│   │   ├── components
│   │   ├── pages
│   │   │   ├── AdminDashboard.jsx   # UPDATED: Pagination & filters
│   │   │   └── AttendanceAnalytics.jsx  # NEW: Reports page
│   │   ├── services
│   │   └── context
│   ├── Dockerfile                   # NEW: Docker
│   └── nginx.conf                   # NEW: Nginx config
└── README.md
```

## Installation and Local Run

### Option 1: Manual Setup

#### 1) Clone and install dependencies
- Backend:
  ```bash
  cd backend
  npm install
  ```
- Frontend:
  ```bash
  cd frontend
  npm install
  ```

#### 2) Configure environment variables
- Backend:
  - Copy `backend/.env.example` to `backend/.env`
  - Update `MONGO_URI`, `JWT_SECRET`, and email settings
- Frontend:
  - Copy `frontend/.env.example` to `frontend/.env`

#### 3) Seed admin credentials
- From `backend`:
  ```bash
  npm run seed:admin
  ```

#### 4) Run services
- Backend:
  ```bash
  cd backend
  npm run dev
  ```
- Frontend:
  ```bash
  cd frontend
  npm run dev
  ```

Frontend default URL: `http://localhost:5173`
Backend default URL: `http://localhost:5000`

### Option 2: Docker Setup (Recommended)

#### 1) Using Docker Compose
```bash
# From root directory
docker-compose up --build
```

This will start:
- MongoDB on port 27017
- Backend API on port 5000
- Frontend on port 3000

#### 2) Environment Variables for Docker
Create a `.env` file in the root or set environment variables:
```bash
JWT_SECRET=your_super_secret_key
EMAIL_SERVICE=gmail
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
ADMIN_NAME=System Admin
ADMIN_EMAIL=admin@hrtool.com
ADMIN_PASSWORD=Admin@123
```

## Running Tests

```bash
cd backend
npm test
```

Tests cover:
- Authentication (register, login, password hashing)
- Leave management (apply, approve, reject, balance tracking)
- Email notifications (mocked)

## Environment Variables

### Backend (`backend/.env`)
- `PORT`: API port (default 5000)
- `MONGO_URI`: MongoDB connection string
- `JWT_SECRET`: Secret key for JWT tokens
- `EMAIL_SERVICE`: Email service provider (gmail, etc.)
- `EMAIL_USER`: Email address for sending notifications
- `EMAIL_PASS`: Email password/app password
- `ADMIN_NAME`: Seeded admin display name
- `ADMIN_EMAIL`: Seeded admin login email
- `ADMIN_PASSWORD`: Seeded admin login password

### Frontend (`frontend/.env`)
- `VITE_API_URL`: Backend API base URL

## API Endpoints

### Auth
- `POST /api/auth/register` - Register employee account
- `POST /api/auth/login` - Login and get JWT token

### Users
- `GET /api/users/me` - Authenticated user profile
- `GET /api/users` - Admin: list all users (supports `page`, `limit`, `role`, `search`)
- `POST /api/users` - Admin: create user
- `PUT /api/users/:id` - Admin: update user
- `DELETE /api/users/:id` - Admin: delete user

### Leaves
- `POST /api/leaves` - Employee: apply for leave
- `GET /api/leaves/my` - Employee: own leave requests/history
- `PUT /api/leaves/:id` - Employee: edit pending leave
- `DELETE /api/leaves/:id` - Employee: cancel pending leave
- `GET /api/leaves` - Admin: all leave requests (supports `page`, `limit`, `status`, `userId`, `startDate`, `endDate`)
- `PATCH /api/leaves/:id/status` - Admin: approve/reject pending leave

### Attendance
- `POST /api/attendance` - Employee: mark attendance (Present/Absent)
- `GET /api/attendance/my` - Employee: own attendance history
- `GET /api/attendance` - Admin: all attendance (supports `page`, `limit`, `userId`, `startDate`, `endDate`)

### Reports (NEW - Admin only)
- `GET /api/reports/attendance/monthly` - Monthly attendance report
  - Query params: `year`, `month`, `userId`
- `GET /api/reports/attendance/yearly` - Yearly attendance report
  - Query params: `year`

## Database Models

### User
- `name`, `email`, `password` (hashed), `role`, `dateOfJoining`, `leaveBalance`
- Roles: `employee`, `admin`
- Default leave balance: `20`

### Leave
- `userId`, `leaveType`, `startDate`, `endDate`, `totalDays`, `status`, `reason`, `appliedAt`
- Leave types: `Casual`, `Sick`, `Paid`
- Status: `Pending`, `Approved`, `Rejected`

### Attendance
- `userId`, `date`, `status`
- Status: `Present`, `Absent`
- Unique index on `(userId, date)` to enforce one entry per day

## Admin Credentials
Admin is seeded manually using:
```bash
npm run seed:admin
```

Default credentials for review/testing:
- Email: `admin@hrtool.com`
- Password: `Admin@123`

You can change these in `backend/.env` before seeding. For production, always update these values.

## Business Logic and Security Highlights
- JWT-based protected routes with role-based access control.
- Passwords are hashed with `bcryptjs`.
- Employees can only access their own leave/attendance records.
- Admin routes return `403` for unauthorized role access.
- Missing/invalid token returns `401`.
- Leave balance decreases only when leave is approved.
- Pending leaves can be edited/cancelled by employee.
- Attendance rules:
  - One record per day
  - No future-date attendance allowed
- **NEW**: Pagination with configurable page size (default 5-10 items)
- **NEW**: Search and filter capabilities for all admin tables
- **NEW**: Monthly/yearly attendance statistics and reports

## Email Notifications

Email notifications are sent for:
- **Welcome email** on successful registration
- **Leave approval notification** when leave is approved by admin
- **Leave rejection notification** when leave is rejected by admin

**Note**: Email sending is optional. If `EMAIL_USER` and `EMAIL_PASS` are not configured, emails will be logged to console but not actually sent.

To enable email notifications:
1. Enable 2-factor authentication on your Google account
2. Generate an App Password at https://myaccount.google.com/homepasswords
3. Set `EMAIL_USER` and `EMAIL_PASS` in your `.env` file

## Deployment

### Manual Deployment
Recommended:
- Frontend: Vercel
- Backend: Render / Railway
- Database: MongoDB Atlas

After deploy:
- Set backend env variables in hosting platform.
- Set frontend `VITE_API_URL` to deployed backend API URL.

### Docker Deployment
```bash
# Build and run
docker-compose up --build -d

# Stop
docker-compose down

# Rebuild
docker-compose up --build
```

## AI Tools Declaration
AI tools were used with transparency:
- Cursor AI assistant
  - Assisted with code scaffolding, route wiring, refactoring, and documentation drafting.
- ChatGPT-style prompting workflow
  - Used to validate requirement coverage and improve README completeness.

Final integration choices, business rules (role restrictions, leave balance updates, and attendance constraints), and project validation were manually reviewed and adjusted.

## Bonus Features Implementation

| Feature | Status | Implementation |
|---------|--------|----------------|
| Monthly Attendance Reports | ✅ | `/api/reports/attendance/monthly` + `AttendanceAnalytics.jsx` |
| Pagination & Filters | ✅ | All admin endpoints support `page`, `limit`, and filter params |
| Email Notifications | ✅ | `emailService.js` with nodemailer integration |
| Unit Testing | ✅ | Jest tests for auth and leave controllers |
| Docker Setup | ✅ | Dockerfile, docker-compose.yml for full stack deployment |

## Known Limitations
- Email requires manual Gmail App Password configuration
- MongoDB connection string should be updated for production
- JWT secret should be changed for production deployment

## Time Spent (Approx)
- Planning and requirement mapping: 1.5 hours
- Backend APIs and business logic: 4.5 hours
- Frontend dashboards and forms: 4 hours
- **NEW: Bonus features (reports, emails, tests, docker): 3 hours**
- Validation and documentation: 2 hours
- **Total: ~15 hours**
=======
# HR-Tool
>>>>>>> e2e8af83ad23df0740593fbcc3e80bb4e8b22bf0
