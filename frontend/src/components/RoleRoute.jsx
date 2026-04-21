import useAuth from "../hooks/useAuth";
import { Navigate } from "react-router-dom";

export default function RoleRoute({ role, children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return <div className="text-center mt-10">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== role) {
    return <Navigate to={user?.role === "admin" ? "/admin" : "/employee"} />;
  }

  return children;
}
