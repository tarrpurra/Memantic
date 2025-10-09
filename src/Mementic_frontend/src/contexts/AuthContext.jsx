import { createContext, useContext, useEffect, useState } from "react";
import { HttpAgent } from "@dfinity/agent";
import { AuthClient } from "@dfinity/auth-client";
import { useIdentityKit } from "@nfid/identitykit/react";
import backendService from "../services/backendService";
import { getIdentityProvider } from "../config/environment";

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
          setUsername(storedUsername);
          setActiveProvider("nfid");
          persistAuthState({ principal: principalText, username: storedUsername, provider: "nfid" });

          // Update backend service with NFID identity
          await backendService.useExternalAgent(new HttpAgent({ identity: nfidIdentity }));

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
          setUsername(storedUsername);
          setActiveProvider("internet-identity");
          persistAuthState({ principal: principalText, username: storedUsername, provider: "internet-identity" });

          // Update backend service with identity
          await backendService.useExternalAgent(new HttpAgent({ identity }));

          await loadUserData();
        } else {
          setIsAuthenticated(false);
          setPrincipal(null);
          setUsername("");
          setActiveProvider(null);
          setRemainingCalls(0);
          persistAuthState(null);
        }
      } catch (error) {
        console.error("Failed to initialize authentication:", error);
        setIsAuthenticated(false);
        setPrincipal(null);
        setUsername("");
        setActiveProvider(null);
        setRemainingCalls(0);
        persistAuthState(null);
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

  const loadUserProfile = async () => {
    try {
      const profile = await backendService.getUserProfile();
      if (profile?.username && typeof profile.username === 'string') {
        setUsername(profile.username);
      } else {
        setUsername("");
      }
    } catch (error) {
      console.error("Failed to load user profile:", error);
      setUsername("");
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
      await backendService.useExternalAgent(new HttpAgent({ identity }));

      // Load user profile from backend
      await loadUserProfile();

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
