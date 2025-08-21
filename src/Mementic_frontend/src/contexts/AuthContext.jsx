import { createContext, useContext, useEffect, useState } from "react";
import backendService from "../services/backendService";

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [remainingCalls, setRemainingCalls] = useState(0);

  // Initialize authentication on component mount
  useEffect(() => {
    const initAuth = async () => {
      try {
        setIsLoading(true);
        await backendService.initialize();

        if (backendService.isUserAuthenticated()) {
          setIsAuthenticated(true);
          await loadUserData();
        }
      } catch (error) {
        console.error("Failed to initialize authentication:", error);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  // Load user data
  const loadUserData = async () => {
    try {
      const calls = await backendService.getRemainingCalls();
      setRemainingCalls(calls);

      // You can add more user data loading here
      // const userMemes = await backendService.getUserMemes();
      // setUser({ remainingCalls: calls, memes: userMemes });
    } catch (error) {
      console.error("Failed to load user data:", error);
    }
  };

  // Login function
  const login = async () => {
    try {
      setIsLoading(true);
      const success = await backendService.login();

      if (success) {
        setIsAuthenticated(true);
        await loadUserData();
        return true;
      }
      return false;
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Logout function
  const logout = async () => {
    try {
      setIsLoading(true);
      await backendService.logout();
      setIsAuthenticated(false);
      setUser(null);
      setRemainingCalls(0);
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Refresh user data
  const refreshUserData = async () => {
    if (isAuthenticated) {
      await loadUserData();
    }
  };

  const value = {
    isAuthenticated,
    isLoading,
    user,
    remainingCalls,
    login,
    logout,
    refreshUserData,
    backendService,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
