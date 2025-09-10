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

        // Initialize backend service (for API calls only)
        await backendService.initialize();

        // Check authentication state directly from AuthClient
        if (backendService.authClient) {
          const isAuth = await backendService.authClient.isAuthenticated();
          console.log("AuthClient.isAuthenticated():", isAuth);

          if (isAuth) {
            const identity = backendService.authClient.getIdentity();
            const principalText = identity.getPrincipal().toText();

            if (principalText !== "2vxsx-fae") {
              console.log("User authenticated with principal:", principalText);
              setIsAuthenticated(true);
              setPrincipal(principalText);
              await loadUserData();
            } else {
              console.log("Anonymous principal detected");
            }
          } else {
            console.log("User not authenticated");
          }
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
      console.log("Starting login process...");

      const success = await backendService.login();

      if (success && backendService.authClient) {
        console.log("Login successful, setting authenticated state");

        // Get principal directly from AuthClient
        const identity = backendService.authClient.getIdentity();
        const principalText = identity.getPrincipal().toText();

        if (principalText !== "2vxsx-fae") {
          setIsAuthenticated(true);
          setPrincipal(principalText);
          console.log("Principal after login:", principalText);
          await loadUserData();
          return true;
        } else {
          console.log("Login resulted in anonymous principal");
          return false;
        }
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
      setPrincipal(null);
      return true; // Return success
    } catch (error) {
      console.error("Logout failed:", error);
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
    backendService,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};