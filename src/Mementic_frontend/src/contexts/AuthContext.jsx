import { createContext, useContext, useEffect, useState } from "react";
import { HttpAgent } from "@dfinity/agent";
import { AuthClient } from "@dfinity/auth-client";
import { useIdentityKit } from "@nfid/identitykit/react";
import backendService from "../services/backendService";
import { getAgentHost, getIdentityProvider, isDevMode } from "../config/environment";

const AUTH_STORAGE_KEY = "mementic-auth-state";
const isBrowser = typeof window !== "undefined";

const readFromStorage = (key) => {
  if (!isBrowser) return null;

  try {
    const fromLocal = window.localStorage.getItem(key);
    if (fromLocal) {
      return JSON.parse(fromLocal);
    }

    const fromSession = window.sessionStorage.getItem(key);
    if (fromSession) {
      return JSON.parse(fromSession);
    }
  } catch (error) {
    console.warn("Failed to parse stored auth state:", error);
  }

  return null;
};

const writeToStorage = (key, value) => {
  if (!isBrowser) return;

  try {
    if (value === null || value === undefined) {
      window.localStorage.removeItem(key);
      window.sessionStorage.removeItem(key);
      return;
    }

    const serialized = JSON.stringify(value);
    window.localStorage.setItem(key, serialized);
    window.sessionStorage.setItem(key, serialized);
  } catch (error) {
    console.warn("Failed to persist auth state:", error);
  }
};

const loadStoredAuthState = () => readFromStorage(AUTH_STORAGE_KEY);
const persistAuthState = (value) => writeToStorage(AUTH_STORAGE_KEY, value);

// User profiles are now stored in the backend

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const { user, identity: nfidIdentity, connect: nfidConnect, disconnect: nfidDisconnect, isConnecting: nfidConnecting } = useIdentityKit();
  const [authClient, setAuthClient] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [principal, setPrincipal] = useState(null);
  const [remainingCalls, setRemainingCalls] = useState(0);
  const [username, setUsername] = useState("");
  const [activeProvider, setActiveProvider] = useState(null); // "nfid" or "internet-identity"

  const loginProvider = activeProvider;

  const attachIdentityToBackend = async (identity) => {
    if (!identity) return;

    const agent = new HttpAgent({ identity, host: getAgentHost() });

    if (isDevMode()) {
      try {
        await agent.fetchRootKey();
      } catch (error) {
        console.warn("Failed to fetch root key for development:", error);
      }
    }

    await backendService.useExternalAgent(agent);
  };

  const clearBackendAuth = async () => {
    try {
      await backendService.resetToAnonymous();
    } catch (error) {
      console.warn("Failed to reset backend authentication state:", error);
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      try {
        setIsLoading(true);

        // Initialize AuthClient for direct Internet Identity
        const client = await AuthClient.create();
        setAuthClient(client);

        // Check NFID first
        if (nfidIdentity && user) {
          const principalText = nfidIdentity.getPrincipal().toText();
          const storedAuth = loadStoredAuthState();
          const storedUsername =
            storedAuth?.principal === principalText ? storedAuth.username || "" : "";

          setIsAuthenticated(true);
          setPrincipal(principalText);
          setActiveProvider("nfid");
          setUsername(storedUsername);

          // Update backend service with NFID identity
          await attachIdentityToBackend(nfidIdentity);

          const resolvedUsername = await loadUserProfile(storedUsername);
          persistAuthState({
            principal: principalText,
            username: resolvedUsername,
            provider: "nfid",
          });

          await loadUserData();
        }
        // Check direct AuthClient
        else if (await client.isAuthenticated()) {
          const identity = client.getIdentity();
          const principalText = identity.getPrincipal().toText();
          const storedAuth = loadStoredAuthState();
          const storedUsername =
            storedAuth?.principal === principalText ? storedAuth.username || "" : "";

          setIsAuthenticated(true);
          setPrincipal(principalText);
          setActiveProvider("internet-identity");
          setUsername(storedUsername);

          // Update backend service with identity
          await attachIdentityToBackend(identity);

          const resolvedUsername = await loadUserProfile(storedUsername);
          persistAuthState({
            principal: principalText,
            username: resolvedUsername,
            provider: "internet-identity",
          });

          await loadUserData();
        } else {
          setIsAuthenticated(false);
          setPrincipal(null);
          setUsername("");
          setActiveProvider(null);
          setRemainingCalls(0);
          persistAuthState(null);
          await clearBackendAuth();
        }
      } catch (error) {
        console.error("Failed to initialize authentication:", error);
        setIsAuthenticated(false);
        setPrincipal(null);
        setUsername("");
        setActiveProvider(null);
        setRemainingCalls(0);
        persistAuthState(null);
        await clearBackendAuth();
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, [nfidIdentity, user]);

  const loadUserData = async () => {
    try {
      const calls = await backendService.getRemainingCalls();
      setRemainingCalls(calls);
    } catch (error) {
      console.error("Failed to load user data:", error);
    }
  };

  const loadUserProfile = async (fallbackUsername = "") => {
    try {
      const profile = await backendService.getUserProfile();
      const nextUsername =
        profile?.username && typeof profile.username === "string"
          ? profile.username
          : fallbackUsername;

      setUsername(nextUsername);
      return nextUsername;
    } catch (error) {
      console.error("Failed to load user profile:", error);
      setUsername(fallbackUsername);
      return fallbackUsername;
    }
  };

  const loginWithNFID = async () => {
    try {
      setIsLoading(true);
      await nfidConnect();
      // NFID will trigger the useEffect when identity/user changes
      return true;
    } catch (error) {
      console.error("NFID login failed:", error);
      setIsAuthenticated(false);
      setPrincipal(null);
      setUsername("");
      setActiveProvider(null);
      setRemainingCalls(0);
      persistAuthState(null);
      await clearBackendAuth();
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithInternetIdentity = async () => {
    try {
      setIsLoading(true);
      if (!authClient) {
        throw new Error("Auth client not initialized");
      }

      // AuthClient.login() opens a popup and returns a Promise that resolves when login is complete
        await authClient.login({
          identityProvider: getIdentityProvider(),
        });

        // After successful login, update state
        const identity = authClient.getIdentity();
        const principalText = identity.getPrincipal().toText();

        setIsAuthenticated(true);
        setPrincipal(principalText);
        setActiveProvider("internet-identity");

        // Update backend service with identity
        await attachIdentityToBackend(identity);

        // Load user profile from backend
        const resolvedUsername = await loadUserProfile();
      persistAuthState({
        principal: principalText,
        username: resolvedUsername,
        provider: "internet-identity",
      });

      await loadUserData();
      return true;
    } catch (error) {
      console.error("Internet Identity login failed:", error);
      setIsAuthenticated(false);
      setPrincipal(null);
      setUsername("");
      setActiveProvider(null);
      setRemainingCalls(0);
      persistAuthState(null);
      await clearBackendAuth();
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Keep backward compatibility
  const login = loginWithInternetIdentity;

  const logout = async () => {
    try {
      setIsLoading(true);
      if (activeProvider === "nfid") {
        await nfidDisconnect();
      } else if (activeProvider === "internet-identity" && authClient) {
        await authClient.logout();
      }
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      await clearBackendAuth();
      setIsAuthenticated(false);
      setPrincipal(null);
      setUsername("");
      setActiveProvider(null);
      setRemainingCalls(0);
      persistAuthState(null);
      setIsLoading(false);
    }
    return true;
  };

  const updateUsername = async (value) => {
    const normalized = (typeof value === 'string' ? value.trim() : '');
    try {
      await backendService.updateUserProfile(normalized, null);
      setUsername(normalized);
      if (principal) {
        persistAuthState({
          principal,
          username: normalized,
          provider: activeProvider,
        });
      }
    } catch (error) {
      console.error("Failed to update username:", error);
      throw error;
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
        if (
          key.includes("internet_identity") ||
          key.includes("authClient") ||
          key.includes("delegation")
        ) {
          localStorage.removeItem(key);
        }
      });

      const sessionKeys = Object.keys(sessionStorage);
      sessionKeys.forEach((key) => {
        if (
          key.includes("internet_identity") ||
          key.includes("authClient") ||
          key.includes("delegation")
        ) {
          sessionStorage.removeItem(key);
        }
      });

      if (isBrowser) {
        window.localStorage.removeItem(AUTH_STORAGE_KEY);
        window.sessionStorage.removeItem(AUTH_STORAGE_KEY);
      }

      setIsAuthenticated(false);
      setPrincipal(null);
      setUsername("");
      setRemainingCalls(0);
      await clearBackendAuth();
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
    login,
    loginWithNFID,
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
