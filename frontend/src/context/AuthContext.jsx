import React, { createContext, useState, useEffect } from "react";
import axios from "axios";

// Create AuthContext
export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token") || null);
  const [loginError, setLoginError] = useState(null);

  // ✅ Auto-login: Fetch latest user status when token exists
  useEffect(() => {
    if (token) {
      fetchUserProfile();
    }
  }, [token]);

  const fetchUserProfile = async () => {
    try {
      const res = await axios.get("http://127.0.0.1:8000/api/auth/profile/", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data.is_suspended) {
        setLoginError("Your account is suspended. Please contact the admin.");
        setUser(null);  // Keep user null but don't clear everything
        return;
      }

      setUser(res.data);
      localStorage.setItem("user", JSON.stringify(res.data));
    } catch (error) {
      console.error('Error fetching user profile:', error);
      // Only logout if it's an authentication error (401)
      if (error.response?.status === 401) {
        logout();
      }
      // For other errors, keep the user logged in
    }
  };

  // ✅ Login function - Always fetch latest user status
  const login = async (credentials) => {
    try {
      const res = await axios.post("http://127.0.0.1:8000/api/auth/login/", credentials);
      localStorage.setItem("token", res.data.access);
      setToken(res.data.access);

      // ✅ Fetch user profile after login
      const profileRes = await axios.get("http://127.0.0.1:8000/api/auth/profile/", {
        headers: { Authorization: `Bearer ${res.data.access}` },
      });

      if (profileRes.data.is_suspended) {
        setLoginError("Your account is suspended. Please contact the admin.");
        return false;  // Don't log out immediately
      }

      setUser(profileRes.data);
      localStorage.setItem("user", JSON.stringify(profileRes.data));
      setLoginError(null);
      return true;
    } catch (error) {
      if (error.response && error.response.data) {
        // ✅ Extract suspension message from Django's `non_field_errors`
        const errorMsg = error.response.data.non_field_errors?.[0] || "Login failed. Please try again.";
        setLoginError(errorMsg);
      } else {
        setLoginError("Login failed. Please try again.");
      }
      return false;
    }
  };

  // ✅ Logout function
  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    setToken(null);
    window.location.href = "/";
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loginError }}>
      {children}
    </AuthContext.Provider>
  );
};
