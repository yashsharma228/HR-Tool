import useAuth from "../hooks/useAuth";
import { Navigate } from "react-router-dom";

export default function RoleRoute({ role, children }) {
  const { user } = useAuth();
  if (!user || user.role !== role) {
    return <Navigate to={user?.role === "admin" ? "/admin" : "/employee"} />;
  }
  return children;
}
