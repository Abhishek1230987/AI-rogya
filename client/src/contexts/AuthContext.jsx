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

  const getStoredToken = () =>
    sessionStorage.getItem("token") || localStorage.getItem("token");

  const storeToken = (token) => {
    sessionStorage.setItem("token", token);
    // Keep token tab-scoped for multi-user testing in separate tabs.
    localStorage.removeItem("token");
  };

  const clearStoredToken = () => {
    sessionStorage.removeItem("token");
    localStorage.removeItem("token");
  };

  // Check for existing token on mount
  useEffect(() => {
    const initAuth = async () => {
      const token = getStoredToken();

      // Migrate old shared token to tab-scoped storage.
      if (!sessionStorage.getItem("token") && localStorage.getItem("token")) {
        sessionStorage.setItem("token", localStorage.getItem("token"));
        localStorage.removeItem("token");
      }

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
              clearStoredToken();
            }
          } else {
            // Token is invalid, remove it
            clearStoredToken();
          }
        } catch (error) {
          console.error("Token validation error:", error);
          clearStoredToken();
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
      storeToken(data.token);

      // Check if user has completed medical history
      await checkMedicalHistoryStatus(data.token);
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  };

  const loginDoctor = async (email, password) => {
    try {
      const response = await fetch(API_ENDPOINTS.AUTH_DOCTOR_LOGIN, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody.message || "Doctor login failed");
      }

      const data = await response.json();
      setUser(data.user);
      storeToken(data.token);
      navigate("/doctor-dashboard");
    } catch (error) {
      console.error("Doctor login error:", error);
      throw error;
    }
  };

  const registerDoctor = async (name, email, password, inviteCode) => {
    try {
      const response = await fetch(API_ENDPOINTS.AUTH_DOCTOR_REGISTER, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, email, password, inviteCode }),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody.message || "Doctor registration failed");
      }

      const data = await response.json();
      setUser(data.user);
      storeToken(data.token);
      navigate("/doctor-dashboard");
    } catch (error) {
      console.error("Doctor registration error:", error);
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
          errorData.message || errorData.error || "Registration failed",
        );
      }

      const data = await response.json();
      console.log(" Registration successful:", data.user);

      setUser(data.user);
      storeToken(data.token);

      // New users should complete medical history
      navigate("/medical-history");
    } catch (error) {
      console.error("Registration error:", error);
      throw error;
    }
  };

  const logout = () => {
    setUser(null);
    clearStoredToken();
    navigate("/");
  };

  const value = {
    user,
    loading,
    login,
    loginDoctor,
    registerDoctor,
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
