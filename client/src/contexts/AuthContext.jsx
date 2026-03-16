import { createContext, useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { API_ENDPOINTS } from "../config/api";

const AuthContext = createContext(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Check for existing token on mount
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem("token");
      if (token) {
        try {
          // Validate token by making a request to a protected endpoint
          const response = await fetch(API_ENDPOINTS.AUTH_ME, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (response.ok) {
            const userData = await response.json();
            if (userData.success && userData.user) {
              setUser(userData.user);
            } else {
              localStorage.removeItem("token");
            }
          } else {
            // Token is invalid, remove it
            localStorage.removeItem("token");
          }
        } catch (error) {
          console.error("Token validation error:", error);
          localStorage.removeItem("token");
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  // Check medical history status and redirect if needed
  const checkMedicalHistoryStatus = async (token) => {
    try {
      const response = await fetch(API_ENDPOINTS.MEDICAL_HISTORY_STATUS, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const { hasCompletedHistory, redirectTo } = await response.json();
        if (!hasCompletedHistory && redirectTo) {
          navigate(redirectTo);
        } else {
          navigate("/dashboard");
        }
      } else {
        // If endpoint doesn't exist (404) or other errors, just go to dashboard
        navigate("/dashboard");
      }
    } catch (error) {
      console.error("Medical history status check error:", error);
      // Don't block login if this check fails
      navigate("/dashboard");
    }
  };

  const login = async (email, password) => {
    try {
      const response = await fetch(API_ENDPOINTS.AUTH_LOGIN, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        throw new Error("Login failed");
      }

      const data = await response.json();
      setUser(data.user);
      localStorage.setItem("token", data.token);

      // Check if user has completed medical history
      await checkMedicalHistoryStatus(data.token);
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  };

  const register = async (name, email, password) => {
    try {
      console.log(" Starting registration for:", email);
      console.log(" Request payload:", { name, email, password: "***" });
      console.log(" API Endpoint:", API_ENDPOINTS.AUTH_REGISTER);

      const response = await fetch(API_ENDPOINTS.AUTH_REGISTER, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, email, password }),
      });

      console.log(" Response status:", response.status);
      console.log(" Response ok:", response.ok);

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ message: "Unknown error" }));
        console.error(" Registration failed:", errorData);
        throw new Error(
          errorData.message || errorData.error || "Registration failed"
        );
      }

      const data = await response.json();
      console.log(" Registration successful:", data.user);

      setUser(data.user);
      localStorage.setItem("token", data.token);

      // New users should complete medical history
      navigate("/medical-history");
    } catch (error) {
      console.error("Registration error:", error);
      throw error;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("token");
    navigate("/");
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    setUser: (userData) => setUser(userData),
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
