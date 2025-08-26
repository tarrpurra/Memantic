// Environment configuration for Mementic frontend
// This file loads configuration from dfx generated files

// Load canister IDs from dfx generated files
let canisterIds = {};
let agentHost = "https://icp-api.io";
let identityProvider = "https://identity.ic0.app";

// Try to load from dfx generated files
try {
  // For local development
  if (import.meta.env.DEV) {
    const localCanisterIds = await import(
      "../../../../.dfx/local/canister_ids.json"
    );
    canisterIds = localCanisterIds.default || localCanisterIds;
    agentHost = "http://127.0.0.1:4943";
    identityProvider =
      "http://127.0.0.1:4943?canisterId=rdmx6-jaaaa-aaaaa-aaadq-cai";
  } else {
    // For production - you'll need to set these in your deployment
    canisterIds = {
      Mementic_backend: {
        ic:
          process.env.VITE_MEMENTIC_BACKEND_CANISTER_ID ||
          "uxrrr-q7777-77774-qaaaq-cai",
      },
    };
  }
} catch (error) {
  console.warn("Could not load canister IDs from dfx files:", error);
  // Fallback to environment variables
  canisterIds = {
    Mementic_backend: {
      ic:
        import.meta.env.VITE_MEMENTIC_BACKEND_CANISTER_ID ||
        "uxrrr-q7777-77774-qaaaq-cai",
    },
  };
}

export const getCanisterId = (canisterName = "Mementic_backend") => {
  const canister = canisterIds[canisterName];
  if (!canister) {
    throw new Error(`Canister ${canisterName} not found in configuration`);
  }

  // Return the appropriate canister ID based on environment
  if (import.meta.env.DEV && canister.local) {
    return canister.local;
  }
  return canister.ic || canister.local;
};

export const getAgentHost = () => {
  return import.meta.env.VITE_AGENT_HOST || agentHost;
};

export const getIdentityProvider = () => {
  return import.meta.env.VITE_INTERNET_IDENTITY_HOST || identityProvider;
};

export const isDevMode = () => {
  return import.meta.env.DEV;
};

export const config = {
  canisterIds,
  agentHost: getAgentHost(),
  identityProvider: getIdentityProvider(),
  isDevMode: isDevMode(),
};
