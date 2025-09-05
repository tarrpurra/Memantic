import { useState, useEffect, useCallback } from "react";
import { AuthClient } from "@dfinity/auth-client";
import { getIdentityProvider } from "../config/environment";

export function useAuth() {
  const [principal, setPrincipal] = useState(null);
  const [client, setClient] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      try {
        console.log("Initializing auth client...");
        
        const authClient = await AuthClient.create({
          idleOptions: {
            disableIdle: true,
            disableDefaultIdleCallback: true
          }
        });

        if (!isMounted) return;

        setClient(authClient);

        // Check if user is already authenticated
        const isAuthenticated = await authClient.isAuthenticated();
        console.log("Is authenticated:", isAuthenticated);

        if (isAuthenticated) {
          const identity = authClient.getIdentity();
          const principalText = identity.getPrincipal().toText();
          console.log("Found existing authentication:", principalText);
          
          // Verify it's not the anonymous principal
          if (principalText !== "2vxsx-fae") {
            setPrincipal(principalText);
          } else {
            console.log("Anonymous principal detected, clearing session");
            await authClient.logout();
            setPrincipal(null);
          }
        }
      } catch (error) {
        console.error("Auth initialization error:", error);
        if (isMounted) {
          setPrincipal(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    initAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = useCallback(async () => {
    if (!client) {
      console.error("Auth client not initialized");
      return false;
    }

    try {
      console.log("Starting login process...");
      setIsLoading(true);
      
      return new Promise((resolve) => {
        client.login({
          identityProvider: getIdentityProvider(),
          maxTimeToLive: BigInt(7 * 24 * 60 * 60 * 1000 * 1000 * 1000), // 7 days in nanoseconds
          windowOpenerFeatures: "toolbar=0,location=0,menubar=0,width=500,height=600,left=100,top=100",
          onSuccess: () => {
            try {
              const identity = client.getIdentity();
              const principalText = identity.getPrincipal().toText();
              console.log("Login successful:", principalText);
              
              // Verify it's not the anonymous principal
              if (principalText && principalText !== "2vxsx-fae") {
                setPrincipal(principalText);
                resolve(true);
              } else {
                console.error("Login failed: received anonymous principal");
                setPrincipal(null);
                resolve(false);
              }
            } catch (error) {
              console.error("Error getting identity after login:", error);
              setPrincipal(null);
              resolve(false);
            } finally {
              setIsLoading(false);
            }
          },
          onError: (error) => {
            console.error("Login error:", error);
            setPrincipal(null);
            setIsLoading(false);
            resolve(false);
          }
        });
      });
    } catch (error) {
      console.error("Login process error:", error);
      setIsLoading(false);
      return false;
    }
  }, [client]);

  const logout = useCallback(async () => {
    if (!client) {
      console.error("Auth client not initialized");
      return false;
    }

    try {
      console.log("Starting logout process...");
      setIsLoading(true);
      
      await client.logout();
      setPrincipal(null);
      console.log("Logout successful");
      return true;
    } catch (error) {
      console.error("Logout error:", error);
      // Even if logout fails, clear the principal locally
      setPrincipal(null);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [client]);

  // Helper to check if user is authenticated (not anonymous)
  const isAuthenticated = principal !== null && principal !== "2vxsx-fae" && !isLoading;

  return { 
    principal, 
    login, 
    logout, 
    isLoading,
    isAuthenticated,
    client
  };
}