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
  const [principal, setPrincipal] = useState(null);

  // Initialize authentication on component mount
  useEffect(() => {
    const initAuth = async () => {
      try {
        setIsLoading(true);
        console.log("Initializing authentication...");

        // Initialize backend service (this will create AuthClient and check for stored identity)
        await backendService.initialize();

        // Check authentication state from backend service
        const isAuth = backendService.isUserAuthenticated();
        console.log("Backend service authentication status:", isAuth);

        if (isAuth && backendService.authClient) {
          const identity = backendService.authClient.getIdentity();
          const principalText = identity.getPrincipal().toText();

          if (principalText !== "2vxsx-fae") {
            console.log("User authenticated with principal:", principalText);
            setIsAuthenticated(true);
            setPrincipal(principalText);
            await loadUserData();
          } else {
            console.log("Anonymous principal detected, clearing authentication state");
            setIsAuthenticated(false);
            setPrincipal(null);
          }
        } else {
          console.log("User not authenticated or AuthClient not ready");
          setIsAuthenticated(false);
          setPrincipal(null);
        }
      } catch (error) {
        console.error("Failed to initialize authentication:", error);
        setIsAuthenticated(false);
        setPrincipal(null);
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
      console.log("Starting login process...");

      const success = await backendService.login();

      if (success && backendService.authClient) {
        console.log("Login successful, setting authenticated state");

        // Small delay to ensure authentication state is fully updated
        await new Promise(resolve => setTimeout(resolve, 100));

        // Get principal directly from AuthClient
        const identity = backendService.authClient.getIdentity();
        const principalText = identity.getPrincipal().toText();

        console.log("Identity retrieved:", identity);
        console.log("Principal text:", principalText);

        if (principalText && principalText !== "2vxsx-fae") {
          setIsAuthenticated(true);
          setPrincipal(principalText);
          console.log("Principal after login:", principalText);
          await loadUserData();
          return true;
        } else {
          console.log("Login resulted in anonymous or invalid principal:", principalText);
          setIsAuthenticated(false);
          setPrincipal(null);
          return false;
        }
      } else {
        console.log("Login failed or AuthClient not available");
        setIsAuthenticated(false);
        setPrincipal(null);
        return false;
      }
    } catch (error) {
      console.error("Login failed:", error);
      setIsAuthenticated(false);
      setPrincipal(null);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Logout function
  const logout = async () => {
    try {
      setIsLoading(true);
      console.log("Starting logout process...");

      await backendService.logout();

      // Force clear all authentication state
      setIsAuthenticated(false);
      setUser(null);
      setRemainingCalls(0);
      setPrincipal(null);

      console.log("Logout completed successfully");
      return true; // Return success
    } catch (error) {
      console.error("Logout failed:", error);
      // Even if logout fails, clear the local state
      setIsAuthenticated(false);
      setUser(null);
      setRemainingCalls(0);
      setPrincipal(null);
      return false; // Return failure
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

  // Debug authentication state
  const debugAuth = async () => {
    console.log("=== AUTH CONTEXT DEBUG ===");
    console.log("Context state:", {
      isAuthenticated,
      isLoading,
      principal,
      remainingCalls
    });

    // Debug backend service
    const backendDebug = backendService.debugAuth();
    console.log("Backend service debug:", backendDebug);

    console.log("=== END CONTEXT DEBUG ===");
    return {
      context: { isAuthenticated, isLoading, principal, remainingCalls },
      backend: backendDebug
    };
  };

  // Force clear authentication data (for debugging/testing)
  const forceClearAuth = async () => {
    try {
      console.log("Force clearing authentication data...");

      // Clear localStorage
      const localKeys = Object.keys(localStorage);
      localKeys.forEach(key => {
        if (key.includes('internet_identity') || key.includes('authClient') || key.includes('delegation')) {
          localStorage.removeItem(key);
        }
      });

      // Clear sessionStorage
      const sessionKeys = Object.keys(sessionStorage);
      sessionKeys.forEach(key => {
        if (key.includes('internet_identity') || key.includes('authClient') || key.includes('delegation')) {
          sessionStorage.removeItem(key);
        }
      });

      // Reset state
      setIsAuthenticated(false);
      setUser(null);
      setRemainingCalls(0);
      setPrincipal(null);

      console.log("Authentication data cleared");
      return true;
    } catch (error) {
      console.error("Failed to clear auth data:", error);
      return false;
    }
  };

  const value = {
    isAuthenticated,
    isLoading,
    user,
    remainingCalls,
    principal,
    login,
    logout,
    refreshUserData,
    debugAuth,
    forceClearAuth,
    backendService,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};