// environment.ts (or .js)

const NETWORK = 'local'; // 'local' | 'ic' | 'mainnet' | 'playground'
const CANISTER_ID = 'uxrrr-q7777-77774-qaaaq-cai';

export const isDevMode = () => import.meta.env.DEV === true;

// Agent host: must match the page origin for delegation verification
export const getAgentHost = () => {
  if (import.meta.env.VITE_AGENT_HOST) return import.meta.env.VITE_AGENT_HOST;

  // In development, use the current page origin to match delegation
  if (isDevMode() && typeof window !== 'undefined') {
    return window.location.origin;
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
export const Id = CANISTER_ID;

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

// Optional bundled object
export const config = {
  isDevMode: isDevMode(),
  agentHost: getAgentHost(),
  identityProvider: getIdentityProvider(),
  Id: CANISTER_ID,
};
