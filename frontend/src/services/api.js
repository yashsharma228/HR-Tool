// Admin manual attendance
export const adminCheckIn = (userId) => API.post(`/attendance/admin/check-in/${userId}`);
export const adminCheckOut = (userId) => API.post(`/attendance/admin/check-out/${userId}`);
// Admin Dashboard Stats
export const getAdminDashboardStats = () => API.get('/admin/dashboard-stats');
import axios from "axios";

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
});

// Attach token to requests
API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  // Don't attach token for login or register requests
  if (token && !config.url.includes("/auth/login") && !config.url.includes("/auth/register")) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 Unauthorized globally
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      // Redirect if needed, or let the context handle it
    }
    return Promise.reject(error);
  }
);

// Auth
export const loginUser = (data) => API.post("/auth/login", data);
export const registerUser = (data) => API.post("/auth/register", data);

// Update Profile
export const updateProfile = (data) => API.put("/users/me", data);
// Password Reset
export const forgotPassword = (email) => API.post("/auth/forgot-password", { email });

// Leaves
export const applyLeave = (data) => API.post("/leaves", data);
export const getMyLeaves = () => API.get("/leaves/my");
export const updateLeave = (id, data) => API.put(`/leaves/${id}`, data);
export const deleteLeave = (id) => API.delete(`/leaves/${id}`);
export const getAllLeaves = (params) => API.get("/leaves", { params });
export const updateLeaveStatus = (id, status) => API.patch(`/leaves/${id}/status`, { status });

// Attendance
export const checkIn = () => API.post("/attendance/check-in");
export const checkOut = () => API.post("/attendance/check-out");
export const getMyAttendance = () => API.get("/attendance/my");
export const getAllAttendance = (params) => API.get("/attendance", { params });

// Reports
export const getAttendanceAnalytics = (params) => API.get("/reports/attendance/analytics", { params });
export const getMonthlyReport = (params) => API.get("/reports/attendance/monthly", { params });
export const getYearlyReport = (params) => API.get("/reports/attendance/yearly", { params });
export const getLeaveAnalytics = (params) => API.get("/reports/leaves/analytics", { params });
export const getSummaryAnalytics = (params) => API.get("/reports/summary/analytics", { params });

// Users
export const getAllUsers = (params) => API.get("/users", { params });
export const addUser = (data) => API.post("/users", data);
export const updateUser = (id, data) => API.put(`/users/${id}`, data);
export const deleteUser = (id) => API.delete(`/users/${id}`);

// Notifications
export const getMyNotifications = (limit = 12) => API.get("/notifications", { params: { limit } });
export const markNotificationRead = (id) => API.patch(`/notifications/${id}/read`);
export const markAllNotificationsRead = () => API.patch("/notifications/read-all");
export const deleteNotification = (id) => API.delete(`/notifications/${id}`);
export const clearMyNotifications = () => API.delete("/notifications");

export const getProfile = async () => {
  const { data } = await API.get("/users/me");
  return data;
};
