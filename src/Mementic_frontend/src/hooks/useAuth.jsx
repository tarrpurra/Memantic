import { useState, useEffect, useCallback } from "react";
import { AuthClient } from "@dfinity/auth-client";
import { HttpAgent } from "@dfinity/agent";
import { getIdentityProvider } from "../config/environment";

export function useAuth() {
  const [principal, setPrincipal] = useState(null);
  const [client, setClient] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [agent, setAgent] = useState(null);

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

            // Create and set agent with identity
            const newAgent = new HttpAgent({ identity });
            setAgent(newAgent);
          } else {
            console.log("Anonymous principal detected, clearing session");
            await authClient.logout();
            setPrincipal(null);
            setAgent(null);
          }
        } else {
          setAgent(null);
        }
      } catch (error) {
        console.error("Auth initialization error:", error);
        if (isMounted) {
          setPrincipal(null);
          setAgent(null);
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

                // Create and set agent with identity
                const newAgent = new HttpAgent({ identity });
                setAgent(newAgent);
                resolve(true);
              } else {
                console.error("Login failed: received anonymous principal");
                setPrincipal(null);
                setAgent(null);
                resolve(false);
              }
            } catch (error) {
              console.error("Error getting identity after login:", error);
              setPrincipal(null);
              setAgent(null);
              resolve(false);
            } finally {
              setIsLoading(false);
            }
          },
          onError: (error) => {
            console.error("Login error:", error);
            setPrincipal(null);
            setAgent(null);
            setIsLoading(false);
            resolve(false);
          }
        });
      });
    } catch (error) {
      console.error("Login process error:", error);
      setIsLoading(false);
      setAgent(null);
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
      setAgent(null);
      console.log("Logout successful");
      return true;
    } catch (error) {
      console.error("Logout error:", error);
      setPrincipal(null);
      setAgent(null);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [client]);

  // Helper to ensure agent is present for update calls
  const requireAgent = () => {
    if (!agent) {
      throw new Error("Authenticated agent required for update calls. User may not be logged in.");
    }
    return agent;
  };

  useEffect(() => {
    if (isAuthenticated && !agent) {
      console.warn("User is authenticated but agent is missing. Update calls will fail.");
    }
  }, [isAuthenticated, agent]);

  // Helper to check if user is authenticated (not anonymous)
  const isAuthenticated = principal !== null && principal !== "2vxsx-fae" && !isLoading;

  return { 
    principal, 
    login, 
    logout, 
    isLoading,
    isAuthenticated,
    client,
    agent, // Expose the agent for backend calls
    requireAgent // Helper to enforce agent usage
  };
}