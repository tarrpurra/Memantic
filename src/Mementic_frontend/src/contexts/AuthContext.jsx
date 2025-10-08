import { createContext, useContext, useEffect, useState } from "react";
import backendService from "../services/backendService";

const AUTH_STORAGE_KEY = "mementic:auth-state";

const loadStoredAuthState = () => {
  try {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.warn("Failed to parse stored auth state:", error);
    return null;
  }
};

const persistAuthState = (state) => {
  try {
    if (!state?.principal) {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      return;
    }

    localStorage.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify({
        provider: "internet-identity",
        ...state,
      })
    );
  } catch (error) {
    console.warn("Failed to persist auth state:", error);
  }
};

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
  const [principal, setPrincipal] = useState(null);
  const [remainingCalls, setRemainingCalls] = useState(0);
  const [username, setUsername] = useState("");

  const loginProvider = isAuthenticated ? "internet-identity" : null;

  useEffect(() => {
    const initAuth = async () => {
      try {
        setIsLoading(true);
        const storedAuth = loadStoredAuthState();

        await backendService.initialize();

        const isAuth = backendService.isUserAuthenticated();
        if (isAuth && backendService.authClient) {
          const identity = backendService.authClient.getIdentity();
          const principalText = identity.getPrincipal().toText();

          if (principalText !== "2vxsx-fae") {
            const storedUsername =
              storedAuth?.principal === principalText ? storedAuth.username || "" : "";

            setIsAuthenticated(true);
            setPrincipal(principalText);
            setUsername(storedUsername);
            persistAuthState({ principal: principalText, username: storedUsername });
            await loadUserData();
            return;
          }
        }

        setIsAuthenticated(false);
        setPrincipal(null);
        setUsername("");
        setRemainingCalls(0);
        persistAuthState(null);
      } catch (error) {
        console.error("Failed to initialize authentication:", error);
        setIsAuthenticated(false);
        setPrincipal(null);
        setUsername("");
        setRemainingCalls(0);
        persistAuthState(null);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadUserData = async () => {
    try {
      const calls = await backendService.getRemainingCalls();
      setRemainingCalls(calls);
    } catch (error) {
      console.error("Failed to load user data:", error);
    }
  };

  const loginWithInternetIdentity = async () => {
    try {
      setIsLoading(true);
      const success = await backendService.login();

      if (!success || !backendService.authClient) {
        setIsAuthenticated(false);
        setPrincipal(null);
        setUsername("");
        setRemainingCalls(0);
        persistAuthState(null);
        return false;
      }

      const identity = backendService.authClient.getIdentity();
      const principalText = identity.getPrincipal().toText();

      if (!principalText || principalText === "2vxsx-fae") {
        setIsAuthenticated(false);
        setPrincipal(null);
        setUsername("");
        setRemainingCalls(0);
        persistAuthState(null);
        return false;
      }

      const storedAuth = loadStoredAuthState();
      const storedUsername =
        storedAuth?.principal === principalText ? storedAuth.username || "" : "";

      setIsAuthenticated(true);
      setPrincipal(principalText);
      setUsername(storedUsername);
      persistAuthState({ principal: principalText, username: storedUsername });
      await loadUserData();
      return true;
    } catch (error) {
      console.error("Login failed:", error);
      setIsAuthenticated(false);
      setPrincipal(null);
      setUsername("");
      setRemainingCalls(0);
      persistAuthState(null);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      await backendService.logout();
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      setIsAuthenticated(false);
      setPrincipal(null);
      setUsername("");
      setRemainingCalls(0);
      persistAuthState(null);
      setIsLoading(false);
    }
    return true;
  };

  const updateUsername = (value) => {
    const normalized = value.trim();
    setUsername(normalized);
    if (principal) {
      persistAuthState({ principal, username: normalized });
    }
  };

  const refreshUserData = async () => {
    if (isAuthenticated) {
      await loadUserData();
    }
  };

  const debugAuth = () => {
    const backendDebug = backendService.debugAuth();
    const context = {
      isAuthenticated,
      isLoading,
      principal,
      remainingCalls,
      loginProvider,
      username,
    };

    console.log("=== AUTH CONTEXT DEBUG ===");
    console.log("Context state:", context);
    console.log("Backend service debug:", backendDebug);
    console.log("=== END CONTEXT DEBUG ===");

    return { context, backend: backendDebug };
  };

  const forceClearAuth = async () => {
    try {
      const localKeys = Object.keys(localStorage);
      localKeys.forEach((key) => {
        if (key.includes("internet_identity") || key.includes("authClient") || key.includes("delegation")) {
          localStorage.removeItem(key);
        }
      });

      const sessionKeys = Object.keys(sessionStorage);
      sessionKeys.forEach((key) => {
        if (key.includes("internet_identity") || key.includes("authClient") || key.includes("delegation")) {
          sessionStorage.removeItem(key);
        }
      });

      persistAuthState(null);
      setIsAuthenticated(false);
      setPrincipal(null);
      setUsername("");
      setRemainingCalls(0);
      return true;
    } catch (error) {
      console.error("Failed to clear auth data:", error);
      return false;
    }
  };

  const value = {
    isAuthenticated,
    isLoading,
    principal,
    remainingCalls,
    loginProvider,
    username,
    login: loginWithInternetIdentity,
    loginWithInternetIdentity,
    logout,
    refreshUserData,
    updateUsername,
    debugAuth,
    forceClearAuth,
    backendService,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
