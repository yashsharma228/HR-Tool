import ExportData from "./pages/ExportData";
import UserManagement from "./pages/UserManagement";
import AttendanceAnalytics from "./pages/AttendanceAnalytics";

import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import Signup from "./pages/Signup";

import AdminDashboard from "./pages/AdminDashboard";
import EmployeeDashboard from "./pages/EmployeeDashboard";
import Profile from "./pages/Profile";
import LeaveHistory from "./pages/LeaveHistory";
import ProtectedRoute from "./components/ProtectedRoute";
import RoleRoute from "./components/RoleRoute";
import Toast from "./components/Toast";

function App() {
  return (
    <Router>
      <Navbar />
      <Toast />
      <div className="min-h-screen bg-gray-50">
        <Routes>
          <Route path="/" element={<Navigate to="/login" />} />
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/signup" element={<Signup />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/profile" element={<Profile />} />
            <Route
              path="/admin"
              element={
                <RoleRoute role="admin">
                  <AdminDashboard />
                </RoleRoute>
              }
            />
            <Route
              path="/user-management"
              element={
                <RoleRoute role="admin">
                  <UserManagement />
                </RoleRoute>
              }
            />
            <Route
              path="/export-data"
              element={
                <RoleRoute role="admin">
                  <ExportData />
                </RoleRoute>
              }
            />
            <Route
              path="/employee"
              element={
                <RoleRoute role="employee">
                  <EmployeeDashboard />
                </RoleRoute>
              }
            />
            <Route
              path="/attendance-analytics"
              element={<AttendanceAnalytics />}
            />
            <Route
              path="/leave-history"
              element={
                <RoleRoute role="employee">
                  <LeaveHistory />
                </RoleRoute>
              }
            />
          </Route>
        </Routes>
      </div>
    </Router>
  );
}

export default App;
