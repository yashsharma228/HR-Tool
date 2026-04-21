import { createContext, useEffect, useMemo, useState } from "react";
import { getProfile, logoutUser } from "../services/api";

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

  const clearAuthState = () => {
    setUser(null);
    localStorage.removeItem("user");
  };

  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem("user");
    return storedUser ? JSON.parse(storedUser) : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const verifySession = async () => {
      setLoading(true);
      try {
        const data = await getProfile();
        if (!mounted) return;

        const normalizedUser = normalizeUser(data);
        setUser(normalizedUser);
        localStorage.setItem("user", JSON.stringify(normalizedUser));
      } catch {
        if (mounted) {
          clearAuthState();
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    verifySession();

    const handleUnauthorized = () => {
      if (!mounted) return;
      clearAuthState();
      setLoading(false);
    };

    window.addEventListener("auth:unauthorized", handleUnauthorized);

    return () => {
      mounted = false;
      window.removeEventListener("auth:unauthorized", handleUnauthorized);
    };
  }, []);

  const login = (userData) => {
    const normalizedUser = normalizeUser(userData);
    setUser(normalizedUser);
    setLoading(false);
    localStorage.setItem("user", JSON.stringify(normalizedUser));
  };

  const logout = async () => {
    try {
      await logoutUser();
    } catch {
      // Clear client state even if the cookie is already invalid or the request fails.
    }

    clearAuthState();
    setLoading(false);
  };

  const refreshProfile = async () => {
    const data = await getProfile();
    const normalizedUser = normalizeUser(data);
    setUser(normalizedUser);
    localStorage.setItem("user", JSON.stringify(normalizedUser));
    return normalizedUser;
  };

  const value = useMemo(
    () => ({ user, login, logout, loading, refreshProfile }),
    [user, loading]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
