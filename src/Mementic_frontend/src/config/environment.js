// environment.ts (or .js)

const NETWORK = 'local'; // 'local' | 'ic' | 'mainnet' | 'playground'
const CANISTER_ID = 'uxrrr-q7777-77774-qaaaq-cai';

export const isDevMode = () => true;

// Agent host: must match the page origin for delegation verification
export const getAgentHost = () => {
  if (import.meta.env?.VITE_AGENT_HOST) return import.meta.env.VITE_AGENT_HOST;

  // In development, default to local replica if not provided
  if (isDevMode()) {
    return "http://127.0.0.1:4943";
  }

  // Fallback for production
  return "https://icp-api.io";
};

// Internet Identity provider
export const getIdentityProvider = () => {
  if (import.meta.env.VITE_INTERNET_IDENTITY_HOST) {
    return import.meta.env.VITE_INTERNET_IDENTITY_HOST;
  }

  // Use mainnet II for local development (recommended)
  return "https://identity.ic0.app";
};

// Export canister id
export const Id =
  import.meta.env?.VITE_CANISTER_ID_MEMENTIC_BACKEND ||
  import.meta.env?.CANISTER_ID_MEMENTIC_BACKEND ||
  CANISTER_ID;

// Debug logs
console.log("All environment variables:", import.meta.env);
console.log("Final configuration:", {
  Id,
  agentHost: getAgentHost(),
  identityProvider: getIdentityProvider(),
  isDevMode: isDevMode(),
  network: NETWORK,
  VITE_CANISTER_ID_MEMENTIC_BACKEND: import.meta.env.VITE_CANISTER_ID_MEMENTIC_BACKEND,
  CANISTER_ID_MEMENTIC_BACKEND: import.meta.env.CANISTER_ID_MEMENTIC_BACKEND
});

// Helpers and optional bundled object
export const getCanisterId = () => Id;

export const hasBackendCanisterId = () =>
  Boolean(
    import.meta.env?.VITE_CANISTER_ID_MEMENTIC_BACKEND ||
      import.meta.env?.CANISTER_ID_MEMENTIC_BACKEND
  );

export const hasFrontendCanisterId = () =>
  Boolean(
    import.meta.env?.VITE_CANISTER_ID_MEMENTIC_FRONTEND ||
      import.meta.env?.CANISTER_ID_MEMENTIC_FRONTEND
  );

export const config = {
  isDevMode: isDevMode(),
  agentHost: getAgentHost(),
  identityProvider: getIdentityProvider(),
  Id,
};
