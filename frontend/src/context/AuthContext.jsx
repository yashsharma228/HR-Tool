import { createContext, useState, useEffect } from "react";
import { getProfile } from "../services/api";

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const normalizeUser = (data) => ({
    id: data._id || data.id,
    name: data.name,
    email: data.email,
    role: data.role,
    dateOfJoining: data.dateOfJoining,
    leaveBalance: data.leaveBalance,
  });

  const [user, setUser] = useState(() => {
    const token = localStorage.getItem("token");
    const user = localStorage.getItem("user");
    return token && user ? JSON.parse(user) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem("token"));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (token && !user) {
      setLoading(true);
      getProfile()
        .then((data) => {
          const normalizedUser = normalizeUser(data);
          setUser(normalizedUser);
          localStorage.setItem("user", JSON.stringify(normalizedUser));
        })
        .catch(() => logout())
        .finally(() => setLoading(false));
    }
  }, [token, user]);

  const login = (user, token) => {
    const normalizedUser = normalizeUser(user);
    setUser(normalizedUser);
    setToken(token);
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(normalizedUser));
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  };

  const refreshProfile = async () => {
    if (!token) return;
    const data = await getProfile();
    const normalizedUser = normalizeUser(data);
    setUser(normalizedUser);
    localStorage.setItem("user", JSON.stringify(normalizedUser));
    return normalizedUser;
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}
